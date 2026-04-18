import { PIECES, SERIES, DEFAULT_SELECTIONS } from '../scene/catalog.js';

// Initial selection state — mutated in place by user clicks.
export const state = {
  walls: new Set(DEFAULT_SELECTIONS.walls),
  floor: new Set(DEFAULT_SELECTIONS.floor),
  ceiling: new Set(DEFAULT_SELECTIONS.ceiling),
};

export function mountOverlay(root, { onSelectionChange, onMute, onFullscreen, audioAvailable }) {
  root.innerHTML = '';
  root.className = 'cfg-root';

  const pill = document.createElement('button');
  pill.className = 'cfg-pill';
  pill.textContent = 'Configure';
  root.appendChild(pill);

  const drawer = document.createElement('div');
  drawer.className = 'cfg-drawer';
  root.appendChild(drawer);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'cfg-tabs';
  const TAB_SPEC = [
    { id: 'walls', label: 'Walls' },
    { id: 'floor', label: 'Floor' },
    { id: 'ceiling', label: 'Ceiling' },
  ];
  let activeTab = 'walls';
  const tabButtons = TAB_SPEC.map(t => {
    const btn = document.createElement('button');
    btn.className = 'cfg-tab' + (t.id === activeTab ? ' active' : '');
    btn.textContent = t.label;
    btn.dataset.tabId = t.id;
    btn.addEventListener('click', () => {
      activeTab = t.id;
      tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tabId === activeTab));
      renderBody();
    });
    tabs.appendChild(btn);
    return btn;
  });
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cfg-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
  tabs.appendChild(closeBtn);
  drawer.appendChild(tabs);

  // Body
  const body = document.createElement('div');
  body.className = 'cfg-body';
  drawer.appendChild(body);

  function renderBody() {
    body.innerHTML = '';
    const selectedSet = state[activeTab];
    for (const series of SERIES) {
      const group = document.createElement('div');
      group.className = 'cfg-series';
      const piecesInSeries = PIECES.filter(p => p.series === series);
      const count = piecesInSeries.filter(p => selectedSet.has(p.id)).length;
      const header = document.createElement('div');
      header.className = 'cfg-series-header';
      header.innerHTML = `<span>${series}</span><span class="count">${count} selected</span>`;
      group.appendChild(header);
      const thumbRow = document.createElement('div');
      thumbRow.className = 'cfg-thumbs';
      for (const piece of piecesInSeries) {
        const thumb = document.createElement('button');
        thumb.className = 'cfg-thumb' + (selectedSet.has(piece.id) ? ' selected' : '');
        thumb.style.backgroundImage = `url('${piece.thumbSrc}')`;
        thumb.title = piece.id;
        thumb.dataset.pieceId = piece.id;
        thumb.addEventListener('click', () => {
          const isSelected = selectedSet.has(piece.id);
          if (isSelected && selectedSet.size === 1) return; // guard: min 1 selection
          if (isSelected) selectedSet.delete(piece.id);
          else selectedSet.add(piece.id);
          renderBody();
          onSelectionChange?.(activeTab, Array.from(selectedSet));
        });
        thumbRow.appendChild(thumb);
      }
      group.appendChild(thumbRow);
      body.appendChild(group);
    }
  }
  renderBody();

  // Footer: mute + fullscreen
  const footer = document.createElement('div');
  footer.className = 'cfg-footer';

  let muted = true;
  const muteBtn = document.createElement('button');
  muteBtn.className = 'cfg-icon-btn';
  muteBtn.textContent = '♪';
  muteBtn.title = 'mute/unmute';
  muteBtn.style.opacity = '0.5';
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.style.opacity = muted ? '0.5' : '1';
    onMute?.(muted);
  });
  if (!audioAvailable) muteBtn.style.display = 'none';
  footer.appendChild(muteBtn);

  const fsBtn = document.createElement('button');
  fsBtn.className = 'cfg-icon-btn';
  fsBtn.textContent = '⛶';
  fsBtn.title = 'fullscreen';
  fsBtn.addEventListener('click', () => onFullscreen?.());
  footer.appendChild(fsBtn);

  drawer.appendChild(footer);

  // Pill opens drawer
  pill.addEventListener('click', () => drawer.classList.add('open'));
}
