import {
    buildTopbar,
    buildSidebar,
    initTopbar,
    apiFetch,
    toast,
    confirm as confirmDialog,
    renderArray,
    truncate,
    createTagsInput,
} from '../shared/shared.js';
import {
    SVG
} from '../shared/svgs.js';

document.getElementById('topbar-mount').innerHTML = buildTopbar();
document.getElementById('sidebar-mount').innerHTML = buildSidebar('facilities');
initTopbar();

const PAGE_SIZE = 20;
let page = 0,
    total = 0,
    search = '';
let platformOptions = [];

document.getElementById('page-title').innerHTML = `${SVG.facility} Facilities`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Facility`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

const searchWrap = document.getElementById('search-wrap');
searchWrap.innerHTML = `${SVG.search}<input id="search-input" placeholder="Search by type or towards…" />`;
const searchInput = searchWrap.querySelector('input');
searchInput.addEventListener('input', () => {
    search = searchInput.value.trim();
    page = 0;
    loadTable();
});

document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal(null);
    }
    if (e.key === '/') {
        e.preventDefault();
        searchInput.focus();
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
    <th>Platform</th>
    <th>Type</th>
    <th>Towards</th>
    <th>Doors</th>
    <th>Actions</th>
  </tr>
`;

async function loadPlatforms() {
    try {
        const data = await apiFetch('/api/db/platforms?limit=1000');
        platformOptions = (data.rows || []).map(p => ({
            uid: p.uid,
            label: `${p.code} (${p.line})`
        }));
    } catch {
        platformOptions = [];
    }
}

async function loadTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="5">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            search
        });
        const data = await apiFetch(`/api/db/facilities?${qs}`);
        total = data.total || 0;
        renderTable(data.rows || []);
        renderPagination();
    } catch (err) {
        toast(err.message, 'error');
        tbody.innerHTML = `<tr class="loading-row"><td colspan="5">Failed to load.</td></tr>`;
    }
}

function renderTable(rows) {
    const tbody = document.getElementById('tbody');
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">${SVG.facility}<p>No facilities</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="td-mono">${truncate(r.platform_code || r.platform, 20)}</td>
      <td><span class="badge badge-blue">${r.type}</span></td>
      <td>${truncate(r.towards || '—', 30)}</td>
      <td>${r.doors?.length ? r.doors.join(', ') : '—'}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" data-action="edit" data-id="${r.uid}" title="Edit">${SVG.edit}</button>
          <button class="icon-btn danger" data-action="delete" data-id="${r.uid}" title="Delete">${SVG.trash}</button>
        </div>
      </td>
    </tr>
  `).join('');

    tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openModal(rows.find(r => r.uid === btn.dataset.id)));
    });
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteRow(btn.dataset.id));
    });
}

function renderPagination() {
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    document.getElementById('pagination').innerHTML = `
    <span>${total > 0 ? `${start}–${end} of ${total}` : '0 results'}</span>
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

function openModal(row) {
    const isEdit = !!row;
    const mount = document.getElementById('modal-mount');
    const platSel = platformOptions.map(p =>
        `<option value="${p.uid}" ${row?.platform === p.uid ? 'selected' : ''}>${p.label}</option>`
    ).join('');

    mount.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title">${SVG.facility} ${isEdit ? 'Edit' : 'New'} Facility</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Platform *</label>
            <select class="form-select" id="f-platform">
              <option value="">Select platform…</option>
              ${platSel}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type *</label>
              <select class="form-select" id="f-type">
                <option value="escalator" ${row?.type === 'escalator' ? 'selected' : ''}>Escalator</option>
                <option value="lift"      ${row?.type === 'lift'      ? 'selected' : ''}>Lift</option>
                <option value="stairs"    ${row?.type === 'stairs'    ? 'selected' : ''}>Stairs</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Towards</label>
              <input class="form-input" id="f-towards" value="${row?.towards || ''}" placeholder="exit, NS-4…" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Door Numbers</label>
            <div class="tags-input-wrap" id="tags-doors"></div>
            <p class="form-hint">Enter door numbers and press Enter</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="modal-cancel">Cancel</button>
          <button class="icon-btn primary" id="modal-save">${SVG.check} ${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  `;

    requestAnimationFrame(() => mount.querySelector('#modal-overlay').classList.add('open'));
    const tagsDoors = createTagsInput(
        document.getElementById('tags-doors'),
        (row?.doors || []).map(String)
    );

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

    const saveBtn = mount.querySelector('#modal-save');
    const doSave = async () => {
        const platform = document.getElementById('f-platform').value;
        const type = document.getElementById('f-type').value;
        if (!platform) {
            toast('Platform is required.', 'error');
            return;
        }

        const payload = {
            platform,
            type,
            towards: document.getElementById('f-towards').value.trim() || null,
            doors: tagsDoors.getTags().map(Number).filter(n => !isNaN(n)),
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Saving…`;
        try {
            if (isEdit) {
                await apiFetch(`/api/db/facilities?id=${row.uid}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }, true);
                toast('Facility updated.', 'success');
            } else {
                await apiFetch('/api/db/facilities', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, true);
                toast('Facility created.', 'success');
            }
            close();
            loadTable();
        } catch (err) {
            toast(err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${SVG.check} ${isEdit ? 'Save' : 'Create'}`;
        }
    };

    saveBtn.addEventListener('click', doSave);
}

async function deleteRow(uid) {
    const ok = await confirmDialog('Delete this facility?');
    if (!ok) return;
    try {
        await apiFetch(`/api/db/facilities?id=${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Facility deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadPlatforms().then(loadTable);