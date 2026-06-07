// dashboard.js
import {
    buildTopbar,
    buildSidebar,
    initTopbar,
    apiFetch
} from './shared/shared.js';
import {
    SVG
} from './shared/svgs.js';

document.getElementById('topbar-mount').innerHTML = buildTopbar();
document.getElementById('sidebar-mount').innerHTML = buildSidebar('');
initTopbar();

const TABLES = [{
        id: 'stations',
        label: 'Stations',
        icon: SVG.station,
        href: '/pages/stations.html',
        endpoint: 'stations'
    },
    {
        id: 'platforms',
        label: 'Platforms',
        icon: SVG.platform,
        href: '/pages/platforms.html',
        endpoint: 'platforms'
    },
    {
        id: 'facilities',
        label: 'Facilities',
        icon: SVG.facility,
        href: '/pages/facilities.html',
        endpoint: 'facilities'
    },
    {
        id: 'artpieces',
        label: 'Art Pieces',
        icon: SVG.art,
        href: '/pages/artpieces.html',
        endpoint: 'artpieces'
    },
    {
        id: 'transfers',
        label: 'Transfers',
        icon: SVG.transfer,
        href: '/pages/transfers.html',
        endpoint: 'transfers'
    },
    {
        id: 'apikeys',
        label: 'API Keys',
        icon: SVG.key,
        href: '/pages/apikeys.html',
        endpoint: 'apikeys'
    },
];

const statsGrid = document.getElementById('stats-grid');
const welcomeMsg = document.getElementById('welcome-msg');

// Load counts
statsGrid.innerHTML = TABLES.map(t => `
  <a href="${t.href}" class="stat-card glass">
    <div class="stat-card-icon">${t.icon}</div>
    <div class="stat-card-count" id="count-${t.id}">—</div>
    <div class="stat-card-label">${t.label}</div>
  </a>
`).join('');

(async () => {
    let user = {};
    try {
        user = await apiFetch('/api/auth/me');
        document.querySelector('#topbar-mount .topbar-brand').insertAdjacentHTML(
            'afterend', `<span style="font-size:12px;color:var(--text-muted);margin-left:8px">${user.display_name || user.username}</span>`
        );
    } catch {
        window.location.href = '/index.html';
        return;
    }

    // Fetch counts in parallel
    await Promise.all(TABLES.map(async t => {
        try {
            const data = await apiFetch(`/api/db/${t.endpoint}?count=1`);
            document.getElementById(`count-${t.id}`).textContent =
                typeof data.count === 'number' ? data.count.toLocaleString() : '—';
        } catch {
            /* leave as — */ }
    }));

    welcomeMsg.innerHTML = `
    <h2>Welcome back, ${user.display_name || user.username}</h2>
    <p>Use the sidebar to navigate between tables. All write operations require your API key.</p>
    <div class="welcome-shortcuts">
      <div class="shortcut-row"><span class="shortcut-key">N</span> New row (on table pages)</div>
      <div class="shortcut-row"><span class="shortcut-key">Enter</span> Submit forms</div>
      <div class="shortcut-row"><span class="shortcut-key">Esc</span> Close modals</div>
      <div class="shortcut-row"><span class="shortcut-key">/</span> Focus search</div>
      <div class="shortcut-row"><span class="shortcut-key">←</span> <span class="shortcut-key">→</span> Paginate</div>
    </div>
  `;
})();