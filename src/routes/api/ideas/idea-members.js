import {updateIdeaMemberRole} from '../../../utils/schema.js';

/**
 * All routes that send statick html files
 * @param {*} fastify
 * @param {*} _options
 */
export default async function ideaMembers(fastify, _options) {
  fastify.patch('/ideas/:ideaId/members/:memberId/role', updateIdeaMemberRole,
      async (req, rep) => {
        if (req.token) {
          const {ideaId, memberId} = req.params;
          if (!fastify.mongo.ObjectId.isValid(ideaId)) {
            return rep.code(400).send({error:
              'ideaId must be a valid MongoDB Object ID'});
          }
          if (!fastify.mongo.ObjectId.isValid(memberId)) {
            return rep.code(400).send({error:
              'memberId must be a valid MongoDB Object ID'});
          }
          if (req.body.role !== 'admin' && req.body.role !== 'member') {
            return rep.code(400).send({error:
              'invalid role', message: 'role must be *admin* or *member*'});
          }
          const ideaOId = new fastify.mongo.ObjectId(ideaId);
          const memberOId = new fastify.mongo.ObjectId(memberId);
          const ideaMembers = fastify.mongo.db.collection('idea-members');
          const currentMember = await ideaMembers.findOne({idea: ideaOId,
            user: req.userOId, role: 'admin'});
          if (!currentMember) {
            return rep.code(400).send({error:
              'you must be an admin of this idea to change roles'});
          }
          const toUpdateMember = await ideaMembers.findOne({idea: ideaOId,
            user: memberOId});
          if (!toUpdateMember) {
            return rep.code(400).send({error:
              'member does not exist for this idea'});
          }
          const adminMembers = await ideaMembers.find({idea: ideaOId,
            role: 'admin'});
          const membersArray = await adminMembers.toArray();

          if (membersArray.length == 1 && req.body.role == 'member' &&
          toUpdateMember.role == 'admin') {
            return rep.code(400).send({error:
              'there must be atleast one admin for every idea'});
          }
          await ideaMembers.updateOne({idea: ideaOId,
            user: memberOId}, {$set: {role: req.body.role}});
          rep.code(200).send({message:
            'member role was successfully updated!'});
        } else {
          rep.code(400).send({error: 'unauthorized'});
        }
      });
};
