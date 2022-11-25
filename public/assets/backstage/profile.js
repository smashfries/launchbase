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

const nameInput = document.querySelector('[name="name"]');
const nickInput = document.querySelector('[name="nick"]');
const urlInput = document.querySelector('[name="url"]');
const occInput = document.querySelector('[name="occ"]');
const skillsInput = document.querySelector('[name="skills"]');
const interestsInput = document.querySelector('[name="interests"]');
const twitterInput = document.querySelector('[name="twitter"]');
const githubInput = document.querySelector('[name="github"]');
const msg = document.querySelector('.msg');

const showEvents = ['mouseenter', 'focus'];
const hideEvents = ['mouseleave', 'blur'];

fetch('/profile', {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      if (data.error) {
        logout();
      } else {
        if (data.isComplete) {
          msg.classList.add('hide');
          nameInput.value = data.name;
          nickInput.value = data.nickname;
          urlInput.value = data.url;
          occInput.value = data.occ;
          skillsInput.value = data.skills;
          interestsInput.value = data.interests;
          if (data.twitter) {
            twitterInput.value = data.twitter;
          }
          if (data.github) {
            githubInput.value = data.github;
          }
          const inputList = document.querySelectorAll('input');
          inputList.forEach((input) => {
            const tooltip = document.
                querySelector(`#${input.getAttribute('name')}-tooltip`);
            const popperInstance = Popper.createPopper(input, tooltip, {
              placement: 'right',
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, 5],
                  },
                },
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['bottom'],
                    boundary: document.querySelector('.settings-content'),
                  },
                },
              ],
            });
            showEvents.forEach((e) => {
              input.addEventListener(e, () => {
                tooltip.setAttribute('data-show', '');
                popperInstance.update();
              });
            });
            hideEvents.forEach((e) => {
              input.addEventListener(e, () => {
                tooltip.removeAttribute('data-show');
              });
            });
          });
        } else {
          msg.textContent = 'Your profile is not complete.';
          msg.className = 'warning msg';
        }
      }
    });

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const submitIcon = document.querySelector('.submit-icon');
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

const errorCodes = {
  'invalid-twitter': 'Your Twitter handle is invalid',
  'invalid-url': `Usernames can only contain alphanumeric
    combinations and the symbols: - and _`,
  'url-exists': 'This username is already taken.',
  'token-expired': 'token-expired',
  'unauthorized': 'unauthorized',
};

const submitBtn = document.querySelector('button[type="submit"]');
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitIcon.style.animationName = 'loading';
  fetch('/profile', {
    method: 'put',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: nameInput.value,
      nickname: nickInput.value,
      url: urlInput.value,
      occ: occInput.value,
      skills: skillsInput.value,
      interests: interestsInput.value,
      twitter: twitterInput.value,
      github: githubInput.value,
    }),
  }).then((res) => res.json())
      .then((data) => {
        submitBtn.disabled = false;
        submitIcon.style.animationName = 'none';
        if (data.error) {
          if (!document.querySelector('.error')) {
            const errorMsg = document.createElement('p');
            errorMsg.className = 'error msg';
            errorMsg.textContent = errorCodes[data.error];
            document.querySelector('.settings-content').appendChild(errorMsg);
          } else {
            document.querySelector('.error')
                .textContent = errorCodes[data.error];
          }
        } else {
          msg.className = 'msg success';
          msg.textContent = 'Profile updated!';
          if (document.querySelector('.error')) {
            document.querySelector('.error').remove();
          }
        }
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
