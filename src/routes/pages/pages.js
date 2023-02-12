import {jsPath} from '../../utils/path.js';

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
  fastify.get('/contact', (_req, rep) => {
    return rep.sendFile('contact.html');
  });
  fastify.get('/callback-confirmation', (_req, rep) => {
    return rep.sendFile('confirm-callback.html');
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
  fastify.get('/the-real-thing', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: jsPath('coming-soon'),
      title: 'The Real Thing', realSection: true});
  });
  fastify.get('/perks', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: jsPath('coming-soon'),
      title: 'Perks', perksSection: true});
  });
  fastify.get('/*', (_req, rep) => {
    return rep.code(404).sendFile('404.html');
  });
}
