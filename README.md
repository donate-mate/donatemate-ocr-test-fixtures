# DonateMate OCR Test Fixtures

Synthetic test documents for OCR validation testing with AWS Textract and Google Vision.

## Overview

This repository contains programmatically generated donation-related documents for testing OCR extraction accuracy. All documents are **synthetic** and marked with "SAMPLE - FOR TESTING ONLY" watermarks.

## Document Inventory

| Type | Count | Quality Distribution |
|------|-------|---------------------|
| Receipts | 30 | 12 high, 9 medium, 6 low, 3 edge cases |
| Acknowledgment Letters | 20 | 10 high, 6 medium, 4 low |
| Bank Statements | 15 | 8 high, 5 medium, 2 low |
| **Total** | **65** | |

## Directory Structure

```
donatemate-ocr-test-fixtures/
├── README.md
├── manifest.json              # Document metadata with expected OCR values
├── package.json
├── documents/
│   ├── receipts/              # Donation receipts (30 files)
│   ├── acknowledgment_letters/ # Formal nonprofit letters (20 files)
│   ├── bank_statements/       # Bank statement excerpts (15 files)
│   ├── credit_card_statements/
│   ├── cancelled_checks/
│   ├── appraisals/
│   ├── form_8283/
│   └── other/
└── scripts/
    ├── generate_documents.js  # Node.js generator (primary)
    └── generate_documents.py  # Python generator (requires Pillow)
```

## Quality Levels

- **high**: Clean, digital-looking documents
- **medium**: Slight noise, minor imperfections
- **low**: Blur, fading, uneven lighting simulation
- **edge**: Rotated 5-15°, edge cases for testing robustness

## Organizations Used

| Organization | EIN |
|--------------|-----|
| Goodwill Industries | 53-0196517 |
| The Salvation Army | 13-5562351 |
| American Red Cross | 53-0196605 |
| Habitat for Humanity | 91-1914868 |
| United Way Worldwide | 13-1635294 |
| Community Food Bank | 12-3456789 |
| First Community Church | 23-4567890 |
| State University Foundation | 34-5678901 |

## File Naming Convention

```
{type}_{organization}_{quality}_{index}.png
```

Examples:
- `receipt_goodwill_high_001.png`
- `acknowledgment_redcross_medium_005.png`
- `bank_statement_chase_low_002.png`

## Manifest Format

The `manifest.json` file contains metadata for each document:

```json
{
  "filename": "receipts/receipt_goodwill_high_001.png",
  "documentType": "receipt",
  "quality": "high",
  "synthetic": true,
  "expectedFields": {
    "organization_name": "Goodwill Industries",
    "ein": "53-0196517",
    "amount": 250.00,
    "date": "2026-01-15",
    "donor_name": "Test Donor",
    "receipt_number": "RCP-2026-12345"
  }
}
```

## Usage

### Testing OCR Extraction

```javascript
const manifest = require('./manifest.json');

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

# Generate documents
node scripts/generate_documents.js
```

## Important Notes

1. **All documents are SYNTHETIC** - do not use as real tax documents
2. All documents contain "SAMPLE - FOR TESTING ONLY" watermarks
3. EINs for "Community Food Bank", "First Community Church", and "State University Foundation" are fictional
4. Donor information uses placeholder values ("Test Donor", "123 Test Street")

## License

For internal DonateMate testing only.
