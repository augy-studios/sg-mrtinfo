import {
    buildTopbar,
    buildSidebar,
    initTopbar,
    apiFetch,
    toast,
    renderBool,
} from '../shared/shared.js';
import {
    SVG
} from '../shared/svgs.js';

document.getElementById('topbar-mount').innerHTML = buildTopbar();
document.getElementById('sidebar-mount').innerHTML = buildSidebar('apikeys');
initTopbar();

const PAGE_SIZE = 20;
let page = 0,
    total = 0;

(async () => {
    try {
        const user = await apiFetch('/api/auth/me');
        if (!user.is_admin) {
            window.location.href = '/dashboard.html';
            return;
        }
    } catch {
        window.location.href = '/index.html';
        return;
    }
    loadTable();
})();

document.getElementById('page-title').innerHTML = `${SVG.key} API Keys`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} Generate Key`;
document.getElementById('new-btn').addEventListener('click', () => openCreateModal());

document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModal();
    }
    if (e.key === 'ArrowRight') {
        if ((page + 1) * PAGE_SIZE < total) {
            page++;
            loadTable();
        }
    }
    if (e.key === 'ArrowLeft') {
        if (page > 0) {
            page--;
            loadTable();
        }
    }
});

document.getElementById('thead').innerHTML = `
  <tr>
    <th>Name</th>
    <th>Last 8</th>
    <th>Admin</th>
    <th>Created</th>
    <th>Expires</th>
    <th>Last Used</th>
    <th>Actions</th>
  </tr>
`;

async function loadTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE
        });
        const data = await apiFetch(`/api/db/apikeys?${qs}`);
        total = data.total || 0;
        renderTable(data.rows || []);
        renderPagination();
    } catch (err) {
        toast(err.message, 'error');
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Failed to load.</td></tr>`;
    }
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-SG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderTable(rows) {
    const tbody = document.getElementById('tbody');
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${SVG.key}<p>No API keys</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
        return `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td class="td-mono">…${r.lastEight}</td>
        <td>${renderBool(r.isAdmin)}</td>
        <td>${fmtDate(r.createdAt)}</td>
        <td>${r.expiresAt
          ? `<span class="badge ${expired ? 'badge-red' : 'badge-green'}">${fmtDate(r.expiresAt)}</span>`
          : '<span class="badge badge-gray">Never</span>'
        }</td>
        <td>${fmtDate(r.lastUsed)}</td>
        <td>
          <div class="table-actions">
            <button class="icon-btn danger" data-action="revoke" data-id="${r.uid}" data-name="${r.name}" title="Revoke">${SVG.trash} Revoke</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');

    tbody.querySelectorAll('[data-action="revoke"]').forEach(btn => {
        btn.addEventListener('click', () => revokeKey(btn.dataset.id, btn.dataset.name));
    });
}

function renderPagination() {
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    document.getElementById('pagination').innerHTML = `
    <span>${total > 0 ? `${start}–${end} of ${total}` : '0 keys'}</span>
    <div class="pagination-controls">
      <button class="icon-btn" id="prev-btn" ${page === 0 ? 'disabled' : ''}>${SVG.chevronLeft}</button>
      <span>${page + 1} / ${Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
      <button class="icon-btn" id="next-btn" ${(page + 1) * PAGE_SIZE >= total ? 'disabled' : ''}>${SVG.chevronRight}</button>
    </div>
  `;
    document.getElementById('prev-btn').addEventListener('click', () => {
        page--;
        loadTable();
    });
    document.getElementById('next-btn').addEventListener('click', () => {
        page++;
        loadTable();
    });
}

// ── Create Modal
function openCreateModal() {
    const mount = document.getElementById('modal-mount');

    mount.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal modal-white" style="max-width:460px">
        <div class="modal-header">
          <span class="modal-title">${SVG.key} Generate API Key</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Key Name *</label>
            <input class="form-input" id="f-name" placeholder="e.g. My VPS Script" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label">Expires At</label>
            <input class="form-input" id="f-expires" type="date" />
            <p class="form-hint">Leave blank for no expiry.</p>
          </div>
          <label class="form-check" style="margin-top:4px">
            <input type="checkbox" id="cb-isAdmin" />
            Admin key (can manage users and API keys)
          </label>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label">Your Password *</label>
            <input type="password" class="form-input" id="f-password" placeholder="Enter your password to confirm" autocomplete="current-password" />
            <p class="form-hint">Required to authorise key generation.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="modal-cancel">Cancel</button>
          <button class="icon-btn primary" id="modal-save">${SVG.key} Generate</button>
        </div>
      </div>
    </div>
  `;

    requestAnimationFrame(() => mount.querySelector('#modal-overlay').classList.add('open'));

    const close = () => {
        mount.querySelector('#modal-overlay').classList.remove('open');
        setTimeout(() => {
            mount.innerHTML = '';
        }, 200);
    };
    mount.querySelector('#modal-close').addEventListener('click', close);
    mount.querySelector('#modal-cancel').addEventListener('click', close);
    mount.querySelector('#modal-overlay').addEventListener('click', e => {
        if (e.target === mount.querySelector('#modal-overlay')) close();
    });
    const escH = e => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escH);
        }
    };
    document.addEventListener('keydown', escH);

    const nameInput = mount.querySelector('#f-name');
    nameInput.focus();

    const saveBtn = mount.querySelector('#modal-save');
    const doSave = async () => {
        const name = nameInput.value.trim();
        const expires = mount.querySelector('#f-expires').value;
        const isAdmin = mount.querySelector('#cb-isAdmin').checked;
        const password = mount.querySelector('#f-password').value;
        if (!name) {
            toast('Name is required.', 'error');
            return;
        }
        if (!password) {
            toast('Password is required.', 'error');
            mount.querySelector('#f-password').focus();
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Generating…`;
        try {
            const data = await apiFetch('/api/db/apikeys', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    isAdmin,
                    expiresAt: expires || null,
                    password,
                }),
            });

            close();
            showKeyReveal(data.key, data.name);
            loadTable();
        } catch (err) {
            toast(err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${SVG.key} Generate`;
        }
    };

    saveBtn.addEventListener('click', doSave);
    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSave();
    });
}

// ── Key Reveal Modal
function showKeyReveal(key, name) {
    const mount = document.getElementById('modal-mount');

    mount.innerHTML = `
    <div class="modal-overlay" id="reveal-overlay">
      <div class="modal modal-white" style="max-width:500px">
        <div class="modal-header">
          <span class="modal-title">${SVG.key} API Key Created</span>
        </div>
        <div class="modal-body">
          <div class="apikey-notice">
            ${SVG.warning}
            <span>Copy this key now. It will <strong>never be shown again</strong>.</span>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:6px">Key: <strong>${name}</strong></p>
          <div class="apikey-reveal" id="key-text">${key}</div>
          <button class="icon-btn" id="copy-btn" style="width:100%;justify-content:center;margin-top:4px">
            ${SVG.copy} Copy to Clipboard
          </button>
        </div>
        <div class="modal-footer">
          <button class="icon-btn primary" id="done-btn">${SVG.check} I confirm that I have saved the API key safely</button>
        </div>
      </div>
    </div>
  `;

    requestAnimationFrame(() => mount.querySelector('#reveal-overlay').classList.add('open'));

    const close = () => {
        mount.querySelector('#reveal-overlay').classList.remove('open');
        setTimeout(() => {
            mount.innerHTML = '';
        }, 200);
    };

    mount.querySelector('#copy-btn').addEventListener('click', async () => {
        await navigator.clipboard.writeText(key).catch(() => {});
        mount.querySelector('#copy-btn').innerHTML = `${SVG.check} Copied!`;
        setTimeout(() => {
            mount.querySelector('#copy-btn').innerHTML = `${SVG.copy} Copy to Clipboard`;
        }, 2000);
    });

    mount.querySelector('#done-btn').addEventListener('click', close);
}

function revokeKey(uid, name) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal modal-white" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">${SVG.warning} Revoke API Key</span>
        </div>
        <div class="modal-body">
          <p class="confirm-msg">Revoke <strong>${name}</strong>?</p>
          <p class="confirm-sub">Any scripts using it will stop working immediately.</p>
          <div class="form-group" style="margin-top:14px">
            <label class="form-label">Your Password *</label>
            <input type="password" class="form-input" id="revoke-password" placeholder="Enter your password to confirm" autocomplete="current-password" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="revoke-cancel">Cancel</button>
          <button class="icon-btn danger" id="revoke-confirm">${SVG.trash} Revoke</button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const passwordInput = overlay.querySelector('#revoke-password');
        const confirmBtn = overlay.querySelector('#revoke-confirm');
        const cancelBtn = overlay.querySelector('#revoke-cancel');

        passwordInput.focus();

        const close = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 200);
            resolve();
        };

        cancelBtn.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
        });

        const doRevoke = async () => {
            const password = passwordInput.value;
            if (!password) { passwordInput.focus(); return; }
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `${SVG.loader} Revoking…`;
            try {
                await apiFetch(`/api/db/apikeys?id=${uid}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ password }),
                });
                overlay.classList.remove('open');
                setTimeout(() => overlay.remove(), 200);
                resolve();
                toast('API key revoked.', 'success');
                loadTable();
            } catch (err) {
                toast(err.message, 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `${SVG.trash} Revoke`;
            }
        };

        confirmBtn.addEventListener('click', doRevoke);
        passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doRevoke(); });
    });
}