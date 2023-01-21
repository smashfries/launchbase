/**
 * API endpoints for upvotes
 * @param {*} fastify
 * @param {*} _options
 */
export default async function upvote(fastify, _options) {
  fastify.post('/upvote/:resourceType/:resourceId', async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    const {resourceType, resourceId} = req.params;

    if (!fastify.mongo.ObjectId.isValid(resourceId)) {
      return rep.code(400).send({error: 'invalid resource ID',
        message: 'ID should be a valid MongoDB Object ID'});
    }

    const resourceOId = new fastify.mongo.ObjectId(resourceId);
    const upvotes = fastify.mongo.db.collection('upvotes');

    switch (resourceType) {
      case 'idea':
        const ideas = fastify.mongo.db.collection('ideas');
        const idea = await ideas.findOne({_id: resourceOId});

        if (!idea) {
          return rep.code(400).send({error: 'resource does not exist'});
        }

        const ideaUpdate = await upvotes.updateOne({user: req.userOId,
          resource: resourceOId, resourceType: 'idea'},
        {$set: {user: req.userOId, resource: resourceOId,
          resourceType: 'idea'}}, {upsert: true});

        if (ideaUpdate.upsertedCount === 1) {
          ideas.updateOne({_id: resourceOId}, {$inc: {upvotes: 1}});
        }

        rep.code(200).send({message: 'idea successfully upvoted!'});

        break;

      case 'comment':
        const comments = fastify.mongo.db.collection('comments');
        const comment = await comments.findOne({_id: resourceOId});

        if (!comment) {
          return rep.code(400).send({error: 'resource does not exist'});
        }

        const commentUpdate = await upvotes.updateOne({user: req.userOId,
          resource: resourceOId, resourceType: 'comment'},
        {$set: {user: req.userOId, resource: resourceOId,
          resourceType: 'comment'}}, {upsert: true});

        if (commentUpdate.upsertedCount === 1) {
          comments.updateOne({_id: resourceOId}, {$inc: {upvotes: 1}});
        }

        rep.code(200).send({message: 'comment succesfully upvoted'});
      default:
        return rep.code(400).send({error: 'invalid resource type'});
        break;
    }
  });


  fastify.post('/downvote/:resourceType/:resourceId', async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    const {resourceType, resourceId} = req.params;

    if (!fastify.mongo.ObjectId.isValid(resourceId)) {
      return rep.code(400).send({error: 'invalid resource ID',
        message: 'ID should be a valid MongoDB Object ID'});
    }

    const resourceOId = new fastify.mongo.ObjectId(resourceId);
    const upvotes = fastify.mongo.db.collection('upvotes');

    switch (resourceType) {
      case 'idea':
        const ideas = fastify.mongo.db.collection('ideas');
        const idea = await ideas.findOne({_id: resourceOId});

        if (!idea) {
          return rep.code(400).send({error: 'resource does not exist'});
        }

        const ideaUpdate = await upvotes.deleteOne({user: req.userOId,
          resource: resourceOId, resourceType: 'idea'});

        if (ideaUpdate.deletedCount === 1) {
          ideas.updateOne({_id: resourceOId}, {$inc: {upvotes: -1}});
        }

        rep.code(200).send({message: 'idea successfully downvoted!'});

        break;

      case 'comment':
        const comments = fastify.mongo.db.collection('comments');
        const comment = await comments.findOne({_id: resourceOId});

        if (!comment) {
          return rep.code(400).send({error: 'resource does not exist'});
        }

        const commentUpdate = await upvotes.deleteOne({user: req.userOId,
          resource: resourceOId, resourceType: 'comment'});

        if (commentUpdate.deletedCount === 1) {
          comments.updateOne({_id: resourceOId}, {$inc: {upvotes: -1}});
        }

        rep.code(200).send({message: 'comment succesfully upvoted'});
      default:
        return rep.code(400).send({error: 'invalid resource type'});
        break;
    }
  });
};
