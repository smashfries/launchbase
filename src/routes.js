/**
 * All routes that send statick html files
 * @param {*} fastify
 * @param {*} _options
 */
async function routes(fastify, _options) {
  fastify.get('/', (_req, rep) => {
    return rep.sendFile('index.html');
  });
  fastify.get('/login', (_req, rep) => {
    return rep.sendFile('login.html');
  });
  fastify.get('/signup', (_req, rep) => {
    return rep.sendFile('signup.html');
  });
  // change route
  fastify.get('/home', (_req, rep) => {
    return rep.view('home.hbs');
  });
  fastify.get('/backstage/profile', (_req, rep) => {
    return rep.sendFile('backstage/profile.html');
  });
}

module.exports = routes;
