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

const url = new URL(window.location);
const ideaId = url.pathname.split('/')[2];

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');

const loadingMsg = document.querySelector('.msg.info');
const draftTemplate = document.querySelector('#pending-idea');
const publicTemplate = document.querySelector('#public-idea');

const linkDiv = document.querySelector('#link-inputs');
const linkBtn = document.querySelector('#link-btn');

const membersDiv = document.querySelector('#member-list');
const invitesDiv = document.querySelector('#invite-list');

const pendingIdeaform = document.querySelector('#pending-idea-form');
const nameInput = document.querySelector('[name="name"]');
const descInput = document.querySelector('[name="desc"]');
const ideaInput = document.querySelector('[name="idea"]');

const submitBtn = document.querySelector('#create-btn');
const submitIcon = document.querySelector('.submit-icon');

const errorMessages = {
  'invalid-emails': 'You have entered invalid emails. Please check them again.',
  'unauthorized': 'You need to log in again.',
  'invalid ideaId': 'We can not find an Idea with this ID because it is ' +
    'invalid. Please check the URL again',
  'idea does not exist': 'We couldn\'t find this idea. Please check the URL' +
    ' again. If it was deleted, you could try contacting the owners.',
  'access denied': 'This idea is a private draft. You must be a member in ' +
    'order to access it. If you are part of the idea, ask an admin to send' +
    ' you an invite.',
  'not an admin': 'Only admins can edit ideas',
};

fetch(`/ideas/${ideaId}`, {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      if (data.error) {
        if (data.error == 'unauthorized') {
          logout();
        }
        loadingMsg.classList.remove('info');
        loadingMsg.classList.add('error');
        if (errorMessages[data.error]) {
          loadingMsg.textContent = errorMessages[data.error];
        } else {
          loadingMsg.textContent = 'Something wen\'t wrong. Please try again.';
        }
      } else {
        loadingMsg.classList.add('hide');
        if (data.status == 'draft') {
          draftTemplate.classList.remove('hide');
          nameInput.value = data.name;
          descInput.value = data.desc;
          ideaInput.value = data.idea;

          data.links.forEach((link) => {
            createLinkItem(link);
          });

          data.members.forEach((member) => {
            createMemberItem(member);
          });
        }

        fetch(`/ideas/${ideaId}/invites`, {
          method: 'get',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).then((res) => res.json()).then((data) => {
          document.querySelector('#invite-loader').classList.add('hide');
          data.invites.forEach((invite) => {
            createInviteItem(invite);
          });
        });
      }
    });


linkBtn.addEventListener('click', () => {
  createLinkItem('');
});

function createLinkItem(linkStr) {
  const linkItem = document.createElement('div');
  linkItem.classList.add('link-item');

  const linkInput = document.createElement('input');
  linkInput.setAttribute('type', 'url');
  linkInput.setAttribute('placeholder', 'https://...');
  linkInput.setAttribute('maxlength', '2048');
  linkInput.setAttribute('required', '');
  linkInput.value = linkStr;
  linkItem.appendChild(linkInput);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.setAttribute('type', 'button');
  deleteBtn.addEventListener('click', (e) => deleteInput(e));
  linkItem.appendChild(deleteBtn);

  linkDiv.appendChild(linkItem);
}

function deleteInput(e) {
  const deleteBtn = e.target;
  const inputDiv = deleteBtn.parentElement;
  inputDiv.remove();
}

function createMemberItem(member) {
  const mainText = document.createElement('p');
  mainText.innerHTML = `${member.user_details[0].nickname} ` +
    `<span class="badge">@${member.user_details[0].url}</span> • ` +
    `<em>${member.role == 'member' ? 'Member' : 'Admin'}</em> ` +
    `<button class="small-emoji-btn">✏️</button>`;

  membersDiv.appendChild(mainText);
}

function createInviteItem(invite) {
  const date = new Date(invite.timeStamp);
  const formattedDate = new Intl.DateTimeFormat('en-US',
      {dateStyle: 'medium'}).format(date);
  const mainText = document.createElement('p');
  mainText.innerHTML = `${invite.email} • ` +
    `${formattedDate} <button class="small-emoji-btn">` +
    `🗑️</button>`;

  invitesDiv.appendChild(mainText);
}

pendingIdeaform.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitIcon.style.animationName = 'loading';

  const linkInputs = document.querySelectorAll('.link-item');

  const linkValues = [];
  if (linkInputs.length > 0) {
    linkInputs.forEach((i) => {
      linkValues.push(i.children[0].value);
    });
  }

  await fetch(`/ideas/${ideaId}`, {
    method: 'put',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: nameInput.value,
      desc: descInput.value,
      idea: ideaInput.value,
      links: linkValues,
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
          loadingMsg.classList.remove('info');
          loadingMsg.classList.remove('hide');
          loadingMsg.classList.add('success');
          loadingMsg.textContent = 'The draft was successfully updated!';
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
