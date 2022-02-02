const { scryptSync, randomBytes, timingSafeEqual } = require('crypto')
const jwt = require('jsonwebtoken')
require('dotenv').config({path: __dirname+'/./../../.env'})

const hash = function (str) {
    const salt = randomBytes(16).toString('hex')
    const hashedStr = scryptSync(str, salt, 64).toString('hex')

    return `${salt}:${hashedStr}`
}

const verify = function (str, hash) {
    const [salt, key] = hash.split(':')
    const hashedBuffer = scryptSync(str, salt, 64)

    const keyBuffer = Buffer.from(key, 'hex')
    const match = timingSafeEqual(hashedBuffer, keyBuffer)

    if (match) {
        return true
    } else {
        return false
    }
}

const generateToken = function (email) {
    const token = jwt.sign({ email }, process.env.SECRET)
    return token
}

module.exports = {
    hash,
    verify,
    generateToken
}