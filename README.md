# DonateMate OCR Test Fixtures

Synthetic test documents for OCR validation testing with AWS Textract and Google Vision.

## Overview

This repository contains programmatically generated donation-related documents for testing OCR extraction accuracy. All documents are **synthetic** and marked with "SAMPLE - FOR TESTING ONLY" watermarks.

## Document Inventory

| Form Type | Count | Description |
|-----------|-------|-------------|
| acknowledgment_letter | 13 | Written acknowledgments for cash ≥$250 and non-cash donations |
| appraisal | 6 | Qualified appraisals for donations >$5,000 |
| bank_statement | 1 | Bank records for cash donations <$250 |
| cancelled_check | 1 | Cancelled checks for cash donations <$250 |
| form_1098c | 3 | Vehicle donations >$500 |
| form_8283_section_a | 5 | Non-cash donations $501-$5,000 |
| form_8283_section_b | 6 | Non-cash donations >$5,000, closely-held >$10,000, real estate |
| receipt | 4 | Non-cash donation receipts <$500 |
| stock_confirmation | 3 | Publicly traded securities transfers |
| **Total** | **42** | |

## Directory Structure

```
donatemate-ocr-test-fixtures/
├── README.md
├── IRS_FORMS_README.md           # IRS documentation requirements reference
├── donations.json                 # Master donation definitions (28 test cases)
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
│   └── stock_confirmation/        # stock_confirmation_D020.png, ...
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
| D013 | form_8283_section_b, appraisal, acknowledgment_letter | Robert J. Anderson | First Community Church | $5,001.00 |

## Test Cases

The `donations.json` file defines 28 test donations covering all IRS thresholds:

### Cash Donations
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D001 | $100 | bank_statement | Below $250 |
| D002 | $200 | cancelled_check | Below $250 |
| D003 | **$250** | acknowledgment_letter | **Boundary** |
| D004 | $1,500 | acknowledgment_letter | |
| D005 | $5,000 | acknowledgment_letter | |

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
| D015 | $400 | acknowledgment_letter | Below $500 |
| D016 | **$500** | acknowledgment_letter | **Boundary** |
| D017 | **$501** | form_1098c | **Boundary** |
| D018 | $12,000 | form_1098c | |
| D019 | $35,000 | form_1098c | |

### Publicly Traded Securities
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D020 | $500 | stock_confirmation | No appraisal needed |
| D021 | $5,000 | stock_confirmation | |
| D022 | $25,000 | stock_confirmation | |

### Closely-Held Securities
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D023 | $5,000 | form_8283_section_a | |
| D024 | **$10,000** | form_8283_section_a | **Boundary** |
| D025 | **$10,001** | form_8283_section_b, appraisal | **Boundary** |
| D026 | $50,000 | form_8283_section_b, appraisal | |

### Real Estate
| ID | Amount | Forms | Notes |
|----|--------|-------|-------|
| D027 | $100,000 | form_8283_section_b, appraisal | |
| D028 | $500,000 | form_8283_section_b, appraisal | |

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
| Vehicle | >$500 | Form 1098-C |
| Public stock | Any | Brokerage confirmation |
| Closely-held | ≤$10,000 | Form 8283-A |
| Closely-held | >$10,000 | Form 8283-B + appraisal |
| Real estate | >$5,000 | Form 8283-B + appraisal |

## Important Notes

1. **All documents are SYNTHETIC** - do not use as real tax documents
2. All documents contain "SAMPLE - FOR TESTING ONLY" watermarks
3. Donor information uses placeholder values
4. EINs for real organizations (Red Cross, Goodwill, etc.) are used; fictional orgs have fake EINs
5. Forms for the same donation have **matching** donor, donee, date, and amount data

## License

For internal DonateMate testing only.
