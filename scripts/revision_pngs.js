#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    FIXTURE_REVISION,
    applyFixtureRevision,
    fixtureRevision
} = require('./png_fixture_revision');

const documentsRoot = path.join(__dirname, '..', 'documents');

function pngFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return pngFiles(absolutePath);
        return entry.isFile() && entry.name.toLowerCase().endsWith('.png') ? [absolutePath] : [];
    });
}

const files = pngFiles(documentsRoot).sort();
let updated = 0;
for (const filename of files) {
    const original = fs.readFileSync(filename);
    if (fixtureRevision(original) === FIXTURE_REVISION) continue;

    fs.writeFileSync(filename, applyFixtureRevision(original));
    updated++;
}

console.log(
    `Fixture revision ${FIXTURE_REVISION}: ${updated} updated, ${files.length - updated} unchanged.`
);
