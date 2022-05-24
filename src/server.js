const fastify = require('fastify')({
  logger: true,
  trustProxy: true,
});
fastify.register(require('./db/mongo-connector'));
fastify.register(require('./db/redis-connector'));

const path = require('path');
require('dotenv').config({path: __dirname + '/./../.env'});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public/templates'),
  serve: false,
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public/assets'),
  decorateReply: false,
});

const {randomBytes} = require('crypto');

const {sendEmailVerification, validateEmail,
  inviteIdeaMembers} = require('./utils/email');
const {hash, verify, generateToken, verifyToken} = require('./utils/crypto');
const {sendEmailVerificationOpts, verifyCodeOpts, updateProfileOpts,
  getProfileOpts, getEmailSettings, logoutOpts,
  updateEmailSettings, getActiveTokens, createIdea,
  getIdeas} = require('./utils/schema');

fastify.register(require('point-of-view'), {
  engine: {
    ejs: require('handlebars'),
  },
  root: path.join(__dirname, 'views'),
});

fastify.register(require('./routes'));

fastify.decorateRequest('user', null);
fastify.decorateRequest('token', '');
fastify.addHook('preHandler', async (req, rep) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    const dToken = verifyToken(token);
    if (dToken) {
      const {redis} = fastify;
      const email = dToken.email;
      req.user = email;
      const auths = await redis.lrange(email, 0, -1);
      if (auths.indexOf(token) !== -1) {
        req.token = token;
      } else {
        await redis.lrem(email, 1, token);
      }
    }
  }
});

fastify.post('/send-email-verification', sendEmailVerificationOpts,
    async (req, rep) => {
      let email = req.body.email;
      const valid = (req.body.type == 'login' || req.body.type == 'signup') ?
        true : false;
      if (!valid) {
        return rep.code(400).send({error: 'invalid-type'});
      }
      email = email.toLowerCase();
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({email: req.body.email.toLowerCase()});
      if (req.body.type == 'login' && !user) {
        return rep.code(400).send({error: 'account-invalid'});
      }
      if (req.body.type == 'signup' && user) {
        return rep.code(400).send({error: 'account-exists'});
      }
      const result = await sendEmailVerification(email);
      if (result == 'error') {
        return rep.code(400).send({error: 'invalid-email'});
      }
      const deviceIdentifier = randomBytes(24).toString('hex');
      const codes = fastify.mongo.db.collection('verification-codes');
      const item = await codes.findOne({email});
      const expiresOn = new Date().getTime() + 300000;
      if (item) {
        codes.updateOne({email}, {$set: {code: hash(result), expiresOn,
          deviceIdentifier: hash(deviceIdentifier)}});
      } else {
        codes.insertOne({email, code: hash(result), expiresOn,
          deviceIdentifier: hash(deviceIdentifier)});
      }
      return rep.code(200).send({deviceIdentifier});
    });

fastify.post('/verify-code', verifyCodeOpts, async (req, rep) => {
  const {redis} = fastify;
  const valid = (req.body.type == 'login' || req.body.type == 'signup') ?
    true : false;
  if (!valid) {
    return rep.code(400).send({error: 'invalid-type'});
  }
  const users = fastify.mongo.db.collection('users');
  const email = req.body.email.toLowerCase();
  const user = await users.findOne({email});
  if (req.body.type == 'login' && !user) {
    return rep.code(400).send({error: 'account-invalid'});
  }
  if (req.body.type == 'signup' && user) {
    return rep.code(400).send({error: 'account-exists'});
  }
  const codes = fastify.mongo.db.collection('verification-codes');
  const code = await codes.findOne({email});
  if (!code) {
    return rep.code(400).send({error: 'invalid-email'});
  }
  const codeValidity = verify(req.body.code, code.code);
  const identifierValidity = verify(req.body.identifier, code.deviceIdentifier);
  if (!codeValidity) {
    return rep.code(400).send({error: 'invalid-code'});
  }
  if (!identifierValidity) {
    return rep.code(400).send({error: 'invalid-identifier'});
  }
  const currentTime = new Date().getTime();
  if (currentTime > code.expiresOn) {
    return rep.code(400).send({error: 'expired'});
  }
  await fastify.mongo.db.collection('verification-codes').deleteMany({email});
  if (req.body.type == 'signup') {
    await fastify.mongo.db.collection('users').insertOne({email});
  }
  const token = generateToken(email);
  await redis.rpush(email, token);
  return rep.code(200).send({token});
});

fastify.post('/profile', updateProfileOpts, async (req, rep) => {
  if (req.token) {
    const email = req.user;
    let twitter = '';
    let github = '';
    if (req.body.twitter) {
      if (req.body.twitter.split('@').length > 2) {
        return rep.code(400).send({error: 'invalid-twitter'});
      }
      if (req.body.twitter.indexOf('@') > 0) {
        return rep.code(400).send({error: 'invalid-twitter'});
      }
      twitter = req.body.twitter;
    }
    if (req.body.github) {
      github = req.body.github;
    }
    console.log(req.body.url);
    if (!req.body.url.match(/^[a-zA-Z0-9_-]+$/g)) {
      return rep.code(400).send({error: 'invalid-url'});
    }
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({email});
    const url = req.body.url;
    if (user.url) {
      if (user.url !== url) {
        const cursor = await users.find({url});
        const urlMatches = await cursor.toArray();
        if (urlMatches.length > 0) {
          return rep.code(400).send({error: 'url-exists'});
        }
      }
    } else {
      const cursor = await users.find({url});
      const urlMatches = await cursor.toArray();
      if (urlMatches.length > 0) {
        return rep.code(400).send({error: 'url-exists'});
      }
    }
    await users.updateOne({email}, {$set: {email, name: req.body.name,
      nickname: req.body.nickname, url: req.body.url, occ: req.body.occ,
      skills: req.body.skills, interests: req.body.interests, github,
      twitter}});
    rep.code(200).send({message: 'successfully updated profile'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/profile', getProfileOpts, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({email: req.user});
    const isComplete = user.name ? true : false;
    rep.code(200).send({...user, isComplete});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/email-settings', getEmailSettings, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({email: req.user});
    const publicEmail = user.publicEmail ? true : false;
    const subscribed = user.subscribed ? true : false;
    rep.code(200).send({publicEmail, subscribed});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/email-settings', updateEmailSettings, async (req, rep) => {
  if (req.token) {
    const users = fastify.mongo.db.collection('users');
    await users.updateOne({email: req.user}, {$set:
      {publicEmail: req.body.publicEmail, subscribed: req.body.subscribed}});
    rep.code(200).send({message: 'success'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/active-tokens', getActiveTokens, async (req, rep) => {
  if (req.token) {
    const {redis} = fastify;
    const tokens = await redis.lrange(req.user, 0, -1);
    rep.code(200).send({number: tokens.length});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/ideas', createIdea, async (req, rep) => {
  if (req.token) {
    let members = req.body.members;
    if (members) {
      const invalidEmails = req.body.members.find((i) => !validateEmail(i));
      if (invalidEmails) {
        return rep.code(400).send({error: 'invalid-emails'});
      }
      await inviteIdeaMembers(members);
    }
    const ideas = fastify.mongo.db.collection('ideas');
    const users = fastify.mongo.db.collection('users');
    members = [req.user];
    if (req.body.members) {
      members = [...req.body.members, req.user];
    }
    const idea = await ideas.insertOne({name: req.body.name,
      desc: req.body.desc, links: req.body.links ? req.body.links : [],
      members});
    console.log(idea);
    members.forEach(async (i) => {
      await users.updateOne({email: i}, {$push:
        {ideas: idea.insertedId}});
    });
    rep.code(200).send({message: 'done'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.get('/ideas', getIdeas, async (req, rep) => {
  if (req.token) {
    const ideasCollection = fastify.mongo.db.collection('ideas');
    const cursor = await ideasCollection.find();
    const ideas = await cursor.toArray();
    console.log(ideas);
    rep.code(200).send({ideas});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/logout', logoutOpts, async (req, rep) => {
  if (req.user) {
    if (req.token) {
      const {redis} = fastify;
      await redis.lrem(req.user, 1, req.token);
      rep.code(200).send({message: 'Logged out'});
    } else {
      rep.code(200).send({message: 'Already logged out'});
    }
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

fastify.post('/logout-all', logoutOpts, async (req, rep) => {
  if (req.token) {
    const {redis} = fastify;
    await redis.del(req.user);
    rep.code(200).send({message: 'Successfully logged out of all devices'});
  } else {
    rep.code(400).send({error: 'unauthorized'});
  }
});

/**
 * Build function
 * @return {Object} The fastify instance.
 */
function build() {
  return fastify;
}

/**
 * Starts the server
 * @return {null}
 */
async function start() {
  // You must listen on the port Cloud Run provides
  const port = process.env.PORT || 3000;

  // You must listen on all IPV4 addresses in Cloud Run
  const address = '0.0.0.0';

  try {
    const server = build();
    await server.listen(port, address);
    console.log(`Listening on ${address}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

module.exports = build;

if (require.main === module) {
  start();
}
