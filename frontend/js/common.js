/* ========================================
   Apartment Care - Common dashboard layout builder
   ======================================== */

const MENUS = {
  USER: [
    { label: 'Dashboard', icon: '📊', href: 'user-dashboard.html', id: 'dashboard' },
    { label: 'My Complaints', icon: '📋', href: 'complaints.html', id: 'complaints' },
    { label: 'New Complaint', icon: '➕', href: 'new-complaint.html', id: 'new-complaint' },
    { label: 'Notifications', icon: '🔔', href: 'notifications.html', id: 'notifications' },
    { label: 'Profile', icon: '👤', href: 'profile.html', id: 'profile' },
    { label: 'Change Password', icon: '🔒', href: 'profile.html#password', id: 'password' },
    { label: 'Logout', icon: '🚪', href: '#', id: 'logout', action: 'logout' },
  ],
  WORKER: [
    { label: 'Dashboard', icon: '📊', href: 'worker-dashboard.html', id: 'dashboard' },
    { label: 'Assigned Complaints', icon: '📌', href: 'worker-complaints.html', id: 'assigned' },
    { label: 'My Tasks', icon: '✅', href: 'worker-tasks.html', id: 'tasks' },
    { label: 'Completed Tasks', icon: '🏁', href: 'worker-completed.html', id: 'completed' },
    { label: 'Notifications', icon: '🔔', href: 'worker-notifications.html', id: 'notifications' },
    { label: 'Profile', icon: '👤', href: 'worker-profile.html', id: 'profile' },
    { label: 'Change Password', icon: '🔒', href: 'worker-profile.html#password', id: 'password' },
    { label: 'Logout', icon: '🚪', href: '#', id: 'logout', action: 'logout' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: '📊', href: 'admin-dashboard.html', id: 'dashboard' },
    { label: 'Users', icon: '👥', href: 'admin-users.html', id: 'users' },
    { label: 'Workers', icon: '🛠️', href: 'admin-workers.html', id: 'workers' },
    { label: 'Complaints', icon: '📋', href: 'admin-complaints.html', id: 'complaints' },
    { label: 'Categories', icon: '🏷️', href: 'admin-categories.html', id: 'categories' },
    { label: 'Assignments', icon: '🔗', href: 'admin-assignments.html', id: 'assignments' },
    { label: 'Reports', icon: '📈', href: 'admin-reports.html', id: 'reports' },
    { label: 'Notifications', icon: '🔔', href: 'admin-notifications.html', id: 'notifications' },
    { label: 'Settings', icon: '⚙️', href: 'admin-settings.html', id: 'settings' },
    { label: 'Logout', icon: '🚪', href: '#', id: 'logout', action: 'logout' },
  ],
};

function buildSidebar(role, activeId, notifCount) {
  const menu = MENUS[role] || [];
  const variant = role === 'USER' ? 'green' : role === 'WORKER' ? 'navy' : 'purple';
  const brandSub =
    role === 'USER' ? 'Resident Portal' : role === 'WORKER' ? 'Services Portal' : 'Admin Portal';
  const container = document.getElementById('appSidebar');
  if (!container) return;
  container.className = `sidebar ${variant}`;
  let html = `
    <div class="sidebar-brand">
      <div class="logo-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 21h18M5 21V8l7-4 7 4v13" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 21v-5h6v5" stroke="#2CBF77" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="b-title">Apartment Care</div>
        <div class="b-sub">${brandSub}</div>
      </div>
    </div>
    <nav class="sidebar-nav">`;
  menu.forEach((item) => {
    const active = item.id === activeId ? 'active' : '';
    const count =
      item.id === 'notifications' && notifCount
        ? `<span class="n-count ${role === 'ADMIN' ? 'purple' : ''}">${notifCount}</span>`
        : '';
    const href = item.action === 'logout' ? '#' : item.href;
    html += `
      <a class="nav-item ${active}" href="${href}" data-action="${item.action || ''}" data-id="${item.id}">
        <span class="n-icon">${item.icon}</span>
        <span>${item.label}</span>
        ${count}
      </a>`;
  });
  html += `</nav>
    <div class="sidebar-footer">© ${new Date().getFullYear()} Apartment Care</div>`;
  container.innerHTML = html;

  if (role === 'ADMIN') {
    // Admin may not need high notifications but keep badge
  }

  // attach logout
  container.querySelectorAll('[data-action="logout"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      AuthStore.logout(role === 'ADMIN' ? 'admin-login.html' : 'index.html');
    });
  });
}

function buildTopbar(role, title) {
  const container = document.getElementById('appTopbar');
  if (!container) return;
  const me = AuthStore.getMe();
  let name, sub;
  if (role === 'ADMIN') {
    name = 'Admin';
    sub = 'Apartment Manager';
  } else if (role === 'WORKER') {
    name = me.name || 'Worker';
    sub = me.category || '';
  } else {
    name = me.name || 'User';
    sub = `Flat ${me.flat || '—'}${me.block ? `, Block ${me.block}` : ''}`;
  }
  container.innerHTML = `
    <div class="topbar-left">
      <button class="hamburger" id="hamburger">☰</button>
      <div class="topbar-title">${title || name}</div>
    </div>
    <div class="topbar-right">
      <a href="${role === 'ADMIN' ? 'admin-notifications.html' : role === 'WORKER' ? 'worker-notifications.html' : 'notifications.html'}" class="notif-bell" title="Notifications">
        🔔<span class="notif-dot" id="topbarNotifDot"></span>
      </a>
      <div class="topbar-user">
        <div class="u-info">
          <div class="u-name">${name}</div>
          <div class="u-sub">${sub}</div>
        </div>
        <div class="avatar ${role === 'ADMIN' ? 'purple' : role === 'WORKER' ? '' : 'green'}">
          ${initials(name)}
          <span class="online"></span>
        </div>
      </div>
    </div>`;

  document.getElementById('hamburger').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
  return me;
}

/* Load unread notifications count for the badge */
async function loadNotificationBadge(role) {
  try {
    let url;
    if (role === 'USER') url = '/api/user/notifications';
    else if (role === 'WORKER') url = '/api/worker/notifications';
    else if (role === 'ADMIN') url = '/api/admin/notifications';
    else return;
    const data = await API.get(url);
    const dot = document.getElementById('topbarNotifDot');
    if (dot && data.unread > 0) {
      dot.textContent = data.unread > 9 ? '9+' : data.unread;
      dot.classList.add('show');
    } else if (dot) {
      dot.classList.remove('show');
    }
  } catch (e) {}
}
