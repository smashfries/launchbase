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
            required: ['email', 'type'],
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

module.exports = {
    sendEmailVerificationOpts
}