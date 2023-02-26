if (localStorage.getItem('token')) {
  window.location.replace('just-an-idea');
}

const params = new URLSearchParams(window.location.search);
const redirect = params.get('redirect');

const loginBox = document.querySelector('.login-box');
const form = document.querySelector('form');
const emailInput = document.querySelector('.email-input');
const submitButton = document.querySelector('button');
const submitIcon = document.querySelector('.submit-icon');

const codeInput = document.createElement('input');
codeInput.setAttribute('type', 'text');
codeInput.setAttribute('inputmode', 'numeric');
codeInput.setAttribute('placeholder', 'Magic Code');
codeInput.className = 'code-input';
codeInput.setAttribute('required', '');

const errorCodes = {
  'account-invalid': 'An account with this email does not exist.',
  'account-exists': 'An account with this email already exists.',
  'invalid-email': 'This is an invalid email.',
  'invalid-code': 'The code is invalid.',
  'invalid-identifier': 'Credentials don\'t match. Please try again.',
  'expired': 'Your code has expired. Resend the email and try again.',
};

document.querySelector('#signup-link')
    .setAttribute('href', '/signup' + window.location.search);

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
      },
      body: JSON.stringify({
        email: emailInput.value,
        type: 'login',
      }),
    })
        .then((res) => res.json())
        .then((data) => {
          submitIcon.style.animationName = 'none';
          emailInput.disabled = false;
          submitButton.disabled = false;
          if (data.error) {
            let errorMessage = 'Something wen\'t wrong. Please try again.';
            if (errorCodes[data.error]) {
              errorMessage = errorCodes[data.error];
            }
            if (!document.querySelector('.msg')) {
              const errorElement = document.createElement('p');
              const textNode = document.createTextNode(errorMessage);
              errorElement.appendChild(textNode);
              errorElement.className = 'error msg';
              errorElement.onclick = (e) => {
                e.target.remove();
              };
              loginBox.appendChild(errorElement);
            } else {
              const errorMessage = document.querySelector('.msg');
              errorMessage.textContent = errorMessage;
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
      },
      body: JSON.stringify({
        code: codeInput.value,
        identifier,
        email,
        type: 'login',
      }),
    }).then((res) => res.json())
        .then((data) => {
          submitIcon.style.animationName = 'none';
          emailInput.disabled = false;
          submitButton.disabled = false;
          if (data.error) {
            let errorMessage = 'Something wen\'t wrong. Please try again.';
            if (errorCodes[data.error]) {
              errorMessage = errorCodes[data.error];
            }
            if (!document.querySelector('.msg')) {
              const errorElement = document.createElement('p');
              const textNode = document.createTextNode(errorMessage);
              errorElement.appendChild(textNode);
              errorElement.className = 'error msg';
              errorElement.onclick = (e) => {
                e.target.remove();
              };
              loginBox.appendChild(errorElement);
            } else {
              const errorMessage = document.querySelector('.msg');
              errorMessage.textContent = errorMessage;
              errorMessage.className = 'msg error';
            }
          } else {
            localStorage.clear();
            localStorage.setItem('token', data.token);
            if (redirect) {
              window.location.replace(redirect);
            } else {
              window.location.replace('just-an-idea');
            }
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
    },
    body: JSON.stringify({
      email: emailInput.value,
      type: 'login',
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
            loginBox.appendChild(errorElement);
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
            loginBox.appendChild(successElement);
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
