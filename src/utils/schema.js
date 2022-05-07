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
                    message: { type: 'string' },
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

module.exports = {
    sendEmailVerificationOpts
}