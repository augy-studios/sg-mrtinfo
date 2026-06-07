import {
    loadTheme,
    toast
} from './shared/shared.js';
import {
    SVG
} from './shared/svgs.js';

loadTheme();

// Redirect if already logged in
(async () => {
    try {
        const res = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        if (res.ok) window.location.href = '/dashboard.html';
    } catch {
        /* not logged in */ }
})();

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
        showError('Please fill in all fields.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${SVG.loader} Signing in…`;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username,
                password
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || 'Login failed.');
            return;
        }

        window.location.href = '/dashboard.html';
    } catch {
        showError('Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
});

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

// Enter key support (already handled by form submit, but ensure focus behaviour)
userEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') passEl.focus();
});