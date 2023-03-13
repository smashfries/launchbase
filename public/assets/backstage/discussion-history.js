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

const publicProfileLink = document.querySelector('#public-profile');
if (payload.handle) {
  publicProfileLink.setAttribute('href', `/u/${payload.handle}`);
} else {
  publicProfileLink.setAttribute('href', '/backstage/profile');
}

const msg = document.querySelector('.msg');
const commentContainer = document.querySelector('.comment-container');

const superTypeMap = {
  'idea': 'Just an Idea',
};

fetch('/comments/mine', {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json()).then((data) => {
  console.log(data);
  msg.classList.add('hide');
  if (data.error) {
    console.log(data);
    logout();
  } else {
    const replyData = data.replies;
    replyData.forEach((item) => {
      const comment = document.createElement('div');
      comment.classList.add('container', 'comment-item');

      const header = document.createElement('p');
      header.classList.add('comment-header');
      const replyDesc = document.createElement('span');
      if (item.superParent === item.parent) {
        replyDesc.textContent = 'You replied to ';
      } else {
        replyDesc.textContent = 'You replied to a comment posted under ';
      }
      header.appendChild(replyDesc);
      const superName = document.createElement('span');
      const boldText = document.createElement('strong');
      const badge = document.createElement('span');
      badge.classList.add('badge');
      if (item['idea_details'].length > 0) {
        boldText.textContent = item['idea_details'][0].name + ' ';
        badge.textContent = 'Just an Idea';
      }
      superName.appendChild(boldText);
      header.appendChild(superName);
      header.appendChild(badge);

      const commentBody = document.createElement('p');
      commentBody.classList.add('comment-body');
      commentBody.textContent = item.comment;

      const footer = document.createElement('p');
      footer.classList.add('comment-footer');
      const upvoteCount = document.createElement('span');
      upvoteCount.textContent = Intl.NumberFormat('en', {notation: 'compact'})
          .format(item.upvotes || 0);
      footer.appendChild(upvoteCount);
      const upvoteText = document.createElement('span');
      upvoteText.textContent = item.upvotes && item.upvotes === 1 ?
        ' Upvote 👌 ' : ' Upvotes 👌';
      footer.appendChild(upvoteText);
      const date = document.createElement('span');
      date.classList.add('badge');
      date.textContent = Intl.DateTimeFormat('en', {dateStyle: 'medium'})
          .format(new Date(item.timeStamp));
      footer.appendChild(date);

      comment.appendChild(header);
      comment.appendChild(commentBody);
      comment.appendChild(footer);

      commentContainer.appendChild(comment);
    });
  }
});

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
// const submitIcon = document.querySelector('.submit-icon');
const lockIcon = document.querySelector('.lock-icon');

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
