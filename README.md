# TenderPack

Professional frontend-only implementation of the AI DevFest **Tender Document Package Builder** problem.

## What it implements

- Load and validate `requirements.json`.
- Upload up to 30 PDFs / 50 MB total.
- Count PDF pages in-browser and safely report damaged/password-protected PDFs.
- Match at most one file to each requirement and each file to at most one requirement.
- Track expiry dates for requirements that declare `has_expiry: true`.
- Exact blocking statuses from the problem statement: Missing, Expiry date needed, Expired. Optional unmatched documents show Not provided; valid documents show OK.
- SHA-256 content hashing to detect duplicates even when filenames differ.
- Prevent duplicate content from being matched to different requirements.
- Search/filter the checklist and auto-match common filenames.
- Browser-only combined PDF generation with English cover, optional index page, exact requirement order, original page order, and `<tender_id> | Page X of Y` footer on every page.
- CSV checklist export.
- Portable project save/reopen using ZIP (requirements + files + project state).
- First-page PDF preview.
- English/Bangla UI switch.

## Run

This is a static site. Open `index.html` in Chrome, or deploy the folder to Vercel/GitHub Pages/any static host.

The core app can work from a local file for user uploads; the **Try sample pack** button needs a static server because browser `file://` restrictions can block `fetch()` of bundled demo assets. The provided problem pack can always be imported directly with **Import**.

## Contest note

No tender documents are sent to a participant-controlled backend by this app. PDF processing and package generation happen client-side.
