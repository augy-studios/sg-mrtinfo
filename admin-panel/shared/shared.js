import {
    SVG
} from './svgs.js';

// ── Theme
const THEMES = [{
        id: 'classic',
        label: 'Classic',
        color: '#ccffcc'
    },
    {
        id: 'notgreen1',
        label: 'Not green 1',
        color: '#ffcccc'
    },
    {
        id: 'notgreen2',
        label: 'Not green 2',
        color: '#ccccff'
    },
    {
        id: 'notgreen3',
        label: 'Not green 3',
        color: '#ffffcc'
    },
    {
        id: 'notgreen4',
        label: 'Not green 4',
        color: '#ffccff'
    },
    {
        id: 'notgreen5',
        label: 'Not green 5',
        color: '#ccffff'
    },
    {
        id: 'white',
        label: 'Barely green',
        color: '#ffffff'
    },
];

export function loadTheme() {
    const saved = localStorage.getItem('mrtinfo-theme') || 'classic';
    applyTheme(saved);
    return saved;
}

export function applyTheme(id) {
    document.documentElement.dataset.theme = id === 'classic' ? '' : id;
    localStorage.setItem('mrtinfo-theme', id);
}

export function openThemePicker() {
    const current = localStorage.getItem('mrtinfo-theme') || 'classic';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
    <div class="modal modal-white" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${SVG.palette} Choose Theme</span>
        <button class="icon-btn" id="close-theme">${SVG.close}</button>
      </div>
      <div class="modal-body">
        <div class="theme-grid">
          ${THEMES.map(t => `
            <div class="theme-swatch ${t.id === current ? 'active' : ''}" data-id="${t.id}">
              <div class="swatch-dot" style="background:${t.color}"></div>
              <span>${t.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.querySelectorAll('.theme-swatch').forEach(s => {
        s.addEventListener('click', () => {
            applyTheme(s.dataset.id);
            overlay.querySelectorAll('.theme-swatch').forEach(x => x.classList.remove('active'));
            s.classList.add('active');
        });
    });

    const close = () => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('#close-theme').addEventListener('click', close);
    overlay.addEventListener('click', e => {
        if (e.target === overlay) close();
    });
}

// ── Toast
let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function toast(msg, type = 'info', duration = 3200) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? SVG.check : type === 'error' ? SVG.warning : SVG.info;
    el.innerHTML = `${icon}<span>${msg}</span>`;
    getToastContainer().appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'opacity 0.2s, transform 0.2s';
        setTimeout(() => el.remove(), 220);
    }, duration);
}

// ── API Key Storage
const API_KEY_SESSION = 'mrtinfo-apikey';

export function getStoredApiKey() {
    return sessionStorage.getItem(API_KEY_SESSION) || '';
}
export function setStoredApiKey(k) {
    sessionStorage.setItem(API_KEY_SESSION, k);
}
export function clearStoredApiKey() {
    sessionStorage.removeItem(API_KEY_SESSION);
}

export function promptApiKey() {
    return new Promise(resolve => {
        const existing = getStoredApiKey();
        if (existing) {
            resolve(existing);
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal modal-white" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">${SVG.key} API Key Required</span>
        </div>
        <div class="modal-body">
          <p style="font-size:14px;color:var(--text-muted);margin-bottom:14px">
            Enter your MRT Info API key to authorise this operation.
          </p>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <div class="form-input-wrap">
              <input type="password" class="form-input" id="apikey-input"
                placeholder="Enter API key…" autocomplete="current-password" />
              <button class="form-input-icon" id="toggle-apikey" type="button">${SVG.eye}</button>
            </div>
            <p class="form-hint">Key will be remembered for this session only.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="cancel-apikey">Cancel</button>
          <button class="icon-btn primary" id="confirm-apikey">${SVG.check} Confirm</button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const input = overlay.querySelector('#apikey-input');
        const toggle = overlay.querySelector('#toggle-apikey');
        const confirm = overlay.querySelector('#confirm-apikey');
        const cancel = overlay.querySelector('#cancel-apikey');

        input.focus();

        toggle.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            toggle.innerHTML = isHidden ? SVG.eyeOff : SVG.eye;
        });

        const close = (val) => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 200);
            resolve(val || null);
        };

        confirm.addEventListener('click', () => {
            const k = input.value.trim();
            if (!k) {
                input.focus();
                return;
            }
            setStoredApiKey(k);
            close(k);
        });

        cancel.addEventListener('click', () => close(null));

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') confirm.click();
            if (e.key === 'Escape') cancel.click();
        });
    });
}

// ── API Fetch
export async function apiFetch(url, opts = {}, requireKey = false) {
    const headers = {
        'Content-Type': 'application/json',
        ...(opts.headers || {})
    };
    if (requireKey) {
        const key = await promptApiKey();
        if (!key) throw new Error('API key not provided');
        headers['x-api-key'] = key;
    }
    const res = await fetch(url, {
        ...opts,
        headers,
        credentials: 'include'
    });
    if (res.status === 401) {
        clearStoredApiKey();
        window.location.href = '/index.html';
        throw new Error('Unauthorised');
    }
    if (res.status === 403) {
        clearStoredApiKey();
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Forbidden');
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
}

// ── Confirm Modal
export function confirm(msg, sub = '') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal modal-white" style="max-width:380px">
        <div class="modal-header">
          <span class="modal-title">${SVG.warning} Confirm</span>
        </div>
        <div class="modal-body">
          <p class="confirm-msg">${msg}</p>
          ${sub ? `<p class="confirm-sub">${sub}</p>` : ''}
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="no">Cancel</button>
          <button class="icon-btn danger" id="yes">${SVG.trash} Delete</button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const close = (val) => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 200);
            resolve(val);
        };
        overlay.querySelector('#yes').addEventListener('click', () => close(true));
        overlay.querySelector('#no').addEventListener('click', () => close(false));
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close(false);
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') {
                close(false);
                document.removeEventListener('keydown', esc);
            }
        });
    });
}

// ── Topbar
export function buildTopbar(username = '') {
    return `
    <nav class="topbar">
      <button class="icon-btn hamburger-btn" id="hamburger-btn" aria-label="Toggle sidebar">${SVG.hamburger}</button>
      <a class="topbar-brand" href="/dashboard.html">
        <span class="brand-dot"></span>
        MRT Info Admin
      </a>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions">
        ${username ? `<span class="btn-text" style="font-size:13px;color:var(--text-muted);white-space:nowrap">${username}</span>` : ''}
        <a class="icon-btn" href="https://donate.stripe.com/28o2akeAr3hv0DK6oo" target="_blank" rel="noopener">
          ${SVG.coffee} <span class="btn-text">Buy Augy a Coffee</span>
        </a>
        <button class="icon-btn" id="theme-btn">${SVG.palette} <span class="btn-text">Theme</span></button>
        <button class="icon-btn" id="logout-btn">${SVG.logout} <span class="btn-text">Logout</span></button>
      </div>
    </nav>
  `;
}

export function buildSidebar(activePage = '') {
    const links = [{
            href: '/pages/stations.html',
            icon: SVG.station,
            label: 'Stations',
            id: 'stations'
        },
        {
            href: '/pages/platforms.html',
            icon: SVG.platform,
            label: 'Platforms',
            id: 'platforms'
        },
        {
            href: '/pages/facilities.html',
            icon: SVG.facility,
            label: 'Facilities',
            id: 'facilities'
        },
        {
            href: '/pages/artpieces.html',
            icon: SVG.art,
            label: 'Art Pieces',
            id: 'artpieces'
        },
        {
            href: '/pages/transfers.html',
            icon: SVG.transfer,
            label: 'Transfers',
            id: 'transfers'
        },
        {
            href: '/pages/apikeys.html',
            icon: SVG.key,
            label: 'API Keys',
            id: 'apikeys'
        },
    ];
    return `
    <aside class="sidebar">
      <span class="sidebar-label">Tables</span>
      ${links.map(l => `
        <a href="${l.href}" class="sidebar-link ${activePage === l.id ? 'active' : ''}">
          ${l.icon} ${l.label}
        </a>
      `).join('')}
    </aside>
  `;
}

export function initTopbar() {
    loadTheme();
    document.querySelector('#theme-btn')?.addEventListener('click', openThemePicker);
    document.querySelector('#logout-btn')?.addEventListener('click', async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        clearStoredApiKey();
        window.location.href = '/index.html';
    });

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function openSidebar() {
        document.querySelector('.sidebar')?.classList.add('open');
        overlay.classList.add('open');
    }

    function closeSidebar() {
        document.querySelector('.sidebar')?.classList.remove('open');
        overlay.classList.remove('open');
    }

    document.querySelector('#hamburger-btn')?.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar?.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener('click', closeSidebar);

    apiFetch('/api/auth/me').then(user => {
        if (!user.is_admin) {
            document.querySelector('a.sidebar-link[href="/pages/apikeys.html"]')?.remove();
        }
    }).catch(() => {});
}

// ── Table Helpers
export function renderBool(val) {
    return val ?
        `<span class="badge badge-green">${SVG.check} Yes</span>` :
        `<span class="badge badge-gray">No</span>`;
}

export function renderArray(arr) {
    if (!arr || arr.length === 0) return '<span style="color:var(--text-muted);font-size:12px">—</span>';
    return arr.slice(0, 4).map(v =>
        `<span class="badge badge-blue" style="margin:1px">${v}</span>`
    ).join('') + (arr.length > 4 ? `<span class="badge badge-gray">+${arr.length - 4}</span>` : '');
}

export function truncate(str, n = 40) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
}

// ── Tags Input
export function createTagsInput(container, initial = []) {
    let tags = [...initial];

    function render() {
        container.innerHTML = tags.map((t, i) => `
      <span class="tag-chip">
        ${t}
        <button type="button" data-i="${i}" aria-label="remove">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>
    `).join('') + `<input class="tags-input-bare" placeholder="Add, press Enter…" />`;

        container.querySelectorAll('.tag-chip button').forEach(btn => {
            btn.addEventListener('click', () => {
                tags.splice(Number(btn.dataset.i), 1);
                render();
            });
        });

        const inp = container.querySelector('.tags-input-bare');
        inp.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
                e.preventDefault();
                const val = inp.value.trim().replace(/,$/, '');
                if (val && !tags.includes(val)) {
                    tags.push(val);
                    render();
                } else inp.value = '';
            }
            if (e.key === 'Backspace' && !inp.value && tags.length) {
                tags.pop();
                render();
            }
        });
        container.addEventListener('click', () => container.querySelector('.tags-input-bare')?.focus());
    }

    render();
    return {
        getTags: () => [...tags],
        setTags: (t) => {
            tags = [...t];
            render();
        },
    };
}