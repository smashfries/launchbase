import {randomBytes} from 'crypto';

import {hash, verify, generateToken, md5} from '../../utils/crypto.js';

import {sendEmailVerificationOpts, verifyCodeOpts,
  getActiveTokens} from '../../utils/schema.js';

import {sendEmailVerification} from '../../utils/email.js';

/**
 * All routes that send statick html files
 * @param {*} fastify
 * @param {*} _options
 */
export default async function auth(fastify, _options) {
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
};
