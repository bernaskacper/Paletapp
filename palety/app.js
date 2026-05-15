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
  return COUNTRY_FLAGS[key] ? COUNTRY_FLAGS[key] + ' ' + key : key;
}

// ── STATE ──────────────────────────────────────────────────────────────────────
let items = [];
let editingId = null;

function load() {
  // Clear old format (incompatible with new pallet structure)
  localStorage.removeItem('palety');
  try { items = JSON.parse(localStorage.getItem('palety_v2') || '[]'); }
  catch { items = []; }
}

function save() {
  localStorage.setItem('palety_v2', JSON.stringify(items));
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
const copyBar        = document.getElementById('copy-bar');
const palletsList    = document.getElementById('pallets-list');

// form fields
const fCountry  = document.getElementById('f-country');
const fCompany  = document.getElementById('f-company');
const fCarrier  = document.getElementById('f-carrier');
const btnPacked  = { yes: document.getElementById('packed-yes'), no: document.getElementById('packed-no') };
const btnMessage = { yes: document.getElementById('msg-yes'),    no: document.getElementById('msg-no') };

let formPacked  = false;
let formMessage = false;

// ── TOGGLE HELPERS ─────────────────────────────────────────────────────────────
function setToggle(btns, val) {
  btns.yes.classList.toggle('active-yes', val);
  btns.yes.classList.toggle('active-no', false);
  btns.no.classList.toggle('active-no', !val);
  btns.no.classList.toggle('active-yes', false);
}

function wireToggle(btns, setter) {
  btns.yes.addEventListener('click', () => { setter(true);  setToggle(btns, true); });
  btns.no.addEventListener('click',  () => { setter(false); setToggle(btns, false); });
}

wireToggle(btnPacked,  v => { formPacked  = v; });
wireToggle(btnMessage, v => { formMessage = v; });

// ── ENTER KEY NAVIGATION ───────────────────────────────────────────────────────
document.getElementById('pallet-form').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  e.preventDefault();

  const form = document.getElementById('pallet-form');
  const focusable = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled])'));
  const idx = focusable.indexOf(e.target);
  if (idx !== -1 && idx < focusable.length - 1) {
    focusable[idx + 1].focus();
  }
});

// ── PALLET ROWS ────────────────────────────────────────────────────────────────
function createPalletRow(wymiary = '', waga = '', ilosc = 1) {
  const div = document.createElement('div');
  div.className = 'pallet-row';
  div.innerHTML =
    '<input type="text"   class="p-wymiary" placeholder="200x80x60" autocomplete="off" autocorrect="off" enterkeyhint="next" />' +
    '<input type="text"   class="p-waga"    placeholder="np. 500kg" autocomplete="off" enterkeyhint="next" />' +
    '<input type="number" class="p-ilosc"   min="1" value="1" enterkeyhint="next" />' +
    '<button type="button" class="btn-remove-pallet" title="Usuń paletę">✕</button>';

  div.querySelector('.p-wymiary').value = wymiary;
  div.querySelector('.p-waga').value    = waga;
  div.querySelector('.p-ilosc').value   = ilosc;

  div.querySelector('.btn-remove-pallet').addEventListener('click', () => {
    if (palletsList.querySelectorAll('.pallet-row').length > 1) {
      div.remove();
    } else {
      showToast('Minimum jedna paleta jest wymagana');
    }
  });

  return div;
}

document.getElementById('btn-add-pallet').addEventListener('click', () => {
  palletsList.appendChild(createPalletRow());
  palletsList.lastElementChild.querySelector('.p-wymiary').focus();
});

// ── MODAL ──────────────────────────────────────────────────────────────────────
function openModal(id = null) {
  editingId = id;
  palletsList.innerHTML = '';

  if (id) {
    const item = items.find(x => x.id === id);
    if (!item) return;
    modalTitle.textContent = 'Edytuj paletę';
    fCountry.value  = item.country;
    fCompany.value  = item.company;
    fCarrier.value  = item.carrier || '';
    formPacked      = item.packed;
    formMessage     = item.message;

    const rows = (item.pallets && item.pallets.length) ? item.pallets : [{ wymiary:'', waga:'', ilosc:1 }];
    rows.forEach(p => palletsList.appendChild(createPalletRow(p.wymiary, p.waga, p.ilosc)));
  } else {
    modalTitle.textContent = 'Dodaj paletę';
    fCountry.value  = '';
    fCompany.value  = '';
    fCarrier.value  = '';
    formPacked      = false;
    formMessage     = false;
    palletsList.appendChild(createPalletRow());
  }

  setToggle(btnPacked,  formPacked);
  setToggle(btnMessage, formMessage);
  modalOverlay.classList.add('open');
  setTimeout(() => fCountry.focus(), 100);
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

  const palletsData = [];
  palletsList.querySelectorAll('.pallet-row').forEach(row => {
    const wymiary = row.querySelector('.p-wymiary').value.trim();
    const waga    = row.querySelector('.p-waga').value.trim();
    const ilosc   = Math.max(1, parseInt(row.querySelector('.p-ilosc').value, 10) || 1);
    if (wymiary) palletsData.push({ wymiary, waga, ilosc });
  });

  const item = {
    id:        editingId || uid(),
    country:   fCountry.value.trim().toUpperCase(),
    company:   fCompany.value.trim(),
    carrier:   fCarrier.value,
    packed:    formPacked,
    message:   formMessage,
    pallets:   palletsData,
    createdAt: editingId ? (items.find(x => x.id === editingId)?.createdAt || Date.now()) : Date.now(),
  };

  if (editingId) {
    const idx = items.findIndex(x => x.id === editingId);
    items[idx] = item;
    showToast('Paleta zaktualizowana');
  } else {
    items.unshift(item);
    showToast('Paleta dodana');
  }

  save();
  render();
  closeModal();
});

// ── DELETE ─────────────────────────────────────────────────────────────────────
function deleteEntry(id) {
  confirm2('Usunąć tę pozycję?', () => {
    items = items.filter(x => x.id !== id);
    save();
    render();
    showToast('Pozycja usunięta');
  });
}

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!items.length) { showToast('Brak palet do usunięcia'); return; }
  confirm2('Czy na pewno chcesz usunąć wszystkie palety?', () => {
    items = [];
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

// ── CARRIER HELPERS ────────────────────────────────────────────────────────────
function carrierLabel(carrier) {
  if (carrier === 'raben') return 'Raben';
  if (carrier === 'geis')  return 'Geis';
  if (carrier === 'dsv')   return 'DSV';
  if (carrier === 'other') return 'Inny';
  return '—';
}

function rowClass(carrier) {
  if (carrier === 'raben') return 'row-raben';
  if (carrier === 'geis')  return 'row-geis';
  if (carrier === 'dsv')   return 'row-dsv';
  if (carrier === 'other') return 'row-other';
  return 'row-none';
}

// ── RENDER PALLETS CELL ────────────────────────────────────────────────────────
function renderPallets(pallets) {
  if (!pallets || !pallets.length) return '—';
  const lines = pallets
    .filter(p => p.wymiary)
    .map(p => {
      let line = escHtml(p.wymiary);
      if (p.waga)    line += ' / ' + escHtml(p.waga);
      if (p.ilosc > 1) line += ' / ' + p.ilosc + 'szt.';
      return line;
    });
  return lines.length ? lines.join('<br>') : '—';
}

// ── COPY BUTTONS ───────────────────────────────────────────────────────────────
const COPY_CARRIERS = ['raben', 'geis', 'dsv', 'other'];

function buildCopyText(carrier) {
  const relevant = items.filter(item => item.carrier === carrier);
  const lines = [];
  relevant.forEach(item => {
    (item.pallets || []).forEach(p => {
      if (!p.wymiary) return;
      let line = '* ' + p.wymiary;
      if (p.ilosc > 1) line += ' ' + p.ilosc + 'szt.';
      lines.push(line);
    });
  });
  if (!lines.length) return null;
  return 'Witam, palety do odbioru na dziś:\n\n' + lines.join('\n');
}

function setupCopyButtons() {
  let anyVisible = false;

  COPY_CARRIERS.forEach(carrier => {
    const btn = document.getElementById('copy-' + carrier);
    if (!btn) return;

    const hasData = items.some(item =>
      item.carrier === carrier &&
      (item.pallets || []).some(p => p.wymiary)
    );

    btn.style.display = hasData ? '' : 'none';
    if (hasData) anyVisible = true;

    btn.onclick = () => {
      const text = buildCopyText(carrier);
      if (!text) { showToast('Brak palet dla tego kuriera'); return; }

      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Skopiowano!';
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
      }).catch(() => showToast('Nie można skopiować — sprawdź uprawnienia'));
    };
  });

  copyBar.style.display = anyVisible ? '' : 'none';
}

// ── RENDER ─────────────────────────────────────────────────────────────────────
function render() {
  const count = items.length;
  headerCount.textContent = count + (count === 1 ? ' pozycja' : count < 5 ? ' pozycje' : ' pozycji');

  if (!count) {
    emptyState.style.display  = 'block';
    tableWrapper.style.display = 'none';
    copyBar.style.display      = 'none';
    return;
  }

  emptyState.style.display  = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = items.map(item => `
    <tr class="${rowClass(item.carrier)}">
      <td class="cell-country">${getFlag(item.country)}</td>
      <td>${escHtml(item.company)}</td>
      <td class="cell-size">${renderPallets(item.pallets)}</td>
      <td>${escHtml(carrierLabel(item.carrier))}</td>
      <td class="${item.packed ? 'cell-yes' : 'cell-no'}">${item.packed ? 'TAK' : 'NIE'}</td>
      <td class="${item.message ? 'cell-yes' : 'cell-no'}">${item.message ? 'TAK' : 'NIE'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit"   onclick="openModal('${item.id}')">✏️ Edytuj</button>
          <button class="btn btn-sm btn-delete" onclick="deleteEntry('${item.id}')">🗑️ Usuń</button>
        </div>
      </td>
    </tr>
  `).join('');

  setupCopyButtons();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
