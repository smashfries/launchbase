const { scryptSync, randomBytes, timingSafeEqual } = require('crypto')

const hash = function (str) {
    const salt = randomBytes(16).toString('hex')
    const hashedStr = scryptSync(str, salt, 64).toString('hex')

    return `${salt}:${hashedStr}`
}