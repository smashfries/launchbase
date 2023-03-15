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

const copyBtn = document.querySelector('#copy-link');

const commentDataContainer = document.querySelector('#comment-data');
const replyBox = document.querySelector('#reply-box');
const submitReplyBtn = document.querySelector('#post-comment');
const commentCount = document.querySelector('#comment-count');
const commentError = document.querySelector('#comment-error');
let replyCount = 0;

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
  commentError.classList.remove('warning');
  commentError.classList.remove('error');
  commentError.classList.add('info');
  commentError.textContent = 'Loading...';
  setPage(page + 1);
  if (page != 1) {
    previousPage.classList.remove('hide');
  }
  setupComments(page);
});

previousPage.addEventListener('click', () => {
  commentError.classList.remove('hide');
  commentError.classList.remove('warning');
  commentError.classList.remove('error');
  commentError.classList.add('info');
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

function setupComments(scrollToReply = false) {
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
    const authorDisplayName = document.createElement('span');
    authorDisplayName.textContent = commentData['author_details'].displayName;
    authorDetails.appendChild(authorDisplayName);
    const authorPageLink = document.createElement('a');
    authorPageLink.classList.add('public-member');
    authorPageLink.setAttribute('href',
        `/u/${commentData['author_details'].handle}`);
    const authorBadge = document.createElement('span');
    authorBadge.classList.add('badge');
    authorBadge.textContent = commentData['author_details'].handle;
    authorPageLink.appendChild(authorBadge);
    authorDetails.appendChild(authorPageLink);

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
      upvoteCount.textContent = upvoteFormatted + ' ';
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

      // comment header
      const commentHeader = document.createElement('p');
      commentHeader.classList.add('no-margin-top');
      const authorNick = document.createTextNode(authorDetails.nickname);
      commentHeader.appendChild(authorNick);
      const authorUrl = document.createElement('a');
      authorUrl.classList.add('public-member');
      authorUrl.setAttribute('href', `/u/${authorDetails.url}`);
      const urlBadge = document.createElement('badge');
      urlBadge.classList.add('badge');
      urlBadge.textContent = `@${authorDetails.url}`;
      authorUrl.appendChild(urlBadge);
      commentHeader.appendChild(authorUrl);

      // comment body (commentBody)

      // comment footer
      const commentFooter = document.createElement('p');
      commentFooter.classList.add('small-font', 'no-margin-bottom');
      const tmpCommentUpvoteBtn = document.createElement('button');
      tmpCommentUpvoteBtn.classList.add('mini-btn',
          reply['upvote_details'].length === 1 ? 'dark-btn' : 'light-btn');
      tmpCommentUpvoteBtn.setAttribute('onclick', 'upvoteComment(event)');
      const commentUpvoteTxt = document.createElement('span');
      commentUpvoteTxt.classList.add('upvote-text');
      commentUpvoteTxt.textContent = reply['upvote_details'].length === 1 ?
        'Upvoted ' : 'Upvote ';
      tmpCommentUpvoteBtn.appendChild(commentUpvoteTxt);
      const commentUpvoteNum = document.createElement('span');
      commentUpvoteNum.textContent = new Intl.NumberFormat('en',
          {notation: 'compact'}).format(reply.upvotes || 0) + ' ';
      tmpCommentUpvoteBtn.appendChild(commentUpvoteNum);
      const tmpUpvoteIcon = document.createElement('span');
      tmpUpvoteIcon.classList.add('submit-icon');
      tmpUpvoteIcon.textContent = '👌';
      tmpCommentUpvoteBtn.appendChild(tmpUpvoteIcon);
      commentFooter.appendChild(tmpCommentUpvoteBtn);

      const spacer = document.createTextNode(' • ');
      commentFooter.appendChild(spacer.cloneNode());

      const repliesLink = document.createElement('a');
      repliesLink.classList.add('idea-link', 'small-font');
      repliesLink.setAttribute('href', `/discuss/${reply._id}`);
      repliesLink.textContent = `${Intl.NumberFormat('en',
          {notation: 'compact'}).format(reply.replyCount || 0)} ` +
          `${reply.replyCount && reply.replyCount == 1 ? 'Reply' : 'Replies'}`;
      commentFooter.appendChild(repliesLink);

      if (payload.id === authorDetails._id && !reply.deleted) {
        commentFooter.appendChild(spacer.cloneNode());
        const commentDeleteBtn = document.createElement('button');
        commentDeleteBtn.classList.add('idea-link', 'small-font');
        commentDeleteBtn.setAttribute('onclick', 'deleteCommentConfirm(' +
          '\'' + reply._id + '\'' + ')');
        commentDeleteBtn.textContent = 'Delete';
        commentFooter.appendChild(commentDeleteBtn);
      }

      commentFooter.appendChild(spacer.cloneNode());
      const commentDate = document.createTextNode(formattedDate);
      commentFooter.appendChild(commentDate);

      container.appendChild(commentHeader);
      container.appendChild(commentBody);
      container.appendChild(commentFooter);

      commentDataContainer.appendChild(container);
    });
    if (scrollToReply) {
      window.scrollTo(0, document.body.scrollHeight);
    }
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
        parentType: 'comment',
      }),
    }).then((res) => res.json()).then((data) => {
      console.log(data);
      submitReplyBtn.textContent = 'Share a Comment';
      submitReplyBtn.disabled = false;
      if (!data.error) {
        commentError.classList.add('hide');
        replyCount++;
        commentCount.textContent = replyCount == 1 ?
          '1 Reply' : `${new Intl.NumberFormat('en', {notation: 'compact'})
              .format(replyCount)} Replies`;

        const commentPage = data.page;
        if (commentPage !== page) {
          commentError.classList.remove('hide');
          commentError.classList.replace('error', 'info');
          commentError.textContent = 'Loading...';
          setPage(commentPage);
          if (page != 1) {
            previousPage.classList.remove('hide');
          }
          setupComments(true);
        } else {
          const date = new Date();
          const formattedDate = new Intl.DateTimeFormat('en-US',
              {dateStyle: 'medium'}).format(date);
          const container = document.createElement('div');
          container.classList.add('container');
          container.classList.add('comment-item');
          container.dataset.id = data.commentId;

          // comment header
          const commentHeader = document.createElement('p');
          commentHeader.classList.add('no-margin-top');
          const authorNick = document.createTextNode(data.authorName);
          commentHeader.appendChild(authorNick);
          const authorUrl = document.createElement('a');
          authorUrl.classList.add('public-member');
          authorUrl.setAttribute('href', `/u/${data.authorHandle}`);
          const urlBadge = document.createElement('badge');
          urlBadge.classList.add('badge');
          urlBadge.textContent = `@${data.authorHandle}`;
          authorUrl.appendChild(urlBadge);
          commentHeader.appendChild(authorUrl);

          // comment body (commentBody)
          const commentBody = document.createElement('p');
          const commentFragments = replyBox.value.split('\n');
          commentFragments.forEach((fragment) => {
            const fragmentText = document.createElement('span');
            fragmentText.textContent = fragment;
            commentBody.appendChild(fragmentText);
            const lineBreak = document.createElement('br');
            commentBody.appendChild(lineBreak);
          });

          // comment footer
          const commentFooter = document.createElement('p');
          commentFooter.classList.add('small-font', 'no-margin-bottom');
          const tmpCommentUpvoteBtn = document.createElement('button');
          tmpCommentUpvoteBtn.classList.add('mini-btn', 'light-btn');
          tmpCommentUpvoteBtn.setAttribute('onclick', 'upvoteComment(event)');
          const commentUpvoteTxt = document.createElement('span');
          commentUpvoteTxt.classList.add('upvote-text');
          commentUpvoteTxt.textContent = 'Upvote ';
          tmpCommentUpvoteBtn.appendChild(commentUpvoteTxt);
          const commentUpvoteNum = document.createElement('span');
          commentUpvoteNum.textContent = '0 ';
          tmpCommentUpvoteBtn.appendChild(commentUpvoteNum);
          const tmpUpvoteIcon = document.createElement('span');
          tmpUpvoteIcon.classList.add('submit-icon');
          tmpUpvoteIcon.textContent = '👌';
          tmpCommentUpvoteBtn.appendChild(tmpUpvoteIcon);
          commentFooter.appendChild(tmpCommentUpvoteBtn);

          const spacer = document.createTextNode(' • ');
          commentFooter.appendChild(spacer.cloneNode());

          const repliesLink = document.createElement('a');
          repliesLink.classList.add('idea-link', 'small-font');
          repliesLink.setAttribute('href', `/discuss/${data.commentId}`);
          repliesLink.textContent = `0 Replies`;
          commentFooter.appendChild(repliesLink);

          commentFooter.appendChild(spacer.cloneNode());
          const commentDeleteBtn = document.createElement('button');
          commentDeleteBtn.classList.add('idea-link', 'small-font');
          commentDeleteBtn.setAttribute('onclick', 'deleteCommentConfirm(' +
            '\'' + data.commentId + '\'' + ')');
          commentDeleteBtn.textContent = 'Delete';
          commentFooter.appendChild(commentDeleteBtn);

          commentFooter.appendChild(spacer.cloneNode());
          const commentDate = document.createTextNode(formattedDate);
          commentFooter.appendChild(commentDate);

          container.appendChild(commentHeader);
          container.appendChild(commentBody);
          container.appendChild(commentFooter);

          commentDataContainer.appendChild(container);
          replyBox.value = '';
          // console.log(replyCount, commentCount);
          window.scrollTo(0, document.body.scrollHeight);
        }
      } else {
        if (data.error === 'profile incomplete') {
          commentError.classList.remove('hide');
          commentError.classList.remove('info');
          commentError.classList.remove('error');
          commentError.classList.add('warning');
          commentError.innerHTML = 'Please complete your profile before' +
            ` posting a comment. Click <u><a href="/backstage/profile?` +
            `redirect=${window.location.href}">here</a></u> to update it!`;
        } else if (data.error === 'bad-words') {
          commentError.classList.remove('hide');
          commentError.classList.remove('info');
          commentError.classList.remove('warning');
          commentError.classList.add('error');
          commentError.innerHTML = 'Profanity is strictly prohibited on ' +
            `Launch Base. Please ensure all your posts are kind and helpful ` +
            `to everyone in the community. Please refrain from further foul ` +
            `language on the platform. Thank you!`;
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
        upvoteCount.textContent = Intl.NumberFormat('en', {notation: 'compact'})
            .format(Number(upvoteCount.textContent) - 1)+ ' ';
        upvoteBtn.classList.remove('dark-btn');
        upvoteBtn.classList.add('light-btn');
      } else {
        upvoteText.textContent = 'Upvoted';
        upvoteCount.textContent = Intl.NumberFormat('en', {notation: 'compact'})
            .format(Number(upvoteCount.textContent) + 1)+ ' ';
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
        commentUpvoteCount.textContent = Intl
            .NumberFormat('en', {notation: 'compact'})
            .format(upvoteNumber - 1) + ' ';
        text.textContent = 'Upvote ';
        commentUpvoteBtn.classList.remove('dark-btn');
        commentUpvoteBtn.classList.add('light-btn');
      } else {
        text.textContent = 'Upvoted ';
        commentUpvoteCount.textContent = Intl
            .NumberFormat('en', {notation: 'compact'})
            .format(upvoteNumber + 1) + ' ';
        commentUpvoteBtn.classList.add('dark-btn');
        commentUpvoteBtn.classList.remove('light-btn');
      }
    }
  });
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyBtn.textContent = 'Copied! 📋';
  } catch (error) {
    copyBtn.textContent = 'Could not copy, sorry! 📋';
  }
  setTimeout(() => {
    copyBtn.textContent = 'Copy link to Clipboard 📋';
  }, 3000);
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
