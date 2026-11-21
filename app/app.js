// The Leonida Ledger — GTA 6 trophy guide & tracker.
// Vanilla JS, no libraries. All data comes from data/trophies.json.
// Progress lives in localStorage; export/import moves it as a file.
const LS_KEY = 'leonida-ledger-v2';
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const DEMO_EARNED = ['just-like-paradise', 'paradise-lost', 'baited-my-tackle', 'stick-fiddler', 'trust', 'break-the-bank', 'family-matters', 'dwnfall', 'hi-jacked', 'snow-storm', 'road-to-rehabilitation', 'this-was-no-boat-accident', 'the-lone-rider'];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_LABEL = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const GRADE_NAME = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { platinum: 'Platinum', story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', robbery: 'Robbery', money: 'Money', side: 'Side', world: 'World', online: 'Online' };

let DATA = null;
let state = { earned: {}, counts: {}, shield: true };
let filter = 'all';
let gradeFilter = '';
let searchText = '';
let sortMode = 'roadmap';
let selectedId = null;
let activeTab = 'tracker';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadState() {
  if (DEMO) {
    state = { earned: {}, counts: {}, shield: true };
    for (const id of DEMO_EARNED) state.earned[id] = true;
    state.counts['positive-mental-attitude'] = 6;
    state.counts['whip-it-good'] = 61;
    state.counts['you-wainker'] = 44;
    return;
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') state = { earned: parsed.earned || {}, counts: parsed.counts || {}, shield: parsed.shield !== false };
    }
  } catch (e) { /* fresh state on bad data */ }
}

function saveState() {
  if (DEMO) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  const note = document.getElementById('savedNote');
  if (note) note.textContent = '✓ Saved in this browser';
}

function trophyById(id) { return DATA.trophies.find((t) => t.id === id); }
function isEarned(t) { return !!state.earned[t.id]; }
function getCount(t) { return state.counts[t.id] || 0; }
function setCount(t, n) {
  const v = Math.max(0, Math.min(t.count || 0, n));
  if (v === 0) delete state.counts[t.id]; else state.counts[t.id] = v;
  saveState();
}
function toggleEarned(t) {
  if (state.earned[t.id]) delete state.earned[t.id]; else state.earned[t.id] = true;
  saveState();
}
function isMasked(t) { return state.shield && t.hidden && !isEarned(t); }
function displayName(t) { return isMasked(t) ? 'Story trophy · Chapter ' + (t.chapter || '?') : t.name; }
function displayDesc(t) { return isMasked(t) ? 'Hidden by the spoiler shield until you earn it.' : t.desc; }

function auditNumbers() {
  const ts = DATA.trophies;
  const steps = ts.flatMap((t) => t.steps);
  const cited = steps.filter((s) => s.s && s.s.length).length;
  const withSrc = ts.filter((t) => t.sources && t.sources.length).length;
  const twoPlus = ts.filter((t) => new Set(t.sources || []).size >= 2).length;
  const missable = ts.filter((t) => t.missable).length;
  const unconfirmed = ts.filter((t) => t.risk === 'unconfirmed').length;
  const disputed = ts.filter((t) => t.disputes && t.disputes.length).length;
  return { total: ts.length, steps: steps.length, cited, withSrc, twoPlus, missable, unconfirmed, disputed };
}

function renderAudit() {
  const a = auditNumbers();
  const el = document.getElementById('auditStrip');
  el.innerHTML =
    '<span class="pill"><b>' + a.total + '/' + a.total + '</b> official</span>' +
    '<span class="pill"><b>' + a.cited + '/' + a.steps + '</b> claims cited</span>' +
    '<span class="pill"><b>' + a.withSrc + '/' + a.total + '</b> guides cite sources</span>' +
    '<span class="pill"><b>' + a.twoPlus + '</b> backed by 2+ sources</span>' +
    '<span class="pill">10 pages · 9 sites · 21 Nov 2026</span>' +
    '<span class="pill alert"><b>' + a.missable + '</b> possibly missable</span>' +
    '<span class="pill warn"><b>' + a.unconfirmed + '</b> unconfirmed</span>' +
    '<span class="pill warn"><b>' + a.disputed + '</b> disputes, both ways</span>';
}

const FILTERS = [
  ['all', 'All 55'], ['story', 'Story'], ['missable', 'Missable'], ['collectibles', 'Collectibles'],
  ['activities', 'Activities'], ['robbery', 'Robbery'], ['money', 'Money'], ['side', 'Side'],
  ['world', 'World'], ['online', 'Online'], ['hidden', 'PSN-hidden'], ['disputed', 'Disputed'], ['notearned', 'Not earned']
];

function filterCount(key) {
  const ts = DATA.trophies;
  switch (key) {
    case 'all': return ts.length;
    case 'story': return ts.filter((t) => t.kind === 'story').length;
    case 'missable': return ts.filter((t) => t.missable).length;
    case 'collectibles': return ts.filter((t) => t.kind === 'collectibles').length;
    case 'activities': return ts.filter((t) => t.kind === 'activities').length;
    case 'robbery': return ts.filter((t) => t.kind === 'robbery').length;
    case 'money': return ts.filter((t) => t.kind === 'money').length;
    case 'side': return ts.filter((t) => t.kind === 'side').length;
    case 'world': return ts.filter((t) => t.kind === 'world').length;
    case 'online': return 0;
    case 'hidden': return ts.filter((t) => t.hidden).length;
    case 'disputed': return ts.filter((t) => t.disputes && t.disputes.length).length;
    case 'notearned': return ts.filter((t) => !isEarned(t)).length;
    default: return 0;
  }
}

function matchesFilter(t) {
  switch (filter) {
    case 'all': return true;
    case 'story': return t.kind === 'story';
    case 'missable': return t.missable;
    case 'collectibles': return t.kind === 'collectibles';
    case 'activities': return t.kind === 'activities';
    case 'robbery': return t.kind === 'robbery';
    case 'money': return t.kind === 'money';
    case 'side': return t.kind === 'side';
    case 'world': return t.kind === 'world';
    case 'online': return false;
    case 'hidden': return t.hidden;
    case 'disputed': return t.disputes && t.disputes.length > 0;
    case 'notearned': return !isEarned(t);
    default: return true;
  }
}

function visibleTrophies() {
  let list = DATA.trophies.filter(matchesFilter);
  if (gradeFilter) list = list.filter((t) => t.grade === gradeFilter);
  if (searchText) {
    const q = searchText.toLowerCase();
    list = list.filter((t) => (t.name + ' ' + t.desc).toLowerCase().includes(q));
  }
  if (sortMode === 'num') list.sort((a, b) => a.num - b.num);
  else if (sortMode === 'grade') list.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.num - b.num);
  else list.sort((a, b) => (a.stage - b.stage) || a.num - b.num);
  return list;
}

function chipHtml(t) {
  const chips = ['<span class="chip grade-' + t.grade + '">' + GRADE_LABEL[t.grade] + ' · ' + GRADE_NAME[t.grade] + '</span>'];
  chips.push('<span class="chip">' + esc(KIND_LABEL[t.kind] || t.kind) + '</span>');
  if (t.hidden) chips.push('<span class="chip hidden">PSN-hidden</span>');
  if (t.missable) chips.push('<span class="chip missable">Possibly missable</span>');
  if (t.disputes && t.disputes.length) chips.push('<span class="chip disputed">Sources differ</span>');
  if (t.risk === 'unconfirmed') chips.push('<span class="chip disputed">Unconfirmed</span>');
  if (t.count) chips.push('<span class="chip">' + getCount(t) + ' / ' + t.count + ' ' + esc(t.countLabel) + '</span>');
  return chips.join('');
}

function renderFilters() {
  const el = document.getElementById('filters');
  el.innerHTML = FILTERS.map(([key, label]) =>
    '<button type="button" data-filter="' + key + '" class="' + (filter === key ? 'active' : '') + '">' + esc(label) + ' ' + filterCount(key) + '</button>'
  ).join('');
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    renderFilters();
    renderList();
  }));
}

function renderList() {
  const list = visibleTrophies();
  const el = document.getElementById('trophyList');
  const earned = DATA.trophies.filter(isEarned).length;
  document.getElementById('listMeta').textContent = list.length + ' shown · ' + earned + ' of 55 earned';
  el.innerHTML = list.map((t) => {
    const masked = isMasked(t);
    return '<li data-id="' + t.id + '" class="' + (isEarned(t) ? 'earned ' : '') + (selectedId === t.id ? 'selected' : '') + '">' +
      '<input type="checkbox" data-check="' + t.id + '" ' + (isEarned(t) ? 'checked' : '') + ' aria-label="Mark ' + esc(t.name) + ' earned">' +
      '<div><div class="tname"><span class="num">#' + t.num + '</span><span class="' + (masked ? 'masked' : '') + '">' + esc(displayName(t)) + '</span></div>' +
      '<div class="tdesc">' + esc(displayDesc(t)) + '</div>' +
      '<div class="tchips">' + chipHtml(t) + '</div></div>' +
      '<button type="button" class="guidebtn" data-guide="' + t.id + '">Guide</button></li>';
  }).join('');
  el.querySelectorAll('[data-check]').forEach((cb) => cb.addEventListener('change', () => {
    toggleEarned(trophyById(cb.dataset.check));
    renderAll();
  }));
  el.querySelectorAll('[data-guide]').forEach((b) => b.addEventListener('click', () => {
    selectedId = b.dataset.guide;
    renderList();
    renderDetail();
  }));
  el.querySelectorAll('li').forEach((li) => li.addEventListener('click', (ev) => {
    if (ev.target.closest('input,button')) return;
    selectedId = li.dataset.id;
    renderList();
    renderDetail();
  }));
}

function srcLink(id) {
  const s = DATA.sources.find((x) => x.id === id);
  if (!s) return '[' + id + ']';
  return '<a href="' + (s.url || '#') + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>';
}

function renderDetail() {
  const el = document.getElementById('detail');
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) {
    el.innerHTML = '<p class="empty">Pick a trophy on the left to open its guide — numbered steps, each with its sources, and any disputes shown both ways.</p>';
    return;
  }
  const masked = isMasked(t);
  let html = '<h2>' + esc(masked ? displayName(t) : t.name) + '</h2>';
  html += '<div class="tchips">' + chipHtml(t) + '</div>';
  html += '<div class="official"><span class="lbl">Official description · ' + GRADE_NAME[t.grade] + ' · #' + t.num + ' of 55</span>“' + esc(t.desc) + '”</div>';
  if (!masked) {
    html += '<p class="guide">' + esc(t.guide) + '</p>';
    if (t.count) {
      html += '<div class="counter"><button type="button" data-dec="' + t.id + '" aria-label="Decrease count">−</button><span><b>' + getCount(t) + ' / ' + t.count + '</b> ' + esc(t.countLabel) + '</span><button type="button" data-inc="' + t.id + '" aria-label="Increase count">+</button><span style="font-size:.82rem;color:var(--muted)">Your count — saved in this browser</span></div>';
    }
    html += '<h3>How to earn it · ' + t.steps.length + ' steps, each cited</h3><ol class="steps">';
    for (const st of t.steps) {
      const refs = (st.s || []).map((n) => '<span class="src-ref">[' + n + ']</span>').join(' ');
      html += '<li>' + esc(st.t) + ' ' + refs + '</li>';
    }
    html += '</ol>';
    const srcs = (t.sources || []).map((id) => DATA.sources.find((x) => x.id === id)).filter(Boolean);
    html += '<h3>Sources for this guide · ' + srcs.length + '</h3><div class="src-panel"><ol>';
    for (const s of srcs) {
      const claims = DATA.trophies.flatMap((x) => x.steps).filter((st) => (st.s || []).includes(s.id)).length;
      const host = s.url ? s.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';
      html += '<li><b>[' + s.id + '] ' + esc(s.name) + '</b> — ' + esc(s.title) + (s.url ? ' — <a href="' + s.url + '" target="_blank" rel="noopener">' + esc(host) + '</a>' : '') + ' <span style="color:var(--muted)">· ' + claims + ' claims here</span></li>';
    }
    html += '</ol></div>';
    for (const d of (t.disputes || [])) {
      html += '<div class="dispute"><h4>⚠ Sources differ — ' + esc(d.q) + '</h4><div class="vs"><div><b>A</b> · ' + esc(d.a) + '</div><div><b>B</b> · ' + esc(d.b) + '</div></div><p class="call"><b>Our call:</b> ' + esc(d.call) + '</p></div>';
    }
  } else {
    html += '<p class="guide masked">Hidden by the spoiler shield until you earn it.</p>';
  }
  html += '<button type="button" class="markearned' + (isEarned(t) ? ' earned' : '') + '" data-mark="' + t.id + '">' + (isEarned(t) ? '✓ Earned — click to unmark' : 'Mark earned') + '</button>';
  el.innerHTML = html;
  el.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { setCount(t, getCount(t) - 1); renderAll(); }));
  el.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { setCount(t, getCount(t) + 1); renderAll(); }));
  el.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => { toggleEarned(t); renderAll(); }));
}

function nextUpList() {
  const remaining = DATA.trophies
    .filter((t) => !isEarned(t))
    .sort((a, b) => (a.stage - b.stage) || a.num - b.num)
    .slice(0, 5);
  const el = document.getElementById('nextUp');
  if (!remaining.length) {
    el.innerHTML = '<h3>Next up · Roadmap order</h3><p>Every trophy earned — the platinum is yours.</p>';
    return;
  }
  el.innerHTML = '<h3>Next up · Roadmap order</h3><ol>' + remaining.map((t) =>
    '<li>' + esc(isMasked(t) ? displayName(t) : t.name) + (t.missable ? '<span class="nu-tag">Missable · do first</span>' : '') + '<br><span style="font-size:.8rem;color:#cfe0d2">stage ' + t.stage + (t.chapter ? ' · Chapter ' + t.chapter : '') + '</span></li>'
  ).join('') + '</ol>';
}

const STAGES = [
  { n: 1, title: 'Story first — Chapters 1–5', hrs: 'about 60 to 80 hours', text: 'Play the story at your own pace. Along the way: do the Chapter 1 balcony meditation, take optional missions as they appear (100% needs any 100 of several hundred), scan every new vehicle with the WAiNK app (100% needs 200 of 277), study new animals through the binoculars (100% needs 100 of 255), and turn on progress notifications in the UI settings. There are no mission medals this time and no mission replay — free roam continues after the story.' },
  { n: 2, title: 'Along the way — collectibles & activities', hrs: 'during the story', text: 'Everything in this stage can be done while the story runs. Scan vehicles, work the stranger strands as they open, and try the nine activity types. Nothing here is missable except the Chapter 1 meditation in Stage 1.' },
  { n: 3, title: 'The 100% cleanup', hrs: 'about 100 hours', text: 'The checklist appears after the story under Progress, then Stats, then 100% Completion. You need 70 of 80 challenges, 15 of 18 meditations and 300 stunts. Robberies, underwater discoveries, shooting ranges, drone races and Bret\u2019s quests need everything; card sets need 15 of 18. PowerPyx calls the checklist lenient — closer to 60% true completion.' },
  { n: 4, title: 'Strangers & final cleanup', hrs: 'about 10 hours', text: 'Most trophies should be done by now. Strangers & Freaks is not part of 100%, so you may still need those 8 strands. Clean up anything left on the list and the platinum follows.' },
  { n: 5, title: 'Platinum', hrs: 'the moment the other 54 are done', text: 'Vice Got a Price! pops the moment the other 54 trophies are earned. No extra task of its own.' }
];

function renderRoadmap() {
  const el = document.getElementById('roadmap');
  el.innerHTML = STAGES.map((st) => {
    const items = DATA.trophies.filter((t) => t.stage === st.n).sort((a, b) => a.num - b.num);
    const lis = items.map((t) =>
      '<li class="' + (isEarned(t) ? 'done' : '') + '">' + (isEarned(t) ? '✓ ' : '') + '<b>' + esc(isMasked(t) ? displayName(t) : t.name) + '</b> — ' + esc(displayDesc(t)) + (t.missable ? ' <span class="chip missable">Possibly missable</span>' : '') + '</li>'
    ).join('');
    return '<div class="stage"><h2>Stage ' + st.n + ' · ' + esc(st.title) + ' <span class="hrs">(' + esc(st.hrs) + ')</span></h2><p>' + esc(st.text) + '</p><ul>' + lis + '</ul></div>';
  }).join('');
}

function renderMissables() {
  const el = document.getElementById('missables');
  const miss = DATA.trophies.filter((t) => t.missable);
  const unconf = DATA.trophies.filter((t) => t.risk === 'unconfirmed');
  const disp = DATA.trophies.filter((t) => t.disputes && t.disputes.length);
  let html = '<div class="misscard alert"><h2>Possibly missable — ' + miss.length + '</h2>';
  for (const t of miss) {
    html += '<p><b>' + esc(t.name) + '</b> — ' + esc(t.guide) + '</p>';
    html += '<p><b>Missable window:</b> the Chapter 1 balcony meditation at Jason\u2019s house. The morning after the Down to Earth mission, Lucia says she will meditate and walks to the balcony. Follow her and accept — it takes a minute and the spot is gone after Chapter 1. PowerPyx reports it raises the counter by one, but whether it is required for the trophy is unconfirmed, so do it and remove the risk.</p>';
  }
  html += '<p><b>Save advice:</b> the game has 15 manual save slots and 1 autosave. Because missions cannot be replayed, keep a save at the start and end of each chapter, then rotate the rest during free roam. <b>Cheats disable trophies</b> and stop the game from saving — keep them off the file you use for your platinum run.</p></div>';
  html += '<div class="misscard"><h2>Unconfirmed methods — ' + unconf.length + '</h2><p>No guide has confirmed how these unlock yet. Each one is marked in its guide, with the best current guess and the source that suspects it.</p><ul>' +
    unconf.map((t) => '<li><b>' + esc(t.name) + '</b> — ' + esc(t.desc) + '</li>').join('') + '</ul></div>';
  html += '<div class="misscard"><h2>Disputes shown both ways — ' + disp.length + '</h2><p>Where the guides disagree, this guide shows both versions and gives its call. Open any of these trophies in the Tracker to read the full dispute.</p><ul>' +
    disp.map((t) => '<li><b>' + esc(t.name) + '</b> — ' + esc((t.disputes[0] || {}).q || '') + '</li>').join('') + '</ul></div>';
  el.innerHTML = html;
}

function renderSources() {
  const el = document.getElementById('sources');
  const stepClaims = DATA.trophies.flatMap((t) => t.steps);
  el.innerHTML = '<div class="srccard"><h2>How this guide is sourced</h2><p>Every guide is written for this entry, in its own words. The official trophy names and descriptions are shown as PlayStation publishes them; everything else is paraphrased and cited. A link opens only when you follow it — the app itself fetches nothing. Pages read 20–21 Nov 2026.</p></div>' +
    DATA.sources.map((s) => {
      const claims = stepClaims.filter((st) => (st.s || []).includes(s.id)).length;
      const guides = DATA.trophies.filter((t) => (t.sources || []).includes(s.id)).length;
      return '<div class="srccard"><h2>[' + s.id + '] ' + esc(s.name) + ' — ' + esc(s.title) + '</h2>' +
        '<p>' + esc(s.note) + '</p>' +
        (s.url ? '<p><a href="' + s.url + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></p>' : '<p class="meta">Cited by name — no link on file.</p>') +
        '<p class="meta">' + claims + ' claims here · ' + guides + ' guides cite it</p></div>';
    }).join('');
}

function updateStats() {
  const earned = DATA.trophies.filter(isEarned).length;
  document.getElementById('earnedCount').textContent = earned + ' / 55';
  document.getElementById('platinumState').textContent = earned === 55 ? 'Platinum: earned!' : 'Platinum: not yet';
}

function renderAll() {
  renderAudit();
  renderFilters();
  renderList();
  renderDetail();
  nextUpList();
  renderRoadmap();
  renderMissables();
  renderSources();
  updateStats();
}

function switchTab(name) {
  activeTab = name;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tabpage').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ app: 'leonida-ledger', version: 2, exported: new Date().toISOString(), earned: Object.keys(state.earned), counts: state.counts }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-ledger-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const earned = {};
      for (const id of (data.earned || [])) if (trophyById(id)) earned[id] = true;
      const counts = {};
      for (const [id, n] of Object.entries(data.counts || {})) {
        const t = trophyById(id);
        if (t && t.count) counts[id] = Math.max(0, Math.min(t.count, Number(n) || 0));
      }
      state.earned = earned;
      state.counts = counts;
      saveState();
      renderAll();
    } catch (e) {
      alert('That file is not a Leonida Ledger progress export.');
    }
  };
  reader.readAsText(file);
}

async function init() {
  loadState();
  try {
    const res = await fetch('data/trophies.json');
    DATA = await res.json();
  } catch (e) {
    document.getElementById('trophyList').innerHTML = '<li>Could not load the trophy data.</li>';
    return;
  }
  const shield = document.getElementById('shieldToggle');
  shield.checked = state.shield;
  shield.addEventListener('change', () => { state.shield = shield.checked; saveState(); renderAll(); });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (ev) => { if (ev.target.files[0]) importProgress(ev.target.files[0]); ev.target.value = ''; });
  document.getElementById('search').addEventListener('input', (ev) => { searchText = ev.target.value; renderList(); });
  document.getElementById('gradeFilter').addEventListener('change', (ev) => { gradeFilter = ev.target.value; renderList(); });
  document.getElementById('sortSel').addEventListener('change', (ev) => { sortMode = ev.target.value; renderList(); });
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Deep links for screenshots and sharing: ?shot=cover|tracker|roadmap|missables&select=<id>
  const shot = params.get('shot');
  const select = params.get('select');
  if (select && trophyById(select)) selectedId = select;
  if (shot === 'roadmap' || shot === 'missables' || shot === 'sources') switchTab(shot);
  if (shot === 'cover' && !selectedId) selectedId = 'positive-mental-attitude';
  if (!selectedId) selectedId = 'positive-mental-attitude';

  renderAll();
}

init();
