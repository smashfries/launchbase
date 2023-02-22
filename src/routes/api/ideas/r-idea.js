import {getIdeas, getIdea} from '../../../utils/schema.js';

/**
 * @param {*} fastify
 * @param {*} _options
 */
export default async function rIdeas(fastify, _options) {
  fastify.get('/ideas/published', getIdeas, async (req, rep) => {
    if (req.token) {
      const query = req.query;
      const filter = query.filter;
      const page = query.page ? query.page : 1;
      if (page < 1) {
        return rep.code(400).send({error:
          'page must be a number greater than or equal to 1'});
      }
      const ideasCollection = fastify.mongo.db.collection('ideas');

      if (filter == 'display' || !filter) {
        const latestIdeas = await ideasCollection.find({status: 'published'})
            .sort({timeStamp: -1}).limit(5);
        const hottestIdeas = await ideasCollection.find({status: 'published'})
            .sort({upvotes: -1}).limit(20);

        const latestIdeasArr = await latestIdeas.toArray();
        const hottestIdeasArr = await hottestIdeas.toArray();

        return rep.code(200).send({latestIdeas: latestIdeasArr,
          hottestIdeas: hottestIdeasArr});
      }

      if (filter == 'newest') {
        const latestIdeas = await ideasCollection.find({status: 'published'})
            .sort({timeStamp: -1}).skip((page - 1)*20).limit(20);
        const arr = await latestIdeas.toArray();
        return rep.code(200).send({latestIdeas: arr});
      }

      if (filter == 'oldest') {
        const oldestIdeas = await ideasCollection.find({status: 'published'})
            .sort({timeStamp: 1}).skip((page - 1)*20).limit(20);
        const arr = await oldestIdeas.toArray();
        return rep.code(200).send({oldestIdeas: arr});
      }

      if (filter == 'upvotes') {
        const hottestIdeas = await ideasCollection.find({status: 'published'})
            .sort({upvotes: -1}).skip((page - 1)*20).limit(20);

        const arr = await hottestIdeas.toArray();
        return rep.code(200).send({hottestIdeas: arr});
      }
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/ideas/published/search', getIdeas, async (req, rep) => {
    if (req.token) {
      const query = req.query;
      const searchQuery = query.q;
      const page = query.page ? query.page : 1;

      if (!searchQuery) {
        return rep.code(400).send({error: 'query not provided'});
      }

      const ideas = fastify.mongo.db.collection('ideas');
      const agg = [
        {
          $search: {
            index: 'idea-search',
            text: {
              query: searchQuery,
              path: ['name', 'desc', 'idea'],
              fuzzy: {maxEdits: 1},
            },
          },
        },
        {
          $match: {
            status: 'published',
          },
        },
        {
          $skip: (page-1)*20,
        },
        {
          $limit: 20,
        },
      ];
      const cursor = await ideas.aggregate(agg);
      const arr = await cursor.toArray();

      return rep.code(200).send({latestIdeas: arr});
    } else {
      return rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/ideas/my/drafts', getIdeas, async (req, rep) => {
    if (req.token) {
      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const myIdeaDrafts = await ideaMembers.aggregate([
        {
          $match: {
            user: req.userOId,
          },
        },
        {
          $lookup: {
            from: 'ideas',
            localField: 'idea',
            foreignField: '_id',
            as: 'idea_details',
          },
        },
        {
          $match: {
            'idea_details.status': 'draft',
          },
        },
        {
          $project: {
            'idea_details._id': 1,
            'idea_details.name': 1,
            'idea_details.desc': 1,
            'idea_details.timeStamp': 1,
          },
        },
      ]);
      const arr = await myIdeaDrafts.toArray();
      rep.code(200).send({latestIdeas: arr});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/ideas/my/published', getIdeas, async (req, rep) => {
    if (req.token) {
      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const myIdeaDrafts = await ideaMembers.aggregate([
        {
          $match: {
            user: req.userOId,
          },
        },
        {
          $lookup: {
            from: 'ideas',
            localField: 'idea',
            foreignField: '_id',
            as: 'idea_details',
          },
        },
        {
          $match: {
            'idea_details.status': 'published',
          },
        },
        {
          $project: {
            'idea_details._id': 1,
            'idea_details.name': 1,
            'idea_details.desc': 1,
            'idea_details.timeStamp': 1,
            'idea_details.upvotes': 1,
          },
        },
      ]);
      const arr = await myIdeaDrafts.toArray();
      rep.code(200).send({latestIdeas: arr});
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });

  fastify.get('/ideas/my/upvoted', getIdeas, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const upvotes = fastify.mongo.db.collection('upvotes');
    const myUpvotedIdeas = await upvotes.aggregate([
      {
        $match: {
          user: req.userOId,
          resourceType: 'idea',
        },
      },
      {
        $lookup: {
          from: 'ideas',
          localField: 'resource',
          foreignField: '_id',
          as: 'idea_details',
        },
      },
      {
        $project: {
          'idea_details._id': 1,
          'idea_details.name': 1,
          'idea_details.desc': 1,
          'idea_details.timeStamp': 1,
          'idea_details.upvotes': 1,
        },
      },
    ]);
    const arr = await myUpvotedIdeas.toArray();
    rep.code(200).send({hottestIdeas: arr});
  });

  fastify.get('/ideas/:ideaId', getIdea, async (req, rep) => {
    if (req.token) {
      const {ideaId} = req.params;

      if (!fastify.mongo.ObjectId.isValid(ideaId)) {
        return rep.code(400).send({error: 'invalid ideaId',
          message: 'ideaId must be a valid MongoDB Object ID'});
      }

      const ideaOId = new fastify.mongo.ObjectId(ideaId);
      const ideas = fastify.mongo.db.collection('ideas');
      const ideaMembers = fastify.mongo.db.collection('idea-members');
      const idea = await ideas.findOne({_id: ideaOId});

      if (!idea) {
        return rep.code(400).send({error: 'idea does not exist'});
      }

      if (idea.status == 'draft') {
        const member = await ideaMembers.findOne({idea: ideaOId,
          user: req.userOId});
        if (!member) {
          return rep.code(400).send({error: 'access denied',
            message: 'you are not a member of this idea'});
        }
      }

      const members = await ideaMembers.aggregate([
        {
          $match: {
            idea: ideaOId,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user_details',
          },
        },
        {
          $project: {
            'user_details.nickname': 1,
            'user_details.url': 1,
            'user_details._id': 1,
            'user': 1,
            'role': 1,
          },
        },
      ]);
      const arr = await members.toArray();

      let target;

      const upvotes = fastify.mongo.db.collection('upvotes');
      const upvote = await upvotes.findOne({user: req.userOId,
        resource: ideaOId, resourceType: 'idea'});

      if (upvote) {
        target = {members: arr, upvoted: true};
      } else {
        target = {members: arr};
      }

      rep.code(200).send(Object.assign(target, idea));
    } else {
      rep.code(400).send({error: 'unauthorized'});
    }
  });
};
