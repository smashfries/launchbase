const fastify = require('fastify')({
    logger: true,
})

fastify.register(require('./db/db-connector'))
const sendEmailVerification = require('./utils/email-verification')


fastify.get('/', (req, rep) => {
    rep.send({ hello: 'world' })
})


fastify.post('/send-email-verification', async (req, rep) => {
    const email = req.body.email
    if (!email) {
        return rep.code(400).send({ error: 'Email not provided.' })
    }
    const users = fastify.mongo.db.collection('users')
    const user = await users.findOne({ email })
    if (user) {
        return rep.send({ error: 'Account already exists.' })
    }
    const result = await sendEmailVerification(email)
    if (result == 'error') {
        return rep.send({ error: 'Invalid email' })
    }
    const codes = fastify.mongo.db.collection('verification-codes')
    const item = await codes.findOne({ email })
    const expiresOn = new Date().getTime() + 300000
    if (item) {
        codes.updateOne({ email }, { $set: { code: result, expiresOn } })
    } else {
        codes.insertOne({ email, code: result, expiresOn })
    }
    return rep.code(200).send({ message: 'Email verification sent.' })
})

fastify.post('/verify-code', (req, rep) => {
    if (!req.body.code) {
        return rep.code(400).send({ error: 'Verification code not provided.' })
    }

    
})

const start = async () => {
    try {
        await fastify.listen(5000)
    } catch (e) {
        fastify.log.error(e)
        process.exit(1)
    }
}

start()