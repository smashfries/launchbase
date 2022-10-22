import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

import {customAlphabet} from 'nanoid';
const nanoid = customAlphabet('0123456789', 6);

import {generateIdeaInviteToken} from './crypto.js';

export const validateEmail = function(email) {
  // eslint-disable-next-line max-len
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const sendEmailVerification = function(email) {
  return new Promise((resolve) => {
    if (validateEmail(email)) {
      const code = nanoid();
      const msg = {
        to: email,
        from: 'aditya@adityaone.com',
        template_id: 'd-0d96eccea78c4d9987615cc15774bc42',
        dynamic_template_data: {
          code,
        },
      };
      sgMail.send(msg).then(() => {
        resolve(code);
      }).catch((e) => {
        resolve('error');
      });
    } else {
      resolve('error');
    }
  });
};

export const inviteIdeaMembers = function(emailList, ideaId) {
  return new Promise((resolve) => {
    const personalizations = emailList.map((i) => {
      return {to: [{email: i}], dynamicTemplateData: {'token':
       generateIdeaInviteToken(ideaId, i)}};
    });
    const msg = {
      personalizations,
      from: 'aditya@adityaone.com',
      template_id: 'd-4533f15b05714033952240af1da8729e',
    };
    sgMail.send(msg).then(() => {
      resolve(true);
    }).catch((e) => {
      resolve(false);
    });
  });
};
