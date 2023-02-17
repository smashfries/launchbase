import {scryptSync, randomBytes, timingSafeEqual,
  createHash} from 'crypto';
import jwt from 'jsonwebtoken';

import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

/**
 * Hash a string
 * @param {string} str the string to be hashed
 * @return {string} hashed string
 */
export const hash = function(str) {
  const salt = randomBytes(16).toString('hex');
  const hashedStr = scryptSync(str, salt, 64).toString('hex');

  return `${salt}:${hashedStr}`;
};

/**
 * Verify if a string using its hash
 * @param {string} str string to be verified
 * @param {string} hash the hash of the string
 * @return {boolean} If string is valid or not
 */
export const verify = function(str, hash) {
  const [salt, key] = hash.split(':');
  const hashedBuffer = scryptSync(str, salt, 64);

  const keyBuffer = Buffer.from(key, 'hex');
  const match = timingSafeEqual(hashedBuffer, keyBuffer);

  if (match) {
    return true;
  } else {
    return false;
  }
};

/**
 * Generates a jwt with email in the payload
 * @param {string} id user ID that is added to payload
 * @param {string} emailHash MD5 emailHash that is added to the payload
 * @param {string} handle user's handle that is added to the payload
 * @return {string} jwt
 */
export const generateToken = function(id, emailHash, handle) {
  const token = jwt.sign({id, emailHash, handle}, process.env.SECRET);
  return token;
};

/**
 * Verifies a jwt
 * @param {string} token jwt
 * @return {Object} decoded token
 */
export const verifyToken = function(token) {
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    return decoded;
  } catch (error) {
    return;
  }
};

/**
 * Create MD5 hash of a string
 * @param {string} str the string to be hashed
 * @return {string} hashed string
 */
export const md5 = function(str) {
  const hash = createHash('md5').update(str).digest('hex');
  return hash;
};

export const generateIdeaInviteToken = function(ideaId, email) {
  const token = jwt.sign({ideaId, email}, process.env.SECRET);
  return token;
};
