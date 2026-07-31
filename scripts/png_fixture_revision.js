const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const FIXTURE_REVISION_KEY = 'DonateMateFixtureRevision';
const FIXTURE_REVISION = 'dm-3062-v1';

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    typeBuffer.copy(chunk, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
    return chunk;
}

function parseChunks(buffer) {
    if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error('Fixture revision can only be applied to PNG files');
    }

    const chunks = [];
    let offset = PNG_SIGNATURE.length;
    let sawIend = false;

    while (offset < buffer.length) {
        if (offset + 12 > buffer.length) {
            throw new Error('Malformed PNG chunk header');
        }

        const length = buffer.readUInt32BE(offset);
        const end = offset + 12 + length;
        if (end > buffer.length) {
            throw new Error('Malformed PNG chunk length');
        }

        const type = buffer.toString('ascii', offset + 4, offset + 8);
        chunks.push({
            type,
            raw: buffer.subarray(offset, end),
            data: buffer.subarray(offset + 8, offset + 8 + length)
        });
        offset = end;

        if (type === 'IEND') {
            sawIend = true;
            break;
        }
    }

    if (!sawIend || offset !== buffer.length) {
        throw new Error('Malformed PNG: IEND must be the final chunk');
    }

    return chunks;
}

function fixtureRevision(buffer) {
    const prefix = `${FIXTURE_REVISION_KEY}\0`;
    for (const chunk of parseChunks(buffer)) {
        if (chunk.type !== 'tEXt') continue;
        const value = chunk.data.toString('latin1');
        if (value.startsWith(prefix)) return value.slice(prefix.length);
    }
    return null;
}

function applyFixtureRevision(buffer, revision = FIXTURE_REVISION) {
    if (!revision || revision.includes('\0')) {
        throw new Error('Fixture revision must be a non-empty PNG text value');
    }

    const prefix = `${FIXTURE_REVISION_KEY}\0`;
    const revisionChunk = createChunk('tEXt', Buffer.from(`${prefix}${revision}`, 'latin1'));
    const chunks = parseChunks(buffer).filter(chunk => {
        if (chunk.type !== 'tEXt') return true;
        return !chunk.data.toString('latin1').startsWith(prefix);
    });

    const output = [PNG_SIGNATURE];
    for (const chunk of chunks) {
        if (chunk.type === 'IEND') output.push(revisionChunk);
        output.push(chunk.raw);
    }
    return Buffer.concat(output);
}

module.exports = {
    FIXTURE_REVISION,
    applyFixtureRevision,
    fixtureRevision
};
