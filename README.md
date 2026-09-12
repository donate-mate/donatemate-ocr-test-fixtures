# DonateMate OCR Test Fixtures

Test documents for OCR validation testing with AWS Textract and Google Vision.

## Overview

This repository contains donation-related documents for testing OCR extraction accuracy. Almost all are programmatically generated: **synthetic**, and marked with "SAMPLE - FOR TESTING ONLY" watermarks.

The exception is a small number of [photographed fixtures](#photographed-fixtures) — real paper captured on a phone, which exist to test what a clean render cannot: skew, creases, shadow and real handwriting. They are currently D038.

## Document Inventory

| Form Type | Count | Description |
|-----------|-------|-------------|
| acknowledgment_letter | 25 | Written acknowledgments for cash and non-cash donations, including Section B gifts |
| appraisal | 8 | Signed qualified appraisals for FMV-basis donations >$5,000 |
| bank_statement | 1 | Bank records for cash donations <$250 |
| cancelled_check | 1 | Cancelled checks for cash donations <$250 |
| form_1098c | 3 | Vehicle donations >$500 with explicit sale or needy-transfer disposition |
| form_8283_section_a | 6 | Non-cash donations $501-$5,000 and gross-proceeds vehicle donations |
| form_8283_section_b | 8 | FMV-basis non-cash donations >$5,000, including vehicles, closely-held stock, and real estate |
| receipt | 5 | Non-cash donation receipts <$500, including one photographed real slip |
| stock_confirmation | 3 | Publicly traded securities transfers |
| gofundme_receipt | 3 | **Non-deductible** crowdfunding (GoFundMe personal fundraiser) payment confirmations |

### Non-Deductible Fixtures

Most fixtures model IRS-deductible charitable gifts. The `gofundme_receipt` type is the
exception: it represents money sent to an individual organizer through a personal
crowdfunding campaign. These documents carry **no EIN** and state explicitly that the
contribution is **not tax deductible** — useful for testing OCR/classification that must
distinguish deductible charitable receipts from non-deductible payment confirmations.

Every donation declares an explicit boolean `deductible` expectation. Omission is invalid
and never defaults to `true`. The charitable fixtures D001–D034 and D038 are deductible and
use qualifying organizations; only the personal GoFundMe fixtures D035–D037 are
non-deductible.
Fixtures that exercise terminal organization enrichment also declare a `VALID`
`einValidationExpectation` with the evidence rationale. Negative EIN outcomes belong in
the focused EIN-validation test suite rather than changing the meaning of these charitable
OCR fixtures.

All machine-read dates are rendered as `YYYY-MM-DD`, matching the OCR structured-data
contract directly. Every PNG also carries the deterministic
`DonateMateFixtureRevision=dm-3062-v1` text chunk. The revision changes fixture bytes
without changing their pixels, preventing historical uploads by a different synthetic
account from contaminating duplicate-image fraud checks.

## Directory Structure

```
donatemate-ocr-test-fixtures/
├── README.md
├── IRS_FORMS_README.md           # IRS documentation requirements reference
├── donations.json                 # Master donation definitions (38 test cases)
├── manifest_v2.json               # Generated document manifest with expected fields
├── documents/
│   ├── acknowledgment_letter/     # acknowledgment_letter_D001.png, ...
│   ├── appraisal/                 # appraisal_D013.png, ...
│   ├── bank_statement/            # bank_statement_D001.png
│   ├── cancelled_check/           # cancelled_check_D002.png
│   ├── form_1098c/                # form_1098c_D017.png, ...
│   ├── form_8283_section_a/       # form_8283_section_a_D010.png, ...
│   ├── form_8283_section_b/       # form_8283_section_b_D013.png, ...
│   ├── receipt/                   # receipt_D006.png, ..., receipt_D038.jpg
│   ├── stock_confirmation/        # stock_confirmation_D020.png, ...
│   └── gofundme_receipt/          # gofundme_receipt_D035.png, ...
└── scripts/
    └── generate_from_donations.js # Generator script
```

## Photographed Fixtures

Almost every fixture is drawn by `generate_from_donations.js`: a clean white
page, a known angle, a known font. A **photographed** fixture is the exception —
real paper captured on a phone, where the committed file *is* the fixture.

They are ordinary fixtures in every other respect: declared in `donations.json`,
listed in `manifest_v2.json`, sitting in the right `documents/<form_type>/`
directory, and covered by `npm test`. A donation opts in by declaring a `source`
block:

```json
"source": {
  "kind": "photograph",
  "extension": "jpg",
  "capturedOn": "2026-09-11",
  "provenance": "Where the document came from",
  "consent": "Why it is publishable here"
}
```

The generator then **describes** the document instead of drawing it — it never
writes over the bytes, and the obsolete-file sweep leaves it alone. Every
manifest entry carries `"source": "photograph"` or `"source": "rendered"`, so a
consumer can tell whether a miss is a pipeline defect or the expected cost of
reading real paper.

Two consequences worth knowing:

- **They cannot be regenerated.** Delete one and it is gone. `validate_fixtures.js`
  checks each is present, large enough to be a real capture, and actually the
  format it claims.
- **They carry no fixture revision.** `DonateMateFixtureRevision` lives in a PNG
  `tEXt` chunk, and a JPEG has nowhere to put it, so photographed fixtures are
  excluded from that check. Duplicate-image fraud tests that rely on the revision
  should skip them.

Because they depict real people, `provenance` and `consent` are required and
enforced. Only add a document you are the subject of.

### D038 — `receipt/receipt_D038.jpg`

A genuine Salvation Army Adult Rehabilitation Center gift-in-kind slip, donated
and photographed 2026-09-11. Three tuxedo items, self-valued by the donor at
$110.00 — a non-cash gift under $250, so a receipt alone substantiates it.

What it exercises that no rendered fixture can:

- **A photograph, not a scan.** Perspective skew and a wood-grain table filling
  the margins, so the page must be detected before it can be read.
- **Uneven lighting.** A shadow gradient runs down the page; the lower half is
  measurably darker than the header.
- **Physical damage.** Two hard fold creases across the article table, plus
  discoloration on thin newsprint-weight stock.
- **Mixed media.** Pre-printed black form, blue ballpoint handwriting, a red
  stamped reference number, and a cursive signature.
- **Handwriting over ruled lines**, with values written outside the column
  borders rather than inside them.
- **An ambiguous glyph.** The handwritten total reads as either `$110.00` or
  `$170.00` depending on how the leading digit is resolved. It is $110.00 — the
  line items sum to it. A pipeline that cross-foots `lineItems` against the
  stated total recovers the right answer; one that reads the glyph in isolation
  has a coin flip. `lineItems` is in `donations.json` for exactly this.
- **Dense low-contrast legal small print** in the footer that must not be
  mistaken for donation data.
- **A short-form date** (`9/11/26`) needing normalisation to `2026-09-11`.
- **No EIN anywhere**, so donee identification depends on name enrichment.

Expected outcome is `REQUIRES_REVIEW`: the pre-printed charity block should
extract cleanly while the handwritten donor, date, lots and values should not be
trusted without confirmation. Unlike a rendered fixture, the photographic
conditions put the *printed* face at risk too.

## Naming Convention

```
<form_type>_<donation_id>.<ext>
```

`ext` is `png` for rendered fixtures and the source extension for photographed
ones.

Examples:
- `acknowledgment_letter_D003.png`
- `form_8283_section_a_D010.png`
- `appraisal_D013.png`
- `receipt_D038.jpg` (photographed)

## Linked Forms

For donations requiring multiple forms, **all forms share consistent data**:

| Donation | Forms Generated | Donor | Donee | Amount |
|----------|-----------------|-------|-------|--------|
| D010 | form_8283_section_a, acknowledgment_letter | Sarah M. Johnson | Goodwill Industries | $501.00 |
| D013 | form_8283_section_b, appraisal, acknowledgment_letter | Robert J. Anderson | Colorado Symphony Association | $5,001.00 |

## Test Cases

The `donations.json` file defines 38 test donations covering all IRS thresholds:

### Cash Donations
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D001 | $100 | bank_statement | Below $250 |
| D002 | $200 | cancelled_check | Below $250 |
| D003 | **$250** | acknowledgment_letter | **Boundary** |
| D004 | $1,500 | acknowledgment_letter | |
| D005 | $5,000 | acknowledgment_letter | |
| D029 | $63.50 | acknowledgment_letter | Small gift with written acknowledgment |
| D030 | $84.25 | acknowledgment_letter | Small gift with written acknowledgment |
| D031 | $97.40 | acknowledgment_letter | Small gift with written acknowledgment |
| D032 | $58.75 | acknowledgment_letter | Small gift with written acknowledgment |
| D033 | $487.65 | acknowledgment_letter | Requires written acknowledgment |
| D034 | $425,000 | acknowledgment_letter | Major gift |

### Non-Cash Donations (Goods)
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D006 | $150 | receipt | Below $250 |
| D007 | **$250** | receipt, acknowledgment_letter | **Boundary** |
| D008 | $400 | receipt, acknowledgment_letter | |
| D009 | **$500** | receipt, acknowledgment_letter | **Boundary** |
| D010 | **$501** | form_8283_section_a, acknowledgment_letter | **Boundary** |
| D011 | $3,500 | form_8283_section_a, acknowledgment_letter | |
| D012 | **$5,000** | form_8283_section_a, acknowledgment_letter | **Boundary** |
| D013 | **$5,001** | form_8283_section_b, appraisal, acknowledgment_letter | **Boundary** |
| D014 | $15,000 | form_8283_section_b, appraisal, acknowledgment_letter | |
| D038 | $110 | receipt | **Photographed real slip**, below $250, handwritten, no EIN |

### Vehicles
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D015 | $400 | acknowledgment_letter | Below $500; verified charitable recipient |
| D016 | **$500** | acknowledgment_letter | **Boundary** |
| D017 | **$501** | form_1098c, form_8283_section_a | **Boundary; auction/gross-proceeds basis** |
| D018 | $12,000 | form_1098c, form_8283_section_a | Auction/gross-proceeds basis |
| D019 | $35,000 | form_1098c, form_8283_section_b, appraisal | Needy-transfer/FMV basis |

### Publicly Traded Securities
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D020 | $500 | stock_confirmation | No appraisal needed |
| D021 | $5,000 | stock_confirmation | |
| D022 | $25,000 | stock_confirmation | |

### Closely-Held Securities
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D023 | $5,000 | form_8283_section_a, acknowledgment_letter | Complete, non-overlapping Section A; active 501(c)(3) donee; EIN-bearing acknowledgment supplies the donee EIN |
| D024 | $10,000 | form_8283_section_b, appraisal, acknowledgment_letter | Regression case proving the current >$5,000 appraisal rule |
| D025 | $10,001 | form_8283_section_b, appraisal, acknowledgment_letter | Regression case proving the current >$5,000 appraisal rule |
| D026 | $50,000 | form_8283_section_b, appraisal, acknowledgment_letter | |

### Real Estate
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D027 | $100,000 | form_8283_section_b, appraisal, acknowledgment_letter | |
| D028 | $500,000 | form_8283_section_b, appraisal, acknowledgment_letter | |

### Non-Deductible Crowdfunding
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D035 | $50 | gofundme_receipt | Personal fundraiser, not tax deductible |
| D036 | $150 | gofundme_receipt | Personal fundraiser, not tax deductible |
| D037 | $25 | gofundme_receipt | Platform tip included, not tax deductible |

## Manifest Format

The `manifest_v2.json` file contains metadata for each document:

```json
{
  "filename": "form_8283_section_a/form_8283_section_a_D010.png",
  "formType": "form_8283_section_a",
  "donationId": "D010",
  "boundary": true,
  "expectedFields": {
    "donor_name": "Sarah M. Johnson",
    "donor_address": "654 Maple Lane, Seattle, WA 98101",
    "donee_name": "Goodwill Industries International",
    "donee_ein": "53-0196517",
    "contribution_date": "2025-03-15",
    "amount": 501.00,
    "asset_type": "noncash_goods",
    "asset_description": "Antique wooden desk"
  }
}
```

## Usage

### Testing OCR Extraction

```javascript
const manifest = require('./manifest_v2.json');

for (const doc of manifest.documents) {
  const imagePath = `./documents/${doc.filename}`;
  const extracted = await runOCR(imagePath);
  
  // Compare extracted values with expectedFields
  validateExtraction(extracted, doc.expectedFields);
}
```

### Regenerating Documents

```bash
# Install dependencies
npm install

# Generate all documents from donations.json
node scripts/generate_from_donations.js

# Regenerate selected documents while still recomputing manifest_v2.json
ONLY_DONATIONS=D029,D030 ONLY_FORMS=acknowledgment_letter node scripts/generate_from_donations.js

# Regenerate every corrected Form 8283 Section A fixture
ONLY_FORMS=form_8283_section_a node scripts/generate_from_donations.js

# Regenerate the D023 acknowledgment
ONLY_DONATIONS=D023 ONLY_FORMS=acknowledgment_letter node scripts/generate_from_donations.js

# Regenerate the complete canonical fixture set, remove obsolete PNGs, and
# rebuild the deterministic manifest.
node scripts/generate_from_donations.js

# Regenerate only DM-599 renderings while still rebuilding the full manifest.
ONLY_DONATIONS=D013,D014,D017,D018,D019,D024,D025,D026,D027,D028 node scripts/generate_from_donations.js

# Reapply the current byte revision to every PNG (safe to run repeatedly)
npm run revision:apply

# Validate fixture metadata, required files, and manifest parity
npm test
```

## IRS Documentation Requirements

See `IRS_FORMS_README.md` for complete IRS substantiation requirements by donation type and amount.

Quick reference:

| Donation Type | Amount | Required Forms |
|---------------|--------|----------------|
| Cash | <$250 | Bank record or cancelled check |
| Cash | ≥$250 | Written acknowledgment |
| Non-cash | <$250 | Receipt |
| Non-cash | $250-$500 | Receipt + acknowledgment |
| Non-cash | $501-$5,000 | Form 8283-A + acknowledgment |
| Non-cash | >$5,000 | Form 8283-B + appraisal + acknowledgment |
| Vehicle | ≤$500 | Acknowledgment |
| Vehicle | >$500, deduction limited to gross proceeds | Form 1098-C + Form 8283-A |
| Vehicle | $501-$5,000, FMV-basis exception | Form 1098-C + Form 8283-A |
| Vehicle | >$5,000, FMV-basis exception | Form 1098-C + Form 8283-B + qualified appraisal |
| Public stock | Any | Brokerage confirmation |
| Closely-held | $501-$5,000 | Form 8283-A + acknowledgment when required |
| Closely-held | >$5,000 | Form 8283-B + qualified appraisal + acknowledgment |
| Real estate | >$5,000 | Form 8283-B + appraisal |

## Important Notes

1. **Every document is SYNTHETIC except D038** - do not use any of them as real tax documents
2. Synthetic documents contain "SAMPLE - FOR TESTING ONLY" watermarks; the photographed D038 does not, because it is a real slip
3. Donor information uses placeholder values, except D038 which names its real donor with their consent
4. Charitable fixtures use EINs for qualifying organizations; personal fundraisers have no EIN, and D038 has none because the real slip does not print one
5. Forms for the same donation have **matching** donor, donee, date, and amount data
6. Only D035–D037 are non-deductible; D001–D034 and D038 must remain deductible charitable fixtures
7. D038 is the one **real** document here — photographed, not generated, and not reproducible if deleted. See [Photographed Fixtures](#photographed-fixtures).

## License

For internal DonateMate testing only.
