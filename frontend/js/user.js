/* ========================================
   Apartment Care - User Dashboard logic
   ======================================== */

function renderUserStats(stats) {
  const cards = [
    { key: 'total', label: 'Total Complaints', icon: '📋', color: '#1769AA' },
    { key: 'inProgress', label: 'In Progress', icon: '🔄', color: '#E97E22' },
    { key: 'completed', label: 'Completed', icon: '✅', color: '#20A866' },
    { key: 'pending', label: 'Pending', icon: '⏳', color: '#5B3FA3' },
  ];
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  grid.innerHTML = cards
    .map(
      (c) => `
      <div class="stat-card" style="--stat-color:${c.color}">
        <div class="stat-icon">${c.icon}</div>
        <div>
          <div class="stat-val" id="stat-${c.key}">${stats[c.key] ?? 0}</div>
          <div class="stat-label">${c.label}</div>
        </div>
      </div>`
    )
    .join('');
}

function renderRecentUserComplaints(complaints) {
  const tbody = document.getElementById('recentComplaintsBody');
  if (!tbody) return;
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div>No complaints yet. Create your first complaint!</div></td></tr>`;
    return;
  }
  tbody.innerHTML = complaints
    .map((c, i) => {
      const worker = c.assignedWorker
        ? `${c.assignedWorker.name}<br/><span class="text-muted" style="font-size:12px">${c.assignedWorker.category || ''}</span>`
        : '<span class="text-muted">Not assigned</span>';
      return `
      <tr>
        <td class="muted-cell">${i + 1}</td>
        <td class="title-cell">${c.title}<br/><span class="text-muted" style="font-size:12px">${c.complaintId}</span></td>
        <td><span class="badge badge-active">${c.category}</span></td>
        <td>${statusBadge(c.status)}</td>
        <td class="muted-cell">${formatDate(c.createdAt)}</td>
        <td>${worker}</td>
      </tr>`;
    })
    .join('');
}

function setupUserRealtime() {
  const handlers = {
    complaintStatusUpdated: (data) => {
      toast.info(`Complaint is now ${data.status.replace('_', ' ')}`);
      loadUserDashboard();
    },
    notificationCreated: (data) => {
      toast.info(data.title || 'New notification', data.message);
      loadNotificationBadge('USER');
    },
    complaintCreated: () => loadUserDashboard(),
  };
  onRealtimeEvents(handlers);
}

async function loadUserDashboard() {
  try {
    const data = await API.get('/api/user/dashboard');
    const me = AuthStore.getMe();
    if (data.user && data.user.name) {
      const nameEl = document.getElementById('welcomeName');
      const subEl = document.getElementById('welcomeSub');
      if (nameEl) nameEl.textContent = `Welcome, ${data.user.name} 👋`;
      if (subEl) subEl.textContent = 'Manage your complaints easily';
      // update topbar user name from real data
      const uName = document.querySelector('.u-name');
      const uSub = document.querySelector('.u-sub');
      if (uName) uName.textContent = data.user.name;
      if (uSub) uSub.textContent = `Flat ${data.user.flat || ''}${data.user.block ? ', Block ' + data.user.block : ''}`;
      // persist latest
      localStorage.setItem('me', JSON.stringify(data.user));
    }
    renderUserStats(data.stats);
    renderRecentUserComplaints(data.recent || []);
  } catch (err) {
    toast.error(err.message || 'Failed to load dashboard');
  }
}
