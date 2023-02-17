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
    return rep.view('backstage/profile.hbs', {jsPath: 'backstage/profile',
      title: 'Profile', backstageSection: true, profilePage: true});
  });
  fastify.get('/backstage/email', (_req, rep) => {
    return rep.view('backstage/email/email.hbs',
        {jsPath: 'backstage/email/email', title: 'Email',
          backstageSection: true, emailPage: true});
  });
  fastify.get('/backstage/email/update-primary', (_req, rep) => {
    return rep.view('backstage/email/update-primary.hbs',
        {jsPath: 'backstage/email/update-primary',
          title: 'Update Primary Email', backstageSection: true,
          emailPage: true});
  });
  fastify.get('/backstage/email/update-backup', (_req, rep) => {
    return rep.view('backstage/email/update-backup.hbs',
        {jsPath: 'backstage/email/update-backup',
          title: 'Update Backup Email', backstageSection: true,
          emailPage: true});
  });
  fastify.get('/backstage/security', (_req, rep) => {
    return rep.view('backstage/security.hbs', {jsPath: 'backstage/security',
      title: 'Security', backstageSection: true, securityPage: true});
  });
  fastify.get('/backstage/dms', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: 'coming-soon',
      title: 'DMs', backstageSection: true, dmsPage: true});
  });
  fastify.get('/backstage/notifications', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: 'coming-soon',
      title: 'Notifications', backstageSection: true, notificationsPage: true});
  });
  fastify.get('/just-an-idea', (_req, rep) => {
    return rep.view('just-an-idea/ideas.hbs', {jsPath: 'just-an-idea/ideas',
      title: 'Ideas', ideaSection: true, communityIdeasPage: true});
  });
  fastify.get('/just-an-idea/new', (_req, rep) => {
    return rep.sendFile('just-an-idea/new-idea.html');
  });
  fastify.get('/just-an-idea/drafts', (_req, rep) => {
    return rep.view('just-an-idea/drafts.hbs', {jsPath: 'just-an-idea/drafts',
      title: 'Draft Ideas', ideaSection: true, draftIdeasPage: true});
  });
  fastify.get('/just-an-idea/published', (_req, rep) => {
    return rep.sendFile('just-an-idea/published.html');
  });
  fastify.get('/just-an-idea/accept-invite', (_req, rep) => {
    return rep.view('just-an-idea/accept-invite.hbs',
        {jsPath: 'just-an-idea/accept-invite', title: 'Accept Idea Invite',
          ideaSection: true});
  });
  fastify.get('/just-an-idea/*', (_req, rep) => {
    return rep.view('just-an-idea/idea.hbs', {jsPath: 'just-an-idea/idea',
      title: 'The Idea', ideaSection: true});
  });
  fastify.get('/discuss/:commentId', (_req, rep) => {
    return rep.view('discuss/discuss.hbs', {jsPath: 'discuss/discuss',
      title: 'Discuss', discussSection: true});
  });
  fastify.get('/the-real-thing', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: 'coming-soon',
      title: 'The Real Thing', realSection: true});
  });
  fastify.get('/perks', (_req, rep) => {
    return rep.view('coming-soon.hbs', {jsPath: 'coming-soon',
      title: 'Perks', perksSection: true});
  });
  fastify.get('/*', (_req, rep) => {
    return rep.code(404).sendFile('404.html');
  });
}
