/**
 * API endpoints for contact
 * @param {*} fastify
 * @param {*} _options
 */
export default async function contact(fastify, _options) {
  fastify.post('/send-notifications', async (req, rep) => {
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
      arr.forEach((element) => {
        element.notification_details.forEach((item) => {
          notifications.push({user: element._id, notification_details: item});
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
  });
}
