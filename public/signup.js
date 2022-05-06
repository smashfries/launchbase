const loginBox = document.querySelector('.login-box')
const form = document.querySelector('form')
const emailInput = document.querySelector('.email-input')
const submitButton = document.querySelector('button')
const submitIcon = document.querySelector('.submit-icon')

const codeInput = document.createElement('input')
codeInput.setAttribute('type', 'text')
codeInput.setAttribute('placeholder', 'Magic Code')
codeInput.className = 'code-input'
codeInput.setAttribute('required', '')

const errorCodes = {
    'account-invalid': 'An account with this email does not exist.',
    'account-exists': 'An account with this email already exists.',
    'invalid-email': 'This is an invalid email.',
    'invalid-code': 'The code is invalid.',
    'invalid-identifier': 'Credentials don\'t match. Please try again.',
    'expired': 'Your code has expired. Resend the email and try again.'
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
        return;
    }
    submitIcon.style.animationName = 'loading'
    emailInput.disabled = true;
    submitButton.disabled = true;
    // Verify email step
    if (form.dataset.step == 'verify-email') {
        fetch('http://localhost:5000/send-email-verification', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value,
                type: 'signup'
            })
        })
        .then(res => res.json())
        .then(data => {
            submitIcon.style.animationName = 'none';
            emailInput.disabled = false;
            submitButton.disabled = false;
            if (data.error) {
                if (!document.querySelector('.msg')) {
                    const errorMessage = errorCodes[data.error]
                    const errorElement = document.createElement('p')
                    const textNode = document.createTextNode(errorMessage)
                    errorElement.appendChild(textNode)
                    errorElement.className = 'error msg'
                    errorElement.onclick = (e) => {
                        e.target.remove()
                    }
                    loginBox.appendChild(errorElement)
                } else {
                    const errorMessage = document.querySelector('.msg')
                    errorMessage.textContent = errorCodes[data.error]
                    errorMessage.className = 'msg error'
                }
            } else {
                if (document.querySelector('.msg')) {
                    document.querySelector('.msg').remove()
                }
                console.log(data)
                const emailResendText = document.createElement('a')
                emailResendText.className = 'desc-link desc'
                emailResendText.innerHTML = `Click to resend email`
                emailResendText.style.cursor = 'pointer'
                emailResendText.onclick = sendEmailVerification;
                emailInput.insertAdjacentElement('afterend', emailResendText)
                emailResendText.insertAdjacentElement('afterend', codeInput)
                setLocalStorage([{key: 'email', value: emailInput.value}, {key: 'deviceIdentifier', value: data.deviceIdentifier}])
                form.dataset.step = 'code'
            }
        })
    } 
    // Enter verification code
    else {
        const identifier = localStorage.getItem('deviceIdentifier');
        const email = localStorage.getItem('email');
        if (!identifier || !email) {
            location.reload()
        }
        fetch('http://localhost:5000/verify-code', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: codeInput.value,
                identifier,
                email,
                type: 'signup'
            })
        }).then(res => res.json())
        .then(data => {
            submitIcon.style.animationName = 'none';
            emailInput.disabled = false;
            submitButton.disabled = false;
            if (data.error) {
                if (!document.querySelector('.msg')) {
                    const errorMessage = errorCodes[data.error]
                    const errorElement = document.createElement('p')
                    const textNode = document.createTextNode(errorMessage)
                    errorElement.appendChild(textNode)
                    errorElement.className = 'error msg'
                    errorElement.onclick = (e) => {
                        e.target.remove()
                    }
                    loginBox.appendChild(errorElement)
                } else {
                    const errorMessage = document.querySelector('.msg')
                    errorMessage.textContent = errorCodes[data.error]
                    errorMessage.className = 'msg error'
                }
            } else {      
                localStorage.clear()
                localStorage.setItem('token', data.token)
            }
        })
    }
})

function sendEmailVerification() {
    if (!emailInput.checkValidity()) {
        return;
    }
    submitIcon.style.animationName = 'loading'
    emailInput.disabled = true;
    submitButton.disabled = true;
    fetch('http://localhost:5000/send-email-verification', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value,
                type: 'signup'
            })
        })
        .then(res => res.json())
        .then(data => {
            submitIcon.style.animationName = 'none';
            emailInput.disabled = false;
            submitButton.disabled = false;
            if (data.error) {
                if (!document.querySelector('.msg')) {
                    const errorMessage = errorCodes[data.error]
                    const errorElement = document.createElement('p')
                    const textNode = document.createTextNode(errorMessage)
                    errorElement.appendChild(textNode)
                    errorElement.className = 'error msg'
                    errorElement.onclick = (e) => {
                        e.target.remove()
                    }
                    loginBox.appendChild(errorElement)
                } else {
                    const errorMessage = document.querySelector('.msg')
                    errorMessage.textContent = errorCodes[data.error]
                    errorMessage.className = 'error msg'
                }
            } else {
                if (!document.querySelector('.msg')) {
                    const successMessage = 'Email was resent.'
                    const successElement = document.createElement('p')
                    const textNode = document.createTextNode(successMessage)
                    successElement.appendChild(textNode)
                    successElement.className = 'success msg'
                    successElement.onclick = (e) => {
                        e.target.remove()
                    }
                    loginBox.appendChild(successElement)
                } else {
                    const successElement = document.querySelector('.msg')
                    successElement.textContent = 'Email was resent.'
                    successElement.className = 'success msg'
                }
                setLocalStorage([{key: 'email', value: emailInput.value}, {key: 'deviceIdentifier', value: data.deviceIdentifier}])
                form.dataset.step = 'code'
            }
        })
}

function setLocalStorage(data) {
    data.forEach((i) => {
        localStorage.setItem(i.key, i.value)
    })
}