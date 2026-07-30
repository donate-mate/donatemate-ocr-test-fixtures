#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const {
    formatDate,
    formatDateShort,
    formatMoney,
    generateForm8283A,
    getGoFundMeReceiptAmounts,
    getForm8283FmvMethod,
    getForm8283PropertyDescription,
    maskedTaxpayerId,
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

for (const donation of donations) {
    assert(
        typeof donation.deductible === 'boolean',
        `${donation.id} must declare an explicit boolean deductible expectation`
    );

    const isPersonalFundraiser = donation.forms.includes('gofundme_receipt');
    assert(
        donation.deductible === !isPersonalFundraiser,
        `${donation.id} deductibility must be true for charitable fixtures and false only for personal fundraisers`
    );

    const expectation = donation.einValidationExpectation;
    if (!expectation) {
        continue;
    }

    assert(
        expectation.status === 'VALID',
        `${donation.id} charitable OCR fixture must terminate with VALID EIN evidence`
    );
    assert(
        typeof expectation.reason === 'string' && expectation.reason.trim().length > 0,
        `${donation.id} EIN validation expectation must explain its evidence contract`
    );
    assert(
        donation.deductible === true && donation.donee.ein !== null,
        `${donation.id} terminal VALID evidence requires a deductible fixture with an EIN`
    );
}

const dm3063Expectations = new Map([
    ['D002', { deductible: true, status: 'VALID' }],
    ['D012', { deductible: true, status: 'VALID' }],
    ['D015', { deductible: true, status: 'VALID' }],
    ['D016', { deductible: true, status: 'VALID' }],
    ['D017', { deductible: true, status: 'VALID' }],
    ['D019', { deductible: true, status: 'VALID' }],
    ['D022', { deductible: true, status: 'VALID' }],
    ['D023', { deductible: true, status: 'VALID' }],
    ['D026', { deductible: true, status: 'VALID' }],
    ['D028', { deductible: true, status: 'VALID' }]
]);

for (const [id, expected] of dm3063Expectations) {
    const donation = fixture(id);
    assert(
        donation.deductible === expected.deductible &&
            donation.einValidationExpectation?.status === expected.status,
        `${id} must retain the DM-3063 deductibility and EIN evidence contract`
    );

    for (const formType of donation.forms) {
        const document = manifestDocuments.get(`${formType}/${formType}_${id}.png`);
        assert(
            document?.expectedFields?.ein_validation_status === expected.status,
            `${id} manifest documents must retain EIN status ${expected.status}`
        );
    }

}

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
    d015.deductible === true && d015.einValidationExpectation?.status === 'VALID',
    'D015 must remain a deductible fixture with terminal VALID EIN evidence'
);
const d015Manifest = manifestDocuments.get(
    'acknowledgment_letter/acknowledgment_letter_D015.png'
);
assert(
    d015Manifest?.expectedFields?.donee_ein === d015.donee.ein &&
        d015Manifest?.expectedFields?.ein_validation_status === 'VALID',
    'D015 manifest must retain the printed EIN and its terminal VALID expectation'
);

const measurementContext = createCanvas(612, 792).getContext('2d');

function assertWrappedFieldFits(text, font, width, maxLines, label) {
    measurementContext.font = font;
    const lines = wrapText(measurementContext, text, width);
    assert(
        lines.length <= maxLines &&
            lines.join(' ') === text &&
            lines.every(line => measurementContext.measureText(line).width <= width),
        `${label} must render in full within its Form 8283-A cell`
    );
}

const sectionADonations = donations.filter(donation =>
    donation.forms.includes('form_8283_section_a')
);
assert(sectionADonations.length === 6, 'Expected six Form 8283-A fixture variants');

for (const donation of sectionADonations) {
    const description = getForm8283PropertyDescription(donation);
    const fmvMethod = getForm8283FmvMethod(donation);

    assertWrappedFieldFits(
        donation.donee.name,
        '7.5px Inter',
        126,
        2,
        `${donation.id} donee name`
    );
    assertWrappedFieldFits(
        donation.donee.address,
        '6.5px Inter',
        126,
        3,
        `${donation.id} donee address`
    );
    assertWrappedFieldFits(
        description,
        '8px Inter',
        296,
        3,
        `${donation.id} property description`
    );
    assertWrappedFieldFits(
        donation.howAcquired,
        '7px Inter',
        104,
        2,
        `${donation.id} acquisition method`
    );
    assert(fmvMethod, `${donation.id} must declare or derive an FMV method`);
    assertWrappedFieldFits(
        fmvMethod,
        '7px Inter',
        104,
        2,
        `${donation.id} FMV method`
    );

    const taxpayerId = maskedTaxpayerId(donation);
    assert(
        /^XXX-XX-\d{4}$/.test(taxpayerId) &&
            taxpayerId === maskedTaxpayerId(donation),
        `${donation.id} taxpayer identifier must be masked and deterministic`
    );

    const renderedForm = generateForm8283A(donation);
    assert(
        renderedForm.equals(generateForm8283A(donation)),
        `${donation.id} Form 8283-A generation must be deterministic`
    );
    const trackedForm = fs.readFileSync(
        path.join(
            root,
            'documents',
            'form_8283_section_a',
            `form_8283_section_a_${donation.id}.png`
        )
    );
    assert(
        trackedForm.equals(renderedForm),
        `${donation.id} tracked Form 8283-A must match the canonical generator`
    );

    if (donation.assetType === 'vehicle') {
        assert(
            description.includes(`${donation.vehicle.mileage.toLocaleString('en-US')} miles`) &&
                donation.forms.includes('form_1098c') &&
                fmvMethod === 'Gross proceeds',
            `${donation.id} vehicle Section A must include mileage, Form 1098-C, and gross-proceeds valuation`
        );
    }
}

const d023 = fixture('D023');
assertForms('D023', ['form_8283_section_a', 'acknowledgment_letter']);
assert(
    d023.donee.name === 'Community Foundation of Northern Colorado' &&
        d023.donee.ein === '84-0699243' &&
        d023.donee.address === '4745 Wheaton Drive, Fort Collins, CO 80525',
    'D023 must retain its active staging-BMF-backed 501(c)(3) identity'
);
assert(!d023.assetCondition, 'D023 securities must not declare a physical condition');
assert(
    getForm8283FmvMethod(d023) === '100 shares at $50.00',
    'D023 Form 8283-A must derive its FMV method from the declared share data'
);
const d023Acknowledgment = manifestDocuments.get(
    'acknowledgment_letter/acknowledgment_letter_D023.png'
);
assert(
    d023Acknowledgment?.expectedFields?.donee_name === d023.donee.name &&
        d023Acknowledgment?.expectedFields?.donee_ein === d023.donee.ein &&
        d023Acknowledgment?.expectedFields?.contribution_date === d023.contributionDate &&
        d023Acknowledgment?.expectedFields?.amount === d023.amount &&
        d023Acknowledgment?.expectedFields?.asset_type === d023.assetType &&
        d023Acknowledgment?.expectedFields?.asset_description === d023.assetDescription,
    'D023 acknowledgment manifest must retain its EIN-bearing donation contract'
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
