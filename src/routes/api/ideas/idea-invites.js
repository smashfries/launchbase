import {validateEmail, inviteIdeaMembers} from '../../../utils/email.js';
import {verifyToken} from '../../../utils/crypto.js';

import {revokeIdeaInvite, sendIdeaInvite,
  acceptIdeaInvite, getIdeaInvites} from '../../../utils/schema.js';

/**
 * @param {*} fastify
 * @param {*} _options
 */
export default async function ideaInvites(fastify, _options) {
  fastify.post('/ideas/:ideaId/invite', sendIdeaInvite, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!validateEmail(req.body.email)) {
        return rep.code(400).send({error: 'invalid email'});
      }
      if (req.body.role !== 'admin' && req.body.role !== 'member') {
        return rep.code(400).send({error: 'invalid role',
          message: 'role must either be *member* or *admin*'});
      }
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ID',
          message: 'IdeaId must be a valid MongoDB ObjectID'});
      }
      const ideaInvites = fastify.mongo.db.collection('idea-invites');
      const ideas = fastify.mongo.db.collection('ideas');
      const ideaOId = new fastify.mongo.ObjectId(ideaId);
      const idea = await ideas.findOne({_id: ideaOId});
      if (!idea) {
        return rep.code(400).send({error: 'Idea does not exist.'});
      }

      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const member = await ideaMembers.findOne({idea: ideaOId,
        user: req.userOId, role: 'admin'});
      if (!member) {
        return rep.code(400).send({error: 'not an admin', message:
          'You must be an admin of this idea to invite someone.'});
      }

      await inviteIdeaMembers([req.body.email], ideaId);
      const newInvite = await ideaInvites.updateOne({email: req.body.email,
        idea: ideaOId}, {$set: {idea: ideaOId, email: req.body.email,
        role: req.body.role, timeStamp: new Date()}}, {upsert: true});
      rep.code(200).send({message: 'invite was sent', upsertedId:
      newInvite.upsertedId});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.delete('/ideas/invite/:inviteId', revokeIdeaInvite,
      async (req, rep) => {
        if (req.token) {
          const ideaMembers = fastify.mongo.db.collection('idea-members');
          const invites = fastify.mongo.db.collection('idea-invites');
          const {inviteId} = req.params;
          if (fastify.mongo.ObjectId.isValid(inviteId)) {
            const objectId = new fastify.mongo.ObjectId(inviteId);
            const invite = await invites.findOne({_id: objectId});
            if (invite) {
              const admin = await ideaMembers.findOne({idea:
                new fastify.mongo.ObjectId(invite.idea), user: req.userOId,
              role: 'admin'});
              if (admin) {
                await invites.deleteOne({_id: objectId});
                rep.code(200).send({message:
                  'Invite was successfully revoked!'});
              } else {
                rep.code(400).send({error:
                  'not an admind'});
              }
            } else {
              rep.code(400).send({error: 'Invite does not exists.'});
            }
          } else {
            rep.code(400).send({error:
              'Invalid invite ID. Must be a valid MongoDB ObjectID.'});
          }
        } else {
          rep.code(400).send({error: 'unauthorized'});
        }
      });

  fastify.post('/ideas/accept-invite', acceptIdeaInvite, async (req, rep) => {
    if (req.token) {
      const token = req.body.token;
      const decoded = verifyToken(token);
      if (!decoded) {
        return rep.code(400).send({error: 'invalid token'});
      }
      const ideaId = new fastify.mongo.ObjectId(decoded.ideaId);
      const ideaInvites = fastify.mongo.db.collection('idea-invites');
      const invite = await ideaInvites.findOne({idea: ideaId,
        email: decoded.email});
      if (!invite) {
        return rep.code(400).send({error: 'invite does not exist'});
      }
      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const member = await ideaMembers.findOne({idea: ideaId,
        user: req.userOId});
      if (member) {
        return rep.code(400).send({error:
          'you are already a member of this idea'});
      }
      const users = fastify.mongo.db.collection('users');
      const userDetails = await users.findOne({_id: req.userOId});
      const isComplete = userDetails.hasOwnProperty('name') ? true : false;
      if (!isComplete) {
        return rep.code(400).send({error: 'profile is incomplete'});
      }
      await ideaMembers.insertOne({idea: ideaId, role: invite.role,
        user: req.userOId});
      await ideaInvites.deleteOne({idea: ideaId, email: decoded.email});
      rep.code(200).send({message: 'invite was accepted, you are a member!'});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/ideas/:ideaId/invites', getIdeaInvites, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;
      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ideaId'});
      }

      const ideaOId = new fastify.mongo.ObjectId(ideaId);

      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const member = await ideaMembers.findOne({idea: ideaOId,
        user: req.userOId});
      if (!member) {
        return rep.code(400).send({error: 'access denied', message:
          'You mus'});
      }

      const ideaInviteCollection = fastify.mongo.db.collection('idea-invites');
      const ideaInvites = await ideaInviteCollection.find({idea: ideaOId});

      const arr = await ideaInvites.toArray();

      rep.code(200).send({invites: arr});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });
};
