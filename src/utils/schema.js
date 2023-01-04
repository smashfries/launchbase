const headers = {
  type: 'object',
  properties: {
    authorization: {type: 'string'},
  },
  required: ['authorization'],
};

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
    headers,
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
    headers,
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
    headers,
    response: {
      200: {
        type: 'object',
        properties: {
          publicEmail: {type: 'boolean'},
          subscribed: {type: 'boolean'},
          email: {type: 'string'},
          backupEmail: {type: 'string'},
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
    headers,
    body: {
      type: 'object',
      properties: {
        publicEmail: {type: 'boolean'},
        subscribed: {type: 'boolean'},
      },
      required: ['publicEmail', 'subscribed'],
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
    headers,
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
    headers,
    body: {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 80},
        desc: {type: 'string', maxLength: 300},
        idea: {type: 'string', maxLength: 5000},
        links: {type: 'array', maxItems: 10, items: {type: 'string',
          maxLength: 2048}},
        members: {type: 'array', maxItems: 20, items: {
          type: 'object',
          properties: {
            email: {type: 'string', maxLength: 320},
            role: {type: 'string', maxLength: 20},
          },
          required: ['email', 'role'],
        }},
      },
      required: ['name'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          draftId: {type: 'string'},
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

export const updateIdeaDraft = {
  schema: {
    headers,
    body: {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 80},
        desc: {type: 'string', maxLength: 300},
        idea: {type: 'string', maxLength: 5000},
        links: {type: 'array', maxItems: 10, items: {type: 'string',
          maxLength: 2048}},
      },
      required: ['name'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          draftId: {type: 'string'},
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

export const deleteIdeaDraft = {
  schema: {
    headers,
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
    headers,
    querystring: {
      type: 'object',
      properties: {
        page: {type: 'integer'},
        filter: {type: 'string'},
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          latestIdeas: {type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: {type: 'string'},
                name: {type: 'string'},
                desc: {type: 'string'},
                timeStamp: {type: 'string'},
                upvotes: {type: 'number'},
                idea_details: {type: 'array'},
              },
            },
          },
          oldestIdeas: {type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: {type: 'string'},
                name: {type: 'string'},
                desc: {type: 'string'},
                timeStamp: {type: 'string'},
                upvotes: {type: 'number'},
              },
            },
          },
          hottestIdeas: {type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: {type: 'string'},
                name: {type: 'string'},
                desc: {type: 'string'},
                timeStamp: {type: 'string'},
                upvotes: {type: 'number'},
              },
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

export const getIdea = {
  schema: {
    headers,
    response: {
      200: {
        type: 'object',
        properties: {
          _id: {type: 'string'},
          name: {type: 'string'},
          desc: {type: 'string'},
          idea: {type: 'string'},
          links: {type: 'array'},
          upvotes: {type: 'number'},
          members: {type: 'array'},
          timeStamp: {type: 'string'},
          status: {type: 'string'},
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

export const sendIdeaInvite = {
  schema: {
    headers,
    body: {
      type: 'object',
      properties: {
        email: {type: 'string', maxLength: 320},
        role: {type: 'string', maxLength: 6},
      },
      required: ['email', 'role'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          upsertedId: {type: 'string'},
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
    headers,
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

export const getIdeaInvites = {
  schema: {
    headers,
    response: {
      200: {
        type: 'object',
        properties: {
          invites: {
            type: 'array',
            properties: {
              _id: {type: 'string'},
              email: {type: 'string'},
              timeStamp: {type: 'string'},
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

export const getIdeaInviteDetails = {
  schema: {
    headers,
    response: {
      200: {
        type: 'object',
        properties: {
          name: {type: 'string'},
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

export const acceptIdeaInvite = {
  schema: {
    headers,
    body: {
      type: 'object',
      properties: {
        token: {type: 'string'},
      },
      required: ['token'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          ideaId: {type: 'string'},
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

export const updateIdeaMemberRole = {
  schema: {
    headers,
    body: {
      type: 'object',
      properties: {
        role: {type: 'string', maxLength: 6},
      },
      required: ['role'],
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

export const publishIdea = {
  schema: {
    headers,
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

export const createComment = {
  schema: {
    headers,
    body: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          maxLength: 10000,
        },
        parent: {
          type: 'string',
          maxLength: 24,
        },
        superParent: {
          type: 'string',
          maxLength: 24,
        },
        superType: {
          type: 'string',
          maxLength: 20,
        },
      },
      required: ['comment', 'parent', 'superParent', 'superType'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          commentId: {type: 'string'},
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

export const getComments = {
  schema: {
    headers,
    response: {
      200: {
        type: 'object',
        properties: {
          comment: {},
          replies: {type: 'array'},
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
    headers,
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
