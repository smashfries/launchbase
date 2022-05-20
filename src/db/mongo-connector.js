const fastifyPlugin = require('fastify-plugin');
require('dotenv').config({path: __dirname+'/./../../.env'});

/**
 * MongoDB connector plugin
 * @param {*} fastify
 * @param {*} options
 */
async function dbConnector(fastify, options) {
  fastify.register(require('@fastify/mongodb'), {
    url: process.env.MONGODB_URI,
    forceClose: true,
  });
}

module.exports = fastifyPlugin(dbConnector);
