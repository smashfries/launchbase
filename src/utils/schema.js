export const sendEmailVerificationOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'type'],
      properties: {
        email: {type: 'string', maxLength: 320},
        type: {type: 'string', maxLength: 6},

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

export const verifyCodeOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'type', 'code', 'identifier'],
      properties: {
        code: {type: 'string', maxLength: 6},
        type: {type: 'string', maxLength: 6},
        identifier: {type: 'string', maxLength: 48},
        email: {type: 'string', maxLength: 320},
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

export const updateProfileOpts = {
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

export const getProfileOpts = {
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

export const getEmailSettings = {
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

export const updateEmailSettings = {
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

export const getActiveTokens = {
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

export const createIdeaDraft = {
  schema: {
    headers: {
      authorization: {type: 'string'},
    },
    required: ['authorization'],
    body: {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 80},
        desc: {type: 'string', maxLength: 300},
        idea: {type: 'string', maxLength: 5000},
        links: {type: 'array', maxItems: 10, items: {type: 'string'}},
        members: {type: 'array', maxItems: 5, items: {
          type: 'object',
          properties: {
            email: {type: 'string', maxLength: 320},
            role: {type: 'string', maxLength: 20},
          },
        }},
      },
      required: ['name'],
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

export const getIdeas = {
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

export const revokeIdeaInvite = {
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

export const logoutOpts = {
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
