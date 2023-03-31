import {md5} from '../../utils/crypto.js';

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
    return rep.view('backstage/profile.hbs', {
      jsPath: 'backstage/profile',
      title: 'Profile',
      backstageSection: true,
      profilePage: true,
      metaDesc: 'Update your Launch Base talent profile!',
    });
  });
  fastify.get('/backstage/email', (_req, rep) => {
    return rep.view('backstage/email/email.hbs', {
      jsPath: 'backstage/email/email',
      title: 'Email',
      backstageSection: true,
      emailPage: true,
      metaDesc: 'View and update your Launch Base email settings.',
    });
  });
  fastify.get('/backstage/email/update-primary', (_req, rep) => {
    return rep.view('backstage/email/update-primary.hbs', {
      jsPath: 'backstage/email/update-primary',
      title: 'Update Primary Email',
      backstageSection: true,
      emailPage: true,
      metaDesc: 'Update your primary Launch Base email.',
    });
  });
  fastify.get('/backstage/email/update-backup', (_req, rep) => {
    return rep.view('backstage/email/update-backup.hbs', {
      jsPath: 'backstage/email/update-backup',
      title: 'Update Backup Email',
      backstageSection: true,
      emailPage: true,
      metaDesc: 'Update your backup Launch Base email.',
    });
  });
  fastify.get('/backstage/security', (_req, rep) => {
    return rep.view('backstage/security.hbs', {
      jsPath: 'backstage/security',
      title: 'Security',
      backstageSection: true,
      securityPage: true,
      metaDesc: 'Review and update your Launch Base security settings.',
    });
  });
  fastify.get('/backstage/dms', (_req, rep) => {
    return rep.view('coming-soon.hbs', {
      jsPath: 'coming-soon',
      title: 'DMs',
      backstageSection: true,
      dmsPage: true,
      metaDesc: 'View and send DMs to Launch Base talent!',
    });
  });
  fastify.get('/backstage/notifications', (_req, rep) => {
    return rep.view('backstage/notifications.hbs', {
      jsPath: 'backstage/notifications',
      title: 'Notifications',
      backstageSection: true,
      notificationsPage: true,
      metaDesc: 'Check your Launch Base notifications.',
    });
  });
  fastify.get('/backstage/discussion-history', (_req, rep) => {
    return rep.view('backstage/discussion-history.hbs', {
      jsPath: 'backstage/discussion-history',
      title: 'Discussion History',
      backstageSection: true,
      discussionHistoryPage: true,
      metaDesc: 'View history of your discussions on Launch Base',
    });
  });
  fastify.get('/just-an-idea', (_req, rep) => {
    return rep.view('just-an-idea/ideas.hbs', {
      jsPath: 'just-an-idea/ideas',
      title: 'Ideas',
      ideaSection: true,
      communityIdeasPage: true,
      metaDesc: 'View ideas posted by the Launch Base community!',
    });
  });
  fastify.get('/just-an-idea/new', (_req, rep) => {
    return rep.view('just-an-idea/new-idea.hbs', {
      jsPath: 'just-an-idea/new-idea',
      title: 'Create Idea',
      ideaSection: true,
      newIdeaPage: true,
      metaDesc: 'Create a new Idea on Launch Base!',
    });
  });
  fastify.get('/just-an-idea/drafts', (_req, rep) => {
    return rep.view('just-an-idea/drafts.hbs', {
      jsPath: 'just-an-idea/drafts',
      title: 'Draft Ideas',
      ideaSection: true,
      draftIdeasPage: true,
      metaDesc: 'View your saved Draft Ideas.',
    });
  });
  fastify.get('/just-an-idea/published', (_req, rep) => {
    return rep.view('just-an-idea/published.hbs', {
      jsPath: 'just-an-idea/published',
      title: 'Published Ideas',
      ideaSection: true,
      publishedIdeasPage: true,
      metaDesc: 'View your Published Ideas.',
    });
  });
  fastify.get('/just-an-idea/upvoted', (_req, rep) => {
    return rep.view('just-an-idea/upvoted.hbs', {
      jsPath: 'just-an-idea/upvoted',
      title: 'Upvoted Ideas',
      ideaSection: true,
      upvotedIdeasPage: true,
      metaDesc: 'View ideas that you have upvoted!',
    });
  });
  fastify.get('/just-an-idea/accept-invite', (_req, rep) => {
    return rep.view('just-an-idea/accept-invite.hbs', {
      jsPath: 'just-an-idea/accept-invite',
      title: 'Accept Idea Invite',
      ideaSection: true,
      metaDesc: 'Accept a Launch Base Idea invite!',
    });
  });
  fastify.get('/just-an-idea/search', (_req, rep) => {
    return rep.view('just-an-idea/search', {
      jsPath: 'just-an-idea/search',
      title: 'Search Ideas',
      ideaSection: true,
      communityIdeasPage: true,
      metaDesc: 'Search for Ideas posted by the Launch Base community!',
    });
  });
  fastify.get('/just-an-idea/:ideaId', async (req, rep) => {
    const {ideaId} = req.params;
    if (!fastify.mongo.ObjectId.isValid(ideaId)) {
      return rep.code(404).sendFile('404.html');
    }

    const ideas = fastify.mongo.db.collection('ideas');
    const idea = await ideas.findOne({_id: new fastify.mongo.ObjectId(ideaId)});

    if (!idea) {
      return rep.code(404).sendFile('404.html');
    }

    return rep.view('just-an-idea/idea.hbs', {
      jsPath: 'just-an-idea/idea',
      title: idea.status == 'draft' ? 'Idea Draft' : idea.name,
      ideaSection: true,
      metaDesc:
        idea.status == 'draft' ? 'A Launch Base Community Idea' : idea.desc,
    });
  });
  fastify.get('/discuss/:commentId', (_req, rep) => {
    return rep.view('discuss/discuss.hbs', {
      jsPath: 'discuss/discuss',
      title: 'Discuss',
      discussSection: true,
      metaDesc: 'A Launch Base Discussion!',
    });
  });
  fastify.get('/the-real-thing', (_req, rep) => {
    return rep.view('coming-soon.hbs', {
      jsPath: 'coming-soon',
      title: 'The Real Thing',
      realSection: true,
      metaDesc: 'View organizations on Launch Base',
    });
  });
  fastify.get('/perks', (_req, rep) => {
    return rep.view('coming-soon.hbs', {
      jsPath: 'coming-soon',
      title: 'Perks',
      perksSection: true,
      metaDesc:
        'Get access to exclusive deals and perks for Launch Base members',
    });
  });
  fastify.get('/u/:handle', async (req, rep) => {
    const {handle} = req.params;

    const users = fastify.mongo.db.collection('users');
    const user = await users.findOne({urlLower: handle.toLowerCase()});

    return rep.view('talent/profile.hbs', {
      jsPath: 'talent/profile',
      title: user ? user.nickname + "'s Talent Profile" : 'Talent Profile',
      talentSection: true,
      talentProfilePage: true,
      user,
      emailHash: user ? md5(user.email) : null,
      metaDesc: `${
        user ? user.nickname : 'Someone'
      }'s Talent profile on Launch Base`,
    });
  });
  fastify.get('/talent', (_req, rep) => {
    rep.redirect('/talent/search');
  });
  fastify.get('/talent/search', (_req, rep) => {
    return rep.view('talent/search.hbs', {
      jsPath: 'talent/search',
      title: 'Talent Search',
      talentSection: true,
      talentSearchPage: true,
      metaDesc: 'Search for Talent on the Launch Base community',
    });
  });
  fastify.get('/*', (_req, rep) => {
    return rep.code(404).sendFile('404.html');
  });
}
