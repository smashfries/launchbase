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

import routes from './routes.js';

import mongoConnector from './db/mongo-connector.js';
import redisConnector from './db/redis-connector.js';
fastify.register(mongoConnector);
fastify.register(redisConnector);

import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});


import {randomBytes} from 'crypto';

import {sendEmailVerification, validateEmail,
  inviteIdeaMembers} from './utils/email.js';
import {hash, verify, generateToken, verifyToken,
  md5} from './utils/crypto.js';
import {sendEmailVerificationOpts, verifyCodeOpts, updateProfileOpts,
  getProfileOpts, getEmailSettings, logoutOpts,
  updateEmailSettings, getActiveTokens, createIdeaDraft,
  getIdeas, revokeIdeaInvite} from './utils/schema.js';

fastify.register(pointOfView, {
  engine: {
    ejs: handlebars,
  },
  root: resolve('./src/views'),
});

fastify.register(routes);

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

fastify.post('/send-email-verification', sendEmailVerificationOpts,
    async (req, rep) => {
      let email = req.body.email;
      const valid = (req.body.type == 'login' || req.body.type == 'signup') ?
        true : false;
      if (!valid) {
        return rep.code(400).send({error: 'invalid-type'});
      }
      email = email.toLowerCase();
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({email: req.body.email.toLowerCase()});
      if (req.body.type == 'login' && !user) {
        return rep.code(400).send({error: 'account-invalid'});
      }
      if (req.body.type == 'signup' && user) {
        return rep.code(400).send({error: 'account-exists'});
      }
      const result = await sendEmailVerification(email);
      if (result == 'error') {
        return rep.code(400).send({error: 'invalid-email'});
      }
      const deviceIdentifier = randomBytes(24).toString('hex');
      const codes = fastify.mongo.db.collection('verification-codes');
      const item = await codes.findOne({email});
      const expiresOn = new Date().getTime() + 300000;
      if (item) {
        codes.updateOne({email}, {$set: {code: hash(result), expiresOn,
          deviceIdentifier: hash(deviceIdentifier)}});
      } else {
        codes.insertOne({email, code: hash(result), expiresOn,
          deviceIdentifier: hash(deviceIdentifier)});
      }
      return rep.code(200).send({deviceIdentifier});
    });

fastify.post('/verify-code', verifyCodeOpts, async (req, rep) => {
  const {redis} = fastify;
  const valid = (req.body.type == 'login' || req.body.type == 'signup') ?
    true : false;
  if (!valid) {
    return rep.code(400).send({error: 'invalid-type'});
  }
  const users = fastify.mongo.db.collection('users');
  const email = req.body.email.toLowerCase();
  const user = await users.findOne({email});
  if (req.body.type == 'login' && !user) {
    return rep.code(400).send({error: 'account-invalid'});
  }
  if (req.body.type == 'signup' && user) {
    return rep.code(400).send({error: 'account-exists'});
  }
  const codes = fastify.mongo.db.collection('verification-codes');
  const code = await codes.findOne({email});
  if (!code) {
    return rep.code(400).send({error: 'invalid-email'});
  }
  const codeValidity = verify(req.body.code, code.code);
  const identifierValidity = verify(req.body.identifier, code.deviceIdentifier);
  if (!codeValidity) {
    return rep.code(400).send({error: 'invalid-code'});
  }
  if (!identifierValidity) {
    return rep.code(400).send({error: 'invalid-identifier'});
  }
  const currentTime = new Date().getTime();
  if (currentTime > code.expiresOn) {
    return rep.code(400).send({error: 'expired'});
  }
  let id;
  await fastify.mongo.db.collection('verification-codes').deleteMany({email});
  if (req.body.type == 'signup') {
    const newUser = await fastify.mongo.db.collection('users')
        .insertOne({email});
    id = newUser.insertedId;
  } else {
    id = user._id;
  }
  const token = generateToken(id, md5(email));
  await redis.rpush(id, token);
  return rep.code(200).send({token});
});

fastify.post('/profile', updateProfileOpts, async (req, rep) => {
  if (req.token) {
    let twitter = '';
    let github = '';
    if (req.body.twitter) {
      if (req.body.twitter.split('@').length > 2) {
        return rep.code(400).send({error: 'invalid-twitter'});
      }
      if (req.body.twitter.indexOf('@') > 0) {
        return rep.code(400).send({error: 'invalid-twitter'});
      }
      twitter = req.body.twitter;
    }
    if (req.body.github) {
      github = req.body.github;
    }
    console.log(req.body.url);
    if (!req.body.url.match(/^[a-zA-Z0-9_-]+$/g)) {
      return rep.code(400).send({error: 'invalid-url'});
    }
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({_id: req.userOId});
    const url = req.body.url;
    if (user.url) {
      if (user.url !== url) {
        const cursor = await users.find({url});
        const urlMatches = await cursor.toArray();
        if (urlMatches.length > 0) {
          return rep.code(400).send({error: 'url-exists'});
        }
      }
    } else {
      const cursor = await users.find({url});
      const urlMatches = await cursor.toArray();
      if (urlMatches.length > 0) {
        return rep.code(400).send({error: 'url-exists'});
      }
    }
    await users.updateOne({_id: req.userOId}, {$set: {name: req.body.name,
      nickname: req.body.nickname, url: req.body.url, occ: req.body.occ,
      skills: req.body.skills, interests: req.body.interests, github,
      twitter}});
    rep.code(200).send({message: 'successfully updated profile'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/profile', getProfileOpts, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({_id: req.userOId});
    const isComplete = user.hasOwnProperty('name') ? true : false;
    rep.code(200).send({...user, isComplete});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/email-settings', getEmailSettings, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({_id: req.userOId});
    const publicEmail = user.hasOwnProperty('publicEmail') &&
     user.publicEmail ? true : false;
    const subscribed = user.hasOwnProperty('subscribed') &&
     user.subscribed ? true : false;
    rep.code(200).send({publicEmail, subscribed});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/email-settings', updateEmailSettings, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');

    await users.updateOne({_id: req.userOId}, {$set:
      {publicEmail: req.body.publicEmail, subscribed: req.body.subscribed}});
    rep.code(200).send({message: 'success'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/active-tokens', getActiveTokens, async (req, rep) => {
  if (req.token) {
    const {redis} = fastify;
    const tokens = await redis.lrange(req.user, 0, -1);
    rep.code(200).send({number: tokens.length});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/ideas/draft', createIdeaDraft, async (req, rep) => {
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
    const drafts = fastify.mongo.db.collection('idea-drafts');
    const ideaInvites = fastify.mongo.db.collection('idea-invites');
    const ideaMembers = fastify.mongo.db.collection('idea-members');

    const data = req.body;

    const draft = await drafts.insertOne({name: data.name,
      desc: data.desc ? data.desc : '', idea: data.idea ? data.idea : '',
      links: data.links ? data.links : []});
    await ideaMembers.insertOne({user: req.userOId, role: 'admin',
      idea: draft.insertedId});

    if (members.length > 0) {
      await inviteIdeaMembers(uniqueMembers, draft.insertedId);
      uniqueMembers = uniqueMembers.map((i) => {
        return {idea: draft.insertedId, email: i, timeStamp: new Date(),
          status: 'draft', role: members.find((j) => j.email == i)
              .role};
      });
      await ideaInvites.insertMany(uniqueMembers);
    }

    rep.code(200).send({message: 'done'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.delete('/idea/invite', revokeIdeaInvite, async (req, rep) => {
  if (req.token) {
    const ideaMembers = fastify.mongo.db.collection('idea-members');
    const invites = fastify.mongo.db.collection('idea-invites');
    if (fastify.mongo.ObjectId.isValid(req.body.inviteId)) {
      const inviteId = new fastify.mongo.ObjectId(req.body.inviteId);
      const invite = await invites.findOne({_id: inviteId});
      if (invite) {
        const owner = await ideaMembers.findOne({idea:
          new fastify.mongo.ObjectId(invite.idea), user: req.userOId,
        accessPrivilege: 'owner'});
        if (owner) {
          await invites.deleteOne({_id: inviteId});
          rep.code(200).send({message:
             'Invite was successfully revoked!'});
        } else {
          rep.code(400).send({error:
             'You must be an owner to delete an invite'});
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

fastify.get('/ideas', getIdeas, async (req, rep) => {
  if (req.token) {
    const ideasCollection = fastify.mongo.db.collection('ideas');
    const cursor = await ideasCollection.aggregate([
      {
        $lookup: {
          from: 'idea-members',
          localField: '_id',
          foreignField: 'idea',
          as: 'member_details',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'member_details.user',
          foreignField: '_id',
          as: 'users',
        },
      },
      {
        $project: {
          'name': 1,
          'desc': 1,
          'users.name': 1,
        },
      },
    ]);
    const ideas = await cursor.toArray();
    console.log(ideas);
    rep.code(200).send({ideas});
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
