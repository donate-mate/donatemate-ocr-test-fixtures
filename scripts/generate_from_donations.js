#!/usr/bin/env node
/**
 * Generate OCR test documents from donations.json
 * Each form for a donation has consistent donor/donee/date/amount data
 */

const { createCanvas, registerFont } = require('canvas');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const { applyFixtureRevision } = require('./png_fixture_revision');

// Load font if available
const fontPath = path.join(__dirname, '..', 'fonts', 'Inter.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Inter' });
}

const DONATIONS_PATH = path.join(__dirname, '..', 'donations.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'documents');
const MANIFEST_GENERATED_AT = '2026-07-31T00:00:00.000Z';

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
    stock_confirmation: generateStockConfirmation,
    gofundme_receipt: generateGoFundMeReceipt
};

const formsWithAcquisitionDate = new Set([
    'form_8283_section_a',
    'form_8283_section_b'
]);

const onlyDonationIds = parseFilter(process.env.ONLY_DONATIONS);
const onlyFormTypes = parseFilter(process.env.ONLY_FORMS);
const hasGenerationFilter = Boolean(onlyDonationIds || onlyFormTypes);

// Utility functions
function parseFilter(value) {
    const items = (value || '').split(',').map(item => item.trim()).filter(Boolean);
    return items.length ? new Set(items) : null;
}

function shouldGenerateImage(donation, formType) {
    return (!onlyDonationIds || onlyDonationIds.has(donation.id)) &&
        (!onlyFormTypes || onlyFormTypes.has(formType));
}

function parseFixtureDate(dateStr) {
    const match = typeof dateStr === 'string' && dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    return new Date(dateStr);
}

function getFixtureYear(dateStr) {
    const match = typeof dateStr === 'string' && dateStr.match(/^(\d{4})-\d{2}-\d{2}$/);
    return match ? Number(match[1]) : new Date(dateStr).getFullYear();
}

function formatDate(dateStr) {
    const d = parseFixtureDate(dateStr);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid fixture date: ${dateStr}`);
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
        .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
        .join('-');
}

function formatDateShort(dateStr) {
    return formatDate(dateStr);
}

function formatMoney(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getGoFundMeReceiptAmounts(donation) {
    const donationAmount = donation.amount;
    const tip = donation.tip || 0;
    return {
        donationAmount,
        tip,
        total: donationAmount + tip
    };
}

function maskedTaxpayerId(donation) {
    const donorKey = [
        donation.donor?.name,
        donation.donor?.address,
        donation.donor?.city,
        donation.donor?.state,
        donation.donor?.zip
    ].filter(Boolean).join('|');
    const digest = createHash('sha256').update(donorKey).digest();
    const suffix = (digest.readUInt32BE(0) % 10000).toString().padStart(4, '0');
    return `XXX-XX-${suffix}`;
}

function syntheticAppraiserTaxId(appraisal) {
    const digest = createHash('sha256')
        .update([appraisal.appraiserName, appraisal.appraiserAddress].join('|'))
        .digest();
    const suffix = (digest.readUInt32BE(0) % 10000).toString().padStart(4, '0');
    return `000-00-${suffix}`;
}

function syntheticDoneeSigner(donee) {
    const names = [
        'Avery Morgan',
        'Casey Taylor',
        'Jordan Ellis',
        'Morgan Reed',
        'Riley Parker',
        'Taylor Brooks'
    ];
    const digest = createHash('sha256').update(`${donee.name}|${donee.ein}`).digest();
    return {
        name: names[digest[0] % names.length],
        title: 'Authorized Financial Officer'
    };
}

function getForm8283FmvMethod(donation) {
    if (donation.valuationMethod) {
        return donation.valuationMethod;
    }
    if (donation.appraisal?.valuationMethod) {
        return donation.appraisal.valuationMethod;
    }
    if (donation.security?.shares && donation.security?.pricePerShare) {
        return `${donation.security.shares} shares at ${formatMoney(donation.security.pricePerShare)}`;
    }
    if (donation.saleInfo?.soldAtAuction) {
        return 'Gross proceeds';
    }
    return '';
}

function getForm8283PropertyDescription(donation) {
    if (donation.assetType !== 'vehicle') {
        return donation.assetDescription;
    }

    const vehicle = donation.vehicle;
    if (
        !vehicle?.year ||
        !vehicle?.make ||
        !vehicle?.model ||
        !vehicle?.vin ||
        vehicle?.mileage == null
    ) {
        throw new Error(`Vehicle data is incomplete for Form 8283-A: ${donation.id}`);
    }

    return [
        `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        `${vehicle.mileage.toLocaleString('en-US')} miles`,
        `VIN ${vehicle.vin}`
    ].join(', ');
}

function getDetailedPropertyDescription(donation) {
    if (donation.assetType === 'vehicle') {
        return getForm8283PropertyDescription(donation);
    }
    if (donation.security) {
        return `${donation.security.shares} shares of ${donation.security.name}; ${donation.security.companyDescription}`;
    }
    if (donation.property) {
        return [
            donation.property.description,
            donation.property.address,
            `Legal description: ${donation.property.legalDescription}`,
            `Parcel: ${donation.property.parcelNumber}`
        ].join('; ');
    }
    return donation.assetDescription || donation.description;
}

function getForm8283PropertyCategory(donation) {
    if (donation.assetType === 'stock_closelyheld') return 'f  Securities (nonpublicly traded)';
    if (donation.assetType === 'real_estate') return 'h  Other real estate';
    if (donation.assetType === 'vehicle') return 'i  Vehicles';
    if (/rug|textile|painting|sculpture|art/i.test(donation.assetDescription || '')) {
        return 'a  Art';
    }
    return 'j  Other property';
}

function getAppraisalRestrictionStatement(donation) {
    if (donation.saleInfo?.transferredToNeedy) {
        return 'Donee intends a gratuitous or significantly below-FMV transfer to a qualified needy individual.';
    }
    return 'No agreements, restrictions, or understandings affecting use, sale, or disposition were disclosed.';
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

function drawWrappedText(ctx, text, x, y, maxWidth, maxLines, lineHeight, fieldName) {
    if (!text) {
        return [];
    }

    const lines = wrapText(ctx, String(text), maxWidth);
    if (
        lines.length > maxLines ||
        lines.some(line => ctx.measureText(line).width > maxWidth)
    ) {
        throw new Error(`${fieldName} does not fit Form 8283-A: ${text}`);
    }

    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
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
    
    const isSectionBAcknowledgment = donation.forms.includes('form_8283_section_b');

    // Body
    let bodyText;
    if (donation.assetType === 'cash') {
        bodyText = `Thank you for your generous cash contribution of ${formatMoney(donation.amount)} to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    } else if (isSectionBAcknowledgment) {
        bodyText = `Thank you for your generous donation of ${getDetailedPropertyDescription(donation)} to ${donation.donee.name} on ${formatDate(donation.contributionDate)}. No value was assigned by the donee; the donor is responsible for determining fair market value.`;
    } else if (donation.assetType === 'vehicle') {
        const vehicle = donation.vehicle;
        bodyText = `Thank you for your generous donation of a ${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin}, estimated fair market value: ${formatMoney(donation.amount)}) to ${donation.donee.name} on ${formatDate(donation.contributionDate)}.`;
    } else if (donation.assetType.startsWith('stock')) {
        bodyText = `Thank you for your generous donation of ${donation.assetDescription || 'securities'} to ${donation.donee.name} on ${formatDate(donation.contributionDate)}. No value was assigned by the donee; the donor is responsible for determining fair market value.`;
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
    const disclosure = isSectionBAcknowledgment
        ? 'No goods or services were provided in exchange for this contribution. This letter describes the donated property without assigning a value and is the contemporaneous written acknowledgment required by IRC section 170(f)(8).'
        : 'No goods or services were provided in exchange for this contribution. The entire amount of your donation is tax-deductible to the extent allowed by law. This letter serves as your written acknowledgment required for contributions of $250 or more.';
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
    if (isSectionBAcknowledgment) {
        const signer = syntheticDoneeSigner(donation.donee);
        ctx.font = 'italic 12px Inter';
        ctx.fillText(`/s/ ${signer.name}`, 50, y);
        y += 15;
        ctx.font = '11px Inter';
        ctx.fillText(`${signer.name}, ${signer.title}`, 50, y);
        y += 15;
    } else {
        ctx.font = 'italic 12px Inter';
        ctx.fillText('Executive Director', 50, y);
        y += 15;
        ctx.font = '11px Inter';
    }
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
    ctx.fillText(`RCP-${donation.id}-${getFixtureYear(donation.contributionDate)}`, 155, y + 18);
    ctx.fillText(formatDate(donation.contributionDate), 140, y + 36);
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

// Non-deductible crowdfunding payment confirmation (e.g. GoFundMe personal fundraiser).
// Deliberately NOT a 501(c)(3) receipt: money goes to an individual organizer, no EIN,
// and the document states the contribution is not tax deductible.
function generateGoFundMeReceipt(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const c = donation.campaign || {};
    const amounts = getGoFundMeReceiptAmounts(donation);

    // Brand header
    ctx.fillStyle = '#02a95c';
    ctx.fillRect(0, 0, width, 70);
    ctx.font = 'bold 26px Inter';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText('GoFundMe', 30, 45);
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText('Donation Receipt', width - 30, 43);

    let y = 110;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 16px Inter';
    ctx.fillText('Thanks for your donation!', 40, y);

    y += 24;
    ctx.font = '11px Inter';
    ctx.fillStyle = '#555555';
    const intro = `Hi ${donation.donor.name.split(' ')[0]}, your contribution to the fundraiser below has been received.`;
    for (const line of wrapText(ctx, intro, width - 80)) { ctx.fillText(line, 40, y); y += 16; }

    y += 14;
    // Campaign box
    ctx.fillStyle = '#f4faf6';
    ctx.fillRect(40, y, width - 80, 72);
    ctx.strokeStyle = '#cce9d8';
    ctx.strokeRect(40, y, width - 80, 72);
    ctx.fillStyle = '#02a95c';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('FUNDRAISER', 52, y + 20);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 13px Inter';
    ctx.fillText((c.title || 'Personal Fundraiser'), 52, y + 40);
    ctx.font = '10px Inter';
    ctx.fillStyle = '#555555';
    ctx.fillText(`Organized by ${c.organizer || 'Campaign Organizer'}   |   Benefiting ${c.beneficiary || c.organizer || 'the organizer'}`, 52, y + 60);

    y += 98;

    // Receipt meta
    ctx.font = '10px Inter';
    ctx.fillStyle = '#777777';
    ctx.fillText('Confirmation #', 40, y);
    ctx.fillText('Date', 320, y);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '11px Inter';
    ctx.fillText(donation.transactionId || `GFM-${donation.id}`, 135, y);
    ctx.fillText(formatDate(donation.contributionDate), 360, y);
    y += 20;
    ctx.font = '10px Inter';
    ctx.fillStyle = '#777777';
    ctx.fillText('Payment method', 40, y);
    ctx.fillText('Donor', 320, y);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '11px Inter';
    ctx.fillText(donation.paymentMethod || 'Credit card', 135, y);
    ctx.fillText(donation.donor.name, 360, y);

    y += 32;
    // Amount breakdown
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(width - 40, y); ctx.stroke();
    y += 24;
    ctx.font = '11px Inter';
    ctx.fillStyle = '#333333';
    ctx.fillText('Your donation', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatMoney(amounts.donationAmount), width - 40, y);
    ctx.textAlign = 'left';
    y += 20;
    ctx.fillText('GoFundMe tip', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatMoney(amounts.tip), width - 40, y);
    ctx.textAlign = 'left';
    y += 14;
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(width - 40, y); ctx.stroke();
    y += 22;
    ctx.font = 'bold 13px Inter';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('Total charged', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatMoney(amounts.total), width - 40, y);
    ctx.textAlign = 'left';

    y += 38;
    // Non-deductible disclaimer (prominent)
    const boxH = 96;
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(40, y, width - 80, boxH);
    ctx.strokeStyle = '#f0c36d';
    ctx.strokeRect(40, y, width - 80, boxH);
    ctx.fillStyle = '#8a5a00';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('This donation is NOT tax deductible', 52, y + 22);
    ctx.font = '9.5px Inter';
    ctx.fillStyle = '#5a4300';
    const disc = 'Donations to personal GoFundMe fundraisers are made to the organizer, not to a registered 501(c)(3) charity. GoFundMe is a for-profit company and does not issue tax-deductible receipts. No goods or services were exchanged. Please consult a tax advisor regarding deductibility.';
    let dy = y + 40;
    for (const line of wrapText(ctx, disc, width - 104)) { ctx.fillText(line, 52, dy); dy += 13; }

    y += boxH + 28;
    ctx.textAlign = 'center';
    ctx.font = '8px Inter';
    ctx.fillStyle = '#999999';
    ctx.fillText('GoFundMe, Inc.   |   P.O. Box 122474, San Diego, CA 92112   |   support@gofundme.com', width / 2, height - 50);
    ctx.fillText('This is a payment confirmation, not a charitable tax receipt.', width / 2, height - 36);

    addWatermark(ctx, width, height);

    return canvas.toBuffer('image/png');
}

function generateForm8283A(donation) {
    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const margin = 30;
    const contentWidth = width - margin * 2;

    function drawGrid(top, cellWidths, cellHeight) {
        ctx.strokeRect(margin, top, contentWidth, cellHeight);
        let offset = 0;
        for (const cellWidth of cellWidths.slice(0, -1)) {
            offset += cellWidth;
            ctx.beginPath();
            ctx.moveTo(margin + offset, top);
            ctx.lineTo(margin + offset, top + cellHeight);
            ctx.stroke();
        }
    }

    function cellX(cellWidths, index) {
        return margin + cellWidths.slice(0, index).reduce((sum, cellWidth) => sum + cellWidth, 0);
    }

    function drawLabelLines(lines, x, top, lineHeight = 8) {
        lines.forEach((line, index) => ctx.fillText(line, x, top + index * lineHeight));
    }

    let y = 30;

    // Form header
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = '#000000';
    ctx.fillText('Form 8283', margin, y);
    ctx.font = '9px Inter';
    ctx.fillText('(Rev. December 2023)', margin, y + 12);
    ctx.fillText('Department of the Treasury', margin, y + 24);
    ctx.fillText('Internal Revenue Service', margin, y + 36);

    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 15);
    ctx.font = '7.5px Inter';
    ctx.fillText('Attach one or more Forms 8283 to your tax return if you claimed', width / 2, y + 29);
    ctx.fillText('a total deduction of over $500 for all contributed property.', width / 2, y + 39);
    ctx.fillText('Go to www.irs.gov/Form8283 for instructions and the latest information.', width / 2, y + 49);

    ctx.textAlign = 'right';
    ctx.font = '9px Inter';
    ctx.fillText('OMB No. 1545-0074', width - margin, y);
    ctx.fillText('Attachment', width - margin, y + 15);
    ctx.fillText('Sequence No. 155', width - margin, y + 27);

    y += 60;
    ctx.textAlign = 'left';

    // Taxpayer info box
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.75;
    const identifyingNumberWidth = 140;
    ctx.strokeRect(margin, y, contentWidth - identifyingNumberWidth, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Name(s) shown on your income tax return', margin + 5, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText(donation.donor.name, margin + 5, y + 30);

    const identifyingNumberX = margin + contentWidth - identifyingNumberWidth;
    ctx.strokeRect(identifyingNumberX, y, identifyingNumberWidth, 40);
    ctx.font = '8px Inter';
    ctx.fillText('Identifying number', identifyingNumberX + 5, y + 12);
    ctx.font = '11px Inter';
    ctx.fillText(maskedTaxpayerId(donation), identifyingNumberX + 5, y + 30);

    y += 51;
    ctx.font = '7px Inter';
    ctx.fillText(
        'Note: Figure the amount of your contribution deduction before completing this form. See your tax return instructions.',
        margin,
        y
    );

    y += 10;

    // Section A header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(margin, y, contentWidth, 36);
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = '#000000';
    drawLabelLines([
        'Section A. Donated Property of $5,000 or Less and Publicly Traded Securities—List in this section only an item',
        '(or a group of similar items) for which you claimed a deduction of $5,000 or less. Also list publicly traded',
        'securities and certain other property even if the deduction is more than $5,000. See instructions.'
    ], margin + 4, y + 10, 10);

    y += 48;
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Part I', margin, y);
    ctx.font = '8px Inter';
    ctx.fillText('Information on Donated Property—If you need more space, attach a statement.', margin + 30, y);

    y += 10;

    // IRS Section A line 1 is split into two tables. Keeping that structure gives
    // every value enough room and prevents adjacent OCR fields from bleeding together.
    const primaryWidths = [18, 132, 100, 302];
    const primaryHeaderHeight = 55;
    drawGrid(y, primaryWidths, primaryHeaderHeight);
    ctx.font = '6px Inter';
    ctx.fillText('1', cellX(primaryWidths, 0) + 7, y + 28);
    drawLabelLines(
        ['(a) Name and address of the', 'donee organization'],
        cellX(primaryWidths, 1) + 3,
        y + 15
    );
    drawLabelLines(
        [
            '(b) If donated property is a',
            'vehicle, check the box. Enter',
            'the VIN unless Form 1098-C',
            'is attached.'
        ],
        cellX(primaryWidths, 2) + 3,
        y + 10
    );
    drawLabelLines(
        [
            '(c) Description and condition of donated property',
            '(For a vehicle, enter the year, make, model, and mileage.',
            'For securities and other property, see instructions.)'
        ],
        cellX(primaryWidths, 3) + 3,
        y + 15
    );

    y += primaryHeaderHeight;
    const primaryDataHeight = 72;
    drawGrid(y, primaryWidths, primaryDataHeight);
    ctx.font = 'bold 8px Inter';
    ctx.fillText('A', cellX(primaryWidths, 0) + 6, y + 38);

    const doneeX = cellX(primaryWidths, 1) + 3;
    ctx.font = '7.5px Inter';
    const doneeNameLines = drawWrappedText(
        ctx,
        donation.donee.name,
        doneeX,
        y + 12,
        primaryWidths[1] - 6,
        2,
        9,
        'Donee name'
    );
    ctx.font = '6.5px Inter';
    drawWrappedText(
        ctx,
        donation.donee.address,
        doneeX,
        y + 15 + doneeNameLines.length * 9,
        primaryWidths[1] - 6,
        3,
        8,
        'Donee address'
    );

    const vehicleX = cellX(primaryWidths, 2);
    ctx.strokeRect(vehicleX + 7, y + 13, 9, 9);
    if (donation.assetType === 'vehicle') {
        ctx.font = 'bold 10px Inter';
        ctx.fillText('✓', vehicleX + 7, y + 22);
        ctx.font = '6.5px Inter';
        drawLabelLines(
            ['Form 1098-C', 'attached'],
            vehicleX + 22,
            y + 18,
            9
        );
    }

    const descriptionX = cellX(primaryWidths, 3) + 3;
    ctx.font = '8px Inter';
    const descriptionLines = drawWrappedText(
        ctx,
        getForm8283PropertyDescription(donation),
        descriptionX,
        y + 17,
        primaryWidths[3] - 6,
        3,
        10,
        'Property description'
    );
    if (donation.assetCondition) {
        ctx.font = '7px Inter';
        ctx.fillText(
            `Condition: ${donation.assetCondition}`,
            descriptionX,
            y + 23 + descriptionLines.length * 10
        );
    }

    y += primaryDataHeight;
    ctx.font = '6px Inter';
    ctx.fillText(
        'Note: If the amount claimed as a deduction is $500 or less, columns (e), (f), and (g) are not required.',
        margin + 3,
        y + 11
    );
    y += 17;

    const detailWidths = [18, 74, 74, 112, 82, 80, 112];
    const detailHeaderHeight = 42;
    drawGrid(y, detailWidths, detailHeaderHeight);
    ctx.font = '6px Inter';
    ctx.fillText('A', cellX(detailWidths, 0) + 6, y + 24);
    drawLabelLines(['(d) Date of the', 'contribution'], cellX(detailWidths, 1) + 3, y + 14);
    drawLabelLines(['(e) Date acquired', 'by donor (mo., yr.)'], cellX(detailWidths, 2) + 3, y + 14);
    drawLabelLines(['(f) How acquired', 'by donor'], cellX(detailWidths, 3) + 3, y + 14);
    drawLabelLines(['(g) Donor’s cost', 'or adjusted basis'], cellX(detailWidths, 4) + 3, y + 14);
    drawLabelLines(['(h) Fair market value', '(see instructions)'], cellX(detailWidths, 5) + 3, y + 14);
    drawLabelLines(
        ['(i) Method used to', 'determine the fair', 'market value'],
        cellX(detailWidths, 6) + 3,
        y + 10
    );

    y += detailHeaderHeight;
    const detailDataHeight = 42;
    drawGrid(y, detailWidths, detailDataHeight);
    ctx.font = '7px Inter';
    ctx.fillText(formatDateShort(donation.contributionDate), cellX(detailWidths, 1) + 4, y + 24);
    ctx.fillText(
        donation.dateAcquired ? formatDateShort(donation.dateAcquired) : 'Various',
        cellX(detailWidths, 2) + 4,
        y + 24
    );
    drawWrappedText(
        ctx,
        donation.howAcquired || 'Purchase',
        cellX(detailWidths, 3) + 4,
        y + 16,
        detailWidths[3] - 8,
        2,
        10,
        'Acquisition method'
    );
    ctx.fillText(
        donation.costBasis != null ? formatMoney(donation.costBasis) : 'N/A',
        cellX(detailWidths, 4) + 4,
        y + 24
    );
    ctx.font = 'bold 7px Inter';
    ctx.fillText(formatMoney(donation.amount), cellX(detailWidths, 5) + 4, y + 24);
    ctx.font = '7px Inter';
    drawWrappedText(
        ctx,
        getForm8283FmvMethod(donation),
        cellX(detailWidths, 6) + 4,
        y + 16,
        detailWidths[6] - 8,
        2,
        10,
        'FMV method'
    );

    ctx.font = '7px Inter';
    ctx.fillText('For Paperwork Reduction Act Notice, see separate instructions.', margin, height - 28);
    ctx.textAlign = 'right';
    ctx.fillText('Form 8283 (Rev. 12-2023)', width - margin, height - 28);
    ctx.textAlign = 'left';

    addWatermark(ctx, width, height);

    return canvas.toBuffer('image/png');
}

function generateForm8283B(donation) {
    if (!donation.appraisal) {
        throw new Error(`Section B requires qualified-appraisal metadata: ${donation.id}`);
    }

    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const appraisal = donation.appraisal;
    const signer = syntheticDoneeSigner(donation.donee);
    const propertyDescription = getDetailedPropertyDescription(donation);
    const condition = donation.assetType === 'stock_closelyheld'
        ? 'Not applicable—intangible nonpublicly traded security'
        : donation.assetCondition || donation.vehicle?.condition || donation.property?.description || 'Good';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.6;

    let y = 25;
    ctx.font = 'bold 15px Inter';
    ctx.fillText('Form 8283', 25, y);
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. December 2025)', 25, y + 12);
    ctx.font = 'bold 15px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Noncash Charitable Contributions', width / 2, y + 7);
    ctx.font = '8px Inter';
    ctx.fillText('Section B—Donated Property Over $5,000 (Except Publicly Traded Securities)', width / 2, y + 21);
    ctx.textAlign = 'right';
    ctx.fillText('OMB No. 1545-0908', width - 25, y);
    ctx.textAlign = 'left';

    y += 42;
    ctx.strokeRect(25, y, 405, 34);
    ctx.strokeRect(430, y, 157, 34);
    ctx.font = '7px Inter';
    ctx.fillText('Name(s) shown on income tax return', 29, y + 9);
    ctx.fillText('Identifying number', 434, y + 9);
    ctx.font = '10px Inter';
    ctx.fillText(donation.donor.name, 29, y + 25);
    ctx.fillText(maskedTaxpayerId(donation), 434, y + 25);

    y += 44;
    ctx.fillStyle = '#dedede';
    ctx.fillRect(25, y, 562, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part I   Information on Donated Property—A separate written qualified appraisal is required.', 30, y + 13);

    y += 30;
    ctx.font = '8px Inter';
    ctx.fillText(`2  Property type: [X] ${getForm8283PropertyCategory(donation)}`, 25, y);
    y += 14;
    ctx.fillText('3(a) Detailed description:', 25, y);
    ctx.strokeRect(25, y + 5, 562, 40);
    ctx.font = '8px Inter';
    drawWrappedText(ctx, propertyDescription, 31, y + 18, 550, 3, 10, 'Form 8283-B property description');
    y += 56;
    ctx.font = '8px Inter';
    ctx.fillText(`3(b) Physical condition: ${condition}`, 25, y);
    y += 15;
    ctx.fillText(`3(c) Appraised FMV: ${formatMoney(donation.amount)}`, 25, y);
    ctx.fillText(`3(d) Date acquired: ${formatDateShort(donation.dateAcquired)}`, 220, y);
    ctx.fillText(`3(e) How acquired: ${donation.howAcquired}`, 405, y);
    y += 15;
    ctx.fillText(`3(f) Cost or adjusted basis: ${formatMoney(donation.costBasis)}`, 25, y);
    ctx.fillText(`Date contributed: ${formatDateShort(donation.contributionDate)}`, 220, y);
    y += 15;
    ctx.fillText(`Qualified-appraisal valuation method: ${appraisal.valuationMethod}`, 25, y);

    y += 24;
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part II   Partial Interests and Restricted Use Property', 25, y);
    ctx.font = '8px Inter';
    ctx.fillText('Not applicable—entire interest donated and no restricted-use conditions.', 275, y);

    y += 24;
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part III   Taxpayer (Donor) Statement', 25, y);
    ctx.font = '8px Inter';
    ctx.fillText('Not applicable—no item in this appraisal group has an appraised value of $500 or less.', 215, y);

    y += 26;
    ctx.fillStyle = '#dedede';
    ctx.fillRect(25, y, 562, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part IV   Declaration of Appraiser', 30, y + 13);
    y += 30;
    ctx.font = '7px Inter';
    const declaration = 'I declare that I am a qualified appraiser; I am not the donor, donee, or a party to this transaction; and the appraisal fee was not based on the appraised value. I understand the penalties for a substantial or gross valuation misstatement.';
    drawWrappedText(ctx, declaration, 25, y, 562, 3, 10, 'Form 8283-B appraiser declaration');
    y += 36;
    ctx.font = '8px Inter';
    ctx.fillText(`Appraiser name: ${appraisal.appraiserName}`, 25, y);
    ctx.fillText(`Identifying number: ${syntheticAppraiserTaxId(appraisal)}`, 380, y);
    y += 14;
    ctx.fillText(`Business address: ${appraisal.appraiserAddress}`, 25, y);
    y += 14;
    ctx.fillText('Qualifications:', 25, y);
    drawWrappedText(ctx, appraisal.appraiserQualifications, 100, y, 480, 2, 10, 'Form 8283-B appraiser qualifications');
    y += 24;
    ctx.font = 'italic 9px Inter';
    ctx.fillText(`Appraiser signature: /s/ ${appraisal.appraiserName}`, 25, y);
    ctx.font = '8px Inter';
    ctx.fillText(`Date signed: ${formatDateShort(appraisal.appraisalDate)}`, 410, y);

    y += 28;
    ctx.fillStyle = '#dedede';
    ctx.fillRect(25, y, 562, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('Part V   Donee Acknowledgment', 30, y + 13);
    y += 30;
    ctx.font = '7px Inter';
    const acknowledgment = 'The charitable organization acknowledges receipt of the property described in Part I and represents that it is an organization qualified under section 170(c). This acknowledgment does not represent agreement with the appraised fair market value.';
    drawWrappedText(ctx, acknowledgment, 25, y, 562, 3, 10, 'Form 8283-B donee acknowledgment');
    y += 36;
    ctx.font = '8px Inter';
    ctx.fillText(`Donee: ${donation.donee.name}`, 25, y);
    ctx.fillText(`EIN: ${donation.donee.ein}`, 425, y);
    y += 14;
    ctx.fillText(`Address: ${donation.donee.address}`, 25, y);
    y += 14;
    ctx.fillText(`Property received: ${formatDateShort(donation.contributionDate)}`, 25, y);
    ctx.fillText('Intended unrelated use: [ ] Yes   [X] No', 250, y);
    y += 16;
    ctx.fillText(`Authorized official: ${signer.name}`, 25, y);
    ctx.fillText(`Title: ${signer.title}`, 310, y);
    y += 16;
    ctx.font = 'italic 9px Inter';
    ctx.fillText(`Donee signature: /s/ ${signer.name}`, 25, y);
    ctx.font = '8px Inter';
    ctx.fillText(`Date signed: ${formatDateShort(donation.contributionDate)}`, 410, y);

    ctx.font = '7px Inter';
    ctx.fillText('Synthetic Copy B fixture—SAMPLE FOR TESTING ONLY', 25, height - 24);
    ctx.textAlign = 'right';
    ctx.fillText('Form 8283 (Rev. 12-2025)', width - 25, height - 24);
    ctx.textAlign = 'left';
    addWatermark(ctx, width, height);
    return canvas.toBuffer('image/png');
}

function generateForm1098C(donation) {
    if (!donation.vehicle || !donation.saleInfo) {
        throw new Error(`Form 1098-C requires vehicle and disposition data: ${donation.id}`);
    }

    const soldAtArmsLength = donation.saleInfo.soldAtAuction === true;
    const transferredToNeedy = donation.saleInfo.transferredToNeedy === true;
    if (soldAtArmsLength === transferredToNeedy) {
        throw new Error(`Form 1098-C requires exactly one disposition path: ${donation.id}`);
    }
    if (soldAtArmsLength && (!donation.saleInfo.saleDate || donation.saleInfo.grossProceeds == null)) {
        throw new Error(`Arm's-length sale requires date and gross proceeds: ${donation.id}`);
    }

    const width = 612, height = 650;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const vehicle = donation.vehicle;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.6;

    let y = 24;
    ctx.font = 'bold 13px Inter';
    ctx.fillText('Form 1098-C', 25, y);
    ctx.font = '8px Inter';
    ctx.fillText('(Rev. January 2025)', 25, y + 12);
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Contributions of Motor Vehicles, Boats, and Airplanes', width / 2, y + 7);
    ctx.textAlign = 'right';
    ctx.font = '8px Inter';
    ctx.fillText('OMB No. 1545-1959', width - 25, y);
    ctx.fillText('Copy B—For Donor', width - 25, y + 12);
    ctx.textAlign = 'left';

    y += 42;
    ctx.strokeRect(25, y, 275, 92);
    ctx.strokeRect(300, y, 287, 92);
    ctx.font = '7px Inter';
    ctx.fillText("DONEE'S name, address, ZIP code, and telephone number", 30, y + 10);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donee.name, 30, y + 27);
    ctx.font = '8px Inter';
    drawWrappedText(ctx, donation.donee.address, 30, y + 42, 260, 2, 10, 'Form 1098-C donee address');
    ctx.fillText('Telephone: (555) 010-8283', 30, y + 68);
    ctx.fillText(`DONEE'S TIN: ${donation.donee.ein}`, 30, y + 82);

    ctx.font = '7px Inter';
    ctx.fillText("DONOR'S name, address, ZIP code, and TIN", 305, y + 10);
    ctx.font = '9px Inter';
    ctx.fillText(donation.donor.name, 305, y + 27);
    ctx.font = '8px Inter';
    drawWrappedText(ctx, formatAddress(donation.donor), 305, y + 42, 272, 2, 10, 'Form 1098-C donor address');
    ctx.fillText(`DONOR'S TIN: ${maskedTaxpayerId(donation)}`, 305, y + 82);

    y += 104;
    ctx.strokeRect(25, y, 562, 72);
    ctx.font = '8px Inter';
    ctx.fillText(`1  Date of contribution: ${formatDateShort(donation.contributionDate)}`, 31, y + 16);
    ctx.fillText(`2a  Odometer mileage: ${vehicle.mileage.toLocaleString('en-US')}`, 205, y + 16);
    ctx.fillText(`2b  Year: ${vehicle.year}`, 390, y + 16);
    ctx.fillText(`2c  Make: ${vehicle.make}`, 485, y + 16);
    ctx.fillText(`2d  Model: ${vehicle.model}`, 31, y + 38);
    ctx.font = 'bold 8px Inter';
    ctx.fillText(`3  Vehicle identification number: ${vehicle.vin}`, 205, y + 38);
    ctx.font = '7px Inter';
    ctx.fillText('Vehicle identity fields are complete and internally consistent with the linked donation.', 31, y + 61);

    y += 84;
    ctx.strokeRect(25, y, 562, 88);
    ctx.font = 'bold 8px Inter';
    ctx.fillText(`4a  [${soldAtArmsLength ? 'X' : ' '}] Vehicle sold in arm's-length transaction to an unrelated party`, 31, y + 16);
    ctx.font = '8px Inter';
    ctx.fillText(`4b  Date of sale: ${soldAtArmsLength ? formatDateShort(donation.saleInfo.saleDate) : ''}`, 31, y + 38);
    ctx.fillText(`4c  Gross proceeds: ${soldAtArmsLength ? formatMoney(donation.saleInfo.grossProceeds) : ''}`, 300, y + 38);
    ctx.font = '7px Inter';
    ctx.fillText(soldAtArmsLength
        ? 'Donor deduction is limited to the certified gross proceeds shown in box 4c.'
        : 'Boxes 4b and 4c are intentionally blank because box 4a is not checked.', 31, y + 65);

    y += 100;
    ctx.strokeRect(25, y, 562, 104);
    ctx.font = 'bold 8px Inter';
    ctx.fillText('5a  [ ] Vehicle will not be transferred before material improvements or significant intervening use', 31, y + 16);
    ctx.fillText(`5b  [${transferredToNeedy ? 'X' : ' '}] Vehicle transferred to a needy individual for significantly below FMV`, 31, y + 39);
    ctx.font = '8px Inter';
    ctx.fillText('5c  Description of material improvements or significant intervening use:', 31, y + 62);
    ctx.font = '7px Inter';
    ctx.fillText(transferredToNeedy
        ? `Not applicable—box 5b transfer in direct furtherance of charitable purpose (${donation.saleInfo.recipientDescription}).`
        : '', 31, y + 82);
    if (transferredToNeedy) {
        ctx.fillText(`FMV substantiation amount: ${formatMoney(donation.amount)} (qualified appraisal and Form 8283-B attached).`, 31, y + 96);
    }

    y += 116;
    ctx.strokeRect(25, y, 562, 70);
    ctx.font = 'bold 8px Inter';
    ctx.fillText('6a  Did the donee provide goods or services in exchange for the vehicle?  [ ] Yes   [X] No', 31, y + 16);
    ctx.font = '8px Inter';
    ctx.fillText('6b  Value of goods or services:', 31, y + 38);
    ctx.fillText('6c  Description:', 300, y + 38);
    ctx.fillText('7  [ ] Claimed value is $500 or less, or donor did not provide a TIN', 31, y + 59);

    ctx.font = '7px Inter';
    ctx.fillText('This synthetic Copy B is a contemporaneous written acknowledgment for the described vehicle contribution.', 25, height - 30);
    ctx.textAlign = 'right';
    ctx.fillText('Form 1098-C (Rev. 1-2025)', width - 25, height - 30);
    ctx.textAlign = 'left';
    addWatermark(ctx, width, height);
    return canvas.toBuffer('image/png');
}

function generateAppraisal(donation) {
    if (!donation.appraisal) {
        throw new Error(`Qualified appraisal metadata is required: ${donation.id}`);
    }

    const width = 612, height = 792;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const appraisal = donation.appraisal;
    const propertyDescription = getDetailedPropertyDescription(donation);
    const condition = donation.assetType === 'stock_closelyheld'
        ? 'Intangible nonpublicly traded security; physical condition is not applicable.'
        : donation.assetCondition || donation.vehicle?.condition || donation.property?.description || 'Good';
    const valuationRationale = donation.security
        ? `The ${appraisal.valuationMethod} considered the entity's financial position, earning capacity, market evidence, and the donated ownership interest.`
        : donation.property
            ? `The ${appraisal.valuationMethod} considered comparable properties, location, condition, and relevant income characteristics.`
            : donation.vehicle
                ? `The ${appraisal.valuationMethod} considered year, make, model, VIN, mileage, condition, and comparable vehicle market data.`
                : `The ${appraisal.valuationMethod} considered condition, provenance, and recent sales of comparable property.`;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#222222';
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 0.7;

    let y = 38;
    ctx.font = 'bold 18px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('QUALIFIED APPRAISAL', width / 2, y);
    ctx.font = '9px Inter';
    ctx.fillText('Federal income tax charitable-contribution purpose • Regulations §1.170A-17', width / 2, y + 17);
    ctx.textAlign = 'left';

    y += 48;
    ctx.strokeRect(40, y, 532, 88);
    ctx.font = 'bold 10px Inter';
    ctx.fillText('REPORT DETAILS', 50, y + 17);
    ctx.font = '9px Inter';
    ctx.fillText(`Appraisal completed and signed: ${formatDateShort(appraisal.appraisalDate)}`, 50, y + 36);
    ctx.fillText(`Valuation effective date: ${formatDateShort(appraisal.appraisalDate)}`, 310, y + 36);
    ctx.fillText(`Contribution date: ${formatDateShort(donation.contributionDate)}`, 50, y + 53);
    ctx.fillText(`Valuation method: ${appraisal.valuationMethod}`, 310, y + 53);
    ctx.font = 'bold 11px Inter';
    ctx.fillText(`Appraised fair market value: ${formatMoney(donation.amount)}`, 50, y + 74);

    y += 108;
    ctx.font = 'bold 10px Inter';
    ctx.fillText('PROPERTY IDENTIFICATION AND CONDITION', 40, y);
    ctx.font = '8px Inter';
    drawWrappedText(ctx, propertyDescription, 40, y + 17, 532, 4, 11, 'Qualified appraisal property description');
    y += 66;
    ctx.fillText(`Condition: ${condition}`, 40, y);
    y += 15;
    ctx.fillText(`Acquired: ${formatDateShort(donation.dateAcquired)} by ${donation.howAcquired}; donor basis: ${formatMoney(donation.costBasis)}`, 40, y);

    y += 30;
    ctx.font = 'bold 10px Inter';
    ctx.fillText('PARTIES TO THE CONTRIBUTION', 40, y);
    ctx.font = '8px Inter';
    ctx.fillText(`Donor: ${donation.donor.name} • ${formatAddress(donation.donor)}`, 40, y + 17);
    ctx.fillText(`Donee: ${donation.donee.name} • EIN ${donation.donee.ein}`, 40, y + 32);
    ctx.fillText(`Donee address: ${donation.donee.address}`, 40, y + 47);

    y += 72;
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(40, y, 532, 128);
    ctx.strokeRect(40, y, 532, 128);
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('VALUATION ANALYSIS AND TERMS', 50, y + 18);
    ctx.font = '8px Inter';
    ctx.fillText(`Method and basis: ${appraisal.valuationMethod}`, 50, y + 36);
    drawWrappedText(ctx, valuationRationale, 50, y + 52, 512, 3, 11, 'Qualified appraisal valuation rationale');
    ctx.fillText('Agreements/restrictions:', 50, y + 88);
    drawWrappedText(ctx, getAppraisalRestrictionStatement(donation), 160, y + 88, 402, 2, 11, 'Qualified appraisal restrictions');
    ctx.fillText('Appraiser compensation: Fixed fee; not contingent on appraised value or deduction outcome.', 50, y + 116);

    y += 148;
    ctx.font = 'bold 10px Inter';
    ctx.fillText('QUALIFIED APPRAISER AND DECLARATION', 40, y);
    ctx.font = '8px Inter';
    ctx.fillText(`Name: ${appraisal.appraiserName}`, 40, y + 18);
    ctx.fillText(`Taxpayer identifying number: ${syntheticAppraiserTaxId(appraisal)}`, 340, y + 18);
    ctx.fillText(`Business address: ${appraisal.appraiserAddress}`, 40, y + 34);
    ctx.fillText('Qualifications:', 40, y + 50);
    drawWrappedText(ctx, appraisal.appraiserQualifications, 110, y + 50, 460, 2, 11, 'Qualified appraisal qualifications');
    const declaration = 'I hold myself out to the public as an appraiser, regularly perform appraisals, and am qualified by education and experience to value this property. I am not the donor, donee, acquisition counterparty, or otherwise prohibited from acting as qualified appraiser. I prepared this appraisal for federal income tax purposes and understand the applicable valuation-misstatement penalties.';
    drawWrappedText(ctx, declaration, 40, y + 82, 532, 5, 11, 'Qualified appraisal declaration');

    y += 150;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(380, y);
    ctx.moveTo(410, y);
    ctx.lineTo(572, y);
    ctx.stroke();
    ctx.font = 'italic 10px Inter';
    ctx.fillText(`/s/ ${appraisal.appraiserName}`, 45, y - 5);
    ctx.font = '8px Inter';
    ctx.fillText('Qualified appraiser signature', 40, y + 13);
    ctx.fillText(formatDateShort(appraisal.appraisalDate), 420, y - 5);
    ctx.fillText('Date signed', 410, y + 13);

    ctx.font = '7px Inter';
    ctx.fillText(`Synthetic appraisal fixture ${donation.id}—SAMPLE FOR TESTING ONLY`, 40, height - 25);
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
    ctx.fillText(`SCH-${getFixtureYear(donation.contributionDate)}-${maskedTaxpayerId(donation).slice(-4)}01`, 170, y + 20);
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
    ctx.fillText(`Tax ID: ${maskedTaxpayerId(donation)}`, 45, y);
    
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
        'receipt', 'stock_confirmation', 'gofundme_receipt'
    ];
    
    for (const dir of formDirs) {
        const dirPath = path.join(OUTPUT_DIR, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    const expectedFilenames = new Set(
        donationsData.donations.flatMap(donation =>
            donation.forms.map(formType => `${formType}/${formType}_${donation.id}.png`)
        )
    );
    for (const dir of formDirs) {
        const dirPath = path.join(OUTPUT_DIR, dir);
        for (const filename of fs.readdirSync(dirPath)) {
            if (!filename.toLowerCase().endsWith('.png')) continue;
            const relativeFilename = `${dir}/${filename}`;
            if (expectedFilenames.has(relativeFilename)) continue;
            fs.unlinkSync(path.join(dirPath, filename));
            console.log(`Removed obsolete ${relativeFilename}`);
        }
    }
    
    // Generate manifest
    const manifest = {
        version: '2.0.0',
        description: 'IRS-compliant OCR test fixtures with linked forms per donation',
        generatedAt: MANIFEST_GENERATED_AT,
        irsReference: '2025 Form 8283 instructions; 2025 Form 1098-C instructions; IRS Publication 561',
        namingConvention: '<form_type>_<donation_id>.png',
        totalDonations: donationsData.donations.length,
        totalForms: 0,
        formCounts: {},
        documents: []
    };
    
    const generationErrors = [];

    // Process each donation
    for (const donation of donationsData.donations) {
        console.log(`Processing ${donation.id}: ${donation.description}`);
        
        for (const formType of donation.forms) {
            const generator = generators[formType];
            if (!generator) {
                generationErrors.push(`${donation.id}: no generator for '${formType}'`);
                continue;
            }
            
            const filename = `${formType}_${donation.id}.png`;
            const filepath = path.join(OUTPUT_DIR, formType, filename);
            
            const manifestDocument = {
                filename: `${formType}/${filename}`,
                formType: formType,
                donationId: donation.id,
                boundary: donation.boundary || false,
                expectedFields: {
                    donor_name: donation.donor.name,
                    donor_address: formatAddress(donation.donor),
                    donee_name: donation.donee.name,
                    donee_ein: donation.donee.ein,
                    ...(donation.einValidationExpectation
                        ? {
                            ein_validation_status: donation.einValidationExpectation.status
                        }
                        : {}),
                    contribution_date: donation.contributionDate,
                    ...(formsWithAcquisitionDate.has(formType)
                        ? { date_acquired: donation.dateAcquired || null }
                        : {}),
                    amount: donation.amount,
                    asset_type: donation.assetType,
                    asset_description: donation.assetDescription || null,
                    ...(formType === 'form_1098c'
                        ? {
                            donor_tin: maskedTaxpayerId(donation),
                            vehicle_year: donation.vehicle.year,
                            vehicle_make: donation.vehicle.make,
                            vehicle_model: donation.vehicle.model,
                            vehicle_vin: donation.vehicle.vin,
                            vehicle_mileage: donation.vehicle.mileage,
                            disposition_type: donation.saleInfo.soldAtAuction
                                ? 'arms_length_sale'
                                : 'needy_transfer',
                            box_4a_arms_length_sale: donation.saleInfo.soldAtAuction === true,
                            box_4b_sale_date: donation.saleInfo.soldAtAuction
                                ? donation.saleInfo.saleDate
                                : null,
                            box_4c_gross_proceeds: donation.saleInfo.soldAtAuction
                                ? donation.saleInfo.grossProceeds
                                : null,
                            box_5a_significant_use_or_improvement: false,
                            box_5b_needy_transfer: donation.saleInfo.transferredToNeedy === true,
                            box_6a_goods_or_services: false,
                            box_7_low_value_or_missing_tin: false,
                            deduction_basis: donation.saleInfo.soldAtAuction
                                ? 'gross_proceeds'
                                : 'fair_market_value'
                        }
                        : {}),
                    ...(['form_8283_section_b', 'appraisal'].includes(formType)
                        ? {
                            appraiser_name: donation.appraisal.appraiserName,
                            appraiser_tin: syntheticAppraiserTaxId(donation.appraisal),
                            appraisal_date: donation.appraisal.appraisalDate,
                            appraiser_signed: true
                        }
                        : {}),
                    ...(formType === 'form_8283_section_b'
                        ? {
                            donee_signer: syntheticDoneeSigner(donation.donee).name,
                            donee_signer_title: syntheticDoneeSigner(donation.donee).title,
                            donee_signed_date: donation.contributionDate
                        }
                        : {}),
                    ...(formType === 'acknowledgment_letter' &&
                        donation.forms.includes('form_8283_section_b')
                        ? {
                            donee_signer: syntheticDoneeSigner(donation.donee).name,
                            donee_signer_title: syntheticDoneeSigner(donation.donee).title,
                            goods_or_services_provided: false
                        }
                        : {})
                }
            };

            if (hasGenerationFilter && !shouldGenerateImage(donation, formType)) {
                manifest.documents.push(manifestDocument);
                manifest.formCounts[formType] = (manifest.formCounts[formType] || 0) + 1;
                manifest.totalForms++;
                continue;
            }

            try {
                const buffer = applyFixtureRevision(generator(donation));
                fs.writeFileSync(filepath, buffer);
                console.log(`  ✓ Generated ${formType}/${filename}`);

                manifest.documents.push(manifestDocument);
                manifest.formCounts[formType] = (manifest.formCounts[formType] || 0) + 1;
                manifest.totalForms++;
            } catch (err) {
                console.error(`  ✗ Error generating ${formType}: ${err.message}`);
                generationErrors.push(`${donation.id}/${formType}: ${err.message}`);
            }
        }
    }

    for (const filename of expectedFilenames) {
        if (!fs.existsSync(path.join(OUTPUT_DIR, filename))) {
            generationErrors.push(`missing generated document ${filename}`);
        }
    }
    if (generationErrors.length > 0) {
        throw new Error(`Fixture generation failed:\n${generationErrors.join('\n')}`);
    }
    
    // Write manifest
    const manifestPath = path.join(__dirname, '..', 'manifest_v2.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`\n✓ Generated manifest_v2.json`);
    
    console.log(`\nSummary:`);
    console.log(`  Donations: ${manifest.totalDonations}`);
    console.log(`  Forms: ${manifest.totalForms}`);
    console.log(`  Form types:`, manifest.formCounts);
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    formatDate,
    formatDateShort,
    formatMoney,
    generateAcknowledgmentLetter,
    generateAppraisal,
    generateForm8283A,
    generateForm8283B,
    generateForm1098C,
    getGoFundMeReceiptAmounts,
    getForm8283FmvMethod,
    getForm8283PropertyDescription,
    main,
    maskedTaxpayerId,
    syntheticDoneeSigner,
    syntheticAppraiserTaxId,
    wrapText
};
