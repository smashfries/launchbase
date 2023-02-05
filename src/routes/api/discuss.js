import {createComment, getComments, deleteComment} from '../../utils/schema.js';

/**
 * API endpoint for comments
 * @param {*} fastify
 * @param {*} _options
 */
export default async function discuss(fastify, _options) {
  fastify.post('/comments', createComment, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    if (req.body.superType !== 'idea') {
      return rep.code(400).send({error: 'method not supported',
        message: 'Only comments for ideas are currently supported. ' +
          'This feature is coming soon!'});
    }

    const parentId = req.body.parent;
    if (!fastify.mongo.ObjectId.isValid(parentId)) {
      return rep.code(400).send({error: 'invalid parentId',
        message: 'parentId is an invalid MongoDB Object ID'});
    }
    const parentOId = new fastify.mongo.ObjectId(parentId);

    const superParentId = req.body.superParent;
    if (!fastify.mongo.ObjectId.isValid(superParentId)) {
      return rep.code(400).send({error: 'invalid superParentId',
        message: 'superParentId is an invalid MongoDB Object ID'});
    }
    const superParentOId = new fastify.mongo.ObjectId(superParentId);

    const comments = fastify.mongo.db.collection('comments');
    const ideas = fastify.mongo.db.collection('ideas');

    const superParent = await ideas.findOne({_id: superParentOId});
    if (!superParent) {
      return rep.code(400).send({error: 'idea does not exist'});
    }

    if (req.body.parent !== req.body.superParent) {
      const parentComment = await comments.findOne({_id: parentOId});
      if (!parentComment) {
        return rep.code(400).send({error: 'parent comment does not exist'});
      }
      if (!parentComment.superParent.equals(superParentOId)) {
        return rep.code(400).send({error: 'invalid super-parent'});
      }
    }

    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({_id: req.userOId});
    const isComplete = user.hasOwnProperty('name') ? true : false;
    if (!isComplete) {
      return rep.code(400).send({error: 'profile incomplete',
        message: 'Profile must be complete before posting a comment.'});
    }

    const comment = await comments.insertOne({comment: req.body.comment,
      parent: parentOId, superParent: superParentOId,
      superType: req.body.superType, timeStamp: new Date(),
      author: req.userOId});

    if (parentId === superParentId) {
      await ideas.updateOne({_id: parentOId}, {$inc: {replyCount: 1}});
    } else {
      await comments.updateOne({_id: parentOId}, {$inc: {replyCount: 1}});
    }


    const author = await fastify.mongo.db.collection('users')
        .findOne({_id: req.userOId});

    rep.code(200).send({message: 'comment was successfully created',
      commentId: comment.insertedId, authorName: author.nickname,
      authorHandle: author.url, authorId: author._id});
  });

  fastify.get('/comments/:parent', getComments,
      async (req, rep) => {
        if (!req.token) {
          return rep.code(400).send({error: 'unauthorized'});
        }

        const {parent} = req.params;

        if (!fastify.mongo.ObjectId.isValid(parent)) {
          return rep.code(400).send({error: 'invalid parentId',
            message: 'parentId is an invalid MongoDB Object ID'});
        }

        const query = req.query;
        const page = query.page || 1;

        if (page < 1) {
          return rep.code(400).send({error:
            'page must be a number greater than or equal to 1'});
        }

        const parentOId = new fastify.mongo.ObjectId(parent);

        const comments = fastify.mongo.db.collection('comments');
        const reqComments = await comments.aggregate([
          {
            $match: {parent: parentOId},
          },
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'author_details',
            },
          },
          {
            $lookup: {
              from: 'upvotes',
              let: {comment_id: '$_id'},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$user', req.userOId],
                        },
                        {
                          $eq: ['$$comment_id', '$resource'],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'upvote_details',
            },
          },
          {
            $project: {
              'author_details.nickname': 1,
              'author_details.url': 1,
              'author_details._id': 1,
              'comment': 1,
              'superParent': 1,
              'parent': 1,
              'superType': 1,
              'timeStamp': 1,
              'deleted': 1,
              'upvotes': 1,
              'upvote_details._id': 1,
            },
          },
          {
            $skip: (page - 1)*20,
          },
          {
            $limit: 20,
          },
        ]);
        const commentArray = await reqComments.toArray();

        const parentComment = await comments.findOne({_id: parentOId});

        let upvote;

        const upvotes = fastify.mongo.db.collection('upvotes');
        if (parentComment) {
          upvote = await upvotes.findOne({user: req.userOId,
            resourceType: 'comment', resource: parentOId});
        }

        return rep.code(200).send({comment: parentComment,
          replies: commentArray, page, upvoted: upvote ? true : false});
      });

  fastify.delete('/comments/:commentId', deleteComment, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    const {commentId} = req.params;

    if (!fastify.mongo.ObjectId.isValid(commentId)) {
      return rep.code(400).send({error: 'invalid comment ID',
        message: 'Must be a valid MongoDB ObjectID'});
    }

    const commentOId = new fastify.mongo.ObjectId(commentId);

    const comments = fastify.mongo.db.collection('comments');
    const ideas = fastify.mongo.db.collection('ideas');
    const comment = await comments.findOne({_id: commentOId});

    if (!comment) {
      return rep.code(404).send({error: 'comment does not exist',
        message: 'A comment with this ID was not found'});
    }

    if (!comment.author.equals(req.userOId)) {
      return rep.code(400).send({error: 'not an author',
        message: 'Only the authors can delete their own comments.'});
    }

    if (comment.parent.equals(comment.superParent)) {
      ideas.updateOne({_id: comment.superParent}, {$inc: {replyCount: -1}});
    } else {
      comments.updateOne({_id: comment.parent}, {$inc: {replyCount: -1}});
    }

    if (!comment.replyCount) {
      await comments.deleteOne({_id: commentOId});
    } else {
      await comments.updateOne({_id: commentOId}, {$set:
        {comment: 'This comment was deleted.', deleted: true}});
    }

    rep.code(200).send({message: 'The comment was successfully deleted!'});
  });
};
