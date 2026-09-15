#!/usr/bin/env node

// Simulated phone photographs of handwritten drop-off slips.
//
// generate_from_donations.js draws every other fixture flat, straight and in a
// clean font, which is exactly what real handwritten receipts are not. The one
// real photograph in the set (D038) proved the point: OCR that reads the
// rendered slips fails on paper. These fixtures put the missing conditions back
// - a pre-printed pad form, handwriting with a wobble, carbon-copy grain,
// folds, a table under the paper, keystone from holding the phone at an angle,
// uneven light and sensor noise - so the handwritten failure mode can be tested
// without waiting for more real slips.
//
// They are still simulations. DM-5782 is a camera-capture pass, so a sample only
// counts as a capture once it has been printed and photographed; uploading the
// JPEG directly tests OCR quality, not the capture path.
//
// Output is deterministic for a given machine (every random choice comes from a
// PRNG seeded by the donation ID), but text rasterisation differs between
// platforms, so the validator checks these files exist and are genuine JPEGs
// rather than byte-comparing them.
//
// Usage:
//   node scripts/generate_handwritten_receipts.js
//   ONLY_DONATIONS=D046 node scripts/generate_handwritten_receipts.js

const fs = require('fs');
const path = require('path');
// @napi-rs/canvas rather than node-canvas: node-canvas cannot load a registered
// font on Windows and silently falls back to Sans, which would print every slip
// in the same typeface. Skia loads the handwriting fonts identically everywhere.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const root = path.join(__dirname, '..');

const FONTS = [
    ['Inter.ttf', 'Inter'],
    ['handwriting/NothingYouCouldDo.ttf', 'Nothing You Could Do'],
    ['handwriting/GochiHand.ttf', 'Gochi Hand'],
    ['handwriting/ReenieBeanie.ttf', 'Reenie Beanie'],
    ['handwriting/CoveredByYourGrace.ttf', 'Covered By Your Grace'],
    ['handwriting/HomemadeApple.ttf', 'Homemade Apple'],
    ['handwriting/JustAnotherHand.ttf', 'Just Another Hand']
];
for (const [file, family] of FONTS) {
    GlobalFonts.registerFromPath(path.join(root, 'fonts', file), family);
}

const PHOTO_WIDTH = 1890;
const PHOTO_HEIGHT = 2520;

// --- deterministic randomness ----------------------------------------------

function seedFrom(text) {
    let hash = 2166136261;
    for (const ch of text) {
        hash ^= ch.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const between = (rnd, low, high) => low + rnd() * (high - low);

// --- scenes ----------------------------------------------------------------
// What the writer wrote is kept here, in the writer's own abbreviations, and
// the canonical values live in donations.json. They are meant to disagree in
// form ("2 pr" for 2 pairs, "housewares" for kitchenware) because real slips do.

const SCENES = {
    D044: {
        template: 'goodwill',
        paper: '#F4EAAE',
        copyLabel: 'YELLOW – DONOR COPY',
        writer: { font: 'Nothing You Could Do', size: 40, ink: '#22358F', alpha: 0.93, slope: -0.008, wobble: 2.2, jitter: 0.05, spacing: 0.97, grain: 'carbon' },
        entries: {
            date: '8/22/26',
            store: '412',
            attendant: 'KM',
            donor: 'Dana Whitfield',
            address: '904 Ridgeview Ln',
            city: 'Akron  OH  44301',
            rows: [
                ['4', "Men's jeans", 'good', '24'],
                ['3', 'Womens sweaters', 'good', '18'],
                ['2 pr', 'Kids sneakers', 'fair', '10'],
                ['1', 'Winter coat', 'good', '25']
            ],
            total: '77.00',
            signature: true
        },
        photo: { background: 'granite', rotate: -3.5, scale: 0.84, keystone: 0.035, offset: [0, 30], bow: 5, lighting: 'daylight', blur: 1, noise: 5, quality: 0.82, creases: [{ axis: 'h', at: 0.5 }] }
    },
    D045: {
        template: 'goodwill',
        paper: '#FBFAF6',
        copyLabel: 'WHITE – DONOR COPY',
        writer: { font: 'Gochi Hand', size: 42, ink: '#171717', alpha: 0.9, slope: 0.012, wobble: 3, jitter: 0.07, spacing: 0.95, grain: 'ballpoint' },
        entries: {
            date: '9/3',
            store: '412',
            attendant: 'TJ',
            donor: 'Marcus Bell',
            address: '',
            city: '',
            rows: [
                ['3', 'bags - clothing', 'used', ''],
                ['1', 'box housewares', 'used', ''],
                ['2', 'lamps', 'good', '']
            ],
            total: '',
            signature: true
        },
        photo: { background: 'wood', rotate: 6.5, scale: 0.8, keystone: 0.06, offset: [20, -10], bow: 10, lighting: 'phoneShadow', blur: 0.72, noise: 7, quality: 0.78, creases: [] }
    },
    D046: {
        template: 'restore',
        paper: '#F5D6DD',
        serial: '018274',
        writer: { font: 'Reenie Beanie', size: 52, ink: '#2A2356', alpha: 0.92, slope: -0.015, wobble: 4, jitter: 0.09, spacing: 0.9, grain: 'carbon' },
        entries: {
            date: '8-29-26',
            truck: '3',
            driver: 'Luis',
            donor: 'Rosa Alvarez',
            street: '27 Coldwater St',
            city: 'Trenton NJ 08608',
            phone: '609 555-0142',
            rows: [
                ['1', 'Sofa 3 seat (grey)', 'good', '110'],
                ['1', 'Dresser 6 drwr', 'good', '60'],
                ['1', 'Coffee table', 'fair', '25'],
                ['2', 'Nightstands', 'good', '30']
            ],
            total: '225',
            checks: [true, false],
            signatures: [true, true]
        },
        photo: { background: 'clipboard', rotate: -1.5, scale: 0.88, keystone: 0.11, offset: [0, 60], bow: 3, lighting: 'harsh', blur: 1, noise: 6, quality: 0.8, creases: [{ axis: 'v', at: 0.5 }] }
    },
    D047: {
        template: 'salvation',
        paper: '#FAF8F2',
        writer: { font: 'Covered By Your Grace', size: 36, ink: '#1C3FA8', alpha: 0.9, slope: 0.006, wobble: 2.5, jitter: 0.06, spacing: 0.9, grain: 'ballpoint' },
        entries: {
            date: '9/6/2026',
            donor: 'Peter Nakamura',
            address: '58 Willow Bend Rd, Eugene OR 97401',
            rows: [
                ['8', 'coffee mugs', 'good', '4'],
                ['1', 'pots & pans set', 'used', '12'],
                ['1', 'toaster', 'good', '6'],
                ['14', 'paperback books', 'used', '14'],
                ['5', 'picture frames', 'good', '5'],
                ['1', 'table lamp', 'good', '8'],
                ['1', 'blender', 'fair', '7'],
                ['6', 'bath towels', 'good', { struck: '12', text: '9' }],
                ['3', 'board games', 'good', '6']
            ],
            total: '71',
            signature: true
        },
        photo: { background: 'oak', rotate: 2.5, scale: 0.83, keystone: 0.05, offset: [-15, 0], bow: 8, lighting: 'warm', blur: 1, noise: 8, quality: 0.8, creases: [{ axis: 'h', at: 0.34 }, { axis: 'h', at: 0.67 }] }
    },
    D048: {
        template: 'svdp',
        paper: '#EFE8D8',
        writer: { font: 'Homemade Apple', size: 34, ink: '#3F3F3F', alpha: 0.74, slope: -0.02, wobble: 4, jitter: 0.1, spacing: 0.94, grain: 'pencil' },
        entries: {
            // Homemade Apple draws its numerals far smaller than its letters, so
            // the figures are written larger to stay readable with effort, which
            // is what this sample's expectation claims.
            date: { text: '9/8/26', scale: 1.5 },
            name: { text: 'J. Okafor', scale: 1.15 },
            lines: ['box of kitchen stuff', 'bag of clothes', 'small rug'],
            value: { text: '45', scale: 1.9 },
            received: 'm.r.'
        },
        photo: { background: 'darkcounter', rotate: -9, scale: 0.8, keystone: 0.08, offset: [10, 20], bow: 14, lighting: 'dim', blur: 0.66, noise: 12, quality: 0.72, creases: [], crumple: true }
    }
};

// --- paper -------------------------------------------------------------------

function blotch(ctx, rnd, width, height, cells, low, high, alpha) {
    const small = createCanvas(cells, Math.max(2, Math.round((cells * height) / width)));
    const sctx = small.getContext('2d');
    const image = sctx.createImageData(small.width, small.height);
    for (let i = 0; i < image.data.length; i += 4) {
        const value = Math.round(255 * between(rnd, low, high));
        image.data[i] = value;
        image.data[i + 1] = value;
        image.data[i + 2] = value;
        image.data[i + 3] = 255;
    }
    sctx.putImageData(image, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, width, height);
    ctx.restore();
}

function makePaper(width, height, color, rnd, tornTop) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (tornTop) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, 34);
        for (let x = 0; x <= width; x += 11) {
            ctx.lineTo(x, 26 + rnd() * 16);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.clip();
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    blotch(ctx, rnd, width, height, 14, 0.93, 1, 0.7);
    blotch(ctx, rnd, width, height, 60, 0.96, 1, 0.5);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 5000; i += 1) {
        ctx.globalAlpha = between(rnd, 0.02, 0.07);
        ctx.fillRect(rnd() * width, rnd() * height, 1.3, 1.3);
    }
    ctx.strokeStyle = '#FFFFFF';
    for (let i = 0; i < 260; i += 1) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.globalAlpha = between(rnd, 0.05, 0.14);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + between(rnd, -14, 14), y + between(rnd, -14, 14));
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return canvas;
}

// --- pre-printed forms ---------------------------------------------------------
// Each template draws the pad form and returns where a person writes. Printed
// content is nudged a couple of pixels as a whole, the way cheap pad printing
// never quite registers.

function printer(ctx, rnd, ink) {
    const nx = between(rnd, -3, 3);
    const ny = between(rnd, -3, 3);
    return {
        text(text, x, y, size, options = {}) {
            ctx.font = `${options.bold ? 'bold ' : ''}${size}px "Inter"`;
            ctx.fillStyle = options.color || ink;
            ctx.textAlign = options.align || 'left';
            ctx.fillText(text, x + nx, y + ny);
            ctx.textAlign = 'left';
        },
        line(x1, y1, x2, y2, width = 2, color = ink) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x1 + nx, y1 + ny);
            ctx.lineTo(x2 + nx, y2 + ny);
            ctx.stroke();
        },
        rect(x, y, w, h, width = 2, color = ink) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.strokeRect(x + nx, y + ny, w, h);
        },
        fill(x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x + nx, y + ny, w, h);
        },
        field(label, x, y, lineFrom, lineTo, size = 26) {
            this.text(label, x, y, size);
            this.line(lineFrom, y + 6, lineTo, y + 6, 1.6);
            return { x: lineFrom + 16, y: y - 8 };
        }
    };
}

function table(p, top, left, right, columns, headers, rows, rowHeight, headerTint) {
    p.fill(left, top, right - left, 56, headerTint);
    headers.forEach((header, index) => p.text(header, columns[index] + 18, top + 38, 23, { bold: true }));
    const bottom = top + 56 + rows * rowHeight;
    p.rect(left, top, right - left, bottom - top, 2.2);
    columns.slice(1).forEach(x => p.line(x, top, x, bottom, 1.6));
    const slots = [];
    for (let row = 0; row < rows; row += 1) {
        const y = top + 56 + (row + 1) * rowHeight;
        if (row < rows - 1) p.line(left, y, right, y, 1.1);
        slots.push(columns.map(x => ({ x: x + 22, y: y - rowHeight * 0.26 })));
    }
    return { slots, bottom };
}

const TEMPLATES = {
    goodwill: {
        width: 1400,
        height: 2000,
        draw(ctx, rnd, scene) {
            const ink = '#1F3A73';
            const p = printer(ctx, rnd, ink);
            p.text('Goodwill', 80, 150, 80, { bold: true });
            p.text('®', 432, 102, 24);
            p.text('DONATION RECEIPT', 1320, 118, 40, { bold: true, align: 'right' });
            p.text('Goodwill Industries International  ·  Federal Tax ID 53-0196517', 80, 210, 24);
            p.text('Please keep this receipt for your tax records.', 80, 246, 22);
            p.line(80, 276, 1320, 276, 3);
            const slots = {
                date: p.field('Date', 80, 350, 160, 520),
                store: p.field('Store #', 580, 350, 690, 900),
                attendant: p.field('Attendant', 950, 350, 1090, 1320),
                donor: p.field('Donor name', 80, 440, 250, 1320),
                address: p.field('Address', 80, 520, 200, 1320),
                city: p.field('City, State, ZIP', 80, 600, 290, 1320)
            };
            const grid = table(p, 650, 80, 1320, [80, 200, 880, 1080], ['Qty', 'Description of items donated', 'Condition', "Donor's value"], 9, 72, 'rgba(31,58,115,0.12)');
            slots.rows = grid.slots;
            p.text('Total value (determined by donor)', 1050, 1430, 28, { bold: true, align: 'right' });
            p.text('$', 1082, 1430, 30, { bold: true });
            p.line(1105, 1436, 1320, 1436, 1.6);
            slots.total = { x: 1116, y: 1422 };
            [
                'Goodwill cannot determine the value of donated goods. The donor is responsible for',
                'determining fair market value. No goods or services were provided in exchange for',
                'this contribution.'
            ].forEach((line, index) => p.text(line, 80, 1510 + index * 34, 23));
            p.text('Attendant signature', 80, 1690, 24);
            p.line(310, 1696, 820, 1696, 1.6);
            slots.signature = { x: 330, y: 1660, width: 440 };
            p.text('Thank you for your donation!', 1320, 1690, 25, { bold: true, align: 'right' });
            p.text('Form GW-DR 03/24   ·   SAMPLE – FOR TESTING ONLY', 80, 1940, 18);
            p.text(scene.copyLabel, 1320, 1940, 18, { bold: true, align: 'right' });
            return slots;
        }
    },
    restore: {
        width: 1400,
        height: 1900,
        draw(ctx, rnd, scene) {
            const ink = '#1A1A1A';
            const p = printer(ctx, rnd, ink);
            p.text('Habitat for Humanity® ReStore', 80, 150, 54, { bold: true });
            p.text('No.', 1100, 145, 28);
            p.text(scene.serial, 1320, 148, 40, { bold: true, align: 'right', color: '#C1272D' });
            p.text('DONATION PICK-UP RECEIPT', 80, 216, 34, { bold: true });
            p.text('Proceeds help build homes in your community.', 80, 254, 22);
            p.line(80, 285, 1320, 285, 3);
            const slots = {
                date: p.field('Pick-up date', 80, 355, 250, 560),
                truck: p.field('Truck #', 610, 355, 720, 850),
                driver: p.field('Driver', 900, 355, 990, 1320),
                donor: p.field('Donor name', 80, 440, 250, 1320),
                street: p.field('Street', 80, 520, 180, 1320),
                city: p.field('City / State / ZIP', 80, 600, 300, 880),
                phone: p.field('Phone', 920, 600, 1010, 1320)
            };
            const grid = table(p, 655, 80, 1320, [80, 200, 860, 1080], ['Qty', 'Item description', 'Condition', 'Est. value'], 8, 74, 'rgba(0,0,0,0.08)');
            slots.rows = grid.slots;
            p.text('Total estimated value (provided by donor)', 80, 1385, 26, { bold: true });
            p.text('$', 1082, 1385, 30, { bold: true });
            p.line(1105, 1391, 1320, 1391, 1.6);
            slots.total = { x: 1116, y: 1376 };
            p.rect(80, 1440, 26, 26, 2);
            p.text('Items inspected at curb', 122, 1463, 24);
            p.rect(520, 1440, 26, 26, 2);
            p.text('Donor was present', 562, 1463, 24);
            slots.checks = [{ x: 80, y: 1440 }, { x: 520, y: 1440 }];
            [
                'Habitat for Humanity is a 501(c)(3) nonprofit organization. No goods or services were',
                'provided in exchange for this donation. The donor is responsible for determining the',
                'fair market value of donated items for tax purposes.'
            ].forEach((line, index) => p.text(line, 80, 1535 + index * 33, 22));
            p.line(80, 1716, 620, 1716, 1.6);
            p.text('Driver signature', 80, 1750, 21);
            p.line(760, 1716, 1320, 1716, 1.6);
            p.text('Donor signature', 760, 1750, 21);
            slots.signatures = [{ x: 110, y: 1680, width: 460 }, { x: 790, y: 1680, width: 460 }];
            p.text('PINK – DONOR COPY', 80, 1852, 18, { bold: true });
            p.text('RS-PU 11/25   ·   SAMPLE – FOR TESTING ONLY', 1320, 1852, 18, { align: 'right' });
            return slots;
        }
    },
    salvation: {
        width: 1400,
        height: 2150,
        draw(ctx, rnd) {
            const ink = '#161616';
            const red = '#C8102E';
            const p = printer(ctx, rnd, ink);
            p.text('The Salvation Army', 80, 145, 58, { bold: true, color: red });
            p.text('DONATION RECEIPT', 1320, 138, 36, { bold: true, align: 'right' });
            p.text('Family Store & Donation Center  ·  Tax ID 13-5562351', 80, 202, 24);
            p.text('Doing the Most Good', 80, 238, 22);
            p.line(80, 268, 1320, 268, 3, red);
            const slots = {
                date: p.field('Date received', 80, 340, 260, 620),
                donor: p.field('Donor name', 660, 340, 820, 1320),
                address: p.field('Address', 80, 420, 200, 1320)
            };
            const grid = table(p, 470, 80, 1320, [80, 180, 840, 1080], ['Qty', 'Item', 'Condition', 'Value ($)'], 13, 62, 'rgba(200,16,46,0.10)');
            slots.rows = grid.slots;
            p.text('TOTAL', 1060, 1400, 30, { bold: true, align: 'right' });
            p.text('$', 1082, 1400, 30, { bold: true });
            p.line(1105, 1406, 1320, 1406, 1.6);
            slots.total = { x: 1116, y: 1392 };
            [
                'The Salvation Army does not assign values to donated items. Please refer to the',
                'valuation guide available in store. No goods or services were provided in exchange.'
            ].forEach((line, index) => p.text(line, 80, 1480 + index * 33, 22));
            p.text('Received by', 80, 1630, 24);
            p.line(250, 1636, 700, 1636, 1.6);
            slots.signature = { x: 270, y: 1600, width: 400 };
            p.text('Thank you!', 1320, 1630, 26, { bold: true, align: 'right', color: red });
            p.text('SA-DR-11   ·   SAMPLE – FOR TESTING ONLY', 80, 2090, 18);
            return slots;
        }
    },
    svdp: {
        width: 1100,
        height: 1350,
        tornTop: true,
        draw(ctx, rnd) {
            const ink = '#243A5E';
            const p = printer(ctx, rnd, ink);
            p.text('St. Vincent de Paul', 70, 138, 50, { bold: true });
            p.text('THRIFT STORE', 70, 182, 26, { bold: true });
            p.text('DONATION RECEIPT', 1030, 138, 24, { bold: true, align: 'right' });
            p.line(70, 210, 1030, 210, 2.5);
            const slots = {
                date: p.field('Date', 70, 290, 150, 470, 24),
                name: p.field('Name', 520, 290, 610, 1030, 24)
            };
            p.text('Description of donation:', 70, 360, 24);
            slots.lines = [0, 1, 2, 3].map(index => {
                const y = 440 + index * 75;
                p.line(70, y, 1030, y, 1.4);
                return { x: 92, y: y - 12 };
            });
            p.text("Value (donor's estimate)   $", 70, 760, 24);
            p.line(430, 766, 760, 766, 1.4);
            slots.value = { x: 446, y: 752 };
            p.text('We are unable to assign a value to donated items.', 70, 830, 20);
            p.text('No goods or services were received. Thank you!', 70, 862, 20);
            p.text("Rec'd by", 70, 960, 24);
            p.line(180, 966, 520, 966, 1.4);
            slots.received = { x: 196, y: 952 };
            p.text('SAMPLE – FOR TESTING ONLY', 70, 1305, 17);
            return slots;
        }
    }
};

// --- handwriting -------------------------------------------------------------

function write(ctx, rnd, writer, text, x, y) {
    let cursor = x;
    const phase = rnd() * Math.PI * 2;
    const slope = writer.slope + between(rnd, -0.006, 0.006);
    for (const ch of String(text)) {
        const size = writer.size * (1 + between(rnd, -writer.jitter, writer.jitter));
        ctx.font = `${size}px "${writer.font}"`;
        const width = ctx.measureText(ch).width;
        const travelled = cursor - x;
        const lift = travelled * slope + Math.sin(travelled / 70 + phase) * writer.wobble + between(rnd, -0.5, 0.5) * writer.wobble;
        ctx.save();
        ctx.translate(cursor, y + lift);
        ctx.rotate(between(rnd, -writer.jitter, writer.jitter) * 0.7);
        ctx.fillStyle = writer.ink;
        ctx.globalAlpha = writer.alpha * between(rnd, 0.8, 1);
        ctx.fillText(ch, 0, 0);
        if (writer.grain === 'ballpoint') {
            ctx.globalAlpha *= 0.3;
            ctx.fillText(ch, 0.6, 0.4);
        }
        ctx.restore();
        cursor += width * writer.spacing + between(rnd, -0.03, 0.03) * size;
    }
    return cursor;
}

function strike(ctx, rnd, writer, x1, x2, y) {
    ctx.save();
    ctx.strokeStyle = writer.ink;
    ctx.globalAlpha = writer.alpha;
    ctx.lineWidth = writer.size * 0.07;
    ctx.beginPath();
    ctx.moveTo(x1 - 4, y - writer.size * 0.28 + between(rnd, -3, 3));
    ctx.lineTo(x2 + 4, y - writer.size * 0.34 + between(rnd, -3, 3));
    ctx.moveTo(x1 - 2, y - writer.size * 0.18 + between(rnd, -3, 3));
    ctx.lineTo(x2 + 6, y - writer.size * 0.26 + between(rnd, -3, 3));
    ctx.stroke();
    ctx.restore();
}

function scribble(ctx, rnd, writer, slot) {
    ctx.save();
    ctx.strokeStyle = writer.ink;
    ctx.globalAlpha = writer.alpha;
    ctx.lineWidth = writer.size * 0.065;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // A real signature is a tall opening loop, a run of cramped uneven humps that
    // shrink as the hand speeds up, and a slash underneath - not a sine wave.
    const base = slot.y + 24;
    const opening = between(rnd, 34, 58);
    ctx.beginPath();
    ctx.moveTo(slot.x, base);
    ctx.bezierCurveTo(slot.x - 12, base - opening * 1.4, slot.x + 46, base - opening * 1.6, slot.x + 22, base + 6);
    ctx.bezierCurveTo(slot.x + 10, base + 24, slot.x + 40, base + 10, slot.x + 52, base - 4);
    let x = slot.x + 52;
    const humps = 5 + Math.floor(rnd() * 5);
    const reach = slot.width * between(rnd, 0.62, 0.8);
    for (let i = 0; i < humps; i += 1) {
        const step = (reach / humps) * between(rnd, 0.6, 1.4);
        const height = opening * between(rnd, 0.25, 0.75) * (1 - i / (humps * 1.6));
        const loop = rnd() < 0.3;
        ctx.bezierCurveTo(
            x + step * (loop ? 0.9 : 0.25), base - height,
            x + step * (loop ? -0.1 : 0.7), base - height * (loop ? 1.2 : 0.9),
            x + step, base + between(rnd, -6, 8)
        );
        x += step;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth *= 0.8;
    ctx.moveTo(slot.x + between(rnd, 10, 40), base + between(rnd, 16, 26));
    ctx.quadraticCurveTo(slot.x + slot.width * 0.45, base + between(rnd, 26, 40), x + between(rnd, 10, 50), base + between(rnd, 2, 14));
    ctx.stroke();
    ctx.restore();
}

function tick(ctx, rnd, writer, box) {
    ctx.save();
    ctx.strokeStyle = writer.ink;
    ctx.globalAlpha = writer.alpha;
    ctx.lineWidth = writer.size * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(box.x + 2 + between(rnd, -3, 3), box.y + 12);
    ctx.lineTo(box.x + 11, box.y + 26 + between(rnd, -2, 4));
    ctx.lineTo(box.x + 34 + between(rnd, -3, 5), box.y - 10 + between(rnd, -4, 4));
    ctx.stroke();
    ctx.restore();
}

function roughen(inkCanvas, rnd, grain) {
    const ctx = inkCanvas.getContext('2d');
    const density = { ballpoint: 0.004, carbon: 0.05, pencil: 0.11 }[grain];
    const count = Math.round(inkCanvas.width * inkCanvas.height * density);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < count; i += 1) {
        ctx.globalAlpha = between(rnd, 0.35, 0.9);
        ctx.fillRect(rnd() * inkCanvas.width, rnd() * inkCanvas.height, 1.6, 1.6);
    }
    ctx.restore();
    const soften = { ballpoint: 0.85, carbon: 0.62, pencil: 0.7 }[grain];
    const small = createCanvas(Math.round(inkCanvas.width * soften), Math.round(inkCanvas.height * soften));
    small.getContext('2d').drawImage(inkCanvas, 0, 0, small.width, small.height);
    return small;
}

function fillIn(scene, slots, ink, rnd) {
    const w = scene.writer;
    const e = scene.entries;
    const put = (slot, entry, dx = 0, dy = 0) => {
        if (!slot || entry === undefined || entry === '') return null;
        const scaled = entry && typeof entry === 'object' && 'scale' in entry;
        const writer = scaled ? { ...w, size: w.size * entry.scale } : w;
        const text = scaled ? entry.text : entry;
        return write(ink, rnd, writer, text, slot.x + dx + between(rnd, -6, 10), slot.y + dy + between(rnd, -4, 6));
    };
    for (const key of ['date', 'store', 'attendant', 'donor', 'address', 'city', 'truck', 'driver', 'street', 'phone', 'name']) {
        put(slots[key], e[key]);
    }
    (e.rows || []).forEach((row, index) => {
        const cells = slots.rows[index];
        row.forEach((value, column) => {
            if (value && typeof value === 'object' && 'struck' in value) {
                const start = cells[column].x;
                const end = put(cells[column], value.struck);
                strike(ink, rnd, w, start, end, cells[column].y + 4);
                put({ x: end + 14, y: cells[column].y - 6 }, value.text);
                return;
            }
            const drift = column === 1 ? between(rnd, -8, 24) : 0;
            put(cells[column], value, drift);
        });
    });
    (e.lines || []).forEach((line, index) => put(slots.lines[index], line));
    put(slots.total, e.total);
    put(slots.value, e.value);
    put(slots.received, e.received);
    if (e.signature && slots.signature) scribble(ink, rnd, w, slots.signature);
    (e.signatures || []).forEach((on, index) => on && scribble(ink, rnd, w, slots.signatures[index]));
    (e.checks || []).forEach((on, index) => on && tick(ink, rnd, w, slots.checks[index]));
}

// --- damage ---------------------------------------------------------------------

function crease(ctx, width, height, crease) {
    const horizontal = crease.axis === 'h';
    const at = (horizontal ? height : width) * crease.at;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120,110,95,0.07)';
    if (horizontal) ctx.fillRect(0, at, width, height - at);
    else ctx.fillRect(at, 0, width - at, height);
    ctx.globalCompositeOperation = 'source-over';
    const band = (offset, color, lineWidth) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        if (horizontal) {
            ctx.moveTo(0, at + offset);
            ctx.lineTo(width, at + offset + 3);
        } else {
            ctx.moveTo(at + offset, 0);
            ctx.lineTo(at + offset + 3, height);
        }
        ctx.stroke();
    };
    band(-3, 'rgba(255,255,255,0.45)', 4);
    band(1, 'rgba(60,50,40,0.22)', 2);
    ctx.restore();
}

function crumple(ctx, rnd, width, height) {
    blotch(ctx, rnd, width, height, 9, 0.72, 1, 0.9);
    blotch(ctx, rnd, width, height, 26, 0.84, 1, 0.8);
    for (let i = 0; i < 55; i += 1) {
        const x = rnd() * width;
        const y = rnd() * height;
        const angle = rnd() * Math.PI;
        const length = between(rnd, 120, 520);
        const mx = x + Math.cos(angle) * length * 0.5 + between(rnd, -30, 30);
        const my = y + Math.sin(angle) * length * 0.5 + between(rnd, -30, 30);
        const ex = x + Math.cos(angle) * length;
        const ey = y + Math.sin(angle) * length;
        for (const [dx, color, lineWidth] of [[-2, 'rgba(255,255,255,0.35)', 3], [1, 'rgba(50,40,30,0.16)', 1.6]]) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(x + dx, y);
            ctx.lineTo(mx + dx, my);
            ctx.lineTo(ex + dx, ey);
            ctx.stroke();
        }
    }
}

// --- the photograph ----------------------------------------------------------------

function background(ctx, rnd, kind) {
    const W = PHOTO_WIDTH;
    const H = PHOTO_HEIGHT;
    const base = { granite: '#8F8B86', wood: '#6E4526', oak: '#A7784C', clipboard: '#3A3C40', darkcounter: '#34373B' }[kind];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    if (kind === 'granite' || kind === 'darkcounter') {
        for (let i = 0; i < 70000; i += 1) {
            const shade = Math.floor(between(rnd, 20, 235));
            ctx.fillStyle = `rgba(${shade},${shade},${shade},${between(rnd, 0.15, 0.5)})`;
            const size = between(rnd, 1, kind === 'granite' ? 4 : 2.5);
            ctx.fillRect(rnd() * W, rnd() * H, size, size);
        }
    }
    if (kind === 'wood' || kind === 'oak') {
        for (let i = 0; i < 260; i += 1) {
            const y = rnd() * H;
            const amplitude = between(rnd, 4, 30);
            const frequency = between(rnd, 0.001, 0.004);
            const phase = rnd() * 10;
            const dark = rnd() < 0.6;
            ctx.strokeStyle = dark ? `rgba(40,20,8,${between(rnd, 0.08, 0.3)})` : `rgba(255,220,170,${between(rnd, 0.05, 0.16)})`;
            ctx.lineWidth = between(rnd, 1.5, 9);
            ctx.beginPath();
            for (let x = -20; x <= W + 20; x += 40) {
                const yy = y + Math.sin(x * frequency + phase) * amplitude;
                if (x < 0) ctx.moveTo(x, yy);
                else ctx.lineTo(x, yy);
            }
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(25,12,5,0.55)';
        ctx.lineWidth = 5;
        [0.31, 0.78].forEach(f => {
            ctx.beginPath();
            ctx.moveTo(0, H * f);
            ctx.lineTo(W, H * f + 8);
            ctx.stroke();
        });
    }
    if (kind === 'clipboard') {
        ctx.fillStyle = '#8A6443';
        ctx.fillRect(W * 0.03, H * 0.02, W * 0.94, H * 0.99);
        for (let i = 0; i < 40000; i += 1) {
            ctx.fillStyle = `rgba(40,25,10,${between(rnd, 0.05, 0.2)})`;
            ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
        }
    }
    blotch(ctx, rnd, W, H, 10, 0.78, 1, 0.9);
}

function homography(p0, p1, p2, p3) {
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    const det = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / det;
    const h = (dx1 * dy3 - dx3 * dy1) / det;
    const a = p1.x - p0.x + g * p1.x;
    const b = p3.x - p0.x + h * p3.x;
    const c = p0.x;
    const d = p1.y - p0.y + g * p1.y;
    const e = p3.y - p0.y + h * p3.y;
    const f = p0.y;
    return (u, v) => {
        const w = g * u + h * v + 1;
        return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
    };
}

function affine(s0, s1, s2, d0, d1, d2) {
    const u1 = s1.x - s0.x;
    const v1 = s1.y - s0.y;
    const u2 = s2.x - s0.x;
    const v2 = s2.y - s0.y;
    const det = u1 * v2 - u2 * v1;
    const solve = (t0, t1, t2) => {
        const p = ((t1 - t0) * v2 - (t2 - t0) * v1) / det;
        const q = ((t2 - t0) * u1 - (t1 - t0) * u2) / det;
        return [p, q, t0 - p * s0.x - q * s0.y];
    };
    const [a, c, e] = solve(d0.x, d1.x, d2.x);
    const [b, d, f] = solve(d0.y, d1.y, d2.y);
    return [a, b, c, d, e, f];
}

function drawTriangle(ctx, image, s, d) {
    const cx = (d[0].x + d[1].x + d[2].x) / 3;
    const cy = (d[0].y + d[1].y + d[2].y) / 3;
    const grow = point => {
        const dx = point.x - cx;
        const dy = point.y - cy;
        const length = Math.hypot(dx, dy) || 1;
        return { x: point.x + (dx / length) * 0.9, y: point.y + (dy / length) * 0.9 };
    };
    const g = d.map(grow);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g[0].x, g[0].y);
    ctx.lineTo(g[1].x, g[1].y);
    ctx.lineTo(g[2].x, g[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(...affine(s[0], s[1], s[2], d[0], d[1], d[2]));
    const minX = Math.max(0, Math.floor(Math.min(s[0].x, s[1].x, s[2].x)) - 2);
    const minY = Math.max(0, Math.floor(Math.min(s[0].y, s[1].y, s[2].y)) - 2);
    const maxX = Math.min(image.width, Math.ceil(Math.max(s[0].x, s[1].x, s[2].x)) + 2);
    const maxY = Math.min(image.height, Math.ceil(Math.max(s[0].y, s[1].y, s[2].y)) + 2);
    ctx.drawImage(image, minX, minY, maxX - minX, maxY - minY, minX, minY, maxX - minX, maxY - minY);
    ctx.restore();
}

function photograph(paper, scene, rnd) {
    const { photo } = scene;
    const canvas = createCanvas(PHOTO_WIDTH, PHOTO_HEIGHT);
    const ctx = canvas.getContext('2d');
    background(ctx, rnd, photo.background);

    const width = PHOTO_WIDTH * photo.scale;
    const height = (width * paper.height) / paper.width;
    const cx = PHOTO_WIDTH / 2 + photo.offset[0];
    const cy = PHOTO_HEIGHT / 2 + photo.offset[1];
    const angle = (photo.rotate * Math.PI) / 180;
    const pinch = width * photo.keystone;
    const corner = (x, y) => {
        const jx = x + between(rnd, -6, 6);
        const jy = y + between(rnd, -6, 6);
        return {
            x: cx + jx * Math.cos(angle) - jy * Math.sin(angle),
            y: cy + jx * Math.sin(angle) + jy * Math.cos(angle)
        };
    };
    const map = homography(
        corner(-width / 2 + pinch, -height / 2),
        corner(width / 2 - pinch, -height / 2),
        corner(width / 2 + pinch * 0.3, height / 2),
        corner(-width / 2 - pinch * 0.3, height / 2)
    );
    const place = (u, v) => {
        const point = map(u, v);
        return { x: point.x + Math.sin(Math.PI * v) * photo.bow, y: point.y + Math.sin(Math.PI * u) * photo.bow * 0.4 };
    };

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 38;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    const outline = [];
    for (let t = 0; t <= 1; t += 0.05) outline.push(place(t, 0));
    for (let t = 0; t <= 1; t += 0.05) outline.push(place(1, t));
    for (let t = 1; t >= 0; t -= 0.05) outline.push(place(t, 1));
    for (let t = 1; t >= 0; t -= 0.05) outline.push(place(0, t));
    outline.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const columns = 22;
    const rows = Math.round((columns * paper.height) / paper.width);
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const u0 = column / columns;
            const u1 = (column + 1) / columns;
            const v0 = row / rows;
            const v1 = (row + 1) / rows;
            const src = [
                { x: u0 * paper.width, y: v0 * paper.height },
                { x: u1 * paper.width, y: v0 * paper.height },
                { x: u1 * paper.width, y: v1 * paper.height },
                { x: u0 * paper.width, y: v1 * paper.height }
            ];
            const dst = [place(u0, v0), place(u1, v0), place(u1, v1), place(u0, v1)];
            drawTriangle(ctx, paper, [src[0], src[1], src[2]], [dst[0], dst[1], dst[2]]);
            drawTriangle(ctx, paper, [src[0], src[2], src[3]], [dst[0], dst[2], dst[3]]);
        }
    }

    if (photo.background === 'clipboard') {
        const top = place(0.5, 0);
        const gradient = ctx.createLinearGradient(top.x - 180, 0, top.x + 180, 0);
        gradient.addColorStop(0, '#8E9399');
        gradient.addColorStop(0.5, '#E3E6EA');
        gradient.addColorStop(1, '#7B8086');
        ctx.save();
        ctx.translate(top.x, top.y);
        ctx.rotate(angle);
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = gradient;
        ctx.fillRect(-190, -70, 380, 130);
        ctx.restore();
    }

    light(ctx, rnd, photo.lighting);
    return finish(canvas, rnd, photo);
}

function light(ctx, rnd, lighting) {
    const W = PHOTO_WIDTH;
    const H = PHOTO_HEIGHT;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const fall = ctx.createLinearGradient(0, 0, W, H);
    const tones = {
        daylight: ['#FFFFFF', '#D8D3CB'],
        phoneShadow: ['#F4F2EE', '#C9C4BC'],
        harsh: ['#FFFFFF', '#B9B4AC'],
        warm: ['#FFE9C8', '#C9A77C'],
        dim: ['#B9B2A6', '#6F6A62']
    }[lighting];
    fall.addColorStop(0, tones[0]);
    fall.addColorStop(1, tones[1]);
    ctx.fillStyle = fall;
    ctx.fillRect(0, 0, W, H);
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vignette.addColorStop(0, 'rgba(255,255,255,1)');
    vignette.addColorStop(1, lighting === 'dim' ? 'rgba(60,55,50,1)' : 'rgba(150,145,140,1)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    if (lighting === 'phoneShadow') {
        const shadow = ctx.createRadialGradient(W * 0.12, H * 0.95, 60, W * 0.12, H * 0.95, 900);
        shadow.addColorStop(0, 'rgba(80,76,72,1)');
        shadow.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    if (lighting === 'harsh') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const glare = ctx.createRadialGradient(W * 0.68, H * 0.3, 20, W * 0.68, H * 0.3, 620);
        glare.addColorStop(0, 'rgba(255,255,255,0.75)');
        glare.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glare;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }
}

function finish(canvas, rnd, photo) {
    let result = canvas;
    if (photo.blur < 1) {
        const small = createCanvas(Math.round(canvas.width * photo.blur), Math.round(canvas.height * photo.blur));
        small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
        result = createCanvas(canvas.width, canvas.height);
        result.getContext('2d').drawImage(small, 0, 0, canvas.width, canvas.height);
    }
    const ctx = result.getContext('2d');
    const image = ctx.getImageData(0, 0, result.width, result.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
        const shared = (rnd() - 0.5) * photo.noise * 2;
        data[i] = Math.max(0, Math.min(255, data[i] + shared + (rnd() - 0.5) * photo.noise * 0.6));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + shared));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + shared + (rnd() - 0.5) * photo.noise * 0.6));
    }
    ctx.putImageData(image, 0, 0);
    return result.toBuffer('image/jpeg', Math.round(photo.quality * 100));
}

// --- main ----------------------------------------------------------------------------

function render(donation) {
    const scene = SCENES[donation.id];
    if (!scene) throw new Error(`${donation.id} is a simulated photograph but has no scene in ${path.basename(__filename)}`);
    const template = TEMPLATES[scene.template];
    const rnd = mulberry32(seedFrom(donation.id));

    const paper = makePaper(template.width, template.height, scene.paper, rnd, template.tornTop);
    const pctx = paper.getContext('2d');
    const slots = template.draw(pctx, rnd, scene);

    const inkCanvas = createCanvas(template.width, template.height);
    fillIn(scene, slots, inkCanvas.getContext('2d'), rnd);
    const ink = roughen(inkCanvas, rnd, scene.writer.grain);
    pctx.save();
    pctx.globalCompositeOperation = 'multiply';
    pctx.drawImage(ink, 0, 0, template.width, template.height);
    pctx.restore();

    (scene.photo.creases || []).forEach(c => crease(pctx, template.width, template.height, c));
    if (scene.photo.crumple) crumple(pctx, rnd, template.width, template.height);

    return photograph(paper, scene, rnd);
}

function main() {
    const { documentPath, isSimulatedPhotograph } = require('./generate_from_donations');
    const donations = JSON.parse(fs.readFileSync(path.join(root, 'donations.json'), 'utf8')).donations;
    const only = (process.env.ONLY_DONATIONS || '').split(',').map(id => id.trim()).filter(Boolean);
    const targets = donations.filter(d => isSimulatedPhotograph(d) && (!only.length || only.includes(d.id)));
    if (!targets.length) throw new Error('No simulated photograph donations matched');
    for (const donation of targets) {
        for (const formType of donation.forms) {
            const output = path.join(root, 'documents', documentPath(donation, formType));
            fs.mkdirSync(path.dirname(output), { recursive: true });
            const bytes = render(donation);
            fs.writeFileSync(output, bytes);
            console.log(`  ✓ ${path.relative(root, output)}  ${(bytes.length / 1024).toFixed(0)} KB`);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = { SCENES, render };
