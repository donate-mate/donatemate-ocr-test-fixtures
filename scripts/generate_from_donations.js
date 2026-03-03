#!/usr/bin/env node
/**
 * Generate OCR test documents from donations.json
 * Each form for a donation has consistent donor/donee/date/amount data
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Load font if available
const fontPath = path.join(__dirname, '..', 'fonts', 'Inter.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Inter' });
}

const DONATIONS_PATH = path.join(__dirname, '..', 'donations.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'documents');

// Load donations
const donationsData = JSON.parse(fs.readFileSync(DONATIONS_PATH, 'utf8'));

// Form generators
const generators = {
    bank_statement: generateBankStatement,
    cancelled_check: generateCancelledCheck,
    acknowledgment_letter: generateAcknowledgmentLetter,
    receipt: generateReceipt,
    form_8283_section_a: generateForm8283A,
    form_8283_section_b: generateForm8283B,
    form_1098c: generateForm1098C,
    appraisal: generateAppraisal,
    stock_confirmation: generateStockConfirmation
};

// Utility functions
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatMoney(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAddress(donor) {
    return `${donor.address}, ${donor.city}, ${donor.state} ${donor.zip}`;
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

// ===== FORM GENERATORS =====

function generateBankStatement(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 40;
    
    // Bank header
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(0, 0, width, 70);
    ctx.font = 'bold 22px Inter';
    ctx.fillStyle = 'white';
    ctx.fillText('First National Bank', 30, 45);
    
    y = 100;
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Inter';
    ctx.fillText('ACCOUNT STATEMENT', 30, y);
    
    y += 30;
    ctx.font = '11px Inter';
    ctx.fillText(`Statement Period: ${formatDateShort(donation.contributionDate)}`, 30, y);
    
    y += 25;
    ctx.fillText(`Account Holder: ${donation.donor.name}`, 30, y);
    y += 16;
    ctx.fillText(`Address: ${formatAddress(donation.donor)}`, 30, y);
    
    y += 40;
    
    // Transaction table header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(30, y, width - 60, 24);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Date', 40, y + 16);
    ctx.fillText('Description', 110, y + 16);
    ctx.fillText('Amount', 450, y + 16);
    ctx.fillText('Balance', 520, y + 16);
    y += 30;
    
    // Charitable transaction (highlighted)
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(30, y - 5, width - 60, 22);
    ctx.font = '10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(formatDateShort(donation.contributionDate), 40, y + 10);
    ctx.fillText(`CHECK - ${donation.donee.name.substring(0, 35).toUpperCase()}`, 110, y + 10);
    ctx.fillStyle = '#c62828';
    ctx.fillText(`-${formatMoney(donation.amount)}`, 450, y + 10);
    ctx.fillStyle = '#333333';
    ctx.fillText('$4,532.18', 520, y + 10);
    
    y += 80;
    
    // Charitable donations summary
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(30, y, width - 60, 80);
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(30, y, width - 60, 80);
    
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('CHARITABLE CONTRIBUTIONS THIS PERIOD', 45, y + 25);
    
    ctx.font = '10px Inter';
    ctx.fillText(`${donation.donee.name}`, 45, y + 45);
    ctx.fillText(`EIN: ${donation.donee.ein}`, 45, y + 60);
    
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#2e7d32';
    ctx.textAlign = 'right';
    ctx.fillText(formatMoney(donation.amount), width - 45, y + 52);
    ctx.textAlign = 'left';
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateCancelledCheck(donation) {
    const width = 612, height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Check background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    // Bank name
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = '#1a3a5c';
    ctx.fillText('First National Bank', 30, 40);
    ctx.font = '9px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('123 Banking Street, Anytown, USA 12345', 30, 55);
    
    // Check number
    ctx.font = '10px Inter';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'right';
    ctx.fillText('Check No. 1847', width - 30, 40);
    ctx.textAlign = 'left';
    
    // Date
    ctx.font = '10px Inter';
    ctx.fillText('Date: ' + formatDateShort(donation.contributionDate), width - 150, 60);
    
    // Pay to
    ctx.fillText('Pay to the', 30, 90);
    ctx.fillText('Order of:', 30, 103);
    ctx.font = 'bold 12px Inter';
    ctx.fillText(donation.donee.name, 100, 100);
    
    // Amount box
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(width - 130, 80, 100, 25);
    ctx.font = 'bold 14px Inter';
    ctx.fillText(formatMoney(donation.amount), width - 120, 98);
    
    // Written amount
    const amountInWords = numberToWords(donation.amount) + ' and 00/100';
    ctx.font = '11px Inter';
    ctx.fillText(amountInWords, 30, 140);
    ctx.beginPath();
    ctx.moveTo(30, 145);
    ctx.lineTo(width - 130, 145);
    ctx.stroke();
    ctx.fillText('DOLLARS', width - 120, 140);
    
    // Memo
    ctx.font = '9px Inter';
    ctx.fillText('Memo: Charitable Donation', 30, 180);
    
    // Signature line
    ctx.beginPath();
    ctx.moveTo(width - 200, 200);
    ctx.lineTo(width - 30, 200);
    ctx.stroke();
    ctx.font = 'italic 12px Inter';
    ctx.fillText(donation.donor.name, width - 180, 195);
    
    // MICR line (simulated)
    ctx.font = '11px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('⑆021000021⑆ ⑆123456789⑆ 1847', 30, 250);
    
    // Cancelled stamp
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.2);
    ctx.font = 'bold 36px Inter';
    ctx.fillStyle = 'rgba(200, 0, 0, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('CANCELLED', 0, 0);
    ctx.restore();
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateAcknowledgmentLetter(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 60;
    
    // Organization header
    ctx.font = 'bold 18px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(donation.donee.name, width / 2, y);
    y += 20;
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#444444';
    ctx.fillText(donation.donee.address, width / 2, y);
    y += 14;
    ctx.fillText(`Federal Tax ID (EIN): ${donation.donee.ein} | 501(c)(3) Tax-Exempt Organization`, width / 2, y);
    
    y += 50;
    ctx.textAlign = 'left';
    
    // Date
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(formatDate(donation.contributionDate), 50, y);
    
    y += 40;
    
    // Recipient
    ctx.fillText(donation.donor.name, 50, y);
    y += 15;
    ctx.fillText(donation.donor.address, 50, y);
    y += 15;
    ctx.fillText(`${donation.donor.city}, ${donation.donor.state} ${donation.donor.zip}`, 50, y);
    
    y += 40;
    
    // Salutation
    ctx.fillText(`Dear ${donation.donor.name.split(' ')[0]},`, 50, y);
    
    y += 30;
    
    // Body
    let bodyText;
    if (donation.assetType === 'cash') {
        bodyText = `Thank you for your generous cash contribution of ${formatMoney(donation.amount)} to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    } else if (donation.assetType === 'vehicle') {
        const v = donation.vehicle;
        bodyText = `Thank you for your generous donation of a ${v.year} ${v.make} ${v.model} (VIN: ${v.vin}) to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    } else if (donation.assetType.startsWith('stock')) {
        bodyText = `Thank you for your generous donation of securities to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    } else {
        bodyText = `Thank you for your generous donation of ${donation.assetDescription} (estimated fair market value: ${formatMoney(donation.amount)}) to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    }
    
    const lines = wrapText(ctx, bodyText, width - 100);
    for (const line of lines) {
        ctx.fillText(line, 50, y);
        y += 18;
    }
    
    y += 20;
    
    // IRS disclosure
    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('IRS REQUIRED DISCLOSURE (Per IRC Section 170(f)(8)):', 50, y);
    y += 18;
    
    ctx.font = 'italic 10px Inter';
    const disclosure = 'No goods or services were provided in exchange for this contribution. The entire amount of your donation is tax-deductible to the extent allowed by law. This letter serves as your written acknowledgment required for contributions of $250 or more.';
    const disclosureLines = wrapText(ctx, disclosure, width - 100);
    for (const line of disclosureLines) {
        ctx.fillText(line, 50, y);
        y += 16;
    }
    
    y += 40;
    
    // Signature
    ctx.fillStyle = '#333333';
    ctx.font = '11px Inter';
    ctx.fillText('With gratitude,', 50, y);
    y += 40;
    ctx.font = 'italic 12px Inter';
    ctx.fillText('Executive Director', 50, y);
    y += 15;
    ctx.font = '11px Inter';
    ctx.fillText(donation.donee.name, 50, y);
    
    // Footer
    ctx.font = '8px Inter';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(`This organization is a 501(c)(3) tax-exempt organization. Contributions are deductible under IRC Section 170.`, width / 2, height - 40);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateReceipt(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 50;
    
    // Header
    ctx.font = 'bold 20px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(donation.donee.name, width / 2, y);
    y += 20;
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#444444';
    ctx.fillText(donation.donee.address, width / 2, y);
    y += 14;
    ctx.fillText(`Federal Tax ID (EIN): ${donation.donee.ein} | 501(c)(3) Tax-Exempt Organization`, width / 2, y);
    
    y += 35;
    
    // Title
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(width - 50, y);
    ctx.stroke();
    y += 25;
    
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('OFFICIAL DONATION RECEIPT', width / 2, y);
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    y += 15;
    ctx.fillText('For Tax Purposes - Please Retain for Your Records', width / 2, y);
    
    y += 35;
    ctx.textAlign = 'left';
    
    // Receipt info box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(50, y, width - 100, 50);
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(50, y, width - 100, 50);
    
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('Receipt Number:', 60, y + 18);
    ctx.fillText('Date Issued:', 60, y + 36);
    ctx.fillText('Contribution Date:', 300, y + 18);
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(`RCP-${donation.id}-${new Date(donation.contributionDate).getFullYear()}`, 155, y + 18);
    ctx.fillText(formatDate(new Date().toISOString()), 140, y + 36);
    ctx.fillText(formatDate(donation.contributionDate), 415, y + 18);
    
    y += 70;
    
    // Donor info
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('DONOR INFORMATION', 50, y);
    y += 20;
    
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText(`Name: ${donation.donor.name}`, 50, y);
    y += 16;
    ctx.fillText(`Address: ${donation.donor.address}`, 50, y);
    y += 16;
    ctx.fillText(`         ${donation.donor.city}, ${donation.donor.state} ${donation.donor.zip}`, 50, y);
    
    y += 30;
    
    // Donation details
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('DONATION DETAILS', 50, y);
    y += 25;
    
    // Items table
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(50, y, width - 100, 25);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Description', 60, y + 17);
    ctx.fillText('Condition', 350, y + 17);
    ctx.fillText('Est. FMV', 480, y + 17);
    y += 30;
    
    ctx.font = '10px Inter';
    const descLines = wrapText(ctx, donation.assetDescription, 280);
    ctx.fillText(descLines[0], 60, y + 12);
    ctx.fillText(donation.assetCondition || 'Good', 350, y + 12);
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(formatMoney(donation.amount), 480, y + 12);
    
    y += 50;
    
    // IRS disclosure
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(50, y, width - 100, 80);
    ctx.strokeStyle = '#ffb300';
    ctx.strokeRect(50, y, width - 100, 80);
    
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#8b4513';
    ctx.fillText('IRS REQUIRED DISCLOSURE (Per IRC Section 170(f)(8)):', 60, y + 18);
    
    ctx.font = 'italic 9px Inter';
    ctx.fillStyle = '#333333';
    const disclosure = 'No goods or services were provided in exchange for this contribution. This receipt serves as written acknowledgment required for contributions of $250 or more.';
    const lines = wrapText(ctx, disclosure, width - 130);
    let dy = y + 35;
    for (const line of lines) {
        ctx.fillText(line, 60, dy);
        dy += 14;
    }
    
    y += 100;
    
    // Signature
    ctx.font = '10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Authorized Representative:', 50, y);
    y += 30;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(250, y);
    ctx.stroke();
    ctx.fillText('Signature', 50, y + 15);
    
    ctx.beginPath();
    ctx.moveTo(300, y);
    ctx.lineTo(450, y);
    ctx.stroke();
    ctx.fillText('Date', 300, y + 15);
    
    // Footer
    ctx.font = '8px Inter';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(`Thank you for your generous support of ${donation.donee.name}.`, width / 2, height - 55);
    ctx.fillText(`This organization is a 501(c)(3) tax-exempt organization. Contributions are deductible under IRC Section 170.`, width / 2, height - 40);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateForm8283A(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 30;
    
    // Form header
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', 30, y);
    ctx.font = '9px Inter';
    ctx.fillText('(Rev. December 2023)', 30, y + 12);
    ctx.fillText('Department of the Treasury', 30, y + 24);
    ctx.fillText('Internal Revenue Service', 30, y + 36);
    
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 15);
    ctx.font = '10px Inter';
    ctx.fillText('Attach to your tax return if you claimed a total deduction', width / 2, y + 30);
    ctx.fillText('of over $500 for all contributed property.', width / 2, y + 42);
    
    ctx.textAlign = 'right';
    ctx.font = '9px Inter';
    ctx.fillText('OMB No. 1545-0908', width - 30, y);
    ctx.fillText('Attachment', width - 30, y + 15);
    ctx.fillText('Sequence No. 155', width - 30, y + 27);
    
    y += 60;
    ctx.textAlign = 'left';
    
    // Taxpayer info box
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, y, width - 200, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Name(s) shown on your income tax return', 35, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText(donation.donor.name, 35, y + 30);
    
    ctx.strokeRect(width - 165, y, 135, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Identifying number', width - 160, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), width - 160, y + 30);
    
    y += 55;
    
    // Section A header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(30, y, width - 60, 25);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Section A. Donated Property of $5,000 or Less and Publicly Traded Securities', 35, y + 17);
    
    y += 30;
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part I    Information on Donated Property', 30, y);
    
    y += 20;
    
    // Column headers
    ctx.strokeRect(30, y, width - 60, 25);
    ctx.font = '7px Inter';
    const headers = [
        { text: '(a) Name and address of donee organization', x: 35, w: 150 },
        { text: '(b) Description of donated property', x: 190, w: 120 },
        { text: '(c) Date of contribution', x: 315, w: 55 },
        { text: '(d) Date acquired', x: 375, w: 50 },
        { text: '(e) How acquired', x: 430, w: 45 },
        { text: '(f) Donor\'s cost or basis', x: 480, w: 45 },
        { text: '(g) Fair market value', x: 530, w: 50 }
    ];
    
    for (const h of headers) {
        ctx.fillText(h.text.substring(0, 20), h.x, y + 10);
        if (h.text.length > 20) ctx.fillText(h.text.substring(20), h.x, y + 18);
    }
    
    y += 30;
    
    // Data row
    ctx.strokeRect(30, y, width - 60, 45);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donee.name.substring(0, 25), 35, y + 15);
    ctx.font = '7px Inter';
    ctx.fillText(donation.donee.address.substring(0, 30), 35, y + 28);
    
    ctx.font = '9px Inter';
    const descLines = wrapText(ctx, donation.assetDescription, 115);
    ctx.fillText(descLines[0].substring(0, 20), 190, y + 15);
    if (descLines[0].length > 20 || descLines[1]) {
        ctx.fillText((descLines[0].substring(20) + ' ' + (descLines[1] || '')).substring(0, 20), 190, y + 28);
    }
    
    ctx.fillText(formatDateShort(donation.contributionDate), 315, y + 20);
    ctx.fillText(donation.dateAcquired ? formatDateShort(donation.dateAcquired) : 'Various', 375, y + 20);
    ctx.fillText(donation.howAcquired || 'Purchase', 430, y + 20);
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'N/A', 480, y + 20);
    ctx.font = 'bold 9px Inter';
    ctx.fillText(formatMoney(donation.amount), 530, y + 20);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateForm8283B(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 30;
    
    // Form header (same as 8283A)
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', 30, y);
    ctx.font = '9px Inter';
    ctx.fillText('(Rev. December 2023)', 30, y + 12);
    
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 15);
    ctx.font = '10px Inter';
    ctx.fillText('Attach to your tax return if you claimed a total deduction', width / 2, y + 30);
    ctx.fillText('of over $500 for all contributed property.', width / 2, y + 42);
    
    ctx.textAlign = 'right';
    ctx.font = '9px Inter';
    ctx.fillText('OMB No. 1545-0908', width - 30, y);
    
    y += 60;
    ctx.textAlign = 'left';
    
    // Taxpayer info
    ctx.strokeRect(30, y, width - 200, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Name(s) shown on your income tax return', 35, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText(donation.donor.name, 35, y + 30);
    
    ctx.strokeRect(width - 165, y, 135, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Identifying number', width - 160, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), width - 160, y + 30);
    
    y += 55;
    
    // Section B header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(30, y, width - 60, 25);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Section B. Donated Property Over $5,000 (Except Publicly Traded Securities)', 35, y + 17);
    
    y += 35;
    
    // Part I - Information on Donated Property
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part I    Information on Donated Property', 30, y);
    y += 20;
    
    ctx.font = '9px Inter';
    ctx.fillText('1  Description of donated property:', 30, y);
    y += 15;
    ctx.fillText(`   ${donation.assetDescription}`, 30, y);
    
    y += 25;
    ctx.fillText(`2  Donee organization: ${donation.donee.name}`, 30, y);
    y += 15;
    ctx.fillText(`   Address: ${donation.donee.address}`, 30, y);
    y += 15;
    ctx.fillText(`   EIN: ${donation.donee.ein}`, 30, y);
    
    y += 25;
    ctx.fillText(`3  Date of contribution: ${formatDate(donation.contributionDate)}`, 30, y);
    y += 15;
    ctx.fillText(`4  Date acquired by donor: ${donation.dateAcquired ? formatDate(donation.dateAcquired) : 'Various'}`, 30, y);
    y += 15;
    ctx.fillText(`5  How acquired: ${donation.howAcquired || 'Purchase'}`, 30, y);
    y += 15;
    ctx.fillText(`6  Donor's cost or adjusted basis: ${donation.costBasis ? formatMoney(donation.costBasis) : 'See attached'}`, 30, y);
    y += 15;
    ctx.font = 'bold 10px Inter';
    ctx.fillText(`7  Fair market value: ${formatMoney(donation.amount)}`, 30, y);
    ctx.font = '9px Inter';
    y += 15;
    ctx.fillText(`8  Method used to determine FMV: ${donation.appraisal?.valuationMethod || 'Qualified Appraisal'}`, 30, y);
    
    y += 30;
    
    // Part II - Taxpayer Statement
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part II   Taxpayer (Donor) Statement', 30, y);
    y += 15;
    ctx.font = '8px Inter';
    ctx.fillText('I declare that the following information is true, correct, and complete to the best of my knowledge.', 30, y);
    
    y += 30;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(250, y);
    ctx.stroke();
    ctx.fillText('Donor signature', 30, y + 12);
    
    ctx.beginPath();
    ctx.moveTo(300, y);
    ctx.lineTo(400, y);
    ctx.stroke();
    ctx.fillText('Date', 300, y + 12);
    
    y += 40;
    
    // Part III - Declaration of Appraiser
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part III  Declaration of Appraiser', 30, y);
    y += 15;
    ctx.font = '8px Inter';
    if (donation.appraisal) {
        ctx.fillText(`Appraiser: ${donation.appraisal.appraiserName}`, 30, y);
        y += 12;
        ctx.fillText(`Address: ${donation.appraisal.appraiserAddress}`, 30, y);
        y += 12;
        ctx.fillText(`Qualifications: ${donation.appraisal.appraiserQualifications.substring(0, 70)}`, 30, y);
    }
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateForm1098C(donation) {
    const width = 612, height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 30;
    
    // Form header
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 1098-C', 30, y);
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. January 2024)', 30, y + 12);
    
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Contributions of Motor Vehicles, Boats, and Airplanes', width / 2, y + 10);
    
    ctx.textAlign = 'right';
    ctx.font = '8px Inter';
    ctx.fillText('OMB No. 1545-1959', width - 30, y);
    ctx.fillText(`Copy B - For Donor`, width - 30, y + 12);
    
    y += 45;
    ctx.textAlign = 'left';
    
    // Two-column layout
    const col1 = 30, col2 = 320;
    
    // Donee info (left)
    ctx.strokeRect(col1, y, 280, 70);
    ctx.font = '7px Inter';
    ctx.fillText("DONEE'S name, street address, city, state, ZIP code, and telephone no.", col1 + 5, y + 10);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donee.name, col1 + 5, y + 25);
    ctx.fillText(donation.donee.address, col1 + 5, y + 38);
    ctx.font = '8px Inter';
    ctx.fillText(`EIN: ${donation.donee.ein}`, col1 + 5, y + 55);
    
    // Donor info (right)
    ctx.strokeRect(col2, y, 260, 70);
    ctx.font = '7px Inter';
    ctx.fillText("DONOR'S name, street address, city, state, and ZIP code", col2 + 5, y + 10);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donor.name, col2 + 5, y + 25);
    ctx.fillText(formatAddress(donation.donor), col2 + 5, y + 38);
    
    y += 85;
    
    // Vehicle info
    const v = donation.vehicle;
    ctx.strokeRect(col1, y, 550, 80);
    ctx.font = '7px Inter';
    ctx.fillText('Vehicle description:', col1 + 5, y + 12);
    
    ctx.font = '10px Inter';
    ctx.fillText(`Year: ${v.year}`, col1 + 10, y + 30);
    ctx.fillText(`Make: ${v.make}`, col1 + 100, y + 30);
    ctx.fillText(`Model: ${v.model}`, col1 + 220, y + 30);
    
    ctx.fillText(`VIN: ${v.vin}`, col1 + 10, y + 48);
    ctx.fillText(`Odometer: ${v.mileage.toLocaleString()} miles`, col1 + 250, y + 48);
    
    ctx.font = '9px Inter';
    ctx.fillText(`Date of contribution: ${formatDate(donation.contributionDate)}`, col1 + 10, y + 68);
    
    y += 95;
    
    // Sale info / Certifications
    ctx.strokeRect(col1, y, 550, 70);
    
    if (donation.saleInfo?.soldAtAuction) {
        ctx.font = '9px Inter';
        ctx.fillText('☑ Vehicle was sold at arm\'s length to unrelated party', col1 + 10, y + 18);
        ctx.font = 'bold 11px Inter';
        ctx.fillText(`Gross proceeds from sale: ${formatMoney(donation.saleInfo.grossProceeds)}`, col1 + 10, y + 38);
        ctx.font = '9px Inter';
        ctx.fillText(`Date of sale: ${formatDate(donation.saleInfo.saleDate)}`, col1 + 10, y + 55);
    } else if (donation.saleInfo?.transferredToNeedy) {
        ctx.font = '9px Inter';
        ctx.fillText('☑ Vehicle was transferred to needy individual for significantly below FMV', col1 + 10, y + 18);
        ctx.font = 'bold 11px Inter';
        ctx.fillText(`Claimed value: ${formatMoney(donation.amount)}`, col1 + 10, y + 38);
    } else {
        ctx.font = '9px Inter';
        ctx.fillText('☑ Vehicle will be used or materially improved by organization', col1 + 10, y + 18);
        ctx.font = 'bold 11px Inter';
        ctx.fillText(`Claimed value: ${formatMoney(donation.amount)}`, col1 + 10, y + 38);
    }
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateAppraisal(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    if (!donation.appraisal) {
        ctx.fillText('No appraisal data', 50, 50);
        return canvas.toBuffer('image/png');
    }
    
    const appr = donation.appraisal;
    let y = 50;
    
    // Header
    ctx.font = 'bold 18px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText('QUALIFIED APPRAISAL', width / 2, y);
    ctx.font = '10px Inter';
    ctx.fillStyle = '#666666';
    y += 18;
    ctx.fillText('For Charitable Contribution Purposes', width / 2, y);
    ctx.fillText('Per IRS Reg. §1.170A-17', width / 2, y + 14);
    
    y += 50;
    ctx.textAlign = 'left';
    
    // Appraisal info box
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(50, y, width - 100, 100);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('APPRAISAL DETAILS', 60, y + 18);
    
    ctx.font = '10px Inter';
    ctx.fillText(`Date of Appraisal: ${formatDate(appr.appraisalDate)}`, 60, y + 38);
    ctx.fillText(`Date of Contribution: ${formatDate(donation.contributionDate)}`, 60, y + 54);
    ctx.fillText(`Valuation Method: ${appr.valuationMethod}`, 60, y + 70);
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(`Appraised Fair Market Value: ${formatMoney(donation.amount)}`, 60, y + 90);
    
    y += 120;
    
    // Property description
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('PROPERTY DESCRIPTION', 50, y);
    y += 20;
    
    ctx.font = '10px Inter';
    if (donation.assetType === 'real_estate' && donation.property) {
        ctx.fillText(`Property: ${donation.property.description}`, 50, y);
        y += 16;
        ctx.fillText(`Address: ${donation.property.address}`, 50, y);
        y += 16;
        ctx.fillText(`Legal Description: ${donation.property.legalDescription}`, 50, y);
        y += 16;
        ctx.fillText(`Parcel Number: ${donation.property.parcelNumber}`, 50, y);
    } else if (donation.security) {
        ctx.fillText(`Security: ${donation.security.name}`, 50, y);
        y += 16;
        ctx.fillText(`Shares: ${donation.security.shares}`, 50, y);
        y += 16;
        ctx.fillText(`Description: ${donation.security.companyDescription || 'Closely-held securities'}`, 50, y);
    } else {
        ctx.fillText(`Item: ${donation.assetDescription}`, 50, y);
        y += 16;
        ctx.fillText(`Condition: ${donation.assetCondition || 'Good'}`, 50, y);
    }
    
    y += 35;
    
    // Donor info
    ctx.font = 'bold 11px Inter';
    ctx.fillText('DONOR INFORMATION', 50, y);
    y += 20;
    ctx.font = '10px Inter';
    ctx.fillText(`Name: ${donation.donor.name}`, 50, y);
    y += 16;
    ctx.fillText(`Address: ${formatAddress(donation.donor)}`, 50, y);
    
    y += 35;
    
    // Donee info
    ctx.font = 'bold 11px Inter';
    ctx.fillText('DONEE ORGANIZATION', 50, y);
    y += 20;
    ctx.font = '10px Inter';
    ctx.fillText(`Name: ${donation.donee.name}`, 50, y);
    y += 16;
    ctx.fillText(`EIN: ${donation.donee.ein}`, 50, y);
    y += 16;
    ctx.fillText(`Address: ${donation.donee.address}`, 50, y);
    
    y += 40;
    
    // Appraiser declaration
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(50, y, width - 100, 130);
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(50, y, width - 100, 130);
    
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('APPRAISER DECLARATION', 60, y + 20);
    
    ctx.font = '9px Inter';
    const declaration = 'I declare that I am not the donor, the donee, or an employee of either. I hold myself out to the public as an appraiser and perform appraisals on a regular basis. I am qualified to appraise the type of property being valued. I understand that a substantial or gross valuation misstatement may result in penalties.';
    const lines = wrapText(ctx, declaration, width - 140);
    let dy = y + 40;
    for (const line of lines) {
        ctx.fillText(line, 60, dy);
        dy += 14;
    }
    
    ctx.font = '10px Inter';
    ctx.fillText(`Appraiser: ${appr.appraiserName}`, 60, y + 95);
    ctx.fillText(`Qualifications: ${appr.appraiserQualifications.substring(0, 60)}`, 60, y + 110);
    ctx.fillText(`Address: ${appr.appraiserAddress}`, 60, y + 125);
    
    y += 150;
    
    // Signature
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(300, y);
    ctx.stroke();
    ctx.font = '9px Inter';
    ctx.fillText('Appraiser Signature', 50, y + 15);
    
    ctx.beginPath();
    ctx.moveTo(350, y);
    ctx.lineTo(500, y);
    ctx.stroke();
    ctx.fillText('Date', 350, y + 15);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

function generateStockConfirmation(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const sec = donation.security;
    let y = 30;
    
    // Broker header
    ctx.fillStyle = '#1a3a6e';
    ctx.fillRect(0, 0, width, 60);
    ctx.font = 'bold 20px Inter';
    ctx.fillStyle = 'white';
    ctx.fillText(sec.broker, 30, 40);
    
    y = 85;
    ctx.fillStyle = '#666666';
    ctx.font = '9px Inter';
    ctx.fillText('211 Main Street, San Francisco, CA 94105', 30, y);
    
    y += 30;
    
    // Title
    ctx.fillStyle = '#1a3a6e';
    ctx.font = 'bold 16px Inter';
    ctx.fillText('CHARITABLE STOCK TRANSFER CONFIRMATION', 30, y);
    
    y += 35;
    
    // Confirmation details box
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(30, y, width - 60, 70);
    ctx.strokeStyle = '#dee2e6';
    ctx.strokeRect(30, y, width - 60, 70);
    
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Confirmation Number:', 45, y + 20);
    ctx.fillText('Transfer Date:', 45, y + 40);
    ctx.fillText('Account Type:', 320, y + 20);
    ctx.fillText('Transaction Type:', 320, y + 40);
    
    ctx.font = '10px Inter';
    ctx.fillText(`SCH-${new Date(donation.contributionDate).getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`, 170, y + 20);
    ctx.fillText(formatDate(donation.contributionDate), 130, y + 40);
    ctx.fillText('Individual Brokerage', 420, y + 20);
    ctx.fillText('DTC Transfer to Charity', 430, y + 40);
    
    y += 90;
    
    // Donor info
    ctx.fillStyle = '#1a3a6e';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('DONOR INFORMATION', 30, y);
    y += 20;
    
    ctx.fillStyle = '#333333';
    ctx.font = '10px Inter';
    ctx.fillText(`Name: ${donation.donor.name}`, 45, y);
    y += 16;
    ctx.fillText(`Address: ${formatAddress(donation.donor)}`, 45, y);
    y += 16;
    ctx.fillText('Tax ID: XXX-XX-' + Math.floor(1000 + Math.random() * 9000), 45, y);
    
    y += 35;
    
    // Charitable recipient
    ctx.fillStyle = '#1a3a6e';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('CHARITABLE RECIPIENT', 30, y);
    y += 20;
    
    ctx.fillStyle = '#333333';
    ctx.font = '10px Inter';
    ctx.fillText(`Organization: ${donation.donee.name}`, 45, y);
    y += 16;
    ctx.fillText(`EIN: ${donation.donee.ein}`, 45, y);
    
    y += 35;
    
    // Securities table
    ctx.fillStyle = '#1a3a6e';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('SECURITIES TRANSFERRED', 30, y);
    y += 20;
    
    // Table header
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(30, y, width - 60, 25);
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Symbol', 45, y + 17);
    ctx.fillText('Security Name', 120, y + 17);
    ctx.fillText('Shares', 350, y + 17);
    ctx.fillText('Price/Share', 420, y + 17);
    ctx.fillText('Total Value', 510, y + 17);
    y += 30;
    
    // Table row
    ctx.strokeStyle = '#dee2e6';
    ctx.strokeRect(30, y - 5, width - 60, 30);
    ctx.font = '10px Inter';
    ctx.fillText(sec.ticker, 45, y + 12);
    ctx.fillText(sec.name, 120, y + 12);
    ctx.fillText(sec.shares.toString(), 350, y + 12);
    ctx.fillText(formatMoney(sec.pricePerShare), 420, y + 12);
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(formatMoney(donation.amount), 510, y + 12);
    
    y += 45;
    
    // Total box
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(350, y, width - 380, 35);
    ctx.strokeStyle = '#4caf50';
    ctx.strokeRect(350, y, width - 380, 35);
    ctx.font = 'bold 11px Inter';
    ctx.fillStyle = '#1b5e20';
    ctx.fillText('TOTAL FAIR MARKET VALUE:', 360, y + 15);
    ctx.fillText(formatMoney(donation.amount), 510, y + 15);
    
    y += 55;
    
    // IRS notice
    ctx.fillStyle = '#fff3e0';
    ctx.fillRect(30, y, width - 60, 60);
    ctx.strokeStyle = '#ff9800';
    ctx.strokeRect(30, y, width - 60, 60);
    
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#e65100';
    ctx.fillText('IRS Notice:', 45, y + 18);
    ctx.font = '8px Inter';
    ctx.fillStyle = '#333333';
    const notice = 'For publicly traded securities held more than one year, the charitable deduction equals the fair market value on the date of transfer. No qualified appraisal is required for publicly traded securities per IRC §170(f)(11)(A)(ii). Consult your tax advisor regarding deductibility.';
    const lines = wrapText(ctx, notice, width - 100);
    let dy = y + 32;
    for (const line of lines) {
        ctx.fillText(line, 45, dy);
        dy += 12;
    }
    
    y += 80;
    
    // Transfer details
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('TRANSFER DETAILS', 30, y);
    y += 18;
    ctx.font = '9px Inter';
    ctx.fillText('Transfer Method: DTC (Depository Trust Company)', 45, y);
    y += 14;
    ctx.fillText(`Settlement Date: ${formatDate(donation.contributionDate)}`, 45, y);
    y += 14;
    ctx.fillText('Cost Basis Method: First In, First Out (FIFO)', 45, y);
    
    // Footer
    ctx.font = '8px Inter';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('This confirmation serves as documentation of your charitable securities transfer. Please retain for your tax records.', width / 2, height - 50);
    ctx.fillText(`${sec.broker} | Member SIPC | Securities offered through ${sec.broker}`, width / 2, height - 35);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// Helper: number to words (simplified)
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    const n = Math.floor(num);
    if (n === 0) return 'Zero';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
    if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
    return 'Large Amount';
}

// ===== MAIN GENERATION =====

async function main() {
    console.log('Generating OCR test documents from donations.json...\n');
    
    // Create output directories
    const formDirs = [
        'acknowledgment_letter', 'appraisal', 'bank_statement', 'cancelled_check',
        'form_1098c', 'form_8283_section_a', 'form_8283_section_b', 
        'receipt', 'stock_confirmation'
    ];
    
    for (const dir of formDirs) {
        const dirPath = path.join(OUTPUT_DIR, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    // Generate manifest
    const manifest = {
        version: '2.0.0',
        description: 'IRS-compliant OCR test fixtures with linked forms per donation',
        generatedAt: new Date().toISOString(),
        irsReference: 'IRS Publication 526 (2025)',
        namingConvention: '<form_type>_<donation_id>.png',
        totalDonations: donationsData.donations.length,
        totalForms: 0,
        formCounts: {},
        documents: []
    };
    
    // Process each donation
    for (const donation of donationsData.donations) {
        console.log(`Processing ${donation.id}: ${donation.description}`);
        
        for (const formType of donation.forms) {
            const generator = generators[formType];
            if (!generator) {
                console.warn(`  Warning: No generator for form type '${formType}'`);
                continue;
            }
            
            const filename = `${formType}_${donation.id}.png`;
            const filepath = path.join(OUTPUT_DIR, formType, filename);
            
            try {
                const buffer = generator(donation);
                fs.writeFileSync(filepath, buffer);
                console.log(`  ✓ Generated ${formType}/${filename}`);
                
                // Add to manifest
                manifest.documents.push({
                    filename: `${formType}/${filename}`,
                    formType: formType,
                    donationId: donation.id,
                    boundary: donation.boundary || false,
                    expectedFields: {
                        donor_name: donation.donor.name,
                        donor_address: formatAddress(donation.donor),
                        donee_name: donation.donee.name,
                        donee_ein: donation.donee.ein,
                        contribution_date: donation.contributionDate,
                        amount: donation.amount,
                        asset_type: donation.assetType,
                        asset_description: donation.assetDescription || null
                    }
                });
                
                manifest.formCounts[formType] = (manifest.formCounts[formType] || 0) + 1;
                manifest.totalForms++;
            } catch (err) {
                console.error(`  ✗ Error generating ${formType}: ${err.message}`);
            }
        }
    }
    
    // Write manifest
    const manifestPath = path.join(__dirname, '..', 'manifest_v2.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✓ Generated manifest_v2.json`);
    
    console.log(`\nSummary:`);
    console.log(`  Donations: ${manifest.totalDonations}`);
    console.log(`  Forms: ${manifest.totalForms}`);
    console.log(`  Form types:`, manifest.formCounts);
}

main().catch(console.error);
