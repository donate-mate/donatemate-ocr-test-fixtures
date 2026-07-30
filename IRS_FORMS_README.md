# IRS Forms Test Fixtures

This document describes the IRS-compliant form test fixtures generated based on donation documentation requirements.

## Documentation Requirements by Donation Type & Amount

### Cash Donations
| Amount | Required Documentation |
|--------|----------------------|
| < $250 | Bank statement or cancelled check |
| ≥ $250 | Written acknowledgment letter from charity |

### Non-Cash Donations (Goods, Clothing, Household Items)
| Amount | Required Documentation |
|--------|----------------------|
| < $500 | Receipt with item description |
| $500 - $5,000 | Form 8283 Section A |
| > $5,000 | Form 8283 Section B + Qualified Appraisal |

### Vehicles (Cars, Boats, Aircraft)
| Deduction basis | Amount | Required Documentation |
|-----------------|--------|------------------------|
| Gross proceeds from charity sale | > $500 | Form 1098-C + Form 8283 Section A |
| FMV exception (significant use/improvement or needy transfer) | $501-$5,000 | Form 1098-C + Form 8283 Section A |
| FMV exception (significant use/improvement or needy transfer) | > $5,000 | Form 1098-C + Form 8283 Section B + Qualified Appraisal |

### Stocks & Securities
| Type | Amount | Required Documentation |
|------|--------|----------------------|
| Publicly Traded | Any | Brokerage confirmation (no qualified appraisal) |
| Closely-Held | $501-$5,000 | Form 8283 Section A |
| Closely-Held | $5,001-$10,000 | Form 8283 Section B without a qualified appraisal |
| Closely-Held | > $10,000 | Form 8283 Section B + Qualified Appraisal |

### Real Estate
| Amount | Required Documentation |
|--------|----------------------|
| > $5,000 | Form 8283 Section B + Qualified Appraisal |

## Generated Forms Inventory

| Form Type | Count | Directory | Description |
|-----------|-------|-----------|-------------|
| Form 8283 Section A | 6 | `documents/form_8283_section_a/` | Non-cash donations $501-$5,000 and gross-proceeds vehicles |
| Form 8283 Section B | 8 | `documents/form_8283_section_b/` | FMV-basis non-cash donations >$5,000 |
| Form 1098-C | 13 | `documents/form_1098c/` | Vehicle donations >$500 |
| Qualified Appraisal | 7 | `documents/appraisal/` | Category-specific high-value FMV-basis donations |
| Acknowledgment | 20 | `documents/acknowledgment_letter/` | Cash and non-cash charity acknowledgments |

**Total: 54 IRS form documents**

## Form Details

### Form 8283 - Noncash Charitable Contributions

**Section A** (for donations $500 - $5,000):
- Donor information
- Donee organization name and address
- Property description and condition when applicable (condition is omitted for securities)
- Date of contribution
- Date acquired and how acquired
- Donor's cost or adjusted basis
- Fair market value
- Method used to determine FMV

**Section B** (for donations >$5,000):
- All Section A fields plus:
- Part II: Taxpayer (Donor) Statement with signature
- Part III: Declaration of Appraiser (signed)
- Part IV: Donee Acknowledgment (signed by charity)

### Form 1098-C - Contributions of Motor Vehicles, Boats, and Airplanes

Required fields:
- Donee organization name, address, EIN
- Donor name, address, TIN
- Vehicle year, make, model, VIN
- Date of contribution
- Odometer mileage
- Gross proceeds (if sold)
- Certification checkboxes (sold at arm's length, transferred to needy, material improvement)

### Qualified Appraisal

Required elements per IRS Reg. §1.170A-17:
- Description of property
- Physical condition
- Date of contribution
- Date of appraisal
- Appraised fair market value
- Method of valuation
- Appraiser qualifications and signature
- Appraiser declaration of independence

### Written Acknowledgment Letter

Required elements per IRC §170(f)(8):
- Organization name and EIN
- Date of contribution
- Amount (cash) or description (non-cash)
- Statement that no goods/services were provided
- Organization's tax-exempt status confirmation

## Manifest File

The `manifest_irs_forms.json` file contains metadata for each generated document:

```json
{
  "filename": "form_8283/form_8283_section_a_high_001.png",
  "documentType": "form_8283_section_a",
  "quality": "high",
  "synthetic": true,
  "expectedFields": {
    "form_type": "8283",
    "section": "A",
    "donor_name": "John A. Smith",
    "organization_name": "Goodwill Industries International",
    "ein": "53-0196517",
    "amount": 2500,
    "description": "Antique oak dining table with 6 chairs"
  }
}
```

## Regenerating Forms

```bash
# Install dependencies
npm install

# Regenerate the corrected D023 Section A and acknowledgment
ONLY_DONATIONS=D023 node scripts/generate_from_donations.js

# Regenerate the corrected D024 Section B and clean stale form outputs
ONLY_DONATIONS=D024 node scripts/generate_from_donations_v2.js

# Regenerate DM-599 vehicle documents and the linked manifest
ONLY_DONATIONS=D017,D018,D019 node scripts/generate_from_donations.js
ONLY_DONATIONS=D017,D018,D019 node scripts/generate_from_donations_v2.js

# Validate the fixture contract
npm test
```

## Important Notes

1. **All documents are SYNTHETIC** - watermarked "SAMPLE - FOR TESTING ONLY"
2. Forms mirror IRS formatting but are simplified for OCR testing
3. EINs for real organizations are used; donor info is fictional
4. Quality levels (high/medium/low) simulate different scan conditions

## IRS References

- [IRS Publication 1771](https://www.irs.gov/pub/irs-pdf/p1771.pdf) - Charitable Contributions Substantiation
- [Form 8283 Instructions](https://www.irs.gov/instructions/i8283)
- [Form 1098-C Instructions](https://www.irs.gov/instructions/i1098c)
- [IRS Notice 2005-44](https://www.irs.gov/irb/2005-25_IRB) - Qualified vehicle deduction and appraisal rules
- [IRC §170(f)(8)](https://www.law.cornell.edu/uscode/text/26/170) - Substantiation requirements
