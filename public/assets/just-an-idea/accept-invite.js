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

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');

const params = new URLSearchParams(window.location.search);
const inviteToken = params.get('token');

if (!inviteToken) {
  window.location.replace('/just-an-idea');
}

fetch('/ideas/invite?token=' + inviteToken, {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      const msg = document.querySelector('.msg');
      if (data.error) {
        if (data.error == 'unauthorized') {
          logout();
        }
        msg.classList.remove('info');
        msg.classList.add('error');
        if (errorMessages[data.error]) {
          msg.textContent = errorMessages[data.error];
        } else {
          msg.textContent = 'Something wen\'t wrong. Please try again.';
        }
      } else {
        msg.classList.add('hide');
        const contentDiv = document.querySelector('.settings-content');
        const content = document.createElement('div');
        content.classList.add('text-center');

        const h4 = document.createElement('h4');
        h4.textContent = 'You have been invited to ' + data.name;

        const acceptDesc = document.createElement('p');
        acceptDesc.textContent = 'Do you want to accept this invite' +
          ' and join the team?';

        const yesBtn = document.createElement('button');
        yesBtn.id = 'yes-btn';
        yesBtn.onclick = acceptInvite;
        yesBtn.classList.add('inline', 'submit-btn');
        yesBtn.innerHTML = 'Yes <span class="confirm-thumbsup">👍</span>';

        const noBtn = document.createElement('button');
        noBtn.onclick = cancel;
        noBtn.classList.add('inline');
        noBtn.innerHTML = 'No <span class="confirm-thumbsup">👎</span>';

        const errorMessage = document.createElement('div');
        errorMessage.classList.add('msg', 'error', 'hide', 'text-center');

        content.appendChild(h4);
        content.appendChild(acceptDesc);
        content.appendChild(yesBtn);
        content.appendChild(noBtn);
        content.appendChild(errorMessage);

        contentDiv.appendChild(content);
      }
    });


const errorMessages = {
  'invalid tokens': 'This invite is invalid.',
  'idea does not exist': 'This idea does not exist. ' +
  'The owner of the idea might have deleted it.',
  'unauthorized': 'You need to log in again.',
  'profile incomplete':
    `You must complete your profile before creating an idea! ` +
    `Click <u><a href="/backstage/profile?redirect=${window.location.href}` +
    `">here</a></u> to complete it now!`,
  'invite does not exist': 'The invite does not exist. The owner of the' +
  ' idea might have revoked it.',
  'already member': 'You are already a member of this idea!',
};

// eslint-disable-next-line no-unused-vars
function acceptInvite() {
  const confirmBtn = document.querySelector('#yes-btn');
  const okIcon = document.querySelector('.confirm-thumbsup');
  const error = document.querySelector('.error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  fetch(`/ideas/accept-invite`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({token: inviteToken}),
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled - false;
        okIcon.style.animationName = 'none';
        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          error.classList.remove('hide');
          if (errorMessages[data.error]) {
            error.textContent = errorMessages[data.error];
          } else {
            error.textContent = 'Something wen\'t wrong. Please try again.';
          }
        } else {
          window.location.replace('/just-an-idea/' + data.ideaId);
        }
      });
}

// eslint-disable-next-line no-unused-vars
function cancel() {
  window.location.replace('/just-an-idea');
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
