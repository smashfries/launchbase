const sendEmailVerificationOpts = {
    schema: {
        body: {
            type: 'object',
            required: ['email', 'type'],
            properties: {
                email: { type: 'string' },
                type: { type: 'string' },

            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    deviceIdentifier: { type: 'string' }
                }
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }
}

const verifyCodeOpts = {
    schema: {
        body: {
            type: 'object',
            required: ['email', 'type', 'code', 'identifier'],
            properties: {
                code: { type: 'string' },
                type: { type: 'string' },
                identifier: { type: 'string' },
                email: { type: 'string' }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    token: { type: 'string' }
                }
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }
}

const updateProfileOpts = {
    schema: {
        headers: {
            type: 'object',
            properties: {
                authorization: { type: 'string' }
            },
            required: ['authorization']
        },
        body: {
            type: 'object',
            required: ['name', 'nickname', 'url', 'occ', 'skills', 'interests'],
            properties: {
                name: { type: 'string', maxLength: 256 },
                nickname: { type: 'string', maxLength: 256 },
                url: { type: 'string', maxLength: 256 },
                occ: { type: 'string', maxLength: 256 },
                skills: { type: 'string', maxLength: 256 },
                interests: { type: 'string', maxLength: 256 },
                twitter: { type: 'string', maxLength: 16 },
                github: { type: 'string', maxLength: 39 }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                }
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }
}

module.exports = {
    sendEmailVerificationOpts,
    verifyCodeOpts,
    updateProfileOpts
}