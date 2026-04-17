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
    bodyEl.innerHTML =
      _row('X',     _num('pp-x', p.x, 0, 20000, EGRID)) +
      _row('Y',     _num('pp-y', p.y, 0, EGROUND_Y, EGRID)) +
      _row('Bredd', _num('pp-w', p.w, EGRID, 2000, EGRID));
    _bindNum('pp-x', v => { p.x = v; });
    _bindNum('pp-y', v => { p.y = v; });
    _bindNum('pp-w', v => { p.w = v; });

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
    titleEl.textContent = h.type === 'barrel' ? 'Tunna' : 'Skugga';
    const typeOpts = [['barrel','Tunna'],['shadow','Skugga']];
    bodyEl.innerHTML =
      _row('X',   _num('hp-x', h.x, 0, 20000, EGRID)) +
      _row('Y',   _num('hp-y', h.y, 0, EGROUND_Y, EGRID)) +
      _row('Typ', _sel('hp-type', typeOpts, h.type));
    _bindNum('hp-x', v => { h.x = v; }); _bindNum('hp-y', v => { h.y = v; });
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
