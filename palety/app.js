'use strict';

// ── COUNTRY FLAGS ──────────────────────────────────────────────────────────────
const COUNTRY_FLAGS = {
  PL:'🇵🇱', DE:'🇩🇪', FR:'🇫🇷', RO:'🇷🇴', IT:'🇮🇹', ES:'🇪🇸',
  CZ:'🇨🇿', SK:'🇸🇰', HU:'🇭🇺', NL:'🇳🇱', BE:'🇧🇪', AT:'🇦🇹',
  CH:'🇨🇭', SE:'🇸🇪', DK:'🇩🇰', NO:'🇳🇴', FI:'🇫🇮', PT:'🇵🇹',
  GR:'🇬🇷', BG:'🇧🇬', HR:'🇭🇷', SI:'🇸🇮', LT:'🇱🇹', LV:'🇱🇻',
  EE:'🇪🇪', RS:'🇷🇸', UA:'🇺🇦', GB:'🇬🇧', IE:'🇮🇪', LU:'🇱🇺',
};

function getFlag(code) {
  if (!code) return '';
  const key = code.trim().toUpperCase();
  return COUNTRY_FLAGS[key] ? COUNTRY_FLAGS[key] + ' ' + key : key;
}

// ── STATE ──────────────────────────────────────────────────────────────────────
let pallets = [];
let editingId = null;

function load() {
  try { pallets = JSON.parse(localStorage.getItem('palety') || '[]'); }
  catch { pallets = []; }
}

function save() {
  localStorage.setItem('palety', JSON.stringify(pallets));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── DOM REFS ───────────────────────────────────────────────────────────────────
const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const tbody          = document.getElementById('tbody');
const emptyState     = document.getElementById('empty-state');
const tableWrapper   = document.getElementById('table-wrapper');
const headerCount    = document.getElementById('header-count');
const toastEl        = document.getElementById('toast');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmMsg     = document.getElementById('confirm-msg');
const confirmYes     = document.getElementById('confirm-yes');
const confirmNo      = document.getElementById('confirm-no');
const installBanner  = document.getElementById('install-banner');

// form fields
const fSize     = document.getElementById('f-size');
const fCountry  = document.getElementById('f-country');
const fCompany  = document.getElementById('f-company');
const fCarrier  = document.getElementById('f-carrier');
const fCarrierOther = document.getElementById('f-carrier-other');
const otherWrap = document.getElementById('other-carrier-input');
const btnPacked   = { yes: document.getElementById('packed-yes'), no: document.getElementById('packed-no') };
const btnMessage  = { yes: document.getElementById('msg-yes'),    no: document.getElementById('msg-no') };

let formPacked  = false;
let formMessage = false;

// ── TOGGLE HELPERS ─────────────────────────────────────────────────────────────
function setToggle(btns, val) {
  btns.yes.classList.toggle('active-yes', val);
  btns.no.classList.toggle('active-no', !val);
}

function wireToggle(btns, getSet) {
  btns.yes.addEventListener('click', () => { getSet(true);  setToggle(btns, true); });
  btns.no.addEventListener('click',  () => { getSet(false); setToggle(btns, false); });
}

wireToggle(btnPacked,  v => { formPacked  = v; });
wireToggle(btnMessage, v => { formMessage = v; });

fCarrier.addEventListener('change', () => {
  otherWrap.style.display = fCarrier.value === 'other' ? 'block' : 'none';
});

// ── MODAL ──────────────────────────────────────────────────────────────────────
function openModal(id = null) {
  editingId = id;
  if (id) {
    const p = pallets.find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = 'Edytuj paletę';
    fSize.value    = p.size;
    fCountry.value = p.country;
    fCompany.value = p.company;
    formPacked     = p.packed;
    formMessage    = p.message;
    fCarrier.value = p.carrier;
    fCarrierOther.value = p.carrierOther || '';
    otherWrap.style.display = p.carrier === 'other' ? 'block' : 'none';
  } else {
    modalTitle.textContent = 'Dodaj paletę';
    document.getElementById('pallet-form').reset();
    formPacked  = false;
    formMessage = false;
    fCarrier.value = '';
    otherWrap.style.display = 'none';
    fCarrierOther.value = '';
  }
  setToggle(btnPacked,  formPacked);
  setToggle(btnMessage, formMessage);
  modalOverlay.classList.add('open');
  setTimeout(() => fSize.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

document.getElementById('btn-add').addEventListener('click', () => openModal());
document.getElementById('btn-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ── FORM SUBMIT ────────────────────────────────────────────────────────────────
document.getElementById('pallet-form').addEventListener('submit', e => {
  e.preventDefault();

  const carrier = fCarrier.value;
  if (!carrier) { showToast('Wybierz przewoźnika'); return; }

  const pallet = {
    id:           editingId || uid(),
    size:         fSize.value.trim(),
    country:      fCountry.value.trim().toUpperCase(),
    company:      fCompany.value.trim(),
    packed:       formPacked,
    carrier,
    carrierOther: carrier === 'other' ? fCarrierOther.value.trim() : '',
    message:      formMessage,
    createdAt:    editingId ? (pallets.find(x=>x.id===editingId)?.createdAt || Date.now()) : Date.now(),
  };

  if (editingId) {
    const idx = pallets.findIndex(x => x.id === editingId);
    pallets[idx] = pallet;
    showToast('Paleta zaktualizowana');
  } else {
    pallets.unshift(pallet);
    showToast('Paleta dodana');
  }

  save();
  render();
  closeModal();
});

// ── DELETE ─────────────────────────────────────────────────────────────────────
function deletePallet(id) {
  confirm2('Usunąć tę paletę?', () => {
    pallets = pallets.filter(x => x.id !== id);
    save();
    render();
    showToast('Paleta usunięta');
  });
}

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!pallets.length) { showToast('Brak palet do usunięcia'); return; }
  confirm2('Czy na pewno chcesz usunąć wszystkie palety?', () => {
    pallets = [];
    save();
    render();
    showToast('Wszystkie palety usunięte');
  });
});

// ── CONFIRM DIALOG ─────────────────────────────────────────────────────────────
let confirmCallback = null;

function confirm2(msg, cb) {
  confirmMsg.textContent = msg;
  confirmCallback = cb;
  confirmOverlay.classList.add('open');
}

confirmYes.addEventListener('click', () => {
  confirmOverlay.classList.remove('open');
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

confirmNo.addEventListener('click', () => {
  confirmOverlay.classList.remove('open');
  confirmCallback = null;
});

// ── CARRIER LABEL ──────────────────────────────────────────────────────────────
function carrierLabel(p) {
  if (p.carrier === 'raben')   return 'Raben';
  if (p.carrier === 'geis')    return 'Geis';
  if (p.carrier === 'schenker') return 'Schenker';
  return p.carrierOther || 'Inny';
}

function carrierClass(carrier) {
  if (carrier === 'raben')    return 'carrier-raben';
  if (carrier === 'geis')     return 'carrier-geis';
  if (carrier === 'schenker') return 'carrier-schenker';
  return 'carrier-other';
}

// ── RENDER ─────────────────────────────────────────────────────────────────────
function render() {
  headerCount.textContent = pallets.length + (pallets.length === 1 ? ' paleta' : pallets.length < 5 ? ' palety' : ' palet');

  if (!pallets.length) {
    emptyState.style.display  = 'block';
    tableWrapper.style.display = 'none';
    return;
  }

  emptyState.style.display  = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = pallets.map(p => `
    <tr>
      <td class="cell-country">${getFlag(p.country)}</td>
      <td>${escHtml(p.size)}</td>
      <td>${escHtml(p.company)}</td>
      <td class="${p.packed ? 'cell-yes' : 'cell-no'}">${p.packed ? 'TAK' : 'NIE'}</td>
      <td class="${carrierClass(p.carrier)}">${escHtml(carrierLabel(p))}</td>
      <td class="${p.message ? 'cell-yes' : 'cell-no'}">${p.message ? 'TAK' : 'NIE'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit" onclick="openModal('${p.id}')">✏️ Edytuj</button>
          <button class="btn btn-sm btn-delete" onclick="deletePallet('${p.id}')">🗑️ Usuń</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── TOAST ──────────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ── PWA INSTALL BANNER (Android) ───────────────────────────────────────────────
let deferredInstall = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  installBanner.classList.add('show');
});

document.getElementById('btn-install').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const result = await deferredInstall.userChoice;
  if (result.outcome === 'accepted') installBanner.classList.remove('show');
  deferredInstall = null;
});

document.getElementById('btn-install-dismiss').addEventListener('click', () => {
  installBanner.classList.remove('show');
});

// ── SERVICE WORKER ─────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── INIT ───────────────────────────────────────────────────────────────────────
load();
render();
