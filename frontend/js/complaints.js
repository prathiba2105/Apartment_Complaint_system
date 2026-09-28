/* ========================================
   Apartment Care - Complaint pages logic
   ======================================== */

/* ---------- Dynamic category options from DB ---------- */
async function loadCategoryOptions(select) {
  const fallback = [
    'Plumbing', 'Electrical', 'Cleaning', 'Security', 'Lift', 'Water', 'Garbage', 'Maintenance', 'Other',
  ];
  select.innerHTML = '<option value="">Select category</option>';
  try {
    const cats = await API.get('/api/categories');
    const list = Array.isArray(cats) ? cats : cats.categories || [];
    if (list.length) {
      list.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.name;
        o.textContent = `${c.icon ? c.icon + ' ' : ''}${c.name}`;
        select.appendChild(o);
      });
      return;
    }
  } catch (e) {
    // Fall back to defaults if the server is unreachable
  }
  fallback.forEach((c) => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    select.appendChild(o);
  });
}

/* ---------- Read a file as a base64 data URL ---------- */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ---------- Upload a complaint attachment to AWS S3 ----------
   Returns the attachment metadata object on success, or throws.
   The request is multipart/form-data, so it cannot use API.request().
*/
async function uploadComplaintAttachment(file) {
  const token = AuthStore.getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(buildApiUrl('/api/upload'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = { message: res.statusText };
  }
  if (!res.ok) {
    const err = new Error(data.message || 'File upload failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data.attachment;
}

function setupNewComplaintForm() {
  const form = document.getElementById('newComplaintForm');
  if (!form) return;
  const catSelect = document.getElementById('category');
  if (catSelect) loadCategoryOptions(catSelect);

  // prefill location from stored user
  const me = AuthStore.getMe();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && v) el.value = v;
  };
  set('apartment', me.apartment);
  set('block', me.block);
  set('floor', me.floor);
  set('flat', me.flat);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitComplaintBtn');
    setBtnLoading(btn, true, '', 'Submitting...');
    try {
      const fileInput = document.getElementById('image');
      const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      let image = null;
      let attachment = null;
      if (file) {
        try {
          attachment = await uploadComplaintAttachment(file);
        } catch (uploadErr) {
          // If S3 is not configured (503) or upload failed, fall back to base64 image.
          if (uploadErr.status !== 503) {
            throw uploadErr;
          }
          image = await readFileAsDataURL(file);
        }
      }
      const res = await API.post('/api/complaints', {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        apartment: document.getElementById('apartment').value,
        block: document.getElementById('block').value,
        floor: document.getElementById('floor').value,
        flat: document.getElementById('flat').value,
        priority: document.getElementById('priority').value,
        preferredDate: document.getElementById('preferredDate').value || undefined,
        preferredTime: document.getElementById('preferredTime').value || undefined,
        image,
        attachment,
        additionalNotes: document.getElementById('additionalNotes').value || undefined,
      });
      toast.success('Complaint submitted successfully', `Your complaint ID: ${res.complaint.complaintId}`);
      form.reset();
      if (catSelect) loadCategoryOptions(catSelect);
      setTimeout(() => (window.location.href = 'complaints.html'), 800);
    } catch (err) {
      toast.error(err.message || 'Failed to submit complaint');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}
