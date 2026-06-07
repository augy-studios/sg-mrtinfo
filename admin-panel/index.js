import {
    loadTheme,
} from './shared/shared.js';
import {
    SVG
} from './shared/svgs.js';

loadTheme();

// redirect if logged in
(async () => {
    try {
        const res = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        if (res.ok) window.location.href = '/dashboard.html';
    } catch {
        /* not logged in */
    }
})();

// ── View switching
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const successView = document.getElementById('success-view');

function showView(view) {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    successView.style.display = 'none';
    view.style.display = '';
}

document.getElementById('show-register').addEventListener('click', () => showView(registerView));
document.getElementById('show-login').addEventListener('click', () => showView(loginView));
document.getElementById('back-to-login').addEventListener('click', () => showView(loginView));

// ── Login
const form = document.getElementById('login-form');
const userEl = document.getElementById('username');
const passEl = document.getElementById('password');
const togglePw = document.getElementById('toggle-pw');
const errorEl = document.getElementById('login-error');
const submitBtn = document.getElementById('submit-btn');

togglePw.innerHTML = SVG.eye;
let pwVisible = false;
togglePw.addEventListener('click', () => {
    pwVisible = !pwVisible;
    passEl.type = pwVisible ? 'text' : 'password';
    togglePw.innerHTML = pwVisible ? SVG.eyeOff : SVG.eye;
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const username = userEl.value.trim();
    const password = passEl.value;
    if (!username || !password) {
        showLoginError('Please fill in all fields.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${SVG.loader} Signing in…`;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            showLoginError(data.error || 'Login failed.');
            return;
        }

        window.location.href = '/dashboard.html';
    } catch {
        showLoginError('Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
});

function showLoginError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

userEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') passEl.focus();
});

// ── Register
const registerForm = document.getElementById('register-form');
const regUsernameEl = document.getElementById('reg-username');
const regEmailEl = document.getElementById('reg-email');
const regDisplayEl = document.getElementById('reg-display-name');
const regPassEl = document.getElementById('reg-password');
const regConfirmEl = document.getElementById('reg-confirm');
const toggleRegPw = document.getElementById('toggle-reg-pw');
const toggleRegConfirm = document.getElementById('toggle-reg-confirm');
const registerErrorEl = document.getElementById('register-error');
const registerBtn = document.getElementById('register-btn');

toggleRegPw.innerHTML = SVG.eye;
let regPwVisible = false;
toggleRegPw.addEventListener('click', () => {
    regPwVisible = !regPwVisible;
    regPassEl.type = regPwVisible ? 'text' : 'password';
    toggleRegPw.innerHTML = regPwVisible ? SVG.eyeOff : SVG.eye;
});

toggleRegConfirm.innerHTML = SVG.eye;
let regConfirmVisible = false;
toggleRegConfirm.addEventListener('click', () => {
    regConfirmVisible = !regConfirmVisible;
    regConfirmEl.type = regConfirmVisible ? 'text' : 'password';
    toggleRegConfirm.innerHTML = regConfirmVisible ? SVG.eyeOff : SVG.eye;
});

registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    registerErrorEl.style.display = 'none';

    const username = regUsernameEl.value.trim();
    const email = regEmailEl.value.trim();
    const display_name = regDisplayEl.value.trim();
    const password = regPassEl.value;
    const confirm = regConfirmEl.value;

    if (!username || !email || !password || !confirm) {
        showRegisterError('Please fill in all required fields.');
        return;
    }
    if (password !== confirm) {
        showRegisterError('Passwords do not match.');
        return;
    }
    if (password.length < 8) {
        showRegisterError('Password must be at least 8 characters.');
        return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = `${SVG.loader} Registering…`;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, display_name, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            showRegisterError(data.error || 'Registration failed.');
            return;
        }

        showView(successView);
        registerForm.reset();
    } catch {
        showRegisterError('Network error. Please try again.');
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Register';
    }
});

function showRegisterError(msg) {
    registerErrorEl.textContent = msg;
    registerErrorEl.style.display = 'block';
}
