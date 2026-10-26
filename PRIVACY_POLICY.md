# Privacy Policy for PDF Language Companion

**Effective Date:** October 19, 2026  
**Version:** 1.0  
**License:** Open Source / Offline Software  

---

## Executive Summary

**PDF Language Companion operates 100% locally and offline inside your browser.**

We do not collect, transmit, store, sell, or analyze your personal data, reading materials, search queries, or browsing behavior. Zero external network requests are initiated by this extension.

---

## 1. Single Purpose

PDF Language Companion is an offline study aid designed to allow users to read local PDF documents with instant German-to-English dictionary lookups and built-in optical character recognition (OCR).

## 2. Zero Data Collection

When you use PDF Language Companion:

- **No Personal Identifiers:** We do not collect names, email addresses, IP addresses, or device identifiers.
- **No Document Transmission:** Your PDF files are read solely into browser memory. Files are never uploaded, synchronized, or transmitted to any external server or cloud service.
- **No Query Tracking:** The words and phrases you look up are resolved against bundled local dictionary files. Lookup history is neither logged nor sent over the network.
- **No Telemetry or Analytics:** The extension contains zero tracking pixels, analytics scripts (such as Google Analytics or Mixpanel), advertising trackers, or error reporting beacons.

## 3. Offline Architecture & Bundled Assets

All assets required for operation are packaged locally inside the extension archive:

- PDF rendering is executed via a locally bundled Mozilla PDF.js web worker.
- OCR is executed in-browser using locally packaged Tesseract.js WebAssembly (WASM) and local German language models (`deu.traineddata.gz`).
- Dictionary definitions are retrieved from pre-indexed, locally packaged JSON files.

## 4. Manifest Permissions

In accordance with Chrome Web Store Minimal Permissions guidelines, PDF Language Companion requests **zero broad permissions**:

- `permissions`: None.
- `host_permissions`: None (the extension has no access to any websites or web requests).
- `content_security_policy`: Strictly restricted to local extension packages (`'self' 'wasm-unsafe-eval'`).

## 5. Local Storage & Caching

Any application state (such as UI zoom preference or transient OCR word positions for the active page) is maintained solely in the active tab's volatile memory or browser-managed local cache. This data remains entirely under the user's control on their local device.

## 6. Children's Privacy

Because PDF Language Companion collects no data whatsoever, it is inherently compliant with children's privacy regulations, including COPPA and GDPR-K.

## 7. Contact & Verification

PDF Language Companion is open source. You may inspect the code, verify offline behavior, or report issues on our project repository.
