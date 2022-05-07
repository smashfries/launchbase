const fastifyPlugin = require('fastify-plugin')
require('dotenv').config({path: __dirname+'/./../../.env'})

async function dbConnector (fastify, options) {
    fastify.register(require('fastify-redis'), {
       host: process.env.REDIS_HOST,
       port: process.env.REDIS_PORT,
       password: process.env.REDIS_PASSWORD
    })
}

module.exports = fastifyPlugin(dbConnector)