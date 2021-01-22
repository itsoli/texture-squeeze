import fs from 'fs';

const ASTC_MAGIC_ID = 0x5ca1ab13;

const ASTC_HEADER_LENGTH = 4 + 1 * 3 + 3 * 3;

function unpackBytes(a: number, b: number, c: number, d: number): number {
	return a | (b << 8) | (c << 16) | (d << 24);
}

export type ASTCContainer = {
    blockX: number;
    blockY: number;
    blockZ: number;
    dimX: number;
    dimY: number;
    dimZ: number;
    data: Buffer;
};

export async function loadASTC(path: string): Promise<ASTCContainer> {
    const file = await fs.promises.open(path, 'r');

    const read = async (length: number) => {
        const { bytesRead, buffer } = await file.read(Buffer.alloc(length), 0, length);
        if (bytesRead !== length) {
            throw new Error(`Failed reading ASTC file: ${path}`);
        }
        return buffer;
    };

    // read header
    const header = await read(ASTC_HEADER_LENGTH);

    let offset = 0;

    // check file magic id
    const magic = unpackBytes(header[offset++], header[offset++], header[offset++], header[offset++]);
    if (magic !== ASTC_MAGIC_ID) {
        throw new Error(`Invalid ASTC magic id: ${path}`);
    }

    // read block size
    const blockX = Math.max(1, header[offset++]);
    const blockY = Math.max(1, header[offset++]);
    const blockZ = Math.max(1, header[offset++]);

    // read dimensions
    const readDim = () => unpackBytes(header[offset++], header[offset++], header[offset++], 0);
    const dimX = readDim();
    const dimY = readDim();
    const dimZ = readDim();

    if (dimX === 0 || dimY === 0 || dimZ === 0) {
        throw new Error(`Corrupt ASTC file: ${path}`);
    }

    // calculate number of blocks per dimension
	const xBlocks = Math.floor((dimX + blockX - 1) / blockX);
	const yBlocks = Math.floor((dimY + blockY - 1) / blockX);
	const zBlocks = Math.floor((dimZ + blockZ - 1) / blockZ);

    // expected data chunk size
    const dataSize = xBlocks * yBlocks * zBlocks * 16;

    // read data
    const data = await read(dataSize);

    await file.close();

    return { blockX, blockY, blockZ, dimX, dimY, dimZ, data };
}
