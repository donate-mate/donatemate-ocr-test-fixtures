#!/usr/bin/env node
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '..', 'fonts', 'Inter.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Inter' });
}

const OUTPUT_DIR = path.join(__dirname, '..', 'documents');
const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

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
        const testLine = currentLine ? currentLine + ' ' + word : word;
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
    ctx.globalAlpha = 0.12;
    ctx.font = '20px Inter';
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
    const noiseLevel = quality === 'medium' ? 8 : quality === 'low' ? 20 : 12;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < 0.08) {
            const noise = (Math.random() - 0.5) * noiseLevel * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateReceipt(org, quality, index) {
    const width = 600, height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 40;
    
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, 80);
    
    ctx.font = 'bold 22px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, 55);
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('EIN: ' + org.ein, width / 2, 78);
    
    y = 130;
    
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('DONATION RECEIPT', width / 2, y);
    y += 45;
    
    const date = randomDate();
    const amount = randomAmount();
    const receiptNum = 'RCP-' + date.getFullYear() + '-' + randomInt(10000, 99999);
    
    ctx.textAlign = 'left';
    ctx.font = '13px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Receipt Number: ' + receiptNum, 40, y);
    y += 26;
    ctx.fillText('Date: ' + formatDate(date), 40, y);
    y += 45;
    
    ctx.font = 'bold 14px Inter';
    ctx.fillText('Received From:', 40, y);
    y += 24;
    ctx.font = '13px Inter';
    ctx.fillText('Test Donor', 55, y);
    y += 20;
    ctx.fillText('123 Test Street', 55, y);
    y += 20;
    ctx.fillText('Test City, ST 12345', 55, y);
    y += 45;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(40, y, width - 80, 65);
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, y, width - 80, 65);
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText('DONATION AMOUNT', width / 2, y + 20);
    
    ctx.font = 'bold 26px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), width / 2, y + 50);
    y += 90;
    
    ctx.textAlign = 'left';
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    const taxText = 'No goods or services were provided in exchange for this donation. This receipt may be used for tax purposes.';
    const lines = wrapText(ctx, taxText, 520);
    for (const line of lines) {
        ctx.fillText(line, 40, y);
        y += 16;
    }
    
    y += 35;
    
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(40, y + 40);
    ctx.lineTo(220, y + 40);
    ctx.stroke();
    ctx.font = '9px Inter';
    ctx.fillText('Authorized Signature', 40, y + 55);
    
    ctx.textAlign = 'center';
    ctx.font = '12px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Thank you for your generous donation!', width / 2, height - 40);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'receipt_' + org.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'receipts', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'receipts/' + filename,
        documentType: 'receipt',
        quality,
        synthetic: true,
        expectedFields: { organization_name: org.name, ein: org.ein, amount, date: formatDateShort(date), donor_name: 'Test Donor', receipt_number: receiptNum }
    };
}

function generateAcknowledgmentLetter(org, quality, index) {
    const width = 600, height = 850;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 35;
    
    ctx.font = 'bold 18px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, y);
    y += 22;
    
    ctx.font = '9px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('123 Charity Lane, Nonprofit City, ST 00000', width / 2, y);
    y += 15;
    ctx.fillText('Tax ID: ' + org.ein, width / 2, y);
    y += 12;
    
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();
    y += 30;
    
    const date = randomDate();
    ctx.textAlign = 'left';
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(formatDate(date), 40, y);
    y += 30;
    
    ctx.fillText('Test Donor', 40, y); y += 16;
    ctx.fillText('123 Test Street', 40, y); y += 16;
    ctx.fillText('Test City, ST 12345', 40, y); y += 30;
    ctx.fillText('Dear Test Donor,', 40, y); y += 28;
    
    const amount = randomAmount();
    const donationDate = new Date(date.getTime() - randomInt(1, 14) * 86400000);
    
    const body = 'Thank you for your generous donation of $' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' received on ' + formatDate(donationDate) + '. Your support helps us continue our mission to serve the community.';
    for (const line of wrapText(ctx, body, 520)) { ctx.fillText(line, 40, y); y += 16; }
    y += 18;
    
    const taxText = 'This letter serves as your official receipt for tax purposes. No goods or services were provided in exchange for your contribution. Please retain this letter for your tax records.';
    for (const line of wrapText(ctx, taxText, 520)) { ctx.fillText(line, 40, y); y += 16; }
    y += 22;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(40, y, width - 80, 65);
    ctx.strokeStyle = '#dee2e6';
    ctx.strokeRect(40, y, width - 80, 65);
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Donation Details:', 50, y + 18);
    ctx.font = '11px Inter';
    ctx.fillText('Amount: $' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 50, y + 36);
    ctx.fillText('Date Received: ' + formatDateShort(donationDate), 50, y + 52);
    ctx.fillText('Type: Cash/Check', 300, y + 36);
    y += 85;
    
    ctx.fillText('With gratitude,', 40, y); y += 40;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(180, y); ctx.stroke();
    y += 14;
    ctx.font = '9px Inter';
    ctx.fillText('Executive Director', 40, y); y += 14;
    ctx.fillText(org.name, 40, y);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'acknowledgment_' + org.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'acknowledgment_letters', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'acknowledgment_letters/' + filename,
        documentType: 'acknowledgment_letter',
        quality, synthetic: true,
        expectedFields: { organization_name: org.name, ein: org.ein, amount, date: formatDateShort(donationDate), donor_name: 'Test Donor' }
    };
}

function generateBankStatement(bank, quality, index) {
    const width = 700, height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#003366';
    ctx.fillRect(0, 0, width, 70);
    
    ctx.font = 'bold 20px Inter';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(bank.name, 25, 32);
    ctx.font = '10px Inter';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Account Statement', 25, 50);
    
    let y = 90;
    const acctNum = '***' + randomInt(1000, 9999);
    const startDate = randomDate();
    const endDate = new Date(startDate.getTime() + 30 * 86400000);
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Account: ' + acctNum, 25, y);
    ctx.fillText('Statement Period:', 450, y);
    y += 16;
    ctx.fillStyle = '#666666';
    ctx.fillText('Primary Checking', 25, y);
    ctx.fillStyle = '#333333';
    ctx.fillText(startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString(), 450, y);
    y += 30;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(15, y, width - 30, 22);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Date', 25, y + 15);
    ctx.fillText('Description', 100, y + 15);
    ctx.fillText('Amount', 480, y + 15);
    ctx.fillText('Balance', 580, y + 15);
    y += 28;
    
    const transactions = [];
    let balance = randomInt(5000, 15000);
    let currentDate = new Date(startDate);
    
    const descs = ['GROCERY STORE', 'GAS STATION', 'RESTAURANT', 'ONLINE PURCHASE'];
    for (let i = 0; i < randomInt(3, 5); i++) {
        const amt = -randomAmount(20, 200);
        balance += amt;
        transactions.push({ date: new Date(currentDate), desc: descs[randomInt(0, 3)], amount: amt, balance, charitable: false });
        currentDate = new Date(currentDate.getTime() + randomInt(1, 5) * 86400000);
    }
    
    const charitableOrgs = [];
    for (let i = 0; i < randomInt(2, 3); i++) {
        const org = ORGANIZATIONS[randomInt(0, ORGANIZATIONS.length - 1)];
        const amt = -randomAmount(50, 500);
        balance += amt;
        transactions.push({ date: new Date(currentDate), desc: 'DONATION ' + org.name.substring(0, 18).toUpperCase(), amount: amt, balance, charitable: true, org });
        charitableOrgs.push({ organization: org.name, amount: Math.abs(amt), date: formatDateShort(currentDate) });
        currentDate = new Date(currentDate.getTime() + randomInt(1, 5) * 86400000);
    }
    
    transactions.sort((a, b) => a.date - b.date);
    
    ctx.font = '10px Inter';
    for (const txn of transactions) {
        if (y > height - 70) break;
        ctx.fillStyle = '#333333';
        ctx.fillText(txn.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), 25, y);
        ctx.fillText(txn.desc.substring(0, 38), 100, y);
        ctx.fillStyle = txn.amount < 0 ? '#cc0000' : '#008800';
        ctx.fillText('$' + txn.amount.toFixed(2), 480, y);
        ctx.fillStyle = '#333333';
        ctx.fillText('$' + txn.balance.toFixed(2), 580, y);
        y += 18;
    }
    
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(15, height - 45);
    ctx.lineTo(width - 15, height - 45);
    ctx.stroke();
    ctx.font = '9px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('Page 1 of 1', 25, height - 30);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'bank_statement_' + bank.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'bank_statements', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'bank_statements/' + filename,
        documentType: 'bank_statement',
        quality, synthetic: true,
        expectedFields: { bank_name: bank.name, account_number: acctNum, statement_period_start: formatDateShort(startDate), statement_period_end: formatDateShort(endDate), charitable_transactions: charitableOrgs }
    };
}

function main() {
    console.log('Generating OCR test documents...');
    
    const subdirs = ['receipts', 'acknowledgment_letters', 'bank_statements', 'credit_card_statements', 'cancelled_checks', 'appraisals', 'form_8283', 'other'];
    for (const subdir of subdirs) fs.mkdirSync(path.join(OUTPUT_DIR, subdir), { recursive: true });
    
    const manifestEntries = [];
    
    console.log('Generating receipts...');
    [...Array(12).fill('high'), ...Array(9).fill('medium'), ...Array(6).fill('low'), ...Array(3).fill('edge')].forEach((q, i) => 
        manifestEntries.push(generateReceipt(ORGANIZATIONS[i % ORGANIZATIONS.length], q, i + 1)));
    console.log('  Generated 30 receipts');
    
    console.log('Generating acknowledgment letters...');
    [...Array(10).fill('high'), ...Array(6).fill('medium'), ...Array(4).fill('low')].forEach((q, i) => 
        manifestEntries.push(generateAcknowledgmentLetter(ORGANIZATIONS[i % ORGANIZATIONS.length], q, i + 1)));
    console.log('  Generated 20 acknowledgment letters');
    
    console.log('Generating bank statements...');
    [...Array(8).fill('high'), ...Array(5).fill('medium'), ...Array(2).fill('low')].forEach((q, i) => 
        manifestEntries.push(generateBankStatement(BANKS[i % BANKS.length], q, i + 1)));
    console.log('  Generated 15 bank statements');
    
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({
        version: '1.0.0', generatedBy: 'claude-synthetic', generatedAt: new Date().toISOString(),
        totalDocuments: manifestEntries.length, documentCounts: { receipts: 30, acknowledgment_letters: 20, bank_statements: 15 },
        documents: manifestEntries
    }, null, 2));
    
    console.log('\nGenerated ' + manifestEntries.length + ' total documents');
}

main();
