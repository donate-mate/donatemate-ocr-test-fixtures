#!/usr/bin/env node
/**
 * Generate brokerage stock confirmation documents for publicly traded stock donations.
 * These don't require appraisals per IRS rules.
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'documents', 'stock_confirmations');

// Sample stock donation data
const stockDonations = [
  {
    id: 1,
    donor: { name: 'Robert T. Brown', address: '789 Oak Avenue, Chicago, IL 60601', ssn: 'XXX-XX-4567' },
    broker: { name: 'Charles Schwab & Co., Inc.', address: '211 Main Street, San Francisco, CA 94105' },
    stock: { symbol: 'AAPL', name: 'Apple Inc.', shares: 25, pricePerShare: 200.00, totalValue: 5000 },
    recipient: { name: 'American Red Cross', ein: '53-0196605' },
    confirmationNumber: 'SCH-2026-789456',
    transferDate: '2026-01-15',
    quality: 'high'
  },
  {
    id: 2,
    donor: { name: 'Emily K. Davis', address: '456 Pine Street, Denver, CO 80201', ssn: 'XXX-XX-8901' },
    broker: { name: 'Fidelity Brokerage Services LLC', address: '245 Summer Street, Boston, MA 02210' },
    stock: { symbol: 'MSFT', name: 'Microsoft Corporation', shares: 50, pricePerShare: 300.00, totalValue: 15000 },
    recipient: { name: 'Habitat for Humanity International', ein: '91-1914868' },
    confirmationNumber: 'FID-2026-123789',
    transferDate: '2026-01-20',
    quality: 'high'
  },
  {
    id: 3,
    donor: { name: 'Michael R. Williams', address: '321 Elm Drive, Austin, TX 78701', ssn: 'XXX-XX-2345' },
    broker: { name: 'Vanguard Marketing Corporation', address: 'P.O. Box 982901, El Paso, TX 79998' },
    stock: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', shares: 100, pricePerShare: 250.00, totalValue: 25000 },
    recipient: { name: 'United Way Worldwide', ein: '13-1635294' },
    confirmationNumber: 'VAN-2026-456123',
    transferDate: '2026-01-25',
    quality: 'medium'
  }
];

function generateStockConfirmation(data) {
  const width = 850;
  const height = 1100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle noise for quality variations
  if (data.quality === 'medium' || data.quality === 'low') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let i = 0; i < 1000; i++) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  }
  
  let y = 50;
  
  // Broker header
  ctx.fillStyle = '#1a365d';
  ctx.fillRect(40, y, width - 80, 60);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(data.broker.name, 60, y + 38);
  y += 80;
  
  ctx.fillStyle = '#333333';
  ctx.font = '12px Arial';
  ctx.fillText(data.broker.address, 60, y);
  y += 30;
  
  // Document title
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('CHARITABLE STOCK TRANSFER CONFIRMATION', 60, y);
  y += 10;
  
  ctx.strokeStyle = '#1a365d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(width - 60, y);
  ctx.stroke();
  y += 30;
  
  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FF0000';
  ctx.font = 'bold 40px Arial';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText('SAMPLE - FOR TESTING ONLY', -200, 0);
  ctx.restore();
  
  // Confirmation details box
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(60, y, width - 120, 80);
  ctx.strokeStyle = '#cbd5e0';
  ctx.lineWidth = 1;
  ctx.strokeRect(60, y, width - 120, 80);
  
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Confirmation Number:', 80, y + 25);
  ctx.fillText('Transfer Date:', 80, y + 50);
  ctx.fillText('Account Type:', 400, y + 25);
  ctx.fillText('Transaction Type:', 400, y + 50);
  
  ctx.font = '14px Arial';
  ctx.fillText(data.confirmationNumber, 230, y + 25);
  ctx.fillText(data.transferDate, 180, y + 50);
  ctx.fillText('Individual Brokerage', 520, y + 25);
  ctx.fillText('DTC Transfer to Charity', 540, y + 50);
  y += 100;
  
  // Donor information
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('DONOR INFORMATION', 60, y);
  y += 25;
  
  ctx.fillStyle = '#333333';
  ctx.font = '14px Arial';
  ctx.fillText(`Name: ${data.donor.name}`, 80, y);
  y += 20;
  ctx.fillText(`Address: ${data.donor.address}`, 80, y);
  y += 20;
  ctx.fillText(`Tax ID: ${data.donor.ssn}`, 80, y);
  y += 40;
  
  // Recipient information
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('CHARITABLE RECIPIENT', 60, y);
  y += 25;
  
  ctx.fillStyle = '#333333';
  ctx.font = '14px Arial';
  ctx.fillText(`Organization: ${data.recipient.name}`, 80, y);
  y += 20;
  ctx.fillText(`EIN: ${data.recipient.ein}`, 80, y);
  y += 40;
  
  // Security details table
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('SECURITIES TRANSFERRED', 60, y);
  y += 20;
  
  // Table header
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(60, y, width - 120, 30);
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('Symbol', 80, y + 20);
  ctx.fillText('Security Name', 180, y + 20);
  ctx.fillText('Shares', 450, y + 20);
  ctx.fillText('Price/Share', 550, y + 20);
  ctx.fillText('Total Value', 680, y + 20);
  y += 30;
  
  // Table row
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(60, y, width - 120, 30);
  ctx.strokeStyle = '#cbd5e0';
  ctx.strokeRect(60, y, width - 120, 30);
  ctx.fillStyle = '#333333';
  ctx.font = '12px Arial';
  ctx.fillText(data.stock.symbol, 80, y + 20);
  ctx.fillText(data.stock.name, 180, y + 20);
  ctx.fillText(data.stock.shares.toString(), 460, y + 20);
  ctx.fillText(`$${data.stock.pricePerShare.toFixed(2)}`, 550, y + 20);
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`$${data.stock.totalValue.toLocaleString()}.00`, 680, y + 20);
  y += 50;
  
  // Total
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(500, y, width - 560, 35);
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('TOTAL FAIR MARKET VALUE:', 520, y + 23);
  ctx.fillText(`$${data.stock.totalValue.toLocaleString()}.00`, 710, y + 23);
  y += 60;
  
  // IRS notice
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(60, y, width - 120, 80);
  ctx.strokeStyle = '#cbd5e0';
  ctx.strokeRect(60, y, width - 120, 80);
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('IRS Notice:', 80, y + 20);
  ctx.font = '11px Arial';
  const notice = 'For publicly traded securities held more than one year, the charitable deduction equals the fair market';
  const notice2 = 'value on the date of transfer. No qualified appraisal is required for publicly traded securities per IRC §170(f)(11)(A)(ii).';
  ctx.fillText(notice, 80, y + 40);
  ctx.fillText(notice2, 80, y + 55);
  ctx.fillText('Consult your tax advisor regarding deductibility.', 80, y + 70);
  y += 100;
  
  // Transfer details
  ctx.fillStyle = '#1a365d';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('TRANSFER DETAILS', 60, y);
  y += 25;
  
  ctx.fillStyle = '#333333';
  ctx.font = '12px Arial';
  ctx.fillText('Transfer Method: DTC (Depository Trust Company)', 80, y);
  y += 18;
  ctx.fillText('Settlement Date: ' + data.transferDate, 80, y);
  y += 18;
  ctx.fillText('Cost Basis Method: First In, First Out (FIFO)', 80, y);
  y += 40;
  
  // Footer
  ctx.fillStyle = '#666666';
  ctx.font = '10px Arial';
  const footer1 = 'This confirmation serves as documentation of your charitable securities transfer. Please retain for your tax records.';
  const footer2 = `${data.broker.name} | Member SIPC | Securities offered through ${data.broker.name}`;
  ctx.fillText(footer1, 60, height - 60);
  ctx.fillText(footer2, 60, height - 45);
  
  return canvas;
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate documents
console.log('Generating stock confirmation documents...\n');

const manifestEntries = [];

stockDonations.forEach((data, idx) => {
  const canvas = generateStockConfirmation(data);
  const filename = `stock_confirmation_${data.quality}_${String(data.id).padStart(3, '0')}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);
  
  console.log(`✓ Generated: ${filename}`);
  
  manifestEntries.push({
    filename: `stock_confirmations/${filename}`,
    documentType: 'stock_confirmation',
    quality: data.quality,
    synthetic: true,
    expectedFields: {
      donor_name: data.donor.name,
      broker_name: data.broker.name,
      stock_symbol: data.stock.symbol,
      stock_name: data.stock.name,
      shares: data.stock.shares,
      price_per_share: data.stock.pricePerShare,
      total_value: data.stock.totalValue,
      organization_name: data.recipient.name,
      ein: data.recipient.ein,
      confirmation_number: data.confirmationNumber,
      transfer_date: data.transferDate
    }
  });
});

console.log(`\nGenerated ${stockDonations.length} stock confirmation documents`);
console.log('\nManifest entries:');
console.log(JSON.stringify(manifestEntries, null, 2));
