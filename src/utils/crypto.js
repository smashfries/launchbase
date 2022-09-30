const {scryptSync, randomBytes, timingSafeEqual,
  createHash} = require('crypto');
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
 * @param {string} id user ID that is added to payload
 * @param {string} emailHash MD5 emailHash that is added to the payload
 * @return {string} jwt
 */
const generateToken = function(id, emailHash) {
  const token = jwt.sign({id, emailHash}, process.env.SECRET);
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

/**
 * Create MD5 hash of a string
 * @param {string} str the string to be hashed
 * @return {string} hashed string
 */
const md5 = function(str) {
  const hash = createHash('md5').update(str).digest('hex');
  return hash;
};

const generateIdeaInviteToken = function(ideaId, email) {
  const token = jwt.sign({ideaId, email}, process.env.SECRET);
  return token;
};

module.exports = {
  hash,
  verify,
  generateToken,
  verifyToken,
  md5,
  generateIdeaInviteToken,
};
