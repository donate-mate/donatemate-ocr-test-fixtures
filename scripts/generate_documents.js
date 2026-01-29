#!/usr/bin/env node
/**
 * Generate IRS-compliant synthetic OCR test documents for DonateMate.
 * Follows IRS Publication 1771 requirements for charitable contribution substantiation.
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '..', 'fonts', 'Inter.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Inter' });
}

const OUTPUT_DIR = path.join(__dirname, '..', 'documents');
const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

// Real nonprofit organizations with actual EINs
const ORGANIZATIONS = [
    { name: "Goodwill Industries International, Inc.", ein: "53-0196517", short: "goodwill", address: "15810 Indianola Drive, Rockville, MD 20855", type: "501(c)(3)" },
    { name: "The Salvation Army National Corporation", ein: "13-5562351", short: "salvation-army", address: "615 Slaters Lane, Alexandria, VA 22314", type: "501(c)(3)" },
    { name: "American National Red Cross", ein: "53-0196605", short: "redcross", address: "431 18th Street NW, Washington, DC 20006", type: "501(c)(3)" },
    { name: "Habitat for Humanity International, Inc.", ein: "91-1914868", short: "habitat", address: "322 W. Lamar Street, Americus, GA 31709", type: "501(c)(3)" },
    { name: "United Way Worldwide", ein: "13-1635294", short: "unitedway", address: "701 N. Fairfax Street, Alexandria, VA 22314", type: "501(c)(3)" },
    { name: "Sample Community Food Bank", ein: "12-3456789", short: "foodbank", address: "456 Charity Lane, Anytown, ST 12345", type: "501(c)(3)" },
    { name: "First Community Church", ein: "23-4567890", short: "church", address: "789 Faith Avenue, Hometown, ST 23456", type: "501(c)(3)" },
    { name: "State University Foundation", ein: "34-5678901", short: "university", address: "100 College Drive, University City, ST 34567", type: "501(c)(3)" },
];

const BANKS = [
    { name: "Chase Bank", short: "chase", routing: "021000021" },
    { name: "Bank of America", short: "bofa", routing: "026009593" },
    { name: "Wells Fargo Bank", short: "wellsfargo", routing: "121000248" },
    { name: "Citibank, N.A.", short: "citi", routing: "021000089" },
    { name: "Community Credit Union", short: "creditunion", routing: "123456789" },
];

// Donor name variations for testing
const DONOR_NAMES = [
    { first: "John", last: "Smith", full: "John Smith" },
    { first: "Sarah", last: "Johnson", full: "Sarah Johnson" },
    { first: "Michael", last: "Williams", full: "Michael Williams" },
    { first: "Emily", last: "Brown", full: "Emily Brown" },
    { first: "Robert", last: "Davis", full: "Robert Davis" },
    { first: "Jennifer", last: "Miller", full: "Jennifer Miller" },
    { first: "David", last: "Wilson", full: "David Wilson" },
    { first: "Lisa", last: "Anderson", full: "Lisa Anderson" },
];

const DONOR_ADDRESSES = [
    { street: "123 Main Street", city: "Springfield", state: "IL", zip: "62701" },
    { street: "456 Oak Avenue", city: "Portland", state: "OR", zip: "97201" },
    { street: "789 Elm Drive", city: "Austin", state: "TX", zip: "78701" },
    { street: "321 Pine Road", city: "Denver", state: "CO", zip: "80202" },
    { street: "654 Maple Lane", city: "Seattle", state: "WA", zip: "98101" },
    { street: "987 Cedar Court", city: "Boston", state: "MA", zip: "02101" },
    { street: "147 Birch Way", city: "Phoenix", state: "AZ", zip: "85001" },
    { street: "258 Willow Street", city: "Atlanta", state: "GA", zip: "30301" },
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

function formatDateNumeric(date) {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function randomAmount(min = 25, max = 5000) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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
    ctx.globalAlpha = 0.10;
    ctx.font = '18px Inter';
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

/**
 * Generate IRS-compliant donation receipt
 * Per IRS Publication 1771, must include:
 * 1. Organization name
 * 2. Amount of cash contribution  
 * 3. Date of contribution
 * 4. Statement that no goods/services were provided (or description if provided)
 */
function generateReceipt(org, quality, index) {
    const width = 612, height = 792; // Letter size at 72 DPI
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const donor = randomElement(DONOR_NAMES);
    const address = randomElement(DONOR_ADDRESSES);
    const date = randomDate();
    const amount = randomAmount();
    const receiptNum = org.short.toUpperCase().substring(0, 3) + '-' + date.getFullYear() + '-' + String(randomInt(100000, 999999));
    
    let y = 50;
    
    // Organization Header
    ctx.font = 'bold 20px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, y);
    y += 22;
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#444444';
    ctx.fillText(org.address, width / 2, y);
    y += 16;
    ctx.fillText('Federal Tax ID (EIN): ' + org.ein + ' | ' + org.type + ' Tax-Exempt Organization', width / 2, y);
    y += 30;
    
    // Divider
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(width - 50, y);
    ctx.stroke();
    y += 30;
    
    // Receipt Title
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('OFFICIAL DONATION RECEIPT', width / 2, y);
    y += 12;
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('For Tax Purposes - Please Retain for Your Records', width / 2, y);
    y += 35;
    
    // Receipt Details - Left aligned
    ctx.textAlign = 'left';
    
    // Receipt Number and Date Box
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(50, y, width - 100, 50);
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(50, y, width - 100, 50);
    
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Receipt Number:', 60, y + 20);
    ctx.fillText('Date Issued:', 60, y + 38);
    ctx.fillText('Contribution Date:', 320, y + 20);
    
    ctx.font = '11px Inter';
    ctx.fillText(receiptNum, 170, y + 20);
    ctx.fillText(formatDate(new Date()), 150, y + 38);
    ctx.fillText(formatDate(date), 435, y + 20);
    y += 70;
    
    // Donor Information
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('DONOR INFORMATION', 50, y);
    y += 20;
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Name: ' + donor.full, 50, y);
    y += 18;
    ctx.fillText('Address: ' + address.street, 50, y);
    y += 18;
    ctx.fillText(address.city + ', ' + address.state + ' ' + address.zip, 100, y);
    y += 35;
    
    // Contribution Details
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('CONTRIBUTION DETAILS', 50, y);
    y += 25;
    
    // Amount Box
    ctx.fillStyle = '#f0f7f0';
    ctx.fillRect(50, y, width - 100, 60);
    ctx.strokeStyle = '#4a9c4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, y, width - 100, 60);
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Cash/Check Contribution Amount:', 65, y + 22);
    
    ctx.font = 'bold 24px Inter';
    ctx.fillStyle = '#2d6a2d';
    ctx.textAlign = 'right';
    ctx.fillText('$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), width - 65, y + 45);
    ctx.textAlign = 'left';
    y += 80;
    
    // IRS Required Statement (Per Publication 1771)
    ctx.fillStyle = '#fff8e6';
    ctx.fillRect(50, y, width - 100, 75);
    ctx.strokeStyle = '#e6c84a';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, y, width - 100, 75);
    
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#7a6a00';
    ctx.fillText('IRS REQUIRED DISCLOSURE (Per IRC Section 170(f)(8)):', 60, y + 18);
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#5a5000';
    const irsStatement = 'No goods or services were provided in exchange for this contribution. The entire amount of your donation is tax-deductible to the extent allowed by law. This receipt serves as written acknowledgment required for contributions of $250 or more.';
    const irsLines = wrapText(ctx, irsStatement, width - 130);
    let lineY = y + 35;
    for (const line of irsLines) {
        ctx.fillText(line, 60, lineY);
        lineY += 14;
    }
    y += 95;
    
    // Authorized Signature
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('Authorized Representative:', 50, y);
    y += 30;
    
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(250, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(320, y);
    ctx.lineTo(450, y);
    ctx.stroke();
    
    ctx.font = '9px Inter';
    ctx.fillText('Signature', 50, y + 14);
    ctx.fillText('Date', 320, y + 14);
    y += 40;
    
    // Footer
    ctx.textAlign = 'center';
    ctx.font = '9px Inter';
    ctx.fillStyle = '#888888';
    ctx.fillText('Thank you for your generous support of ' + org.name, width / 2, height - 60);
    ctx.fillText('Questions? Contact us at donations@' + org.short + '.org', width / 2, height - 45);
    ctx.font = '8px Inter';
    ctx.fillText('This organization is a ' + org.type + ' tax-exempt organization. Contributions are deductible under IRC Section 170.', width / 2, height - 30);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'receipt_' + org.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'receipts', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'receipts/' + filename,
        documentType: 'receipt',
        quality,
        synthetic: true,
        irsCompliant: true,
        expectedFields: {
            organization_name: org.name,
            organization_address: org.address,
            ein: org.ein,
            tax_status: org.type,
            amount: amount,
            contribution_date: formatDateShort(date),
            donor_name: donor.full,
            donor_address: address.street + ', ' + address.city + ', ' + address.state + ' ' + address.zip,
            receipt_number: receiptNum,
            goods_services_provided: false
        }
    };
}

/**
 * Generate IRS-compliant acknowledgment letter
 */
function generateAcknowledgmentLetter(org, quality, index) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const donor = randomElement(DONOR_NAMES);
    const address = randomElement(DONOR_ADDRESSES);
    const letterDate = randomDate();
    const donationDate = new Date(letterDate.getTime() - randomInt(1, 21) * 86400000);
    const amount = randomAmount();
    
    let y = 50;
    
    // Letterhead
    ctx.font = 'bold 18px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(org.name, width / 2, y);
    y += 18;
    
    ctx.font = '9px Inter';
    ctx.fillStyle = '#555555';
    ctx.fillText(org.address, width / 2, y);
    y += 14;
    ctx.fillText('Tax ID: ' + org.ein + ' | ' + org.type + ' Organization', width / 2, y);
    y += 8;
    
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(width - 50, y);
    ctx.stroke();
    y += 35;
    
    // Date
    ctx.textAlign = 'left';
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(formatDate(letterDate), 50, y);
    y += 35;
    
    // Recipient Address
    ctx.fillText(donor.full, 50, y); y += 16;
    ctx.fillText(address.street, 50, y); y += 16;
    ctx.fillText(address.city + ', ' + address.state + ' ' + address.zip, 50, y);
    y += 35;
    
    // Salutation
    ctx.fillText('Dear ' + donor.first + ',', 50, y);
    y += 28;
    
    // Body paragraph 1
    const para1 = 'Thank you for your generous contribution to ' + org.name + '. We are pleased to acknowledge receipt of your donation as detailed below:';
    for (const line of wrapText(ctx, para1, 510)) {
        ctx.fillText(line, 50, y);
        y += 16;
    }
    y += 20;
    
    // Donation Details Box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(50, y, width - 100, 80);
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(50, y, width - 100, 80);
    
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Contribution Details', 65, y + 20);
    
    ctx.font = '11px Inter';
    ctx.fillText('Date of Contribution:', 65, y + 40);
    ctx.fillText('Amount Received:', 65, y + 58);
    ctx.fillText('Method:', 320, y + 40);
    ctx.fillText('Receipt #:', 320, y + 58);
    
    ctx.font = 'bold 11px Inter';
    ctx.fillText(formatDate(donationDate), 190, y + 40);
    ctx.fillText('$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), 175, y + 58);
    ctx.font = '11px Inter';
    ctx.fillText(randomElement(['Check', 'Cash', 'Credit Card', 'Bank Transfer']), 375, y + 40);
    ctx.fillText(org.short.toUpperCase().substring(0, 3) + '-' + donationDate.getFullYear() + '-' + randomInt(100000, 999999), 385, y + 58);
    y += 100;
    
    // IRS Disclosure
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(50, y, width - 100, 65);
    ctx.strokeStyle = '#f0d060';
    ctx.strokeRect(50, y, width - 100, 65);
    
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#806000';
    ctx.fillText('TAX DEDUCTIBILITY STATEMENT (IRS Requirement)', 60, y + 16);
    
    ctx.font = '9px Inter';
    const taxStatement = 'No goods or services were provided in exchange for your contribution. This letter serves as your official receipt and written acknowledgment as required by the IRS for contributions of $250 or more. ' + org.name + ' is a ' + org.type + ' tax-exempt organization. Your contribution is tax-deductible to the fullest extent permitted by law.';
    let ty = y + 30;
    for (const line of wrapText(ctx, taxStatement, 490)) {
        ctx.fillText(line, 60, ty);
        ty += 12;
    }
    y += 85;
    
    // Closing
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    const closing = 'Your support makes a meaningful difference in our mission. We are deeply grateful for your generosity and commitment to our cause.';
    for (const line of wrapText(ctx, closing, 510)) {
        ctx.fillText(line, 50, y);
        y += 16;
    }
    y += 25;
    
    ctx.fillText('With sincere appreciation,', 50, y);
    y += 45;
    
    // Signature
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(200, y);
    ctx.stroke();
    y += 16;
    
    ctx.font = '10px Inter';
    ctx.fillText('Executive Director', 50, y);
    y += 14;
    ctx.fillText(org.name, 50, y);
    
    // Footer
    ctx.textAlign = 'center';
    ctx.font = '8px Inter';
    ctx.fillStyle = '#888888';
    ctx.fillText('Please retain this letter for your tax records. | Federal Tax ID: ' + org.ein, width / 2, height - 30);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'acknowledgment_' + org.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'acknowledgment_letters', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'acknowledgment_letters/' + filename,
        documentType: 'acknowledgment_letter',
        quality,
        synthetic: true,
        irsCompliant: true,
        expectedFields: {
            organization_name: org.name,
            ein: org.ein,
            amount: amount,
            contribution_date: formatDateShort(donationDate),
            letter_date: formatDateShort(letterDate),
            donor_name: donor.full,
            goods_services_provided: false
        }
    };
}

/**
 * Generate bank statement with charitable transactions
 */
function generateBankStatement(bank, quality, index) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const donor = randomElement(DONOR_NAMES);
    const address = randomElement(DONOR_ADDRESSES);
    const acctNum = randomInt(1000, 9999);
    const acctLast4 = String(acctNum);
    const startDate = randomDate();
    const endDate = new Date(startDate.getTime() + 30 * 86400000);
    
    // Bank Header
    ctx.fillStyle = '#003366';
    ctx.fillRect(0, 0, width, 85);
    
    ctx.font = 'bold 22px Inter';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(bank.name, 30, 35);
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#aaddff';
    ctx.fillText('Member FDIC | Routing: ' + bank.routing, 30, 55);
    ctx.fillText('ACCOUNT STATEMENT', 30, 72);
    
    // Statement Period - right side
    ctx.textAlign = 'right';
    ctx.fillStyle = 'white';
    ctx.font = '9px Inter';
    ctx.fillText('Statement Period', width - 30, 35);
    ctx.font = 'bold 11px Inter';
    ctx.fillText(formatDateNumeric(startDate) + ' - ' + formatDateNumeric(endDate), width - 30, 52);
    ctx.font = '9px Inter';
    ctx.fillText('Page 1 of 1', width - 30, 72);
    
    let y = 105;
    
    // Account Info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('Account Holder:', 30, y);
    ctx.fillText('Account Number:', 300, y);
    
    ctx.font = '11px Inter';
    ctx.fillText(donor.full, 130, y);
    ctx.fillText('******' + acctLast4, 415, y);
    y += 18;
    
    ctx.fillText(address.street + ', ' + address.city + ', ' + address.state + ' ' + address.zip, 130, y);
    ctx.font = 'bold 11px Inter';
    ctx.fillText('Account Type:', 300, y);
    ctx.font = '11px Inter';
    ctx.fillText('Personal Checking', 400, y);
    y += 30;
    
    // Divider
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 30, y);
    ctx.stroke();
    y += 20;
    
    // Transaction Header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(30, y, width - 60, 24);
    
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Date', 40, y + 16);
    ctx.fillText('Description', 110, y + 16);
    ctx.fillText('Amount', 420, y + 16);
    ctx.fillText('Balance', 510, y + 16);
    y += 30;
    
    // Generate transactions
    const transactions = [];
    let balance = randomInt(8000, 25000);
    const openingBalance = balance;
    let currentDate = new Date(startDate);
    
    // Regular transactions
    const regularTxns = [
        { desc: 'DIRECT DEPOSIT - PAYROLL', type: 'credit' },
        { desc: 'CHECK #' + randomInt(1001, 1999), type: 'debit' },
        { desc: 'DEBIT CARD PURCHASE - GROCERY', type: 'debit' },
        { desc: 'ACH PAYMENT - UTILITY', type: 'debit' },
        { desc: 'ATM WITHDRAWAL', type: 'debit' },
        { desc: 'ONLINE TRANSFER', type: 'debit' },
        { desc: 'DEBIT CARD - RESTAURANT', type: 'debit' },
        { desc: 'DEBIT CARD - GAS STATION', type: 'debit' },
    ];
    
    for (let i = 0; i < randomInt(5, 8); i++) {
        const txn = randomElement(regularTxns);
        const amt = txn.type === 'credit' ? randomAmount(2000, 4000) : -randomAmount(15, 300);
        balance += amt;
        transactions.push({
            date: new Date(currentDate),
            desc: txn.desc,
            amount: amt,
            balance: balance,
            charitable: false
        });
        currentDate = new Date(currentDate.getTime() + randomInt(1, 4) * 86400000);
    }
    
    // Charitable transactions (2-4)
    const charitableOrgs = [];
    const numCharitable = randomInt(2, 4);
    for (let i = 0; i < numCharitable; i++) {
        const org = randomElement(ORGANIZATIONS);
        const amt = -randomAmount(50, 750);
        balance += amt;
        
        const methods = ['CHECK #' + randomInt(1001, 1999) + ' - ', 'ACH DONATION - ', 'ONLINE DONATION - ', 'DEBIT CARD - '];
        const method = randomElement(methods);
        
        transactions.push({
            date: new Date(currentDate),
            desc: method + org.name.substring(0, 25).toUpperCase(),
            amount: amt,
            balance: balance,
            charitable: true,
            org: org
        });
        charitableOrgs.push({
            organization: org.name,
            ein: org.ein,
            amount: Math.abs(amt),
            date: formatDateShort(currentDate)
        });
        currentDate = new Date(currentDate.getTime() + randomInt(2, 5) * 86400000);
    }
    
    transactions.sort((a, b) => a.date - b.date);
    
    // Draw transactions
    ctx.font = '10px Inter';
    for (const txn of transactions) {
        if (y > height - 120) break;
        
        // Highlight charitable transactions
        if (txn.charitable) {
            ctx.fillStyle = '#f0fff0';
            ctx.fillRect(30, y - 12, width - 60, 18);
        }
        
        ctx.fillStyle = '#333333';
        ctx.fillText(txn.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), 40, y);
        ctx.fillText(txn.desc.substring(0, 42), 110, y);
        
        ctx.fillStyle = txn.amount < 0 ? '#cc0000' : '#008800';
        ctx.textAlign = 'right';
        ctx.fillText((txn.amount < 0 ? '-' : '+') + '$' + Math.abs(txn.amount).toFixed(2), 480, y);
        
        ctx.fillStyle = '#333333';
        ctx.fillText('$' + txn.balance.toFixed(2), 570, y);
        ctx.textAlign = 'left';
        
        y += 20;
    }
    
    y += 15;
    
    // Summary Box
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(30, y, width - 60, 70);
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(30, y, width - 60, 70);
    
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('ACCOUNT SUMMARY', 45, y + 20);
    
    ctx.font = '10px Inter';
    ctx.fillText('Opening Balance:', 45, y + 40);
    ctx.fillText('Closing Balance:', 45, y + 56);
    ctx.fillText('Total Charitable Contributions:', 280, y + 40);
    
    ctx.textAlign = 'right';
    ctx.fillText('$' + openingBalance.toFixed(2), 230, y + 40);
    ctx.fillText('$' + balance.toFixed(2), 230, y + 56);
    
    const totalCharitable = charitableOrgs.reduce((sum, c) => sum + c.amount, 0);
    ctx.fillStyle = '#2d6a2d';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('$' + totalCharitable.toFixed(2), 540, y + 40);
    ctx.textAlign = 'left';
    
    // Footer
    ctx.font = '8px Inter';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Keep this statement for your records. Charitable contributions may be tax-deductible - consult your tax advisor.', width / 2, height - 45);
    ctx.fillText(bank.name + ' | ' + bank.routing + ' | Member FDIC | Equal Housing Lender', width / 2, height - 30);
    
    addWatermark(ctx, width, height);
    applyQuality(ctx, canvas, quality);
    
    const filename = 'bank_statement_' + bank.short + '_' + quality + '_' + String(index).padStart(3, '0') + '.png';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'bank_statements', filename), canvas.toBuffer('image/png'));
    
    return {
        filename: 'bank_statements/' + filename,
        documentType: 'bank_statement',
        quality,
        synthetic: true,
        expectedFields: {
            bank_name: bank.name,
            account_holder: donor.full,
            account_number_last4: acctLast4,
            statement_period_start: formatDateShort(startDate),
            statement_period_end: formatDateShort(endDate),
            charitable_transactions: charitableOrgs,
            total_charitable: totalCharitable
        }
    };
}

function main() {
    console.log('Generating IRS-compliant OCR test documents...');
    console.log('Following IRS Publication 1771 requirements\n');
    
    const subdirs = ['receipts', 'acknowledgment_letters', 'bank_statements', 'credit_card_statements', 'cancelled_checks', 'appraisals', 'form_8283', 'other'];
    for (const subdir of subdirs) fs.mkdirSync(path.join(OUTPUT_DIR, subdir), { recursive: true });
    
    const manifestEntries = [];
    
    console.log('Generating receipts (30)...');
    [...Array(12).fill('high'), ...Array(9).fill('medium'), ...Array(6).fill('low'), ...Array(3).fill('edge')].forEach((q, i) => 
        manifestEntries.push(generateReceipt(ORGANIZATIONS[i % ORGANIZATIONS.length], q, i + 1)));
    console.log('  ✓ 30 IRS-compliant receipts');
    
    console.log('Generating acknowledgment letters (20)...');
    [...Array(10).fill('high'), ...Array(6).fill('medium'), ...Array(4).fill('low')].forEach((q, i) => 
        manifestEntries.push(generateAcknowledgmentLetter(ORGANIZATIONS[i % ORGANIZATIONS.length], q, i + 1)));
    console.log('  ✓ 20 IRS-compliant acknowledgment letters');
    
    console.log('Generating bank statements (15)...');
    [...Array(8).fill('high'), ...Array(5).fill('medium'), ...Array(2).fill('low')].forEach((q, i) => 
        manifestEntries.push(generateBankStatement(BANKS[i % BANKS.length], q, i + 1)));
    console.log('  ✓ 15 bank statements with charitable transactions');
    
    const manifest = {
        version: '1.1.0',
        generatedBy: 'claude-synthetic',
        generatedAt: new Date().toISOString(),
        compliance: 'IRS Publication 1771',
        totalDocuments: manifestEntries.length,
        documentCounts: { receipts: 30, acknowledgment_letters: 20, bank_statements: 15 },
        qualityDistribution: { high: 30, medium: 20, low: 12, edge: 3 },
        documents: manifestEntries
    };
    
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    
    console.log('\n✓ Generated ' + manifestEntries.length + ' total documents');
    console.log('✓ Manifest saved to manifest.json');
}

main();
