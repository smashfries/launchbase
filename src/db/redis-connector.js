import fastifyPlugin from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';

import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

/**
 * Redis DB connector
 * @param {Fastify} fastify
 * @param {Object} options
 */
async function dbConnector(fastify, options) {
  fastify.register(fastifyRedis, {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  });
}

export default fastifyPlugin(dbConnector);
