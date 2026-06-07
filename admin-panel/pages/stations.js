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
document.getElementById('sidebar-mount').innerHTML = buildSidebar('stations');
initTopbar();

// ── Page init
const PAGE_SIZE = 20;
let page = 0;
let total = 0;
let search = '';

document.getElementById('page-title').innerHTML = `${SVG.station} Stations`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Station`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

// Search
const searchWrap = document.getElementById('search-wrap');
searchWrap.innerHTML = `${SVG.search}<input id="search-input" placeholder="Search stations…" />`;
const searchInput = searchWrap.querySelector('input');
searchInput.addEventListener('input', () => {
    search = searchInput.value.trim();
    page = 0;
    loadTable();
});

// Keyboard shortcuts
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

// Table headers
document.getElementById('thead').innerHTML = `
  <tr>
    <th>Name (EN)</th>
    <th>Codes</th>
    <th>Lines</th>
    <th>Open</th>
    <th>Interchange</th>
    <th>Lat / Long</th>
    <th>Actions</th>
  </tr>
`;

async function loadTable() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">${SVG.loader} Loading…</td></tr>`;
    try {
        const qs = new URLSearchParams({
            page,
            limit: PAGE_SIZE,
            search
        });
        const data = await apiFetch(`/api/db/stations?${qs}`);
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
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">${SVG.station}<p>No stations found</p></div>
    </td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="font-size:14px">${r.name_en}</div>
        ${r.name_cn ? `<div style="font-size:12px;color:var(--text-muted)">${r.name_cn}</div>` : ''}
      </td>
      <td>${renderArray(r.allCodes)}</td>
      <td>${renderArray(r.allLines)}</td>
      <td>${renderBool(r.isOpen)}</td>
      <td>${renderBool(r.isInterchange)}</td>
      <td class="td-mono">${r.lat ? r.lat.toFixed(5) : '—'}, ${r.long ? r.long.toFixed(5) : '—'}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" data-action="edit" data-id="${r.uid}" title="Edit">${SVG.edit}</button>
          <button class="icon-btn danger" data-action="delete" data-id="${r.uid}" title="Delete">${SVG.trash}</button>
        </div>
      </td>
    </tr>
  `).join('');

    // edit row lookup
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = rows.find(r => r.uid === btn.dataset.id);
            openModal(row);
        });
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

// ── Modal
function openModal(row) {
    const isEdit = !!row;
    const mount = document.getElementById('modal-mount');

    mount.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" style="max-width:640px">
        <div class="modal-header">
          <span class="modal-title">${SVG.station} ${isEdit ? 'Edit' : 'New'} Station</span>
          <button class="icon-btn" id="modal-close">${SVG.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Name (English) *</label>
              <input class="form-input" id="f-name_en" value="${row?.name_en || ''}" placeholder="Pasir Ris" required />
            </div>
            <div class="form-group">
              <label class="form-label">Name (Chinese)</label>
              <input class="form-input" id="f-name_cn" value="${row?.name_cn || ''}" placeholder="巴西立" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Name (Malay)</label>
              <input class="form-input" id="f-name_ms" value="${row?.name_ms || ''}" placeholder="Pasir Ris" />
            </div>
            <div class="form-group">
              <label class="form-label">Name (Tamil)</label>
              <input class="form-input" id="f-name_ta" value="${row?.name_ta || ''}" placeholder="பாசிர் ரிஸ்" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Name (UwU)</label>
              <input class="form-input" id="f-name_uwu" value="${row?.name_uwu || ''}" placeholder="Pwasir Wis" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Latitude</label>
              <input class="form-input" id="f-lat" type="number" step="any" value="${row?.lat ?? 0}" />
            </div>
            <div class="form-group">
              <label class="form-label">Longitude</label>
              <input class="form-input" id="f-long" type="number" step="any" value="${row?.long ?? 0}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Station Codes</label>
            <div class="tags-input-wrap" id="tags-allCodes"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Lines</label>
            <div class="tags-input-wrap" id="tags-allLines"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Directions</label>
            <div class="tags-input-wrap" id="tags-allDirections"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Facts</label>
            <div class="tags-input-wrap" id="tags-facts"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Bus Interchange</label>
            <div class="tags-input-wrap" id="tags-busInterchange"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Airport Terminal</label>
            <div class="tags-input-wrap" id="tags-airportTerminal"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Cruise Centre</label>
            <div class="tags-input-wrap" id="tags-cruiseCentre"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Hospital</label>
            <div class="tags-input-wrap" id="tags-hospital"></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px">
            ${boolCheck('isOpen', 'Is Open', row?.isOpen ?? true)}
            ${boolCheck('isInterchange', 'Interchange', row?.isInterchange ?? false)}
            ${boolCheck('crossPlatform', 'Cross Platform', row?.crossPlatform ?? false)}
            ${boolCheck('publicTransfer', 'Public Transfer', row?.publicTransfer ?? false)}
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

    const tagsFields = {
        allCodes: createTagsInput(document.getElementById('tags-allCodes'), row?.allCodes || []),
        allLines: createTagsInput(document.getElementById('tags-allLines'), row?.allLines || []),
        allDirections: createTagsInput(document.getElementById('tags-allDirections'), row?.allDirections || []),
        facts: createTagsInput(document.getElementById('tags-facts'), row?.facts || []),
        busInterchange: createTagsInput(document.getElementById('tags-busInterchange'), row?.busInterchange || []),
        airportTerminal: createTagsInput(document.getElementById('tags-airportTerminal'), row?.airportTerminal || []),
        cruiseCentre: createTagsInput(document.getElementById('tags-cruiseCentre'), row?.cruiseCentre || []),
        hospital: createTagsInput(document.getElementById('tags-hospital'), row?.hospital || []),
    };

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

    const escHandler = e => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    const saveBtn = mount.querySelector('#modal-save');
    const doSave = async () => {
        const name_en = document.getElementById('f-name_en').value.trim();
        if (!name_en) {
            toast('Name (English) is required.', 'error');
            return;
        }

        const payload = {
            name_en,
            name_cn: document.getElementById('f-name_cn').value.trim(),
            name_ms: document.getElementById('f-name_ms').value.trim(),
            name_ta: document.getElementById('f-name_ta').value.trim(),
            name_uwu: document.getElementById('f-name_uwu').value.trim(),
            lat: parseFloat(document.getElementById('f-lat').value) || 0,
            long: parseFloat(document.getElementById('f-long').value) || 0,
            isOpen: document.getElementById('cb-isOpen').checked,
            isInterchange: document.getElementById('cb-isInterchange').checked,
            crossPlatform: document.getElementById('cb-crossPlatform').checked,
            publicTransfer: document.getElementById('cb-publicTransfer').checked,
            ...Object.fromEntries(Object.entries(tagsFields).map(([k, v]) => [k, v.getTags()])),
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `${SVG.loader} Saving…`;
        try {
            if (isEdit) {
                await apiFetch(`/api/db/stations/${row.uid}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }, true);
                toast('Station updated.', 'success');
            } else {
                await apiFetch('/api/db/stations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, true);
                toast('Station created.', 'success');
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
    document.getElementById('f-name_en').addEventListener('keydown', e => {
        if (e.key === 'Enter') doSave();
    });
}

function boolCheck(id, label, checked) {
    return `<label class="form-check">
    <input type="checkbox" id="cb-${id}" ${checked ? 'checked' : ''} />
    ${label}
  </label>`;
}

async function deleteRow(uid) {
    const ok = await confirmDialog('Delete this station?', 'This will also delete all related platforms, facilities, and transfers.');
    if (!ok) return;
    try {
        await apiFetch(`/api/db/stations/${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Station deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadTable();