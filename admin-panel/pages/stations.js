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
    openFilterModal,
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
let availableLines = [];
let userCoords = null; // cached after first successful geolocation grant
let activeFilters = {
    sortBy: '', sortDir: 'asc',
    lines: [],
    isOpen: null, isInterchange: null,
    nearLat: null, nearLng: null,
};

document.getElementById('page-title').innerHTML = `${SVG.station} Stations`;
document.getElementById('new-btn').innerHTML = `${SVG.plus} New Station`;
document.getElementById('new-btn').addEventListener('click', () => openModal(null));

// Filter button
const filterBtn = document.createElement('button');
filterBtn.className = 'icon-btn';
filterBtn.id = 'filter-btn';
filterBtn.innerHTML = `${SVG.filter}<span class="btn-text"> Filters</span>`;
document.getElementById('search-wrap').parentElement.insertBefore(filterBtn, document.getElementById('search-wrap'));
filterBtn.addEventListener('click', openFiltersModal);

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

async function loadAvailableLines() {
    try {
        const data = await apiFetch('/api/db/stations?limit=1000');
        const set = new Set();
        (data.rows || []).forEach(s => (s.allLines || []).forEach(l => set.add(l)));
        availableLines = [...set].sort();
    } catch { availableLines = []; }
}

function countActiveFilters() {
    let n = 0;
    if (activeFilters.sortBy) n++;
    if (activeFilters.lines.length) n++;
    if (activeFilters.isOpen !== null) n++;
    if (activeFilters.isInterchange !== null) n++;
    if (activeFilters.nearLat !== null) n++;
    return n;
}

function updateFilterBtn() {
    const btn = document.getElementById('filter-btn');
    if (!btn) return;
    const count = countActiveFilters();
    btn.innerHTML = `${SVG.filter}<span class="btn-text"> Filters</span>${count > 0 ? `<span class="filter-pill">${count}</span>` : ''}`;
}

function openFiltersModal() {
    const f = activeFilters;
    const showDir = f.sortBy && f.sortBy !== 'near';
    openFilterModal({
        title: 'Station Filters',
        buildBody: () => `
        <div class="filter-section">
          <div class="filter-section-title">Sort By</div>
          <div class="filter-sort-row">
            <select class="form-select" id="fil-sortBy">
              <option value="" ${f.sortBy === '' ? 'selected' : ''}>Default order</option>
              <option value="name_en" ${f.sortBy === 'name_en' ? 'selected' : ''}>Name (EN)</option>
              <option value="allCodes" ${f.sortBy === 'allCodes' ? 'selected' : ''}>Codes</option>
              <option value="near" ${f.sortBy === 'near' ? 'selected' : ''}>Nearest to me</option>
            </select>
          </div>
          <div class="filter-chips filter-radio" id="fil-sortDir-wrap" style="${showDir ? '' : 'display:none'}">
            <div class="filter-chip${f.sortDir === 'asc' ? ' active' : ''}" data-value="asc">↑ Ascending</div>
            <div class="filter-chip${f.sortDir === 'desc' ? ' active' : ''}" data-value="desc">↓ Descending</div>
          </div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">Lines</div>
          <div class="filter-chips filter-multi" id="fil-lines">
            ${availableLines.length === 0
                ? '<span style="color:var(--text-muted);font-size:13px">Loading…</span>'
                : availableLines.map(l => `<div class="filter-chip${f.lines.includes(l) ? ' active' : ''}" data-value="${l}">${l}</div>`).join('')}
          </div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">Open</div>
          <div class="filter-chips filter-radio" id="fil-isOpen">
            <div class="filter-chip${f.isOpen === null ? ' active' : ''}" data-value="">All</div>
            <div class="filter-chip${f.isOpen === true ? ' active' : ''}" data-value="true">Yes</div>
            <div class="filter-chip${f.isOpen === false ? ' active' : ''}" data-value="false">No</div>
          </div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">Interchange</div>
          <div class="filter-chips filter-radio" id="fil-isInterchange">
            <div class="filter-chip${f.isInterchange === null ? ' active' : ''}" data-value="">All</div>
            <div class="filter-chip${f.isInterchange === true ? ' active' : ''}" data-value="true">Yes</div>
            <div class="filter-chip${f.isInterchange === false ? ' active' : ''}" data-value="false">No</div>
          </div>
        </div>`,
        onApply: async (close) => {
            const sortBy = document.getElementById('fil-sortBy').value;
            const sortDir = document.querySelector('#fil-sortDir-wrap .filter-chip.active')?.dataset.value || 'asc';
            const lines = [...document.querySelectorAll('#fil-lines .filter-chip.active')].map(el => el.dataset.value);
            const isOpenRaw = document.querySelector('#fil-isOpen .filter-chip.active')?.dataset.value ?? '';
            const isIntRaw = document.querySelector('#fil-isInterchange .filter-chip.active')?.dataset.value ?? '';
            let nearLat = null, nearLng = null;
            if (sortBy === 'near') {
                if (!userCoords) {
                    try {
                        const pos = await new Promise((res, rej) =>
                            navigator.geolocation.getCurrentPosition(res, rej, {
                                enableHighAccuracy: false,
                                timeout: 30000,
                                maximumAge: 300000,
                            })
                        );
                        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    } catch (err) {
                        const msg = err?.code === 1
                            ? 'Location permission denied. Please allow location in your browser settings.'
                            : err?.code === 2
                            ? 'Location unavailable. Check your device location settings.'
                            : 'Location request timed out. Please try again.';
                        toast(msg, 'error');
                        return;
                    }
                }
                nearLat = userCoords.lat;
                nearLng = userCoords.lng;
            }
            activeFilters = {
                sortBy, sortDir, lines,
                isOpen: isOpenRaw === '' ? null : isOpenRaw === 'true',
                isInterchange: isIntRaw === '' ? null : isIntRaw === 'true',
                nearLat, nearLng,
            };
            page = 0;
            loadTable();
            updateFilterBtn();
            close();
        },
        onReset: () => {
            activeFilters = { sortBy: '', sortDir: 'asc', lines: [], isOpen: null, isInterchange: null, nearLat: null, nearLng: null };
            page = 0;
            loadTable();
            updateFilterBtn();
        },
    });
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
        if (activeFilters.sortBy && activeFilters.sortBy !== 'near') {
            qs.set('sortBy', activeFilters.sortBy);
            qs.set('sortDir', activeFilters.sortDir);
        }
        if (activeFilters.lines.length) qs.set('lines', activeFilters.lines.join(','));
        if (activeFilters.isOpen !== null) qs.set('isOpen', String(activeFilters.isOpen));
        if (activeFilters.isInterchange !== null) qs.set('isInterchange', String(activeFilters.isInterchange));
        if (activeFilters.nearLat !== null) {
            qs.set('nearLat', String(activeFilters.nearLat));
            qs.set('nearLng', String(activeFilters.nearLng));
        }
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
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doSave();
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
                await apiFetch(`/api/db/stations?id=${row.uid}`, {
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
        await apiFetch(`/api/db/stations?id=${uid}`, {
            method: 'DELETE'
        }, true);
        toast('Station deleted.', 'success');
        loadTable();
    } catch (err) {
        toast(err.message, 'error');
    }
}

loadAvailableLines();
loadTable();