import {publishIdea} from '../../../utils/schema.js';

/**
 * @param {*} fastify
 * @param {*} _options
 */
export default async function ideaStatus(fastify, _options) {
  fastify.put('/ideas/:ideaId/publish', publishIdea, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ideaID', message:
          'ideaId must be a valid MongoDB Object ID'});
      }
      const ideaOId = new fastify.mongo.ObjectId(ideaId);

      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const ideas = fastify.mongo.db.collection('ideas');

      const member = await ideaMembers.findOne({user: req.userOId,
        idea: ideaOId, role: 'admin'});
      if (!member) {
        return rep.code(400).send({error: 'not an admin', message:
          'you must be an *admin* user of this idea in order to publish it'});
      }
      const idea = await ideas.findOne({_id: ideaOId});
      if (!idea.desc || !idea.name || !idea.idea) {
        return rep.code(400).send({error: 'idea is incomplete'});
      }
      await ideas.updateOne({_id: ideaOId}, {$set: {status: 'published'}});
      rep.code(200).send({message: 'the idea was successfully published!'});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.put('/ideas/:ideaId/rollback', publishIdea, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ideaID', message:
          'ideaId must be a valid MongoDB Object ID'});
      }
      const ideaOId = new fastify.mongo.ObjectId(ideaId);

      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const ideas = fastify.mongo.db.collection('ideas');

      const member = await ideaMembers.findOne({user: req.userOId,
        idea: ideaOId, role: 'admin'});
      if (!member) {
        return rep.code(400).send({error: 'invalid user', message:
          'you must be an *admin* user of this idea in order to rollback'});
      }
      await ideas.updateOne({_id: ideaOId}, {$set: {status: 'draft'}});
      rep.code(200).send({message:
        'the idea was successfully reverted to draft!'});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });
};
