import {isProfane} from '../../utils/filter.js';
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

    const parentId = req.body.parent;
    if (!fastify.mongo.ObjectId.isValid(parentId)) {
      return rep.code(400).send({error: 'invalid parentId',
        message: 'parentId is an invalid MongoDB Object ID'});
    }
    const parentOId = new fastify.mongo.ObjectId(parentId);

    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({_id: req.userOId});
    const isComplete = user.hasOwnProperty('name') ? true : false;
    if (!isComplete) {
      return rep.code(400).send({error: 'profile incomplete',
        message: 'Profile must be complete before posting a comment.'});
    }

    if (isProfane(req.body.comment)) {
      return rep.code(400).send({error: 'bad-words'});
    }

    const comments = fastify.mongo.db.collection('comments');
    const ideas = fastify.mongo.db.collection('ideas');

    let idea;
    let parentComment;
    let superParent;
    let superType;

    let ideaMember;

    switch (req.body.parentType) {
      case 'idea':
        idea = await ideas.findOne({_id: parentOId});
        if (!idea) {
          return rep.code(400).send({error: 'idea does not exist'});
        }
        superParent = idea._id;
        superType = 'idea';
        break;
      case 'comment':
        parentComment = await comments.findOne({_id: parentOId});
        if (!parentComment) {
          return rep.code(400).send({error: 'comment does not exist'});
        }
        superParent = parentComment.superParent;
        superType = parentComment.superType;
        break;
      default:
        return rep.code(400).send({error: 'parentType not supported'});
        break;
    }

    const author = await fastify.mongo.db.collection('users')
        .findOne({_id: req.userOId});

    switch (superType) {
      case 'idea':
        const ideaMembers = fastify.mongo.db.collection('idea-members');
        ideaMember = await ideaMembers
            .findOne({user: req.userOId, idea: superParent});
        break;
      default:
        break;
    }

    if (parentOId.equals(superParent)) {
      switch (superType) {
        case 'idea':
          await ideas.updateOne({_id: parentOId}, {$inc: {replyCount: 1}});
          break;

        default:
          break;
      }
    } else {
      // use || syntax and add on to account for other memberTypes in the future
      if (ideaMember) {
        await comments.updateOne({_id: parentOId}, {$inc: {replyCount: 1},
          $addToSet: {tags: 'team-replied'}});
      } else {
        await comments.updateOne({_id: parentOId}, {$inc: {replyCount: 1}});
      }
    }

    const totalCommentCount = await comments.count({parent: parentOId});
    const page = Math.floor(totalCommentCount / 20) + 1;

    // update the tags property to check for other possible members as expanded
    // use || syntax and add on
    // ex: ideaMember || realMember || abcMember ? ['team-response'] : []
    const tags = ideaMember ? ['team-response']: [];


    const comment = await comments.insertOne({comment: req.body.comment,
      parent: parentOId, superParent,
      superType, timeStamp: new Date(),
      author: req.userOId, tags});

    rep.code(200).send({message: 'comment was successfully created',
      commentId: comment.insertedId, authorName: author.nickname,
      authorHandle: author.url, authorId: author._id, page, tags});
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
        const users = fastify.mongo.db.collection('users');

        const parentComment = await comments.findOne({_id: parentOId});

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
              'replyCount': 1,
              'upvote_details._id': 1,
              'tags': 1,
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


        let upvote;

        const upvotes = fastify.mongo.db.collection('upvotes');
        if (parentComment) {
          upvote = await upvotes.findOne({user: req.userOId,
            resourceType: 'comment', resource: parentOId});
        }

        // eslint-disable-next-line camelcase
        let author_details;
        if (parentComment) {
          const parentAuthor = await users.findOne({_id: parentComment.author});
          // eslint-disable-next-line camelcase
          author_details = {displayName: parentAuthor.nickname,
            handle: parentAuthor.url};
        }

        // eslint-disable-next-line camelcase
        return rep.code(200).send({author_details, comment: parentComment,
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

    const superType = comment.superType;

    if (comment.parent.equals(comment.superParent)) {
      switch (superType) {
        case 'idea':
          ideas.updateOne({_id: comment.superParent}, {$inc: {replyCount: -1}});
          break;
        default:
          break;
      }
    } else {
      if (comment.tags.includes('team-response')) {
        const memberReplies = await comments.find({parent: comment.parent,
          tags: 'team-response'}).count();
        if (memberReplies == 1) {
          comments.updateOne({_id: comment.parent}, {$inc: {replyCount: -1},
            $pullAll: {tags: ['team-replied']}});
        } else {
          comments.updateOne({_id: comment.parent}, {$inc: {replyCount: -1}});
        }
      } else {
        comments.updateOne({_id: comment.parent}, {$inc: {replyCount: -1}});
      }
    }

    if (!comment.replyCount) {
      await comments.deleteOne({_id: commentOId});
    } else {
      await comments.updateOne({_id: commentOId}, {$set:
        {comment: 'This comment was deleted.', deleted: true},
      $pullAll: {tags: ['team-response']}});
    }

    rep.code(200).send({message: 'The comment was successfully deleted!'});
  });


  fastify.get('/comments/mine', getComments, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    const comments = fastify.mongo.db.collection('comments');

    const query = req.query;
    const page = query.page || 1;

    if (page < 1) {
      return rep.code(400).send({error:
        'page must be a number greater than or equal to 1'});
    }

    const userComments = await comments.aggregate([
      {
        $match: {
          author: req.userOId,
        },
      },
      {
        $lookup: {
          from: 'ideas',
          localField: 'superParent',
          foreignField: '_id',
          as: 'idea_details',
        },
      },
      // add additional lookups to other collections as needed
      {
        $project: {
          'idea_details.name': 1,
          'timeStamp': 1,
          'comment': 1,
          'upvotes': 1,
          'superParent': 1,
          'parent': 1,
        },
      },
      {
        $skip: (page - 1) * 20,
      },
      {
        $limit: 20,
      },
    ]);
    const array = await userComments.toArray();

    rep.code(200).send({replies: array, page});
  });
};
