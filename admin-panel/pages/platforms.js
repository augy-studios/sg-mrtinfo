import {
    buildTopbar,
    buildSidebar,
    initTopbar,
    apiFetch,
    toast,
    confirm as confirmDialog,
    renderBool,
    renderArray,
    truncate,
    createTagsInput,
} from '../shared/shared.js';
import {
    SVG
} from '../shared/svgs.js';

document.getElementById('topbar-mount').innerHTML = buildTopbar();
document.getElementById('sidebar-mount').innerHTML = buildSidebar('platforms');
initTopbar();

const PAGE_SIZE = 20;
let page = 0,
    total = 0,
    search = '';
let stationOptions = [];

document.getElementById('page-title').innerHTML = `${SVG.platform} Platforms`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Platform`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

const searchWrap = document.getElementById('search-wrap');
searchWrap.innerHTML = `${SVG.search}<input id="search-input" placeholder="Search by code or line…" />`;
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
    <th>Station</th>
    <th>Code</th>
    <th>Line</th>
    <th>Order</th>
    <th>Direction</th>
    <th>Open</th>
    <th>Actions</th>
  </tr>
`;

// station options for select
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
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            search
        });
        const data = await apiFetch(`/api/db/platforms?${qs}`);
        total = data.total || 0;
        renderTable(data.rows || []);
        renderPagination();
    } catch (err) {
        toast(err.message, 'error');
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Failed to load.</td></tr>`;
    }
}

function renderTable(rows) {
    const tbody = document.getElementById('tbody');
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${SVG.platform}<p>No platforms</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${truncate(r.station_name || r.station, 28)}</td>
      <td><span class="badge badge-blue">${r.code}</span></td>
      <td><span class="badge badge-gray">${r.line}</span></td>
      <td>${r.order}</td>
      <td class="td-mono">${truncate(r.direction, 20)}</td>
      <td>${renderBool(r.isOpen)}</td>
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
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <span class="modal-title">${SVG.platform} ${isEdit ? 'Edit' : 'New'} Platform</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Station *</label>
            <select class="form-select" id="f-station">
              <option value="">Select station…</option>
              ${stationSel}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Code *</label>
              <input class="form-input" id="f-code" value="${row?.code || ''}" placeholder="NS1" />
            </div>
            <div class="form-group">
              <label class="form-label">Line *</label>
              <input class="form-input" id="f-line" value="${row?.line || ''}" placeholder="NS" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Order *</label>
              <input class="form-input" id="f-order" type="number" value="${row?.order ?? 1}" />
            </div>
            <div class="form-group">
              <label class="form-label">Direction *</label>
              <input class="form-input" id="f-direction" value="${row?.direction || ''}" placeholder="NS-4" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Cross Platform Codes</label>
            <div class="tags-input-wrap" id="tags-crossPlatform"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Public Transfer Codes</label>
            <div class="tags-input-wrap" id="tags-publicTransfer"></div>
          </div>
          <label class="form-check">
            <input type="checkbox" id="cb-isOpen" ${(row?.isOpen ?? true) ? 'checked' : ''} />
            Is Open
          </label>
        </div>
        <div class="modal-footer">
          <button class="icon-btn" id="modal-cancel">Cancel</button>
          <button class="icon-btn primary" id="modal-save">${SVG.check} ${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  `;

    requestAnimationFrame(() => mount.querySelector('#modal-overlay').classList.add('open'));

    const tagsCross = createTagsInput(document.getElementById('tags-crossPlatform'), row?.crossPlatform || []);
    const tagsTransfer = createTagsInput(document.getElementById('tags-publicTransfer'), row?.publicTransfer || []);

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
        const station = document.getElementById('f-station').value;
        const code = document.getElementById('f-code').value.trim();
        const line = document.getElementById('f-line').value.trim();
        const order = parseInt(document.getElementById('f-order').value, 10);
        const direction = document.getElementById('f-direction').value.trim();
        if (!station || !code || !line || !direction) {
            toast('Fill required fields.', 'error');
            return;
        }

        const payload = {
            station,
            code,
            line,
            order,
            direction,
            isOpen: document.getElementById('cb-isOpen').checked,
            crossPlatform: tagsCross.getTags(),
            publicTransfer: tagsTransfer.getTags(),
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Saving…`;
        try {
            if (isEdit) {
                await apiFetch(`/api/db/platforms/${row.uid}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }, true);
                toast('Platform updated.', 'success');
            } else {
                await apiFetch('/api/db/platforms', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, true);
                toast('Platform created.', 'success');
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
    mount.querySelector('#modal-overlay').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') doSave();
    });
}

async function deleteRow(uid) {
    const ok = await confirmDialog('Delete this platform?', 'All related facilities will also be deleted.');
    if (!ok) return;
    try {
        await apiFetch(`/api/db/platforms/${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Platform deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadStations().then(loadTable);