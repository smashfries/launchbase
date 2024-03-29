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

const publicInput = document.querySelector('[name="publicEmail"]');
const subInput = document.querySelector('[name="subscription"]');
const primaryEmail = document.querySelector('#primary-email');
const backupEmail = document.querySelector('#backup-email');
const switchEmails = document.querySelector('#switch-emails');
const msg = document.querySelector('.msg');

fetch('/email-settings', {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      if (data.error) {
        logout();
      }
      msg.classList.add('hide');
      publicInput.checked = data.publicEmail;
      subInput.checked = data.subscribed;
      primaryEmail.textContent = data.email;
      backupEmail.textContent = data.backupEmail || 'Not set';
      if (data.backupEmail) {
        switchEmails.classList.remove('hide');
      }
    });

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');
const submitIcon = document.querySelector('.submit-icon');
const swapIcons = document.querySelector('.swap-icon');

switchEmails.addEventListener('click', async () => {
  switchEmails.disabled = true;
  swapIcons.style.animationName = 'loading';
  fetch('/email-settings/swap-emails', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    if (data.error) {
      console.log(data);
    }
    window.location.reload();
  });
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

const form = document.querySelector('form');
const submitBtn = document.querySelector('button');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitIcon.style.animationName = 'loading';
  fetch('/email-settings', {
    method: 'put',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscribed: subInput.checked,
      publicEmail: publicInput.checked,
    }),
  }).then((res) => res.json())
      .then((_data) => {
        submitBtn.disabled = false;
        submitIcon.style.animationName = 'none';
        msg.textContent = 'Settings updated!';
        msg.className = 'msg success';
      });
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
