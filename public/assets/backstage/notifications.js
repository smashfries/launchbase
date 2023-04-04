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

const searchString = window.location.search;
const searchParams = new URLSearchParams(searchString);

const viewMode = searchParams.get('view') || 'all';

if (viewMode !== 'all' && viewMode !== 'dismissed') {
  window.location.replace('/backstage/notifications');
}

const msg = document.querySelector('.msg');
const notificationContainer = document.querySelector('#notification-container');
const dismissHeader = document.querySelector('.dismiss-header');

fetch(`/notifications?view=${viewMode}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((res) => res.json())
  .then((data) => {
    console.log(data);
    msg.classList.add('hide');
    if (data.error) {
      if (data.error == 'unauthorized') {
        logout();
      } else {
        msg.textContent = "Something wen't wrong. Please try again later.";
        msg.classList.replace('info', 'error');
      }
    } else {
      data.forEach((notification) => {
        const notifBox = document.createElement('details');
        notifBox.classList.add('notif-box');
        const summary = document.createElement('summary');
        const notifPreview = document.createElement('span');
        notifPreview.classList.add('notif-preview');
        const textPreview = document.createElement('span');
        const datePreview = document.createElement('span');
        datePreview.textContent = 'March 23, 2023';
        notifBox.dataset.id = notification._id;
        notifBox.dataset.docs = JSON.stringify(
          notification.notification_details.docs
        );
        switch (notification.notification_details._id) {
          case 'reply':
            textPreview.textContent = `You\'ve received ${notification.notification_details.count} new replies`;
            break;
          case 'upvote':
            textPreview.textContent = `You\'ve received ${notification.notification_details.count} new upvotes`;
            break;
          default:
            break;
        }
        const notificationDetails = document.createElement('div');
        notificationDetails.classList.add('msg', 'info');
        notificationDetails.textContent =
          'Fetch your data. Please hold on for a bit.';

        summary.appendChild(notifPreview);
        notifPreview.appendChild(textPreview);
        notifPreview.appendChild(datePreview);
        notifBox.appendChild(summary);
        notifBox.appendChild(notificationDetails);
        notificationContainer.appendChild(notifBox);
      });
      dismissHeader.classList.remove('hide');
      if (viewMode == 'dismissed') {
        document.querySelector('.idea-link').textContent =
          'View current notifications';
        document.querySelector('.idea-link').setAttribute('href', '?view=all');
        document.querySelector('.dismiss-btn').textContent = 'Delete All';
      }
    }
  });

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');

pfpElement.addEventListener('click', showPfpDropdown);
pfpDropdown.addEventListener('click', (e) => {
  const rect = pfpDropdown.getBoundingClientRect();
  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;
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

pfpElement.addEventListener('click', showPfpDropdown);
pfpDropdown.addEventListener('click', (e) => {
  const rect = pfpDropdown.getBoundingClientRect();
  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;
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
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
    .then((data) => data.json())
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
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );

  return JSON.parse(jsonPayload);
}
