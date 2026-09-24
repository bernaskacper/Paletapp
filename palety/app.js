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

// ── DATES ──────────────────────────────────────────────────────────────────────
// Local date as YYYY-MM-DD (offset in days: 0 = today, 1 = tomorrow)
function dayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function shortDate(str) {
  const [, m, d] = str.split('-');
  return d + '.' + m;
}

// ── STATE ──────────────────────────────────────────────────────────────────────
let items = [];
let editingId = null;
let activeTab = 'today';   // 'today' | 'tomorrow'
let renderedDay = null;

function load() {
  // Clear old format (incompatible with new pallet structure)
  localStorage.removeItem('palety');
  try { items = JSON.parse(localStorage.getItem('palety_v2') || '[]'); }
  catch { items = []; }

  // Entries from before tabs existed have no date — assign today
  const today = dayStr(0);
  let migrated = false;
  items.forEach(item => { if (!item.date) { item.date = today; migrated = true; } });
  if (migrated) save();
}

// Today tab also holds overdue entries from previous days
function isToday(item)    { return item.date <= dayStr(0); }
function visibleItems()   { return items.filter(item => (activeTab === 'today') === isToday(item)); }

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
const btnDay     = { today: document.getElementById('day-today'), tomorrow: document.getElementById('day-tomorrow') };
const tabBtns    = { today: document.getElementById('tab-today'), tomorrow: document.getElementById('tab-tomorrow') };

let formDay = 'today';

// ── DAY TOGGLE ─────────────────────────────────────────────────────────────────
function setDay(day) {
  formDay = day;
  btnDay.today.classList.toggle('active-day', day === 'today');
  btnDay.tomorrow.classList.toggle('active-day', day === 'tomorrow');
}

btnDay.today.addEventListener('click',    () => setDay('today'));
btnDay.tomorrow.addEventListener('click', () => setDay('tomorrow'));

// ── TABS ───────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  render();
}

tabBtns.today.addEventListener('click',    () => switchTab('today'));
tabBtns.tomorrow.addEventListener('click', () => switchTab('tomorrow'));

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
    setDay(isToday(item) ? 'today' : 'tomorrow');

    const rows = (item.pallets && item.pallets.length) ? item.pallets : [{ wymiary:'', waga:'', ilosc:1 }];
    rows.forEach(p => palletsList.appendChild(createPalletRow(p.wymiary, p.waga, p.ilosc)));
  } else {
    modalTitle.textContent = 'Dodaj paletę';
    fCountry.value  = '';
    fCompany.value  = '';
    fCarrier.value  = '';
    // Pallets are usually reported a day ahead — Today is the exception
    setDay('tomorrow');
    palletsList.appendChild(createPalletRow());
  }

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

  // Keep an overdue entry's original date while it stays on Today
  const existing = editingId ? items.find(x => x.id === editingId) : null;
  const today = dayStr(0);
  let date = formDay === 'tomorrow' ? dayStr(1) : today;
  if (formDay === 'today' && existing && existing.date < today) date = existing.date;

  const item = {
    id:        editingId || uid(),
    date,
    country:   fCountry.value.trim().toUpperCase(),
    company:   fCompany.value.trim(),
    carrier:   fCarrier.value,
    pallets:   palletsData,
    createdAt: editingId ? (items.find(x => x.id === editingId)?.createdAt || Date.now()) : Date.now(),
  };

  if (editingId) {
    const idx = items.findIndex(x => x.id === editingId);
    items[idx] = item;
    showToast('Paleta zaktualizowana');
  } else {
    items.unshift(item);
    showToast(formDay === activeTab ? 'Paleta dodana'
      : 'Paleta dodana na ' + (formDay === 'today' ? 'dziś' : 'jutro'));
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
  const toRemove = visibleItems();
  if (!toRemove.length) { showToast('Brak palet do usunięcia'); return; }
  const tabName = activeTab === 'today' ? 'Dziś' : 'Jutro';
  confirm2('Czy na pewno chcesz usunąć wszystkie palety z zakładki „' + tabName + '”?', () => {
    items = items.filter(x => !toRemove.includes(x));
    save();
    render();
    showToast('Palety z zakładki „' + tabName + '” usunięte');
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
  const relevant = visibleItems().filter(item => item.carrier === carrier);
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

function setupCopyButtons(shown) {
  let anyVisible = false;

  COPY_CARRIERS.forEach(carrier => {
    const btn = document.getElementById('copy-' + carrier);
    if (!btn) return;

    const hasData = shown.some(item =>
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
function pluralPozycja(n) {
  if (n === 1) return 'pozycja';
  const last = n % 10, last2 = n % 100;
  return (last >= 2 && last <= 4 && (last2 < 12 || last2 > 14)) ? 'pozycje' : 'pozycji';
}

function renderTabs() {
  const today = dayStr(0);
  const countToday = items.filter(isToday).length;
  const counts = { today: countToday, tomorrow: items.length - countToday };
  const dates  = { today, tomorrow: dayStr(1) };

  ['today', 'tomorrow'].forEach(tab => {
    const btn = tabBtns[tab];
    btn.classList.toggle('active', activeTab === tab);
    btn.setAttribute('aria-selected', activeTab === tab);
    btn.querySelector('.tab-date').textContent  = shortDate(dates[tab]);
    btn.querySelector('.tab-count').textContent = counts[tab];
  });
}

function render() {
  const today = dayStr(0);
  renderedDay = today;
  renderTabs();

  const shown = visibleItems();
  const count = shown.length;
  headerCount.textContent = count + ' ' + pluralPozycja(count);

  if (!count) {
    emptyState.querySelector('p').innerHTML =
      'Brak palet na ' + (activeTab === 'today' ? 'dziś' : 'jutro') +
      '.<br>Dodaj paletę klikając przycisk powyżej.';
    emptyState.style.display  = 'block';
    tableWrapper.style.display = 'none';
    copyBar.style.display      = 'none';
    return;
  }

  emptyState.style.display  = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = shown.map(item => `
    <tr class="${rowClass(item.carrier)}">
      <td class="cell-country">${getFlag(item.country)}</td>
      <td>${escHtml(item.company)}${item.date < today
        ? `<span class="badge-overdue">z ${shortDate(item.date)}</span>` : ''}</td>
      <td class="cell-size">${renderPallets(item.pallets)}</td>
      <td>${escHtml(carrierLabel(item.carrier))}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit"   onclick="openModal('${item.id}')">✏️ Edytuj</button>
          <button class="btn btn-sm btn-delete" onclick="deleteEntry('${item.id}')">🗑️ Usuń</button>
        </div>
      </td>
    </tr>
  `).join('');

  setupCopyButtons(shown);
}

// Re-render after midnight so Tomorrow's entries move to Today
function checkDayChange() {
  if (dayStr(0) !== renderedDay) render();
}

setInterval(checkDayChange, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayChange(); });

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
