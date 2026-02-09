#!/usr/bin/env node
/**
 * Create donation test fixtures with Donation_001_<form_type> naming convention.
 * Each donation scenario has all required IRS forms linked together.
 */

const fs = require('fs');
const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'documents');
const OUTPUT_DIR = path.join(__dirname, '..', 'documents', 'donations');

// Load manifests
const irsManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest_irs_forms.json'), 'utf8'));
const originalManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));

// Helper to find document by type
function findDocByType(manifest, docType, usedIndices) {
  const docs = manifest.documents.filter(d => d.documentType === docType);
  const used = usedIndices[docType] || 0;
  if (docs.length > used) {
    usedIndices[docType] = used + 1;
    return docs[used];
  }
  return null;
}

// Define complete donation scenarios covering all IRS form requirements
const donations = [
  // === Cash Donations ===
  // Cash ≥$250 requires written acknowledgment letter
  {
    id: 'Donation_001',
    description: 'Cash donation $1,536 - requires acknowledgment letter',
    type: 'cash',
    assetType: 'cash',
    amount: 1536,
    requirements: ['acknowledgment_letter'],
    forms: [{ type: 'acknowledgment_letter_cash', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_002', 
    description: 'Cash donation $4,738 - requires acknowledgment letter',
    type: 'cash',
    assetType: 'cash',
    amount: 4738,
    requirements: ['acknowledgment_letter'],
    forms: [{ type: 'acknowledgment_letter_cash', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_003',
    description: 'Cash donation $8,102 - requires acknowledgment letter',
    type: 'cash',
    assetType: 'cash',
    amount: 8102,
    requirements: ['acknowledgment_letter'],
    forms: [{ type: 'acknowledgment_letter_cash', manifestSource: 'irs' }]
  },
  
  // Cash <$250 requires bank statement or cancelled check
  {
    id: 'Donation_004',
    description: 'Cash donation $150 - requires bank statement',
    type: 'cash_small',
    assetType: 'cash',
    amount: 150,
    requirements: ['bank_statement'],
    forms: [{ type: 'bank_statement', filenamePattern: 'bank_statement_chase_high_001.png' }]
  },
  {
    id: 'Donation_005',
    description: 'Cash donation $200 - requires bank statement',
    type: 'cash_small',
    assetType: 'cash',
    amount: 200,
    requirements: ['bank_statement'],
    forms: [{ type: 'bank_statement', filenamePattern: 'bank_statement_bofa_high_002.png' }]
  },

  // === Non-Cash Donations (Goods) ===
  // Non-cash <$500 requires receipt
  {
    id: 'Donation_006',
    description: 'Non-cash goods $350 - requires receipt',
    type: 'non_cash_small',
    assetType: 'goods',
    amount: 350,
    requirements: ['receipt'],
    forms: [{ type: 'receipt', filenamePattern: 'receipt_goodwill_high_001.png' }]
  },
  {
    id: 'Donation_007',
    description: 'Non-cash goods $450 - requires receipt',
    type: 'non_cash_small',
    assetType: 'goods',
    amount: 450,
    requirements: ['receipt'],
    forms: [{ type: 'receipt', filenamePattern: 'receipt_salvation-army_high_002.png' }]
  },
  
  // Non-cash $500-$5,000 requires Form 8283 Section A
  {
    id: 'Donation_008',
    description: 'Non-cash goods $2,354 - requires Form 8283 Section A',
    type: 'non_cash_medium',
    assetType: 'goods',
    amount: 2354,
    requirements: ['form_8283_section_a'],
    forms: [{ type: 'form_8283_section_a', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_009',
    description: 'Non-cash goods $4,797 - requires Form 8283 Section A',
    type: 'non_cash_medium',
    assetType: 'goods',
    amount: 4797,
    requirements: ['form_8283_section_a'],
    forms: [{ type: 'form_8283_section_a', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_010',
    description: 'Non-cash goods $2,986 - requires Form 8283 Section A',
    type: 'non_cash_medium',
    assetType: 'goods',
    amount: 2986,
    requirements: ['form_8283_section_a'],
    forms: [{ type: 'form_8283_section_a', manifestSource: 'irs' }]
  },
  
  // Non-cash >$5,000 requires Form 8283 Section B + Qualified Appraisal
  {
    id: 'Donation_011',
    description: 'Non-cash goods $28,808 - requires Form 8283 Section B + Appraisal',
    type: 'non_cash_large',
    assetType: 'goods',
    amount: 28808,
    requirements: ['form_8283_section_b', 'qualified_appraisal'],
    forms: [
      { type: 'form_8283_section_b', manifestSource: 'irs' },
      { type: 'qualified_appraisal', manifestSource: 'irs' }
    ]
  },
  {
    id: 'Donation_012',
    description: 'Non-cash goods $41,029 - requires Form 8283 Section B + Appraisal',
    type: 'non_cash_large',
    assetType: 'goods',
    amount: 41029,
    requirements: ['form_8283_section_b', 'qualified_appraisal'],
    forms: [
      { type: 'form_8283_section_b', manifestSource: 'irs' },
      { type: 'qualified_appraisal', manifestSource: 'irs' }
    ]
  },
  {
    id: 'Donation_013',
    description: 'Non-cash goods $6,331 - requires Form 8283 Section B + Appraisal',
    type: 'non_cash_large',
    assetType: 'goods',
    amount: 6331,
    requirements: ['form_8283_section_b', 'qualified_appraisal'],
    forms: [
      { type: 'form_8283_section_b', manifestSource: 'irs' },
      { type: 'qualified_appraisal', manifestSource: 'irs' }
    ]
  },
  
  // === Vehicle Donations ===
  // Vehicles >$500 require Form 1098-C
  {
    id: 'Donation_014',
    description: 'Vehicle donation $3,296 - requires Form 1098-C',
    type: 'vehicle',
    assetType: 'vehicle',
    amount: 3296,
    requirements: ['form_1098c'],
    forms: [{ type: 'form_1098c', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_015',
    description: 'Vehicle donation $21,627 - requires Form 1098-C',
    type: 'vehicle',
    assetType: 'vehicle',
    amount: 21627,
    requirements: ['form_1098c'],
    forms: [{ type: 'form_1098c', manifestSource: 'irs' }]
  },
  {
    id: 'Donation_016',
    description: 'Vehicle donation $24,055 - requires Form 1098-C',
    type: 'vehicle',
    assetType: 'vehicle',
    amount: 24055,
    requirements: ['form_1098c'],
    forms: [{ type: 'form_1098c', manifestSource: 'irs' }]
  },
  
  // === Publicly Traded Securities ===
  // No appraisal required - just brokerage confirmation
  {
    id: 'Donation_017',
    description: 'Stock donation (AAPL) $5,000 - requires brokerage confirmation',
    type: 'publicly_traded_stock',
    assetType: 'publicly_traded_securities',
    amount: 5000,
    requirements: ['stock_confirmation'],
    forms: [{ type: 'stock_confirmation', filenamePattern: 'stock_confirmation_high_001.png' }]
  },
  {
    id: 'Donation_018',
    description: 'Stock donation (MSFT) $15,000 - requires brokerage confirmation',
    type: 'publicly_traded_stock',
    assetType: 'publicly_traded_securities',
    amount: 15000,
    requirements: ['stock_confirmation'],
    forms: [{ type: 'stock_confirmation', filenamePattern: 'stock_confirmation_high_002.png' }]
  },
  {
    id: 'Donation_019',
    description: 'Stock donation (VTI) $25,000 - requires brokerage confirmation',
    type: 'publicly_traded_stock',
    assetType: 'publicly_traded_securities',
    amount: 25000,
    requirements: ['stock_confirmation'],
    forms: [{ type: 'stock_confirmation', filenamePattern: 'stock_confirmation_medium_003.png' }]
  },
  
  // === Real Estate ===
  // Real estate >$5,000 requires Form 8283 Section B + Qualified Appraisal
  {
    id: 'Donation_020',
    description: 'Real estate donation $150,000 - requires Form 8283 Section B + Appraisal',
    type: 'real_estate',
    assetType: 'real_estate',
    amount: 150000,
    requirements: ['form_8283_section_b', 'qualified_appraisal'],
    forms: [
      { type: 'form_8283_section_b', manifestSource: 'irs' },
      { type: 'qualified_appraisal', manifestSource: 'irs' }
    ]
  }
];

// Track used indices per document type
const usedIndices = {};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Creating donation test fixtures with Donation_XXX_<form_type> naming...\n');

const donationManifest = {
  version: '1.0.0',
  description: 'IRS-compliant donation test fixtures with linked forms',
  generatedAt: new Date().toISOString(),
  irsReference: 'IRS Publication 1771 - Charitable Contributions Substantiation',
  donations: []
};

donations.forEach(donation => {
  console.log(`\n${donation.id}: ${donation.description}`);
  console.log(`  Asset Type: ${donation.assetType} | Amount: $${donation.amount.toLocaleString()}`);
  
  const donationEntry = {
    donationId: donation.id,
    description: donation.description,
    assetType: donation.assetType,
    amount: donation.amount,
    irsRequirements: donation.requirements,
    linkedForms: []
  };
  
  donation.forms.forEach(formSpec => {
    let sourceDoc = null;
    let sourceFilePath = null;
    
    if (formSpec.manifestSource === 'irs') {
      sourceDoc = findDocByType(irsManifest, formSpec.type, usedIndices);
      if (sourceDoc) {
        sourceFilePath = path.join(DOCUMENTS_DIR, sourceDoc.filename);
      }
    } else if (formSpec.filenamePattern) {
      // Direct file reference
      const subfolder = formSpec.type === 'receipt' ? 'receipts' 
                      : formSpec.type === 'bank_statement' ? 'bank_statements'
                      : formSpec.type === 'stock_confirmation' ? 'stock_confirmations'
                      : formSpec.type;
      sourceFilePath = path.join(DOCUMENTS_DIR, subfolder, formSpec.filenamePattern);
      
      // Find in original manifest for metadata
      sourceDoc = originalManifest.documents.find(d => d.filename.includes(formSpec.filenamePattern));
      if (!sourceDoc && formSpec.type === 'stock_confirmation') {
        // Stock confirmations have their own metadata
        sourceDoc = {
          documentType: 'stock_confirmation',
          expectedFields: { note: 'See stock confirmation manifest' }
        };
      }
    }
    
    const newFilename = `${donation.id}_${formSpec.type}.png`;
    const newFilePath = path.join(OUTPUT_DIR, newFilename);
    
    if (sourceFilePath && fs.existsSync(sourceFilePath)) {
      // Copy file with new name
      fs.copyFileSync(sourceFilePath, newFilePath);
      console.log(`  ✓ ${formSpec.type}: ${path.basename(sourceFilePath)} → ${newFilename}`);
      
      donationEntry.linkedForms.push({
        formType: formSpec.type,
        filename: `donations/${newFilename}`,
        sourceFile: sourceDoc?.filename || formSpec.filenamePattern,
        expectedFields: sourceDoc?.expectedFields || {}
      });
    } else {
      console.log(`  ✗ ${formSpec.type}: Source file not found!`);
      donationEntry.linkedForms.push({
        formType: formSpec.type,
        filename: `donations/${newFilename}`,
        status: 'missing',
        error: 'Source file not found'
      });
    }
  });
  
  donationManifest.donations.push(donationEntry);
});

// Write the new manifest
const manifestPath = path.join(__dirname, '..', 'manifest_donations.json');
fs.writeFileSync(manifestPath, JSON.stringify(donationManifest, null, 2));

console.log('\n\n=== Summary ===');
console.log(`Total donations: ${donations.length}`);
console.log(`Output directory: ${OUTPUT_DIR}`);
console.log(`Manifest: ${manifestPath}`);

// Verify coverage
console.log('\n=== IRS Requirements Coverage ===');
const coverage = {
  'Cash <$250': donations.filter(d => d.type === 'cash_small').length,
  'Cash ≥$250': donations.filter(d => d.type === 'cash' && d.assetType === 'cash').length,
  'Non-cash <$500': donations.filter(d => d.type === 'non_cash_small').length,
  'Non-cash $500-$5,000': donations.filter(d => d.type === 'non_cash_medium').length,
  'Non-cash >$5,000': donations.filter(d => d.type === 'non_cash_large').length,
  'Vehicles >$500': donations.filter(d => d.type === 'vehicle').length,
  'Publicly traded stocks': donations.filter(d => d.type === 'publicly_traded_stock').length,
  'Real estate >$5,000': donations.filter(d => d.type === 'real_estate').length
};

Object.entries(coverage).forEach(([category, count]) => {
  const status = count > 0 ? '✓' : '✗';
  console.log(`  ${status} ${category}: ${count} fixture(s)`);
});
