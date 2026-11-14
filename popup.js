(() => {
  const { PRESETS, DEFAULTS, matrices, normalizeHex } = globalThis.DOCS_DIM;
  const $ = (id) => document.getElementById(id);

  // Current colours live in local storage (they change constantly while you
  // drag a picker). Saved presets are small and rarely written, so they use
  // sync storage and follow you to other computers signed in to Chrome.
  let state = { ...DEFAULTS };
  let custom = [];
  let pending = null;

  const same = (a, b) => a.bg === b.bg && a.fg === b.fg;
  const allPresets = () => [...PRESETS, ...custom];

  function save(patch) {
    state = { ...state, ...patch };
    render();
    const first = pending === null;
    pending = { ...pending, ...patch };
    if (first) {
      requestAnimationFrame(() => {
        chrome.storage.local.set(pending);
        pending = null;
      });
    }
  }

  function card(p, { deletable }) {
    const item = document.createElement('div');
    item.className = 'preset-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset';
    btn.dataset.bg = p.bg;
    btn.dataset.fg = p.fg;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.textContent = 'Aa';
    swatch.style.cssText = `background:${p.bg};color:${p.fg}`;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name;
    btn.append(swatch, name);
    btn.title = `Background ${p.bg}, text ${p.fg}`;
    btn.addEventListener('click', () => save({ bg: p.bg, fg: p.fg }));
    item.append(btn);

    if (deletable) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete';
      del.textContent = '×';
      del.setAttribute('aria-label', `Delete ${p.name}`);
      del.title = 'Delete';
      del.addEventListener('click', () => setCustom(custom.filter((c) => c.id !== p.id)));
      item.append(del);
    }
    return item;
  }

  function buildPresets() {
    $('presets').replaceChildren(...PRESETS.map((p) => card(p, { deletable: false })));
    $('custom-presets').replaceChildren(...custom.map((p) => card(p, { deletable: true })));
    $('custom-empty').hidden = custom.length > 0;
    render();
  }

  async function setCustom(next) {
    try {
      await chrome.storage.sync.set({ customPresets: next });
      custom = next;
      $('status').textContent = '';
      buildPresets();
    } catch (err) {
      $('status').textContent = 'Couldn’t save presets: Chrome’s sync storage is full.';
    }
  }

  function render() {
    $('enabled').checked = state.enabled;
    document.body.classList.toggle('is-off', !state.enabled);

    $('preview-matrix').setAttribute('values', matrices(state.bg, state.fg).forward);
    $('preview').classList.toggle('filtered', state.enabled);

    for (const btn of document.querySelectorAll('.preset')) {
      btn.setAttribute('aria-pressed', String(same(btn.dataset, state)));
    }

    for (const key of ['bg', 'fg']) {
      $(`${key}-color`).value = state[key];
      const hex = $(`${key}-hex`);
      if (document.activeElement !== hex) {
        hex.value = state[key];
        hex.removeAttribute('aria-invalid');
      }
    }

    const match = allPresets().find((p) => same(p, state));
    const start = $('save-start');
    start.disabled = Boolean(match);
    start.textContent = match ? `Matches ${match.name}` : 'Save current colours';
    if (match && !$('save-row').hidden) closeSaveRow();
  }

  // Saving a preset
  function openSaveRow() {
    $('save-start').hidden = true;
    $('save-row').hidden = false;
    const input = $('save-name');
    input.value = `Preset ${custom.length + 1}`;
    input.focus();
    input.select();
  }

  function closeSaveRow() {
    $('save-row').hidden = true;
    $('save-start').hidden = false;
  }

  $('save-start').addEventListener('click', openSaveRow);
  $('save-cancel').addEventListener('click', closeSaveRow);
  $('save-name').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSaveRow();
    }
  });
  $('save-row').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('save-name').value.trim() || `Preset ${custom.length + 1}`;
    const preset = { id: `c${Date.now().toString(36)}`, name, bg: state.bg, fg: state.fg };
    closeSaveRow();
    setCustom([...custom, preset]);
  });

  // Colour inputs
  function wire(key) {
    const picker = $(`${key}-color`);
    const hex = $(`${key}-hex`);

    picker.addEventListener('input', () => save({ [key]: picker.value.toLowerCase() }));

    hex.addEventListener('input', () => {
      const value = normalizeHex(hex.value);
      if (value) {
        hex.removeAttribute('aria-invalid');
        save({ [key]: value });
      }
    });
    hex.addEventListener('change', () => {
      const value = normalizeHex(hex.value);
      if (value) {
        hex.value = value;
        hex.removeAttribute('aria-invalid');
      } else {
        hex.setAttribute('aria-invalid', 'true');
      }
    });
    hex.addEventListener('blur', () => {
      if (!normalizeHex(hex.value)) hex.value = state[key];
      hex.removeAttribute('aria-invalid');
    });
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') hex.blur();
    });
  }

  $('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
  wire('bg');
  wire('fg');

  Promise.all([
    chrome.storage.local.get(DEFAULTS),
    chrome.storage.sync.get({ customPresets: [] }),
  ]).then(([stored, synced]) => {
    state = {
      enabled: stored.enabled !== false,
      bg: normalizeHex(stored.bg) || DEFAULTS.bg,
      fg: normalizeHex(stored.fg) || DEFAULTS.fg,
    };
    custom = (synced.customPresets || []).filter((p) => normalizeHex(p.bg) && normalizeHex(p.fg));
    buildPresets();
  });

  buildPresets();
})();
