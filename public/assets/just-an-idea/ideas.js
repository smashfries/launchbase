/* eslint-disable camelcase */
/* eslint-disable no-array-constructor */
/* eslint-disable require-jsdoc */
/* eslint-disable no-var */
/* eslint-disable new-cap */
const token = localStorage.getItem('token');
if (!token) {
  window.location.replace('/login');
}

const payload = parseJwt(token);
const emailHash = payload.emailHash;
const pfp = `https://www.gravatar.com/avatar/${emailHash}?s=50&d=mp`;
document.querySelector('.pfp').setAttribute('src', pfp);

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');
const msg = document.querySelectorAll('.msg');
const pageContainer = document.querySelector('.pagination-container');
const pageInput = document.querySelector('#page-in');
const nextPage = document.querySelector('#next');
const previousPage = document.querySelector('#prev');

const params = (new URL(document.location)).searchParams;
const filter = params.get('filter');
const page = params.get('page') ? params.get('page') : 1;

if (!Number.isInteger(Number(page)) || Number(page) < 1) {
  window.location.replace('/just-an-idea');
}

switch (filter) {
  case 'newest':
    filterPageSetup();
    const newBtn = document.querySelector('#filter-newest');
    newBtn.classList.add('active');
    newBtn.setAttribute('href', '/just-an-idea');
    fetch(`/ideas/published?filter=newest&page=${page}`, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then((res) => res.json())
        .then((data) => {
          if (data.error) {
            logout();
          }
          msg.forEach((i) => {
            i.classList.add('hide');
          });
          data.latestIdeas.forEach((idea) => {
            addIdeaItems('latest', idea);
          });
        });
    break;
  case 'oldest':
    filterPageSetup();
    const oldBtn = document.querySelector('#filter-oldest');
    oldBtn.classList.add('active');
    oldBtn.setAttribute('href', '/just-an-idea');
    fetch(`/ideas/published?filter=oldest&page=${page}`, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then((res) => res.json())
        .then((data) => {
          if (data.error) {
            logout();
          }
          msg.forEach((i) => {
            i.classList.add('hide');
          });
          data.oldestIdeas.forEach((idea) => {
            addIdeaItems('latest', idea);
          });
        });
    break;
  case 'upvotes':
    filterPageSetup();
    const upBtn = document.querySelector('#filter-upvotes');
    upBtn.classList.add('active');
    upBtn.setAttribute('href', '/just-an-idea');
    fetch(`/ideas/published?filter=upvotes&page=${page}`, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then((res) => res.json())
        .then((data) => {
          if (data.error) {
            logout();
          }
          msg.forEach((i) => {
            i.classList.add('hide');
          });
          data.hottestIdeas.forEach((idea) => {
            addIdeaItems('latest', idea);
          });
        });
    break;
  default:
    fetch('/ideas/published', {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then((res) => res.json())
        .then((data) => {
          if (data.error) {
            logout();
          }
          msg.forEach((i) => {
            i.classList.add('hide');
          });
          data.latestIdeas.forEach((idea) => {
            addIdeaItems('latest', idea);
          });
          data.hottestIdeas.forEach((idea) => {
            addIdeaItems('hottest', idea);
          });
        });
    break;
}

pageInput.addEventListener('keyup', (e) => {
  if (e.key == 'Enter') {
    const newPage = Number(pageInput.value);
    if (Number.isInteger(newPage) && newPage > 0) {
      window.location.href = `?filter=${filter}&page=${newPage}`;
    }
  }
});

pfpElement.addEventListener('click', showPfpDropdown);
pfpDropdown.addEventListener('click', (e) => {
  const rect = pfpDropdown.getBoundingClientRect();
  const isInDialog=(rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
  if (!isInDialog) {
    pfpDropdown.close();
  }
});

logoutBtn.addEventListener('click', () => {
  lockIcon.style.animationName = 'loading';
  logoutBtn.style.pointerEvents = 'none';
  logoutBtn.classList.add('active-panel-item');
  logout();
});

function addIdeaItems(filter, idea) {
  const ideaItem = document.createElement('div');
  ideaItem.classList.add('idea-item');
  const ideaTitle = document.createElement('h5');
  ideaTitle.classList.add('overflow-ellpsis');
  ideaTitle.textContent = idea.name;
  const ideaDesc = document.createElement('p');
  ideaDesc.classList.add('item-desc', 'overflow-ellipsis');
  ideaDesc.textContent = idea.desc;
  const date = new Date(idea.timeStamp);
  const formattedDate = new Intl.DateTimeFormat('en-US',
      {dateStyle: 'medium'}).format(date);
  const ideaDate = document.createElement('span');
  ideaDate.classList.add('badge');
  ideaDate.textContent = formattedDate;
  const ideaUpvotes = document.createElement('p');
  ideaUpvotes.classList.add('minor-text');
  ideaUpvotes.innerHTML = `${new Intl.NumberFormat('en',
      {notation: 'compact'})
      .format(idea.upvotes ? ideaUpvotes : 0)} ${idea.upvotes == 1 ?
        'Upvote' : 'Upvotes'} 👌`;
  ideaUpvotes.appendChild(ideaDate);
  ideaItem.appendChild(ideaTitle);
  ideaItem.appendChild(ideaDesc);
  ideaItem.appendChild(ideaUpvotes);
  const link = document.createElement('a');
  link.setAttribute('href', `/just-an-idea/${idea._id}`);
  link.appendChild(ideaItem);
  document.querySelector(`#${filter}-ideas`).appendChild(link);
}

function filterPageSetup() {
  if (page == 1) {
    previousPage.classList.add('hide');
  }
  pageContainer.classList.remove('hide');
  pageInput.value = page;
  nextPage.setAttribute('href', `?filter=${filter}&page=${Number(page)+1}`);
  previousPage.setAttribute('href', `?filter=${filter}&page=${Number(page)-1}`);
  document.querySelectorAll('h4').forEach((i) => {
    i.remove();
  });
  document.querySelector('#hottest-ideas').remove();
  document.querySelectorAll('.info')[1].remove();
}

/**
 * logout
 */
function logout() {
  fetch('/logout', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  }).then((data) => data.json())
      .then((res) => {
        if (res.message || res.error) {
          localStorage.clear();
          window.location.replace('/login');
        }
      });
}

/**
 * Show pfp modal
 */
function showPfpDropdown() {
  pfpDropdown.showModal();
}

/**
 * parse jwt and extract payload
 * @param {string} token user's jwt
 * @return {string} jwt payload
 */
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64)
      .split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

  return JSON.parse(jsonPayload);
};
