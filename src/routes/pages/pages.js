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
    return rep.sendFile('backstage/email.html');
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
}
