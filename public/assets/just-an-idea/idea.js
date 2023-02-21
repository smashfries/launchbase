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

let url = new URL(window.location);
const ideaId = url.pathname.split('/')[2];

let params = url.searchParams;
let page = params.get('page') ? Number(params.get('page')) : 1;
const pageInput = document.querySelector('#page-in');
const nextPage = document.querySelector('#next');
const previousPage = document.querySelector('#prev');

if (!Number.isInteger(Number(page)) || Number(page) < 1) {
  window.location.replace(url.pathname);
}
pageInput.value = page;
if (page == 1) {
  previousPage.classList.add('hide');
}

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
const lockIcon = document.querySelector('.lock-icon');

const confirmDialog = document.querySelector('#confirm-dialog');

const loadingMsg = document.querySelector('.msg.info');
const draftTemplate = document.querySelector('#pending-idea');

const publicTemplate = document.querySelector('#published-idea');
const ideaName = document.querySelector('#idea-name');
const ideaDesc = document.querySelector('#idea-desc');
const ideaContent = document.querySelector('#idea-content');
const ideaMembers = document.querySelector('#idea-members');
const ideaLinks = document.querySelector('#link-container');
const upvoteCount = document.querySelector('#upvote-count');
const upvoteBtn = document.querySelector('#idea-upvote');
const upvoteText = document.querySelector('#upvote-text');
const commentDataContainer = document.querySelector('#comment-data');
const replyBox = document.querySelector('#reply-box');
const submitReplyBtn = document.querySelector('#post-comment');
const commentCount = document.querySelector('#comment-count');
const commentError = document.querySelector('#comment-error');
const revertBtn = document.querySelector('#revert-draft');
let replyCount = 0;
let upvoteCounter = 0;

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

const inviteForm = document.querySelector('#invite-member');
const inviteInput = document.querySelector('#invite-input');

const publishBtn = document.querySelector('#publish');
const leaveBtn = document.querySelector('#leave');

const errorMessages = {
  'invalid email': 'You have entered an invalid email. Please update it' +
  ' try again.',
  'unauthorized': 'You need to log in again.',
  'invalid ideaId': 'We can not find an Idea with this ID because it is ' +
    'invalid. Please check the URL again',
  'idea does not exist': 'We couldn\'t find this idea. Please check the URL' +
    ' again. If it was deleted, you could try contacting the owners.',
  'access denied': 'This idea is a private draft. You must be a member in ' +
    'order to access it. If you are part of the idea, ask an admin to send' +
    ' you an invite.',
  'not an admin': 'You must be an admin.',
  'only admins can change roles': 'Only admins can change roles',
  'member does not exist for this idea':
  'This member is not a part of the idea',
  'insufficient admins': 'There must be atleast one admin for the idea',
  'idea is incomplete': 'All fields must be complete before you publish!',
};

fetch(`/ideas/${ideaId}`, {
  method: 'get',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then((res) => res.json())
    .then((data) => {
      console.log(data);
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

          document.querySelectorAll('.edit-role').forEach((i) => {
            i.addEventListener('click', () => {
              confirmDialog.innerHTML = `<h1>Change member role</h1>` +
              `<p>Are you sure you want to change ${i.dataset.nickname}'s` +
              ` role to ${i.dataset.role == 'admin' ? 'Member' : 'Admin'}?` +
              `</p> <button class="inline confirm-btn" ` +
              `onclick="changeRole('${i.dataset.role}', '${i.dataset.userid}'` +
              `)">Yes <span class="confirm-thumbsup">👍</span></button>` +
              `<button class="inline" onclick="closeConfirmDialog()">No 👎` +
              `</button>` +
              `<div class="msg error hide" id="confirm-error"></div>`;
              confirmDialog.showModal();
            });
          });

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

            document.querySelectorAll('.resend-invite').forEach((i) => {
              i.addEventListener('click', () => {
                confirmDialog.innerHTML = `<h1>Resend Invite</h1>` +
                `<p>Do you want to resend an invite to ${i.dataset.email}` +
                `?</p> <button class="inline confirm-btn" ` +
                `onclick="resendInvite('${i.dataset.email}', ` +
                `'${i.dataset.idea}')"> Yes <span class="confirm-thumbsup">` +
                `👍</span></button> <button class="inline" ` +
                `onclick="closeConfirmDialog()">No 👎</button>` +
                `<div class="msg error hide" id="confirm-error"></div>`;
                confirmDialog.showModal();
              });
            });

            document.querySelectorAll('.del-invite').forEach((i) => {
              i.addEventListener('click', () => {
                confirmDialog.innerHTML = `<h1>Revoke Invite</h1>` +
                `<p>Are you sure you want to revoke the invite that was ` +
                `sent to ${i.dataset.email}?</p> <button ` +
                `class="inline confirm-btn" onclick="revokeInvite` +
                `('${i.dataset.id}')">Yes <span class="confirm-thumbsup">` +
                `👍</span></button> <button class="inline" ` +
                `onclick="closeConfirmDialog()">No 👎</button>` +
                `<div class="msg error hide" id="confirm-error"></div>`;
                confirmDialog.showModal();
              });
            });
          });
        } else {
          if (data.replyCount) {
            replyCount = data.replyCount;
            commentCount.textContent = replyCount == 0||
            replyCount > 1 ? new Intl
                .NumberFormat('en', {notation: 'compact'}).format(replyCount) +
               ' Comments' : '1 Comment';
          } else {
            commentCount.textContent = '0 Comments';
          }
          ideaName.textContent = data.name;
          ideaDesc.textContent = data.desc;
          if (data.upvotes) {
            upvoteCounter = data.upvotes;
            const upvoteFormatted = new Intl.NumberFormat('en-us',
                {notation: 'compact'}).format(data.upvotes);
            upvoteCount.textContent = upvoteFormatted;
          } else {
            upvoteCounter = 0;
          }
          if (data.upvoted) {
            upvoteBtn.classList.remove('light-btn');
            upvoteBtn.classList.add('dark-btn');
            upvoteText.textContent = 'Upvoted';
            upvoteBtn.dataset.upvoted = true;
          }
          const ideaFragments = data.idea.split('\n');
          ideaFragments.forEach((fragment) => {
            const fragmentText = document.createElement('span');
            fragmentText.textContent = fragment;
            const lineBreak = document.createElement('br');
            ideaContent.appendChild(fragmentText);
            ideaContent.appendChild(lineBreak);
          });
          let memberContent = '';
          let isAdmin = false;
          data.members.forEach((member) => {
            if (member.user === payload.id && member.role === 'admin') {
              isAdmin = true;
            }
            const handle = member.user_details[0].url;
            const name = member.user_details[0].nickname;
            const display = `<div class="idea-member-name">${name}</div> ` +
              `<a href="/u/${handle}" class="public-member">` +
              `<span class="badge">@${handle}</span></a>`;
            memberContent += display;
          });
          if (isAdmin) {
            revertBtn.classList.remove('hide');
          }
          ideaMembers.innerHTML = memberContent;
          if (data.links.length > 0) {
            document.querySelector('#link-title').classList.remove('hide');
            data.links.forEach((link) => {
              const linkItem = document.createElement('a');
              linkItem.setAttribute('href', link);
              linkItem.setAttribute('target', '_blank');
              linkItem.classList.add('idea-link');
              linkItem.textContent = link + ' 🔗';
              ideaLinks.appendChild(linkItem);
              const lineBreak = document.createElement('br');
              ideaLinks.appendChild(lineBreak);
            });
          }
          publicTemplate.classList.remove('hide');
          setupComments();
        }
      }
    });

pageInput.addEventListener('keyup', (e) => {
  if (e.key == 'Enter') {
    const newPage = Number(pageInput.value);
    if (Number.isInteger(newPage) && newPage > 0) {
      window.location.href = `?page=${newPage}`;
    }
  }
});

nextPage.addEventListener('click', () => {
  commentError.classList.remove('hide');
  commentError.classList.replace('error', 'info');
  commentError.textContent = 'Loading...';
  setPage(page + 1);
  if (page != 1) {
    previousPage.classList.remove('hide');
  }
  setupComments(page);
});

previousPage.addEventListener('click', () => {
  commentError.classList.remove('hide');
  commentError.classList.replace('error', 'info');
  commentError.textContent = 'Loading...';
  setPage(page - 1);
  if (page == 1) {
    previousPage.classList.add('hide');
  }
  setupComments(page);
});

function setPage(newPage) {
  page = newPage;
  params.set('page', page);
  pageInput.value = page;
  params.set('page', page);
  history.pushState({page}, '', url);
}

window.addEventListener('popstate', (event) => {
  url = new URL(event.target.location);
  params = url.searchParams;
  page = params.get('page') ? Number(params.get('page')) : 1;
  if (!Number.isInteger(Number(page)) || Number(page) < 1) {
    window.location.replace(url.pathname);
  }
  pageInput.value = page;
  if (page == 1) {
    previousPage.classList.add('hide');
  } else {
    previousPage.classList.remove('hide');
  }
  setupComments();
});

function setupComments() {
  document.querySelectorAll('.comment-item').forEach((i) => {
    i.remove();
  });
  fetch(`/comments/${ideaId}?page=${page}`, {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((commentData) => {
    if (commentData.error) {
      window.location.reload();
      return;
    }
    commentError.classList.add('hide');
    commentDataContainer.classList
        .remove('hide');
    // document.querySelector('#comment-loader').classList
    //     .add('hide');
    commentData.replies.forEach((reply) => {
      const commentBody = document.createElement('p');
      const commentFragments = reply.comment.split('\n');
      commentFragments.forEach((fragment) => {
        const fragmentText = document.createElement('span');
        fragmentText.textContent = fragment;
        commentBody.appendChild(fragmentText);
        const lineBreak = document.createElement('br');
        commentBody.appendChild(lineBreak);
      });
      const date = new Date(reply.timeStamp);
      const formattedDate = new Intl.DateTimeFormat('en-US',
          {dateStyle: 'medium'}).format(date);
      const authorDetails = reply['author_details'][0];
      const container = document.createElement('div');
      container.classList.add('container');
      container.classList.add('comment-item');
      container.dataset.id = reply._id;
      container.dataset.replies = reply.replyCount || 0;
      container.dataset.upvotes = reply.upvotes || 0;
      container.innerHTML =
      `<p class="no-margin-top">${authorDetails.nickname}` +
      `<a href="/u/${authorDetails.url}" class="public-member">` +
      `<span class="badge">@${authorDetails.url}</span></a>` +
      `</p>` +
      commentBody.outerHTML +
      `<p class="small-font no-margin-bottom">` +
      `<button class="mini-btn${reply['upvote_details'].length === 1 ?
        ' dark-btn' : ' light-btn'}" ` +
        `onclick="upvoteComment(event)">` +
      `<span class="upvote-text">${reply['upvote_details']
          .length === 1 ?
        'Upvoted' : 'Upvote'}</span> ` +
      `<span>${new Intl.NumberFormat('en', {notation: 'compact'})
          .format(reply.upvotes || 0)}</span>` +
      ` <span class="submit-icon">👌</span></button>` +
      ` • <a href="/discuss/${reply._id}" ` +
      `class="idea-link small-font">${
        new Intl.NumberFormat('en', {notation: 'compact'}).
            format(reply.replyCount || 0)} ` +
      `${reply.replyCount && reply.replyCount == 1 ? 'Reply' : 'Replies'}` +
      `</a> ` +
      `${(payload.id === authorDetails._id) && !reply.deleted ?
        '• <button class="idea-link small-font" ' +
        'onclick="deleteCommentConfirm(' + '\'' + reply._id +
        '\'' + ')">Delete</button>' : ''}` +
      ` • ${formattedDate}</p>`;
      commentDataContainer.appendChild(container);
    });
  });
};

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
    `<a href="/u/${member.user_details[0].url}">` +
    `<span class="badge">@${member.user_details[0].url}</span></a> • ` +
    `<em>${member.role == 'member' ? 'Member' : 'Admin'}</em> ` +
    `<button class="small-emoji-btn edit-role" data-role="${member.role}"` +
    ` title="Change role" data-nickname="${member.user_details[0].nickname}" ` +
    `data-userid="${member.user_details[0]._id}">✏️</button>`;

  membersDiv.appendChild(mainText);
}

function createInviteItem(invite) {
  const date = new Date(invite.timeStamp);
  const formattedDate = new Intl.DateTimeFormat('en-US',
      {dateStyle: 'medium'}).format(date);
  const mainText = document.createElement('p');
  mainText.innerHTML = `${invite.email} • ${formattedDate}` +
    ` <button class="small-emoji-btn resend-invite" ` +
    `title="Resend Invite" data-email="${invite.email}" ` +
    `data-idea="${ideaId}">🔃</button>` +
    ` <button class="small-emoji-btn del-invite" ` +
    `title="Revoke invite" data-email="${invite.email}" ` +
    `data-id="${invite._id}">🗑️</button>`;

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

confirmDialog.addEventListener('click', (e) => {
  const rect = confirmDialog.getBoundingClientRect();
  const isInDialog=(rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
  if (!isInDialog) {
    confirmDialog.close();
  }
});

// eslint-disable-next-line no-unused-vars
function closeConfirmDialog() {
  confirmDialog.close();
}

// eslint-disable-next-line no-unused-vars
async function changeRole(currentRole, memberId) {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  const newRole = currentRole == 'admin' ? 'member' : 'admin';
  await fetch(`/ideas/${ideaId}/members/${memberId}/role`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({role: newRole}),
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';
        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          confirmError.classList.remove('hide');
          if (errorMessages[data.error]) {
            confirmError.textContent = errorMessages[data.error];
          } else {
            confirmError.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.reload();
        }
      });
}

// eslint-disable-next-line no-unused-vars
async function resendInvite(email, ideaId) {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  await fetch(`/ideas/${ideaId}/invite`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({email, role: 'member'}),
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';

        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          confirmError.classList.remove('hide');
          if (errorMessages[data.error]) {
            confirmError.textContent = errorMessages[data.error];
          } else {
            confirmError.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.reload();
        }
      });
}

// eslint-disable-next-line no-unused-vars
async function revokeInvite(inviteId) {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  await fetch(`/ideas/invite/${inviteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';

        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          confirmError.classList.remove('hide');
          if (errorMessages[data.error]) {
            confirmError.textContent = errorMessages[data.error];
          } else {
            confirmError.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.reload();
        }
      });
}

inviteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const okIcon = document.querySelector('.invite-icon');
  const confirmBtn = document.querySelector('.invite-btn');
  const error = document.querySelector('#invite-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';
  fetch(`/ideas/${ideaId}/invite`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({email: inviteInput.value, role: 'member'}),
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';
        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          error.classList.remove('hide');
          if (errorMessages[data.error]) {
            error.textContent = errorMessages[data.error];
          } else {
            error.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.reload();
        }
      });
});

publishBtn.addEventListener('click', () => {
  confirmDialog.innerHTML = `<h1>Publish Idea</h1>` +
  `<p>Are you sure you want to publish this idea?</p>` +
  `<button class="inline confirm-btn" onclick="publishIdea()">` +
  `Yes <span class="confirm-thumbsup">👍</span></button>` +
  `<button class="inline" onclick="closeConfirmDialog()">No 👎</button>` +
  `<div class="msg error hide" id="confirm-error"></div>`;
  confirmDialog.showModal();
});

leaveBtn.addEventListener('click', () => {
  confirmDialog.innerHTML = `<h1>Leave this Idea</h1>` +
  `<p>Are you sure you want to leave? If you say 'yes', you will` +
  ` not be able to access any of this data anymore.</p>` +
  `<button class="inline confirm-btn" onclick="leaveIdea()">` +
  `Yes <span class="confirm-thumbsup">👍</span></button>` +
  `<button class="inline" onclick="closeConfirmDialog()">No 👎</button>` +
  `<div class="msg error hide" id="confirm-error"></div>`;
  confirmDialog.showModal();
});

submitReplyBtn.addEventListener('click', async () => {
  if (replyBox.value !== '') {
    submitReplyBtn.textContent = '...';
    submitReplyBtn.disabled = true;
    fetch('/comments', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: replyBox.value,
        parent: ideaId,
        superParent: ideaId,
        superType: 'idea',
      }),
    }).then((res) => res.json()).then((data) => {
      console.log(data);
      submitReplyBtn.textContent = 'Share a Comment';
      submitReplyBtn.disabled = false;
      if (!data.error) {
        replyCount++;
        const date = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-US',
            {dateStyle: 'medium'}).format(date);
        const container = document.createElement('div');
        container.classList.add('container');
        container.classList.add('comment-item');
        container.dataset.id = data.commentId;
        container.dataset.replies = 0;
        container.dataset.upvotes = 0;

        const commentFragments = replyBox.value.split('\n');
        let formattedCommentBody = '';
        commentFragments.forEach((fragment) => {
          formattedCommentBody = formattedCommentBody + '<span>' +
            fragment + '</span><br>';
        });


        container.innerHTML =
        `<p class="no-margin-top">${data.authorName}` +
        `<a href="/u/${data.authorHandle}" class="public-member">` +
        `<span class="badge">@${data.authorHandle}</span></a>` +
        `</p>` +
        `<p>${formattedCommentBody}</p>` +
        `<p class="small-font no-margin-bottom">` +
        `<button class="mini-btn light-btn" ` +
        `onclick="upvoteComment(event)"><span class="upvote-text">` +
        `Upvote</span>` +
        ` <span>0</span> <span class="submit-icon">👌</span></button>` +
        ` • <a href="/discuss/${data.commentId}" ` +
        `class="idea-link small-font">0 Replies</a> ` +
        `• <button class="idea-link small-font" ` +
        `onclick="deleteCommentConfirm('${data.commentId}')">Delete</button> ` +
        `• ${formattedDate}</p>`;
        commentDataContainer.appendChild(container);
        replyBox.value = '';
        // console.log(replyCount, commentCount);
        commentCount.textContent = replyCount == 1 ?
          '1 Comment' : `${new Intl.NumberFormat('en', {notation: 'compact'})
              .format(replyCount)} Comments`;
        window.scrollTo(0, document.body.scrollHeight);
      } else {
        if (data.error === 'profile incomplete') {
          commentError.classList.remove('hide');
          commentError.classList.remove('info');
          commentError.classList.add('error');
          commentError.innerHTML = 'Please complete your profile before' +
            ` posting a comment. Click <u><a href="/backstage/profile?` +
            `redirect=${window.location.href}">here</a></u> to update it!`;
        }
      }
    });
  }
});

// eslint-disable-next-line no-unused-vars
function deleteCommentConfirm(commentId) {
  confirmDialog.innerHTML = `<h1>Delete this Comment</h1>` +
  `<p>Are you sure you want to delete this comment? ` +
  `If you say 'yes', the contents of this comment will be ` +
  `permanently deleted. However, others can still reply to it.</p>` +
  `<button class="inline confirm-btn" ` +
  `onclick="deleteComment('${commentId}')">` +
  `Yes <span class="confirm-thumbsup">👍</span></button>` +
  `<button class="inline" onclick="closeConfirmDialog()">No 👎</button>` +
  `<div class="msg error hide" id="confirm-error"></div>`;
  confirmDialog.showModal();
}

// eslint-disable-next-line no-unused-vars
async function deleteComment(commentId) {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  await fetch(`/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    confirmBtn.disabled = false;
    okIcon.style.animationName = 'none';
    if (data.error) {
      confirmError.classList.remove('hide');
      confirmError.textContent = 'Something wen\' wrong. Please try again.';
    } else {
      replyCount--;
      closeConfirmDialog();
      const commentElement = document.querySelector(`[data-id="${commentId}"]`);
      commentElement.firstChild.nextSibling.textContent =
        'This comment was deleted.';
      commentElement.lastChild.lastChild.previousSibling.remove();
      commentElement.lastChild.lastChild.previousSibling.remove();
      commentCount.textContent = replyCount == 1 ?
        '1 Comment' : `${new Intl.NumberFormat('en', {notation: 'compact'})
            .format(replyCount)} Comments`;
    }
  });
}

// eslint-disable-next-line no-unused-vars
async function publishIdea() {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  await fetch(`/ideas/${ideaId}/publish`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';
        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          confirmError.classList.remove('hide');
          if (errorMessages[data.error]) {
            confirmError.textContent = errorMessages[data.error];
          } else {
            confirmError.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.reload();
        }
      });
}

// eslint-disable-next-line no-unused-vars
async function leaveIdea() {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  await fetch(`/ideas/${ideaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json())
      .then((data) => {
        confirmBtn.disabled = false;
        okIcon.style.animationName = 'none';
        if (data.error) {
          if (data.error == 'unauthorized') {
            logout();
          }
          confirmError.classList.remove('hide');
          if (errorMessages[data.error]) {
            confirmError.textContent = errorMessages[data.error];
          } else {
            confirmError.textContent = 'Something wen\'t wrong. Please reload' +
            ' and try again.';
          }
        } else {
          window.location.href = '/just-an-idea/drafts';
        }
      });
};

upvoteBtn.addEventListener('click', async () => {
  const upvoted = upvoteBtn.dataset.upvoted;
  upvoteBtn.disabled = true;
  const upvoteIcon = document.querySelector('.submit-icon#idea-upvote-icon');
  upvoteIcon.style.animationName = 'loading';

  fetch(`/${upvoted == 'true' ? 'downvote' : 'upvote'}/idea/${ideaId}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    if (data.error) {
      window.location.reload();
    } else {
      upvoteBtn.disabled = false;
      upvoteIcon.style.animationName = 'none';
      upvoteBtn.dataset.upvoted = upvoted == 'true' ? false : true;
      if (upvoted == 'true') {
        upvoteCounter--;
        upvoteText.textContent = 'Upvote';
        upvoteBtn.classList.remove('dark-btn');
        upvoteBtn.classList.add('light-btn');
      } else {
        upvoteCounter++;
        upvoteText.textContent = 'Upvoted';
        upvoteBtn.classList.remove('light-btn');
        upvoteBtn.classList.add('dark-btn');
      }
      upvoteCount.textContent = new Intl
          .NumberFormat('en', {notation: 'compact'})
          .format(upvoteCounter);
    }
  });
});

// eslint-disable-next-line no-unused-vars
async function upvoteComment(e) {
  let commentUpvoteBtn = e.target;
  if (e.target.localName !== 'button') {
    commentUpvoteBtn = e.target.parentElement;
  }
  const commentItem = commentUpvoteBtn.parentElement.parentElement;
  const icon = commentUpvoteBtn.lastChild;
  const commentUpvoteCount = icon.previousElementSibling;
  const upvoteNumber = Number(commentItem.dataset.upvotes);
  const text = commentUpvoteBtn.firstChild;
  const commentId = commentItem.dataset.id;
  const upvoted = commentUpvoteBtn.classList.contains('dark-btn') ?
    true : false;

  commentUpvoteBtn.disabled = true;
  icon.style.animationName = 'loading';

  fetch(`/${upvoted ? 'downvote' : 'upvote'}/comment/${commentId}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    if (data.error) {
      window.location.reload();
    } else {
      commentUpvoteBtn.disabled = false;
      icon.style.animationName = 'none';
      if (upvoted) {
        commentItem.dataset.upvotes = upvoteNumber - 1;
        commentUpvoteCount.textContent = new Intl
            .NumberFormat('en', {notation: 'compact'}).format(upvoteNumber - 1);
        text.textContent = 'Upvote ';
        commentUpvoteBtn.classList.remove('dark-btn');
        commentUpvoteBtn.classList.add('light-btn');
      } else {
        commentItem.dataset.upvotes = upvoteNumber + 1;
        text.textContent = 'Upvoted ';
        commentUpvoteCount.textContent = new Intl
            .NumberFormat('en', {notation: 'compact'}).format(upvoteNumber + 1);
        commentUpvoteBtn.classList.add('dark-btn');
        commentUpvoteBtn.classList.remove('light-btn');
      }
    }
  });
}

revertBtn.addEventListener('click', () => {
  confirmDialog.innerHTML = `<h1>Revert to Draft?</h1>` +
  `<p>Are you sure you want to revert this idea to a draft? ` +
  `If you say 'yes', this idea will become private and will only be visible ` +
  `to its members.</p>` +
  `<button class="inline confirm-btn" ` +
  `onclick="revertDraft()">` +
  `Yes <span class="confirm-thumbsup">👍</span></button>` +
  `<button class="inline" onclick="closeConfirmDialog()">No 👎</button>` +
  `<div class="msg error hide" id="confirm-error"></div>`;
  confirmDialog.showModal();
});

// eslint-disable-next-line no-unused-vars
async function revertDraft() {
  const okIcon = document.querySelector('.confirm-thumbsup');
  const confirmBtn = document.querySelector('.confirm-btn');
  const confirmError = document.querySelector('#confirm-error');

  confirmBtn.disabled = true;
  okIcon.style.animationName = 'loading';

  fetch(`/ideas/${ideaId}/rollback`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    confirmBtn.disabled = false;
    okIcon.style.animationName = 'none';
    if (data.error) {
      console.log(data.error);
      confirmError.classList.remove('hide');
      confirmError.textContent = 'Something wen\' wrong. Please try again.';
    } else {
      window.location.reload();
    }
  });
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
