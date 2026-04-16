'use strict';
// Entry point — wires all editor modules together

const _eCanvas = document.getElementById('editor-canvas');
const _eCtx    = _eCanvas.getContext('2d');

// ── Toolbox (built from E_TOOLS — add items in editor-constants.js) ───────────
function eBuildToolbox() {
  const box = document.getElementById('toolbox');
  box.innerHTML = '';
  E_TOOLS.forEach(group => {
    const gDiv = document.createElement('div'); gDiv.className = 'tool-group';
    const gLbl = document.createElement('div'); gLbl.className = 'tool-group-label';
    gLbl.textContent = group.label; gDiv.appendChild(gLbl);
    group.items.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn'; btn.dataset.tool = t.id; btn.textContent = t.label;
      btn.title = t.hint;
      btn.addEventListener('click', () => eSetTool(t.id, t.hint));
      gDiv.appendChild(btn);
    });
    box.appendChild(gDiv);
    // Re-add hint + key-hints at bottom
  });
  const hintBox = document.createElement('div'); hintBox.id = 'tool-hint-box';
  hintBox.innerHTML = '<div id="tool-hint"></div><div id="key-hints"><b>Del</b> Radera valt<br><b>←→</b> Scrolla<br><b>Shift+drag</b> Scrolla</div>';
  box.appendChild(hintBox);
}

function eSetTool(toolId, hint) {
  ES.tool = toolId;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === toolId));
  const h = document.getElementById('tool-hint'); if (h) h.textContent = hint || '';
  _eCanvas.style.cursor = toolId === 'eraser' ? 'not-allowed' : toolId === 'select' ? 'default' : 'crosshair';
}

// ── Level selector ────────────────────────────────────────────────────────────
function ePopulateLevelSelect() {
  const sel = document.getElementById('sel-level');
  sel.innerHTML = ES.levels.map((ld, i) =>
    `<option value="${i}">${i + 1} — ${ld?.name || '?'}</option>`).join('');
  sel.value = ES.levelIdx;
}

function eLoadLevelUI(idx) {
  ES.levelIdx = idx;
  ES.selected = null; ES.drag = null; ES.viewX = 0;
  const ld = eCurrent(); if (!ld) return;
  document.getElementById('inp-name').value   = ld.name;
  document.getElementById('inp-width').value  = ld.width;
  document.getElementById('inp-speed').value  = ld.enemySpeedBase;
  document.getElementById('inp-archer').value = ld.archerInterval;
  document.getElementById('sel-bg').value     = ld.bgTheme;
  eSyncScrollbar();
  eUpdateCounts();
  eRenderProps();
}

function eSyncScrollbar() {
  const ld = eCurrent(); if (!ld) return;
  const sb = document.getElementById('scrollbar');
  sb.max = Math.max(0, ld.width - ECANVAS_W);
  sb.value = ES.viewX;
  document.getElementById('view-range-label').textContent =
    `${Math.round(ES.viewX)} – ${Math.round(ES.viewX + ECANVAS_W)} / ${ld.width}`;
}

function eUpdateCounts() {
  const ld = eCurrent(); if (!ld) return;
  document.getElementById('item-counts').textContent =
    `Plattformar: ${ld.platforms.length}  Fiender: ${ld.enemies.length}  Mynt: ${ld.coins.length}  Föremål: ${ld.pickups.length}`;
}

function eSetStatus(msg) {
  const el = document.getElementById('status-msg'); if (el) el.textContent = msg;
}

// ── Bind all events ───────────────────────────────────────────────────────────
function eBindEvents() {
  _eCanvas.addEventListener('mousedown',  eOnMouseDown);
  _eCanvas.addEventListener('mousemove',  eOnMouseMove);
  _eCanvas.addEventListener('mouseup',    eOnMouseUp);
  _eCanvas.addEventListener('mouseleave', eOnMouseUp);
  window.addEventListener('keydown',      eOnKeyDown);

  document.getElementById('scrollbar').addEventListener('input', e => {
    ES.viewX = parseInt(e.target.value, 10); eSyncScrollbar();
  });

  document.getElementById('sel-level').addEventListener('change', e => {
    eLoadLevelUI(parseInt(e.target.value, 10));
  });

  document.getElementById('btn-new-level').addEventListener('click', () => {
    ES.levels.push(eToFlat({ name: 'NYTT LEVEL ' + (ES.levels.length + 1) }));
    ePopulateLevelSelect();
    eLoadLevelUI(ES.levels.length - 1);
    document.getElementById('sel-level').value = ES.levelIdx;
  });

  // Header inputs → update level data live
  const syncHdr = () => {
    const ld = eCurrent(); if (!ld) return;
    ld.name           = document.getElementById('inp-name').value.toUpperCase();
    ld.width          = parseInt(document.getElementById('inp-width').value, 10) || 3700;
    ld.enemySpeedBase = parseInt(document.getElementById('inp-speed').value, 10) || 55;
    ld.archerInterval = parseFloat(document.getElementById('inp-archer').value) || 3.8;
    ld.bgTheme        = parseInt(document.getElementById('sel-bg').value, 10) || 0;
    eSyncScrollbar();
    ePopulateLevelSelect();
  };
  ['inp-name','inp-width','inp-speed','inp-archer','sel-bg'].forEach(id =>
    document.getElementById(id).addEventListener('change', syncHdr));

  document.getElementById('btn-load-db').addEventListener('click', eLoadFromDB);
  document.getElementById('btn-save-db').addEventListener('click', eSaveToDB);
  document.getElementById('btn-reset-db').addEventListener('click', eResetFromDB);
  document.getElementById('btn-prop-delete').addEventListener('click', eDeleteSelected);
}

// ── Render loop ───────────────────────────────────────────────────────────────
function eLoop() {
  eRender(_eCtx);
  requestAnimationFrame(eLoop);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function eInit() {
  eBuildToolbox();
  eInitLevels();
  eLoadLevelUI(0);
  ePopulateLevelSelect();
  eBindEvents();
  eSetTool('select', E_TOOLS[0].items[0].hint);
  // Try to load DB levels (non-blocking)
  eLoadFromDB();
  eLoop();
}

eInit();
