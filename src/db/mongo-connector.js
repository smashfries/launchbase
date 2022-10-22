import fastifyPlugin from 'fastify-plugin';
import fastifyMongo from '@fastify/mongodb';

import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

/**
 * MongoDB connector plugin
 * @param {FastifyInstance} fastify
 * @param {Object} options
 */
async function dbConnector(fastify, options) {
  fastify.register(fastifyMongo, {
    url: process.env.MONGODB_URI,
    forceClose: true,
  });
}

export default fastifyPlugin(dbConnector);
