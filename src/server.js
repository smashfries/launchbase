import Fastify from 'fastify';

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */
const fastify = new Fastify({
  logger: true,
  trustProxy: true,
});

import {resolve} from 'path';

import fastifyStatic from '@fastify/static';
fastify.register(fastifyStatic, {
  root: resolve('./public/templates'),
  serve: false,
});

fastify.register(fastifyStatic, {
  root: resolve('./public/assets'),
  decorateReply: false,
});

import pointOfView from '@fastify/view';
import handlebars from 'handlebars';

import pages from './routes/pages/pages.js';
import auth from './routes/api/auth.js';
import profile from './routes/api/profile.js';

import mongoConnector from './db/mongo-connector.js';
import redisConnector from './db/redis-connector.js';
fastify.register(mongoConnector);
fastify.register(redisConnector);

import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

import {validateEmail, inviteIdeaMembers} from './utils/email.js';
import {verifyToken} from './utils/crypto.js';
import {logoutOpts, createIdeaDraft, updateIdeaDraft, deleteIdeaDraft,
  getIdeas, revokeIdeaInvite, sendIdeaInvite, acceptIdeaInvite,
  updateIdeaMemberRole, publishIdea, getIdea} from './utils/schema.js';

fastify.register(pointOfView, {
  engine: {
    ejs: handlebars,
  },
  root: resolve('./src/views'),
});

fastify.decorateRequest('user', null);
fastify.decorateRequest('token', '');

fastify.addHook('preHandler', async (req, rep) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    const dToken = verifyToken(token);
    if (dToken) {
      const {redis} = fastify;
      const id = dToken.id;
      const oid = new fastify.mongo.ObjectId(id);
      req.user = id;
      req.userOId = oid;
      const auths = await redis.lrange(id, 0, -1);
      if (auths.indexOf(token) !== -1) {
        req.token = token;
      }
    }
  }
});

fastify.register(pages);
fastify.register(auth);
fastify.register(profile);

fastify.post('/ideas', createIdeaDraft, async (req, rep) => {
  if (req.token) {
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
      return rep.code(400).send({error: 'invalid ID',
        message: 'Draft ID must be a valid MongoDB ObjectID'});
    }
    const drafts = fastify.mongo.db.collection('ideas');
    const members = fastify.mongo.db.collection('idea-members');
    const ideaOId = new fastify.mongo.ObjectId(ideaId);
    const idea = await drafts.findOne({_id: ideaOId});
    if (!idea) {
      return rep.code(400).send({error: 'draft does not exist'});
    }
    const member = await members.findOne({user: req.userOId, idea: ideaOId,
      role: 'admin'});
    if (!member) {
      return rep.code(400).send({error: 'unauthorized',
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
                'You must be an admin to delete an invite'});
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

fastify.patch('/ideas/:ideaId/members/:memberId/role', updateIdeaMemberRole,
    async (req, rep) => {
      if (req.token) {
        const {ideaId, memberId} = req.params;
        if (!fastify.mongo.ObjectId.isValid(ideaId)) {
          return rep.code(400).send({error:
            'ideaId must be a valid MongoDB Object ID'});
        }
        if (!fastify.mongo.ObjectId.isValid(memberId)) {
          return rep.code(400).send({error:
            'memberId must be a valid MongoDB Object ID'});
        }
        if (req.body.role !== 'admin' && req.body.role !== 'member') {
          return rep.code(400).send({error:
            'invalid role', message: 'role must be *admin* or *member*'});
        }
        const ideaOId = new fastify.mongo.ObjectId(ideaId);
        const memberOId = new fastify.mongo.ObjectId(memberId);
        const ideaMembers = fastify.mongo.db.collection('idea-members');
        const currentMember = await ideaMembers.findOne({idea: ideaOId,
          user: req.userOId, role: 'admin'});
        if (!currentMember) {
          return rep.code(400).send({error:
            'you must be an admin of this idea to change roles'});
        }
        const toUpdateMember = await ideaMembers.findOne({idea: ideaOId,
          user: memberOId});
        if (!toUpdateMember) {
          return rep.code(400).send({error:
            'member does not exist for this idea'});
        }
        const adminMembers = await ideaMembers.find({idea: ideaOId,
          role: 'admin'});
        const membersArray = await adminMembers.toArray();

        if (membersArray.length == 1 && req.body.role == 'member' &&
         toUpdateMember.role == 'admin') {
          return rep.code(400).send({error:
            'there must be atleast one admin for every idea'});
        }
        await ideaMembers.updateOne({idea: ideaOId,
          user: memberOId}, {$set: {role: req.body.role}});
        rep.code(200).send({message: 'member role was successfully updated!'});
      } else {
        rep.code(400).send({error: 'unauthorized'});
      }
    });

fastify.post('/ideas/:ideaId/publish', publishIdea, async (req, rep) => {
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
        'you must be an *admin* user of this idea in order to publish it'});
    }
    await ideas.updateOne({_id: ideaOId}, {$set: {status: 'published'}});
    rep.code(200).send({message: 'the idea was successfully published!'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/ideas/:ideaId/rollback', publishIdea, async (req, rep) => {
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

fastify.get('/ideas/published', getIdeas, async (req, rep) => {
  if (req.token) {
    const query = req.query;
    const filter = query.filter;
    const page = query.page ? query.page : 1;
    if (page < 1) {
      return rep.code(400).send({error:
        'page must be a number greater than or equal to 1'});
    }
    const ideasCollection = fastify.mongo.db.collection('ideas');

    if (filter == 'display' || !filter) {
      const latestIdeas = await ideasCollection.find({status: 'published'})
          .sort({timeStamp: -1}).skip((page - 1)*20).limit(20);
      const hottestIdeas = await ideasCollection.find({status: 'published'})
          .sort({upvotes: 1}).skip((page - 1)*20).limit(5);

      const latestIdeasArr = await latestIdeas.toArray();
      const hottestIdeasArr = await hottestIdeas.toArray();

      return rep.code(200).send({latestIdeas: latestIdeasArr,
        hottestIdeas: hottestIdeasArr});
    }

    if (filter == 'latest') {
      const latestIdeas = await ideasCollection.find({status: 'published'})
          .sort({timeStamp: -1}).skip((page - 1)*20).limit(20);
      const arr = await latestIdeas.toArray();
      return rep.code(200).send({latestIdeas: arr});
    }

    if (filter == 'oldest') {
      const oldestIdeas = await ideasCollection.find({status: 'published'})
          .sort({timeStamp: 1}).skip((page - 1)*20).limit(20);
      const arr = await oldestIdeas.toArray();
      return rep.code(200).send({oldestIdeas: arr});
    }

    if (filter == 'upvotes') {
      const hottestIdeas = await ideasCollection.find({status: 'published'})
          .sort({upvotes: -1}).skip((page - 1)*20).limit(20);

      const arr = await hottestIdeas.toArray();
      return rep.code(200).send({hottestIdeas: arr});
    }
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/ideas/my/drafts', getIdeas, async (req, rep) => {
  if (req.token) {
    const ideaMembers = fastify.mongo.db.collection('idea-members');
    const myIdeaDrafts = await ideaMembers.aggregate([
      {
        $match: {
          user: req.userOId,
        },
      },
      {
        $lookup: {
          from: 'ideas',
          localField: 'idea',
          foreignField: '_id',
          as: 'idea_details',
        },
      },
      {
        $match: {
          'idea_details.status': 'draft',
        },
      },
      {
        $project: {
          'idea_details._id': 1,
          'idea_details.name': 1,
          'idea_details.desc': 1,
          'idea_details.timeStamp': 1,
        },
      },
    ]);
    const arr = await myIdeaDrafts.toArray();
    console.log(arr);
    rep.code(200).send({latestIdeas: arr});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/ideas/my/published', getIdeas, async (req, rep) => {
  if (req.token) {
    const ideaMembers = fastify.mongo.db.collection('idea-members');
    const myIdeaDrafts = await ideaMembers.aggregate([
      {
        $match: {
          user: req.userOId,
        },
      },
      {
        $lookup: {
          from: 'ideas',
          localField: 'idea',
          foreignField: '_id',
          as: 'idea_details',
        },
      },
      {
        $match: {
          'idea_details.status': 'published',
        },
      },
      {
        $project: {
          'idea_details._id': 1,
          'idea_details.name': 1,
          'idea_details.desc': 1,
          'idea_details.timeStamp': 1,
        },
      },
    ]);
    const arr = await myIdeaDrafts.toArray();
    console.log(arr);
    rep.code(200).send({latestIdeas: arr});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/ideas/:ideaId', getIdea, async (req, rep) => {
  if (req.token) {
    const {ideaId} = req.params;

    if (!fastify.mongo.ObjectId.isValid(ideaId)) {
      return rep.code(400).send({error: 'invalid ideaId',
        message: 'ideaId must be a valid MongoDB Object ID'});
    }

    const ideaOId = new fastify.mongo.ObjectId(ideaId);
    const ideas = fastify.mongo.db.collection('ideas');
    const ideaMembers = fastify.mongo.db.collection('idea-members');
    const idea = await ideas.findOne({_id: ideaOId});

    if (!idea) {
      return rep.code(400).send({error: 'idea does not exist'});
    }

    if (idea.status == 'draft') {
      const member = await ideaMembers.findOne({idea: ideaOId,
        user: req.userOId});
      if (!member) {
        return rep.code(400).send({error: 'access denied',
          message: 'you are not a member of this idea'});
      }
    }

    const members = await ideaMembers.aggregate([
      {
        $match: {
          idea: ideaOId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user_details',
        },
      },
      {
        $project: {
          'user_details.nickname': 1,
          'user': 1,
          'role': 1,
        },
      },
    ]);
    const arr = await members.toArray();

    const target = {members: arr};
    rep.code(200).send(Object.assign(target, idea));
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/logout', logoutOpts, async (req, rep) => {
  if (req.user) {
    if (req.token) {
      const {redis} = fastify;
      await redis.lrem(req.user, 1, req.token);
      rep.code(200).send({message: 'Logged out'});
    } else {
      rep.code(200).send({message: 'Already logged out'});
    }
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/logout-all', logoutOpts, async (req, rep) => {
  if (req.token) {
    const {redis} = fastify;
    await redis.del(req.user);
    rep.code(200).send({message: 'Successfully logged out of all devices'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

/**
 * Build function
 * @return {Object} The fastify instance.
 */
function build() {
  return fastify;
}

/**
 * Starts the server
 * @return {null}
 */
async function start() {
  // You must listen on the port Cloud Run provides
  const port = process.env.PORT || 3000;

  // You must listen on all IPV4 addresses in Cloud Run
  const address = '0.0.0.0';

  try {
    const server = build();
    await server.listen({port});
    console.log(`Listening on ${address}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
