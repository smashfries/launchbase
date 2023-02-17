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

const form = document.querySelector('form');
const emailInput = document.querySelector('.email-input');
const submitButton = document.querySelector('button');
const submitIcon = document.querySelector('.submit-icon');

const codeInput = document.createElement('input');
codeInput.setAttribute('type', 'text');
codeInput.setAttribute('placeholder', 'Magic Code');
codeInput.className = 'code-input';
codeInput.setAttribute('required', '');

const errorCodes = {
  'account-exists': 'An account with this email already exists.',
  'same email was provided': 'Your account already has this email',
  'invalid-email': 'This is an invalid email.',
  'invalid-code': 'The code is invalid.',
  'invalid-identifier': 'Credentials don\'t match. Please try again.',
  'expired': 'Your code has expired. Resend the email and try again.',
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    return;
  }
  submitIcon.style.animationName = 'loading';
  emailInput.disabled = true;
  submitButton.disabled = true;
  // Verify email step
  if (form.dataset.step == 'verify-email') {
    fetch('/send-email-verification', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: emailInput.value,
        type: 'changeBackup',
      }),
    })
        .then((res) => res.json())
        .then((data) => {
          submitIcon.style.animationName = 'none';
          emailInput.disabled = false;
          submitButton.disabled = false;
          if (data.error) {
            if (!document.querySelector('.msg')) {
              const errorMessage = errorCodes[data.error];
              const errorElement = document.createElement('p');
              const textNode = document.createTextNode(errorMessage);
              errorElement.appendChild(textNode);
              errorElement.className = 'error msg';
              errorElement.onclick = (e) => {
                e.target.remove();
              };
              document.querySelector('.settings-content')
                  .appendChild(errorElement);
            } else {
              const errorMessage = document.querySelector('.msg');
              errorMessage.textContent = errorCodes[data.error];
              errorMessage.className = 'msg error';
            }
          } else {
            if (document.querySelector('.msg')) {
              document.querySelector('.msg').remove();
            }
            const emailResendText = document.createElement('a');
            emailResendText.className = 'desc-link desc';
            emailResendText.innerHTML = `Click to resend email`;
            emailResendText.style.cursor = 'pointer';
            emailResendText.onclick = sendEmailVerification;
            emailInput.insertAdjacentElement('afterend', emailResendText);
            emailResendText.insertAdjacentElement('afterend', codeInput);
            setLocalStorage([{key: 'email', value: emailInput.value},
              {key: 'deviceIdentifier', value: data.deviceIdentifier}]);
            form.dataset.step = 'code';
          }
        });
  } else {
    const identifier = localStorage.getItem('deviceIdentifier');
    const email = localStorage.getItem('email');
    if (!identifier || !email) {
      location.reload();
    }
    fetch('/verify-code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: codeInput.value,
        identifier,
        email,
        type: 'changeBackup',
      }),
    }).then((res) => res.json())
        .then((data) => {
          submitIcon.style.animationName = 'none';
          emailInput.disabled = false;
          submitButton.disabled = false;
          if (data.error) {
            if (!document.querySelector('.msg')) {
              const errorMessage = errorCodes[data.error];
              const errorElement = document.createElement('p');
              const textNode = document.createTextNode(errorMessage);
              errorElement.appendChild(textNode);
              errorElement.className = 'error msg';
              errorElement.onclick = (e) => {
                e.target.remove();
              };
              document.querySelector('.settings-content')
                  .appendChild(errorElement);
            } else {
              const errorMessage = document.querySelector('.msg');
              errorMessage.textContent = errorCodes[data.error];
              errorMessage.className = 'msg error';
            }
          } else {
            window.location.replace('/backstage/email');
          }
        });
  }
});

/**
 * Send email verification
 */
function sendEmailVerification() {
  if (!emailInput.checkValidity()) {
    return;
  }
  submitIcon.style.animationName = 'loading';
  emailInput.disabled = true;
  submitButton.disabled = true;
  fetch('/send-email-verification', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: emailInput.value,
      type: 'changeBackup',
    }),
  })
      .then((res) => res.json())
      .then((data) => {
        submitIcon.style.animationName = 'none';
        emailInput.disabled = false;
        submitButton.disabled = false;
        if (data.error) {
          if (!document.querySelector('.msg')) {
            const errorMessage = errorCodes[data.error];
            const errorElement = document.createElement('p');
            const textNode = document.createTextNode(errorMessage);
            errorElement.appendChild(textNode);
            errorElement.className = 'error msg';
            errorElement.onclick = (e) => {
              e.target.remove();
            };
            document.querySelector('.settings-content')
                .appendChild(errorElement);
          } else {
            const errorMessage = document.querySelector('.msg');
            errorMessage.textContent = errorCodes[data.error];
            errorMessage.className = 'error msg';
          }
        } else {
          if (!document.querySelector('.msg')) {
            const successMessage = 'Email was resent.';
            const successElement = document.createElement('p');
            const textNode = document.createTextNode(successMessage);
            successElement.appendChild(textNode);
            successElement.className = 'success msg';
            successElement.onclick = (e) => {
              e.target.remove();
            };
            document.querySelector('.settings-content')
                .appendChild(successElement);
          } else {
            const successElement = document.querySelector('.msg');
            successElement.textContent = 'Email was resent.';
            successElement.className = 'success msg';
          }
          setLocalStorage([{key: 'email', value: emailInput.value},
            {key: 'deviceIdentifier', value: data.deviceIdentifier}]);
          form.dataset.step = 'code';
        }
      });
}

/**
 * Set array of data in local storage
 * @param {Array} data array of data that will be set in local storage
 */
function setLocalStorage(data) {
  data.forEach((i) => {
    localStorage.setItem(i.key, i.value);
  });
}

const pfpDropdown = document.querySelector('#pfp-dropdown');
const pfpElement = document.querySelector('.pfp-container');
const logoutBtn = document.querySelector('#logout-btn');
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

