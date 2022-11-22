import Fastify from 'fastify';

import {resolve} from 'path';

import fastifyStatic from '@fastify/static';
import pointOfView from '@fastify/view';

import handlebars from 'handlebars';
import * as dotenv from 'dotenv';

import mongoConnector from './db/mongo-connector.js';
import redisConnector from './db/redis-connector.js';

import pages from './routes/pages/pages.js';
import auth from './routes/api/auth.js';
import profile from './routes/api/profile.js';
import email from './routes/api/email.js';
import cruIdeas from './routes/api/ideas/cru-idea.js';
import ideaInvites from './routes/api/ideas/idea-invites.js';
import ideaMembers from './routes/api/ideas/idea-members.js';

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */
const fastify = new Fastify({
  logger: true,
  trustProxy: true,
});


fastify.register(fastifyStatic, {
  root: resolve('./public/templates'),
  serve: false,
});

fastify.register(fastifyStatic, {
  root: resolve('./public/assets'),
  decorateReply: false,
});

fastify.register(mongoConnector);
fastify.register(redisConnector);

dotenv.config({path: './.env'});

import {verifyToken} from './utils/crypto.js';
import {getIdeas, publishIdea, getIdea} from './utils/schema.js';

fastify.register(pointOfView, {
  engine: {
    handlebars,
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
fastify.register(email);
fastify.register(cruIdeas);
fastify.register(ideaInvites);
fastify.register(ideaMembers);

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
