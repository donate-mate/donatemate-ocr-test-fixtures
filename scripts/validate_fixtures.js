#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const {
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
    maskedTaxpayerId,
    syntheticAppraiserTaxId,
    syntheticDoneeSigner,
    wrapText
} = require('./generate_from_donations');
const {
    FIXTURE_REVISION,
    applyFixtureRevision,
    fixtureRevision
} = require('./png_fixture_revision');

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

function pngFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return pngFiles(absolutePath);
        return entry.isFile() && entry.name.toLowerCase().endsWith('.png') ? [absolutePath] : [];
    });
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
assert(
    manifest.generatedAt === '2026-07-31T00:00:00.000Z',
    'Manifest generation timestamp must be deterministic'
);

const actualDocumentNames = pngFiles(path.join(root, 'documents'))
    // expectedDocuments keys are built with a literal '/', so normalise the
    // platform separator or every file reads as untracked on Windows.
    .map(filename =>
        path
            .relative(path.join(root, 'documents'), filename)
            .split(path.sep)
            .join('/')
    )
    .sort();
assert(
    actualDocumentNames.length === expectedDocuments.size,
    `Generated PNG count mismatch: expected ${expectedDocuments.size}, got ${actualDocumentNames.length}`
);
for (const filename of actualDocumentNames) {
    assert(expectedDocuments.has(filename), `Obsolete or untracked generated PNG: ${filename}`);
}

// Itemised fixtures render one receipt line per lot. The per-line values are
// what a donor actually writes on a thrift-store receipt, so they must add up
// to the donation amount or the rendered document contradicts itself.
for (const donation of donations.filter(item => item.items)) {
    assert(
        Array.isArray(donation.items) && donation.items.length > 0,
        `${donation.id} items must be a non-empty array when present`
    );
    assert(
        donation.forms.includes('receipt'),
        `${donation.id} declares items but has no receipt to render them on`
    );
    for (const item of donation.items) {
        assert(
            typeof item.description === 'string' && item.description.length > 0,
            `${donation.id} every item needs a description`
        );
        assert(
            typeof item.fmv === 'number' && item.fmv > 0,
            `${donation.id} every item needs a positive fmv`
        );
    }
    const itemTotal = donation.items.reduce((sum, item) => sum + item.fmv, 0);
    assert(
        Math.abs(itemTotal - donation.amount) < 0.005,
        `${donation.id} item values total ${itemTotal} but the donation amount is ${donation.amount}`
    );
}

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

for (const filename of pngFiles(path.join(root, 'documents'))) {
    const document = fs.readFileSync(filename);
    assert(
        fixtureRevision(document) === FIXTURE_REVISION,
        `${path.relative(root, filename)} must carry fixture revision ${FIXTURE_REVISION}`
    );
    assert(
        applyFixtureRevision(document).equals(document),
        `${path.relative(root, filename)} fixture revision must be idempotent`
    );
}

assertForms('D017', ['form_1098c', 'form_8283_section_a']);
assertForms('D018', ['form_1098c', 'form_8283_section_a']);
assertForms('D019', ['form_1098c', 'form_8283_section_b', 'appraisal']);
assertForms('D024', ['form_8283_section_b', 'appraisal', 'acknowledgment_letter']);
for (const id of ['D025', 'D026', 'D027', 'D028']) {
    assertForms(id, ['form_8283_section_b', 'appraisal', 'acknowledgment_letter']);
}

for (const id of ['D017', 'D018']) {
    const donation = fixture(id);
    assert(donation.saleInfo?.soldAtAuction, `${id} must remain an auction-sale vehicle`);
    assert(
        !donation.forms.includes('form_8283_section_b') && !donation.forms.includes('appraisal'),
        `${id} must stay on the gross-proceeds/Section A path`
    );
    const document = manifestDocuments.get(`form_1098c/form_1098c_${id}.png`);
    assert(
        document?.expectedFields?.disposition_type === 'arms_length_sale' &&
            document.expectedFields.box_4a_arms_length_sale === true &&
            document.expectedFields.box_4b_sale_date === donation.saleInfo.saleDate &&
            document.expectedFields.box_4c_gross_proceeds === donation.saleInfo.grossProceeds &&
            document.expectedFields.box_5a_significant_use_or_improvement === false &&
            document.expectedFields.box_5b_needy_transfer === false &&
            document.expectedFields.deduction_basis === 'gross_proceeds',
        `${id} Form 1098-C must preserve the box 4 sale date and gross-proceeds path`
    );
}

const d019 = fixture('D019');
assert(d019.saleInfo?.transferredToNeedy, 'D019 must remain an FMV-basis needy transfer');
assert(d019.amount > 5000, 'D019 must remain above the $5,000 appraisal threshold');
assert(d019.appraisal, 'D019 must include qualified-appraisal metadata');
const d019Document = manifestDocuments.get('form_1098c/form_1098c_D019.png');
assert(
    d019Document?.expectedFields?.disposition_type === 'needy_transfer' &&
        d019Document.expectedFields.box_4a_arms_length_sale === false &&
        d019Document.expectedFields.box_4b_sale_date === null &&
        d019Document.expectedFields.box_4c_gross_proceeds === null &&
        d019Document.expectedFields.box_5a_significant_use_or_improvement === false &&
        d019Document.expectedFields.box_5b_needy_transfer === true &&
        d019Document.expectedFields.deduction_basis === 'fair_market_value' &&
        d019Document.expectedFields.amount === d019.amount,
    'D019 Form 1098-C must preserve the box 5b needy-transfer/FMV path without gross proceeds'
);

const sectionBIds = ['D013', 'D014', 'D019', 'D024', 'D025', 'D026', 'D027', 'D028'];
const dm599Generators = {
    acknowledgment_letter: generateAcknowledgmentLetter,
    appraisal: generateAppraisal,
    form_8283_section_b: generateForm8283B,
    form_1098c: generateForm1098C
};

for (const id of sectionBIds) {
    const donation = fixture(id);
    assert(donation.amount > 5000, `${id} Section B fixture must remain over $5,000`);
    assert(donation.appraisal, `${id} Section B fixture must have a separate qualified appraisal`);
    assert(donation.forms.includes('appraisal'), `${id} must link its qualified-appraisal image`);
    if (donation.assetType !== 'vehicle') {
        assert(
            donation.forms.includes('acknowledgment_letter'),
            `${id} must link a separate contemporaneous written acknowledgment`
        );
    }

    const contributionDate = new Date(`${donation.contributionDate}T00:00:00Z`);
    const appraisalDate = new Date(`${donation.appraisal.appraisalDate}T00:00:00Z`);
    const appraisalAgeDays = (contributionDate - appraisalDate) / 86_400_000;
    assert(
        appraisalAgeDays >= 0 && appraisalAgeDays <= 60,
        `${id} appraisal must be signed no more than 60 days before contribution; got ${appraisalAgeDays}`
    );

    const appraiserTaxId = syntheticAppraiserTaxId(donation.appraisal);
    assert(
        /^000-00-\d{4}$/.test(appraiserTaxId) &&
            appraiserTaxId === syntheticAppraiserTaxId(donation.appraisal),
        `${id} appraiser TIN must be full-format, non-sensitive, and deterministic`
    );
    const formDocument = manifestDocuments.get(
        `form_8283_section_b/form_8283_section_b_${id}.png`
    );
    const signer = syntheticDoneeSigner(donation.donee);
    assert(
        formDocument?.expectedFields?.appraiser_name === donation.appraisal.appraiserName &&
            formDocument.expectedFields.appraiser_tin === appraiserTaxId &&
            formDocument.expectedFields.appraisal_date === donation.appraisal.appraisalDate &&
            formDocument.expectedFields.appraiser_signed === true &&
            formDocument.expectedFields.donee_signer === signer.name &&
            formDocument.expectedFields.donee_signer_title === signer.title &&
            formDocument.expectedFields.donee_signed_date === donation.contributionDate,
        `${id} Form 8283-B manifest must retain completed appraiser and donee declarations`
    );
}

assert(
    fixture('D024').boundary !== true && fixture('D025').boundary !== true,
    'D024/D025 must not encode the obsolete $10,000 qualified-appraisal threshold'
);

for (const id of ['D017', 'D018', 'D019', ...sectionBIds]) {
    const donation = fixture(id);
    for (const [formType, generator] of Object.entries(dm599Generators)) {
        if (!donation.forms.includes(formType)) continue;
        const rendered = applyFixtureRevision(generator(donation));
        assert(
            rendered.equals(applyFixtureRevision(generator(donation))),
            `${id} ${formType} generation must be deterministic`
        );
        const tracked = fs.readFileSync(
            path.join(root, 'documents', formType, `${formType}_${id}.png`)
        );
        assert(
            tracked.equals(rendered),
            `${id} tracked ${formType} must match the canonical generator`
        );
    }
}

for (const documentationFile of ['README.md', 'IRS_FORMS_README.md']) {
    const documentation = fs.readFileSync(path.join(root, documentationFile), 'utf8');
    assert(
        !/\$5,001\s*[-–]\s*\$10,000[^\n]*without (?:a )?qualified appraisal/i.test(documentation),
        `${documentationFile} must not retain the obsolete $10,000 appraisal exception`
    );
}

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
assert(sectionADonations.length === 7, 'Expected seven Form 8283-A fixture variants');

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

    const renderedForm = applyFixtureRevision(generateForm8283A(donation));
    assert(
        renderedForm.equals(applyFixtureRevision(generateForm8283A(donation))),
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
        date: '2025-08-12',
        shortDate: '2025-08-12',
        donation: '$50.00',
        tip: '$5.00',
        total: '$55.00'
    },
    D036: {
        date: '2025-11-04',
        shortDate: '2025-11-04',
        donation: '$150.00',
        tip: '$0.00',
        total: '$150.00'
    },
    D037: {
        date: '2026-01-19',
        shortDate: '2026-01-19',
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

// --- Handwritten thrift-store slips ---------------------------------------
// These fixtures exist to be partly or wholly unreadable, which makes them the
// one group where a failed extraction is the pass condition. Each therefore has
// to declare what it expects to lose; without that, QA cannot tell an intended
// handwriting failure from a genuine OCR regression, and the fixture is worse
// than useless because it looks like a bug every time it works.
const HANDWRITING_LEVELS = new Set(['entries', 'most', 'all']);
const handwrittenFixtures = donations.filter(donation => donation.handwriting);

assert(
    handwrittenFixtures.length > 0,
    'the handwritten slip fixtures have gone missing from donations.json'
);

for (const donation of handwrittenFixtures) {
    const id = donation.id;

    assert(
        HANDWRITING_LEVELS.has(donation.handwriting),
        `${id} has an unknown handwriting level '${donation.handwriting}'`
    );
    assert(
        donation.forms.includes('receipt'),
        `${id} is handwritten but has no receipt to write on`
    );

    const expectation = donation.ocrExpectation;
    assert(expectation, `${id} must declare an ocrExpectation`);
    assert(
        expectation.outcome === 'REQUIRES_REVIEW',
        `${id} handwriting is not a scan failure, so it must terminate on REQUIRES_REVIEW, not '${expectation.outcome}'`
    );
    assert(
        typeof expectation.reason === 'string' && expectation.reason.trim().length > 0,
        `${id} must explain what it expects OCR to lose, and why`
    );
    assert(
        Array.isArray(expectation.extractable) && Array.isArray(expectation.unextractable),
        `${id} extractable and unextractable must both be arrays`
    );

    const overlap = expectation.extractable.filter(field =>
        expectation.unextractable.includes(field)
    );
    assert(
        overlap.length === 0,
        `${id} cannot expect ${overlap.join(', ')} to be both readable and unreadable`
    );
    assert(
        expectation.unextractable.length > 0,
        `${id} is handwritten but expects to lose nothing`
    );

    // The lots and the money are written by hand at every level, so a fixture
    // expecting to read them back is not testing handwriting at all.
    for (const field of ['amount', 'items']) {
        assert(
            expectation.unextractable.includes(field),
            `${id} must expect ${field} to be unreadable; the values are handwritten at every level`
        );
    }

    if (donation.handwriting === 'all') {
        // A blank pad has no pre-printed letterhead, so nothing survives.
        assert(
            expectation.extractable.length === 0,
            `${id} is a blank pad with nothing pre-printed, so it cannot expect to extract ${expectation.extractable.join(', ')}`
        );
    } else {
        assert(
            expectation.extractable.includes('donee_name'),
            `${id} keeps a printed letterhead, so the charity name must stay extractable`
        );
    }

    // Only the receipt is filled in by hand. An acknowledgment letter from the
    // same donation is typed on the charity's own stationery and reads fine.
    for (const formType of donation.forms) {
        const document = manifestDocuments.get(`${formType}/${formType}_${id}.png`);
        assert(document, `${id} is missing its ${formType} manifest entry`);

        if (formType === 'receipt') {
            assert(
                document.handwriting === donation.handwriting,
                `${id} receipt manifest must record the handwriting level`
            );
            assert(
                document.ocrExpectation && document.ocrExpectation.outcome === 'REQUIRES_REVIEW',
                `${id} receipt manifest must carry the OCR expectation`
            );
        } else {
            assert(
                !document.ocrExpectation,
                `${id} ${formType} is typed, so it must not inherit the receipt's handwriting expectation`
            );
        }
    }
}

// If this font is absent, registerFont silently does nothing, the slips render
// in the printed face, and every handwritten fixture quietly becomes legible.
assert(
    fs.existsSync(path.join(root, 'fonts', 'Caveat.ttf')),
    'fonts/Caveat.ttf is missing, so the handwritten fixtures would render as printed text'
);

console.log(
    `Validated ${manifest.totalDonations} donations and ${manifest.totalForms} linked fixture documents.`
);
