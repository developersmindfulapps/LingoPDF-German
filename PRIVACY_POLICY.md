# Privacy Policy for LingoPDF

**Effective Date:** October 19, 2026  
**Last Updated:** November 2026  
**Version:** 1.0  
**License:** Proprietary Commercial Software with Bundled Open-Source Components  

---

## Executive Summary

**LingoPDF operates 100% locally and offline inside your browser.**

We do not collect, transmit, store, sell, or analyze your personal data, reading materials, search queries, or browsing behavior. Zero external network requests are initiated by this extension during reading and word lookup.

---

## 1. Single Purpose & Product Positioning

LingoPDF is an offline-first vocabulary-building PDF reader designed to help users read German documents and study vocabulary without distractions.

Users open their local PDF documents directly in the reader and select individual words or terms to view instant English translations, grammatical classifications, inflections, and CEFR levels. LingoPDF also includes built-in client-side optical character recognition (OCR) for scanned documents.

**Important Note:** LingoPDF is an individual word-lookup and vocabulary-learning reader, **not a whole-document machine translation tool**. Documents are never sent to remote translation APIs or cloud servers.

## 2. Zero Data Collection

When you use the LingoPDF extension:

- **No Personal Identifiers:** We do not collect names, email addresses, IP addresses, or device identifiers.
- **No Document Transmission:** Your PDF files are read and rendered solely inside your local browser tab memory. Files and page images are never uploaded, synchronized, or transmitted to any remote server or third-party service.
- **No Query Tracking:** Selected words and lookup queries are resolved entirely against local, bundled dictionary files. Your lookup history is neither recorded nor transmitted over any network.
- **No Telemetry or Analytics:** The extension contains zero tracking pixels, analytics scripts (such as Google Analytics or Mixpanel), advertising trackers, or error reporting beacons.

## 3. Offline Architecture & Bundled Assets

All core assets required for offline reading, word lookup, and OCR are packaged directly inside the extension:

- **PDF Rendering:** Executed locally via a bundled Mozilla PDF.js web worker.
- **OCR Engine:** Executed in-browser using locally packaged Tesseract.js WebAssembly (WASM) and local German language models (`deu.traineddata.gz`).
- **Dictionary Lookups:** Retrieved from locally bundled, pre-indexed JSON datasets.
- **Third-Party Open-Source Components:** Bundled third-party components (including PDF.js and Tesseract.js) are distributed under their respective open-source licenses (e.g., Apache 2.0). Complete attribution and license notices are available in the bundled `THIRD_PARTY_LICENSES.txt` and within the extension's About dialog.

## 4. Minimal Manifest Permissions

In accordance with Google Chrome Web Store Minimal Permissions guidelines, LingoPDF requests **zero broad host or data permissions**:

- `permissions`: None.
- `host_permissions`: None (the extension has no access to any websites or web requests).
- `content_security_policy`: Strictly restricted to local extension packages (`'self' 'wasm-unsafe-eval'`).

## 5. Local Storage & Caching

Any application state (such as UI zoom preferences, user settings, or transient OCR word coordinate cache for the active page) is maintained solely in the active tab's volatile memory or browser-managed local storage. All data remains exclusively on your personal device and can be cleared at any time through your browser settings.

## 6. Children's Privacy

Because LingoPDF collects, transmits, and stores zero personal data, it is inherently compliant with global children's privacy regulations, including COPPA and GDPR-K.

## 7. Support & Inquiries

For questions, support requests, or privacy inquiries regarding LingoPDF, please contact our support team:

- **Official Support Email:** [support@lingopdf.in](mailto:support@lingopdf.in)
- **Official Website:** [https://www.lingopdf.in](https://www.lingopdf.in)
- **Hosted Privacy Policy:** [https://www.lingopdf.in/privacy](https://www.lingopdf.in/privacy)
- **Terms of Service:** [https://www.lingopdf.in/terms](https://www.lingopdf.in/terms)
