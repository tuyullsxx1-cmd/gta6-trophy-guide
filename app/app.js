// Leonida Trophy Guide — boot and rendering.
// Loads app/data/trophies.json and app/data/guide.json (local files only),
// renders the tracker, roadmap, missables, strategies and about views,
// and wires the checklist, filters, spoiler setting and export / import.
import { loadStoredState, saveStoredState, stateToExport, stateFromImport, downloadJson } from './store.js';

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Side & crime',
  platinum: 'Platinum',
  completion: '100% completion',
  online: 'Online',
};

const state = {
  trophies: [],
  guideData: null,
  earned: new Set(),
  spoiler: false,
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  search: '',
  selectedId: null,
};

const $ = (id) => document.getElementById(id);

function trophyById(id) {
  return state.trophies.find((t) => t.id === id);
}

function isStorySpoiler(trophy) {
  return trophy.kind === 'story' && state.spoiler && !state.earned.has(trophy.id);
}

function visibleName(trophy) {
  return isStorySpoiler(trophy) ? 'Hidden story trophy' : trophy.name;
}

function visibleDescription(trophy) {
  return isStorySpoiler(trophy)
    ? 'Hidden on PlayStation until earned. Turn off “Hide story spoilers” or earn it to reveal the name and description.'
    : trophy.description;
}

function gradeTag(trophy) {
  return `<span class="tag grade-${trophy.grade}">${trophy.grade}</span>`;
}

function kindTag(trophy) {
  // The platinum trophy's kind and grade are the same word; one tag is enough.
  if (trophy.kind === 'platinum') return '';
  return `<span class="tag">${KIND_LABELS[trophy.kind] || trophy.kind}</span>`;
}

function trophyMatches(trophy) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'online') return false;
  if (state.kind !== 'all' && state.kind !== 'missable' && state.kind !== 'online') {
    if (state.kind === 'platinum') {
      if (trophy.kind !== 'platinum' && trophy.kind !== 'completion') return false;
    } else if (trophy.kind !== state.kind) {
      return false;
    }
  }
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.earnedFilter === 'earned' && !state.earned.has(trophy.id)) return false;
  if (state.earnedFilter === 'unearned' && state.earned.has(trophy.id)) return false;
  if (state.search) {
    const hay = `${trophy.name} ${trophy.description}`.toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  return true;
}

function renderProgress() {
  const earned = state.earned.size;
  const total = state.trophies.length;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  $('progress-text').textContent = `${earned} of ${total} earned · ${pct}%`;
  $('progress-platinum').textContent = state.earned.has(1)
    ? 'Platinum: earned!'
    : 'Platinum: not yet';
  $('progress-fill').style.width = `${pct}%`;
  $('progress-bar').setAttribute('aria-valuenow', String(earned));
}

function renderList() {
  const list = $('trophy-list');
  const shown = state.trophies.filter(trophyMatches);
  $('list-meta').textContent = state.kind === 'online'
    ? 'Showing 0 trophies.'
    : `Showing ${shown.length} of ${state.trophies.length} trophies · ${state.earned.size} earned`;
  $('filter-note').textContent = state.kind === 'online'
    ? 'There are no online trophies in GTA VI: all 55 are offline and single-player (PowerPyx). This filter is here because the list has none — nothing is hidden from you.'
    : '';
  list.innerHTML = shown.map((trophy) => {
    const earned = state.earned.has(trophy.id);
    const selected = state.selectedId === trophy.id;
    const tags = [gradeTag(trophy), kindTag(trophy)];
    if (trophy.missable) tags.push('<span class="tag missable">Potentially missable</span>');
    if (trophy.hidden) tags.push('<span class="tag hidden">Hidden on PS5</span>');
    if (trophy.target) tags.push(`<span class="tag count">Target: ${trophy.target.toLocaleString('en-US')}</span>`);
    return `<li class="trophy-row${earned ? ' earned' : ''}${selected ? ' selected' : ''}" data-id="${trophy.id}">
      <input class="trophy-check" type="checkbox" data-id="${trophy.id}"${earned ? ' checked' : ''} aria-label="Mark ${trophy.name} earned">
      <div>
        <div class="trophy-name">${visibleName(trophy)}</div>
        <div class="trophy-desc">${visibleDescription(trophy)}</div>
        <div class="trophy-tags">${tags.join('')}</div>
      </div>
      <button class="guide-btn" type="button" data-id="${trophy.id}">Guide</button>
    </li>`;
  }).join('');
}

function renderDetail() {
  const detail = $('detail');
  const trophy = state.selectedId ? trophyById(state.selectedId) : null;
  if (!trophy) {
    detail.innerHTML = '<p class="detail-empty">Select a trophy on the left to read its guide and sources here.</p>';
    return;
  }
  const earned = state.earned.has(trophy.id);
  const tags = [gradeTag(trophy), kindTag(trophy)];
  if (trophy.missable) tags.push('<span class="tag missable">Potentially missable</span>');
  if (trophy.hidden) tags.push('<span class="tag hidden">Hidden on PS5</span>');
  if (trophy.target) tags.push(`<span class="tag count">Target: ${trophy.target.toLocaleString('en-US')}</span>`);
  const spoiler = isStorySpoiler(trophy);
  const missedNote = trophy.missable
    ? '<p class="detail-missed"><strong>Missable:</strong> the Chapter 1 meditation at Jason’s house becomes permanently unavailable after Chapter 1. Do it during Chapter 1 — see the guide below.</p>'
    : '';
  const unknownNote = trophy.guide.includes('No published guide confirms')
    ? '<p class="detail-unknown"><strong>Not yet confirmed:</strong> no published guide confirms the exact method for this trophy as of 19 November 2026. The guide above says what is known — check the sources for updates.</p>'
    : '';
  const sources = (trophy.sources || []).map((s) =>
    `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a> <span class="accessed">(accessed ${s.accessed})</span></li>`).join('');
  detail.innerHTML = `
    <h2>${spoiler ? 'Hidden story trophy' : trophy.name}</h2>
    <div class="detail-meta">${tags.join('')}</div>
    <p><em>${spoiler ? 'Hidden on PlayStation until earned.' : trophy.description}</em></p>
    <p><strong>${earned ? '✓ Earned — ticked in your tracker.' : 'Not earned yet.'}</strong>
    <button id="detail-toggle" type="button">${earned ? 'Mark unearned' : 'Mark earned'}</button></p>
    ${missedNote}
    <p class="detail-guide">${trophy.guide}</p>
    ${unknownNote}
    <div class="detail-sources"><h3>Sources for this guide</h3><ul>${sources}</ul></div>`;
  $('detail-toggle').addEventListener('click', () => toggleEarned(trophy.id));
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  saveStoredState({ earned: [...state.earned], spoiler: state.spoiler });
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  renderAll();
}

function selectTrophy(id) {
  state.selectedId = id;
  renderList();
  renderDetail();
}

function renderRoadmap() {
  const roadmap = state.guideData.roadmap;
  $('roadmap-title').textContent = roadmap.title;
  $('roadmap-intro').textContent = roadmap.intro;
  $('roadmap-list').innerHTML = roadmap.steps.map((step) => `
    <li>
      <h3>Step ${step.step}: ${step.name}</h3>
      <p class="step-time">${step.time}</p>
      <p>${step.summary}</p>
      <ul>${step.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
      <div class="step-trophies">${step.trophies.map((name) => {
        const t = state.trophies.find((x) => x.name === name);
        return t ? `<span class="tag" data-id="${t.id}" title="${t.description}">${t.name}</span>` : `<span class="tag">${name}</span>`;
      }).join('')}</div>
    </li>`).join('');
}

function renderMissables() {
  const data = state.guideData.missables;
  $('missables-title').textContent = data.title;
  $('missables-summary').textContent = data.summary;
  $('missable-flagged').innerHTML = data.flagged.map((m) => {
    const t = state.trophies.find((x) => x.name === m.name);
    return `<div class="detail-missed"><strong>${m.name}</strong> — ${m.why}<br>When: ${m.when}${t ? ` <button type="button" data-id="${t.id}" class="guide-btn">Open guide</button>` : ''}</div>`;
  }).join('');
  $('missable-safe').innerHTML = data.notMissable.map((s) => `<li>${s}</li>`).join('');
  $('missable-save').textContent = data.saveAdvice;
}

function renderStrategies() {
  $('strategy-list').innerHTML = state.guideData.strategies.map((s) =>
    `<li><strong>${s.title}</strong>${s.text}</li>`).join('');
  $('tip-list').innerHTML = state.guideData.tips.map((s) =>
    `<li><strong>${s.title}</strong>${s.text}</li>`).join('');
}

function renderAbout() {
  const about = state.guideData.about;
  $('about-body').innerHTML = `
    <p><strong>Release:</strong> ${about.release}</p>
    <p>${about.howMade}</p>
    <p>${about.offline}</p>
    <p>${about.unofficial}</p>
    <p class="warning"><strong>${about.warning}</strong></p>`;
  $('source-list').innerHTML = state.guideData.sources.map((s) =>
    `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a> <span class="accessed">(accessed ${s.accessed})</span><span class="note">${s.note}</span></li>`).join('');
}

function switchView(view) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
}

function wireEvents() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  $('search').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderList();
  });
  $('kind-filters').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (!chip) return;
    state.kind = chip.dataset.kind;
    document.querySelectorAll('#kind-filters .chip').forEach((c) => {
      c.classList.toggle('active', c === chip);
    });
    renderList();
  });
  $('grade-filter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderList();
  });
  $('earned-filter').addEventListener('change', (event) => {
    state.earnedFilter = event.target.value;
    renderList();
  });
  $('spoiler').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    $('spoiler-note').hidden = !state.spoiler;
    renderAll();
  });
  $('trophy-list').addEventListener('click', (event) => {
    const check = event.target.closest('.trophy-check');
    if (check) {
      toggleEarned(Number(check.dataset.id));
      return;
    }
    const row = event.target.closest('[data-id]');
    if (row) selectTrophy(Number(row.dataset.id));
  });
  $('roadmap-list').addEventListener('click', (event) => {
    const tag = event.target.closest('[data-id]');
    if (!tag) return;
    state.selectedId = Number(tag.dataset.id);
    switchView('tracker');
    renderAll();
    $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('missable-flagged').addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    state.selectedId = Number(button.dataset.id);
    switchView('tracker');
    renderAll();
  });
  $('export-btn').addEventListener('click', () => {
    downloadJson('gta6-trophy-progress.json', stateToExport({ earned: [...state.earned], spoiler: state.spoiler }, state.trophies.length));
  });
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = stateFromImport(text, new Set(state.trophies.map((t) => t.id)));
      state.earned = new Set(imported.earned);
      state.spoiler = imported.spoiler;
      $('spoiler').checked = state.spoiler;
      $('spoiler-note').hidden = !state.spoiler;
      renderAll();
      alert(`Imported ${imported.earned.length} earned trophies.`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
    event.target.value = '';
  });
  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies and the spoiler setting?')) return;
    state.earned = new Set();
    state.spoiler = false;
    $('spoiler').checked = false;
    $('spoiler-note').hidden = true;
    renderAll();
  });
}

async function loadGuideData() {
  const [trophiesResponse, guideResponse] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/guide.json'),
  ]);
  if (!trophiesResponse.ok) throw new Error('Could not load data/trophies.json');
  if (!guideResponse.ok) throw new Error('Could not load data/guide.json');
  const trophiesDoc = await trophiesResponse.json();
  state.trophies = trophiesDoc.trophies || trophiesDoc;
  state.guideData = await guideResponse.json();
}

async function bootGuide() {
  const stored = loadStoredState();
  state.earned = new Set(stored.earned);
  state.spoiler = stored.spoiler;
  $('spoiler').checked = state.spoiler;
  $('spoiler-note').hidden = !state.spoiler;
  await loadGuideData();
  renderRoadmap();
  renderMissables();
  renderStrategies();
  renderAbout();
  wireEvents();
  renderAll();
}

bootGuide().catch((error) => {
  $('trophy-list').innerHTML = `<li class="trophy-row"><div><div class="trophy-name">The guide could not load its data.</div><div class="trophy-desc">${error.message} — serve app/ over HTTP (node serve.ts) rather than opening the file directly.</div></div></li>`;
});
