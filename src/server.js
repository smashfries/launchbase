const fastify = require('fastify')({
    logger: true,
    trustProxy: true
})
const path = require('path')
require('dotenv').config({path: __dirname+'/./../.env'})

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public/templates'),
  serve: false
})

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public/assets'),
  decorateReply: false
})

const { randomBytes } = require('crypto')

fastify.register(require('./db/mongo-connector'))
fastify.register(require('./db/redis-connector'))
const sendEmailVerification = require('./utils/email-verification')
const { hash, verify, generateToken, verifyToken } = require('./utils/crypto')
const { sendEmailVerificationOpts } = require('./utils/schema')

fastify.register(require("point-of-view"), {
  engine: {
    ejs: require("handlebars"),
  },
   root: path.join(__dirname, "views"),
});

fastify.register(require('./routes'))

fastify.post('/send-email-verification', sendEmailVerificationOpts, async (req, rep) => {
    let email = req.body.email
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

fastify.post('/update-profile', async (req, rep) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1]
        const dToken = verifyToken(token);
        if (dToken) {
            const email = dToken.email
            let twitter = ''
            let github = ''
            const { redis } = fastify;
            const auths = await redis.lrange(email, 0, -1)
            if (auths.indexOf(token) !== -1) {
                if (!req.body.name) {
                    return rep.code(400).send({ error: 'name-missing' })
                }
                if (req.body.name.length > 256) {
                    return rep.code(400).send({ error: 'name-toolong' })
                }
                if (!req.body.nickname) {
                    return rep.code(400).send({ error: 'nickname-missing' })
                }
                if (req.body.nickname.length > 256) {
                    return rep.code(400).send({ error: 'nickname-toolong' })
                }
                if (!req.body.url) {
                    return rep.code(400).send({ error: 'url-missing' })
                }
                if (req.body.url.length > 256) {
                    return rep.code(400).send({ error: 'url-toolong' })
                }
                if (!req.body.occ) {
                    return rep.code(400).send({ error: 'occupation-missing' })
                }
                if (req.body.occ.length > 256) {
                    return rep.code(400).send({ error: 'occ-toolong' })
                }
                if (!req.body.skills) {
                    return rep.code(400).send({ error: 'skills-missing' })
                }
                if (req.body.skills.length > 256) {
                    return rep.code(400).send({ error: 'skills-toolong' })
                }
                if (!req.body.interests) {
                    return rep.code(400).send({ error: 'interests-missing' })
                }
                if (req.body.interests.length > 256) {
                    return rep.code(400).send({ error: 'interests-toolong' })
                }
                if (req.body.twitter) {
                    if (req.body.twitter.length > 16) {
                        return rep.code(400).send({ error: 'twitter-toolong' })
                    }
                    if (req.body.twitter.split('@').length > 2) {
                        return rep.code(400).send({ error: 'invalid-twitter' })
                    }
                    if (req.body.twitter.indexOf('@') > 0) {
                        return rep.code(400).send({ error: 'invalid-twitter' })
                    }
                    twitter = req.body.twitter
                }
                if (req.body.github) {
                    github = req.body.github
                }
                if (req.body.github.length > 39) {
                    return rep.code(400).send({ error: 'github-toolong' })
                }
                if (!req.body.url.match(/^[a-zA-Z0-9_]+$/g)) {
                    return rep.code(400).send({ error: 'invalid-url' })
                }
                const users = fastify.mongo.db.collection('users')
                const user = await users.findOne({ email })
                console.log(user)
                if (user.url) {
                    if (user.url !== req.body.url) {
                        const curosr = await users.find({ url: req.body.url })
                        const urlMatches = await curosr.toArray();
                        console.log(urlMatches, 'url')
                        if (urlMatches.length > 0) {
                            return rep.code(400).send({ error: 'url-exists' })
                        }
                    }
                } else {
                    const cursor = await users.find({ url: req.body.url })
                    const urlMatches = await cursor.toArray();
                    console.log(urlMatches, 'url')
                    if (urlMatches.length > 0) {
                        return rep.code(400).send({ error: 'url-exists' })
                    }
                }
                await users.updateOne({ email }, { $set: { email, name: req.body.name, nickname: req.body.nickname, url: req.body.url, occ: req.body.occ, skills: req.body.skills, interests: req.body.interests, github, twitter } })
                rep.code(200).send({ message: 'successfully updated profile' })
            } else {
                rep.code(400).send({ error: 'token-expired' })
            }
        } else {
            rep.code(400).send({ error: 'unauthorized' })
        }
    } else {
        rep.code(400).send({ error: 'unauthorized' })
    }
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


function build() {
  return fastify
}

async function start() {

  // You must listen on the port Cloud Run provides
  const port = process.env.PORT || 3000

  // You must listen on all IPV4 addresses in Cloud Run
  const address = "0.0.0.0"

  try {
    const server = build()
    await server.listen(port, address)
    console.log(`Listening on ${address}:${port}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

module.exports = build

if (require.main === module) {
  start()
}