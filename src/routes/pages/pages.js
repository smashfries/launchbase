/**
 * All routes that send static html files
 * @param {*} fastify
 * @param {*} _options
 */
export default async function pages(fastify, _options) {
  fastify.get('/', (_req, rep) => {
    return rep.sendFile('index.html');
  });
  fastify.get('/login', (_req, rep) => {
    return rep.sendFile('login.html');
  });
  fastify.get('/signup', (_req, rep) => {
    return rep.sendFile('signup.html');
  });
  fastify.get('/backstage', (_req, rep) => {
    return rep.redirect('/backstage/profile');
  });
  fastify.get('/backstage/profile', (_req, rep) => {
    return rep.sendFile('backstage/profile.html');
  });
  fastify.get('/backstage/email', (_req, rep) => {
    return rep.sendFile('backstage/email/email.html');
  });
  fastify.get('/backstage/email/update-primary', (_req, rep) => {
    return rep.sendFile('backstage/email/update-primary.html');
  });
  fastify.get('/backstage/email/update-backup', (_req, rep) => {
    return rep.sendFile('backstage/email/update-backup.html');
  });
  fastify.get('/backstage/security', (_req, rep) => {
    return rep.sendFile('backstage/security.html');
  });
  fastify.get('/just-an-idea', (_req, rep) => {
    return rep.sendFile('just-an-idea/ideas.html');
  });
  fastify.get('/just-an-idea/new', (_req, rep) => {
    return rep.sendFile('just-an-idea/new-idea.html');
  });
  fastify.get('/just-an-idea/drafts', (_req, rep) => {
    return rep.sendFile('just-an-idea/drafts.html');
  });
  fastify.get('/just-an-idea/published', (_req, rep) => {
    return rep.sendFile('just-an-idea/published.html');
  });
  fastify.get('/just-an-idea/accept-invite', (_req, rep) => {
    return rep.sendFile('just-an-idea/accept-invite.html');
  });
  fastify.get('/just-an-idea/*', (_req, rep) => {
    return rep.sendFile('just-an-idea/idea.html');
  });
  fastify.get('/discuss/:commentId', (_req, rep) => {
    return rep.sendFile('discuss/discuss.html');
  });
}
