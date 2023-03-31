import {getNotifications} from '../../utils/schema.js';

/**
 * API endpoints for notifications
 * @param {*} fastify
 * @param {*} _options
 */
export default async function notifications(fastify, _options) {
  fastify.get('/notifications', getNotifications, async (req, rep) => {
    if (!req.token) {
      return rep.code(400).send({error: 'unauthorized'});
    }
    const notificationsColl = fastify.mongo.db.collection('notifications');
    const myNotifications = await notificationsColl.find({user: req.userOId});
    const arr = await myNotifications.toArray();

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
