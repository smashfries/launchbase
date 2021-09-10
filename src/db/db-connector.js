const fastifyPlugin = require('fastify-plugin')

async function dbConnector (fastify, options) {
    fastify.register(require('fastify-mongodb'), {
       url: 'mongodb://127.0.0.1:27017',
       forceClose: true
    })
}

module.exports = fastifyPlugin(dbConnector)