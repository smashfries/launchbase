import {getNotifications} from '../../utils/schema.js';

/**
 * API endpoints for notifications
 * @param {*} fastify
 * @param {*} _options
 */
export default async function notifications(fastify, _options) {
  fastify.get('/notification/:id', async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const {id} = req.params;
    if (!fastify.mongo.ObjectId.isValid(id)) {
      return rep.code(400).send({error: 'invalid id'});
    }
    const notificationObjectId = new fastify.mongo.ObjectId(id);

    const notificationsColl = fastify.mongo.db.collection('notifications');
    const notification = await notificationsColl.findOne({
      _id: notificationObjectId,
    });

    if (!notification) {
      return rep.code(200).send({error: 'notification does not exist'});
    }

    if (!notification.notification_details.docs[0].count) {
      const notificationType = notification.notification_details._id;

      const details = [];
      for (const element of notification.notification_details.docs) {
        switch (element.resourceType) {
          case 'idea':
            const ideas = fastify.mongo.db.collection('ideas');
            const idea = await ideas.findOne({_id: element.resource});
            if (!idea) {
              details.push({...element, exists: false});
            } else {
              switch (notificationType) {
                case 'reply':
                  details.push({
                    ...element,
                    count: idea.replyCount,
                    exists: true,
                  });
                  break;
                case 'upvote':
                  details.push({
                    ...element,
                    count: idea.upvotes,
                    exists: true,
                  });
                  break;
                default:
                  break;
              }
            }
            break;
          case 'comment':
            const comments = fastify.mongo.db.collection('comments');
            const comment = await comments.findOne({_id: element.resource});
            if (!comment) {
              details.push({...element, exists: false});
            } else {
              switch (notificationType) {
                case 'reply':
                  details.push({
                    ...element,
                    count: comment.replyCount,
                    exists: true,
                  });
                  break;
                case 'upvote':
                  details.push({
                    ...element,
                    count: comment.upvotes,
                    exists: true,
                  });
                  break;
                default:
                  break;
              }
            }
            break;
          default:
            break;
        }

        await notificationsColl.updateOne(
          {_id: notificationObjectId},
          {$set: {'notification_details.docs': details}}
        );
        return rep.code(200).send(details);
      };
    } else {
      return rep
        .code(200)
        .send({message: 'you already have what you need dummy'});
    }
  });
  fastify.get('/notifications', getNotifications, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const query = req.query;
    const view = query.view || 'all';

    if (view !== 'all' && view !== 'dismissed') {
      return rep.code(400).send({
        error: 'invalid view mode',
        message: "view can only be set to 'all' or 'dismissed'",
      });
    }
    let arr;

    const notificationsColl = fastify.mongo.db.collection('notifications');
    if (view == 'all') {
      const myNotifications = await notificationsColl.find({
        user: req.userOId,
      });
      arr = await myNotifications.toArray();
    } else {
      const myNotifications = await notificationsColl.find({
        user: req.userOId,
        dismissed: true,
      });
      arr = await myNotifications.toArray();
    }

    return rep.code(200).send(arr);
  });
  fastify.patch('/notifications/:id/dismiss', async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const {id} = req.params;
    if (!fastify.mongo.ObjectId.isValid(id)) {
      return rep.code(400).send({error: 'invalid id'});
    }
    const notificationsColl = fastify.mongo.db.collection('notifications');
    const update = await notificationsColl.updateOne(
      {_id: id},
      {$set: {dismissed: true}}
    );
    if (update.matchedCount < 1) {
      return rep.code(400).send({error: 'notification does not exist'});
    }
    rep.code(200).send({message: 'notification was dismissed'});
  });
  fastify.patch('/notifications/dismiss', async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const notificationsColl = fastify.mongo.db.collection('notifications');
    await notificationsColl.updateMany(
      {user: req.userOId},
      {$set: {dismissed: true}}
    );

    rep.code(200).send({message: 'All notifications were dismissed'});
  });
  fastify.route({
    method: 'POST',
    url: '/send-notifications',
    onRequest: fastify.basicAuth,
    handler: async (_req, rep) => {
      const notificationLogs = fastify.mongo.db.collection('notification-logs');
      const users = fastify.mongo.db.collection('users');
      const agg = [
        {
          $lookup: {
            from: 'notification-logs',
            localField: '_id',
            foreignField: 'user',
            as: 'notification_details',
            pipeline: [
              {
                $group: {
                  _id: '$type',
                  count: {$count: {}},
                  docs: {
                    $addToSet: {
                      resource: '$resource',
                      resourceType: '$resourceType',
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            email: 1,
            notification_details: 1,
          },
        },
        {
          $match: {
            $expr: {$ne: ['$notification_details', []]},
          },
        },
      ];
      const cursor = await users.aggregate(agg);
      const arr = await cursor.toArray();

      const notifications = [];
      if (arr.length > 0) {
        const date = new Date();
        arr.forEach((element) => {
          element.notification_details.forEach((item) => {
            notifications.push({
              user: element._id,
              notification_details: item,
              timeStamp: date,
            });
          });
        });
      }

      if (notifications.length > 0) {
        const notificationsColl = fastify.mongo.db.collection('notifications');
        await notificationsColl.insertMany(notifications);
      }

      if (arr.length > 0) {
        await notificationLogs.drop();
      }

      rep.send({message: 'Notifications were created!'});
    },
  });
}
