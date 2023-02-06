import {randomBytes} from 'crypto';

import {hash, verify, generateToken, md5} from '../../utils/crypto.js';

import {sendEmailVerificationOpts, verifyCodeOpts,
  getActiveTokens, logoutOpts} from '../../utils/schema.js';

import {sendEmailVerification} from '../../utils/email.js';

/**
 * API endpoints for authentication
 * @param {*} fastify
 * @param {*} _options
 */
export default async function auth(fastify, _options) {
  fastify.post('/send-email-verification', sendEmailVerificationOpts,
      async (req, rep) => {
        const email = req.body.email.toLowerCase();
        const validTypes = ['login', 'signup', 'changePrimary', 'changeBackup'];
        if (!validTypes.includes(req.body.type)) {
          return rep.code(400).send({error: 'invalid-type'});
        }
        const users = fastify.mongo.db.collection('users');
        const user = await users.findOne({email});
        const backup = await users.findOne({backupEmail: email});
        console.log(req.body.type == 'login' && !backup);
        if ((req.body.type == 'login' && !user) &&
          (req.body.type == 'login' && !backup)) {
          return rep.code(400).send({error: 'account-invalid'});
        }
        if ((req.body.type == 'signup' && user) ||
          (req.body.type == 'signup' && backup)) {
          return rep.code(400).send({error: 'account-exists'});
        }
        if ((req.body.type == 'changePrimary' && !req.token) ||
          (req.body.type == 'changeBackup' && !req.token)) {
          return rep.code(400).send({error: 'unauthorized'});
        }
        if (req.body.type == 'changePrimary' ||
          req.body.type == 'changeBackup') {
          const currentUser = await users.findOne({_id: req.userOId});
          if (currentUser.email == email || currentUser.backup == email) {
            return rep.code(400).send({error: 'same email was provided'});
          }
          if (user || backup) {
            return rep.code(400).send({error: 'account-exists'});
          }
        }
        const result = await sendEmailVerification(email);
        if (result == 'error') {
          return rep.code(400).send({error: 'invalid-email'});
        }
        const deviceIdentifier = randomBytes(24).toString('hex');
        const codes = fastify.mongo.db.collection('verification-codes');
        const expiresOn = new Date().getTime() + 300000;
        codes.updateOne({email}, {$set: {email, code: hash(result), expiresOn,
          deviceIdentifier: hash(deviceIdentifier)}}, {upsert: true});
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
    const identifierValidity = verify(req.body.identifier,
        code.deviceIdentifier);
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
    let id;
    await fastify.mongo.db.collection('verification-codes').deleteMany({email});
    if (req.body.type == 'signup') {
      const newUser = await fastify.mongo.db.collection('users')
          .insertOne({email});
      id = newUser.insertedId;
    } else {
      id = user._id;
    }
    const token = generateToken(id, md5(email));
    await redis.rpush(id, token);
    return rep.code(200).send({token});
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
};
