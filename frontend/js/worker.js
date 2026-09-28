/* ========================================
   Apartment Care - Worker Dashboard logic
   ======================================== */

function renderWorkerStats(stats) {
  const cards = [
    { key: 'assigned', label: 'Assigned', icon: '📌', color: '#1769AA' },
    { key: 'inProgress', label: 'In Progress', icon: '🔄', color: '#E97E22' },
    { key: 'completed', label: 'Completed', icon: '✅', color: '#20A866' },
    { key: 'fresh', label: 'New', icon: '🆕', color: '#5B3FA3' },
  ];
  const grid = document.getElementById('statsGrid');
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

function renderWorkerComplaints(complaints) {
  const tbody = document.getElementById('workerComplaintsBody');
  if (!tbody) return;
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📭</div>No complaints assigned yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = complaints
    .map((c, i) => {
      const user = c.userId || {};
      return `
      <tr>
        <td class="muted-cell">${i + 1}</td>
        <td class="title-cell">${c.title}<br/><span class="text-muted" style="font-size:12px">${c.complaintId}</span></td>
        <td>Flat ${user.flat || '—'}${user.block ? ', ' + user.block : ''}</td>
        <td><span class="badge badge-active">${c.category}</span></td>
        <td>${priorityBadge(c.priority)}</td>
        <td>${statusBadge(c.status)}</td>
        <td><button class="btn btn-blue btn-sm" data-view="${c._id}">View</button></td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = `complaint-details.html?id=${btn.dataset.view}`;
    });
  });
}

function setupWorkerRealtime() {
  const handlers = {
    complaintAssigned: (data) => {
      toast.info('New Complaint Assigned', `${data.title} • ${data.category} • Flat ${data.flat} • ${data.priority}`);
      loadWorkerDashboard();
    },
    complaintReassigned: (data) => {
      toast.warning('Complaint Reassigned', `${data.title} has been reassigned.`);
      loadWorkerDashboard();
    },
    workerStatusUpdated: () => loadWorkerDashboard(),
    notificationCreated: (data) => {
      toast.info(data.title || 'New notification', data.message);
      loadNotificationBadge('WORKER');
    },
  };
  onRealtimeEvents(handlers);
}

async function loadWorkerDashboard() {
  try {
    const data = await API.get('/api/worker/dashboard');
    const nameEl = document.getElementById('welcomeName');
    if (nameEl) nameEl.textContent = `Welcome, ${data.worker.name} 👋`;
    const subEl = document.getElementById('welcomeSub');
    if (subEl) subEl.textContent = 'Here are your assigned tasks';
    renderWorkerStats(data.stats);
    renderWorkerComplaints(data.complaints || []);
    // update topbar
    const uName = document.querySelector('.u-name');
    const uSub = document.querySelector('.u-sub');
    if (uName) uName.textContent = data.worker.name;
    if (uSub) uSub.textContent = data.worker.category || '';
    localStorage.setItem('me', JSON.stringify({
      name: data.worker.name,
      category: data.worker.category,
      availabilityStatus: data.worker.availabilityStatus,
      currentTaskCount: data.worker.currentTaskCount,
    }));
  } catch (err) {
    toast.error(err.message || 'Failed to load dashboard');
  }
}
