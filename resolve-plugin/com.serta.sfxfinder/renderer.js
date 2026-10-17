// QuickSFX — renderer (UI logic). Talks to the local Python engine on 127.0.0.1:8765.
const API = 'http://127.0.0.1:8765';
const ALL_SOURCES = ['pixabay', 'mixkit', 'myinstants', 'freesound'];
const SRC_LABEL = { pixabay: 'Pixabay', mixkit: 'Mixkit', myinstants: 'MyInstants', freesound: 'Freesound' };

const TAGS_DATA = [
  { id: '', tr: 'Keşfet', en: 'Explore' },
  { id: 'whoosh', tr: 'Whoosh', en: 'Whoosh' },
  { id: 'impact', tr: 'Impact', en: 'Impact' },
  { id: 'riser', tr: 'Riser', en: 'Riser' },
  { id: 'glitch', tr: 'Glitch', en: 'Glitch' },
  { id: 'transition', tr: 'Geçiş', en: 'Transition' },
  { id: 'pop', tr: 'Pop', en: 'Pop' },
  { id: 'click', tr: 'Click', en: 'Click' },
  { id: 'meme', tr: 'Meme', en: 'Meme' },
  { id: 'vine boom', tr: 'Vine boom', en: 'Vine boom' },
  { id: 'laugh', tr: 'Kahkaha', en: 'Laugh' },
  { id: 'fail', tr: 'Fail', en: 'Fail' },
  { id: 'foley', tr: 'Foley', en: 'Foley' },
  { id: 'footsteps', tr: 'Adım', en: 'Footsteps' },
  { id: 'ambience', tr: 'Ambiyans', en: 'Ambience' },
  { id: 'horror', tr: 'Korku', en: 'Horror' },
  { id: 'cartoon', tr: 'Karikatür', en: 'Cartoon' },
  { id: 'camera shutter', tr: 'Kamera', en: 'Camera' }
];

const I18N = {
  tr: {
    searchPlaceholder: 'Ses ara…',
    statusConnected: 'DaVinci Resolve bağlı',
    statusDisconnected: 'Resolve bağlı değil',
    statusNoProject: 'Proje açık değil',
    statusConnecting: 'Motor bağlanıyor…',
    statusBooting: 'Motor başlatılıyor…',
    noResultsTitle: 'Sonuç yok',
    noResultsText: 'Farklı bir kelime ya da başka kaynaklar dene.',
    connErrorTitle: 'Bağlantı hatası',
    connErrorText: 'Ses motoruna ulaşılamadı.',
    loadMore: 'Daha fazlası için kaydır',
    loading: 'Yükleniyor…',
    loadFailed: 'Yüklenemedi — tekrar denemek için kaydır',
    atLeastOneSource: 'En az bir kaynak açık kalmalı',
    preparing: 'Hazırlanıyor… bir saniye sonra tekrar sürükle',
    previewFailed: 'Önizleme oynatılamadı',
    fileNotReady: 'Dosya hazırlanamadı',
    timeoutAction: 'İşlem zaman aşımına uğradı',
    engineNotResponding: 'Motor yanıt vermiyor',
    added: 'Eklendi',
    failedToAdd: 'Eklenemedi',
    pinned: 'Her zaman üstte',
    unpinned: 'Sabitleme kapalı',
    noSoundSelected: 'Önizleme başlat',
    addBtn: 'Ekle',
    menuPlayhead: 'İmlece ekle',
    menuAppend: 'Timeline sonuna ekle',
    menuPool: 'Sadece Media Pool',
    menuReveal: 'Klasörde göster',
    settingsTitle: 'QuickSFX Ayarları',
    langTitle: 'Dil / Language',
    themeTitle: 'Görünüm Teması',
    themeDark: '🌙 Koyu',
    themeLight: '☀️ Aydınlık',
    themeAuto: '💻 Sistem',
    insertModeTitle: 'Varsayılan Ekleme Modu',
    insertPlayhead: 'İmlece (Playhead)',
    insertAppend: 'Timeline Sona',
    insertPool: 'Media Pool',
    folderTitle: 'İndirme Klasörü',
    openFolder: 'Klasörü Aç',
    versionTitle: 'Sürüm & Güncellemeler',
    versionUpToDate: 'En son sürümü kullanıyorsunuz',
    versionUpdateAvailable: 'Yeni sürüm mevcut',
    checkUpdates: 'Güncellemeleri Denetle',
    checkingUpdates: 'Kontrol ediliyor…',
    updateNow: 'Güncelle',
    downloadUpdate: 'İndir ve Güncelle',
    downloadingUpdate: 'İndiriliyor…',
    installingUpdate: 'Uygulanıyor…',
    updateSuccess: 'Güncellendi! Yenileniyor…',
    updateFailed: 'Güncelleme başarısız',
    resetTest: 'Testi Sıfırla (v1.0.0)',
    shortcutsTitle: 'Klavye Kısayolları',
    shortcuts: [
      ['/', 'Arama kutusuna odaklan'],
      ['Space', 'Önizlemeyi Başlat / Durdur'],
      ['Enter', 'Seçili sesi timeline\'a ekle'],
      ['← / →', 'Seste 2 sn geri / ileri sar'],
      ['↑ / ↓', 'Listede yukarı / aşağı ses seç'],
      ['Esc', 'Aramayı veya pencereleri kapat']
    ]
  },
  en: {
    searchPlaceholder: 'Search sound effects…',
    statusConnected: 'DaVinci Resolve connected',
    statusDisconnected: 'Resolve not connected',
    statusNoProject: 'No project open',
    statusConnecting: 'Engine connecting…',
    statusBooting: 'Engine starting…',
    noResultsTitle: 'No results found',
    noResultsText: 'Try different keywords or toggle other sources.',
    connErrorTitle: 'Connection error',
    connErrorText: 'Could not reach local sound engine.',
    loadMore: 'Scroll for more',
    loading: 'Loading…',
    loadFailed: 'Failed to load — scroll to retry',
    atLeastOneSource: 'At least one source must remain active',
    preparing: 'Preparing… drop again in a second',
    previewFailed: 'Preview playback failed',
    fileNotReady: 'File could not be prepared',
    timeoutAction: 'Operation timed out',
    engineNotResponding: 'Engine not responding',
    added: 'Added',
    failedToAdd: 'Could not add',
    pinned: 'Always on top',
    unpinned: 'Pin disabled',
    noSoundSelected: 'Start preview',
    addBtn: 'Add',
    menuPlayhead: 'Add at Playhead',
    menuAppend: 'Append to Timeline',
    menuPool: 'Media Pool only',
    menuReveal: 'Show in Explorer',
    settingsTitle: 'QuickSFX Settings',
    langTitle: 'Language',
    themeTitle: 'Appearance Theme',
    themeDark: '🌙 Dark',
    themeLight: '☀️ Light',
    themeAuto: '💻 System',
    insertModeTitle: 'Default Insert Mode',
    insertPlayhead: 'At Playhead',
    insertAppend: 'At Timeline End',
    insertPool: 'Media Pool',
    folderTitle: 'Download Folder',
    openFolder: 'Open Folder',
    versionTitle: 'Version & Updates',
    versionUpToDate: 'Up to date',
    versionUpdateAvailable: 'New version available',
    checkUpdates: 'Check for Updates',
    checkingUpdates: 'Checking…',
    updateNow: 'Update',
    downloadUpdate: 'Download & Update',
    downloadingUpdate: 'Downloading…',
    installingUpdate: 'Applying…',
    updateSuccess: 'Updated! Reloading…',
    updateFailed: 'Update failed',
    resetTest: 'Reset Test (to v1.0.0)',
    shortcutsTitle: 'Keyboard Shortcuts',
    shortcuts: [
      ['/', 'Focus search input'],
      ['Space', 'Play / Pause preview'],
      ['Enter', 'Insert selected sound into timeline'],
      ['← / →', 'Seek 2s backward / forward'],
      ['↑ / ↓', 'Select previous / next sound'],
      ['Esc', 'Clear search or close modals']
    ]
  }
};

const TIMEOUT = { search: 16000, status: 4000, prefetch: 25000, action: 35000, health: 1500 };

const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

const state = {
  q: '', page: 1, loading: false, done: false, reqId: 0, searchCtl: null,
  sources: new Set(ALL_SOURCES),
  items: [], seen: new Set(), sel: -1,
  activeItem: null, playingId: null, paths: new Map(), pending: new Map(), ctxItem: null,
  loop: false, lastVolume: 0.8,
  prefs: {
    lang: localStorage.getItem('qsf_lang') || 'en',
    theme: localStorage.getItem('qsf_theme') || 'dark',
    insertMode: localStorage.getItem('qsf_insert_mode') || 'playhead'
  }
};

const list = $('#list'), audio = $('#audio'), input = $('#q');
const playerBar = $('#playerBar');
const pTitle = $('#pTitle'), pSrcTag = $('#pSrcTag'), pCurTime = $('#pCurTime'), pTotalTime = $('#pTotalTime');
const pProgress = $('#pProgress'), pThumb = $('#pThumb'), pTrack = $('#pTrack'), pSeekWrap = $('#pSeekWrap'), pTooltip = $('#pTooltip');
const pPlayBtn = $('#pPlayBtn'), pRewindBtn = $('#pRewindBtn'), pLoopBtn = $('#pLoopBtn'), pAddBtn = $('#pAddBtn');
const vol = $('#vol'), volBox = $('#volBox'), volFill = $('#volFill'), volPct = $('#volPct'), volMuteBtn = $('#volMuteBtn');
const settingsModal = $('#settingsModal');

// ---------------- icons ----------------
const ICON = {
  play: '<svg class="i-play" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>',
  plus: '<svg viewBox="0 0 16 16"><path d="M7.3 2.5h1.4v4.8h4.8v1.4H8.7v4.8H7.3V8.7H2.5V7.3h4.8z"/></svg>',
  grip: '<svg viewBox="0 0 16 16"><path d="M5.5 3a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2zm-5 4a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2zm-5 4a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z"/></svg>'
};

function t(key) {
  const dict = I18N[state.prefs.lang] || I18N.tr;
  return dict[key] || key;
}

// ---------------- helpers ----------------
async function api(path, { body, timeout = 10000, signal } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const opt = { signal: ctl.signal };
    if (body) Object.assign(opt, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const r = await fetch(API + path, opt);
    return await r.json();
  } finally {
    clearTimeout(t);
    signal?.removeEventListener('abort', onAbort);
  }
}

function fmt(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '00:00';
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let toastT;
function toast(msg, kind = 'ok') {
  const toastEl = $('#toast');
  toastEl.textContent = msg; toastEl.className = `toast show ${kind}`;
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// ---------------- engine boot ----------------
async function waitForEngine() {
  for (let i = 0; i < 40; i++) {
    try { const r = await api('/api/health', { timeout: TIMEOUT.health }); if (r && r.ok) return true; } catch (e) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// ---------------- status ----------------
let statusBusy = false;
async function refreshStatus() {
  if (statusBusy || document.hidden) return;
  statusBusy = true;
  try {
    const s = await api('/api/status', { timeout: TIMEOUT.status });
    const on = s.connected && s.project_open;
    $('#led').classList.toggle('on', !!on);
    $('#statusText').textContent = on ? (s.timeline_name ? `${s.project_name} · ${s.timeline_name}` : s.project_name)
      : (s.connected ? t('statusNoProject') : t('statusDisconnected'));
    $('#tc').textContent = on && s.timecode ? s.timecode : '';
  } catch (e) {
    $('#led').classList.remove('on');
    $('#statusText').textContent = t('statusConnecting');
  } finally {
    statusBusy = false;
  }
}

// ---------------- search ----------------
function skeleton(n = 7) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const s = el('div', 'skel');
    const c = el('div', 'b c'); const l = el('div'); l.style.flex = '1';
    const a = el('div', 'b'); a.style.cssText = `height:10px;width:${50 + Math.random() * 35}%`;
    const b = el('div', 'b'); b.style.cssText = 'height:8px;width:28%;margin-top:7px';
    l.append(a, b); s.append(c, l); frag.append(s);
  }
  list.replaceChildren(frag);
}

function showEmpty(title, text) {
  const e = el('div', 'empty'); e.append(el('b', null, title), document.createTextNode(text));
  list.replaceChildren(e);
}

async function search(reset = true) {
  if (!reset && (state.loading || state.done)) return;

  if (reset) {
    state.searchCtl?.abort();
    state.page = 1; state.done = false; state.sel = -1;
    list.scrollTop = 0;
    skeleton();
  }
  const ctl = new AbortController();
  state.searchCtl = ctl;
  state.loading = true;
  const id = ++state.reqId;
  const page = reset ? 1 : state.page + 1;
  const q = state.q;
  const src = [...state.sources].join(',');

  if (!reset) {
    $('.more')?.remove();
    list.append(el('div', 'more', t('loading')));
  }

  try {
    const data = await api(`/api/search?q=${encodeURIComponent(q)}&sources=${src}&page=${page}`,
      { timeout: TIMEOUT.search, signal: ctl.signal });
    if (id !== state.reqId) return;

    if (reset) { state.items = []; state.seen.clear(); list.replaceChildren(); }
    state.page = page;
    $('.more')?.remove();

    const fresh = (data.items || []).filter((it) => it && it.id && !state.seen.has(it.id));
    fresh.forEach((it) => state.seen.add(it.id));

    if (data.failed && data.failed.length && reset) {
      toast(`${data.failed.map((s) => SRC_LABEL[s] || s).join(', ')} yanıt vermedi`, 'err');
    }

    if (!fresh.length) {
      state.done = true;
      if (!state.items.length) showEmpty(t('noResultsTitle'), t('noResultsText'));
      return;
    }

    const start = state.items.length;
    state.items.push(...fresh);
    const frag = document.createDocumentFragment();
    fresh.forEach((it, i) => frag.append(renderRow(it, start + i)));
    frag.append(el('div', 'more', t('loadMore')));
    list.append(frag);

    if (reset && !q && state.sources.size === ALL_SOURCES.length) {
      try { localStorage.setItem('cached_items_feed', JSON.stringify(state.items.slice(0, 40))); } catch (e) {}
    }
  } catch (e) {
    if (id !== state.reqId || ctl.signal.aborted && state.searchCtl !== ctl) return;
    if (reset) {
      showEmpty(t('connErrorTitle'), e.name === 'AbortError' ? t('timeoutAction') : t('connErrorText'));
    } else {
      $('.more')?.remove();
      list.append(el('div', 'more', t('loadFailed')));
    }
  } finally {
    if (id === state.reqId) state.loading = false;
  }
}

// ---------------- rows ----------------
function renderRow(it, idx) {
  const row = el('div', 'row');
  row.dataset.src = it.source; row.dataset.idx = idx; row.dataset.id = it.id;
  row.draggable = true;

  const play = el('button', 'play'); play.innerHTML = ICON.play + ICON.pause; play.title = 'Önizle';
  const info = el('div', 'info');
  const title = el('div', 'title', it.name); title.title = it.name;
  const meta = el('div', 'meta');
  meta.append(el('span', 'dot'), el('span', null, SRC_LABEL[it.source] || it.source));
  const d = fmt(it.duration); if (d && d !== '00:00') meta.append(el('span', null, '·'), el('span', 'dur', d));
  info.append(title, meta);

  const acts = el('div', 'acts');
  const add = el('button', 'add'); add.innerHTML = ICON.plus; add.append(document.createTextNode(t('addBtn')));
  add.title = 'İmlece ekle (Enter / çift tık)';
  const grip = el('div', 'grip'); grip.innerHTML = ICON.grip; grip.title = "Timeline'a sürükle";
  acts.append(add, grip);
  row.append(play, info, acts);

  play.addEventListener('click', (e) => { e.stopPropagation(); select(idx); togglePlay(it); });
  add.addEventListener('click', (e) => { e.stopPropagation(); insert(it, state.prefs.insertMode, row, add); });
  play.addEventListener('dblclick', (e) => e.stopPropagation());
  add.addEventListener('dblclick', (e) => e.stopPropagation());
  row.addEventListener('click', () => select(idx));
  row.addEventListener('dblclick', () => insert(it, state.prefs.insertMode, row, add));
  row.addEventListener('contextmenu', (e) => { e.preventDefault(); select(idx); openCtx(e, it, row); });

  // Prefetch on hover
  let hoverT;
  row.addEventListener('mouseenter', () => { hoverT = setTimeout(() => prefetch(it), 300); });
  row.addEventListener('mouseleave', () => clearTimeout(hoverT));
  grip.addEventListener('mousedown', () => prefetch(it));
  row.addEventListener('dragstart', (e) => {
    e.preventDefault();
    const p = state.paths.get(it.id);
    if (p) { window.sfx?.startDrag(p); }
    else { toast(t('preparing'), 'err'); prefetch(it); }
  });

  if (state.playingId === it.id) row.classList.add('playing');
  return row;
}

function rowOf(id) { return id ? list.querySelector(`.row[data-id="${CSS.escape(id)}"]`) : null; }

function select(idx, scroll = false) {
  list.querySelector('.row.sel')?.classList.remove('sel');
  state.sel = idx;
  const r = list.querySelector(`.row[data-idx="${idx}"]`);
  if (r) { r.classList.add('sel'); if (scroll) r.scrollIntoView({ block: 'nearest' }); }
  if (state.items[idx]) {
    setActivePlayerItem(state.items[idx]);
  }
}

// ---------------- dedicated player bar & playback ----------------
function setActivePlayerItem(it) {
  state.activeItem = it;
  playerBar.classList.add('active');
  pTitle.textContent = it.name;
  pTitle.title = it.name;
  pSrcTag.textContent = SRC_LABEL[it.source] || it.source;
  pSrcTag.style.color = `var(--${it.source})`;
  pTotalTime.textContent = fmt(it.duration);
}

function clearPlayingUI() {
  list.querySelectorAll('.row.playing, .row.loading').forEach((r) => {
    r.classList.remove('playing', 'loading');
    r.querySelector('.play')?.style.setProperty('--p', 0);
  });
  document.body.classList.remove('playing');
}

function togglePlay(it) {
  if (!it) return;
  setActivePlayerItem(it);

  if (state.playingId === it.id && audio.src) {
    if (audio.paused || audio.ended) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => toast(t('previewFailed'), 'err'));
    } else {
      audio.pause();
    }
    return;
  }
  clearPlayingUI();
  state.playingId = it.id;
  rowOf(it.id)?.classList.add('loading');

  const streamUrl = state.paths.has(it.id)
    ? `${API}/api/audio/${encodeURIComponent(it.filename)}`
    : it.audio_url;
  audio.src = streamUrl;
  audio.loop = state.loop;
  audio.play().catch((e) => {
    if (e.name === 'AbortError') return;
    rowOf(it.id)?.classList.remove('loading');
    toast(t('previewFailed'), 'err');
  });
}

// Player bar controls
pPlayBtn.addEventListener('click', () => {
  if (state.activeItem) togglePlay(state.activeItem);
  else if (state.items.length) togglePlay(state.items[0]);
});

pRewindBtn.addEventListener('click', () => {
  if (audio.src) {
    audio.currentTime = Math.max(0, audio.currentTime - 2);
    updatePlayerScrubber();
  }
});

pLoopBtn.addEventListener('click', () => {
  state.loop = !state.loop;
  audio.loop = state.loop;
  pLoopBtn.classList.toggle('active', state.loop);
  toast(state.loop ? (state.prefs.lang === 'tr' ? 'Döngü açık' : 'Loop ON') : (state.prefs.lang === 'tr' ? 'Döngü kapalı' : 'Loop OFF'));
});

pAddBtn.addEventListener('click', () => {
  if (!state.activeItem) return;
  const r = rowOf(state.activeItem.id);
  insert(state.activeItem, state.prefs.insertMode, r, pAddBtn);
});

// Interactive Scrubber Seeking
function seekFromEvent(e) {
  if (!audio.duration) return;
  const rect = pTrack.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = frac * audio.duration;
  updatePlayerScrubber();
}

let isScrubbing = false;
pSeekWrap.addEventListener('mousedown', (e) => {
  isScrubbing = true;
  pSeekWrap.classList.add('dragging');
  seekFromEvent(e);
});
document.addEventListener('mousemove', (e) => {
  if (isScrubbing) {
    seekFromEvent(e);
  }
  if (audio.duration && pSeekWrap.matches(':hover')) {
    const rect = pTrack.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    pTooltip.textContent = fmt(frac * audio.duration);
    pTooltip.style.left = (frac * 100) + '%';
  }
});
document.addEventListener('mouseup', () => {
  if (isScrubbing) {
    isScrubbing = false;
    pSeekWrap.classList.remove('dragging');
  }
});

function updatePlayerScrubber() {
  if (!audio.duration) {
    pCurTime.textContent = '00:00';
    pProgress.style.width = '0%';
    pThumb.style.left = '0%';
    return;
  }
  const pct = (audio.currentTime / audio.duration) * 100;
  pProgress.style.width = pct + '%';
  pThumb.style.left = pct + '%';
  pCurTime.textContent = fmt(audio.currentTime);
  pTotalTime.textContent = fmt(audio.duration);
}

audio.addEventListener('playing', () => {
  const r = rowOf(state.playingId);
  r?.classList.remove('loading'); r?.classList.add('playing');
  document.body.classList.add('playing');
});
audio.addEventListener('pause', () => {
  rowOf(state.playingId)?.classList.remove('playing');
  document.body.classList.remove('playing');
});
audio.addEventListener('ended', () => {
  if (!state.loop) {
    clearPlayingUI();
    state.playingId = null;
    pProgress.style.width = '0%';
    pThumb.style.left = '0%';
    pCurTime.textContent = '00:00';
  }
});
audio.addEventListener('error', () => {
  if (!state.playingId) return;
  clearPlayingUI();
  state.playingId = null;
  toast(t('previewFailed'), 'err');
});
audio.addEventListener('timeupdate', () => {
  updatePlayerScrubber();
  if (!audio.duration) return;
  rowOf(state.playingId)?.querySelector('.play')?.style.setProperty('--p', audio.currentTime / audio.duration);
});

// ---------------- enhanced volume control ----------------
function updateVolumeUI(v) {
  audio.volume = v;
  vol.value = v;
  volFill.style.width = (v * 100) + '%';
  volPct.textContent = Math.round(v * 100) + '%';
  volBox.classList.toggle('muted', v <= 0.01);
  volBox.classList.toggle('mid', v > 0.01 && v < 0.45);
  localStorage.setItem('vol', v);
}

vol.addEventListener('input', (e) => {
  const v = +e.target.value;
  if (v > 0) state.lastVolume = v;
  updateVolumeUI(v);
});

volMuteBtn.addEventListener('click', () => {
  if (audio.volume > 0.01) {
    state.lastVolume = audio.volume;
    updateVolumeUI(0);
  } else {
    updateVolumeUI(state.lastVolume || 0.8);
  }
});

// Scroll over volume box changes volume smoothly
volBox.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  const next = Math.max(0, Math.min(1, Math.round((audio.volume + delta) * 100) / 100));
  if (next > 0) state.lastVolume = next;
  updateVolumeUI(next);
}, { passive: false });

// ---------------- download / insert ----------------
function prefetch(it) {
  if (state.paths.has(it.id)) return Promise.resolve(state.paths.get(it.id));
  if (state.pending.has(it.id)) return state.pending.get(it.id);
  const p = api('/api/prefetch', { body: { audio_url: it.audio_url, filename: it.filename }, timeout: TIMEOUT.prefetch })
    .then((r) => { if (r && r.success) { state.paths.set(it.id, r.local_path); return r.local_path; } return null; })
    .catch(() => null)
    .finally(() => state.pending.delete(it.id));
  state.pending.set(it.id, p);
  return p;
}

async function insert(it, mode, row, btn) {
  if (btn?.classList.contains('busy')) return;
  btn?.classList.add('busy');
  try {
    const r = await api('/api/action', { body: { audio_url: it.audio_url, filename: it.filename, source: it.source, mode }, timeout: TIMEOUT.action });
    if (r.local_path) state.paths.set(it.id, r.local_path);
    if (r.success) {
      toast(r.message || t('added'), 'ok');
      if (row) {
        row.classList.remove('added'); void row.offsetWidth; row.classList.add('added');
        setTimeout(() => row.classList.remove('added'), 1000);
      }
    } else {
      toast(r.error || t('failedToAdd'), 'err');
    }
  } catch (e) {
    toast(e.name === 'AbortError' ? t('timeoutAction') : t('engineNotResponding'), 'err');
  } finally {
    btn?.classList.remove('busy');
  }
}

// ---------------- context menu ----------------
const ctx = $('#ctx');
function openCtx(e, it, row) {
  state.ctxItem = { it, row };
  ctx.classList.add('show');
  const w = ctx.offsetWidth, h = ctx.offsetHeight;
  ctx.style.left = Math.min(e.clientX, innerWidth - w - 8) + 'px';
  ctx.style.top = Math.min(e.clientY, innerHeight - h - 8) + 'px';
}
document.addEventListener('mousedown', (e) => { if (!ctx.contains(e.target)) ctx.classList.remove('show'); });
ctx.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b || !state.ctxItem) return;
  ctx.classList.remove('show');
  const { it, row } = state.ctxItem;
  if (b.dataset.act === 'reveal') {
    const p = await prefetch(it);
    if (p) window.sfx?.reveal(p); else toast(t('fileNotReady'), 'err');
  } else insert(it, b.dataset.act, row, row?.querySelector('.add'));
});

// ---------------- tags & wheel scrolling ----------------
function buildTags() {
  const box = $('#tags');
  box.replaceChildren();
  const lang = state.prefs.lang;
  TAGS_DATA.forEach((item, i) => {
    const label = item[lang] || item.tr;
    const tBtn = el('button', 'tag' + (i === 0 ? ' on' : ''), label);
    tBtn.dataset.q = item.id;
    tBtn.addEventListener('click', () => { input.value = item.id; onQuery(item.id, true); });
    box.append(tBtn);
  });
}

function syncTags() {
  document.querySelectorAll('.tag').forEach((tBtn) => tBtn.classList.toggle('on', tBtn.dataset.q === state.q.toLowerCase()));
}

// Horizontal mouse wheel scrolling for quick tags
const tagsBox = $('#tags');
tagsBox.addEventListener('wheel', (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    tagsBox.scrollLeft += e.deltaY * 0.9;
  }
}, { passive: false });

let qT;
function onQuery(v, now = false) {
  $('.search').classList.toggle('has-q', !!v);
  clearTimeout(qT);
  const run = () => {
    const next = v.trim();
    if (next === state.q && state.items.length && !now) return;
    state.q = next; syncTags(); search(true);
  };
  now ? run() : (qT = setTimeout(run, 350));
}
input.addEventListener('input', (e) => onQuery(e.target.value));
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onQuery(input.value, true); } });
$('#clearQ').addEventListener('click', () => { input.value = ''; onQuery('', true); input.focus(); });

// Rapid source toggling is debounced into a single search.
let srcT;
document.querySelectorAll('.src').forEach((b) => b.addEventListener('click', () => {
  const s = b.dataset.src;
  if (state.sources.has(s)) {
    if (state.sources.size === 1) return toast(t('atLeastOneSource'), 'err');
    state.sources.delete(s);
  } else state.sources.add(s);
  b.classList.toggle('on', state.sources.has(s));
  localStorage.setItem('sources', [...state.sources].join(','));
  clearTimeout(srcT);
  srcT = setTimeout(() => search(true), 280);
}));

let scrollRaf = 0;
list.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    if (state.done || state.loading || !state.items.length) return;
    if (list.scrollTop + list.clientHeight > list.scrollHeight - 160) search(false);
  });
}, { passive: true });

// ---------------- keyboard controls ----------------
document.addEventListener('keydown', (e) => {
  const inInput = document.activeElement === input;
  if (e.key === '/' && !inInput) { e.preventDefault(); input.focus(); input.select(); return; }
  if (e.key === 'Escape') {
    ctx.classList.remove('show');
    settingsModal.classList.remove('show');
    if (inInput && input.value) { input.value = ''; onQuery('', true); } else input.blur();
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!state.items.length) return;
    const n = state.sel < 0 ? 0 : Math.max(0, Math.min(state.items.length - 1, state.sel + (e.key === 'ArrowDown' ? 1 : -1)));
    select(n, true); input.blur(); return;
  }
  if (!inInput) {
    if (e.key === ' ') {
      e.preventDefault();
      const it = state.items[state.sel] || state.activeItem;
      if (it) togglePlay(it);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const it = state.items[state.sel] || state.activeItem;
      if (it) { const r = rowOf(it.id); insert(it, state.prefs.insertMode, r, r?.querySelector('.add')); }
    }
    if (e.key === 'ArrowLeft' && audio.src) {
      e.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 2);
      updatePlayerScrubber();
    }
    if (e.key === 'ArrowRight' && audio.src) {
      e.preventDefault();
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 2);
      updatePlayerScrubber();
    }
  }
});

// ---------------- window controls ----------------
$('#closeBtn').addEventListener('click', () => { audio.pause(); window.sfx?.close(); });
$('#minBtn').addEventListener('click', () => window.sfx?.minimize());
$('#pinBtn').addEventListener('click', async () => {
  const on = await window.sfx?.togglePin();
  $('#pinBtn').classList.toggle('active', !!on);
  toast(on ? t('pinned') : t('unpinned'));
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });

window.sfx?.onHidden?.(() => {
  audio.pause();
  clearPlayingUI();
});

window.sfx?.onRestored?.(() => {
  refreshStatus();
});

// ---------------- settings & i18n & theme ----------------
function applyTheme(theme) {
  state.prefs.theme = theme;
  localStorage.setItem('qsf_theme', theme);
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('#themeButtons .pref-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === theme));
}

function applyInsertMode(mode) {
  state.prefs.insertMode = mode;
  localStorage.setItem('qsf_insert_mode', mode);
  document.querySelectorAll('#insertButtons .pref-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
}

function applyLanguage(lang) {
  state.prefs.lang = lang;
  localStorage.setItem('qsf_lang', lang);
  document.querySelectorAll('#langButtons .pref-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));

  // Update DOM labels
  input.placeholder = t('searchPlaceholder');
  $('#sTitle').textContent = t('settingsTitle');
  $('#sLangLabel').textContent = t('langTitle');
  $('#sThemeLabel').textContent = t('themeTitle');
  $('#sInsertLabel').textContent = t('insertModeTitle');
  $('#sFolderLabel').textContent = t('folderTitle');
  $('#openFolderBtn').textContent = t('openFolder');
  const sVer = $('#sVersionLabel');
  if (sVer) sVer.textContent = t('versionTitle');
  $('#sShortcutsLabel').textContent = t('shortcutsTitle');
  $('#themeDarkBtn').textContent = t('themeDark');
  $('#themeLightBtn').textContent = t('themeLight');
  $('#themeAutoBtn').textContent = t('themeAuto');
  $('#insPlayheadBtn').textContent = t('insertPlayhead');
  $('#insAppendBtn').textContent = t('insertAppend');
  $('#insPoolBtn').textContent = t('insertPool');
  $('#pAddLabel').textContent = t('addBtn');
  $('#mPlayhead').textContent = t('menuPlayhead');
  $('#mAppend').textContent = t('menuAppend');
  $('#mPool').textContent = t('menuPool');
  $('#mReveal').textContent = t('menuReveal');

  buildTags();
  syncTags();
  renderShortcuts();
  renderUpdateUI();
}

function renderShortcuts() {
  const grid = $('#shortcutsGrid');
  grid.replaceChildren();
  const list = I18N[state.prefs.lang]?.shortcuts || I18N.tr.shortcuts;
  list.forEach(([k, desc]) => {
    const row = el('div', 'shortcut-row');
    row.append(el('span', null, desc), el('kbd', null, k));
    grid.append(row);
  });
}

// Settings modal interactions
$('#settingsBtn').addEventListener('click', () => settingsModal.classList.add('show'));
$('#settingsCloseBtn').addEventListener('click', () => settingsModal.classList.remove('show'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('show'); });

document.querySelectorAll('#langButtons .pref-btn').forEach((b) => b.addEventListener('click', () => applyLanguage(b.dataset.lang)));
document.querySelectorAll('#themeButtons .pref-btn').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
document.querySelectorAll('#insertButtons .pref-btn').forEach((b) => b.addEventListener('click', () => applyInsertMode(b.dataset.mode)));

$('#openFolderBtn').addEventListener('click', async () => {
  try {
    await api('/api/open-folder', { body: {} });
    toast(state.prefs.lang === 'tr' ? 'Klasör açıldı' : 'Folder opened');
  } catch (e) {
    toast(t('engineNotResponding'), 'err');
  }
});

// ---------------- updates ----------------
let cachedUpdate = null;
let isUpdating = false;

function renderUpdateUI() {
  const badge = $('#updateBadge');
  const badgeText = $('#updateBadgeText');
  const vNum = $('#versionNum');
  const vStatus = $('#versionStatus');
  const chkBtn = $('#checkUpdateBtn');
  const resetBtn = $('#resetTestBtn');

  const curVer = cachedUpdate?.currentVersion || '1.0.0';
  if (vNum) vNum.textContent = `QuickSFX v${curVer}`;

  // If user updated to 1.1.1 in test mode, show button to reset back to 1.0.0 for re-testing
  if (resetBtn) {
    resetBtn.style.display = (curVer === '1.1.1') ? 'inline-block' : 'none';
    resetBtn.textContent = t('resetTest');
  }

  if (cachedUpdate && cachedUpdate.updateAvailable) {
    if (badge && badgeText) {
      const prefix = state.prefs.lang === 'tr' ? 'Güncelleme' : 'Update';
      const cleanVer = (cachedUpdate.latestVersion || '').replace(/^[^\d]*/, '');
      const verStr = cleanVer ? `V${cleanVer}` : '';
      badgeText.textContent = `${prefix} ${verStr}`.trim();
      badge.title = `${t('versionUpdateAvailable')}: ${verStr} (${t('updateNow')})`;
      badge.style.display = 'inline-flex';
    }
    if (vStatus) {
      vStatus.textContent = `${t('versionUpdateAvailable')}: v${cachedUpdate.latestVersion}`;
      vStatus.classList.add('has-update');
    }
    if (chkBtn) {
      chkBtn.textContent = t('downloadUpdate');
    }
  } else {
    if (badge) badge.style.display = 'none';
    if (vStatus) {
      vStatus.textContent = t('versionUpToDate');
      vStatus.classList.remove('has-update');
    }
    if (chkBtn) {
      chkBtn.textContent = t('checkUpdates');
    }
  }
}

async function handleUpdateClick() {
  if (isUpdating) return;
  if (!cachedUpdate || !cachedUpdate.updateAvailable) return;

  isUpdating = true;
  const badge = $('#updateBadge');
  const badgeText = $('#updateBadgeText');
  const chkBtn = $('#checkUpdateBtn');
  const vStatus = $('#versionStatus');

  if (badge) badge.classList.add('updating');
  if (chkBtn) chkBtn.disabled = true;

  const onProgress = (data) => {
    const pct = data.percent || 0;
    const stage = data.stage || 'downloading';
    let label = `${t('downloadingUpdate')} %${pct}`;
    if (stage === 'installing') label = t('installingUpdate');
    if (stage === 'done') label = t('updateSuccess');

    if (badgeText) badgeText.textContent = label;
    if (chkBtn) chkBtn.textContent = label;
    if (vStatus) vStatus.textContent = label;
  };

  window.sfx?.onUpdateProgress?.(onProgress);

  try {
    const res = await window.sfx?.applyUpdate?.(cachedUpdate);
    if (res && res.success) {
      if (badgeText) badgeText.textContent = '✓ ' + t('updateSuccess');
      if (chkBtn) chkBtn.textContent = '✓ ' + t('updateSuccess');
      toast(`🎉 ${t('updateSuccess')}`, 'ok');

      localStorage.setItem('qsf_just_updated', res.version || cachedUpdate.latestVersion);

      setTimeout(() => {
        window.sfx?.reloadWindow?.();
      }, 900);
    } else {
      throw new Error(res?.error || 'Update failed');
    }
  } catch (err) {
    isUpdating = false;
    if (badge) badge.classList.remove('updating');
    if (chkBtn) chkBtn.disabled = false;
    renderUpdateUI();
    toast(`${t('updateFailed')}: ${err.message || err}`, 'err');
  }
}

async function checkForUpdates(manual = false) {
  const chkBtn = $('#checkUpdateBtn');
  if (manual && chkBtn) {
    chkBtn.textContent = t('checkingUpdates');
    chkBtn.disabled = true;
  }

  try {
    const res = await window.sfx?.checkUpdate?.();
    if (res) {
      cachedUpdate = res;
      renderUpdateUI();

      if (manual) {
        if (res.updateAvailable) {
          toast(`✨ ${t('versionUpdateAvailable')}: v${res.latestVersion}`);
        } else {
          toast(`✓ QuickSFX v${res.currentVersion || '1.0.0'} (${t('versionUpToDate')})`);
        }
      }
    }
  } catch (e) {
    if (manual) toast('GitHub bağlantısı kurulamadı', 'err');
  } finally {
    if (chkBtn) chkBtn.disabled = false;
  }
}

$('#updateBadge')?.addEventListener('click', handleUpdateClick);
$('#checkUpdateBtn')?.addEventListener('click', () => {
  if (cachedUpdate && cachedUpdate.updateAvailable) {
    handleUpdateClick();
  } else {
    checkForUpdates(true);
  }
});

$('#resetTestBtn')?.addEventListener('click', async () => {
  try {
    await window.sfx?.resetTestVersion?.();
    toast('Test sürümü sıfırlandı: v1.0.0. Yenileniyor…', 'ok');
    setTimeout(() => {
      window.sfx?.reloadWindow?.();
    }, 700);
  } catch (e) {
    toast('Sıfırlanamadı: ' + e.message, 'err');
  }
});

// ---------------- boot ----------------
(async function boot() {
  const v = localStorage.getItem('vol');
  updateVolumeUI(v != null ? +v : 0.8);

  const saved = (localStorage.getItem('sources') || '').split(',').filter((s) => ALL_SOURCES.includes(s));
  if (saved.length) state.sources = new Set(saved);
  document.querySelectorAll('.src').forEach((b) => b.classList.toggle('on', state.sources.has(b.dataset.src)));

  window.sfx?.isPinned?.().then((on) => $('#pinBtn').classList.toggle('active', !!on)).catch(() => {});

  applyTheme(state.prefs.theme);
  applyInsertMode(state.prefs.insertMode);
  applyLanguage(state.prefs.lang);
  checkForUpdates(false);

  const justUpdated = localStorage.getItem('qsf_just_updated');
  if (justUpdated) {
    localStorage.removeItem('qsf_just_updated');
    setTimeout(() => {
      toast(`🎉 QuickSFX v${justUpdated} başarıyla yüklendi!`, 'ok');
    }, 450);
  }

  skeleton();
  refreshStatus();
  setInterval(refreshStatus, 2500);

  let ok = false;
  try { ok = !!(await api('/api/health', { timeout: TIMEOUT.health })).ok; } catch (e) {}
  if (!ok) {
    $('#statusText').textContent = t('statusBooting');
    ok = await waitForEngine();
  }
  if (!ok) { showEmpty(t('connErrorTitle'), 'Python kurulumunu ve server.py yolunu kontrol et.'); return; }
  refreshStatus();
  api('/api/config', { timeout: 2000 }).then((c) => {
    if (c?.download_dir) $('#folderPathInput').value = c.download_dir;
  }).catch(() => {});
  search(true);
})();
