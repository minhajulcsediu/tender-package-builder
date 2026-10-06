# Tender Package Builder

> A frontend-only web app that turns a pile of PDF files into **one checked, correctly ordered tender submission package** — in English or Bangla.

Built for the **AI DevFest – Vibe Coding** contest (problem: *Tender Document Package Builder*, 90-minute build).

Everything runs **in your browser**. No tender document is ever uploaded to a server.

![Statuses screen](screenshots/04_all_checks_passed.png)

---

## The problem

Bidders must submit a fixed set of documents (trade license, TIN, VAT, bank solvency, experience certificates, proposals, …) in a specified order. Some are mandatory, some optional, some must still be valid on the submission date. Preparing this by hand leads to missing, expired, duplicated or misplaced documents — and rejected bids.

## What the app does

1. **Load** `requirements.json` – shows tender details and the required documents sorted by `order`.
2. **Upload** many PDFs at once (max 30 files / 50 MB). Shows name, page count and size. Non-PDFs are rejected with a clear message; any file can be removed.
3. **Match** each file to one requirement (1 file ↔ 1 document, change/undo any time).
4. **Enter expiry dates** for documents with `has_expiry: true`.
5. **Live status check** for every requirement:

   | Status | When | Blocks? |
   |---|---|---|
   | Missing | Mandatory, no file matched | Yes |
   | Expiry date needed | Has expiry, file matched, no date | Yes |
   | Expired | Expiry date is *before* the submission deadline | Yes |
   | Not provided | Optional, no file | No |
   | OK | Matched and (if applicable) expiry on/after the deadline | No |

   Expiring *on* the deadline day is still **OK**.
6. **Duplicate detection** – files with identical content (SHA-256) are flagged even if names differ, and cannot be matched to two different documents.
7. **Generate** is disabled while anything blocks, and the reasons are listed.
8. **Download** `<tender_id>_Package.pdf`.
9. **Bangla / English** switch for the whole UI; document names follow `title_bn` / `title_en`.

### Generated PDF layout

- **Page 1** – English cover page: tender ID, title, procuring entity, bidder, submission deadline, creation date, ordered list of included documents.
- *(optional)* **Index page** – page number where each document starts, with Bangla titles rendered correctly.
- Documents in `order`, every page in original order; optional documents without a file are skipped.
- **Footer on every page** (including the cover): `<tender_id> | Page X of Y`. The footer sits in an added strip *below* each page, so it never covers document content.

### Bonus features implemented

| Bonus | Status |
|---|---|
| Index page | ✅ |
| Seal / signature PNG on chosen pages (and optional logo on cover/index) | ✅ |
| Export checklist to CSV (and re-import) | ✅ |
| Save / reopen project file (`.json`) | ✅ |
| Bangla text rendered on PDF index | ✅ |
| Auto-match by file name | ✅ |
| Safe handling of damaged / password-protected PDFs | ✅ |
| AI-assisted matching with your own Anthropic API key | ✅ (only file names + titles are sent, never PDF content; key is not stored) |

---

## Hidden problems in the sample pack — and how the app surfaces them

| Problem | Where | How the app handles it |
|---|---|---|
| **Expired document** | `trade_license_2025.pdf` expires 2025-06-30, before the 2026-10-20 deadline | Status **Expired** → blocks generation. See [screenshot 03](screenshots/03_expired_trade_license_blocks.png). Use `trade_license_2026.pdf` (expires 2027-06-30) instead. |
| **Duplicate file** | `experience_cert.pdf` and `experience_cert (1).pdf` are byte-identical | Both flagged **Duplicate**; only one can be matched. |
| **Missing expiry date** | Bank solvency letter needs an expiry date (2026-12-31 in the PDF) | Status **Expiry date needed** until entered. |
| **Ambiguous file name** | `scan_0042.pdf` is actually the signed declaration | Auto-match leaves it for the user; match it manually to *Signed Declaration*. |
| **Two near-identical candidates** | Two trade license years | Auto-match deliberately skips ambiguous ties instead of guessing. |
| **Optional docs absent** | Audited Financial Statement, Manufacturer's Authorization | **Not provided**, non-blocking, skipped in package. |

The package built from the sample pack is committed at [`output/T-2026-0417_Package.pdf`](output/T-2026-0417_Package.pdf) (17 pages: cover + index + 15 document pages).

---

## Run it

No build step, no dependencies to install.

```bash
git clone https://github.com/<your-username>/tender-package-builder.git
cd tender-package-builder
# open index.html in Google Chrome, or serve it:
python3 -m http.server 8000   # then visit http://localhost:8000
```

> The app loads [`pdf-lib`](https://pdf-lib.js.org/) from cdnjs and the Noto Sans Bengali font from Google Fonts, so an internet connection is needed on first load.

### Try it with the sample pack

1. Click **Click or drop requirements.json here** → choose `sample-pack/requirements.json`.
2. Upload every PDF in `sample-pack/documents/`.
3. Click **Auto-match by file name**, then fix the rest by hand:
   - *Trade License* → `trade_license_2026.pdf`, expiry `2027-06-30`
   - *Bank Solvency Certificate* → expiry `2026-12-31`
   - *Signed Declaration* → `scan_0042.pdf`
4. Press **Generate package**, then **Download**.

### requirements.json format

```json
{
  "tender": {
    "tender_id": "T-2026-0417",
    "title": "Supply of IT Equipment",
    "procuring_entity": "Directorate of Sample Services",
    "bidder": "Meghna Tech Solutions Ltd.",
    "submission_deadline": "2026-10-20"
  },
  "requirements": [
    { "id": "R01", "order": 1, "title_en": "Trade License",
      "title_bn": "ট্রেড লাইসেন্স", "mandatory": true, "has_expiry": true }
  ]
}
```

## Deploy (public HTTPS)

A GitHub Pages workflow is included (`.github/workflows/pages.yml`). In your repo go to **Settings → Pages → Source: GitHub Actions**, push to `main`, and the site goes live at `https://<your-username>.github.io/<repo>/`.

## Tech

Single-file vanilla HTML/CSS/JS ([`index.html`](index.html)) plus `pdf-lib` for merging, footers, images and embedding. Bangla headings are drawn to canvas with Noto Sans Bengali and embedded as images so conjunct letters render correctly in the PDF. Content hashing uses the Web Crypto API (SHA-256). Tested in Chrome.

## Repository layout

```
├── index.html              # the whole app
├── sample-pack/            # contest sample data (requirements.json + documents/)
├── output/                 # package generated from the sample pack
├── screenshots/            # UI screenshots (statuses, expired, Bangla, result)
├── docs/                   # original problem statement
├── .github/workflows/      # GitHub Pages deployment
├── LICENSE
└── README.md
```

## Screenshots

| | |
|---|---|
| ![Upload](screenshots/01_loaded_and_uploaded.png) Files loaded, duplicates flagged | ![Auto-match](screenshots/02_auto_match.png) Auto-match result |
| ![Expired](screenshots/03_expired_trade_license_blocks.png) Expired license blocks generation | ![Ready](screenshots/04_all_checks_passed.png) All checks passed |
| ![Bangla](screenshots/05_bangla_ui.png) Bangla UI | ![Done](screenshots/06_package_generated.png) Package generated |

## Privacy

All processing happens locally in the browser. The only optional network call is the AI-matching button, which sends file names and requirement titles (never document content) to the Anthropic API using a key you type in; the key is kept in memory only.

## Development log / AI usage

Built with AI assistance as part of the AI DevFest vibe-coding contest. Per the contest rules, each commit message should state what changed and the AI prompt used (or `Manual edit`).

## License

[MIT](LICENSE) — sample-pack data is fictional and for contest use only.
