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
const commentId = url.pathname.split('/')[2];

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

const mainContent = document.querySelector('#main-content');
const parentText = document.querySelector('#parent-text');
const deleteBtn = document.querySelector('#delete-main');

const upvoteCount = document.querySelector('#upvote-count');
const upvoteBtn = document.querySelector('#idea-upvote');
const upvoteText = document.querySelector('#upvote-text');

const commentDataContainer = document.querySelector('#comment-data');
const replyBox = document.querySelector('#reply-box');
const submitReplyBtn = document.querySelector('#post-comment');
const commentCount = document.querySelector('#comment-count');
const commentError = document.querySelector('#comment-error');
let replyCount = 0;

let superParent;
let superType;

const superTypeMap = {
  'idea': 'just-an-idea',
};

// To be updated!
setupComments();

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
  fetch(`/comments/${commentId}?page=${page}`, {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((commentData) => {
    console.log(commentData);
    if (commentData.error) {
      loadingMsg.classList.replace('info', 'error');
      if (commentData.error === 'invalid parentId') {
        loadingMsg.textContent =
          'This is an invalid comment ID.';
      } else {
        loadingMsg.textContent =
          'Something wen\'t wrong. Please try again.';
      }
      return;
    }
    if (commentData.comment === null) {
      loadingMsg.classList.replace('info', 'error');
      loadingMsg.textContent =
        'We couldn\'t find a comment with this ID. It might have been deleted.';
      return;
    }
    loadingMsg.classList.add('hide');
    mainContent.classList.remove('hide');
    const authorDetails = document.querySelector('#comment-author');
    authorDetails.innerHTML =
      `<span>${commentData['author_details'].displayName}</span>` +
      `<a href="/u/${commentData['author_details'].handle}"` +
      ` class="public-member">` +
      `<span class="badge">${commentData['author_details'].handle}</span></a>`;
    const parentComment = document.querySelector('#parent');
    const superParentComment = document.querySelector('#super-parent');
    if (commentData.comment.parent === commentData.comment.superParent) {
      parentComment.setAttribute('href', '/' +
      superTypeMap[commentData.comment.superType] + '/' +
      commentData.comment.parent);
      superParentComment.setAttribute('href', '/' +
      superTypeMap[commentData.comment.superType] + '/' +
      commentData.comment.parent);
    } else {
      parentComment.setAttribute('href', '/' +
      'discuss' + '/' + commentData.comment.parent);
      superParentComment.setAttribute('href', '/' +
      superTypeMap[commentData.comment.superType] + '/' +
      commentData.comment.superParent);
    }
    if (payload.id !== commentData.comment.author) {
      deleteBtn.classList.add('hide');
    }
    if (commentData.comment.deleted) {
      deleteBtn.classList.add('hide');
    }
    parentText.innerHTML = '';
    const parentFragments = commentData.comment.comment.split('\n');
    parentFragments.forEach((fragment) => {
      const fragmentText = document.createElement('span');
      fragmentText.textContent = fragment;
      parentText.appendChild(fragmentText);
      const lineBreak = document.createElement('br');
      parentText.appendChild(lineBreak);
    });
    commentError.classList.add('hide');
    commentDataContainer.classList
        .remove('hide');
    replyCount = commentData.comment.replyCount || 0;
    commentCount.textContent = `${replyCount} ${replyCount === 1 ?
       'Reply' : 'Replies'}`;
    superParent = commentData.comment.superParent;
    superType = commentData.comment.superType;

    if (commentData.comment.upvotes) {
      const upvoteFormatted = new Intl.NumberFormat('en-us',
          {notation: 'compact'}).format(commentData.comment.upvotes);
      upvoteCount.textContent = upvoteFormatted;
    }

    if (commentData.upvoted) {
      upvoteBtn.classList.remove('light-btn');
      upvoteBtn.classList.add('dark-btn');
      upvoteText.textContent = 'Upvoted';
      upvoteBtn.dataset.upvoted = true;
    }

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
          .format(reply.upvotes ? reply.upvotes : 0)}</span>` +
      ` <span class="submit-icon">👌</span></button>` +
      ` • <a href="/discuss/${reply._id}" ` +
      `class="idea-link small-font">${reply.replyCount || 0} ` +
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

deleteBtn.addEventListener('click', () => {
  deleteCommentConfirm(commentId, false);
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
        parent: commentId,
        superParent,
        superType,
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
        container.innerHTML =
        `<p class="no-margin-top">${data.authorName}` +
        `<a href="/u/${data.authorHandle}" class="public-member">` +
        `<span class="badge">@${data.authorHandle}</span></a>` +
        `</p>` +
        `<p>${replyBox.value}</p>` +
        `<p class="small-font no-margin-bottom">` +
        `<button class="mini-btn light-btn"><span>` +
        `0 </span>` +
        `Upvotes 👌</button>` +
        ` • <a href="/discuss/${data.commentId}" ` +
        `class="idea-link small-font">Replies</a> ` +
        `• <button class="idea-link small-font" ` +
        `onclick="deleteCommentConfirm('${data.commentId}')">Delete</button> ` +
        `• ${formattedDate}</p>`;
        commentDataContainer.appendChild(container);
        replyBox.value = '';
        // console.log(replyCount, commentCount);
        commentCount.textContent = replyCount == 1 ?
          '1 Reply' : `${replyCount} Replies`;
        window.scrollTo(0, document.body.scrollHeight);
      } else {
        if (data.error === 'profile incomplete') {
          commentError.classList.remove('hide');
          commentError.innerHTML = 'Please complete your profile before' +
            ` posting a comment. Click <u><a href="/backstage/profile?` +
            `redirect=${window.location.href}">here</a></u> to update it!`;
        }
      }
    });
  }
});

// eslint-disable-next-line no-unused-vars
function deleteCommentConfirm(commentId, isReply) {
  confirmDialog.innerHTML = `<h1>Delete this Comment</h1>` +
  `<p>Are you sure you want to delete this comment? ` +
  `If you say 'yes', the contents of this comment will be ` +
  `permanently deleted. However, others can still reply to it.</p>` +
  `<button class="inline confirm-btn" ` +
  `onclick="deleteComment('${commentId}', ${isReply})">` +
  `Yes <span class="confirm-thumbsup">👍</span></button>` +
  `<button class="inline" onclick="closeConfirmDialog()">No 👎</button>` +
  `<div class="msg error hide" id="confirm-error"></div>`;
  confirmDialog.showModal();
}

// eslint-disable-next-line no-unused-vars
async function deleteComment(commentId, isReply = true) {
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
      if (isReply) {
        replyCount--;
        closeConfirmDialog();
        const commentElement = document.
            querySelector(`[data-id="${commentId}"]`);
        commentElement.firstChild.nextSibling.textContent =
          'This comment was deleted.';
        commentElement.lastChild.lastChild.previousSibling.remove();
        commentElement.lastChild.lastChild.previousSibling.remove();
        commentCount.textContent = replyCount == 1 ?
          '1 Reply' : `${replyCount} Replies`;
      } else {
        parentText.textContent = 'This comment was deleted';
        deleteBtn.classList.add('hide');
        closeConfirmDialog();
      }
    }
  });
}

upvoteBtn.addEventListener('click', async () => {
  const upvoted = upvoteBtn.dataset.upvoted;
  upvoteBtn.disabled = true;
  const upvoteIcon = document.querySelector('.submit-icon#idea-upvote-icon');
  upvoteIcon.style.animationName = 'loading';

  fetch(`/${upvoted == 'true' ? 'downvote' : 'upvote'}/comment/${commentId}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }).then((res) => res.json()).then((data) => {
    if (data.error) {
      console.log(data);
      window.location.reload();
    } else {
      upvoteBtn.disabled = false;
      upvoteIcon.style.animationName = 'none';
      upvoteBtn.dataset.upvoted = upvoted == 'true' ? false : true;
      if (upvoted == 'true') {
        upvoteText.textContent = 'Upvote';
        upvoteCount.textContent = Number(upvoteCount.textContent) - 1;
        upvoteBtn.classList.remove('dark-btn');
        upvoteBtn.classList.add('light-btn');
      } else {
        upvoteText.textContent = 'Upvoted';
        upvoteCount.textContent = Number(upvoteCount.textContent) + 1;
        upvoteBtn.classList.remove('light-btn');
        upvoteBtn.classList.add('dark-btn');
      }
    }
  });
});

// eslint-disable-next-line no-unused-vars
async function upvoteComment(e) {
  console.log(e);
  let commentUpvoteBtn = e.target;
  if (e.target.localName !== 'button') {
    commentUpvoteBtn = e.target.parentElement;
  }
  const icon = commentUpvoteBtn.lastChild;
  const commentUpvoteCount = icon.previousElementSibling;
  const upvoteNumber = Number(commentUpvoteCount.textContent);
  const text = commentUpvoteBtn.firstChild;
  const replyId = commentUpvoteBtn.parentElement.parentElement.dataset.id;
  const upvoted = commentUpvoteBtn.classList.contains('dark-btn') ?
    true : false;

  commentUpvoteBtn.disabled = true;
  icon.style.animationName = 'loading';

  fetch(`/${upvoted ? 'downvote' : 'upvote'}/comment/${replyId}`, {
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
        commentUpvoteCount.textContent = upvoteNumber - 1;
        text.textContent = 'Upvote ';
        commentUpvoteBtn.classList.remove('dark-btn');
        commentUpvoteBtn.classList.add('light-btn');
      } else {
        text.textContent = 'Upvoted ';
        commentUpvoteCount.textContent = upvoteNumber + 1;
        commentUpvoteBtn.classList.add('dark-btn');
        commentUpvoteBtn.classList.remove('light-btn');
      }
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
