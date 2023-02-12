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

export const sendCallbackRequestNotif = function(name, phone, utc, ist) {
  return new Promise((resolve) => {
    const msg = {
      from: {email: 'no-reply@adityaone.com', name: 'The bot'},
      to: 'adityavinodh22@gmail.com',
      template_id: 'd-3c536a06dba1414aa1498ba9832eec95',
      dynamic_template_data: {
        name,
        phone,
        utc,
        ist,
      },
    };
    sgMail.send(msg).then(() => {
      resolve(true);
    }).catch((e) => {
      resolve(false);
    });
  });
};

export const sendEmailVerification = function(emailList) {
  return new Promise((resolve) => {
    const validEmails = emailList.map((i) => {
      return validateEmail(i);
    });
    if (!validEmails.includes(false)) {
      const code = nanoid();
      const personalizations = emailList.map((i) => {
        return {to: [{email: i}]};
      });
      const msg = {
        personalizations,
        from: {email: 'aditya@adityaone.com', name: 'Aditya'},
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
