#!/usr/bin/env node
/**
 * Reorganize OCR test fixtures with Donation_001_<form_type> naming convention
 * and ensure all required forms are present for each donation scenario.
 */

const fs = require('fs');
const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'documents');
const MANIFEST_PATH = path.join(__dirname, '..', 'manifest_irs_forms.json');

// Load current manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Define donation scenarios with required forms
const donationScenarios = [
  // Cash donations ≥$250 - need acknowledgment letter
  {
    id: 'Donation_001',
    type: 'cash',
    amount: 1536,
    forms: ['acknowledgment_letter_cash']
  },
  {
    id: 'Donation_002',
    type: 'cash',
    amount: 4738,
    forms: ['acknowledgment_letter_cash']
  },
  {
    id: 'Donation_003',
    type: 'cash',
    amount: 8102,
    forms: ['acknowledgment_letter_cash']
  },
  
  // Non-cash $500-$5000 - need Form 8283 Section A
  {
    id: 'Donation_004',
    type: 'non_cash_goods',
    amount: 2354,
    forms: ['form_8283_section_a']
  },
  {
    id: 'Donation_005',
    type: 'non_cash_goods',
    amount: 4797,
    forms: ['form_8283_section_a']
  },
  {
    id: 'Donation_006',
    type: 'non_cash_goods',
    amount: 2986,
    forms: ['form_8283_section_a']
  },
  
  // Non-cash >$5000 - need Form 8283 Section B + Appraisal
  {
    id: 'Donation_007',
    type: 'non_cash_goods',
    amount: 28808,
    forms: ['form_8283_section_b', 'qualified_appraisal']
  },
  {
    id: 'Donation_008',
    type: 'non_cash_goods',
    amount: 41029,
    forms: ['form_8283_section_b', 'qualified_appraisal']
  },
  {
    id: 'Donation_009',
    type: 'non_cash_goods',
    amount: 6331,
    forms: ['form_8283_section_b', 'qualified_appraisal']
  },
  
  // Vehicles >$500 - need Form 1098-C
  {
    id: 'Donation_010',
    type: 'vehicle',
    amount: 3296,
    forms: ['form_1098c']
  },
  {
    id: 'Donation_011',
    type: 'vehicle',
    amount: 21627,
    forms: ['form_1098c']
  },
  {
    id: 'Donation_012',
    type: 'vehicle',
    amount: 24055,
    forms: ['form_1098c']
  },
  
  // Publicly traded stocks - need brokerage confirmation
  {
    id: 'Donation_013',
    type: 'publicly_traded_stock',
    amount: 5000,
    forms: ['stock_confirmation']
  },
  {
    id: 'Donation_014',
    type: 'publicly_traded_stock',
    amount: 15000,
    forms: ['stock_confirmation']
  },
  {
    id: 'Donation_015',
    type: 'publicly_traded_stock',
    amount: 25000,
    forms: ['stock_confirmation']
  },
  
  // Cash <$250 - need bank statement
  {
    id: 'Donation_016',
    type: 'cash_small',
    amount: 150,
    forms: ['bank_statement']
  },
  {
    id: 'Donation_017',
    type: 'cash_small',
    amount: 200,
    forms: ['bank_statement']
  },
  
  // Non-cash <$500 - need receipt
  {
    id: 'Donation_018',
    type: 'non_cash_small',
    amount: 350,
    forms: ['receipt']
  },
  {
    id: 'Donation_019',
    type: 'non_cash_small',
    amount: 450,
    forms: ['receipt']
  },
  
  // Real estate >$5000 - need Form 8283 Section B + Appraisal
  {
    id: 'Donation_020',
    type: 'real_estate',
    amount: 150000,
    forms: ['form_8283_section_b', 'qualified_appraisal']
  }
];

// Map form types to existing files
const formMappings = {
  'acknowledgment_letter_cash': manifest.documents.filter(d => d.documentType === 'acknowledgment_letter_cash'),
  'form_8283_section_a': manifest.documents.filter(d => d.documentType === 'form_8283_section_a'),
  'form_8283_section_b': manifest.documents.filter(d => d.documentType === 'form_8283_section_b'),
  'qualified_appraisal': manifest.documents.filter(d => d.documentType === 'qualified_appraisal'),
  'form_1098c': manifest.documents.filter(d => d.documentType === 'form_1098c'),
  'bank_statement': [], // From original manifest
  'receipt': [], // From original manifest
  'stock_confirmation': [] // Need to generate
};

// Check what we have vs what we need
console.log('=== Donation Scenarios Analysis ===\n');

const newManifest = {
  donations: [],
  generated: new Date().toISOString()
};

let usedFiles = {
  'acknowledgment_letter_cash': 0,
  'form_8283_section_a': 0,
  'form_8283_section_b': 0,
  'qualified_appraisal': 0,
  'form_1098c': 0
};

donationScenarios.forEach(scenario => {
  console.log(`\n${scenario.id}: ${scenario.type} - $${scenario.amount.toLocaleString()}`);
  console.log(`  Required forms: ${scenario.forms.join(', ')}`);
  
  const donationEntry = {
    donationId: scenario.id,
    type: scenario.type,
    amount: scenario.amount,
    linkedForms: []
  };
  
  scenario.forms.forEach(formType => {
    const available = formMappings[formType];
    
    if (available && available.length > usedFiles[formType]) {
      const sourceFile = available[usedFiles[formType]];
      const newFilename = `${scenario.id}_${formType}.png`;
      
      console.log(`  ✓ ${formType}: ${sourceFile.filename} → ${newFilename}`);
      
      donationEntry.linkedForms.push({
        formType: formType,
        filename: newFilename,
        sourceFile: sourceFile.filename,
        expectedFields: sourceFile.expectedFields
      });
      
      usedFiles[formType]++;
    } else if (['bank_statement', 'receipt'].includes(formType)) {
      // These exist in original manifest but not IRS manifest
      console.log(`  ⚠ ${formType}: Available in original fixtures (manual linking needed)`);
      donationEntry.linkedForms.push({
        formType: formType,
        filename: `${scenario.id}_${formType}.png`,
        status: 'needs_linking'
      });
    } else {
      console.log(`  ✗ ${formType}: MISSING - needs to be generated`);
      donationEntry.linkedForms.push({
        formType: formType,
        filename: `${scenario.id}_${formType}.png`,
        status: 'missing'
      });
    }
  });
  
  newManifest.donations.push(donationEntry);
});

// Write new manifest
const newManifestPath = path.join(__dirname, '..', 'manifest_donations.json');
fs.writeFileSync(newManifestPath, JSON.stringify(newManifest, null, 2));
console.log(`\n\nNew donation manifest written to: ${newManifestPath}`);

// Summary
console.log('\n=== Summary ===');
console.log(`Total donation scenarios: ${donationScenarios.length}`);
console.log('\nForms inventory:');
Object.entries(formMappings).forEach(([type, files]) => {
  const needed = donationScenarios.filter(s => s.forms.includes(type)).length;
  const have = files.length;
  const status = have >= needed ? '✓' : '✗';
  console.log(`  ${status} ${type}: have ${have}, need ${needed}`);
});
