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
document.getElementById('sidebar-mount').innerHTML = buildSidebar('artpieces');
initTopbar();

const PAGE_SIZE = 20;
let page = 0,
    total = 0,
    search = '';
let stationOptions = [];

document.getElementById('page-title').innerHTML = `${SVG.art} Art Pieces`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Art Piece`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

const searchWrap = document.getElementById('search-wrap');
searchWrap.innerHTML = `${SVG.search}<input id="search-input" placeholder="Search title, artist…" />`;
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
    <th>Title</th>
    <th>Station</th>
    <th>Type</th>
    <th>Artists</th>
    <th>Location</th>
    <th>Actions</th>
  </tr>
`;

async function loadStations() {
    try {
        const data = await apiFetch('/api/db/stations?limit=500');
        stationOptions = (data.rows || []).map(s => ({
            uid: s.uid,
            name: s.name_en
        }));
    } catch {
        stationOptions = [];
    }
}

async function loadTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="6">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            search
        });
        const data = await apiFetch(`/api/db/artpieces?${qs}`);
        total = data.total || 0;
        renderTable(data.rows || []);
        renderPagination();
    } catch (err) {
        toast(err.message, 'error');
        tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Failed to load.</td></tr>`;
    }
}

function renderTable(rows) {
    const tbody = document.getElementById('tbody');
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${SVG.art}<p>No art pieces</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${truncate(r.title, 30)}</strong><div style="font-size:12px;color:var(--text-muted)">${truncate(r.description, 40)}</div></td>
      <td>${truncate(r.station_name || '—', 24)}</td>
      <td><span class="badge badge-blue">${r.type}</span></td>
      <td>${renderArray(r.artists)}</td>
      <td>${truncate(r.location, 28)}</td>
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
    const stationSel = stationOptions.map(s =>
        `<option value="${s.uid}" ${row?.station === s.uid ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    mount.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" style="max-width:540px">
        <div class="modal-header">
          <span class="modal-title">${SVG.art} ${isEdit ? 'Edit' : 'New'} Art Piece</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Station</label>
            <select class="form-select" id="f-station">
              <option value="">No station…</option>
              ${stationSel}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input class="form-input" id="f-title" value="${row?.title || ''}" placeholder="Artwork title" required />
            </div>
            <div class="form-group">
              <label class="form-label">Type *</label>
              <select class="form-select" id="f-type">
                <option value="mural"     ${row?.type === 'mural'     ? 'selected' : ''}>Mural</option>
                <option value="painting"  ${row?.type === 'painting'  ? 'selected' : ''}>Painting</option>
                <option value="sculpture" ${row?.type === 'sculpture' ? 'selected' : ''}>Sculpture</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description *</label>
            <textarea class="form-textarea" id="f-description" placeholder="Brief description…">${row?.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Location *</label>
            <input class="form-input" id="f-location" value="${row?.location || ''}" placeholder="Near Exit A" />
          </div>
          <div class="form-group">
            <label class="form-label">Artists</label>
            <div class="tags-input-wrap" id="tags-artists"></div>
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
    const tagsArtists = createTagsInput(document.getElementById('tags-artists'), row?.artists || []);

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
        const title = document.getElementById('f-title').value.trim();
        const description = document.getElementById('f-description').value.trim();
        const location = document.getElementById('f-location').value.trim();
        if (!title || !description || !location) {
            toast('Fill all required fields.', 'error');
            return;
        }

        const payload = {
            station: document.getElementById('f-station').value || null,
            title,
            description,
            location,
            type: document.getElementById('f-type').value,
            artists: tagsArtists.getTags(),
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Saving…`;
        try {
            if (isEdit) {
                await apiFetch(`/api/db/artpieces?id=${row.uid}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }, true);
                toast('Art piece updated.', 'success');
            } else {
                await apiFetch('/api/db/artpieces', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, true);
                toast('Art piece created.', 'success');
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
    const ok = await confirmDialog('Delete this art piece?');
    if (!ok) return;
    try {
        await apiFetch(`/api/db/artpieces?id=${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Art piece deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadStations().then(loadTable);