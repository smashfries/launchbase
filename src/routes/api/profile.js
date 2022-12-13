import {updateProfileOpts, getProfileOpts} from '../../utils/schema.js';

/**
 * All routes that send statick html files
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
      console.log(req.body.url);
      if (!req.body.url.match(/^[a-zA-Z0-9_-]+$/g)) {
        return rep.code(400).send({error: 'invalid-url'});
      }
      const users = fastify.mongo.db.collection('users');
      const user = await users.findOne({_id: req.userOId});
      const url = req.body.url;
      if (user.url) {
        if (user.url !== url) {
          const urlMatches = await users.findOne({url});
          if (urlMatches) {
            return rep.code(400).send({error: 'url-exists'});
          }
        }
      } else {
        const urlMatches = await users.find({url});
        if (urlMatches) {
          return rep.code(400).send({error: 'url-exists'});
        }
      }
      await users.updateOne({_id: req.userOId}, {$set: {name: req.body.name,
        nickname: req.body.nickname, url: req.body.url, occ: req.body.occ,
        skills: req.body.skills, interests: req.body.interests, github,
        twitter}});
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
};
