#!/usr/bin/env node

// Prose acknowledgment letters rendered as text PDFs (DM-8504).
//
// Online giving platforms such as Click&Pledge email a thank-you letter that
// states the gift only inside a sentence - "Thank you so much for your
// contribution to <charity> of $68.78 on <date>" - with no "Amount:" label,
// and donors forward or upload that email as a PDF. The rendered PNG letters
// all carry a labelled amount, so none of them exercises that path. These
// fixtures reproduce the shape of the real letter: the amount in bold inside
// the opening sentence, impact prose that quotes a count ("more than 300,000
// children"), and the IRS footer.
//
// The PDF is written by hand (standard Helvetica, no embedded fonts, no
// timestamps), so the bytes depend only on the donation record and the
// validator can byte-compare the committed file with a fresh render.
//
// Usage:
//   node scripts/generate_prose_acknowledgment_pdfs.js
//   ONLY_DONATIONS=D049 node scripts/generate_prose_acknowledgment_pdfs.js

const fs = require('fs');
const path = require('path');
const { documentPath, formatMoney, syntheticDoneeSigner } = require('./generate_from_donations');

const GENERATOR = 'scripts/generate_prose_acknowledgment_pdfs.js';
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const BODY_LEADING = 15;
const FOOTER_SIZE = 8;
const FOOTER_LEADING = 10;
const WATERMARK = 'SAMPLE - FOR TESTING ONLY';

// Helvetica advance widths (1/1000 em) for printable ASCII, from the standard
// AFM. Used only to wrap lines; bold text is wrapped with a 6% allowance.
const HELVETICA_WIDTHS = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];
const BOLD_ALLOWANCE = 1.06;

function textWidth(text, size, bold) {
    let units = 0;
    for (const character of text) {
        const code = character.charCodeAt(0);
        units += code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
    }
    return (units / 1000) * size * (bold ? BOLD_ALLOWANCE : 1);
}

function escapePdfText(text) {
    if (/[^\x20-\x7e]/.test(text)) {
        throw new Error(`Prose acknowledgment text must be printable ASCII: ${JSON.stringify(text)}`);
    }
    return text.replace(/[\\()]/g, character => `\\${character}`);
}

/** Greedy word wrap of styled runs into lines of styled words. */
function wrapRuns(runs, size, width) {
    const words = runs.flatMap(run =>
        run.text
            .split(/\s+/)
            .filter(Boolean)
            .map(text => ({ text, bold: Boolean(run.bold) }))
    );
    const lines = [];
    let line = [];
    let lineWidth = 0;
    for (const word of words) {
        const wordWidth = textWidth(word.text, size, word.bold);
        const spaceWidth = line.length ? textWidth(' ', size, false) : 0;
        if (line.length && lineWidth + spaceWidth + wordWidth > width) {
            lines.push(line);
            line = [];
            lineWidth = 0;
        }
        lineWidth += (line.length ? textWidth(' ', size, false) : 0) + wordWidth;
        line.push(word);
    }
    if (line.length) lines.push(line);
    return lines;
}

function lineOperators(words, x, y, size) {
    const operators = [`BT 1 0 0 1 ${x} ${y} Tm`];
    let bold = null;
    words.forEach((word, index) => {
        if (word.bold !== bold) {
            bold = word.bold;
            operators.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`);
        }
        operators.push(`(${escapePdfText(index < words.length - 1 ? `${word.text} ` : word.text)}) Tj`);
    });
    operators.push('ET');
    return operators;
}

function letterContent(donation) {
    const { donor, donee, source } = donation;
    const signer = syntheticDoneeSigner(donee);
    const stamp = `${donation.contributionDate} ${source.transactionTime}`;
    const amount = formatMoney(donation.amount);
    const operators = [];
    let y = PAGE_HEIGHT;

    // Header band in the platform's template style.
    operators.push('0.29 0.18 0.56 rg', `0 ${PAGE_HEIGHT - 110} ${PAGE_WIDTH} 110 re f`, '1 1 1 rg');
    operators.push(...lineOperators([{ text: donee.name, bold: true }], MARGIN, PAGE_HEIGHT - 62, 24));
    operators.push(
        ...lineOperators([{ text: 'Thank you for your support.', bold: false }], MARGIN, PAGE_HEIGHT - 88, 12)
    );
    operators.push('0 0 0 rg');
    y = PAGE_HEIGHT - 150;

    // Writes wrapped lines from the current baseline down, then leaves
    // `after` points of space before the next block.
    const paragraph = (runs, { size = BODY_SIZE, leading = BODY_LEADING, after = BODY_LEADING / 2 } = {}) => {
        for (const line of wrapRuns(runs, size, TEXT_WIDTH)) {
            operators.push(...lineOperators(line, MARGIN, y, size));
            y -= leading;
        }
        y -= after;
    };

    paragraph([{ text: donor.name }], { after: 0 });
    paragraph([{ text: donor.address }], { after: 0 });
    paragraph([{ text: `${donor.city}, ${donor.state} ${donor.zip}` }]);
    paragraph([{ text: `Dear ${donor.name},` }]);
    paragraph([
        { text: `Thank you so much for your contribution to ${donee.name} of` },
        { text: amount, bold: true },
        { text: 'on' },
        { text: `${stamp}.`, bold: true },
        {
            text:
                'Because of your contribution, families in our community are receiving the everyday ' +
                'essentials they need to learn, work, and thrive.'
        }
    ]);
    paragraph([
        {
            text:
                'In our service area, there are more than 300,000 children living in households that ' +
                'struggle to pay for rent, utilities, and groceries. That is why your donation to ' +
                `${donee.name} is so essential if we are to help meet this large and critical need. ` +
                'And why it is so appreciated.'
        }
    ]);
    paragraph([
        {
            text:
                'On behalf of the families such as these and the thousands of others we will serve ' +
                `this year, everyone at ${donee.name} thanks you for taking action and providing ` +
                'direct relief to the people who need it most.'
        }
    ]);
    paragraph([{ text: 'With warm regards,' }]);
    paragraph([{ text: signer.name }], { after: 0 });
    paragraph([{ text: signer.title }]);
    paragraph([{ text: 'Date:', bold: true }, { text: stamp }], { after: BODY_LEADING * 1.5 });

    operators.push('0.4 0.4 0.4 rg');
    const footer = { size: FOOTER_SIZE, leading: FOOTER_LEADING, after: FOOTER_LEADING };
    paragraph(
        [
            {
                text:
                    'As required by the IRS, please be advised that your contribution is tax-deductible ' +
                    'to the fullest extent allowed by law. No goods or services were received in return ' +
                    'or exchange. Please retain this acknowledgement letter as your receipt for tax ' +
                    `purposes. ${donee.name} is a 501(c)(3) organization as determined by the Internal ` +
                    `Revenue Service. Our tax ID number is: ${donee.ein}.`
            }
        ],
        footer
    );
    paragraph([{ text: 'Secured and Powered by Click&Pledge' }], footer);

    operators.push('0.75 0.1 0.1 rg');
    operators.push(...lineOperators([{ text: WATERMARK, bold: true }], MARGIN, 40, 10));
    return operators.join('\n');
}

/** One-page PDF; every byte derives from the donation record. */
function renderProseAcknowledgmentPdf(donation) {
    const content = letterContent(donation);
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
            '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
        `<< /Title (${escapePdfText(`Acknowledgment ${donation.id}`)}) /Producer (${GENERATOR}) >>`
    ];

    let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const offsets = objects.map((body, index) => {
        const offset = Buffer.byteLength(pdf, 'latin1');
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
        return offset;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    pdf +=
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
}

function isProseAcknowledgmentPdf(donation) {
    return Boolean(
        donation.source &&
            donation.source.kind === 'rendered_pdf' &&
            donation.source.generator === GENERATOR
    );
}

function main() {
    const root = path.join(__dirname, '..');
    const { donations } = JSON.parse(fs.readFileSync(path.join(root, 'donations.json'), 'utf8'));
    const only = process.env.ONLY_DONATIONS
        ? new Set(process.env.ONLY_DONATIONS.split(',').map(id => id.trim()))
        : null;
    for (const donation of donations.filter(isProseAcknowledgmentPdf)) {
        if (only && !only.has(donation.id)) continue;
        for (const formType of donation.forms) {
            const relativePath = documentPath(donation, formType);
            fs.writeFileSync(path.join(root, 'documents', relativePath), renderProseAcknowledgmentPdf(donation));
            console.log(`  ✓ Generated ${relativePath}`);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = { GENERATOR, isProseAcknowledgmentPdf, renderProseAcknowledgmentPdf };
