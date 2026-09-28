/* ========================================
   Apartment Care - Auth page helpers
   ======================================== */
function loadApartmentOptions(select, options) {
  if (!select) return;
  const defaultOptions = [
    'Green Valley Apartments',
    'Sunrise Apartments',
    'Lakeview Residency',
    'Maple Heights',
    'Royal Towers',
  ];
  const list = (options && options.length ? options : defaultOptions).filter(
    (o, i, arr) => arr.indexOf(o) === i
  );
  const placeholder = select.getAttribute('data-placeholder') || 'Select Apartment';
  select.innerHTML = `<option value="">${placeholder}</option>`;
  list.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  });
}

function handleAuthError(err) {
  const msg = err.message || 'Server connection failed.';
  toast.error(msg);
  return msg;
}

/* Exhibition note: Autofill apartment options from backend categories is optional.
   For registration, we use curated apartment list. */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => togglePassword(btn));
  });
});
