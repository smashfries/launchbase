const fastify = require('fastify')({
    logger: true
})

fastify.register(require('./db/db-connector'))

fastify.get('/', (request, reply) => {
    reply.send({ hello: 'world' })
})

const start = async () => {
    try {
        await fastify.listen(3000)
    } catch (e) {
        fastify.log.error(e)
        process.exit(1)
    }
}

start()