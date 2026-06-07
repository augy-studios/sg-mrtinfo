import {
    buildTopbar,
    buildSidebar,
    initTopbar,
    apiFetch,
    toast,
    confirm as confirmDialog,
    renderBool,
    truncate,
    createTagsInput,
} from '../shared/shared.js';
import {
    SVG
} from '../shared/svgs.js';

document.getElementById('topbar-mount').innerHTML = buildTopbar();
document.getElementById('sidebar-mount').innerHTML = buildSidebar('transfers');
initTopbar();

const PAGE_SIZE = 20;
let page = 0,
    total = 0,
    search = '';
let stationOptions = [];

document.getElementById('page-title').innerHTML = `${SVG.transfer} Transfers`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Transfer`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

const searchWrap = document.getElementById('search-wrap');
searchWrap.innerHTML = `${SVG.search}<input id="search-input" placeholder="Search stations…" />`;
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
    <th>From</th>
    <th>To</th>
    <th>Duration (min)</th>
    <th>Indoors</th>
    <th>Covered</th>
    <th>Lights / Bridges</th>
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
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            search
        });
        const data = await apiFetch(`/api/db/transfers?${qs}`);
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
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${SVG.transfer}<p>No transfers</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${truncate(r.from_name || r.from, 22)}</td>
      <td>${truncate(r.to_name   || r.to,   22)}</td>
      <td>${r.duration != null ? r.duration : '—'}</td>
      <td>${renderBool(r.indoors)}</td>
      <td>${renderBool(r.coveredwalkway)}</td>
      <td class="td-mono">${r.trafficLight}TL / ${r.overheadBridge}OB</td>
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
    const stSel = (sel) => stationOptions.map(s =>
        `<option value="${s.uid}" ${row?.[sel] === s.uid ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    mount.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" style="max-width:580px">
        <div class="modal-header">
          <span class="modal-title">${SVG.transfer} ${isEdit ? 'Edit' : 'New'} Transfer</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">From Station *</label>
              <select class="form-select" id="f-from"><option value="">Select…</option>${stSel('from')}</select>
            </div>
            <div class="form-group">
              <label class="form-label">To Station *</label>
              <select class="form-select" id="f-to"><option value="">Select…</option>${stSel('to')}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Duration (minutes)</label>
              <input class="form-input" id="f-duration" type="number" step="0.5" value="${row?.duration ?? 0}" />
            </div>
            <div class="form-group">
              <label class="form-label">Traffic Lights *</label>
              <input class="form-input" id="f-trafficLight" type="number" min="0" value="${row?.trafficLight ?? 0}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Overhead Bridges *</label>
              <input class="form-input" id="f-overheadBridge" type="number" min="0" value="${row?.overheadBridge ?? 0}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">From Instructions *</label>
            <textarea class="form-textarea" id="f-frominstructions">${row?.frominstructions || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">To Instructions *</label>
            <textarea class="form-textarea" id="f-toinstructions">${row?.toinstructions || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Via</label>
            <div class="tags-input-wrap" id="tags-via"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
            <label class="form-check"><input type="checkbox" id="cb-indoors" ${(row?.indoors ?? true) ? 'checked' : ''} /> Indoors</label>
            <label class="form-check"><input type="checkbox" id="cb-coveredwalkway" ${(row?.coveredwalkway ?? true) ? 'checked' : ''} /> Covered Walkway</label>
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
    const tagsVia = createTagsInput(document.getElementById('tags-via'), row?.via || []);

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
        const from = document.getElementById('f-from').value;
        const to = document.getElementById('f-to').value;
        const frominstructions = document.getElementById('f-frominstructions').value.trim();
        const toinstructions = document.getElementById('f-toinstructions').value.trim();
        const trafficLight = parseInt(document.getElementById('f-trafficLight').value, 10);
        const overheadBridge = parseInt(document.getElementById('f-overheadBridge').value, 10);

        if (!from || !to || !frominstructions || !toinstructions) {
            toast('Fill all required fields.', 'error');
            return;
        }

        const payload = {
            from,
            to,
            frominstructions,
            toinstructions,
            trafficLight: isNaN(trafficLight) ? 0 : trafficLight,
            overheadBridge: isNaN(overheadBridge) ? 0 : overheadBridge,
            duration: parseFloat(document.getElementById('f-duration').value) || 0,
            indoors: document.getElementById('cb-indoors').checked,
            coveredwalkway: document.getElementById('cb-coveredwalkway').checked,
            via: tagsVia.getTags(),
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Saving…`;
        try {
            if (isEdit) {
                await apiFetch(`/api/db/transfers/${row.uid}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }, true);
                toast('Transfer updated.', 'success');
            } else {
                await apiFetch('/api/db/transfers', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, true);
                toast('Transfer created.', 'success');
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
    const ok = await confirmDialog('Delete this transfer?');
    if (!ok) return;
    try {
        await apiFetch(`/api/db/transfers/${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Transfer deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadStations().then(loadTable);