const sendEmailVerificationOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'type'],
      properties: {
        email: {type: 'string'},
        type: {type: 'string'},

      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          deviceIdentifier: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const verifyCodeOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'type', 'code', 'identifier'],
      properties: {
        code: {type: 'string'},
        type: {type: 'string'},
        identifier: {type: 'string'},
        email: {type: 'string'},
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          token: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const updateProfileOpts = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    body: {
      type: 'object',
      required: ['name', 'nickname', 'url', 'occ', 'skills', 'interests'],
      properties: {
        name: {type: 'string', maxLength: 256},
        nickname: {type: 'string', maxLength: 256},
        url: {type: 'string', maxLength: 256},
        occ: {type: 'string', maxLength: 256},
        skills: {type: 'string', maxLength: 256},
        interests: {type: 'string', maxLength: 256},
        twitter: {type: 'string', maxLength: 16},
        github: {type: 'string', maxLength: 39},
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const getProfileOpts = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          nickname: {type: 'string'},
          url: {type: 'string'},
          occ: {type: 'string'},
          skills: {type: 'string'},
          interests: {type: 'string'},
          twitter: {type: 'string'},
          github: {type: 'string'},
          isComplete: {type: 'boolean'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const getEmailSettings = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          publicEmail: {type: 'boolean'},
          subscribed: {type: 'boolean'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const updateEmailSettings = {
  schema: {
    body: {
      type: 'object',
      properties: {
        publicEmail: {type: 'boolean'},
        subscribed: {type: 'boolean'},
      },
      required: ['publicEmail', 'subscribed'],
    },
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const getActiveTokens = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          number: {type: 'number'},
        },
      },
      400: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          error: {type: 'string'},
        },
      },
    },
  },
};

const createIdea = {
  schema: {
    headers: {
      authorization: {type: 'string'},
    },
    required: ['authorization'],
    body: {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 256},
        desc: {type: 'string', maxLength: 5000},
        links: {type: 'array', maxItems: 10},
        members: {type: 'array', maxItems: 5},
      },
      required: ['name', 'desc'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const getIdeas = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          ideas: {type: 'array'},
          items: {
            type: 'object',
            properties: {
              name: {type: 'string'},
              desc: {type: 'string'},
              member_details: {type: 'array'},
            },
          },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const revokeIdeaInvite = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    body: {
      type: 'object',
      properties: {
        inviteId: {type: 'string'},
      },
      required: ['inviteId'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

const logoutOpts = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: {type: 'string'},
      },
      required: ['authorization'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
      },
      400: {
        type: 'object',
        properties: {
          error: {type: 'string'},
          message: {type: 'string'},
        },
      },
    },
  },
};

module.exports = {
  sendEmailVerificationOpts,
  verifyCodeOpts,
  updateProfileOpts,
  getProfileOpts,
  logoutOpts,
  getEmailSettings,
  updateEmailSettings,
  getActiveTokens,
  createIdea,
  getIdeas,
  revokeIdeaInvite,
};
