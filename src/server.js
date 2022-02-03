const fastify = require('fastify')({
    logger: true,
})

fastify.register(require('fastify-cors'), function (instance) {

    return (req, callback) => {
      let corsOptions = { origin: true }
      callback(null, corsOptions) // callback expects two parameters: error and options
    }
  })

const { randomBytes } = require('crypto')

fastify.register(require('./db/db-connector'))
const sendEmailVerification = require('./utils/email-verification')
const { hash, verify, generateToken, verifyToken } = require('./utils/crypto')


fastify.get('/', (req, rep) => {
    const decoded = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkaXR5YXZpbm9kaDIyQGdtYWlsLmNvbSIsImlhdCI6MTY0Mzc5NzM5Mn0.4g4rV1qL15MHin_GtbfkkNnIqKIVZQ0wGqsoL9fQEbI')
    if (decoded) {
        rep.send({ decoded })
    } else {
        rep.send('error')
    }
})


fastify.post('/send-email-verification', async (req, rep) => {
    const email = req.body.email
    if (!email) {
        return rep.code(400).send({ error: 'missing-email' })
    }
    const users = fastify.mongo.db.collection('users')
    const user = await users.findOne({ email })
    if (user) {
        return rep.send({ error: 'account-exists' })
    }
    const result = await sendEmailVerification(email)
    if (result == 'error') {
        return rep.code(400).send({ error: 'invalid-email' })
    }
    const deviceIdentifier = randomBytes(24).toString('hex')
    const codes = fastify.mongo.db.collection('verification-codes')
    const item = await codes.findOne({ email })
    const expiresOn = new Date().getTime() + 300000
    if (item) {
        codes.updateOne({ email }, { $set: { code: hash(result), expiresOn, deviceIdentifier: hash(deviceIdentifier) } })
    } else {
        codes.insertOne({ email, code: hash(result), expiresOn, deviceIdentifier: hash(deviceIdentifier) })
    }
    return rep.code(200).send({ message: 'Email verification sent.', deviceIdentifier })
})

fastify.post('/verify-code', async (req, rep) => {
    if (!req.body.code) {
        return rep.code(400).send({ error: 'code-missing' })
    }
    if (!req.body.identifier) {
        return rep.code(400).send({ error: 'identifier-missing' })
    }
    if (!req.body.email) {
        return rep.code(400).send({ error: 'email-missing' })
    }
    const codes = fastify.mongo.db.collection('verification-codes')
    const code = await codes.findOne({ email: req.body.email })
    if (!code) {
        return rep.code(400).send({ error: 'invalid-email' })
    }
    const codeValidity = verify(req.body.code.toString(), code.code)
    const identifierValidity = verify(req.body.identifier, code.deviceIdentifier)
    if (!codeValidity) {
        return rep.code(400).send({ error: 'invalid-code' })
    }
    if (!identifierValidity) {
        return rep.code(400).send({ error: 'invalid-identifier' })
    }
    const currentTime = new Date().getTime()
    if (currentTime > code.expiresOn) {
        return rep.code(400).send({ error: 'expired' })
    }
    await fastify.mongo.db.collection('verification-codes').deleteMany({ email: req.body.email })
    await fastify.mongo.db.collection('users').insertOne({ email: req.body.email })
    const token = generateToken(req.body.email)
    return rep.code(200).send({ message: 'success', token })
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