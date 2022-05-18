const {scryptSync, randomBytes, timingSafeEqual} = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: __dirname+'/./../../.env'});

/**
 * Hash a string
 * @param {string} str the string to be hashed
 * @return {string} hashed string
 */
const hash = function(str) {
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
const verify = function(str, hash) {
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
 * @param {string} email email that is added to payload
 * @return {string} jwt
 */
const generateToken = function(email) {
  const token = jwt.sign({email}, process.env.SECRET);
  return token;
};

/**
 * Verifies a jwt
 * @param {string} token jwt
 * @return {Object} decoded token
 */
const verifyToken = function(token) {
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    return decoded;
  } catch (error) {
    return;
  }
};

module.exports = {
  hash,
  verify,
  generateToken,
  verifyToken,
};
