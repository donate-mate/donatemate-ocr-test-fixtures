#!/usr/bin/env node
/**
 * Exact replica of IRS Form 8283 - matching the official form layout precisely
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
function formatDateMMDDYYYY(dateStr) {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}

function formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addWatermark(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.font = '24px Inter';
    ctx.fillStyle = '#666666';
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'center';
    ctx.fillText('SAMPLE - FOR TESTING ONLY', 0, 0);
    ctx.restore();
}

// Draw a box with label at top-left
function drawLabeledBox(ctx, x, y, w, h, label) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
    if (label) {
        ctx.font = '6px Inter';
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 2, y + 7);
    }
}

// ===== FORM 8283 SECTION A - EXACT IRS REPLICA =====
function generateForm8283A(donation) {
    const width = 612, height = 792; // Letter size
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    
    let y = 18;
    const leftMargin = 36;
    const rightMargin = 576;
    const contentWidth = rightMargin - leftMargin;
    
    // ===== TOP HEADER =====
    // Form number (top left)
    ctx.font = 'bold 18px Inter';
    ctx.fillText('Form', leftMargin, y + 2);
    ctx.font = 'bold 24px Inter';
    ctx.fillText('8283', leftMargin + 35, y + 3);
    
    // Revision date
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. December 2023)', leftMargin, y + 15);
    ctx.font = '7px Inter';
    ctx.fillText('Department of the Treasury', leftMargin, y + 24);
    ctx.fillText('Internal Revenue Service', leftMargin, y + 32);
    
    // Title (center)
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 5);
    
    ctx.font = '9px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction', width / 2, y + 17);
    ctx.fillText('of over $500 for all contributed property.', width / 2, y + 27);
    ctx.font = '8px Inter';
    ctx.fillText('▶ Go to www.irs.gov/Form8283 for instructions and the latest information.', width / 2, y + 37);
    
    // OMB number (top right)
    ctx.textAlign = 'right';
    ctx.font = '7px Inter';
    ctx.fillText('OMB No. 1545-0908', rightMargin, y);
    ctx.font = 'bold 16px Inter';
    ctx.fillText('2023', rightMargin, y + 18);
    ctx.font = '7px Inter';
    ctx.fillText('Attachment', rightMargin, y + 28);
    ctx.fillText('Sequence No. 155', rightMargin, y + 36);
    
    ctx.textAlign = 'left';
    y += 48;
    
    // ===== NAME AND ID LINE =====
    // Name box
    ctx.strokeRect(leftMargin, y, 400, 28);
    ctx.font = '6px Inter';
    ctx.fillText('Name(s) shown on your income tax return', leftMargin + 3, y + 8);
    ctx.font = '11px Inter';
    ctx.fillText(donation.donor.name, leftMargin + 3, y + 22);
    
    // Identifying number box
    ctx.strokeRect(leftMargin + 405, y, 135, 28);
    ctx.font = '6px Inter';
    ctx.fillText('Identifying number', leftMargin + 408, y + 8);
    ctx.font = '11px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), leftMargin + 408, y + 22);
    
    y += 34;
    
    // Note line
    ctx.font = '7px Inter';
    ctx.fillText('Note: Figure the amount of your contribution deduction before completing this form. See your tax return instructions.', leftMargin, y);
    
    y += 12;
    
    // ===== SECTION A HEADER =====
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(leftMargin, y, contentWidth, 14);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Section A. Donated Property of $5,000 or Less and Publicly Traded Securities (List in this section only items (or', leftMargin + 3, y + 10);
    y += 14;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(leftMargin, y, contentWidth, 11);
    ctx.fillStyle = '#000000';
    ctx.font = '8px Inter';
    ctx.fillText('groups of similar items) for which you claimed a deduction of $5,000 or less. Also list certain publicly traded securities and other items—see instructions.)', leftMargin + 3, y + 8);
    
    y += 16;
    
    // Part I Header
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part I', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Information on Donated Property—If you need more space, attach a statement.', leftMargin + 30, y);
    
    y += 10;
    
    // ===== MAIN TABLE - Line 1 =====
    const tableTop = y;
    const tableWidth = contentWidth;
    
    // Define exact column positions (matching IRS form proportions)
    const cols = [
        { x: 0, w: 18, label: '1' },           // Row number
        { x: 18, w: 127, label: '(a) Name and address of the\ndonee organization' },
        { x: 145, w: 65, label: '(b) If donated property is a\nvehicle (see the instructions),\ncheck the box. Also enter the\nvehicle identification number\n(unless Form 1098-C is attached)' },
        { x: 210, w: 85, label: '(c) Description and condition\nof donated property\n(For a vehicle, enter the year,\nmake, model, and mileage.\nFor securities and other\nproperty, see instructions.)' },
        { x: 295, w: 55, label: '(d) Date of the\ncontribution' },
        { x: 350, w: 50, label: '(e) Date acquired\nby donor (mo., yr.)' },
        { x: 400, w: 55, label: '(f) How acquired\nby donor' },
        { x: 455, w: 85, label: '(g) Donor\'s cost\nor adjusted basis\n(see instructions)' }
    ];
    
    // Header row height
    const headerHeight = 52;
    
    // Draw header cells
    ctx.strokeRect(leftMargin, y, tableWidth, headerHeight);
    
    // Draw vertical lines and header text
    for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(leftMargin + col.x, y);
            ctx.lineTo(leftMargin + col.x, y + headerHeight);
            ctx.stroke();
        }
        
        // Header text
        ctx.font = '6px Inter';
        const lines = col.label.split('\n');
        let textY = y + 8;
        for (const line of lines) {
            ctx.fillText(line, leftMargin + col.x + 2, textY);
            textY += 7;
        }
    }
    
    y += headerHeight;
    
    // Data rows (A through E)
    const rowHeight = 38;
    const rowLabels = ['A', 'B', 'C', 'D', 'E'];
    
    for (let r = 0; r < 5; r++) {
        ctx.strokeRect(leftMargin, y, tableWidth, rowHeight);
        
        // Draw vertical lines
        for (let i = 1; i < cols.length; i++) {
            ctx.beginPath();
            ctx.moveTo(leftMargin + cols[i].x, y);
            ctx.lineTo(leftMargin + cols[i].x, y + rowHeight);
            ctx.stroke();
        }
        
        // Row label
        ctx.font = 'bold 9px Inter';
        ctx.fillText(rowLabels[r], leftMargin + 6, y + 22);
        
        // Fill first row with donation data
        if (r === 0) {
            ctx.font = '7px Inter';
            
            // (a) Donee
            const dName = donation.donee.name;
            ctx.fillText(dName.substring(0, 20), leftMargin + cols[1].x + 3, y + 10);
            if (dName.length > 20) ctx.fillText(dName.substring(20, 40), leftMargin + cols[1].x + 3, y + 18);
            const addr = donation.donee.address.split(',');
            ctx.fillText((addr[0] || '').substring(0, 20), leftMargin + cols[1].x + 3, y + 26);
            ctx.font = '6px Inter';
            ctx.fillText('EIN: ' + donation.donee.ein, leftMargin + cols[1].x + 3, y + 34);
            
            // (b) Vehicle checkbox
            ctx.strokeRect(leftMargin + cols[2].x + 25, y + 12, 8, 8);
            
            // (c) Description
            ctx.font = '7px Inter';
            const desc = donation.assetDescription || '';
            ctx.fillText(desc.substring(0, 13), leftMargin + cols[3].x + 3, y + 12);
            if (desc.length > 13) ctx.fillText(desc.substring(13, 26), leftMargin + cols[3].x + 3, y + 20);
            ctx.fillText((donation.assetCondition || 'Good'), leftMargin + cols[3].x + 3, y + 32);
            
            // (d) Date contributed
            ctx.fillText(formatDateMMDDYYYY(donation.contributionDate), leftMargin + cols[4].x + 3, y + 20);
            
            // (e) Date acquired
            ctx.fillText(donation.dateAcquired ? formatDateMMDDYYYY(donation.dateAcquired).substring(0, 7) : 'Various', leftMargin + cols[5].x + 3, y + 20);
            
            // (f) How acquired
            ctx.fillText((donation.howAcquired || 'Purchase').substring(0, 8), leftMargin + cols[6].x + 3, y + 20);
            
            // (g) Cost basis
            ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'See stmt', leftMargin + cols[7].x + 3, y + 20);
        }
        
        y += rowHeight;
    }
    
    // Note row
    ctx.font = '6px Inter';
    ctx.fillText('Note: If the amount you claimed as a deduction for an item is $500 or less, you do not have to complete columns (d), (e), and (f).', leftMargin, y + 8);
    
    y += 14;
    
    // ===== FMV and Method row =====
    ctx.strokeRect(leftMargin, y, tableWidth, 32);
    
    // Vertical dividers
    ctx.beginPath();
    ctx.moveTo(leftMargin + 200, y);
    ctx.lineTo(leftMargin + 200, y + 32);
    ctx.moveTo(leftMargin + 340, y);
    ctx.lineTo(leftMargin + 340, y + 32);
    ctx.stroke();
    
    // Column headers
    ctx.font = '6px Inter';
    ctx.fillText('(h) Fair market value', leftMargin + 205, y + 10);
    ctx.fillText('(see instructions)', leftMargin + 205, y + 18);
    
    ctx.fillText('(i) Method used to determine the fair market value', leftMargin + 345, y + 14);
    
    y += 32;
    
    // Data row for (h) and (i)
    for (let r = 0; r < 5; r++) {
        ctx.strokeRect(leftMargin, y, tableWidth, 16);
        ctx.beginPath();
        ctx.moveTo(leftMargin + 200, y);
        ctx.lineTo(leftMargin + 200, y + 16);
        ctx.moveTo(leftMargin + 340, y);
        ctx.lineTo(leftMargin + 340, y + 16);
        ctx.stroke();
        
        ctx.font = 'bold 8px Inter';
        ctx.fillText(rowLabels[r], leftMargin + 6, y + 12);
        
        if (r === 0) {
            ctx.font = '9px Inter';
            ctx.fillText(formatMoney(donation.amount), leftMargin + 210, y + 12);
            ctx.font = '8px Inter';
            ctx.fillText('Comparable sales', leftMargin + 350, y + 12);
        }
        
        y += 16;
    }
    
    y += 8;
    
    // ===== PART II =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part II', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Partial Interests and Restricted Use Property—Complete lines 2a through 2e if you gave less than an entire', leftMargin + 32, y);
    y += 9;
    ctx.fillText('interest in a property listed in Part I. Complete lines 3a through 3c if conditions were placed on a contribution listed in Part I;', leftMargin + 32, y);
    y += 9;
    ctx.fillText('also attach the required statement (see instructions).', leftMargin + 32, y);
    
    y += 14;
    
    // Line 2a
    ctx.font = '8px Inter';
    ctx.fillText('2a', leftMargin, y);
    ctx.fillText('Enter the letter from Part I that identifies the property for which you gave less than an entire interest', leftMargin + 18, y);
    ctx.fillText('▶', leftMargin + 420, y);
    ctx.strokeRect(leftMargin + 430, y - 8, 100, 12);
    ctx.fillText('If Part II applies, N/A', leftMargin + 435, y);
    
    y += 25;
    
    // ===== DONOR ACKNOWLEDGMENT BOX =====
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(leftMargin, y, contentWidth, 50);
    ctx.strokeRect(leftMargin, y, contentWidth, 50);
    ctx.fillStyle = '#000000';
    
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Donor acknowledgment', leftMargin + 5, y + 12);
    
    ctx.font = '7px Inter';
    ctx.fillText('I declare that the following statement is true, correct, and complete to the best of my knowledge. I acknowledge that I received', leftMargin + 5, y + 24);
    ctx.fillText('no goods or services in exchange for this contribution except as described on Form 8283.', leftMargin + 5, y + 33);
    
    ctx.fillText('Signature of donor ▶', leftMargin + 5, y + 45);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 80, y + 47);
    ctx.lineTo(leftMargin + 320, y + 47);
    ctx.stroke();
    
    ctx.fillText('Date ▶', leftMargin + 340, y + 45);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 365, y + 47);
    ctx.lineTo(rightMargin - 10, y + 47);
    ctx.stroke();
    
    // Footer
    ctx.font = '7px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('For Paperwork Reduction Act Notice, see separate instructions.', leftMargin, height - 25);
    ctx.textAlign = 'center';
    ctx.fillText('Cat. No. 62299J', width / 2, height - 25);
    ctx.textAlign = 'right';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Form 8283 (Rev. 12-2023)', rightMargin, height - 25);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// ===== FORM 8283 SECTION B - EXACT IRS REPLICA =====
function generateForm8283B(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    
    let y = 18;
    const leftMargin = 36;
    const rightMargin = 576;
    const contentWidth = rightMargin - leftMargin;
    
    // ===== TOP HEADER (same as Section A) =====
    ctx.font = 'bold 18px Inter';
    ctx.fillText('Form', leftMargin, y + 2);
    ctx.font = 'bold 24px Inter';
    ctx.fillText('8283', leftMargin + 35, y + 3);
    
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. December 2023)', leftMargin, y + 15);
    
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 5);
    ctx.font = '8px Inter';
    ctx.fillText('▶ Attach to your tax return if you claimed a total deduction of over $500 for all contributed property.', width / 2, y + 17);
    
    ctx.textAlign = 'right';
    ctx.font = '7px Inter';
    ctx.fillText('OMB No. 1545-0908', rightMargin, y);
    
    ctx.textAlign = 'left';
    y += 30;
    
    // Name and ID
    ctx.strokeRect(leftMargin, y, 400, 24);
    ctx.font = '6px Inter';
    ctx.fillText('Name(s) shown on your income tax return', leftMargin + 3, y + 8);
    ctx.font = '10px Inter';
    ctx.fillText(donation.donor.name, leftMargin + 3, y + 19);
    
    ctx.strokeRect(leftMargin + 405, y, 135, 24);
    ctx.font = '6px Inter';
    ctx.fillText('Identifying number', leftMargin + 408, y + 8);
    ctx.font = '10px Inter';
    ctx.fillText('XXX-XX-' + Math.floor(1000 + Math.random() * 9000), leftMargin + 408, y + 19);
    
    y += 30;
    
    // ===== SECTION B HEADER =====
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(leftMargin, y, contentWidth, 12);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Section B. Donated Property Over $5,000 (Except Publicly Traded Securities)—Complete this section for one item (or', leftMargin + 3, y + 9);
    y += 12;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(leftMargin, y, contentWidth, 10);
    ctx.fillStyle = '#000000';
    ctx.font = '7px Inter';
    ctx.fillText('group of similar items) for which you claimed a deduction of more than $5,000 per item or group (except contributions of publicly traded securities', leftMargin + 3, y + 7);
    y += 10;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(leftMargin, y, contentWidth, 10);
    ctx.fillStyle = '#000000';
    ctx.fillText('reported in Section A). Provide a separate form for each property donated or group of similar items.', leftMargin + 3, y + 7);
    
    y += 14;
    
    // ===== PART I - Information on Donated Property =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part I', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Information on Donated Property—To be completed by the taxpayer and/or the appraiser.', leftMargin + 30, y);
    
    y += 12;
    
    // Line 1 - Type of property checkboxes
    ctx.font = '8px Inter';
    ctx.fillText('1', leftMargin, y);
    ctx.fillText('Check the box that describes the type of property donated:', leftMargin + 12, y);
    
    y += 12;
    
    const checkboxes = [
        ['a', 'Art* (contribution of $20,000 or more)', false],
        ['b', 'Qualified Conservation Contribution', false],
        ['c', 'Equipment', false],
        ['d', 'Art* (contribution of less than $20,000)', false],
        ['e', 'Real Estate', donation.assetType === 'real_estate'],
        ['f', 'Clothing and household items', donation.assetType === 'noncash_goods'],
        ['g', 'Securities', donation.assetType === 'stock_closelyheld'],
        ['h', 'Collectibles**', false],
        ['i', 'Other', donation.assetType !== 'noncash_goods' && donation.assetType !== 'stock_closelyheld' && donation.assetType !== 'real_estate']
    ];
    
    // Draw checkboxes in 3 columns
    const colWidth = 180;
    for (let i = 0; i < 9; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = leftMargin + 15 + col * colWidth;
        const cy = y + row * 12;
        
        ctx.strokeRect(cx, cy - 1, 7, 7);
        if (checkboxes[i][2]) {
            ctx.font = 'bold 7px Inter';
            ctx.fillText('X', cx + 1, cy + 5);
        }
        ctx.font = '7px Inter';
        ctx.fillText(checkboxes[i][0] + '  ' + checkboxes[i][1], cx + 10, cy + 5);
    }
    
    y += 40;
    
    // Line 2 - Description
    ctx.font = '8px Inter';
    ctx.fillText('2', leftMargin, y);
    ctx.fillText('Description of donated property (if you need more space, attach a separate statement):', leftMargin + 12, y);
    y += 4;
    ctx.strokeRect(leftMargin, y, contentWidth, 24);
    ctx.font = '9px Inter';
    ctx.fillText(donation.assetDescription || '', leftMargin + 5, y + 10);
    if (donation.property?.address) {
        ctx.fillText(donation.property.address, leftMargin + 5, y + 20);
    }
    
    y += 30;
    
    // Line 3 - Appraised FMV table
    ctx.font = '8px Inter';
    ctx.fillText('3', leftMargin, y);
    
    // Table header
    const tableY = y;
    ctx.strokeRect(leftMargin + 12, y, contentWidth - 12, 22);
    
    const line3Cols = [
        { x: 0, w: 100, label: '(a) Appraised fair\nmarket value' },
        { x: 100, w: 80, label: '(b) Date acquired\nby donor (mo., yr.)' },
        { x: 180, w: 70, label: '(c) How acquired\nby donor' },
        { x: 250, w: 95, label: '(d) Donor\'s cost or\nadjusted basis' },
        { x: 345, w: 70, label: '(e) For bargain sales,\nenter amount received' },
        { x: 415, w: 113, label: '(f) Amount claimed as\na deduction' }
    ];
    
    // Draw columns
    ctx.font = '6px Inter';
    for (let i = 0; i < line3Cols.length; i++) {
        const col = line3Cols[i];
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(leftMargin + 12 + col.x, tableY);
            ctx.lineTo(leftMargin + 12 + col.x, tableY + 22);
            ctx.stroke();
        }
        const lines = col.label.split('\n');
        ctx.fillText(lines[0], leftMargin + 14 + col.x, tableY + 8);
        if (lines[1]) ctx.fillText(lines[1], leftMargin + 14 + col.x, tableY + 16);
    }
    
    y += 22;
    
    // Data row
    ctx.strokeRect(leftMargin + 12, y, contentWidth - 12, 16);
    for (let i = 1; i < line3Cols.length; i++) {
        ctx.beginPath();
        ctx.moveTo(leftMargin + 12 + line3Cols[i].x, y);
        ctx.lineTo(leftMargin + 12 + line3Cols[i].x, y + 16);
        ctx.stroke();
    }
    
    ctx.font = '8px Inter';
    ctx.fillText(formatMoney(donation.amount), leftMargin + 16, y + 11);
    ctx.fillText(donation.dateAcquired ? formatDateMMDDYYYY(donation.dateAcquired).substring(0, 7) : 'Various', leftMargin + 116, y + 11);
    ctx.fillText((donation.howAcquired || 'Purchase').substring(0, 10), leftMargin + 196, y + 11);
    ctx.fillText(donation.costBasis ? formatMoney(donation.costBasis) : 'See stmt', leftMargin + 266, y + 11);
    ctx.fillText('N/A', leftMargin + 361, y + 11);
    ctx.fillText(formatMoney(donation.amount), leftMargin + 431, y + 11);
    
    y += 22;
    
    // Line 4 - Date of contribution
    ctx.font = '8px Inter';
    ctx.fillText('4', leftMargin, y);
    ctx.fillText('Date of contribution:', leftMargin + 12, y);
    ctx.font = '9px Inter';
    ctx.fillText(formatDateMMDDYYYY(donation.contributionDate), leftMargin + 100, y);
    
    y += 14;
    
    // ===== PART II - Partial Interests =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part II', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Partial Interests and Restricted Use Property—Complete this part for property listed in Part I if you gave less', leftMargin + 32, y);
    y += 9;
    ctx.fillText('than an entire interest or placed conditions on the contributed property.', leftMargin + 32, y);
    
    y += 14;
    
    ctx.fillText('5a  Enter the letter from Part I, line 1, that identifies the property for which you gave less than an entire interest ▶', leftMargin, y);
    ctx.fillText('N/A', leftMargin + 440, y);
    
    y += 20;
    
    // ===== PART III - Taxpayer Statement =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part III', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Taxpayer (Donor) Statement—List each item included in Part I above that is valued at $5,000 or less.', leftMargin + 35, y);
    
    y += 10;
    ctx.font = '7px Inter';
    ctx.fillText('I declare that the following item(s) included in Part I above has/have to the best of my knowledge and belief an appraised value of not more than', leftMargin, y);
    y += 8;
    ctx.fillText('$5,000 per item (or group of similar items). I declare that I received no goods or services in exchange for this contribution except as described.', leftMargin, y);
    
    y += 14;
    ctx.fillText('Signature of donor ▶', leftMargin, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 80, y + 2);
    ctx.lineTo(leftMargin + 350, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', leftMargin + 370, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 395, y + 2);
    ctx.lineTo(rightMargin, y + 2);
    ctx.stroke();
    
    y += 18;
    
    // ===== PART IV - Declaration of Appraiser =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part IV', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Declaration of Appraiser', leftMargin + 35, y);
    
    y += 10;
    ctx.font = '6px Inter';
    ctx.fillText('I declare that I am not the donor, the donee, a party to the transaction in which the donor acquired the property, employed by, or related to any of the foregoing, or married', leftMargin, y);
    y += 7;
    ctx.fillText('to any person who is related to any of the foregoing. I performed the majority of my appraisal during my tax year ending and for appraisers other than combative appraisers', leftMargin, y);
    y += 7;
    ctx.fillText('(see instructions), I declare my appraisal fee is not based on a percentage of the property appraised.', leftMargin, y);
    
    y += 12;
    
    if (donation.appraisal) {
        ctx.font = '7px Inter';
        ctx.fillText('Appraiser name:', leftMargin, y);
        ctx.font = '8px Inter';
        ctx.fillText(donation.appraisal.appraiserName, leftMargin + 70, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Address:', leftMargin, y);
        ctx.font = '8px Inter';
        ctx.fillText(donation.appraisal.appraiserAddress, leftMargin + 45, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Appraiser qualifications:', leftMargin, y);
        ctx.font = '6px Inter';
        ctx.fillText(donation.appraisal.appraiserQualifications.substring(0, 95), leftMargin + 90, y);
        
        y += 10;
        ctx.font = '7px Inter';
        ctx.fillText('Date of appraisal:', leftMargin, y);
        ctx.font = '8px Inter';
        ctx.fillText(formatDateMMDDYYYY(donation.appraisal.appraisalDate), leftMargin + 75, y);
        ctx.fillText('Appraised FMV:', leftMargin + 200, y);
        ctx.fillText(formatMoney(donation.amount), leftMargin + 275, y);
    }
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('Signature ▶', leftMargin, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 50, y + 2);
    ctx.lineTo(leftMargin + 280, y + 2);
    ctx.stroke();
    ctx.fillText('Title ▶', leftMargin + 290, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 315, y + 2);
    ctx.lineTo(leftMargin + 420, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', leftMargin + 430, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 455, y + 2);
    ctx.lineTo(rightMargin, y + 2);
    ctx.stroke();
    
    y += 18;
    
    // ===== PART V - Donee Acknowledgment =====
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part V', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Donee Acknowledgment—To be completed by the charitable organization.', leftMargin + 35, y);
    
    y += 10;
    ctx.font = '6px Inter';
    ctx.fillText('This charitable organization acknowledges that it is a qualified organization under section 170(c) and that it received the donated property as described', leftMargin, y);
    y += 7;
    ctx.fillText('in Part I, Section B, above on the following date ▶', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText(formatDateMMDDYYYY(donation.contributionDate), leftMargin + 200, y);
    
    y += 12;
    ctx.font = '7px Inter';
    ctx.fillText('Donee name:', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.name, leftMargin + 60, y);
    ctx.font = '7px Inter';
    ctx.fillText('EIN:', leftMargin + 320, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.ein, leftMargin + 340, y);
    
    y += 10;
    ctx.font = '7px Inter';
    ctx.fillText('Address:', leftMargin, y);
    ctx.font = '8px Inter';
    ctx.fillText(donation.donee.address.substring(0, 75), leftMargin + 45, y);
    
    y += 14;
    ctx.font = '7px Inter';
    ctx.fillText('Authorized signature ▶', leftMargin, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 90, y + 2);
    ctx.lineTo(leftMargin + 300, y + 2);
    ctx.stroke();
    ctx.fillText('Title ▶', leftMargin + 310, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 335, y + 2);
    ctx.lineTo(leftMargin + 440, y + 2);
    ctx.stroke();
    ctx.fillText('Date ▶', leftMargin + 450, y);
    ctx.beginPath();
    ctx.moveTo(leftMargin + 475, y + 2);
    ctx.lineTo(rightMargin, y + 2);
    ctx.stroke();
    
    // Footer
    ctx.font = '7px Inter';
    ctx.textAlign = 'right';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Form 8283 (Rev. 12-2023)', rightMargin, height - 25);
    
    addWatermark(ctx, width, height);
    
    return canvas.toBuffer('image/png');
}

// Main
async function main() {
    console.log('Generating exact replica Form 8283...\n');
    
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
