import {getEmailSettings, updateEmailSettings} from '../../utils/schema.js';

/**
 * API endpoints for email settings
 * @param {*} fastify
 * @param {*} _options
 */
export default async function email(fastify, _options) {
  fastify.get('/email-settings', getEmailSettings, async (req, rep) => {
    if (req.token) {
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({_id: req.userOId});
      const publicEmail = user.hasOwnProperty('publicEmail') &&
      user.publicEmail ? true : false;
      const subscribed = user.hasOwnProperty('subscribed') &&
      user.subscribed ? true : false;
      rep.code(200).send({publicEmail, subscribed, email: user.email,
        backupEmail: user.backupEmail});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.put('/email-settings', updateEmailSettings, async (req, rep) => {
    if (req.token) {
      const users = fastify.mongo.db.collection('users');

      await users.updateOne({_id: req.userOId}, {$set:
        {publicEmail: req.body.publicEmail, subscribed: req.body.subscribed}});
      rep.code(200).send({message: 'success'});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });
};
