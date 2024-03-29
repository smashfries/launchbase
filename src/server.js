import Fastify from 'fastify';

import {resolve} from 'path';
import minifier from 'html-minifier';

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
import cudIdeas from './routes/api/ideas/cud-idea.js';
import rIdeas from './routes/api/ideas/r-idea.js';
import ideaInvites from './routes/api/ideas/idea-invites.js';
import ideaMembers from './routes/api/ideas/idea-members.js';
import ideaStatus from './routes/api/ideas/idea-status.js';
import discuss from './routes/api/discuss.js';
import upvote from './routes/api/upvote.js';
import contact from './routes/api/contact.js';

import {verifyToken} from './utils/crypto.js';

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
  prefix: '/static',
});

fastify.register(mongoConnector);
fastify.register(redisConnector);

dotenv.config({path: './.env'});

fastify.register(pointOfView, {
  engine: {
    handlebars,
  },
  root: resolve('./src/views'),
  layout: 'layout.hbs',
  options: {
    useHtmlMinifier: minifier,
    partials: {
      header: 'partials/header.hbs',
      profilePic: 'partials/profile-pic.hbs',
      nav: 'partials/nav.hbs',
      confirmDialog: 'partials/confirm-dialog.hbs',
    },
  },
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
fastify.register(cudIdeas);
fastify.register(rIdeas);
fastify.register(ideaInvites);
fastify.register(ideaMembers);
fastify.register(ideaStatus);
fastify.register(discuss);
fastify.register(upvote);
fastify.register(contact);

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
  const host = '0.0.0.0';

  try {
    const server = build();
    await server.listen({port, host});
    console.log(`Listening on ${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
