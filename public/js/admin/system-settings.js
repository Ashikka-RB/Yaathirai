/* =========================================================
   system-settings.js — Super Admin: system-level settings
   Depends on: js/admin-common.js (window.YaathiraiAdmin)
   API: GET /api/superadmin/settings, PUT /api/superadmin/settings
   ========================================================= */

(function () {
  'use strict';

  const A = window.YaathiraiAdmin;
  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  let saving = false;
  let loadSeq = 0;

  function showLoading() {
    $('setLoading').hidden = false;
    $('setError').hidden = true;
    $('settingsForm').hidden = true;
  }
  function showError(message) {
    $('setLoading').hidden = true;
    $('settingsForm').hidden = true;
    $('setErrorText').textContent = message;
    $('setError').hidden = false;
  }
  function showForm() {
    $('setLoading').hidden = true;
    $('setError').hidden = true;
    $('settingsForm').hidden = false;
  }

  function setFormError(message) {
    const el = $('settingsFormError');
    el.textContent = message || '';
    el.hidden = !message;
  }

  function updateMaintenanceNotice() {
    $('maintenanceNotice').hidden = !$('setMaintenance').checked;
  }

  function fillForm(s) {
    $('setSiteName').value = s.site_name || '';
    $('setContactEmail').value = s.contact_email || '';
    $('setFee').value = s.platform_fee_percent === undefined ? '' : String(s.platform_fee_percent);
    $('setRegistrations').checked = !!s.allow_new_registrations;
    $('setMaintenance').checked = !!s.maintenance_mode;
    updateMaintenanceNotice();
    ['setSiteName', 'setContactEmail', 'setFee'].forEach((id) => $(id).classList.remove('is-invalid'));
  }

  async function api(url, method, body) {
    const opts = { method: method || 'GET', credentials: 'include', headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      throw new Error('Your session has expired. Please log in again.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }
    if (!res.ok || !data || !data.success) {
      throw new Error((data && data.error) || 'Request failed. Please try again.');
    }
    return data;
  }

  function showUpdated(ts) {
    $('lastUpdated').textContent = ts ? 'LAST SAVED ' + new Date(ts).toLocaleString('en-IN') : '';
  }

  async function load() {
    const seq = ++loadSeq;
    showLoading();
    try {
      const data = await api('/api/superadmin/settings');
      if (seq !== loadSeq) return;
      fillForm(data.settings || {});
      showUpdated(data.updated_at);
      setFormError('');
      showForm();
    } catch (err) {
      if (seq !== loadSeq) return;
      console.error('[Settings] load failed', err);
      showError(err.message || 'Failed to load system settings.');
    }
  }

  function validate() {
    const siteName = $('setSiteName').value.trim();
    const email = $('setContactEmail').value.trim();
    const feeRaw = $('setFee').value.trim();
    const fee = feeRaw === '' ? NaN : Number(feeRaw);
    const errors = [];
    const bad = [];

    if (!siteName || siteName.length > 80) { errors.push('Site name must be 1–80 characters.'); bad.push('setSiteName'); }
    if (!EMAIL_RE.test(email)) { errors.push('Enter a valid contact email.'); bad.push('setContactEmail'); }
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) { errors.push('Platform fee must be a number between 0 and 100.'); bad.push('setFee'); }

    ['setSiteName', 'setContactEmail', 'setFee'].forEach((id) => $(id).classList.toggle('is-invalid', bad.includes(id)));

    return {
      errors,
      payload: {
        site_name: siteName,
        contact_email: email,
        platform_fee_percent: fee,
        allow_new_registrations: $('setRegistrations').checked,
        maintenance_mode: $('setMaintenance').checked
      }
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const { errors, payload } = validate();
    if (errors.length) { setFormError(errors.join(' ')); return; }
    setFormError('');

    saving = true;
    $('saveSettingsBtn').disabled = true;
    $('saveSettingsBtn').textContent = 'Saving...';
    try {
      const data = await api('/api/superadmin/settings', 'PUT', payload);
      fillForm(data.settings || payload);
      showUpdated(new Date().toISOString());
      A.showToast('Settings saved.', 'success');
    } catch (err) {
      setFormError(err.message);
    } finally {
      saving = false;
      $('saveSettingsBtn').disabled = false;
      $('saveSettingsBtn').textContent = 'Save Settings';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await A.checkAuth(['super_admin']);
    if (!user) return;

    $('settingsForm').addEventListener('submit', onSubmit);
    $('setMaintenance').addEventListener('change', updateMaintenanceNotice);
    $('discardBtn').addEventListener('click', load);
    $('setRetryBtn').addEventListener('click', load);

    load();
  });
})();