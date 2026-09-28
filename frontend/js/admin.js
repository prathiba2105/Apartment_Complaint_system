/* ========================================
   Apartment Care - Admin logic (dashboard, stats, assignment, charts)
   ======================================== */

/* Normalize list endpoints that may return either a bare array or { list } */
function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.complaints)) return data.complaints;
  if (data && Array.isArray(data.users)) return data.users;
  if (data && Array.isArray(data.workers)) return data.workers;
  if (data && Array.isArray(data.list)) return data.list;
  return [];
}

function renderAdminStats(stats) {
  const cards = [
    { key: 'totalUsers', label: 'Total Users', icon: '👥', color: '#1769AA' },
    { key: 'totalWorkers', label: 'Total Workers', icon: '🛠️', color: '#20A866' },
    { key: 'totalComplaints', label: 'Total Complaints', icon: '📋', color: '#5B3FA3' },
    { key: 'pending', label: 'Pending', icon: '⏳', color: '#E97E22' },
    { key: 'assigned', label: 'Assigned', icon: '🔗', color: '#2CBF77' },
    { key: 'inProgress', label: 'In Progress', icon: '🔄', color: '#1769AA' },
    { key: 'resolved', label: 'Resolved', icon: '✅', color: '#20A866' },
    { key: 'closed', label: 'Closed', icon: '🔒', color: '#123E73' },
    { key: 'highPriority', label: 'High Priority', icon: '⚡', color: '#E97E22' },
    { key: 'today', label: "Today's Complaints", icon: '📅', color: '#5B3FA3' },
    { key: 'overdue', label: 'Overdue', icon: '⏰', color: '#D64545' },
  ];
  const grid = document.getElementById('adminStatsGrid');
  if (!grid) return;
  grid.innerHTML = cards
    .map(
      (c) => `
      <div class="stat-card" style="--stat-color:${c.color}">
        <div class="stat-icon">${c.icon}</div>
        <div>
          <div class="stat-val">${stats[c.key] ?? 0}</div>
          <div class="stat-label">${c.label}</div>
        </div>
      </div>`
    )
    .join('');
}

function renderRecentAdminComplaints(complaints) {
  const tbody = document.getElementById('recentAdminComplaintsBody');
  if (!tbody) return;
  if (!complaints || !complaints.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No complaints.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = complaints
    .slice(0, 6)
    .map((c) => {
      const user = c.userId || {};
      return `
      <tr>
        <td class="muted-cell">${c.complaintId}</td>
        <td class="title-cell"><a href="complaint-details.html?id=${c._id}" style="color:var(--navy)">${c.title}</a></td>
        <td>Flat ${user.flat || '—'}${user.block ? ' ' + user.block : ''}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="muted-cell">${formatDate(c.createdAt)}</td>
      </tr>`;
    })
    .join('');
}

let complaintMonthChart = null;
let workerCategoryChart = null;
let complaintStatusChart = null;
let complaintCategoryChart = null;
let workerPerformanceChart = null;

function destroyChart(ref) {
  if (typeof Chart === 'undefined') return;
  if (ref) ref.destroy();
}

function renderAdminCharts(complaints, workers, rows) {
  if (typeof Chart === 'undefined') return;
  const palette = ['#5B3FA3', '#1769AA', '#20A866', '#E97E22', '#D64545', '#2CBF77', '#8A6ACB', '#123E73'];

  // Complaints by month (line)
  const byMonth = {};
  complaints.forEach((c) => {
    const d = new Date(c.createdAt);
    const key = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const labels = Object.keys(byMonth).sort();
  const lineCtx = document.getElementById('complaintMonthChart');
  if (lineCtx) {
    destroyChart(complaintMonthChart);
    complaintMonthChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Complaints',
          data: labels.map((l) => byMonth[l]),
          borderColor: '#1769AA',
          backgroundColor: 'rgba(23,105,170,0.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#1769AA',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF3F9' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // Workers by category (doughnut)
  const catMap = {};
  workers.forEach((w) => (catMap[w.category || 'Other'] = (catMap[w.category || 'Other'] || 0) + 1));
  const catLabels = Object.keys(catMap);
  const doughCtx = document.getElementById('workerCategoryChart');
  if (doughCtx) {
    destroyChart(workerCategoryChart);
    workerCategoryChart = new Chart(doughCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{ data: catLabels.map((l) => catMap[l]), backgroundColor: palette, borderWidth: 2, borderColor: '#fff' }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  // Complaint status (pie/doughnut) from rows.byStatus or computed from complaints
  const statusCtx = document.getElementById('complaintStatusChart');
  if (statusCtx) {
    let statusData = (rows && rows.byStatus) || computeStatusDist(complaints);
    destroyChart(complaintStatusChart);
    complaintStatusChart = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: statusData.map((s) => s.name),
        datasets: [{ data: statusData.map((s) => s.count), backgroundColor: palette, borderWidth: 2, borderColor: '#fff' }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  // Complaint category (bar)
  const catBarCtx = document.getElementById('complaintCategoryChart');
  if (catBarCtx) {
    const catDist = (rows && rows.byCategory) || computeCategoryDist(complaints);
    destroyChart(complaintCategoryChart);
    complaintCategoryChart = new Chart(catBarCtx, {
      type: 'bar',
      data: {
        labels: catDist.map((s) => s.name),
        datasets: [{
          label: 'Complaints',
          data: catDist.map((s) => s.count),
          backgroundColor: palette.slice(0, catDist.length),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
      },
    });
  }

  // Worker performance (horizontal bar) from rows.workerRanking
  const perfCtx = document.getElementById('workerPerformanceChart');
  if (perfCtx && rows && rows.workerRanking && rows.workerRanking.length) {
    const ranking = rows.workerRanking.slice(0, 8);
    destroyChart(workerPerformanceChart);
    workerPerformanceChart = new Chart(perfCtx, {
      type: 'bar',
      data: {
        labels: ranking.map((w) => w.name),
        datasets: [
          {
            label: 'Completed',
            data: ranking.map((w) => w.completed),
            backgroundColor: '#20A866',
            borderRadius: 6,
          },
          {
            label: 'Rating',
            data: ranking.map((w) => w.averageRating),
            backgroundColor: '#E97E22',
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }
}

function computeStatusDist(complaints) {
  const m = {};
  complaints.forEach((c) => (m[c.status] = (m[c.status] || 0) + 1));
  return Object.entries(m).map(([name, count]) => ({ name, count }));
}
function computeCategoryDist(complaints) {
  const m = {};
  complaints.forEach((c) => (m[c.category] = (m[c.category] || 0) + 1));
  return Object.entries(m).map(([name, count]) => ({ name, count }));
}

async function loadAdminDashboard() {
  try {
    const [stats, complaints, workers, reports] = await Promise.all([
      API.get('/api/admin/dashboard/stats'),
      API.get('/api/admin/complaints'),
      API.get('/api/admin/workers'),
      API.get('/api/admin/reports'),
    ]);
    const complaintList = unwrapList(complaints);
    const workerList = unwrapList(workers);
    renderAdminStats(stats);
    renderRecentAdminComplaints(stats.recent || complaintList);
    if (typeof Chart !== 'undefined') renderAdminCharts(complaintList, workerList, reports);
  } catch (err) {
    toast.error(err.message || 'Failed to load admin dashboard');
  }
}

const recommendWorker = (workers, category) => {
  const normalized = (category || '').toLowerCase();
  const categoryPool = workers.filter((w) => (w.category || '').toLowerCase() === normalized);
  const pool = categoryPool.length ? categoryPool : workers;
  return [...pool].sort((a, b) => {
    if ((a.availabilityStatus === 'AVAILABLE') !== (b.availabilityStatus === 'AVAILABLE'))
      return a.availabilityStatus === 'AVAILABLE' ? -1 : 1;
    if (a.currentTaskCount !== b.currentTaskCount) return a.currentTaskCount - b.currentTaskCount;
    return (b.experience || 0) - (a.experience || 0);
  });
};

/* Open assign worker modal for a complaint */
async function openAssignModal(complaint) {
  const modal = document.getElementById('assignModal');
  if (!modal) return;
  let workers = [];
  try {
    workers = unwrapList(await API.get(`/api/admin/workers/available?category=${encodeURIComponent(complaint.category)}`));
  } catch (e) {
    try {
      workers = unwrapList(await API.get('/api/admin/workers/available'));
    } catch (e2) {
      toast.error('Unable to fetch workers');
      return;
    }
  }
  const recommended = recommendWorker(workers, complaint.category);
  const tbody = document.getElementById('assignWorkerBody');
  const title = document.getElementById('assignComplaintTitle');
  if (title) title.textContent = `${complaint.title} (${complaint.complaintId})`;

  // Show complaint context in modal if elements exist
  const ctx = document.getElementById('assignComplaintContext');
  if (ctx) {
    ctx.innerHTML = `
      <div><strong>Category:</strong> ${complaint.category}</div>
      <div><strong>Priority:</strong> ${priorityBadge(complaint.priority)}</div>
      <div><strong>Location:</strong> Flat ${complaint.flat || '—'}${complaint.block ? ', Block ' + complaint.block : ''}</div>
    `;
  }
  if (!recommended.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No available worker found.</div></td></tr>`;
  } else {
    tbody.innerHTML = recommended
      .map((w, i) => `
        <tr data-worker1="${w._id}" data-worker='${JSON.stringify(w).replace(/'/g, '&#39;')}' class="selectable-worker" style="cursor:pointer">
          <td class="avatar-cell">
            <div class="flex-center" style="justify-content:flex-start;gap:10px">
              <div class="avatar sm">${initials(w.name)}</div>
              <div>${i === 0 ? '<span class="badge badge-active">Recommended</span> ' : ''}${w.name}</div>
            </div>
          </td>
          <td><span class="badge badge-active">${w.category}</span></td>
          <td class="muted-cell">${w.experience || 0} yrs</td>
          <td>${availabilityBadge(w.availabilityStatus)}</td>
          <td class="muted-cell">${w.currentTaskCount || 0} tasks</td>
        </tr>`)
      .join('');
  }
  window.__selectedWorker = null;
  tbody.querySelectorAll('.selectable-worker').forEach((row) => {
    row.addEventListener('click', () => {
      tbody.querySelectorAll('.selectable-worker').forEach((r) => (r.style.background = ''));
      row.style.background = '#E4F6ED';
      try {
        const raw = row.getAttribute('data-worker');
        window.__selectedWorker = JSON.parse(raw.replace(/&#39;/g, "'"));
      } catch (e) {}
    });
  });
  window.__assignComplaintId = complaint._id;
  modal.classList.add('open');
}

async function submitAssignment() {
  const btn = document.getElementById('confirmAssignBtn');
  setBtnLoading(btn, true, '', 'Assigning...');
  try {
    if (!window.__selectedWorker) {
      toast.warning('Please select a worker');
      return;
    }
    const body = {
      workerId: window.__selectedWorker._id,
    };
    const exp = document.getElementById('assignExpectedDate');
    if (exp && exp.value) body.expectedDate = exp.value;
    const instr = document.getElementById('assignInstructions');
    if (instr && instr.value) body.instructions = instr.value;
    const res = await API.post(`/api/admin/complaints/${window.__assignComplaintId}/assign`, body);
    toast.success(res.message || 'Complaint assigned successfully');
    closeModal('assignModal');
    const statusEl = document.getElementById('complainStatus');
    if (statusEl) statusEl.innerHTML = '<span class="badge badge-assigned">ASSIGNED</span>';
    loadAdminComplaintsPartial();
    if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
  } catch (err) {
    toast.error(err.message || 'Unable to assign worker');
  } finally {
    setBtnLoading(btn, false);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

async function loadAdminComplaintsPartial() {
  try {
    const complaints = unwrapList(await API.get('/api/admin/complaints'));
    renderRecentAdminComplaints(complaints);
    const fullBody = document.getElementById('adminComplaintsBody');
    if (fullBody) {
      fullBody.innerHTML = complaints
        .map((c) => {
          const user = c.userId || {};
          const worker = c.assignedWorker ? c.assignedWorker.name : '—';
          return `
          <tr>
            <td class="muted-cell">${c.complaintId}</td>
            <td class="title-cell">${c.title}</td>
            <td>Flat ${user.flat || '—'}</td>
            <td><span class="badge badge-active">${c.category}</span></td>
            <td>${priorityBadge(c.priority)}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${worker}</td>
            <td>
              <button class="btn btn-blue btn-sm" data-view="${c._id}">View</button>
              <button class="btn btn-purple btn-sm" data-assign="${c._id}">${c.status === 'PENDING' ? 'Assign' : 'Reassign'}</button>
            </td>
          </tr>`;
        })
        .join('');
      fullBody.querySelectorAll('[data-view]').forEach((b) =>
        b.addEventListener('click', () => (window.location.href = `complaint-details.html?id=${b.dataset.view}`))
      );
      fullBody.querySelectorAll('[data-assign]').forEach((b) =>
        b.addEventListener('click', async () => {
          const c = complaints.find((x) => x._id === b.dataset.assign);
          if (c) openAssignModal(c);
        })
      );
    }
  } catch (e) {}
}
