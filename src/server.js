const fastify = require('fastify')({
    logger: true,
})
require('dotenv').config({path: __dirname+'/./../.env'})

fastify.register(require('fastify-cors'), function (instance) {

    return (req, callback) => {
      let corsOptions = { origin: true }
      callback(null, corsOptions) // callback expects two parameters: error and options
    }
  })

const { randomBytes } = require('crypto')

fastify.register(require('./db/db-connector'))
fastify.register(require('fastify-redis'), { host: process.env.REDIS_HOST, port: 17807, password: process.env.REDIS_PASSWORD })
const sendEmailVerification = require('./utils/email-verification')
const { hash, verify, generateToken, verifyToken } = require('./utils/crypto')

fastify.get('/', (req, rep) => {
    const { redis } = fastify
    redis.del('adityavinodh22@gmail.com', 'a', (err) => {
        if (err) {
            console.log(err)
        } else {
            redis.get('adityavinodh22@gmail.com', (err, val) => {
                console.log(val)
                rep.send(val)
            })
        }
    })
})


fastify.post('/send-email-verification', async (req, rep) => {
    let email = req.body.email
    if (!email) {
        return rep.code(400).send({ error: 'missing-email' })
    }
    if (!req.body.type) {
        return rep.code(400).send({ error: 'missing-type' })
    }
    const valid = (req.body.type == 'login' || req.body.type == 'signup') ? true : false;
    if (!valid) {
        return rep.code(400).send({ error: 'invalid-type' })
    }
    email = email.toLowerCase()
    const users = fastify.mongo.db.collection('users')
    const user = await users.findOne({ email: req.body.email.toLowerCase() })
    if (req.body.type == 'login' && !user) {
        return rep.code(400).send({ error: 'account-invalid' })
    }
    if (req.body.type == 'signup' && user) {
        return rep.code(400).send({ error: 'account-exists' })
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
    const { redis } = fastify
    if (!req.body.code) {
        return rep.code(400).send({ error: 'code-missing' })
    }
    if (!req.body.identifier) {
        return rep.code(400).send({ error: 'identifier-missing' })
    }
    if (!req.body.email) {
        return rep.code(400).send({ error: 'email-missing' })
    }
    if (!req.body.type) {
        return rep.code(400).send({ error: 'type-missing' })
    }
    const valid = (req.body.type == 'login' || req.body.type == 'signup') ? true : false;
    if (!valid) {
        return rep.code(400).send({ error: 'invalid-type' })
    }
    const users = fastify.mongo.db.collection('users')
    const user = await users.findOne({ email: req.body.email.toLowerCase() })
    if (req.body.type == 'login' && !user) {
        return rep.code(400).send({ error: 'account-invalid' })
    }
    if (req.body.type == 'signup' && user) {
        return rep.code(400).send({ error: 'account-exists' })
    }
    const codes = fastify.mongo.db.collection('verification-codes')
    const code = await codes.findOne({ email: req.body.email.toLowerCase() })
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
    await fastify.mongo.db.collection('verification-codes').deleteMany({ email: req.body.email.toLowerCase() })
    if (req.body.type == 'signup') {
        await fastify.mongo.db.collection('users').insertOne({ email: req.body.email.toLowerCase() })
    }
    const token = generateToken(req.body.email.toLowerCase())
    await redis.rpush(req.body.email.toLowerCase(), token)
    return rep.code(200).send({ message: 'success', token })
})

fastify.post('/logout', async (req, rep) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1]
        const email = verifyToken(token).email
        if (email) {
            const { redis } = fastify;
            console.log(token, email)
            await redis.lrem(email, 1, token)
            rep.send({ message: 'Logged out' })
        } else {
            rep.code(400).send({ error: 'Invalid token' })
        }
    } else {
        rep.code(400).send({ error: 'Not logged in.' })
    }
})

fastify.post('/logout-all', async (req, rep) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1]
        const email = verifyToken(token).email
        if (email) {
            const { redis } = fastify;
            await redis.del(email)
            rep.send({ message: 'Successfully logged out of all devices' })
        } else {
            rep.code(400).send({ error: 'Invalid token' })
        }
    } else {
        rep.code(400).send({ error: 'Not logged in' })
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