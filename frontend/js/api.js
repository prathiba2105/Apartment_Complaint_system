/* ========================================
   Apartment Care - Shared API / Utils
   ======================================== */

// Backend base URL. The frontend (served by VS Code Live Server on port 5500)
// must call the Express API on port 5000, not the Live Server origin.
const API_BASE_URL = 'http://localhost:5000';

const buildApiUrl = (url) => {
  if (/^https?:\/\//i.test(url)) return url;
  return API_BASE_URL + url;
};

const API = {
  request: async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(buildApiUrl(url), { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = { message: res.statusText };
    }
    if (!res.ok) {
      const err = new Error(data.message || 'Something went wrong');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  get: (url) => API.request(url),
  post: (url, body) => API.request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => API.request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => API.request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (url) => API.request(url, { method: 'DELETE' }),
};

/* ---------------- Toast ---------------- */
function showToast(title, message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
const toast = {
  success: (m, t) => showToast(t || 'Success', m, 'success'),
  error: (m, t) => showToast(t || 'Error', m, 'error'),
  warning: (m, t) => showToast(t || 'Warning', m, 'warning'),
  info: (m, t) => showToast(t || 'Info', m, 'info'),
};

/* ---------------- Auth storage ---------------- */
const AuthStore = {
  set: (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    const entity = data.role === 'USER' ? data.user : data.role === 'WORKER' ? data.worker : data.admin;
    localStorage.setItem('me', JSON.stringify(entity || {}));
  },
  getToken: () => localStorage.getItem('token'),
  getRole: () => localStorage.getItem('role'),
  getMe: () => {
    try {
      return JSON.parse(localStorage.getItem('me')) || {};
    } catch (e) {
      return {};
    }
  },
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('me');
  },
  logout: (redirectUrl) => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('me');
    if (redirectUrl) window.location.href = redirectUrl;
  },
};

/* ---------------- Guard helpers ---------------- */
function requireAuth(role) {
  const token = AuthStore.getToken();
  const currentRole = AuthStore.getRole();
  if (!token) {
    window.location.href = `${role === 'ADMIN' ? 'admin-login.html' : 'index.html'}`;
    return false;
  }
  if (role && currentRole !== role) {
    const redirectMap = { USER: 'user-dashboard.html', WORKER: 'worker-dashboard.html', ADMIN: 'admin-dashboard.html' };
    window.location.href = redirectMap[currentRole] || 'index.html';
    return false;
  }
  return true;
}

function initials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'inprogress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    CLOSED: 'completed',
    REOPENED: 'reopened',
  };
  const key = map[status] || 'pending';
  return `<span class="badge badge-${key}">${status.replace('_', ' ')}</span>`;
}

function priorityBadge(priority) {
  const p = (priority || 'Medium').toLowerCase();
  const key = p === 'high' ? 'high' : p === 'emergency' ? 'emergency' : p === 'low' ? 'low' : 'medium';
  return `<span class="badge badge-${key}">${priority}</span>`;
}

function availabilityBadge(status) {
  const key = (status || '').toLowerCase();
  const map = { available: 'active', busy: 'busy', offline: 'offline' };
  return `<span class="badge badge-${map[key] || 'active'}">${status || 'AVAILABLE'}</span>`;
}

function activeBadge(active) {
  return active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Disabled</span>';
}

function setBtnLoading(btn, loading, text, loadingText = 'Processing...') {
  if (loading) {
    btn.dataset.text = btn.textContent.trim();
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.text) btn.innerHTML = btn.dataset.text;
  }
}

function togglePassword(btn) {
  const input = btn.closest('.password-wrap').querySelector('input');
  const isPw = input.type === 'password';
  input.type = isPw ? 'text' : 'password';
  btn.textContent = isPw ? '🙈' : '👁️';
}

function getInitials(name) {
  return initials(name);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  try {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

