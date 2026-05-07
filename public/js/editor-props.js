'use strict';
// Properties panel — generates HTML for the selected item and wires live updates

function _row(label, inputHtml) {
  return `<div class="prop-row"><label>${label}</label>${inputHtml}</div>`;
}
function _num(id, val, min, max, step = 1) {
  return `<input type="number" id="${id}" value="${val}" min="${min}" max="${max}" step="${step}">`;
}
function _sel(id, options, current) {
  return `<select id="${id}">${options.map(([v,l]) =>
    `<option value="${v}"${v==current?' selected':''}>${l}</option>`).join('')}</select>`;
}

function eRenderProps() {
  const titleEl  = document.getElementById('props-title');
  const bodyEl   = document.getElementById('props-body');
  const delBtn   = document.getElementById('btn-prop-delete');
  const ld = eCurrent();

  if (!ES.selected || !ld) {
    titleEl.textContent = 'Inga objekt valda';
    bodyEl.innerHTML = '<p id="props-hint">Klicka på ett objekt med Markera-verktyget.</p>';
    delBtn.style.display = 'none';
    return;
  }

  delBtn.style.display = 'inline-block';
  const { col, idx } = ES.selected;

  if (col === 'platforms') {
    const p = ld.platforms[idx];
    titleEl.textContent = 'Plattform';
    const movingChecked = p.moving ? ' checked' : '';
    const showMove = p.moving ? '' : 'display:none';
    bodyEl.innerHTML =
      _row('X',     _num('pp-x', p.x, 0, 20000, EGRID)) +
      _row('Y',     _num('pp-y', p.y, 0, EGROUND_Y, EGRID)) +
      _row('Bredd', _num('pp-w', p.w, EGRID, 2000, EGRID)) +
      `<div class="prop-row"><label><input type="checkbox" id="pp-moving"${movingChecked}> Rörlig plattform</label></div>` +
      `<div id="pp-move-opts" style="${showMove}">` +
        _row('Riktning', _sel('pp-axis', [['x','Horisontell ◀▶'],['y','Vertikal ▲▼']], p.axis || 'x')) +
        _row('Räckvidd', _num('pp-range', p.range || 80, 16, 800, 8)) +
        _row('Hastighet', _num('pp-speed', p.speed || 55, 10, 500, 5)) +
      `</div>`;
    _bindNum('pp-x', v => { p.x = v; });
    _bindNum('pp-y', v => { p.y = v; });
    _bindNum('pp-w', v => { p.w = v; });
    _bindChange('pp-moving', () => {
      p.moving = document.getElementById('pp-moving').checked;
      const opts = document.getElementById('pp-move-opts');
      if (opts) opts.style.display = p.moving ? '' : 'none';
    });
    _bindChange('pp-axis',  v => { p.axis  = v; });
    _bindNum('pp-range',    v => { p.range = v; });
    _bindNum('pp-speed',    v => { p.speed = v; });

  } else if (col === 'enemies') {
    const e = ld.enemies[idx];
    titleEl.textContent = e.ground ? 'Markfiende' : (e.type === 'archer' ? 'Bågskyt' : 'Grunt');
    bodyEl.innerHTML =
      _row('X', _num('ep-x', e.x, 0, 20000, EGRID)) +
      _row('Y', _num('ep-y', e.y, 0, EGROUND_Y, EGRID)) +
      _row('Typ', _sel('ep-type', [['grunt','Grunt'],['archer','Bågskyt']], e.type)) +
      _row('Patrullräckvidd', _num('ep-range', e.range || 160, 32, 2000, EGRID)) +
      `<div class="prop-row"><label><input type="checkbox" id="ep-ground"${e.ground?' checked':''}> Markfiende</label></div>`;
    _bindNum('ep-x',     v => { e.x = v; });
    _bindNum('ep-y',     v => { e.y = v; });
    _bindNum('ep-range', v => { e.range = v; });
    _bindChange('ep-type',   v => { e.type = v; eRenderProps(); });
    _bindChange('ep-ground', () => { e.ground = document.getElementById('ep-ground').checked; eRenderProps(); });

  } else if (col === 'hidingSpots') {
    const h = ld.hidingSpots[idx];
    const lblMap = { barrel: 'Tunna', box: 'Låda', shadow: 'Skugga' };
    titleEl.textContent = lblMap[h.type] || h.type;
    const typeOpts = [['barrel','Tunna'],['box','Låda'],['shadow','Skugga']];
    bodyEl.innerHTML =
      _row('X',        _num('hp-x',   h.x,            0, 20000,     EGRID)) +
      _row('Y',        _num('hp-y',   h.y,            0, EGROUND_Y, EGRID)) +
      _row('Typ',      _sel('hp-type', typeOpts, h.type)) +
      _row('Rotation', _num('hp-rot', h.rotation || 0, 0, 359, 1));
    _bindNum('hp-x',   v => { h.x = v; });
    _bindNum('hp-y',   v => { h.y = v; });
    _bindNum('hp-rot', v => { h.rotation = v; });
    _bindChange('hp-type', v => { h.type = v; eRenderProps(); });

  } else if (col === 'pickups') {
    const p = ld.pickups[idx];
    titleEl.textContent = 'Upphämtning';
    const typeOpts = [['heart','Hjärta'],['shuriken','Shuriken'],['triple','3× Stjärna'],['knife','Kniv']];
    bodyEl.innerHTML =
      _row('X',   _num('pkp-x', p.x, 0, 20000, EGRID)) +
      _row('Y',   _num('pkp-y', p.y, 0, EGROUND_Y, EGRID)) +
      _row('Typ', _sel('pkp-type', typeOpts, p.type));
    _bindNum('pkp-x',    v => { p.x = v; }); _bindNum('pkp-y', v => { p.y = v; });
    _bindChange('pkp-type', v => { p.type = v; });

  } else if (col === 'ladders') {
    const l = ld.ladders[idx];
    titleEl.textContent = 'Stege';
    bodyEl.innerHTML =
      _row('X',        _num('lp-x',   l.x,            0, 20000,     EGRID)) +
      _row('Y',        _num('lp-y',   l.y,            0, EGROUND_Y, EGRID)) +
      _row('Bredd',    _num('lp-w',   l.w,            8, 200,       EGRID)) +
      _row('Höjd',     _num('lp-h',   l.h,           16, 800,       EGRID)) +
      _row('Rotation', _num('lp-rot', l.rotation || 0, 0, 359, 1));
    _bindNum('lp-x',   v => { l.x = v; });
    _bindNum('lp-y',   v => { l.y = v; });
    _bindNum('lp-w',   v => { l.w = v; });
    _bindNum('lp-h',   v => { l.h = v; });
    _bindNum('lp-rot', v => { l.rotation = v; });

  } else if (col === 'spikes') {
    const s = ld.spikes[idx];
    titleEl.textContent = 'Spikar';
    bodyEl.innerHTML =
      _row('X',        _num('sp-x',   s.x,            0, 20000,     EGRID)) +
      _row('Y',        _num('sp-y',   s.y,            0, EGROUND_Y, EGRID)) +
      _row('Rotation', _num('sp-rot', s.rotation !== undefined ? s.rotation : 180, 0, 359, 1)) +
      '<p style="font-size:0.75rem;opacity:0.6;margin-top:4px">0°=spetsar ned · 180°=spetsar upp</p>';
    _bindNum('sp-x',   v => { s.x = v; });
    _bindNum('sp-y',   v => { s.y = v; });
    _bindNum('sp-rot', v => { s.rotation = v; });

  } else if (col === 'boss') {
    const b = ld.boss;
    titleEl.textContent = 'BOSS';
    const typeOpts = [['samurai','Samurai'],['archer-boss','Bågskyt-boss'],['demon','Demon']];
    bodyEl.innerHTML =
      _row('X',   _num('bp-x', b.x, 0, 20000, EGRID)) +
      _row('Y',   _num('bp-y', b.y, 0, EGROUND_Y, EGRID)) +
      _row('HP',  _num('bp-hp', b.hp, 1, 99, 1)) +
      _row('Typ', _sel('bp-type', typeOpts, b.type));
    _bindNum('bp-x',  v => { b.x = v; }); _bindNum('bp-y', v => { b.y = v; });
    _bindNum('bp-hp', v => { b.hp = v; });
    _bindChange('bp-type', v => { b.type = v; });
  }
}

function _bindNum(id, fn) {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('change', () => fn(parseInt(el.value, 10) || 0));
}
function _bindChange(id, fn) {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('change', () => fn(el.type === 'checkbox' ? el.checked : el.value));
}
