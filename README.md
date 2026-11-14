# Docs Dim

A Chrome extension that gives Google Docs a display-only dark theme. It recolours what you see on screen and never touches the document: black text stays black in the file, white stays white, and collaborators, exports and prints are unaffected.

## Features

- Two built-in presets: **Grey** (`#2c2c2c` background, `#ffffff` text) and **Atom One Dark** (`#282c34` background, `#abb2bf` text)
- Independent background and text colour pickers, with editable hex fields
- Save, recall and delete your own presets (stored in Chrome sync storage)
- Recolours the whole Docs window, including the toolbar and menus
- Coloured text keeps its hue, so links stay blue and highlights stay recognisable
- On/off switch in the toolbar popup, applied live to open tabs

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Reload any open Google Docs tabs.

If you use another Docs dark mode extension, switch it off first, or the two will stack.

## How it works

The extension adds one transparent, click-through layer over the page (a pseudo-element on `<html>`) with an SVG colour-matrix `backdrop-filter`. The matrix maps white to your background colour and black to your text colour, with a 180 degree hue rotation so inverted colours keep their hue.

No Docs element is styled, moved or wrapped, so clicking, scrolling and layering behave exactly as they do without the extension. The only permission requested is `storage`, for your colour settings.

Images and colour swatches in the toolbar, menus and dialogs are filtered with the inverse matrix so they show close to their real colours.

### Why not a filter on the page itself?

Earlier versions applied the filter to `<html>`. Chrome mishandles mouse hit-testing under an SVG filter on an ancestor of a scrolled area: content that has scrolled out of view still catches clicks, which made the Docs toolbar unclickable once the document was scrolled. Working around that with styles on Docs' own scroller then broke trackpad scrolling. The overlay approach avoids both problems.

## Known limitations

- Images embedded in a document are recoloured along with everything else and can look like negatives. Use the switch to check one.
- Only `docs.google.com/document/*` is covered, not Sheets or Slides.

## Licence

MIT. See [LICENSE](LICENSE).
