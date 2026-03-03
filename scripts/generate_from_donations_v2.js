#!/usr/bin/env node
/**
 * Generate OCR test documents from donations.json - V2 with improved IRS form accuracy
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

function drawBox(ctx, x, y, w, h, label, value, labelSize = 7) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
    if (label) {
        ctx.font = `${labelSize}px Inter`;
        ctx.fillStyle = '#333333';
        ctx.fillText(label, x + 2, y + 8);
    }
    if (value) {
        ctx.font = '10px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText(value, x + 3, y + h - 5);
    }
}

function drawCheckbox(ctx, x, y, checked, label) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, 10, 10);
    if (checked) {
        ctx.font = 'bold 10px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText('✓', x + 1, y + 9);
    }
    if (label) {
        ctx.font = '8px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 14, y + 8);
    }
}

// ===== IMPROVED FORM 8283 Section A =====
function generateForm8283A(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 25;
    
    // Form header - matches IRS layout
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', 25, y);
    
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. December 2023)', 25, y + 11);
    ctx.fillText('Department of the Treasury', 25, y + 20);
    ctx.fillText('Internal Revenue Service', 25, y + 29);
    
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 5);
    
    ctx.font = '9px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction', width / 2, y + 18);
    ctx.fillText('of over $500 for all contributed property.', width / 2, y + 28);
    ctx.fillText('▶ Go to www.irs.gov/Form8283 for instructions and the latest information.', width / 2, y + 38);
    
    ctx.textAlign = 'right';
    ctx.font = '8px Inter';
    ctx.fillText('OMB No. 1545-0908', width - 25, y);
    ctx.fillText('2023', width - 25, y + 15);
    ctx.fillText('Attachment', width - 25, y + 26);
    ctx.fillText('Sequence No. 155', width - 25, y + 35);
    
    y += 50;
    ctx.textAlign = 'left';
    
    // Name and identifying number boxes
    drawBox(ctx, 25, y, 400, 35, 'Name(s) shown on your income tax return', donation.donor.name);
    drawBox(ctx, 430, y, 155, 35, 'Identifying number', 'XXX-XX-' + Math.floor(1000 + Math.random() * 9000));
    
    y += 45;
    
    // Note about attachment
    ctx.font = '8px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Note: Figure the amount of your contribution deduction before completing this form. See your tax return instructions.', 25, y);
    
    y += 15;
    
    // Section A Header
    ctx.fillStyle = '#d3d3d3';
    ctx.fillRect(25, y, width - 50, 20);
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Section A. Donated Property of $5,000 or Less and Publicly Traded Securities', 30, y + 14);
    
    y += 25;
    
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part I    Information on Donated Property—If you need more space, attach a statement.', 25, y);
    
    y += 15;
    
    // Column headers with proper sizing
    const cols = [
        { x: 25, w: 30, label: '1' },
        { x: 55, w: 145, label: '(a) Name and address of the\ndonee organization' },
        { x: 200, w: 95, label: '(b) If tangible property was donated,\ngive a brief summary of the overall\nphysical condition of the property at\nthe time of the gift' },
        { x: 295, w: 75, label: '(c) If tangible property was\ndonated, give a brief summary\nof the appraised, insured, or\nassessed value' },
    ];
    
    // Extended header row
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(25, y, width - 50, 50);
    
    // Draw column separators
    ctx.beginPath();
    ctx.moveTo(55, y);
    ctx.lineTo(55, y + 50);
    ctx.moveTo(200, y);
    ctx.lineTo(200, y + 50);
    ctx.moveTo(295, y);
    ctx.lineTo(295, y + 50);
    ctx.moveTo(370, y);
    ctx.lineTo(370, y + 50);
    ctx.moveTo(420, y);
    ctx.lineTo(420, y + 50);
    ctx.moveTo(470, y);
    ctx.lineTo(470, y + 50);
    ctx.moveTo(520, y);
    ctx.lineTo(520, y + 50);
    ctx.stroke();
    
    // Column headers
    ctx.font = '7px Inter';
    ctx.fillText('1', 35, y + 30);
    
    ctx.fillText('(a) Name and address of the', 58, y + 15);
    ctx.fillText('donee organization', 58, y + 24);
    
    ctx.fillText('(b) If donated property is a vehicle', 203, y + 10);
    ctx.fillText('(see instructions), check the box.', 203, y + 19);
    ctx.fillText('Also enter the vehicle', 203, y + 28);
    ctx.fillText('identification number', 203, y + 37);
    
    ctx.fillText('(c) Description and condition', 298, y + 15);
    ctx.fillText('of donated property', 298, y + 24);
    
    ctx.fillText('(d) Date of the', 373, y + 15);
    ctx.fillText('contribution', 373, y + 24);
    
    ctx.fillText('(e) Date acquired', 423, y + 10);
    ctx.fillText('by donor', 423, y + 19);
    ctx.fillText('(mo., yr.)', 423, y + 28);
    
    ctx.fillText('(f) How acquired', 473, y + 15);
    ctx.fillText('by donor', 473, y + 24);
    
    ctx.fillText('(g) Donor\'s cost', 523, y + 10);
    ctx.fillText('or adjusted', 523, y + 19);
    ctx.fillText('basis', 523, y + 28);
    
    y += 50;
    
    // Data row
    ctx.strokeRect(25, y, width - 50, 55);
    ctx.beginPath();
    ctx.moveTo(55, y);
    ctx.lineTo(55, y + 55);
    ctx.moveTo(200, y);
    ctx.lineTo(200, y + 55);
    ctx.moveTo(295, y);
    ctx.lineTo(295, y + 55);
    ctx.moveTo(370, y);
    ctx.lineTo(370, y + 55);
    ctx.moveTo(420, y);
    ctx.lineTo(420, y + 55);
    ctx.moveTo(470, y);
    ctx.lineTo(470, y + 55);
    ctx.moveTo(520, y);
    ctx.lineTo(520, y + 55);
    ctx.stroke();
    
    // Fill data
    ctx.font = '8px Inter';
    ctx.fillText('A', 35, y + 30);
    
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.name.substring(0, 22), 58, y + 15);
    const addrParts = donation.donee.address.split(',');
    ctx.fillText(addrParts[0]?.substring(0, 22) || '', 58, y + 26);
    ctx.fillText((addrParts.slice(1).join(',') || '').substring(0, 22), 58, y + 37);
    ctx.font = '7px Inter';
    ctx.fillText('EIN: ' + donation.donee.ein, 58, y + 48);
    
    // Vehicle checkbox (empty for non-vehicles)
    drawCheckbox(ctx, 205, y + 10, false, '');
    
    // Description
    ctx.font = '8px Inter';
    const desc = donation.assetDescription || '';
    ctx.fillText(desc.substring(0, 18), 298, y + 20);
    if (desc.length > 18) ctx.fillText(desc.substring(18, 36), 298, y + 32);
    ctx.fillText(donation.assetCondition || 'Good', 298, y + 44);
    
    // Dates and values
    ctx.fillText(formatDateShort(donation.contributionDate), 373, y + 28);
    ctx.fillText(donation.dateAcquired ? formatDateShort(donation.dateAcquired).substring(0, 7) : 'Various', 423, y + 28);
    ctx.fillText((donation.howAcquired || 'Purchase').substring(0, 10), 473, y + 28);
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'N/A', 523, y + 28);
    
    y += 60;
    
    // Second header row for (h) and (i)
    ctx.strokeRect(25, y, width - 50, 35);
    ctx.beginPath();
    ctx.moveTo(200, y);
    ctx.lineTo(200, y + 35);
    ctx.moveTo(370, y);
    ctx.lineTo(370, y + 35);
    ctx.stroke();
    
    ctx.font = '7px Inter';
    ctx.fillText('Note: If the amount you claimed as a deduction for an item is $500 or less, you', 30, y + 12);
    ctx.fillText('do not have to complete columns (e), (f), and (g).', 30, y + 22);
    
    ctx.fillText('(h) Fair market value', 205, y + 12);
    ctx.fillText('(see instructions)', 205, y + 22);
    
    ctx.fillText('(i) Method used to determine the fair', 375, y + 12);
    ctx.fillText('market value', 375, y + 22);
    
    y += 35;
    
    // Data row for h and i
    ctx.strokeRect(25, y, width - 50, 25);
    ctx.beginPath();
    ctx.moveTo(200, y);
    ctx.lineTo(200, y + 25);
    ctx.moveTo(370, y);
    ctx.lineTo(370, y + 25);
    ctx.stroke();
    
    ctx.font = '8px Inter';
    ctx.fillText('A', 35, y + 16);
    ctx.font = 'bold 9px Inter';
    ctx.fillText(formatMoney(donation.amount), 210, y + 16);
    ctx.font = '8px Inter';
    ctx.fillText('Comparable Sales', 375, y + 16);
    
    y += 35;
    
    // Part II - Partial Interests
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part II   Partial Interests and Restricted Use Property—Complete lines 2a through 2e if you gave less than an', 25, y);
    y += 10;
    ctx.fillText('          entire interest in a property listed in Part I. Complete lines 3a through 3c if conditions were placed on a', 25, y);
    y += 10;
    ctx.fillText('          contribution listed in Part I; also attach the required statement (see instructions).', 25, y);
    
    y += 20;
    
    ctx.font = '8px Inter';
    ctx.fillText('2a  Enter the letter from Part I that identifies the property for which you gave less than an entire interest ▶', 25, y);
    ctx.fillText('N/A', 480, y);
    
    y += 40;
    
    // Donor acknowledgment
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(25, y, width - 50, 60);
    ctx.strokeRect(25, y, width - 50, 60);
    
    ctx.font = 'bold 8px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Donor Acknowledgment', 30, y + 15);
    ctx.font = '8px Inter';
    ctx.fillText('I acknowledge that I received no goods or services in exchange for this contribution, except as described above.', 30, y + 30);
    
    ctx.fillText('Signature ▶', 30, y + 50);
    ctx.beginPath();
    ctx.moveTo(90, y + 52);
    ctx.lineTo(300, y + 52);
    ctx.stroke();
    
    ctx.fillText('Date ▶', 320, y + 50);
    ctx.beginPath();
    ctx.moveTo(355, y + 52);
    ctx.lineTo(500, y + 52);
    ctx.stroke();
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// ===== IMPROVED FORM 8283 Section B =====
function generateForm8283B(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    let y = 25;
    
    // Form header
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', 25, y);
    
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. December 2023)', 25, y + 11);
    
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 5);
    ctx.font = '9px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction of over $500.', width / 2, y + 18);
    
    ctx.textAlign = 'right';
    ctx.font = '8px Inter';
    ctx.fillText('OMB No. 1545-0908', width - 25, y);
    
    y += 45;
    ctx.textAlign = 'left';
    
    // Name boxes
    drawBox(ctx, 25, y, 400, 30, 'Name(s) shown on your income tax return', donation.donor.name);
    drawBox(ctx, 430, y, 155, 30, 'Identifying number', 'XXX-XX-' + Math.floor(1000 + Math.random() * 9000));
    
    y += 40;
    
    // Section B Header
    ctx.fillStyle = '#d3d3d3';
    ctx.fillRect(25, y, width - 50, 18);
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Section B. Donated Property Over $5,000 (Except Publicly Traded Securities)—Complete this section for one item (or group', 30, y + 13);
    
    y += 20;
    ctx.fillStyle = '#d3d3d3';
    ctx.fillRect(25, y, width - 50, 14);
    ctx.fillStyle = '#000000';
    ctx.font = '8px Inter';
    ctx.fillText('of similar items) for which you claimed a deduction of more than $5,000 per item or group. Attach a separate Form 8283, Section B, for each property or group.', 30, y + 10);
    
    y += 20;
    
    // Part I header
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part I    Information on Donated Property', 25, y);
    
    y += 15;
    
    // 4. Property description
    ctx.font = '8px Inter';
    ctx.fillText('4  Check the box that describes the type of property donated:', 25, y);
    y += 12;
    
    // Checkboxes for property type
    const isArt = false;
    const isCollectibles = false;
    const isClothing = donation.assetType === 'noncash_goods';
    const isEquipment = false;
    const isSecurities = donation.assetType === 'stock_closelyheld';
    const isRealEstate = donation.assetType === 'real_estate';
    const isOther = !isClothing && !isSecurities && !isRealEstate;
    
    drawCheckbox(ctx, 30, y, false, 'a  Art* (contribution of $20,000 or more)');
    drawCheckbox(ctx, 220, y, false, 'b  Qualified Conservation Contribution');
    drawCheckbox(ctx, 420, y, false, 'c  Equipment');
    y += 15;
    drawCheckbox(ctx, 30, y, false, 'd  Art* (contribution of less than $20,000)');
    drawCheckbox(ctx, 220, y, isRealEstate, 'e  Real Estate');
    drawCheckbox(ctx, 420, y, isClothing, 'f  Clothing and household items');
    y += 15;
    drawCheckbox(ctx, 30, y, isSecurities, 'g  Securities');
    drawCheckbox(ctx, 220, y, false, 'h  Collectibles**');
    drawCheckbox(ctx, 420, y, isOther, 'i  Other');
    
    y += 20;
    
    // Property description box
    ctx.font = '8px Inter';
    ctx.fillText('5  Description of donated property:', 25, y);
    y += 5;
    ctx.strokeRect(25, y, width - 50, 40);
    ctx.font = '9px Inter';
    ctx.fillText(donation.assetDescription || '', 30, y + 15);
    if (donation.property) {
        ctx.fillText(donation.property.address || '', 30, y + 30);
    }
    
    y += 50;
    
    // Physical condition summary
    const physicalLabel = '6a  Brief summary of overall physical condition at time of gift:';
    ctx.font = '8px Inter';
    ctx.fillText(physicalLabel, 25, y);
    ctx.fillText(donation.assetCondition || 'Excellent', 270, y);
    
    y += 15;
    ctx.fillText('6b Has the organization made any changes to the property? If "Yes," describe in Part III', 25, y);
    drawCheckbox(ctx, 430, y - 3, false, 'Yes');
    drawCheckbox(ctx, 470, y - 3, true, 'No');
    
    y += 20;
    
    // Appraised FMV
    ctx.font = '8px Inter';
    ctx.fillText('7  Appraised fair market value:', 25, y);
    ctx.font = 'bold 10px Inter';
    ctx.fillText(formatMoney(donation.amount), 170, y);
    
    ctx.font = '8px Inter';
    ctx.fillText('8  Date acquired by donor:', 300, y);
    ctx.fillText(donation.dateAcquired ? formatDateShort(donation.dateAcquired) : 'Various', 430, y);
    
    y += 15;
    ctx.fillText('9  How acquired by donor:', 25, y);
    ctx.fillText(donation.howAcquired || 'Purchase', 150, y);
    
    ctx.fillText('10  Donor\'s cost or adjusted basis:', 300, y);
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'See attached', 450, y);
    
    y += 15;
    ctx.fillText('11  Date of contribution:', 25, y);
    ctx.fillText(formatDate(donation.contributionDate), 140, y);
    
    y += 25;
    
    // Part II - Taxpayer Statement
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part II   Taxpayer (Donor) Statement—Complete this part for each item included in Part I above.', 25, y);
    
    y += 15;
    ctx.font = '8px Inter';
    const stmt = 'I declare that the following statement is true, correct, and complete to the best of my knowledge and belief: The appraised fair market value of the property shown in Part I exceeds the deduction I claimed for the property. I received no goods or services in exchange for this contribution.';
    const lines = wrapText(ctx, stmt, width - 70);
    for (const line of lines) {
        ctx.fillText(line, 25, y);
        y += 11;
    }
    
    y += 10;
    ctx.fillText('Signature ▶', 25, y);
    ctx.beginPath();
    ctx.moveTo(85, y + 2);
    ctx.lineTo(350, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', 370, y);
    ctx.beginPath();
    ctx.moveTo(400, y + 2);
    ctx.lineTo(560, y + 2);
    ctx.stroke();
    
    y += 25;
    
    // Part III - Declaration of Appraiser
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part III  Declaration of Appraiser', 25, y);
    
    y += 15;
    ctx.font = '8px Inter';
    
    if (donation.appraisal) {
        ctx.fillText('I declare that I am not the donor, the donee, a party to the transaction, or employed by any of the foregoing. I hold myself', 25, y);
        y += 11;
        ctx.fillText('out to the public as an appraiser and perform appraisals on a regular basis. I am qualified to appraise the type of property.', 25, y);
        y += 15;
        
        ctx.fillText('Appraiser\'s name:', 25, y);
        ctx.fillText(donation.appraisal.appraiserName, 120, y);
        y += 12;
        ctx.fillText('Business address:', 25, y);
        ctx.fillText(donation.appraisal.appraiserAddress, 120, y);
        y += 12;
        ctx.fillText('Qualifications:', 25, y);
        ctx.font = '7px Inter';
        ctx.fillText(donation.appraisal.appraiserQualifications.substring(0, 80), 100, y);
        y += 12;
        ctx.font = '8px Inter';
        ctx.fillText('Date of appraisal:', 25, y);
        ctx.fillText(formatDate(donation.appraisal.appraisalDate), 120, y);
    }
    
    y += 20;
    ctx.fillText('Appraiser signature ▶', 25, y);
    ctx.beginPath();
    ctx.moveTo(130, y + 2);
    ctx.lineTo(350, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', 370, y);
    ctx.beginPath();
    ctx.moveTo(400, y + 2);
    ctx.lineTo(560, y + 2);
    ctx.stroke();
    
    y += 25;
    
    // Part IV - Donee Acknowledgment
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part IV  Donee Acknowledgment—To be completed by the charitable organization.', 25, y);
    
    y += 15;
    ctx.font = '8px Inter';
    ctx.fillText('This charitable organization acknowledges that it is a qualified organization under section 170(c) and that it received the', 25, y);
    y += 11;
    ctx.fillText('donated property as described in Part I, Section B, above on the following date:', 25, y);
    ctx.fillText(formatDateShort(donation.contributionDate), 400, y);
    
    y += 15;
    ctx.fillText('Donee name:', 25, y);
    ctx.fillText(donation.donee.name, 100, y);
    y += 12;
    ctx.fillText('EIN:', 25, y);
    ctx.fillText(donation.donee.ein, 55, y);
    ctx.fillText('Address:', 150, y);
    ctx.fillText(donation.donee.address.substring(0, 50), 200, y);
    
    y += 20;
    ctx.fillText('Authorized signature ▶', 25, y);
    ctx.beginPath();
    ctx.moveTo(135, y + 2);
    ctx.lineTo(350, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', 370, y);
    ctx.beginPath();
    ctx.moveTo(400, y + 2);
    ctx.lineTo(500, y + 2);
    ctx.stroke();
    ctx.fillText('Title ▶', 510, y);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// ===== IMPROVED FORM 1098-C =====
function generateForm1098C(donation) {
    const width = 612, height = 480;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const v = donation.vehicle;
    let y = 20;
    
    // Form header area
    ctx.font = '8px Inter';
    ctx.fillStyle = '#c00000';
    ctx.fillText('VOID', 30, y);
    ctx.fillText('CORRECTED', 70, y);
    
    y += 15;
    
    // Main form structure with boxes
    // Left column - Donee info
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    
    // DONEE box
    ctx.strokeRect(25, y, 270, 80);
    ctx.font = '7px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText("DONEE'S name, street address, city or town, state or province, country, ZIP or foreign postal code,", 30, y + 10);
    ctx.fillText('and telephone no.', 30, y + 18);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donee.name, 30, y + 32);
    const doneeAddr = donation.donee.address.split(',');
    ctx.fillText(doneeAddr[0] || '', 30, y + 44);
    ctx.fillText(doneeAddr.slice(1).join(',').trim() || '', 30, y + 56);
    ctx.font = '8px Inter';
    ctx.fillText('EIN: ' + donation.donee.ein, 30, y + 70);
    
    // DONEE's TIN box
    ctx.strokeRect(300, y, 140, 30);
    ctx.font = '7px Inter';
    ctx.fillText("DONEE'S TIN", 305, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(donation.donee.ein, 305, y + 24);
    
    // DONOR's TIN box
    ctx.strokeRect(445, y, 140, 30);
    ctx.font = '7px Inter';
    ctx.fillText("DONOR'S TIN", 450, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), 450, y + 24);
    
    y += 35;
    
    // DONOR info box
    ctx.strokeRect(300, y, 285, 45);
    ctx.font = '7px Inter';
    ctx.fillText("DONOR'S name", 305, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(donation.donor.name, 305, y + 22);
    
    y += 50;
    
    // Street address box
    ctx.strokeRect(300, y - 5, 285, 30);
    ctx.font = '7px Inter';
    ctx.fillText('Street address (including apt. no.)', 305, y + 5);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donor.address, 305, y + 18);
    
    y += 30;
    
    // City/State/ZIP box
    ctx.strokeRect(300, y - 5, 285, 30);
    ctx.font = '7px Inter';
    ctx.fillText('City or town, state or province, country, and ZIP or foreign postal code', 305, y + 5);
    ctx.font = '9px Inter';
    ctx.fillText(`${donation.donor.city}, ${donation.donor.state} ${donation.donor.zip}`, 305, y + 18);
    
    y = 115;
    
    // Form title and boxes
    ctx.strokeRect(25, y, 270, 25);
    ctx.font = '7px Inter';
    ctx.fillText("DONEE'S telephone no.", 30, y + 10);
    ctx.font = '9px Inter';
    ctx.fillText('(555) 123-4567', 30, y + 20);
    
    y += 35;
    
    // Numbered boxes section
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Form 1098-C', 155, y);
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. January 2024)', 155, y + 12);
    
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('Contributions of', 245, y);
    ctx.fillText('Motor Vehicles, Boats,', 245, y + 12);
    ctx.fillText('and Airplanes', 245, y + 24);
    
    y += 35;
    
    // Box 1 - Date
    ctx.strokeRect(25, y, 100, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('1  Date of contribution', 28, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(formatDateShort(donation.contributionDate), 30, y + 27);
    
    // Box 2a - Odometer
    ctx.strokeRect(130, y, 100, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('2a  Odometer mileage', 133, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(v.mileage.toLocaleString(), 135, y + 27);
    
    // Box 2b - Year
    ctx.strokeRect(235, y, 60, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('2b  Year', 238, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(v.year.toString(), 240, y + 27);
    
    // Box 2c - Make
    ctx.strokeRect(300, y, 80, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('2c  Make', 303, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(v.make, 305, y + 27);
    
    // Box 2d - Model
    ctx.strokeRect(385, y, 80, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('2d  Model', 388, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText(v.model, 390, y + 27);
    
    // Box 3 - VIN
    ctx.strokeRect(470, y, 115, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('3  Vehicle identification number', 473, y + 10);
    ctx.font = '8px Inter';
    ctx.fillText(v.vin, 475, y + 27);
    
    y += 45;
    
    // Checkboxes 4a, 4b, 4c
    const soldAtArmsLength = donation.saleInfo?.soldAtAuction || false;
    const transferredToNeedy = donation.saleInfo?.transferredToNeedy || false;
    const usedByOrg = !soldAtArmsLength && !transferredToNeedy;
    
    ctx.strokeRect(25, y, 560, 70);
    
    ctx.font = 'bold 7px Inter';
    ctx.fillText('4a', 30, y + 12);
    drawCheckbox(ctx, 45, y + 3, soldAtArmsLength, '');
    ctx.font = '8px Inter';
    ctx.fillText('Donee certifies that vehicle was sold in arm\'s length transaction to unrelated party', 60, y + 12);
    
    ctx.font = 'bold 7px Inter';
    ctx.fillText('4b', 30, y + 30);
    drawCheckbox(ctx, 45, y + 21, transferredToNeedy, '');
    ctx.font = '8px Inter';
    ctx.fillText('Donee certifies that vehicle was transferred to a needy individual for significantly below fair market value', 60, y + 30);
    
    ctx.font = 'bold 7px Inter';
    ctx.fillText('4c', 30, y + 48);
    drawCheckbox(ctx, 45, y + 39, usedByOrg, '');
    ctx.font = '8px Inter';
    ctx.fillText('Donee certifies that vehicle will be materially improved, significantly modified, or used for charitable purpose', 60, y + 48);
    
    ctx.fillText('Describe intended use ▶  ' + (usedByOrg ? 'Transportation for charitable programs' : ''), 60, y + 62);
    
    y += 80;
    
    // Box 5 - Gross proceeds
    ctx.strokeRect(25, y, 200, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('5  Date of sale', 28, y + 10);
    ctx.font = '10px Inter';
    if (donation.saleInfo?.saleDate) {
        ctx.fillText(formatDateShort(donation.saleInfo.saleDate), 30, y + 27);
    }
    
    // Box 6 - Gross proceeds
    ctx.strokeRect(230, y, 180, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('6  Gross proceeds from sale (see instructions)', 233, y + 10);
    ctx.font = 'bold 11px Inter';
    if (donation.saleInfo?.grossProceeds) {
        ctx.fillText(formatMoney(donation.saleInfo.grossProceeds), 235, y + 27);
    }
    
    // Box 7 - Value
    ctx.strokeRect(415, y, 170, 35);
    ctx.font = 'bold 7px Inter';
    ctx.fillText('7  Value of goods/services provided', 418, y + 10);
    ctx.font = '10px Inter';
    ctx.fillText('$0.00', 420, y + 27);
    
    y += 45;
    
    // Copy B notice
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Copy B', width - 80, 20);
    ctx.font = '8px Inter';
    ctx.fillText('For Donor', width - 80, 32);
    
    // Footer
    ctx.font = '7px Inter';
    ctx.fillStyle = '#666666';
    ctx.fillText('This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty', 25, y + 10);
    ctx.fillText('or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported.', 25, y + 20);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// Main execution - only regenerate the IRS forms
async function main() {
    console.log('Regenerating IRS forms with improved accuracy...\n');
    
    const forms = ['form_8283_section_a', 'form_8283_section_b', 'form_1098c'];
    const generators = {
        form_8283_section_a: generateForm8283A,
        form_8283_section_b: generateForm8283B,
        form_1098c: generateForm1098C
    };
    
    for (const donation of donationsData.donations) {
        for (const formType of donation.forms) {
            if (!forms.includes(formType)) continue;
            
            const generator = generators[formType];
            if (!generator) continue;
            
            const filename = `${formType}_${donation.id}.png`;
            const filepath = path.join(OUTPUT_DIR, formType, filename);
            
            try {
                const buffer = generator(donation);
                fs.writeFileSync(filepath, buffer);
                console.log(`✓ Regenerated ${formType}/${filename}`);
            } catch (err) {
                console.error(`✗ Error: ${formType}/${filename}: ${err.message}`);
            }
        }
    }
    
    console.log('\nDone!');
}

main().catch(console.error);
