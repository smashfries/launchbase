import {createComment} from '../../utils/schema.js';

/**
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
    }

    const comment = await comments.insertOne({comment: req.body.comment,
      parent: parentOId, superParent: superParentOId,
      superType: req.body.superType, timeStamp: new Date(),
      author: req.userOId});

    rep.code(200).send({message: 'comment was successfully created',
      commentId: comment.insertedId});
  });
};
