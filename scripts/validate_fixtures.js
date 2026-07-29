#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const {
    formatDate,
    formatDateShort,
    formatMoney,
    getGoFundMeReceiptAmounts,
    wrapText
} = require('./generate_from_donations');

const root = path.join(__dirname, '..');
const donations = JSON.parse(
    fs.readFileSync(path.join(root, 'donations.json'), 'utf8')
).donations;
const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'manifest_v2.json'), 'utf8')
);

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function fixture(id) {
    const donation = donations.find(item => item.id === id);
    assert(donation, `Missing donation fixture ${id}`);
    return donation;
}

function assertForms(id, expectedForms) {
    const actualForms = fixture(id).forms.slice().sort();
    const expected = expectedForms.slice().sort();
    assert(
        JSON.stringify(actualForms) === JSON.stringify(expected),
        `${id} forms mismatch: expected ${expected.join(', ')}, got ${actualForms.join(', ')}`
    );
}

const expectedDocuments = new Map();
for (const donation of donations) {
    for (const formType of donation.forms) {
        const filename = `${formType}/${formType}_${donation.id}.png`;
        assert(!expectedDocuments.has(filename), `Duplicate fixture filename ${filename}`);
        expectedDocuments.set(filename, { donation, formType });
        assert(
            fs.existsSync(path.join(root, 'documents', filename)),
            `Missing generated fixture documents/${filename}`
        );
    }
}

const manifestDocuments = new Map();
for (const document of manifest.documents) {
    assert(
        !manifestDocuments.has(document.filename),
        `Duplicate manifest filename ${document.filename}`
    );
    manifestDocuments.set(document.filename, document);
}

assert(
    manifest.totalDonations === donations.length,
    `Manifest donation count mismatch: expected ${donations.length}, got ${manifest.totalDonations}`
);
assert(
    manifest.totalForms === expectedDocuments.size,
    `Manifest form count mismatch: expected ${expectedDocuments.size}, got ${manifest.totalForms}`
);
assert(
    manifestDocuments.size === expectedDocuments.size,
    `Manifest document count mismatch: expected ${expectedDocuments.size}, got ${manifestDocuments.size}`
);

for (const [filename, expected] of expectedDocuments) {
    const document = manifestDocuments.get(filename);
    assert(document, `Manifest is missing ${filename}`);
    assert(
        document.donationId === expected.donation.id,
        `${filename} has donationId ${document.donationId}, expected ${expected.donation.id}`
    );
    assert(
        document.formType === expected.formType,
        `${filename} has formType ${document.formType}, expected ${expected.formType}`
    );
}

assertForms('D017', ['form_1098c', 'form_8283_section_a']);
assertForms('D018', ['form_1098c', 'form_8283_section_a']);
assertForms('D019', ['form_1098c', 'form_8283_section_b', 'appraisal']);

for (const id of ['D017', 'D018']) {
    const donation = fixture(id);
    assert(donation.saleInfo?.soldAtAuction, `${id} must remain an auction-sale vehicle`);
    assert(
        !donation.forms.includes('form_8283_section_b') && !donation.forms.includes('appraisal'),
        `${id} must stay on the gross-proceeds/Section A path`
    );
}

const d019 = fixture('D019');
assert(d019.saleInfo?.transferredToNeedy, 'D019 must remain an FMV-basis needy transfer');
assert(d019.amount > 5000, 'D019 must remain above the $5,000 appraisal threshold');
assert(d019.appraisal, 'D019 must include qualified-appraisal metadata');

const contributionDate = new Date(`${d019.contributionDate}T00:00:00Z`);
const appraisalDate = new Date(`${d019.appraisal.appraisalDate}T00:00:00Z`);
const appraisalAgeDays = (contributionDate - appraisalDate) / 86_400_000;
assert(
    appraisalAgeDays >= 0 && appraisalAgeDays <= 60,
    `D019 appraisal must be dated no more than 60 days before contribution; got ${appraisalAgeDays}`
);

const d015 = fixture('D015');
assert(
    d015.einValidationExpectation?.status === 'NOT_FOUND' &&
        d015.einValidationExpectation?.intentionalSyntheticNoMatch === true,
    'D015 must remain the intentional terminal NOT_FOUND EIN fixture'
);
const d015Manifest = manifestDocuments.get(
    'acknowledgment_letter/acknowledgment_letter_D015.png'
);
assert(
    d015Manifest?.expectedFields?.donee_ein === d015.donee.ein &&
        d015Manifest?.expectedFields?.ein_validation_status === 'NOT_FOUND' &&
        d015Manifest?.expectedFields?.ein_intentional_synthetic_no_match === true,
    'D015 manifest must retain the printed EIN and its terminal NOT_FOUND expectation'
);

const d023 = fixture('D023');
const measurementContext = createCanvas(612, 792).getContext('2d');
measurementContext.font = '8px Inter';
const d023DoneeNameLines = wrapText(measurementContext, d023.donee.name, 150);
assert(
    d023DoneeNameLines.length <= 2 &&
        d023DoneeNameLines.join(' ') === d023.donee.name,
    'D023 donee name must render in full within the two-line Form 8283-A cell'
);

const goFundMeExpectations = {
    D035: {
        date: 'August 12, 2025',
        shortDate: '08/12/2025',
        donation: '$50.00',
        tip: '$5.00',
        total: '$55.00'
    },
    D036: {
        date: 'November 4, 2025',
        shortDate: '11/04/2025',
        donation: '$150.00',
        tip: '$0.00',
        total: '$150.00'
    },
    D037: {
        date: 'January 19, 2026',
        shortDate: '01/19/2026',
        donation: '$25.00',
        tip: '$3.75',
        total: '$28.75'
    }
};

for (const [id, expected] of Object.entries(goFundMeExpectations)) {
    const donation = fixture(id);
    const amounts = getGoFundMeReceiptAmounts(donation);
    assert(formatDate(donation.contributionDate) === expected.date, `${id} long date drifted`);
    assert(formatDateShort(donation.contributionDate) === expected.shortDate, `${id} short date drifted`);
    assert(formatMoney(amounts.donationAmount) === expected.donation, `${id} donation amount drifted`);
    assert(formatMoney(amounts.tip) === expected.tip, `${id} tip amount drifted`);
    assert(formatMoney(amounts.total) === expected.total, `${id} total amount drifted`);
    assert(
        donation.deductible === false && donation.donee.ein === null,
        `${id} must remain a non-deductible personal fundraiser without an EIN`
    );
}

console.log(
    `Validated ${manifest.totalDonations} donations and ${manifest.totalForms} linked fixture documents.`
);
