// Recolours Google Docs on screen with one click-through layer over the page.
//
// The layer is a pseudo-element on <html> with a colour-matrix backdrop-filter:
// it recolours whatever is drawn behind it and ignores the mouse entirely.
// No Docs element is styled, moved or wrapped, so clicking, scrolling and
// layering behave exactly as they do without the extension.
//
// Earlier versions put the filter on <html> itself. Chrome mis-handles mouse
// hit-testing under an SVG filter on an ancestor of a scrolled area (scrolled-
// away content takes clicks meant for the toolbar), and patching around that
// on Docs' own scroller interfered with trackpad scrolling. Do not go back.
(() => {
  const { DEFAULTS, matrices, normalizeHex } = globalThis.DOCS_DIM;

  // Pictures and colour swatches that get flipped back to their real colours.
  // Only leaf elements in the toolbar area, menus and dialogs. Never filter a
  // container or anything inside the editor: see the note above.
  const RESTORE = [
    '#docs-chrome img',
    '.goog-menu img',
    '.modal-dialog img',
    '.docs-material-colorpalette-colorswatch-color',
  ].join(', ');

  const filterUrl = (values) => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<filter id="f" color-interpolation-filters="sRGB">' +
      `<feColorMatrix type="matrix" values="${values}"/>` +
      '</filter></svg>';
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}#f")`;
  };

  const sheet = new CSSStyleSheet();
  let watch = null;

  const isAttached = () => document.adoptedStyleSheets.includes(sheet);

  function attach() {
    if (!isAttached()) document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  function detach() {
    if (isAttached()) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    }
  }

  function apply(settings) {
    const bg = normalizeHex(settings.bg) || DEFAULTS.bg;
    const fg = normalizeHex(settings.fg) || DEFAULTS.fg;

    if (settings.enabled === false) {
      detach();
      clearInterval(watch);
      watch = null;
      return;
    }

    const { forward, inverse } = matrices(bg, fg);
    let css =
      'html::after { content: ""; position: fixed; inset: 0; z-index: 2147483647; ' +
      `pointer-events: none; backdrop-filter: ${filterUrl(forward)}; }\n`;
    if (inverse) css += `${RESTORE} { filter: ${filterUrl(inverse)} !important; }\n`;
    // Screen only, so printing straight from the browser stays black on white.
    sheet.replaceSync(`@media screen {\n${css}}\n`);
    attach();

    // If Docs ever resets the document's adopted sheets, put ours back.
    watch ??= setInterval(attach, 2000);
  }

  const load = () => chrome.storage.local.get(DEFAULTS).then(apply);

  load();
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'local') load();
  });
})();
