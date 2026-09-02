#!/usr/bin/env node
/**
 * Emit donation-map.csv: one row per donation, for whoever is running a manual
 * QA pass against the fixture set.
 *
 * This is generated rather than hand-maintained, and validate_fixtures.js
 * asserts the committed file matches this output. A QA reference that has
 * drifted from the fixtures is worse than no reference at all - it sends the
 * tester looking for a defect in the app that is actually in the map.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUTPUT = path.join(root, 'donation-map.csv');

const ASSET_LABELS = {
    cash: 'Cash',
    clothing_household: 'Clothing & Household',
    noncash_goods: 'Other Non-Cash Goods',
    vehicle: 'Vehicle',
    stock_public: 'Stock - Publicly Traded',
    stock_closelyheld: 'Stock - Closely Held',
    real_estate: 'Real Estate'
};

// Year first, then asset type, then id: a manual pass works one tax year at a
// time, because every period filter in the app is year-scoped.
const ASSET_ORDER = Object.keys(ASSET_LABELS);

function buildDonationMap(donations) {
    const rows = donations
        .map(donation => {
            const label = ASSET_LABELS[donation.assetType];
            if (!label) throw new Error(`${donation.id} has an unmapped asset type: ${donation.assetType}`);
            return {
                donation: donation.id,
                assetType: label,
                order: ASSET_ORDER.indexOf(donation.assetType),
                charity: donation.donee.name,
                value: donation.amount,
                year: Number(donation.contributionDate.slice(0, 4)),
                deductible: donation.deductible ? 'Deductible' : 'Non-deductible'
            };
        })
        .sort((a, b) => a.year - b.year || a.order - b.order || a.donation.localeCompare(b.donation));

    const escape = value => {
        const text = String(value);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    // LF, not CRLF. .gitattributes normalises *.csv to LF on commit, so a
    // CRLF payload would be byte-identical here on Windows and byte-different
    // on Linux CI, failing the drift assertion for a reason that has nothing
    // to do with the fixtures. Excel and Numbers both read LF fine.
    return (
        ['Donation,Asset Type,Charity,Value,Year,Deductible']
            .concat(
                rows.map(r =>
                    [r.donation, r.assetType, r.charity, r.value, r.year, r.deductible].map(escape).join(',')
                )
            )
            .join('\n') + '\n'
    );
}

module.exports = { buildDonationMap, OUTPUT };

if (require.main === module) {
    const donations = JSON.parse(fs.readFileSync(path.join(root, 'donations.json'), 'utf8')).donations;
    const csv = buildDonationMap(donations);
    fs.writeFileSync(OUTPUT, csv);

    const years = {};
    for (const d of donations) {
        const y = d.contributionDate.slice(0, 4);
        years[y] = years[y] || { gross: 0, deductible: 0, count: 0, deductibleCount: 0 };
        years[y].gross += d.amount;
        years[y].count += 1;
        if (d.deductible) {
            years[y].deductible += d.amount;
            years[y].deductibleCount += 1;
        }
    }
    const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    console.log(`donation-map.csv written: ${donations.length} donations`);
    for (const [year, t] of Object.entries(years).sort()) {
        console.log(
            `  ${year}  gross ${money(t.gross)} (${t.count})   deductible ${money(t.deductible)} (${t.deductibleCount})`
        );
    }
}
