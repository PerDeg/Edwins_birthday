'use strict';
// Load from / save to database via /api/levels and /api/admin/levels/:idx

async function eLoadFromDB() {
  eSetStatus('Laddar från databas…');
  try {
    const resp = await fetch('/api/levels');
    if (!resp.ok) throw new Error(resp.status);
    const rows = await resp.json();
    if (!rows.length) { eSetStatus('Inga sparade levels i DB — använder inbyggda.'); return; }
    rows.forEach(eMergeDbRow);
    eSetStatus(`Laddade ${rows.length} level(s) från DB.`);
    eLoadLevelUI(ES.levelIdx);
  } catch (e) {
    eSetStatus('Kunde inte nå databasen.');
  }
}

async function eSaveToDB() {
  // Ensure we have an admin key
  if (!ES.adminKey) {
    const key = prompt('Admin-lösenord:');
    if (!key) return;
    ES.adminKey = key;
    sessionStorage.setItem('editorAdminKey', key);
  }

  const ld   = eCurrent(); if (!ld) return;
  const idx  = ES.levelIdx;

  eSetStatus('Sparar…');
  try {
    const resp = await fetch(`/api/admin/levels/${idx}`, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ES.adminKey}`,
      },
      body: JSON.stringify({ name: ld.name, data: ld }),
    });

    if (resp.status === 401) {
      ES.adminKey = '';
      sessionStorage.removeItem('editorAdminKey');
      eSetStatus('Fel lösenord — försök igen.');
      return;
    }
    if (!resp.ok) throw new Error(resp.status);
    eSetStatus(`✓ Level ${idx + 1} sparat till databas!`);
  } catch (e) {
    eSetStatus('Fel vid sparning till databas.');
  }
}

async function eResetFromDB() {
  if (!confirm(`Återställ level ${ES.levelIdx + 1} till inbyggd version? (tar bort DB-version)`)) return;
  if (!ES.adminKey) {
    const key = prompt('Admin-lösenord:');
    if (!key) return;
    ES.adminKey = key;
    sessionStorage.setItem('editorAdminKey', key);
  }
  try {
    const resp = await fetch(`/api/admin/levels/${ES.levelIdx}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ES.adminKey}` },
    });
    if (resp.status === 401) { ES.adminKey = ''; sessionStorage.removeItem('editorAdminKey'); eSetStatus('Fel lösenord.'); return; }
    // Restore from C.LEVEL_DATA
    if (C.LEVEL_DATA[ES.levelIdx]) ES.levels[ES.levelIdx] = eToFlat(C.LEVEL_DATA[ES.levelIdx]);
    eLoadLevelUI(ES.levelIdx);
    eSetStatus(`Level ${ES.levelIdx + 1} återställd till inbyggd version.`);
  } catch (e) {
    eSetStatus('Fel vid återställning.');
  }
}
