import {validateEmail, inviteIdeaMembers} from '../../../utils/email.js';
import {createIdeaDraft, updateIdeaDraft,
  deleteIdeaDraft} from '../../../utils/schema.js';

/**
 * @param {*} fastify
 * @param {*} _options
 */
export default async function cudIdeas(fastify, _options) {
  fastify.post('/ideas', createIdeaDraft, async (req, rep) => {
    if (req.token) {
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({_id: req.userOId});
      const isComplete = user.hasOwnProperty('name') ? true : false;

      if (!isComplete) {
        return rep.code(400).send({error: 'profile incomplete'});
      }

      const members = req.body.members ? req.body.members :
      [];
      const memberEmails = members.map((i) => {
        return i.email;
      });
      let uniqueMembers = [...new Set(memberEmails)];
      if (members.length > 0) {
        let invalidEmails = memberEmails.find((i) => !validateEmail(i));
        if (!invalidEmails) {
          invalidEmails = members.find((i) => i.role !== 'admin' &&
          i.role !== 'member');
        }
        if (invalidEmails) {
          return rep.code(400).send({error: 'invalid-emails'});
        }
      }
      const drafts = fastify.mongo.db.collection('ideas');
      const ideaInvites = fastify.mongo.db.collection('idea-invites');
      const ideaMembers = fastify.mongo.db.collection('idea-members');

      const data = req.body;

      const draft = await drafts.insertOne({name: data.name,
        desc: data.desc ? data.desc : '', idea: data.idea ? data.idea : '',
        links: data.links ? data.links : [], status: 'draft',
        timeStamp: new Date()});
      await ideaMembers.insertOne({user: req.userOId, role: 'admin',
        idea: draft.insertedId});

      if (members.length > 0) {
        await inviteIdeaMembers(uniqueMembers, draft.insertedId);
        uniqueMembers = uniqueMembers.map((i) => {
          return {idea: draft.insertedId, email: i, timeStamp: new Date(),
            role: members.find((j) => j.email == i)
                .role};
        });
        await ideaInvites.insertMany(uniqueMembers);
      }

      rep.code(200).send({message: 'done', draftId: draft.insertedId});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.put('/ideas/:ideaId', updateIdeaDraft, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ideaId',
          message: 'Draft ID must be a valid MongoDB ObjectID'});
      }
      const drafts = fastify.mongo.db.collection('ideas');
      const members = fastify.mongo.db.collection('idea-members');
      const ideaOId = new fastify.mongo.ObjectId(ideaId);
      const idea = await drafts.findOne({_id: ideaOId});
      if (!idea) {
        return rep.code(400).send({error: 'idea does not exist'});
      }
      const member = await members.findOne({user: req.userOId, idea: ideaOId,
        role: 'admin'});
      if (!member) {
        return rep.code(400).send({error: 'not an admin',
          message: 'Must be a member of the idea and have the *admin* role.'});
      }
      const data = req.body;
      await drafts.updateOne({_id: ideaOId},
          {$set: {name: data.name, desc: data.desc ? data.desc : '',
            idea: data.idea ? data.idea : '',
            links: data.links ? data.links : []}});
      rep.code(200).send({message: 'done'});
    } else {
      rep.code(400).send({error: 'unauthorized', message: 'check auth token'});
    }
  });

  fastify.delete('/ideas/:ideaId', deleteIdeaDraft, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ID',
          message: 'Idea ID must be a valid MongoDB ObjectID'});
      }
      const ideaOId = new fastify.mongo.ObjectId(ideaId);
      const members = fastify.mongo.db.collection('idea-members');
      const ideas = fastify.mongo.db.collection('ideas');
      const ideaInvites = fastify.mongo.db.collection('idea-invites');
      const ideaMembers = await members.find({idea: ideaOId});
      const membersDocs = await ideaMembers.toArray();
      switch (membersDocs.length) {
        case 0:
          return rep.code(400).send({error: 'Idea does not exist'});
          break;
        case 1:
          await ideas.deleteOne({_id: ideaOId});
          await ideaInvites.deleteMany({idea: ideaOId});
          await members.deleteOne({idea: ideaOId, user: req.userOId});
          return rep.code(200).send({message: 'The idea was deleted as' +
          ' you were the only member'});
          break;
        default:
          await members.deleteOne({idea: ideaOId, user: req.userOId});
          if (membersDocs.length == 2) {
            await members.updateOne({idea: ideaOId}, {$set: {role: 'admin'}});
          }
          return rep.code(200).send({message: 'You have been removed' +
          ' from the idea'});
          break;
      }
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });
};
