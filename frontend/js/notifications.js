/* ========================================
   Apartment Care - Notifications logic
   ======================================== */

function notifEndpoints(role) {
  if (role === 'ADMIN')
    return {
      list: '/api/admin/notifications',
      read: (id) => `/api/admin/notifications/${id}/read`,
      delete: (id) => `/api/admin/notifications/${id}`,
    };
  if (role === 'WORKER')
    return {
      list: '/api/worker/notifications',
      read: (id) => `/api/worker/notifications/${id}/read`,
      delete: null,
    };
  return {
    list: '/api/user/notifications',
    read: (id) => `/api/user/notifications/${id}/read`,
    delete: null,
  };
}

async function loadNotifications(role, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const ep = notifEndpoints(role);
  try {
    const data = await API.get(ep.list);
    const list = data.notifications || [];
    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-icon">🔕</div>No notifications.</div>';
      return;
    }
    container.innerHTML = list
      .map(
        (n) => `
      <div class="card p2 notif-item" style="padding:16px 18px;margin-bottom:12px;${n.isRead ? 'opacity:0.6;' : 'border-left:4px solid var(--blue);'}">
        <div class="flex-between">
          <div>
            <div class="font-bold" style="color:var(--text)">${n.title || 'Notification'}</div>
            <div class="text-muted" style="font-size:13px;margin-top:3px;">${n.message || ''}</div>
            <div class="text-muted" style="font-size:11.5px;margin-top:6px;">${formatDate(n.createdAt)}</div>
          </div>
          <div class="flex gap-1">
            ${n.complaintId ? `<button class="btn btn-outline btn-sm" data-link="${n.complaintId}">View</button>` : ''}
            ${!n.isRead ? `<button class="btn btn-blue btn-sm" data-read="${n._id}">Mark Read</button>` : ''}
            ${ep.delete ? `<button class="btn btn-danger btn-sm" data-delseq="${n._id}">Delete</button>` : ''}
          </div>
        </div>
      </div>`
      )
      .join('');

    container.querySelectorAll('[data-read]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await API.patch(ep.read(btn.dataset.read), {});
          toast.success('Marked as read');
          loadNotifications(role, containerId);
          loadNotificationBadge(role);
        } catch (e) {
          toast.error('Failed to mark read');
        }
      });
    });
    container.querySelectorAll('[data-delseq]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await API.del(ep.delete(btn.dataset.delseq));
          toast.success('Notification deleted');
          loadNotifications(role, containerId);
          loadNotificationBadge(role);
        } catch (e) {
          toast.error('Failed to delete');
        }
      });
    });
    container.querySelectorAll('[data-link]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.href = `complaint-details.html?id=${btn.dataset.link}`;
      });
    });
  } catch (err) {
    container.innerHTML =
      '<div class="empty-state">Failed to load notifications. Server connection failed.</div>';
  }
}

async function markAllNotifications(role) {
  const ep = notifEndpoints(role);
  const url = role === 'ADMIN' ? '/api/admin/notifications/read-all' : `${ep.list.replace(/\/$/, '')}/read-all`;
  try {
    await API.patch(url, {});
    toast.success('All notifications marked as read');
    if (typeof loadNotifications === 'function') {
      const containerId = document.querySelector('.notif-list') ? 'notifList' : 'notificationsList';
      loadNotifications(role, containerId || 'notificationsList');
    }
    loadNotificationBadge(role);
  } catch (e) {
    toast.error('Failed to mark all as read');
  }
}
