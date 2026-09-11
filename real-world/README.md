# Real-World Fixtures

Authentic photographed donation documents. **Nothing in this directory is
synthetic, generated, or covered by `scripts/generate_from_donations.js`.**

Everything under `documents/` is rendered from `donations.json` and byte-checked
by `scripts/validate_fixtures.js`. These files are the opposite: real paper,
photographed on a phone, with every artefact that implies. They are deliberately
kept outside `documents/` so the generated tree stays purely generated and
`npm test` keeps asserting exact parity against the manifest.

They are therefore **not** in `donations.json` and **not** in `manifest_v2.json`.
Point OCR at them directly.

## Why these exist

The synthetic handwritten fixtures render Caveat at a known size, on a clean
white page, at a known angle. They test that the pipeline routes handwriting to
`REQUIRES_REVIEW`. They cannot test whether the pipeline copes with a photograph
of a creased slip lying on a kitchen table, which is what users actually upload.

## Inventory

| File | Document | Source |
|------|----------|--------|
| `patrick_handwritten_donation.jpg` | Salvation Army Adult Rehabilitation Center gift-in-kind slip | Donated 2026-09-11, photographed by the donor |

---

## `patrick_handwritten_donation.jpg`

4284×5712 JPEG, 1,424,858 bytes,
SHA-256 `2be8a720c551651d37a08670276553c6a3b06631367596997cbb95f2fbfca0b4`.

A genuine non-cash goods donation: three tuxedo items to a qualifying 501(c)(3),
self-valued by the donor at $110.00 total.

### Expected fields

| Field | Value |
|-------|-------|
| `donee_name` | The Salvation Army Adult Rehabilitation Center |
| `donee_address` | 62 Hanson Place, Brooklyn, NY 11217 |
| `donee_ein` | *(absent — the slip carries none)* |
| `donor_name` | Patrick Sheehy |
| `donor_address` | 208 8th Avenue, New York, NY 10011 |
| `contribution_date` | 2026-09-11 |
| `reference_number` | 423790 |
| `asset_type` | `noncash_goods` |
| `amount` | 110.00 |
| `deductible` | `true` |

Line items, all condition "good": tuxedo pants (used) $40.00, tuxedo jacket
$50.00, tuxedo shirt $20.00.

At $110.00 this is a non-cash gift under $250, so a receipt alone substantiates
it — no Form 8283, no written acknowledgment. See `IRS_FORMS_README.md`.

### What makes it hard

Every one of these is absent from the synthetic set:

- **It is a photograph, not a scan.** Perspective skew, barrel distortion, and a
  page that is not axis-aligned. The slip sits on a wood-grain table that fills
  the margins, so the document must be detected before it can be read.
- **Uneven lighting.** A soft shadow gradient runs down the page; the lower half
  is measurably darker than the header.
- **Physical damage.** Two hard fold creases cross the article table, plus
  scattered brown discoloration on the thin newsprint-weight stock.
- **Mixed ink and media.** Pre-printed black form, blue ballpoint handwriting,
  a red stamped reference number, and a cursive administrator signature.
- **Handwriting over ruled lines**, with descenders crossing the rules and
  values written outside the column borders rather than inside them.
- **Ambiguous glyphs.** The total reads as either `$110.00` or `$170.00`
  depending on how the leading digit is resolved. It is $110.00 — the line
  items sum to it. This is a good arithmetic-consistency check: a pipeline that
  cross-foots the line items against the stated total recovers the right answer,
  one that reads the glyph in isolation has a coin flip.
- **Dense small-print legal text** in the footer, at low contrast, which should
  not be mistaken for donation data.
- **US short-form date** (`9/11/26`) needing normalisation to `2026-09-11`.
- **No EIN anywhere on the document**, so donee identification depends on
  organisation-name enrichment.

### Expected outcome

`REQUIRES_REVIEW`. As with the synthetic handwritten slips, the pre-printed
charity block should extract cleanly while the handwritten donor, date, lots and
values should not be trusted without confirmation. The difference here is that
the photographic conditions put the *printed* face at risk too, which the
synthetic fixtures never do.

## Privacy

This is a real receipt naming a real donor and address, published deliberately
in a public repository with the donor's consent. Do not add third-party
documents here — a real document about anyone other than yourself does not
belong in this repo.
