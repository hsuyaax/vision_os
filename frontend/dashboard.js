/* ====== VisionSync Dashboard v2 — Full JS ====== */

// ── State ──
const S = {
  demoMode: false,
  feedActive: false,
  vertical: null,
  apiUrl: 'http://localhost:8000',
  wsStats: null,
  wsAlerts: null,
  updateInterval: 1000,
  demoTimer: null,
  charts: {},
  alerts: [],
  totalDetections: 0,
  totalAlerts: 0,
  detHistory: [],
  alertHistory: [],
  fpsHistory: [],
  latHistory: [],
  classCounts: {},
  uptime: 0,
  uptimeTimer: null,
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initCharts();
  registerCommands();
  checkServer();
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openCmd(); }
    if (e.key === 'Escape') closeCmd();
  });
});

// ── Clock ──
function startClock() {
  const el = document.getElementById('clock');
  const tick = () => { el.textContent = new Date().toLocaleTimeString('en-GB'); };
  tick();
  setInterval(tick, 1000);
}

// ── Page Navigation ──
function switchPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── Server Health ──
async function checkServer() {
  try {
    const r = await fetch(S.apiUrl + '/api/health', { signal: AbortSignal.timeout(3000) });
    if (r.ok) setServerStatus('online', 'Online');
    else setServerStatus('offline', 'Error');
  } catch {
    setServerStatus('offline', 'Offline');
  }
}
function setServerStatus(cls, text) {
  const dot = document.querySelector('#server-status .status-dot');
  const txt = document.querySelector('#server-status .status-text');
  dot.className = 'status-dot ' + cls;
  txt.textContent = text;
  const h = document.getElementById('h-backend');
  if (cls === 'online') { h.textContent = '● OK'; h.className = 'health-val ok'; }
  else if (cls === 'demo') { h.textContent = '● Demo'; h.className = 'health-val warn'; }
  else { h.textContent = '● Down'; h.className = 'health-val err'; }
}

// ── Quick Launch ──
function quickLaunch(vertical) {
  document.getElementById('m-vertical').value = vertical;
  switchPage('monitor', document.querySelector('[data-page="monitor"]'));
  startFeed();
}

// ── Start / Stop Feed ──
async function startFeed() {
  const source = document.getElementById('m-source').value || '0';
  const vertical = document.getElementById('m-vertical').value;
  S.vertical = vertical;
  S.feedActive = true;

  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-stop').disabled = false;

  // Set metric labels for this vertical
  setMetricLabels(vertical);
  updateOverviewVertical(vertical);
  document.getElementById('sys-status').textContent = 'ACTIVE';
  document.getElementById('sys-status').style.color = 'var(--accent)';

  if (S.demoMode) {
    startDemo(vertical);
    return;
  }

  // Real feed
  try {
    await fetch(S.apiUrl + '/api/feed/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, vertical })
    });
    const img = document.getElementById('vid-stream');
    img.src = S.apiUrl + '/stream';
    img.classList.remove('hidden');
    document.getElementById('vid-placeholder').style.display = 'none';
    document.getElementById('vid-rec').style.display = 'inline';
    connectWS();
    setHealthOk();
    startUptime();
  } catch (e) {
    toast('Error', 'Cannot connect to backend: ' + e.message, 'danger');
    stopFeed();
  }
}

async function stopFeed() {
  S.feedActive = false;
  S.vertical = null;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-stop').disabled = true;

  clearInterval(S.demoTimer);
  stopUptime();

  if (!S.demoMode) {
    try { await fetch(S.apiUrl + '/api/feed/stop', { method: 'POST' }); } catch {}
    if (S.wsStats) S.wsStats.close();
    if (S.wsAlerts) S.wsAlerts.close();
  }

  const img = document.getElementById('vid-stream');
  img.src = '';
  img.classList.add('hidden');
  document.getElementById('vid-placeholder').style.display = '';
  document.getElementById('vid-rec').style.display = 'none';
  document.getElementById('vid-fps').textContent = '— FPS';
  document.getElementById('sys-status').textContent = 'STANDBY';
  document.getElementById('sys-status').style.color = '';
  document.getElementById('ov-vertical').textContent = '—';
  document.getElementById('ov-vertical-sub').textContent = 'No feed active';
}

// ── Uptime ──
function startUptime() {
  S.uptime = 0;
  S.uptimeTimer = setInterval(() => {
    S.uptime++;
    const h = String(Math.floor(S.uptime / 3600)).padStart(2, '0');
    const m = String(Math.floor((S.uptime % 3600) / 60)).padStart(2, '0');
    const s = String(S.uptime % 60).padStart(2, '0');
    document.getElementById('sys-uptime').textContent = `Uptime: ${h}:${m}:${s}`;
  }, 1000);
}
function stopUptime() { clearInterval(S.uptimeTimer); }

// ── Metric labels per vertical ──
function setMetricLabels(v) {
  const labels = {
    safety: ['People', 'PPE OK', 'Violations', 'Falls', 'Compliance %', 'Zone Alerts'],
    traffic: ['Vehicles', 'Cars', 'Trucks', 'Crossed', 'Avg Speed', 'Violations'],
    manufacturing: ['Inspected', 'Passed', 'Defects', 'Pass Rate', 'Throughput', 'Alerts'],
    restaurant: ['Customers', 'Tables', 'Occupied', 'Occupancy %', 'Avg Dwell', 'Alerts'],
  };
  const l = labels[v] || labels.safety;
  for (let i = 0; i < 6; i++) {
    document.getElementById('mt-' + (i + 1) + '-lbl').textContent = l[i];
    document.getElementById('mt-' + (i + 1) + '-val').textContent = '—';
  }
}

function updateOverviewVertical(v) {
  const names = { safety: '🦺 Safety', traffic: '🚗 Traffic', manufacturing: '🏭 Manufacturing', restaurant: '🍽️ Restaurant' };
  document.getElementById('ov-vertical').textContent = names[v] || v;
  document.getElementById('ov-vertical-sub').textContent = 'Feed active';
}

// ── WebSocket ──
function connectWS() {
  const wsBase = S.apiUrl.replace(/^http/, 'ws');

  S.wsStats = new WebSocket(wsBase + '/ws/stats');
  S.wsStats.onmessage = e => {
    const d = JSON.parse(e.data);
    handleStats(d);
  };
  S.wsStats.onerror = () => { setHealth('h-ws', 'err', '● Error'); };
  S.wsStats.onopen = () => { setHealth('h-ws', 'ok', '● OK'); };

  S.wsAlerts = new WebSocket(wsBase + '/ws/alerts');
  S.wsAlerts.onmessage = e => {
    const d = JSON.parse(e.data);
    handleAlert(d);
  };
}

// ── Handle Stats ──
function handleStats(d) {
  if (!d) return;
  const v = S.vertical;

  // Backend sends { vertical, timestamp, fps, metrics: {...} }
  // Demo mode sends flat fields directly. Support both formats.
  const m = d.metrics || d;
  const fps = d.fps || m.fps || m.FPS || '—';
  document.getElementById('vid-fps').textContent = fps + ' FPS';
  setHealth('h-fps', 'ok', fps + ' fps');

  // Metric values depend on vertical
  if (v === 'safety') {
    setM(1, m.people_count ?? m.total_people ?? '—');
    setM(2, m.ppe_compliant ?? m.ppe_ok ?? '—');
    setM(3, m.ppe_violations ?? m.violations ?? '—');
    setM(4, m.falls_detected ?? m.falls ?? '—');
    const ppl = m.people_count || m.total_people || 0;
    const comp = m.ppe_compliant ?? m.ppe_ok ?? 0;
    setM(5, ppl > 0 ? Math.round((comp / ppl) * 100) + '%' : '—');
    setM(6, m.zone_intrusions ?? m.zone_alerts ?? '—');
    S.totalDetections += ppl;
    updateQS(m);
  } else if (v === 'traffic') {
    setM(1, m.vehicle_count ?? m.total_vehicles ?? '—');
    setM(2, m.cars ?? '—');
    setM(3, m.trucks ?? '—');
    setM(4, m.total_crossed ?? m.vehicles_crossed ?? '—');
    setM(5, m.avg_speed != null ? parseFloat(m.avg_speed).toFixed(0) + ' km/h' : '—');
    setM(6, m.violations ?? '—');
    S.totalDetections += (m.vehicle_count || m.total_vehicles || 0);
    updateQT(m);
  } else if (v === 'manufacturing') {
    setM(1, m.products_inspected ?? m.total_inspected ?? '—');
    setM(2, m.products_passed ?? m.passed ?? '—');
    setM(3, m.defects_found ?? m.defects ?? '—');
    const pr = m.pass_rate;
    setM(4, pr != null ? (pr * 100).toFixed(0) + '%' : '—');
    setM(5, m.throughput ?? '—');
    setM(6, m.alerts ?? '—');
    S.totalDetections += (m.products_inspected || m.total_inspected || 0);
    updateQM(m);
  } else if (v === 'restaurant') {
    setM(1, m.people_count ?? m.customers ?? m.current_people ?? '—');
    setM(2, m.tables_total ?? m.total_tables ?? '—');
    setM(3, m.tables_occupied ?? m.occupied_tables ?? '—');
    const occ = m.occupancy_rate ?? m.occupancy;
    setM(4, occ != null ? (occ * 100).toFixed(0) + '%' : '—');
    setM(5, m.avg_dwell_time ?? m.avg_dwell ?? '—');
    setM(6, m.long_stays ?? m.alerts ?? '—');
    S.totalDetections += (m.people_count || m.customers || m.current_people || 0);
    updateQR(m);
  }

  document.getElementById('ov-detections').textContent = S.totalDetections;

  // Push to charts
  const now = new Date().toLocaleTimeString('en-GB').slice(0, 5);
  const detCount = m.people_count || m.vehicle_count || m.products_inspected || m.customers || m.total_vehicles || m.total_inspected || 0;
  pushChartData('chart-detections', now, detCount);
  if (fps !== '—') pushChartData('chart-fps', now, parseFloat(fps));
}

// Quick-stat card updates
function updateQS(d) { setText('qs-people', d.people_count ?? 0); setText('qs-violations', d.violations ?? 0); setBar('qs-bar', d.compliance_rate ?? 0); }
function updateQT(d) { setText('qt-vehicles', d.total_vehicles ?? 0); setText('qt-crossed', d.vehicles_crossed ?? 0); setBar('qt-bar', Math.min((d.total_vehicles || 0) / 50, 1)); }
function updateQM(d) { setText('qm-inspected', d.total_inspected ?? 0); setText('qm-defects', d.defects ?? 0); setBar('qm-bar', d.pass_rate ?? 0); }
function updateQR(d) { setText('qr-people', d.customers ?? d.current_people ?? 0); setText('qr-occ', ((d.occupancy ?? 0) * 100).toFixed(0) + '%'); setBar('qr-bar', d.occupancy ?? 0); }
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setBar(id, pct) { const el = document.getElementById(id); if (el) el.style.width = (pct * 100) + '%'; }
function setM(i, v) { document.getElementById('mt-' + i + '-val').textContent = v; }

// ── Handle Alert ──
function handleAlert(d) {
  S.totalAlerts++;
  document.getElementById('ov-alerts').textContent = S.totalAlerts;

  const severity = d.severity || 'MEDIUM';
  const title = d.type || d.title || 'Alert';
  const msg = d.message || d.details || JSON.stringify(d);
  const ts = new Date().toLocaleTimeString('en-GB');

  S.alerts.unshift({ severity, title, msg, ts });
  if (S.alerts.length > 200) S.alerts.pop();

  renderAlerts();
  addActivity(severity.toLowerCase(), title + ': ' + msg, ts);
  addDetLog(title, msg);
  pushChartData('chart-severity-data', severity, 1);

  // Update badge
  const badge = document.getElementById('alert-count-badge');
  badge.style.display = '';
  badge.textContent = S.totalAlerts;

  // Toast
  if (document.getElementById('toast-toggle')?.checked) {
    const icons = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };
    toast(title, msg, severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warn' : 'info', icons[severity]);
  }
}

function renderAlerts(filter) {
  const timeline = document.getElementById('alerts-timeline');
  const filtered = filter && filter !== 'all' ? S.alerts.filter(a => a.severity === filter) : S.alerts;
  if (filtered.length === 0) {
    timeline.innerHTML = '<div class="alert-empty-state"><div class="empty-icon">🔔</div><h3>No Alerts</h3><p>Filtered results empty.</p></div>';
    return;
  }
  timeline.innerHTML = filtered.map(a => `
    <div class="alert-card ${a.severity}">
      <div class="alert-severity">${a.severity}</div>
      <div class="alert-body"><div class="alert-body-title">${esc(a.title)}</div><div class="alert-body-msg">${esc(a.msg)}</div></div>
      <div class="alert-ts">${a.ts}</div>
    </div>`).join('');
}

function filterAlerts(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAlerts(filter);
}

// ── Activity Feed ──
function addActivity(level, text, time) {
  const feed = document.getElementById('activity-feed');
  if (feed.querySelector('.activity-empty')) feed.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `<div class="activity-dot ${level}"></div><div><div class="activity-text">${esc(text)}</div><div class="activity-time">${time}</div></div>`;
  feed.prepend(item);
  while (feed.children.length > 60) feed.lastChild.remove();
}

// ── Detection Log ──
function addDetLog(title, msg) {
  const log = document.getElementById('det-log');
  if (log.querySelector('.det-empty')) log.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'det-item';
  item.innerHTML = `<strong>${esc(title)}</strong> — ${esc(msg)}`;
  log.prepend(item);
  while (log.children.length > 80) log.lastChild.remove();
}

// ── Health Helpers ──
function setHealth(id, cls, text) {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.className = 'health-val ' + cls; }
}
function setHealthOk() {
  setHealth('h-camera', 'ok', '● Active');
  setHealth('h-model', 'ok', '● Loaded');
  setHealth('h-db', 'ok', '● OK');
}

// ── Charts ──
function initCharts() {
  const defOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#52525b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#52525b', font: { size: 10 } } }
    }
  };

  // Detections over time
  S.charts.detections = new Chart(document.getElementById('chart-detections'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
    options: { ...defOpts }
  });

  // Severity (doughnut)
  S.charts.severity = new Chart(document.getElementById('chart-severity'), {
    type: 'doughnut',
    data: { labels: ['High', 'Medium', 'Low'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#f87171', '#fbbf24', '#22c55e'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', font: { size: 11 } } } }, cutout: '60%' }
  });

  // Verticals (bar)
  S.charts.verticals = new Chart(document.getElementById('chart-verticals'), {
    type: 'bar',
    data: {
      labels: ['Safety', 'Traffic', 'Manufacturing', 'Restaurant'],
      datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#22c55e', '#38b6ff', '#fbbf24', '#ec4899'], borderRadius: 6, borderSkipped: false }]
    },
    options: { ...defOpts, plugins: { legend: { display: false } } }
  });

  // Confidence (bar)
  S.charts.confidence = new Chart(document.getElementById('chart-confidence'), {
    type: 'bar',
    data: {
      labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
      datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: 'rgba(0,255,136,0.3)', borderColor: '#00ff88', borderWidth: 1, borderRadius: 4 }]
    },
    options: { ...defOpts }
  });

  // FPS over time
  S.charts.fps = new Chart(document.getElementById('chart-fps'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#38b6ff', backgroundColor: 'rgba(56,182,255,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
    options: { ...defOpts }
  });

  // Latency
  S.charts.latency = new Chart(document.getElementById('chart-latency'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }] },
    options: { ...defOpts }
  });
}

function pushChartData(chartKey, label, value) {
  let chart;
  if (chartKey === 'chart-detections') chart = S.charts.detections;
  else if (chartKey === 'chart-fps') chart = S.charts.fps;
  else if (chartKey === 'chart-latency') chart = S.charts.latency;
  else if (chartKey === 'chart-severity-data') {
    // Increment severity bucket
    const idx = { HIGH: 0, MEDIUM: 1, LOW: 2 }[label];
    if (idx != null) {
      S.charts.severity.data.datasets[0].data[idx] += value;
      S.charts.severity.update('none');
    }
    return;
  } else return;

  const ds = chart.data;
  ds.labels.push(label);
  ds.datasets[0].data.push(value);
  if (ds.labels.length > 30) { ds.labels.shift(); ds.datasets[0].data.shift(); }
  chart.update('none');
}

function switchAnalyticsTab(tab, btn) {
  document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('at-' + tab).classList.add('active');
  btn.classList.add('active');
}

// ── Demo Mode ──
function toggleDemoMode(on) {
  S.demoMode = on;
  document.getElementById('demo-label').textContent = on ? 'On' : 'Off';
  if (on) {
    setServerStatus('demo', 'Demo Mode');
    toast('Demo Mode', 'Simulated data enabled — no backend needed.', 'info', '🎮');
  } else {
    clearInterval(S.demoTimer);
    checkServer();
    toast('Demo Mode', 'Disabled — reconnecting to backend.', 'info', '🎮');
  }
}

function startDemo(vertical) {
  setHealthOk();
  setHealth('h-ws', 'ok', '● Demo');
  document.getElementById('vid-placeholder').innerHTML = `
    <div style="font-size:3rem;margin-bottom:12px;opacity:0.6">🎬</div>
    <p style="color:var(--text2)">Demo Mode — Simulated ${vertical}</p>
    <small>Live video replaced with simulated data</small>`;
  document.getElementById('vid-rec').style.display = 'inline';

  let tick = 0;
  const run = () => {
    tick++;
    const fps = (24 + Math.random() * 8).toFixed(1);
    const ts = new Date().toLocaleTimeString('en-GB');

    let stats = {};
    if (vertical === 'safety') {
      const ppl = 3 + Math.floor(Math.random() * 10);
      const viol = Math.floor(Math.random() * 3);
      stats = { people_count: ppl, ppe_ok: ppl - viol, violations: viol, falls: Math.random() > 0.92 ? 1 : 0, compliance_rate: (ppl - viol) / ppl, zone_alerts: Math.floor(Math.random() * 2), fps };
      if (tick % 5 === 0) handleAlert({ severity: viol > 0 ? 'MEDIUM' : 'LOW', type: 'PPE Check', message: viol > 0 ? `${viol} worker(s) missing PPE` : 'All workers compliant' });
      if (stats.falls) handleAlert({ severity: 'HIGH', type: 'Fall Detected', message: 'Possible fall in Zone A' });
      updateVerticalChart('Safety', ppl);
      updateConfidenceChart();
    } else if (vertical === 'traffic') {
      const veh = 5 + Math.floor(Math.random() * 20);
      const cars = Math.floor(veh * 0.7);
      stats = { total_vehicles: veh, cars, trucks: veh - cars, vehicles_crossed: tick * 2 + Math.floor(Math.random() * 3), avg_speed: 35 + Math.random() * 30, violations: Math.floor(Math.random() * 2), fps };
      if (tick % 7 === 0) handleAlert({ severity: stats.violations > 0 ? 'HIGH' : 'LOW', type: 'Traffic', message: stats.violations > 0 ? 'Speed violation detected' : `${veh} vehicles in frame` });
      updateVerticalChart('Traffic', veh);
      updateConfidenceChart();
    } else if (vertical === 'manufacturing') {
      const insp = 10 + Math.floor(Math.random() * 15);
      const def = Math.floor(Math.random() * 3);
      stats = { total_inspected: insp, passed: insp - def, defects: def, pass_rate: (insp - def) / insp, throughput: (insp / 2).toFixed(1), alerts: def > 1 ? 1 : 0, fps };
      if (def > 1) handleAlert({ severity: 'MEDIUM', type: 'Quality', message: `${def} defects found in batch` });
      updateVerticalChart('Manufacturing', insp);
      updateConfidenceChart();
    } else if (vertical === 'restaurant') {
      const cust = 5 + Math.floor(Math.random() * 20);
      const tables = 12;
      const occ = Math.min(Math.floor(cust / 2), tables);
      stats = { customers: cust, current_people: cust, total_tables: tables, occupied_tables: occ, occupancy: occ / tables, avg_dwell: (8 + Math.random() * 15).toFixed(0) + 'm', alerts: occ > 10 ? 1 : 0, fps };
      if (occ > 10) handleAlert({ severity: 'MEDIUM', type: 'Capacity', message: 'Near capacity: ' + occ + '/' + tables + ' tables' });
      updateVerticalChart('Restaurant', cust);
      updateConfidenceChart();
    }

    handleStats(stats);
    pushChartData('chart-latency', ts.slice(0, 5), 15 + Math.random() * 25);

    // Add class counts
    const classes = {
      safety: ['person', 'hardhat', 'vest', 'no-hardhat', 'no-vest'],
      traffic: ['car', 'truck', 'bus', 'motorcycle', 'bicycle'],
      manufacturing: ['product', 'defect', 'scratch', 'dent'],
      restaurant: ['person', 'table', 'chair', 'food']
    };
    const cl = classes[vertical];
    const picked = cl[Math.floor(Math.random() * cl.length)];
    S.classCounts[picked] = (S.classCounts[picked] || 0) + 1;
    renderClassGrid();
  };

  run();
  S.demoTimer = setInterval(run, S.updateInterval);
  startUptime();
}

function updateVerticalChart(name, val) {
  const idx = ['Safety', 'Traffic', 'Manufacturing', 'Restaurant'].indexOf(name);
  if (idx >= 0 && S.charts.verticals) {
    S.charts.verticals.data.datasets[0].data[idx] += val;
    S.charts.verticals.update('none');
  }
}

function updateConfidenceChart() {
  if (!S.charts.confidence) return;
  const buckets = S.charts.confidence.data.datasets[0].data;
  const r = Math.random();
  if (r < 0.05) buckets[0]++;
  else if (r < 0.1) buckets[1]++;
  else if (r < 0.25) buckets[2]++;
  else if (r < 0.55) buckets[3]++;
  else buckets[4]++;
  S.charts.confidence.update('none');
}

function renderClassGrid() {
  const grid = document.getElementById('class-grid');
  if (!grid) return;
  const sorted = Object.entries(S.classCounts).sort((a, b) => b[1] - a[1]);
  grid.innerHTML = sorted.map(([name, count]) => `
    <div class="class-tag">
      <span class="class-tag-name">${name}</span>
      <span class="class-tag-count">${count}</span>
    </div>
  `).join('');
}

// ── Toast ──
function toast(title, msg, type = 'info', icon = '') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  if (!icon) icon = { info: 'ℹ️', warn: '⚠️', danger: '🚨' }[type] || 'ℹ️';
  t.innerHTML = `<span class="toast-icon">${icon}</span><div class="toast-body"><div class="toast-title">${esc(title)}</div><div class="toast-msg">${esc(msg)}</div></div>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 5200);
}

// ── Settings ──
async function testConnection() {
  const url = document.getElementById('api-url').value;
  S.apiUrl = url;
  const res = document.getElementById('conn-result');
  res.textContent = 'Testing...';
  res.style.color = 'var(--text2)';
  try {
    const r = await fetch(url + '/api/health', { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      res.textContent = '✓ Connected';
      res.style.color = '#22c55e';
      setServerStatus('online', 'Online');
    } else {
      res.textContent = '✗ Error ' + r.status;
      res.style.color = 'var(--danger)';
    }
  } catch (e) {
    res.textContent = '✗ ' + e.message;
    res.style.color = 'var(--danger)';
  }
}

function setAccent(color, btn) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dim', color + '26');
  document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('picked'));
  btn.classList.add('picked');
}

function setUpdateInterval(val) {
  S.updateInterval = parseInt(val);
  if (S.demoMode && S.feedActive) {
    clearInterval(S.demoTimer);
    S.demoTimer = setInterval(() => startDemoTick(), S.updateInterval);
  }
}

// ── Command Palette ──
const commands = [
  { icon: '▶', label: 'Start Feed', action: () => { switchPage('monitor', document.querySelector('[data-page="monitor"]')); startFeed(); } },
  { icon: '◼', label: 'Stop Feed', action: () => stopFeed() },
  { icon: '🦺', label: 'Launch Safety', action: () => quickLaunch('safety'), shortcut: '' },
  { icon: '🚗', label: 'Launch Traffic', action: () => quickLaunch('traffic') },
  { icon: '🏭', label: 'Launch Manufacturing', action: () => quickLaunch('manufacturing') },
  { icon: '🍽️', label: 'Launch Restaurant', action: () => quickLaunch('restaurant') },
  { icon: '◉', label: 'Go to Overview', action: () => switchPage('overview', document.querySelector('[data-page="overview"]')) },
  { icon: '◎', label: 'Go to Live Monitor', action: () => switchPage('monitor', document.querySelector('[data-page="monitor"]')) },
  { icon: '◈', label: 'Go to Analytics', action: () => switchPage('analytics', document.querySelector('[data-page="analytics"]')) },
  { icon: '◆', label: 'Go to Alerts', action: () => switchPage('alerts', document.querySelector('[data-page="alerts"]')) },
  { icon: '⚙', label: 'Go to Settings', action: () => switchPage('settings', document.querySelector('[data-page="settings"]')) },
  { icon: '🎮', label: 'Toggle Demo Mode', action: () => { const t = document.getElementById('demo-mode-toggle'); t.checked = !t.checked; toggleDemoMode(t.checked); } },
  { icon: '🔄', label: 'Check Server Health', action: () => checkServer() },
];

function registerCommands() {
  const list = document.getElementById('cmd-list');
  list.innerHTML = commands.map((c, i) => `
    <div class="cmd-item" data-i="${i}" onclick="runCommand(${i})">
      <span class="cmd-item-icon">${c.icon}</span>
      <span>${c.label}</span>
      ${c.shortcut ? `<span class="cmd-item-shortcut">${c.shortcut}</span>` : ''}
    </div>
  `).join('');
}

function openCmd() {
  const o = document.getElementById('cmd-overlay');
  o.classList.remove('hidden');
  document.getElementById('cmd-input').value = '';
  document.getElementById('cmd-input').focus();
  filterCommands('');
}
function closeCmd() { document.getElementById('cmd-overlay').classList.add('hidden'); }

function filterCommands(q) {
  const items = document.querySelectorAll('.cmd-item');
  const ql = q.toLowerCase();
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(ql) ? '' : 'none';
  });
}

function runCommand(i) {
  closeCmd();
  commands[i]?.action();
}

// ── Utility ──
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Load Events (for Analytics → Detections tab) ──
async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Loading...</td></tr>';
  try {
    const r = await fetch(S.apiUrl + '/api/events?limit=50', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const events = data.events || [];
    if (events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No events recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = events.map(ev => {
      const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-GB') : '—';
      const sevClass = (ev.severity || '').toLowerCase();
      return `<tr>
        <td>${ts}</td>
        <td>${esc(ev.vertical || '—')}</td>
        <td>${esc(ev.event_type || ev.type || '—')}</td>
        <td><span class="sev-${sevClass}">${esc(ev.severity || '—')}</span></td>
        <td>${esc(ev.message || '—')}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:24px">Failed: ${esc(e.message)}</td></tr>`;
  }
}
