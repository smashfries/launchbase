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
const linkDiv = document.querySelector('#link-inputs');
const linkBtn = document.querySelector('#link-btn');
const emailDiv = document.querySelector('#email-inputs');
const emailBtn = document.querySelector('#email-btn');

const form = document.querySelector('form');
const nameInput = document.querySelector('[name="name"]');
const descInput = document.querySelector('[name="desc"]');
const ideaInput = document.querySelector('[name="idea"]');

const submitBtn = document.querySelector('#create-btn');
const submitIcon = document.querySelector('.submit-icon');

fetch('/profile?only=completionStatus', {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      if (data.error) {
        logout();
      }
      const msg = document.querySelector('.msg');
      if (data.isComplete) {
        msg.classList.add('hide');
      } else {
        msg.classList.remove('info');
        msg.classList.add('warning');
        msg.innerHTML = `You must complete your profile before you` +
        ` can create an idea. Click <u><a href="/backstage/profile` +
        `?redirect=${window.location.href}">here</a>` +
        `</u> to update your profile.`;
      }
    });

linkBtn.addEventListener('click', () => {
  const linkItem = document.createElement('div');
  linkItem.classList.add('link-item');

  const linkInput = document.createElement('input');
  linkInput.setAttribute('type', 'url');
  linkInput.setAttribute('placeholder', 'https://...');
  linkInput.setAttribute('maxlength', '2048');
  linkInput.setAttribute('required', '');
  linkItem.appendChild(linkInput);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.setAttribute('type', 'button');
  deleteBtn.addEventListener('click', (e) => deleteInput(e));
  linkItem.appendChild(deleteBtn);

  linkDiv.appendChild(linkItem);
});

emailBtn.addEventListener('click', () => {
  const emailList = document.querySelector('#email-inputs').children.length;
  if (emailList == 19) {
    emailBtn.classList.add('hide');
  }

  const emailItem = document.createElement('div');
  emailItem.classList.add('email-item');

  const emailInput = document.createElement('input');
  emailInput.setAttribute('type', 'email');
  emailInput.setAttribute('placeholder', 'johndoe@example.com');
  emailInput.setAttribute('maxlength', '320');
  emailInput.setAttribute('required', '');
  emailItem.appendChild(emailInput);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.setAttribute('type', 'button');
  deleteBtn.addEventListener('click', (e) => {
    if (document.querySelector('#email-inputs').children.length == 20) {
      emailBtn.classList.remove('hide');
    }
    deleteInput(e);
  });
  emailItem.appendChild(deleteBtn);

  emailDiv.appendChild(emailItem);
});

function deleteInput(e) {
  const deleteBtn = e.target;
  const inputDiv = deleteBtn.parentElement;
  inputDiv.remove();
}

const errorMessages = {
  'invalid-emails': 'You have entered invalid emails. Please check them again.',
  'unauthorized': 'You need to log in again.',
  'profile incomplete':
    'You must complete your profile before creating an idea!',
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitIcon.style.animationName = 'loading';

  const linkInputs = document.querySelectorAll('.link-item');
  const emailInputs = document.querySelectorAll('.email-item');

  const linkValues = [];
  if (linkInputs.length > 0) {
    linkInputs.forEach((i) => {
      linkValues.push(i.children[0].value);
    });
  }

  const memberEmails = [];
  if (emailInputs.length > 0) {
    emailInputs.forEach((i) => {
      memberEmails.push({email: i.children[0].value, role: 'member'});
    });
  }
  await fetch('/ideas', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: nameInput.value,
      desc: descInput.value,
      idea: ideaInput.value,
      links: linkValues,
      members: memberEmails,
    }),
  }).then((res) => res.json())
      .then((data) => {
        submitBtn.disabled = false;
        submitIcon.style.animationName = 'none';
        if (data.error) {
          const msg = document.querySelector('.msg.error');
          msg.classList.remove('hide');
          if (errorMessages[data.error]) {
            msg.textContent = errorMessages[data.error];
          } else {
            msg.textContent = 'Something went wrong. Please try again';
          }

          if (data.error == 'unauthorized') {
            logout();
          }
        } else {
          window.location.href = '/just-an-idea/drafts';
        }
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
