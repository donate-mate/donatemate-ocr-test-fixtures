#!/usr/bin/env node
/**
 * Fixed Form 8283 generators with proper spacing
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '..', 'fonts', 'Inter.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Inter' });
}

const DONATIONS_PATH = path.join(__dirname, '..', 'donations.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'documents');

const donationsData = JSON.parse(fs.readFileSync(DONATIONS_PATH, 'utf8'));

// Utilities
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

function drawCheckbox(ctx, x, y, checked, label) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, 8, 8);
    if (checked) {
        ctx.font = 'bold 8px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText('✓', x + 1, y + 7);
    }
    if (label) {
        ctx.font = '7px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 12, y + 7);
    }
}

// ===== FORM 8283 SECTION A - FIXED =====
function generateForm8283A(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const margin = 30;
    let y = 28;
    
    // === HEADER ===
    // Left column - Form info (constrained width)
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', margin, y);
    
    ctx.font = '7px Inter';
    ctx.fillText('(Rev. December 2023)', margin, y + 12);
    ctx.fillText('Department of the Treasury', margin, y + 21);
    ctx.fillText('Internal Revenue Service', margin, y + 30);
    
    // Center column - Title (positioned to avoid overlap)
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 2);
    
    ctx.font = '7px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction', width / 2, y + 14);
    ctx.fillText('of over $500 for all contributed property.', width / 2, y + 24);
    
    // Right column - OMB info
    ctx.textAlign = 'right';
    ctx.font = '7px Inter';
    ctx.fillText('OMB No. 1545-0908', width - margin, y);
    ctx.fillText('Attachment', width - margin, y + 14);
    ctx.fillText('Sequence No. 155', width - margin, y + 24);
    
    y += 48;
    ctx.textAlign = 'left';
    
    // === NAME BOX ===
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, y, 380, 32);
    ctx.font = '6px Inter';
    ctx.fillText('Name(s) shown on your income tax return', margin + 3, y + 8);
    ctx.font = '10px Inter';
    ctx.fillText(donation.donor.name, margin + 3, y + 24);
    
    ctx.strokeRect(margin + 385, y, 167, 32);
    ctx.font = '6px Inter';
    ctx.fillText('Identifying number', margin + 388, y + 8);
    ctx.font = '10px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), margin + 388, y + 24);
    
    y += 48;
    
    // === SECTION A HEADER ===
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(margin, y, width - 2 * margin, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Section A. Donated Property of $5,000 or Less and Publicly Traded Securities', margin + 5, y + 12);
    
    y += 26;
    
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part I    Information on Donated Property—If you need more space, attach a statement.', margin, y);
    
    y += 16;
    
    // === TABLE STRUCTURE ===
    // Define columns with proper widths
    const tableLeft = margin;
    const tableWidth = width - 2 * margin;
    const rowHeight = 45;
    const headerHeight = 55;
    
    // Column definitions: x position and width
    const cols = [
        { x: 0, w: 25 },      // Row number
        { x: 25, w: 130 },    // (a) Name/address
        { x: 155, w: 85 },    // (b) Vehicle checkbox
        { x: 240, w: 95 },    // (c) Description
        { x: 335, w: 55 },    // (d) Date contributed
        { x: 390, w: 55 },    // (e) Date acquired
        { x: 445, w: 55 },    // (f) How acquired
        { x: 500, w: 52 },    // (g) Cost/basis
    ];
    
    // Draw header row
    ctx.strokeRect(tableLeft, y, tableWidth, headerHeight);
    
    // Draw column lines
    for (let i = 1; i < cols.length; i++) {
        ctx.beginPath();
        ctx.moveTo(tableLeft + cols[i].x, y);
        ctx.lineTo(tableLeft + cols[i].x, y + headerHeight);
        ctx.stroke();
    }
    
    // Header text
    ctx.font = '6px Inter';
    
    // Column 1 - row number
    ctx.fillText('1', tableLeft + 10, y + 30);
    
    // Column (a)
    ctx.fillText('(a) Name and address of the', tableLeft + cols[1].x + 3, y + 15);
    ctx.fillText('donee organization', tableLeft + cols[1].x + 3, y + 23);
    
    // Column (b)
    ctx.fillText('(b) If donated property', tableLeft + cols[2].x + 3, y + 10);
    ctx.fillText('is a vehicle (see', tableLeft + cols[2].x + 3, y + 18);
    ctx.fillText('instructions), check', tableLeft + cols[2].x + 3, y + 26);
    ctx.fillText('box and enter vehicle', tableLeft + cols[2].x + 3, y + 34);
    ctx.fillText('identification number', tableLeft + cols[2].x + 3, y + 42);
    
    // Column (c)
    ctx.fillText('(c) Description and', tableLeft + cols[3].x + 3, y + 15);
    ctx.fillText('condition of donated', tableLeft + cols[3].x + 3, y + 23);
    ctx.fillText('property', tableLeft + cols[3].x + 3, y + 31);
    
    // Column (d)
    ctx.fillText('(d) Date of the', tableLeft + cols[4].x + 3, y + 18);
    ctx.fillText('contribution', tableLeft + cols[4].x + 3, y + 26);
    
    // Column (e)
    ctx.fillText('(e) Date', tableLeft + cols[5].x + 3, y + 15);
    ctx.fillText('acquired by', tableLeft + cols[5].x + 3, y + 23);
    ctx.fillText('donor', tableLeft + cols[5].x + 3, y + 31);
    
    // Column (f)
    ctx.fillText('(f) How', tableLeft + cols[6].x + 3, y + 15);
    ctx.fillText('acquired', tableLeft + cols[6].x + 3, y + 23);
    ctx.fillText('by donor', tableLeft + cols[6].x + 3, y + 31);
    
    // Column (g)
    ctx.fillText('(g) Donor\'s', tableLeft + cols[7].x + 3, y + 15);
    ctx.fillText('cost or', tableLeft + cols[7].x + 3, y + 23);
    ctx.fillText('adjusted basis', tableLeft + cols[7].x + 3, y + 31);
    
    y += headerHeight;
    
    // === DATA ROW ===
    ctx.strokeRect(tableLeft, y, tableWidth, rowHeight);
    
    // Draw column lines
    for (let i = 1; i < cols.length; i++) {
        ctx.beginPath();
        ctx.moveTo(tableLeft + cols[i].x, y);
        ctx.lineTo(tableLeft + cols[i].x, y + rowHeight);
        ctx.stroke();
    }
    
    // Fill in data
    ctx.font = '8px Inter';
    
    // Row letter
    ctx.fillText('A', tableLeft + 10, y + 25);
    
    // (a) Donee info
    ctx.font = '7px Inter';
    const doneeName = donation.donee.name;
    ctx.fillText(doneeName.substring(0, 20), tableLeft + cols[1].x + 3, y + 12);
    if (doneeName.length > 20) {
        ctx.fillText(doneeName.substring(20, 40), tableLeft + cols[1].x + 3, y + 20);
    }
    const addrParts = donation.donee.address.split(',');
    ctx.fillText((addrParts[0] || '').substring(0, 22), tableLeft + cols[1].x + 3, y + 30);
    ctx.font = '6px Inter';
    ctx.fillText('EIN: ' + donation.donee.ein, tableLeft + cols[1].x + 3, y + 40);
    
    // (b) Vehicle checkbox (not checked for non-vehicles)
    drawCheckbox(ctx, tableLeft + cols[2].x + 35, y + 15, false, '');
    
    // (c) Description
    ctx.font = '7px Inter';
    const desc = donation.assetDescription || '';
    ctx.fillText(desc.substring(0, 14), tableLeft + cols[3].x + 3, y + 15);
    if (desc.length > 14) ctx.fillText(desc.substring(14, 28), tableLeft + cols[3].x + 3, y + 24);
    ctx.fillText(donation.assetCondition || 'Good', tableLeft + cols[3].x + 3, y + 36);
    
    // (d) Date contributed
    ctx.fillText(formatDateShort(donation.contributionDate), tableLeft + cols[4].x + 3, y + 25);
    
    // (e) Date acquired
    const dateAcq = donation.dateAcquired ? formatDateShort(donation.dateAcquired).substring(0, 8) : 'Various';
    ctx.fillText(dateAcq, tableLeft + cols[5].x + 3, y + 25);
    
    // (f) How acquired
    ctx.fillText((donation.howAcquired || 'Purchase').substring(0, 8), tableLeft + cols[6].x + 3, y + 25);
    
    // (g) Cost basis
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'N/A', tableLeft + cols[7].x + 3, y + 25);
    
    y += rowHeight + 5;
    
    // === SECOND TABLE (h) and (i) ===
    const row2Height = 35;
    ctx.strokeRect(tableLeft, y, tableWidth, row2Height);
    
    // Divider at column 200
    ctx.beginPath();
    ctx.moveTo(tableLeft + 200, y);
    ctx.lineTo(tableLeft + 200, y + row2Height);
    ctx.moveTo(tableLeft + 350, y);
    ctx.lineTo(tableLeft + 350, y + row2Height);
    ctx.stroke();
    
    ctx.font = '6px Inter';
    ctx.fillText('Note: If the amount you claimed as a deduction for an item is $500 or', tableLeft + 5, y + 12);
    ctx.fillText('less, you do not have to complete columns (e), (f), and (g).', tableLeft + 5, y + 20);
    
    ctx.fillText('(h) Fair market value', tableLeft + 205, y + 12);
    ctx.fillText('(see instructions)', tableLeft + 205, y + 20);
    
    ctx.fillText('(i) Method used to determine the', tableLeft + 355, y + 12);
    ctx.fillText('fair market value', tableLeft + 355, y + 20);
    
    y += row2Height;
    
    // Data row for (h) and (i)
    ctx.strokeRect(tableLeft, y, tableWidth, 22);
    ctx.beginPath();
    ctx.moveTo(tableLeft + 200, y);
    ctx.lineTo(tableLeft + 200, y + 22);
    ctx.moveTo(tableLeft + 350, y);
    ctx.lineTo(tableLeft + 350, y + 22);
    ctx.stroke();
    
    ctx.font = '8px Inter';
    ctx.fillText('A', tableLeft + 10, y + 15);
    ctx.font = 'bold 9px Inter';
    ctx.fillText(formatMoney(donation.amount), tableLeft + 210, y + 15);
    ctx.font = '8px Inter';
    ctx.fillText('Comparable Sales', tableLeft + 360, y + 15);
    
    y += 36;
    
    // === PART II ===
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part II   Partial Interests and Restricted Use Property—Complete lines 2a through 2e if you gave less than an', margin, y);
    y += 11;
    ctx.fillText('          entire interest in a property listed in Part I. Complete lines 3a through 3c if conditions were placed on a', margin, y);
    y += 11;
    ctx.fillText('          contribution listed in Part I; also attach the required statement (see instructions).', margin, y);
    
    y += 18;
    ctx.font = '7px Inter';
    ctx.fillText('2a  Enter the letter from Part I that identifies the property for which you gave less than an entire interest ▶', margin, y);
    ctx.fillText('N/A', 480, y);
    
    y += 30;
    
    // === DONOR ACKNOWLEDGMENT ===
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(margin, y, tableWidth, 55);
    ctx.strokeRect(margin, y, tableWidth, 55);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Donor Acknowledgment', margin + 5, y + 14);
    
    ctx.font = '7px Inter';
    ctx.fillText('I acknowledge that I received no goods or services in exchange for this contribution, except as described above.', margin + 5, y + 28);
    
    ctx.fillText('Signature ▶', margin + 5, y + 45);
    ctx.beginPath();
    ctx.moveTo(margin + 60, y + 47);
    ctx.lineTo(margin + 280, y + 47);
    ctx.stroke();
    
    ctx.fillText('Date ▶', margin + 300, y + 45);
    ctx.beginPath();
    ctx.moveTo(margin + 330, y + 47);
    ctx.lineTo(margin + 500, y + 47);
    ctx.stroke();
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// ===== FORM 8283 SECTION B - FIXED =====
function generateForm8283B(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const margin = 30;
    let y = 25;
    
    // === HEADER ===
    // Left column - Form info
    ctx.font = 'bold 13px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', margin, y);
    
    ctx.font = '7px Inter';
    ctx.fillText('(Rev. December 2023)', margin, y + 11);
    ctx.fillText('Department of the Treasury', margin, y + 20);
    ctx.fillText('Internal Revenue Service', margin, y + 29);
    
    // Center column - Title
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 2);
    ctx.font = '7px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction of over $500.', width / 2, y + 14);
    
    // Right column - OMB info
    ctx.textAlign = 'right';
    ctx.font = '7px Inter';
    ctx.fillText('OMB No. 1545-0908', width - margin, y);
    ctx.fillText('Attachment', width - margin, y + 14);
    ctx.fillText('Sequence No. 155', width - margin, y + 24);
    
    y += 42;
    ctx.textAlign = 'left';
    
    // === NAME BOX ===
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, y, 380, 26);
    ctx.font = '6px Inter';
    ctx.fillText('Name(s) shown on your income tax return', margin + 3, y + 8);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donor.name, margin + 3, y + 20);
    
    ctx.strokeRect(margin + 385, y, 167, 26);
    ctx.font = '6px Inter';
    ctx.fillText('Identifying number', margin + 388, y + 8);
    ctx.font = '9px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), margin + 388, y + 20);
    
    y += 36;
    
    // === SECTION B HEADER ===
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(margin, y, width - 2 * margin, 14);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Section B. Donated Property Over $5,000 (Except Publicly Traded Securities)—Complete this section for one item (or group of similar', margin + 3, y + 10);
    
    y += 16;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(margin, y, width - 2 * margin, 12);
    ctx.fillStyle = '#000000';
    ctx.font = '6px Inter';
    ctx.fillText('items) for which you claimed a deduction of more than $5,000 per item or group. Attach a separate Form 8283, Section B, for each property or group.', margin + 3, y + 8);
    
    y += 18;
    
    // === PART I ===
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part I    Information on Donated Property', margin, y);
    
    y += 14;
    
    // Property type checkboxes
    ctx.font = '7px Inter';
    ctx.fillText('4   Check the box that describes the type of property donated:', margin, y);
    y += 11;
    
    const isClothing = donation.assetType === 'noncash_goods';
    const isSecurities = donation.assetType === 'stock_closelyheld';
    const isRealEstate = donation.assetType === 'real_estate';
    const isOther = !isClothing && !isSecurities && !isRealEstate;
    
    // Row 1
    drawCheckbox(ctx, margin + 5, y, false, 'a  Art* (contribution of $20,000 or more)');
    drawCheckbox(ctx, margin + 190, y, false, 'b  Qualified Conservation Contribution');
    drawCheckbox(ctx, margin + 380, y, false, 'c  Equipment');
    y += 12;
    
    // Row 2
    drawCheckbox(ctx, margin + 5, y, false, 'd  Art* (contribution of less than $20,000)');
    drawCheckbox(ctx, margin + 190, y, isRealEstate, 'e  Real Estate');
    drawCheckbox(ctx, margin + 380, y, isClothing, 'f  Clothing and household items');
    y += 12;
    
    // Row 3
    drawCheckbox(ctx, margin + 5, y, isSecurities, 'g  Securities');
    drawCheckbox(ctx, margin + 190, y, false, 'h  Collectibles**');
    drawCheckbox(ctx, margin + 380, y, isOther, 'i  Other');
    
    y += 15;
    
    // Description box
    ctx.font = '7px Inter';
    ctx.fillText('5   Description of donated property (if you need more space, attach a separate statement):', margin, y);
    y += 5;
    ctx.strokeRect(margin, y, width - 2 * margin, 30);
    ctx.font = '8px Inter';
    ctx.fillText(donation.assetDescription || '', margin + 5, y + 12);
    if (donation.property) {
        ctx.fillText(donation.property.address || '', margin + 5, y + 24);
    }
    
    y += 36;
    
    // Physical condition
    ctx.font = '7px Inter';
    ctx.fillText('6a  Brief summary of overall physical condition at time of gift:', margin, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.assetCondition || 'Excellent', margin + 240, y);
    
    y += 12;
    ctx.font = '7px Inter';
    ctx.fillText('6b  Has the organization made any changes to the property?  If "Yes," describe in Part III', margin, y);
    drawCheckbox(ctx, margin + 380, y - 3, false, 'Yes');
    drawCheckbox(ctx, margin + 420, y - 3, true, 'No');
    
    y += 14;
    
    // Appraised value and dates in a cleaner layout
    ctx.strokeRect(margin, y, width - 2 * margin, 50);
    
    ctx.font = '7px Inter';
    ctx.fillText('7  Appraised fair market value', margin + 5, y + 12);
    ctx.font = 'bold 10px Inter';
    ctx.fillText(formatMoney(donation.amount), margin + 5, y + 26);
    
    ctx.font = '7px Inter';
    ctx.fillText('8  Date acquired by donor', margin + 150, y + 12);
    ctx.font = '9px Inter';
    ctx.fillText(donation.dateAcquired ? formatDateShort(donation.dateAcquired) : 'Various', margin + 150, y + 26);
    
    ctx.font = '7px Inter';
    ctx.fillText('9  How acquired by donor', margin + 280, y + 12);
    ctx.font = '9px Inter';
    ctx.fillText(donation.howAcquired || 'Purchase', margin + 280, y + 26);
    
    ctx.font = '7px Inter';
    ctx.fillText('10  Donor\'s cost or adjusted basis', margin + 400, y + 12);
    ctx.font = '9px Inter';
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'See attached', margin + 400, y + 26);
    
    ctx.font = '7px Inter';
    ctx.fillText('11  Date of contribution', margin + 5, y + 42);
    ctx.font = '9px Inter';
    ctx.fillText(formatDate(donation.contributionDate), margin + 100, y + 42);
    
    y += 62;
    
    // === PART II - Taxpayer Statement ===
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part II   Taxpayer (Donor) Statement—Complete this part for each item included in Part I above.', margin, y);
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('I declare that the following statement is true, correct, and complete to the best of my knowledge and belief: The appraised', margin, y);
    y += 10;
    ctx.fillText('fair market value of the property shown in Part I exceeds the deduction I claimed. I received no goods or services in exchange.', margin, y);
    
    y += 16;
    ctx.fillText('Signature ▶', margin, y);
    ctx.beginPath();
    ctx.moveTo(margin + 55, y + 2);
    ctx.lineTo(margin + 300, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', margin + 320, y);
    ctx.beginPath();
    ctx.moveTo(margin + 350, y + 2);
    ctx.lineTo(width - margin, y + 2);
    ctx.stroke();
    
    y += 20;
    
    // === PART III - Appraiser Declaration ===
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part III  Declaration of Appraiser', margin, y);
    
    y += 12;
    ctx.font = '6px Inter';
    ctx.fillText('I declare that I am not the donor, the donee, a party to the transaction, or employed by any of the foregoing. I hold myself out to the public as an', margin, y);
    y += 9;
    ctx.fillText('appraiser and perform appraisals on a regular basis. I am qualified to appraise the type of property being valued.', margin, y);
    
    y += 14;
    
    if (donation.appraisal) {
        ctx.font = '7px Inter';
        ctx.fillText('Appraiser:', margin, y);
        ctx.font = '8px Inter';
        ctx.fillText(donation.appraisal.appraiserName, margin + 50, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Address:', margin, y);
        ctx.font = '8px Inter';
        ctx.fillText(donation.appraisal.appraiserAddress, margin + 45, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Qualifications:', margin, y);
        ctx.font = '6px Inter';
        ctx.fillText(donation.appraisal.appraiserQualifications.substring(0, 90), margin + 60, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Date of appraisal:', margin, y);
        ctx.font = '8px Inter';
        ctx.fillText(formatDate(donation.appraisal.appraisalDate), margin + 75, y);
    }
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('Appraiser signature ▶', margin, y);
    ctx.beginPath();
    ctx.moveTo(margin + 90, y + 2);
    ctx.lineTo(margin + 300, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', margin + 320, y);
    ctx.beginPath();
    ctx.moveTo(margin + 350, y + 2);
    ctx.lineTo(width - margin, y + 2);
    ctx.stroke();
    
    y += 20;
    
    // === PART IV - Donee Acknowledgment ===
    ctx.font = 'bold 7px Inter';
    ctx.fillText('Part IV  Donee Acknowledgment—To be completed by the charitable organization.', margin, y);
    
    y += 12;
    ctx.font = '6px Inter';
    ctx.fillText('This charitable organization acknowledges that it is a qualified organization under section 170(c) and that it received the donated property', margin, y);
    y += 9;
    ctx.fillText('as described in Part I, Section B, above on the following date:', margin, y);
    ctx.font = '8px Inter';
    ctx.fillText(formatDateShort(donation.contributionDate), margin + 250, y);
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('Donee:', margin, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.name, margin + 40, y);
    ctx.font = '7px Inter';
    ctx.fillText('EIN:', margin + 280, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.ein, margin + 300, y);
    
    y += 10;
    ctx.font = '7px Inter';
    ctx.fillText('Address:', margin, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.address.substring(0, 70), margin + 45, y);
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('Authorized signature ▶', margin, y);
    ctx.beginPath();
    ctx.moveTo(margin + 95, y + 2);
    ctx.lineTo(margin + 280, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', margin + 300, y);
    ctx.beginPath();
    ctx.moveTo(margin + 330, y + 2);
    ctx.lineTo(margin + 430, y + 2);
    ctx.stroke();
    ctx.fillText('Title ▶', margin + 450, y);
    ctx.beginPath();
    ctx.moveTo(margin + 475, y + 2);
    ctx.lineTo(width - margin, y + 2);
    ctx.stroke();
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// Main
async function main() {
    console.log('Regenerating Form 8283 with fixed spacing...\n');
    
    for (const donation of donationsData.donations) {
        for (const formType of donation.forms) {
            if (formType === 'form_8283_section_a') {
                const filename = `form_8283_section_a_${donation.id}.png`;
                const filepath = path.join(OUTPUT_DIR, 'form_8283_section_a', filename);
                const buffer = generateForm8283A(donation);
                fs.writeFileSync(filepath, buffer);
                console.log(`✓ ${filename}`);
            }
            if (formType === 'form_8283_section_b') {
                const filename = `form_8283_section_b_${donation.id}.png`;
                const filepath = path.join(OUTPUT_DIR, 'form_8283_section_b', filename);
                const buffer = generateForm8283B(donation);
                fs.writeFileSync(filepath, buffer);
                console.log(`✓ ${filename}`);
            }
        }
    }
    
    console.log('\nDone!');
}

main().catch(console.error);
