# LingoPDF

A privacy-first Chrome extension for learning languages directly from PDF textbooks.

## Overview

LingoPDF is a lightweight, privacy-focused Chrome Extension designed to help language learners read foreign language PDFs without constant tab-switching.

When reading a German PDF (such as a textbook, article, or Kursbuch):
- Open the document inside the extension's dedicated reader.
- Click or select any German word directly in the text.
- View its English translation, part of speech, canonical base form (lemma), noun gender (`der`, `die`, `das`), and plural forms in a floating tooltip.
- Continue reading smoothly without altering the visual appearance of the original PDF document.

The current release focuses on **German → English**.

## Key Features

- **Dedicated reader interface**: Focused reader tab (`viewer.html`) with customizable viewing options.
- **File ingestion**: Open documents via local file picker or drag-and-drop.
- **PDF.js rendering engine**: Canvas rendering with high-DPI (Retina) display support and single-page memory management.
- **Aligned text layer**: PDF.js text layer aligned 1:1 with the rendering canvas across all zoom levels.
- **Interactive word detection**: Click or drag-select individual words for instant dictionary lookup.
- **German grammatical information**: Displays German noun gender (`der`, `die`, `das`) and plural forms cleanly and compactly in the tooltip.
- **German character support**: Native handling of umlauts and special characters (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`).
- **Punctuation and token cleaning**: Automatic stripping of surrounding punctuation, quotation marks (`„`, `“`, `«`, `»`, `"`, `'`), parentheses, and brackets.
- **Hyphenation handling**: Internal compound hyphens (such as `Deutsch-Englisch`) are preserved while trailing line-break hyphens are cleaned.
- **Case-insensitive matching**: Matches words regardless of casing variations (`Schule`, `schule`, `SCHULE`).
- **Lemma and inflection resolution**: Resolves plurals and conjugated forms to base dictionary entries (for example, `Kaffees` → `Kaffee`, `Bücher` → `Buch`, `Wörter` → `Wort`).
- **Floating tooltip UI**: Dynamically positioned translation popover with automatic viewport collision detection powered by Floating UI.
- **Flexible dismissal**: Tooltip closes on outside click, Escape key press, page navigation, zoom adjustments, or document replacement.
- **Navigation controls**: Previous and next buttons, direct page jump input, and keyboard shortcuts (`←`, `→`, `PageUp`, `PageDown`).
- **Zoom controls**: Zoom in, zoom out, preset percentages, and responsive Fit to Width mode.
- **Native text copying**: Standard PDF text selection and copying remain functional.
- **Scanned page detection & local OCR**: Automatically detects scanned or image-only PDF pages lacking selectable text and extracts selectable text locally using bundled Tesseract.js OCR.
- **Flexible OCR execution**: Automatic background OCR (with user opt-in) or on-demand manual OCR per page, configured via dedicated settings.
- **100% Local and offline operation**: Bundled dual-tier dictionary, offline OCR engine and German language data, plus offline font and CMap assets. Zero backend, zero network lookups, zero telemetry, and zero account requirements.

## How It Works

```text
Local PDF File
      ↓
PDF.js (Worker + Canvas Layer)
      +
PDF.js / OCR Text Layer (1:1 Aligned Interactive DOM Layer)
      ↓
Word Selection (Click / Drag Tokenizer)
      ↓
Dictionary Provider (Interface: sourceLang, targetLang)
      ↓
Composite Provider (Primary: Authored Learner Dict | Fallback: Reference Lexicon)
      ↓
Floating Tooltip (Translation, Lemma, Part of Speech, Gender, Plural)
```

1. **PDF Ingestion and Rendering**: PDF.js renders the document page onto an HTML5 canvas while simultaneously generating an invisible, precisely aligned DOM text layer.
2. **Scanned Page Detection & OCR (if applicable)**: If a page contains rendered images but lacks usable selectable text, LingoPDF classifies it as a scanned candidate. Based on user preference, it can run local Tesseract.js OCR to construct an interactive OCR text layer aligned directly over the canvas.
3. **Word Detection**: The `useWordSelection` hook captures click or selection events on either the native or OCR text layer, cleans surrounding typography, and isolates the target word token. Multi-word selections are suppressed to prevent ambiguous lookups.
4. **Dictionary Provider**: The extracted token is queried against `DictionaryProvider`, an abstraction decoupling the UI from dictionary storage.
5. **Local Lookup Pipeline**: `CompositeDictionaryProvider` first queries an independently authored German–English learner dictionary and falls back to a comprehensive reference lexicon if needed. Exact token matching, case-normalized lookup, and lemma mapping fallback are handled entirely in memory.
6. **Floating Tooltip**: The translation popover displays the queried word, English meanings, part of speech badge, canonical lemma, and German noun grammatical details (gender article and plural form) near the selected word.

## Current Language Support

Current support: **German → English** (`de` → `en`)

The German → English dictionary and German OCR language data are bundled statically inside the extension for completely offline access.

The lookup pipeline uses a generic `DictionaryProvider` interface, establishing a clean path for adding other language pairs in future releases without modifying core viewer or selection code.

## PDF Compatibility & OCR Architecture

| Document Type | Status | Description |
| --- | --- | --- |
| Digital / text-based PDF | Supported | PDFs containing selectable text generated from word processors, digital publishing software, or export tools. |
| Scanned / image-only PDF | Supported (Local OCR) | PDFs consisting purely of scanned page images or lacking an embedded text layer. Processed locally via bundled Tesseract.js OCR. |

### Optical Character Recognition (OCR) Details

LingoPDF includes built-in, 100% offline Optical Character Recognition (OCR) for reading scanned textbooks and image-only pages:

- **Local Tesseract.js Engine**: Tesseract.js runs entirely client-side inside a dedicated Web Worker via WebAssembly (WASM). No image data or document text is ever transmitted over the network.
- **Bundled German OCR Language Data**: Pre-packages German OCR trained models (`deu.traineddata`) directly in the extension bundle, providing full offline recognition for German vocabulary, umlauts (`ä`, `ö`, `ü`), capitalized forms, and Eszett (`ß`).
- **Automatic Scanned-Page Detection**: Evaluates each page's text layer item count, character density, alphanumeric ratio, and visual rendering operators. Pages with visual/image content and no usable selectable text are flagged as scanned candidates, while completely blank pages are ignored.
- **User Opt-In for Automatic OCR**: When a scanned page is encountered for the first time, a non-intrusive opt-in banner invites the user to enable automatic OCR or keep it manual. Preferences persist locally in `localStorage` without telemetry or remote sync.
- **Manual vs. Automatic OCR Execution**:
  - *Automatic Mode*: When opted in, navigating to any scanned page automatically initiates background OCR. Progress indicators inform the user while the page is being analyzed, and an interactive text layer is injected immediately upon completion.
  - *Manual Mode*: When auto-OCR is unset or disabled, a warning banner appears with an explicit "Run OCR" action, allowing users to trigger OCR on-demand for that specific page.
  - *Settings & Preferences*: Users can toggle automatic OCR on/off or reset their preference at any time via the Settings modal (`Navbar` gear icon).
- **Offline Processing & Limitations**:
  - *Hardware Performance*: OCR runs locally on the user's CPU via WebAssembly. High-resolution canvas rendering (300 DPI equivalent) ensures high recognition accuracy, but processing speed depends on local device specifications.
  - *Document Quality*: Built-in recognition is optimized for printed German textbooks and documents. Severely degraded scans, heavy skew, handwritten notes, decorative display fonts, or multi-lingual text may yield reduced accuracy compared to native digital PDF text layers.

## Privacy & Offline Design

LingoPDF operates entirely locally:

- **Local execution**: All PDF rendering, OCR processing, text extraction, word detection, and dictionary queries run locally inside the browser.
- **Zero data transmission**: No document content, page images, selected text, or user interaction data is ever sent over the network.
- **Zero external APIs**: No third-party translation services, cloud OCR engines, AI models, or cloud backends are used.
- **Zero telemetry**: No tracking scripts, analytics, or background logging.
- **Minimal permissions**: The extension manifest requests zero host permissions (`permissions: []`), ensuring it cannot access external websites or monitor browser activity.

## Technology Stack

- **UI Framework**: [React 18](https://react.dev/) (`react`, `react-dom`)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) (`vite`, `@vitejs/plugin-react`)
- **PDF Engine**: [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist` v4.10.38)
- **OCR Engine**: [Tesseract.js](https://github.com/naptha/tesseract.js) (v7.0.0 Web Worker & WASM) with bundled German language data (`deu.traineddata`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (`tailwindcss`, `postcss`, `autoprefixer`)
- **Tooltip Positioning**: [Floating UI](https://floating-ui.com/) (`@floating-ui/react`)
- **Icons**: [Lucide React](https://lucide.dev/) (`lucide-react`)
- **Extension Format**: Chrome Extension Manifest V3

## Project Structure

```text
pdfTranslator/
├── public/
│   ├── cmaps/                  # Bundled PDF.js CMap files (offline CID font support)
│   ├── standard_fonts/         # Bundled PDF.js Standard 14 font files
│   ├── tessdata/               # Bundled German OCR language models (deu.traineddata)
│   ├── tesseract/              # Bundled Tesseract.js worker & WebAssembly runtimes
│   ├── data/                   # Bundled offline dictionary datasets & manifests
│   ├── icons/                  # Extension icons (16x16, 48x48, 128x128)
│   ├── manifest.json           # Chrome Extension Manifest V3
│   └── pdf.worker.min.mjs      # Local PDF.js Web Worker
├── scripts/
│   ├── run-dictionary-release-gate.mjs # 8-suite release gate verification runner
│   ├── verify-phase4-pdf-acceptance.mjs# Chrome CDP browser acceptance test
│   ├── verify-auto-ocr-opt-in.mjs      # Scanned page detection & OCR opt-in tests
│   ├── verify-draft-isolation.mjs      # Lexical isolation & draft safety tests
│   └── test-text-utils.mjs             # Token cleaning & offset unit tests
├── src/
│   ├── components/
│   │   ├── AboutModal.tsx      # About dialog with legal attribution & support contact
│   │   ├── AutoOCROptInBanner.tsx # Scanned page automatic OCR opt-in prompt
│   │   ├── DictionaryTooltip/  # Floating tooltip with grammar info & translations
│   │   ├── EmptyTextWarning.tsx# Scanned page manual OCR banner
│   │   ├── Navbar.tsx          # Top navigation bar with Settings & About triggers
│   │   ├── OCRTextLayer.tsx    # Interactive OCR text selection layer
│   │   ├── PDFControls.tsx     # Page navigation, zoom, and fit-width toolbar
│   │   ├── PDFViewer.tsx       # Canvas viewport & text layer coordinator
│   │   ├── SettingsModal.tsx   # Preferences dialog for automatic OCR
│   │   └── TextLayer.tsx       # PDF.js native text layer & selection binding
│   ├── hooks/
│   │   ├── useDictionaryTooltip.ts# Tooltip positioning & state management
│   │   ├── useOCR.ts           # Page OCR execution, state & caching hook
│   │   └── useWordSelection.ts    # Click & selection detection hook
│   ├── services/
│   │   ├── dictionary/         # Primary authored & fallback reference providers
│   │   ├── ocr/                # Tesseract.js worker management & scanned detection
│   │   ├── pdfService.ts       # PDF.js lifecycle, rendering, and text extraction
│   │   └── settings/           # Persistent local preferences service
│   ├── styles/
│   │   └── textLayer.css       # Text layer alignment & selection styles
│   ├── types/                  # TypeScript interfaces (dictionary, pdf, selection, ocr)
│   ├── utils/                  # Text sanitization & tokenizer utilities
│   ├── App.tsx                 # Main application coordinator
│   ├── background.ts           # Background service worker (launches reader tab)
│   ├── main.tsx                # React root bootstrap
│   └── index.css               # Global Tailwind CSS imports
├── viewer.html                 # Extension reader HTML entry point
├── vite.config.ts              # Vite build & bundle configuration
├── tsconfig.json               # TypeScript compiler configuration
└── package.json                # Dependencies and build scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
# Clone repository and install dependencies
npm install
```

### Development

```bash
# Run local Vite development server
npm run dev
```

### Production Build

```bash
# Typecheck and build the Chrome extension
npm run build
```

The compiled extension will be output to the `dist/` directory.

### Loading into Google Chrome

1. Build the extension with `npm run build`.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable Developer mode using the toggle in the top-right corner.
4. Click Load unpacked in the top-left corner.
5. Select the `dist/` directory from this project folder.
6. Click the LingoPDF extension icon in your Chrome toolbar to open the reader.

## Usage

1. **Launch reader**: Click the extension icon in Chrome to open the dedicated reader tab.
2. **Open a PDF**: Drag and drop a German text PDF into the window, or click Choose PDF to browse.
3. **Read and navigate**: Use the toolbar or arrow keys (`←`, `→`) to change pages; adjust zoom or select Fit Width.
4. **Scanned PDFs**: If a scanned page is detected, choose to enable automatic OCR or click "Run OCR" for manual conversion.
5. **Lookup words**: Click or select any German word to view its definition and grammatical information:
   - `Tag` → der · Plural: Tage → day (noun)
   - `Schule` → die · Plural: Schulen → school (noun)
   - `Buch` → das · Plural: Bücher → book (noun)
   - `Kaffees` → Base: Kaffee · der · Plural: Kaffees → coffee (noun)
   - `größer` → Base: groß → big, large, great (adjective)
   - `lernen` → to learn, study (verb)
6. **Dismiss**: Click anywhere outside the tooltip or press Escape to dismiss the popover.

## Testing & Verification

The project includes automated test suites covering offline dictionary lookups, scanned-page OCR detection, draft data isolation, and real-world PDF browser acceptance:

```bash
# Run consolidated dictionary release gate (8 suites)
npm run release:gate

# Run scanned page detection & automatic OCR opt-in suite
npm run ocr:verify

# Run authored dictionary lookups verification
npm run pilot:test

# Run TypeScript typecheck
npm run typecheck
```

## Known Limitations

- **Scanned / image-only PDFs**: Supported via local Tesseract.js OCR. Processing speed depends on local device CPU performance, and OCR accuracy may vary on degraded scans, handwriting, or complex multi-column layouts compared to clean digital PDFs with native text layers.
- **Document-wide search**: Full-text multi-page search is not implemented in the current version.
- **Dictionary vocabulary**: The bundled German → English vocabulary combines an independently authored learner dictionary (705 headwords, 2,364 inflection keys) with a comprehensive reference lexicon (15,092 headwords, 114,847 inflection keys) derived from English Wiktionary.

## Support & Contact

For support, feedback, or inquiries:
- **Email Support**: [support@lingopdf.in](mailto:support@lingopdf.in)

## Dictionary Attribution & Licensing

The German → English reference lexicon dataset (`public/data/de-en-dictionary.json` and `public/data/de-en-inflections.json`) is derived from English Wiktionary data extracted by the Kaikki.org / Wiktextract project:
- **Upstream Source**: [English Wiktionary](https://en.wiktionary.org/) (German entries)
- **Extraction Project**: [Kaikki.org / Wiktextract](https://kaikki.org/dictionary/German/) (Tatu Ylonen)
- **Dump Snapshot**: 2026-09-02 (`enwiktionary-20260902-pages-articles-multistream.xml.bz2`)
- **Dataset License**: Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0) & GNU Free Documentation License (GFDL)
- **Software License**: Wiktextract is licensed under the MIT License
- **Full Attribution & License Text**: See [`LICENSE_DICTIONARY.txt`](./LICENSE_DICTIONARY.txt) and [`public/LICENSE_DICTIONARY.txt`](./public/LICENSE_DICTIONARY.txt)

## Development Principles

To preserve simplicity and user privacy, LingoPDF is developed under the following guidelines:
- **No remote dependencies**: Core features, OCR, and dictionary lookups run without third-party network services or translation APIs.
- **No user accounts**: No login walls, account registration, or cloud databases.
- **Minimal permissions**: Avoid requesting unnecessary browser permissions in `manifest.json`.
- **Integrity of the document**: The PDF canvas is never altered or visually mutated by the reader.
