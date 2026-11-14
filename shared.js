// Shared by the content script and the popup.
(() => {
  const PRESETS = [
    { id: 'grey', name: 'Grey', bg: '#2c2c2c', fg: '#ffffff' },
    { id: 'atom', name: 'Atom One Dark', bg: '#282c34', fg: '#abb2bf' },
  ];

  const DEFAULTS = { enabled: true, bg: PRESETS[0].bg, fg: PRESETS[0].fg };

  // hue-rotate(180deg), from the CSS Filter Effects spec. Applied after an
  // inversion, it flips lightness while keeping hues close to where they were,
  // so blue links stay blue and yellow highlights stay yellow.
  const H = [
    [-0.574, 1.43, 0.144],
    [0.426, 0.43, 0.144],
    [0.426, 1.43, -0.856],
  ];

  const normalizeHex = (value) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(value).trim());
    return m ? `#${m[1].toLowerCase()}` : null;
  };

  const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  function invert3(m) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;
    return [
      [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  }

  const toValues = (M, o) =>
    [
      M[0][0], M[0][1], M[0][2], 0, o[0],
      M[1][0], M[1][1], M[1][2], 0, o[1],
      M[2][0], M[2][1], M[2][2], 0, o[2],
      0, 0, 0, 1, 0,
    ]
      .map((n) => Number(n.toFixed(6)))
      .join(' ');

  // Returns feColorMatrix values for:
  //   forward: page colour v -> fg - (fg - bg) * H·v  (white -> bg, black -> fg)
  //   inverse: the exact reverse, used on photos so they don't show as negatives.
  //            null when bg and fg are too close in a channel to reverse cleanly.
  function matrices(bgHex, fgHex) {
    const bg = hexToRgb(bgHex);
    const fg = hexToRgb(fgHex);
    const d = fg.map((f, c) => f - bg[c]);
    const M = H.map((row, c) => row.map((h) => -d[c] * h));
    const forward = toValues(M, fg);

    let inverse = null;
    if (d.every((x) => Math.abs(x) >= 2 / 255)) {
      const Mi = invert3(M);
      if (Mi) {
        const o = Mi.map((row) => -(row[0] * fg[0] + row[1] * fg[1] + row[2] * fg[2]));
        inverse = toValues(Mi, o);
      }
    }
    return { forward, inverse };
  }

  globalThis.DOCS_DIM = { PRESETS, DEFAULTS, matrices, normalizeHex };
})();
