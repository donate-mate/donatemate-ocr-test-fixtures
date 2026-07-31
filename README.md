# DonateMate OCR Test Fixtures

Synthetic test documents for OCR validation testing with AWS Textract and Google Vision.

## Overview

This repository contains programmatically generated donation-related documents for testing OCR extraction accuracy. All documents are **synthetic** and marked with "SAMPLE - FOR TESTING ONLY" watermarks.

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
| receipt | 4 | Non-cash donation receipts <$500 |
| stock_confirmation | 3 | Publicly traded securities transfers |
| gofundme_receipt | 3 | **Non-deductible** crowdfunding (GoFundMe personal fundraiser) payment confirmations |

### Non-Deductible Fixtures

Most fixtures model IRS-deductible charitable gifts. The `gofundme_receipt` type is the
exception: it represents money sent to an individual organizer through a personal
crowdfunding campaign. These documents carry **no EIN** and state explicitly that the
contribution is **not tax deductible** — useful for testing OCR/classification that must
distinguish deductible charitable receipts from non-deductible payment confirmations.

Every donation declares an explicit boolean `deductible` expectation. Omission is invalid
and never defaults to `true`. The charitable fixtures D001–D034 are deductible and use
qualifying organizations; only the personal GoFundMe fixtures D035–D037 are non-deductible.
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
├── donations.json                 # Master donation definitions (37 test cases)
├── manifest_v2.json               # Generated document manifest with expected fields
├── documents/
│   ├── acknowledgment_letter/     # acknowledgment_letter_D001.png, ...
│   ├── appraisal/                 # appraisal_D013.png, ...
│   ├── bank_statement/            # bank_statement_D001.png
│   ├── cancelled_check/           # cancelled_check_D002.png
│   ├── form_1098c/                # form_1098c_D017.png, ...
│   ├── form_8283_section_a/       # form_8283_section_a_D010.png, ...
│   ├── form_8283_section_b/       # form_8283_section_b_D013.png, ...
│   ├── receipt/                   # receipt_D006.png, ...
│   ├── stock_confirmation/        # stock_confirmation_D020.png, ...
│   └── gofundme_receipt/          # gofundme_receipt_D035.png, ...
└── scripts/
    └── generate_from_donations.js # Generator script
```

## Naming Convention

```
<form_type>_<donation_id>.png
```

Examples:
- `acknowledgment_letter_D003.png`
- `form_8283_section_a_D010.png`
- `appraisal_D013.png`

## Linked Forms

For donations requiring multiple forms, **all forms share consistent data**:

| Donation | Forms Generated | Donor | Donee | Amount |
|----------|-----------------|-------|-------|--------|
| D010 | form_8283_section_a, acknowledgment_letter | Sarah M. Johnson | Goodwill Industries | $501.00 |
| D013 | form_8283_section_b, appraisal, acknowledgment_letter | Robert J. Anderson | Colorado Symphony Association | $5,001.00 |

## Test Cases

The `donations.json` file defines 37 test donations covering all IRS thresholds:

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

1. **All documents are SYNTHETIC** - do not use as real tax documents
2. All documents contain "SAMPLE - FOR TESTING ONLY" watermarks
3. Donor information uses placeholder values
4. Charitable fixtures use EINs for qualifying organizations; personal fundraisers have no EIN
5. Forms for the same donation have **matching** donor, donee, date, and amount data
6. Only D035–D037 are non-deductible; D001–D034 must remain deductible charitable fixtures

## License

For internal DonateMate testing only.
