import {requestCallbackOpts} from '../../utils/schema.js';

import axios from 'axios';

const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * API endpoints for contact
 * @param {*} fastify
 * @param {*} _options
 */
export default async function contact(fastify, _options) {
  fastify.post('/request-callback', requestCallbackOpts, async (req, rep) => {
    // eslint-disable-next-line max-len
    const phoneRegex = /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
    if (!phoneRegex.test(req.body.phone)) {
      return rep.code(400).send({error: 'invalid-phone'});
    }
    if (new Date(req.body.time) == 'Invalid Date') {
      return rep.code(400).send({error: 'invalid-time'});
    }
    const callbackRequests = fastify.mongo.db.collection('callback-requests');
    const request = await callbackRequests.insertOne({
      customerName: req.body.name,
      phoneNumber: req.body.phone,
      callTime: new Date(req.body.time),
      timestamp: new Date(),
    });

    const istDate = new Date(new Date(req.body.time).getTime() +
        ((5*60*60*1000)+(30*60*1000)));
    const ist = istDate.getUTCHours() + ':' + istDate.getUTCMinutes() + ' ' +
    istDate.getUTCDate() + ' ' + months[istDate.getUTCMonth()] + ' ' +
    istDate.getUTCFullYear();

    if (istDate.getUTCHours() < 9 || istDate.getUTCHours() > 21) {
      return rep.code(400).send({error: 'outside-working-hours'});
    }

    let utc = new Date(req.body.time);
    utc = utc.getUTCHours() + ':' + utc.getUTCMinutes() + ' ' +
    utc.getUTCDate() + ' ' + months[utc.getUTCMonth()] + ' ' +
    utc.getUTCFullYear();

    // const sendEmail = await sendCallbackRequestNotif(req.body.name,
    //     req.body.phone, utc, ist);
    axios.post('https://api.telegram.org/bot5917757045:AAGZrn7H9SIBH-aeRT2ekj36BpR-sZ_wbs8/sendMessage', {
      chat_id: 1774683033,
      text: `You have a new callback request: ${req.body.name} wants a call` +
      ` at ${ist} IST (${utc} UTC). Their phone number is ${req.body.phone}`,
    }).then((data) => {
      console.log(data);
    }).catch((err) => {
      console.log(err);
    });

    rep.code(200).send({message: 'your request was registered',
      requestId: request.insertedId});
  });
};
