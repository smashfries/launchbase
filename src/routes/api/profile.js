import {updateProfileOpts, getProfileOpts,
  getProfilesOpts} from '../../utils/schema.js';

/**
 * API endpoints for user profile
 * @param {*} fastify
 * @param {*} _options
 */
export default async function profile(fastify, _options) {
  fastify.put('/profile', updateProfileOpts, async (req, rep) => {
    if (req.token) {
      let twitter = '';
      let github = '';
      if (req.body.twitter) {
        if (req.body.twitter.split('@').length > 2) {
          return rep.code(400).send({error: 'invalid-twitter'});
        }
        if (req.body.twitter.indexOf('@') > 0) {
          return rep.code(400).send({error: 'invalid-twitter'});
        }
        twitter = req.body.twitter;
      }
      if (req.body.github) {
        github = req.body.github;
      }
      if (!req.body.url.match(/^[a-zA-Z0-9_-]+$/g)) {
        return rep.code(400).send({error: 'invalid-url'});
      }
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({_id: req.userOId});
      const url = req.body.url.toLowerCase();
      if (user.url) {
        if (user.url !== url) {
          const urlMatches = await users.findOne({url});
          if (urlMatches) {
            return rep.code(400).send({error: 'url-exists'});
          }
        }
      } else {
        const urlMatches = await users.findOne({url});
        if (urlMatches) {
          return rep.code(400).send({error: 'url-exists'});
        }
      }
      await users.updateOne({_id: req.userOId}, {$set: {name: req.body.name,
        nickname: req.body.nickname, url: req.body.url, occ: req.body.occ,
        skills: req.body.skills, interests: req.body.interests, github,
        twitter, urlLower: url}});
      rep.code(200).send({message: 'successfully updated profile'});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/profile', getProfileOpts, async (req, rep) => {
    if (req.token) {
      const query = req.query;
      const limittedRes = query.only;

      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({_id: req.userOId});
      const isComplete = user.hasOwnProperty('name') ? true : false;

      if (limittedRes == 'completionStatus') {
        rep.code(200).send({isComplete});
      } else {
        rep.code(200).send({...user, isComplete});
      }
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/profile/search', getProfilesOpts, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }

    const query = req.query;
    const search = query.q;
    const page = query.page ? query.page : 1;

    if (!search) {
      return rep.code(400).send({error: 'query not provided'});
    }

    const users = fastify.mongo.db.collection('users');
    const searchedUsers = await users.aggregate([
      {
        $search: {
          index: 'user_search',
          text: {
            query: search,
            path: ['name', 'nickname', 'url', 'occ'],
            fuzzy: {maxEdits: 1},
          },
        },
      },
      {
        $skip: (page-1)*20,
      },
      {
        $limit: 20,
      },
      {
        $project: {
          email: 0,
          backupEmail: 0,
          subscribed: 0,
          urlLower: 0,
          publicEmail: 0,
        },
      },
    ]);

    const arr = await searchedUsers.toArray();
    rep.code(200).send(arr);
  });
};
