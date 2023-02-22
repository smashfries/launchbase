/* eslint-disable camelcase */
/* eslint-disable no-array-constructor */
/* eslint-disable require-jsdoc */
/* eslint-disable no-var */
/* eslint-disable new-cap */
const token = localStorage.getItem('token');
if (!token) {
  window.location.replace('/login?redirect=' + encodeURI(window.location.href));
}

const payload = parseJwt(token);
const emailHash = payload.emailHash;
const pfp = `https://www.gravatar.com/avatar/${emailHash}?s=50&d=mp`;
document.querySelector('.pfp').setAttribute('src', pfp);

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');
const draftContainer = document.querySelector('.idea-container');

const publicProfileLink = document.querySelector('#public-profile');
if (payload.handle) {
  publicProfileLink.setAttribute('href', `/u/${payload.handle}`);
} else {
  publicProfileLink.setAttribute('href', '/backstage/profile');
}

document.querySelector('input').addEventListener('input', (e) => {
  const encodedQuery = encodeURIComponent(e.target.value);
  updateResults(encodedQuery);
});

const updateResults = debounce((query) => {
  if (query == '') {
    draftContainer.innerHTML =
            '<p>Start typing to search!</p>';
    return;
  }
  fetch(`/ideas/published/search?q=${query}`, {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          if (data.latestIdeas.length == 0) {
            draftContainer.innerHTML =
              '<p>No ideas found.</p>';
          } else {
            draftContainer.innerHTML = '';
            data.latestIdeas.forEach((idea) => {
              addIdeaItems(idea);
            });
          }
        } else {
          console.log(data);
          draftContainer.innerHTML =
            '<p>Something wen\'t wrong. Please try again.</p>';
        }
      })
      .catch((error) => {
        console.log(error);
        draftContainer.innerHTML =
            '<p>Something wen\'t wrong. Please try again.</p>';
      });
});

function debounce(cb, delay = 250) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      cb(...args);
    }, delay);
  };
};

function addIdeaItems(idea) {
  const ideaItem = document.createElement('div');
  ideaItem.classList.add('idea-item');
  const ideaTitle = document.createElement('h5');
  ideaTitle.classList.add('overflow-ellpsis');
  ideaTitle.textContent = idea.name;
  const ideaDesc = document.createElement('p');
  ideaDesc.classList.add('item-desc', 'overflow-ellipsis');
  ideaDesc.textContent = idea.desc || 'No description.';
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
      .format(idea.upvotes ||
        0)} ${idea.upvotes == 1 ?
        'Upvote' : 'Upvotes'} 👌`;
  ideaUpvotes.appendChild(ideaDate);
  ideaItem.appendChild(ideaTitle);
  ideaItem.appendChild(ideaDesc);
  ideaItem.appendChild(ideaUpvotes);
  const link = document.createElement('a');
  link.setAttribute('href', `/just-an-idea/${idea._id}`);
  link.appendChild(ideaItem);
  draftContainer.appendChild(link);
}

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
