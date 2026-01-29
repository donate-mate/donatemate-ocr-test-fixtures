#!/usr/bin/env node
/**
 * Generate synthetic OCR test documents for DonateMate.
 * Creates realistic-looking donation receipts, acknowledgment letters, bank statements, etc.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '..', 'documents');
const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

// Organizations data
const ORGANIZATIONS = [
    { name: "Goodwill Industries", ein: "53-0196517", short: "goodwill" },
    { name: "The Salvation Army", ein: "13-5562351", short: "salvation-army" },
    { name: "American Red Cross", ein: "53-0196605", short: "redcross" },
    { name: "Habitat for Humanity", ein: "91-1914868", short: "habitat" },
    { name: "United Way Worldwide", ein: "13-1635294", short: "unitedway" },
    { name: "Community Food Bank", ein: "12-3456789", short: "foodbank" },
    { name: "First Community Church", ein: "23-4567890", short: "church" },
    { name: "State University Foundation", ein: "34-5678901", short: "university" },
];

const BANKS = [
    { name: "Chase Bank", short: "chase" },
    { name: "Bank of America", short: "bofa" },
    { name: "Wells Fargo", short: "wellsfargo" },
    { name: "Citibank", short: "citi" },
    { name: "Local Credit Union", short: "creditunion" },
];

// Helper functions
function randomDate(startYear = 2025) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(2026, 0, 29);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(date) {
    return date.toISOString().split('T')[0];
}

function randomAmount(min = 25, max = 5000) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function addWatermark(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'center';
    ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
    ctx.restore();
}

function applyQuality(ctx, canvas, quality) {
    if (quality === 'high') return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const noiseLevel = quality === 'medium' ? 10 : quality === 'low' ? 25 : 15;
    
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < 0.1) {
            const noise = (Math.random() - 0.5) * noiseLevel * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Receipt generator
function generateReceipt(org, quality, index) {
    const width = 600, height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 40;
    
    // Header box
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, 80);
    
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, 55);
    
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'gray';
    ctx.fillText(`EIN: ${org.ein}`, width / 2, 80);
    
    y = 130;
    
    // Receipt title
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText('DONATION RECEIPT', width / 2, y);
    y += 50;
    
    // Generate data
    const date = randomDate();
    const amount = randomAmount();
    const receiptNum = `RCP-${date.getFullYear()}-${randomInt(10000, 99999)}`;
    
    // Receipt details
    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Receipt Number: ${receiptNum}`, 40, y);
    y += 30;
    ctx.fillText(`Date: ${formatDate(date)}`, 40, y);
    y += 50;
    
    // Donor info
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Received From:', 40, y);
    y += 25;
    ctx.font = '14px sans-serif';
    ctx.fillText('Test Donor', 60, y);
    y += 22;
    ctx.fillText('123 Test Street', 60, y);
    y += 22;
    ctx.fillText('Test City, ST 12345', 60, y);
    y += 50;
    
    // Amount box
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, y, width - 80, 60);
    
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DONATION AMOUNT', width / 2, y + 18);
    
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, width / 2, y + 45);
    y += 90;
    
    // Tax statement
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'gray';
    const taxText = 'No goods or services were provided in exchange for this donation. This receipt may be used for tax purposes.';
    const lines = wrapText(ctx, taxText, 520);
    for (const line of lines) {
        ctx.fillText(line, 40, y);
        y += 18;
    }
    
    y += 30;
    
    // Signature line
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(40, y + 40);
    ctx.lineTo(250, y + 40);
    ctx.stroke();
    ctx.font = '10px sans-serif';
    ctx.fillText('Authorized Signature', 40, y + 55);
    
    // Footer
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText('Thank you for your generous donation!', width / 2, height - 40);
    
    // Add watermark and quality effects
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    // Save
    const filename = `receipt_${org.short}_${quality}_${String(index).padStart(3, '0')}.png`;
    const filepath = path.join(OUTPUT_DIR, 'receipts', filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
    
    return {
        filename: `receipts/${filename}`,
        documentType: 'receipt',
        quality,
        synthetic: true,
        expectedFields: {
            organization_name: org.name,
            ein: org.ein,
            amount,
            date: formatDateShort(date),
            donor_name: 'Test Donor',
            receipt_number: receiptNum
        }
    };
}

// Acknowledgment letter generator
function generateAcknowledgmentLetter(org, quality, index) {
    const width = 600, height = 850;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 40;
    
    // Letterhead
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, y);
    y += 25;
    
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'gray';
    ctx.fillText('123 Charity Lane, Nonprofit City, ST 00000', width / 2, y);
    y += 18;
    ctx.fillText(`Tax ID: ${org.ein}`, width / 2, y);
    y += 15;
    
    ctx.strokeStyle = 'gray';
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();
    y += 35;
    
    // Date
    const date = randomDate();
    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText(formatDate(date), 40, y);
    y += 35;
    
    // Recipient
    ctx.fillText('Test Donor', 40, y);
    y += 18;
    ctx.fillText('123 Test Street', 40, y);
    y += 18;
    ctx.fillText('Test City, ST 12345', 40, y);
    y += 35;
    
    // Greeting
    ctx.fillText('Dear Test Donor,', 40, y);
    y += 30;
    
    // Body
    const amount = randomAmount();
    const donationDate = new Date(date.getTime() - randomInt(1, 14) * 24 * 60 * 60 * 1000);
    
    const body = `Thank you for your generous donation of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} received on ${formatDate(donationDate)}. Your support helps us continue our mission to serve the community.`;
    const bodyLines = wrapText(ctx, body, 520);
    for (const line of bodyLines) {
        ctx.fillText(line, 40, y);
        y += 18;
    }
    y += 20;
    
    // Tax statement
    const taxText = 'This letter serves as your official receipt for tax purposes. No goods or services were provided in exchange for your contribution. Please retain this letter for your tax records.';
    const taxLines = wrapText(ctx, taxText, 520);
    for (const line of taxLines) {
        ctx.fillText(line, 40, y);
        y += 18;
    }
    y += 25;
    
    // Donation details box
    ctx.strokeStyle = 'gray';
    ctx.strokeRect(40, y, width - 80, 70);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Donation Details:', 50, y + 20);
    ctx.font = '12px sans-serif';
    ctx.fillText(`Amount: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 50, y + 40);
    ctx.fillText(`Date Received: ${formatDateShort(donationDate)}`, 50, y + 55);
    ctx.fillText('Type: Cash/Check', 300, y + 40);
    y += 95;
    
    // Closing
    ctx.fillText('With gratitude,', 40, y);
    y += 45;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(200, y);
    ctx.stroke();
    y += 15;
    ctx.font = '10px sans-serif';
    ctx.fillText('Executive Director', 40, y);
    y += 15;
    ctx.fillText(org.name, 40, y);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = `acknowledgment_${org.short}_${quality}_${String(index).padStart(3, '0')}.png`;
    const filepath = path.join(OUTPUT_DIR, 'acknowledgment_letters', filename);
    fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
    
    return {
        filename: `acknowledgment_letters/${filename}`,
        documentType: 'acknowledgment_letter',
        quality,
        synthetic: true,
        expectedFields: {
            organization_name: org.name,
            ein: org.ein,
            amount,
            date: formatDateShort(donationDate),
            donor_name: 'Test Donor'
        }
    };
}

// Bank statement generator
function generateBankStatement(bank, quality, index) {
    const width = 700, height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Bank header
    ctx.fillStyle = '#003366';
    ctx.fillRect(0, 0, width, 80);
    
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(bank.name, 30, 35);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Account Statement', 30, 55);
    
    let y = 100;
    
    // Account info
    const acctNum = `***${randomInt(1000, 9999)}`;
    const startDate = randomDate();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText(`Account: ${acctNum}`, 30, y);
    ctx.fillText('Statement Period:', 450, y);
    y += 18;
    ctx.fillStyle = 'gray';
    ctx.fillText('Primary Checking', 30, y);
    ctx.fillStyle = 'black';
    ctx.fillText(`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 450, y);
    y += 35;
    
    // Transaction header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(20, y, width - 40, 25);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText('Date', 30, y + 17);
    ctx.fillText('Description', 120, y + 17);
    ctx.fillText('Amount', 480, y + 17);
    ctx.fillText('Balance', 580, y + 17);
    y += 30;
    
    // Generate transactions
    const transactions = [];
    let balance = randomInt(5000, 15000);
    let currentDate = new Date(startDate);
    
    // Regular transactions
    const regularDescs = ['GROCERY STORE', 'GAS STATION', 'RESTAURANT', 'ONLINE PURCHASE', 'UTILITY PAYMENT'];
    for (let i = 0; i < randomInt(3, 5); i++) {
        const amt = -randomAmount(20, 200);
        balance += amt;
        transactions.push({
            date: new Date(currentDate),
            desc: regularDescs[randomInt(0, regularDescs.length - 1)],
            amount: amt,
            balance,
            charitable: false
        });
        currentDate = new Date(currentDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
    }
    
    // Charitable transactions
    const charitableOrgs = [];
    const numCharitable = randomInt(2, 3);
    for (let i = 0; i < numCharitable; i++) {
        const org = ORGANIZATIONS[randomInt(0, ORGANIZATIONS.length - 1)];
        const amt = -randomAmount(50, 500);
        balance += amt;
        transactions.push({
            date: new Date(currentDate),
            desc: `DONATION ${org.name.substring(0, 20).toUpperCase()}`,
            amount: amt,
            balance,
            charitable: true,
            org
        });
        charitableOrgs.push({
            organization: org.name,
            amount: Math.abs(amt),
            date: formatDateShort(currentDate)
        });
        currentDate = new Date(currentDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
    }
    
    // Sort by date
    transactions.sort((a, b) => a.date - b.date);
    
    // Draw transactions
    ctx.font = '11px sans-serif';
    for (const txn of transactions) {
        if (y > height - 80) break;
        ctx.fillStyle = 'black';
        ctx.fillText(txn.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), 30, y);
        ctx.fillText(txn.desc.substring(0, 35), 120, y);
        ctx.fillStyle = txn.amount < 0 ? '#cc0000' : '#008800';
        ctx.fillText(`$${txn.amount.toFixed(2)}`, 480, y);
        ctx.fillStyle = 'black';
        ctx.fillText(`$${txn.balance.toFixed(2)}`, 580, y);
        y += 20;
    }
    
    // Footer
    ctx.strokeStyle = 'gray';
    ctx.beginPath();
    ctx.moveTo(20, height - 50);
    ctx.lineTo(width - 20, height - 50);
    ctx.stroke();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'gray';
    ctx.fillText('Page 1 of 1', 30, height - 35);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = `bank_statement_${bank.short}_${quality}_${String(index).padStart(3, '0')}.png`;
    const filepath = path.join(OUTPUT_DIR, 'bank_statements', filename);
    fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
    
    return {
        filename: `bank_statements/${filename}`,
        documentType: 'bank_statement',
        quality,
        synthetic: true,
        expectedFields: {
            bank_name: bank.name,
            account_number: acctNum,
            statement_period_start: formatDateShort(startDate),
            statement_period_end: formatDateShort(endDate),
            charitable_transactions: charitableOrgs
        }
    };
}

// Main function
function main() {
    console.log('Generating OCR test documents...');
    
    // Ensure directories exist
    const subdirs = ['receipts', 'acknowledgment_letters', 'bank_statements', 
                     'credit_card_statements', 'cancelled_checks', 'appraisals', 
                     'form_8283', 'other'];
    for (const subdir of subdirs) {
        fs.mkdirSync(path.join(OUTPUT_DIR, subdir), { recursive: true });
    }
    
    const manifestEntries = [];
    
    // Generate receipts (30 total: 12 high, 9 medium, 6 low, 3 edge)
    console.log('Generating receipts...');
    const receiptQualities = [
        ...Array(12).fill('high'),
        ...Array(9).fill('medium'),
        ...Array(6).fill('low'),
        ...Array(3).fill('edge')
    ];
    receiptQualities.forEach((quality, i) => {
        const org = ORGANIZATIONS[i % ORGANIZATIONS.length];
        manifestEntries.push(generateReceipt(org, quality, i + 1));
    });
    console.log(`  Generated ${receiptQualities.length} receipts`);
    
    // Generate acknowledgment letters (20 total)
    console.log('Generating acknowledgment letters...');
    const letterQualities = [
        ...Array(10).fill('high'),
        ...Array(6).fill('medium'),
        ...Array(4).fill('low')
    ];
    letterQualities.forEach((quality, i) => {
        const org = ORGANIZATIONS[i % ORGANIZATIONS.length];
        manifestEntries.push(generateAcknowledgmentLetter(org, quality, i + 1));
    });
    console.log(`  Generated ${letterQualities.length} acknowledgment letters`);
    
    // Generate bank statements (15 total)
    console.log('Generating bank statements...');
    const statementQualities = [
        ...Array(8).fill('high'),
        ...Array(5).fill('medium'),
        ...Array(2).fill('low')
    ];
    statementQualities.forEach((quality, i) => {
        const bank = BANKS[i % BANKS.length];
        manifestEntries.push(generateBankStatement(bank, quality, i + 1));
    });
    console.log(`  Generated ${statementQualities.length} bank statements`);
    
    // Create manifest
    const manifest = {
        version: '1.0.0',
        generatedBy: 'claude-synthetic',
        generatedAt: new Date().toISOString(),
        totalDocuments: manifestEntries.length,
        documentCounts: {
            receipts: receiptQualities.length,
            acknowledgment_letters: letterQualities.length,
            bank_statements: statementQualities.length
        },
        documents: manifestEntries
    };
    
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    
    console.log(`\nGenerated ${manifestEntries.length} total documents`);
    console.log(`Manifest saved to ${MANIFEST_PATH}`);
}

main();
