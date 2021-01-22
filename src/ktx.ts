import fs from 'fs';

import { CompressionFormat, toGLBaseInternalFormat, toGLInternalFormat } from "./format";
import { pad4 } from "./util";

/** identifier + header elements (not including key value meta-data pairs) */
const KTX_HEADER_LENGTH = 12 + 13 * 4;

/** identifier */
const KTX_IDENTIFIER = new Uint8Array([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);

const KTX_ENDIANESS = 0x04030201;

// /** `type` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
// readonly glType: number;
// /** data type size (must be 1 for compressed textures) */
// readonly glTypeSize: number;
// /** `format` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
// readonly glFormat: number;
// /** `internalformat` parameter passed to `gl.TexStorage*D`, `gl.TexImage*D` or `gl.compressedTexImage*D` */
// readonly glInternalFormat: number;
// /** base internal format of the texture (`gl.RGB`, `gl.RGBA`, `gl.ALPHA`, etc) */
// readonly glBaseInternalFormat: number;
// /** width of the texture at level 0 in pixels */
// readonly pixelWidth: number;
// /** height of the texture at level 0 in pixels (must be 0 for 1D textures) */
// readonly pixelHeight: number;
// /** depth of the texture at level 0 in pixels (must be 0 for 1D and 2D textures) */
// readonly pixelDepth: number;
// /** number of texture array elements (must be 0 if texture is not an array texture) */
// readonly numberOfArrayElements: number;
// /** must be 1 for non cubemaps or 6 for cubemaps (+X, -X, +Y, -Y, +Z, -Z.) */
// readonly numberOfFaces: number;
// /** number of mimmap levels (0 indicates that mipmaps should be generated at load time) */
// readonly numberOfMipmapLevels: number;
// /** byte size of arbitrary key value data */
// readonly bytesOfKeyValueData: number;

function keyAndValueByteSize(key: string, value: string): number {
    return pad4(4 + key.length + value.length + 2); // 0-terminated C strings (2 * 0 terminator)
}

class BufferWriter {
    readonly buffer: Buffer;
    offset: number = 0;

    constructor(size: number) {
        this.buffer = Buffer.alloc(size);
    }

    writeUint8Array(array: Uint8Array) {
        for (const item of array) {
            this.buffer.writeUInt8(item, this.offset++);
        }
    }

    writeUInt32(n: number) {
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
    }

    writeCString(s: string) {
        this.buffer.write(s, this.offset, 'ascii');
        this.offset += s.length;
        this.buffer.writeUInt8(0, this.offset++);
    }

    pad4() {
        const paddedOffset = pad4(this.offset);
        while (this.offset < paddedOffset) {
            this.buffer.writeUInt8(0, this.offset++);
        }
    }
}

type Input = {
    width: number,
    height: number,
    format: CompressionFormat,
    srgb: boolean,
    yflip: boolean,
    data: Buffer[],
};

export function storeKTX({ width, height, format, srgb, yflip, data }: Input): Buffer {
    const keyValues = new Map<string, string>();
    keyValues.set('KTXorientation', `S=r,T=${yflip ? 'u' : 'd'}`);

    const keyValueDataLength = [...keyValues.entries()]
        .reduce((len, [key, val]) => len + keyAndValueByteSize(key, val), 0);
    const imageDataLength = data.reduce((len, d) => len + 4 + pad4(d.byteLength), 0);

    const writer = new BufferWriter(KTX_HEADER_LENGTH + keyValueDataLength + imageDataLength);

    // identifier
    writer.writeUint8Array(KTX_IDENTIFIER);

    // endianess
    writer.writeUInt32(KTX_ENDIANESS);

    // glType
    writer.writeUInt32(0);
    // glTypeSize
    writer.writeUInt32(1);
    // glFormat
    writer.writeUInt32(0);
    // glInternalFormat
    writer.writeUInt32(toGLInternalFormat(format, srgb));
    // glBaseInternalFormat
    writer.writeUInt32(toGLBaseInternalFormat(format));
    // pixelWidth
    writer.writeUInt32(width);
    // pixelHeight
    writer.writeUInt32(height);
    // pixelDepth
    writer.writeUInt32(0);
    // numberOfArrayElements
    writer.writeUInt32(0);
    // numberOfFaces
    writer.writeUInt32(1);
    // numberOfMipmapLevels
    writer.writeUInt32(data.length);
    // bytesOfKeyValueData
    writer.writeUInt32(keyValueDataLength);

    // key value data
    for (const [key, value] of keyValues) {
        writer.writeUInt32(keyAndValueByteSize(key, value));
        writer.writeCString(key);
        writer.writeCString(value);
        writer.pad4();
    }

    // mipmap data
    for (const level of data) {
        writer.writeUInt32(level.byteLength);
        writer.writeUint8Array(level);
        writer.pad4();
    }

    if (writer.offset !== writer.buffer.byteLength) {
        throw new Error('KTX data length mismatch');
    }

    return writer.buffer;
}

// load first miplevel image data
export async function loadKTXImageData(path: string): Promise<Buffer> {
    const file = await fs.promises.open(path, 'r');

    const read = async (length: number, position?: number) => {
        const { bytesRead, buffer } = await file.read(Buffer.alloc(length), 0, length, position);
        if (bytesRead !== length) {
            throw new Error(`Failed reading KTX file: ${path}`);
        }
        return buffer;
    };

    // read header
    const header = await read(KTX_HEADER_LENGTH);

    // check identifier
    for (const [index, byte] of KTX_IDENTIFIER.entries()) {
        if (header[index] !== byte) {
            throw new Error(`Invalid KTX identifier: ${path}`)
        }
    }

    const dataSize = Uint32Array.BYTES_PER_ELEMENT;
    const headerDataView = new DataView(header.buffer, KTX_IDENTIFIER.byteLength);
    const endianness = headerDataView.getUint32(0, true);
    const littleEndian = endianness === KTX_ENDIANESS;
    const getHeaderUint32 = (index: number) => headerDataView.getUint32(index * dataSize, littleEndian);

    // const glType = getHeaderUint32(1);
    // const glTypeSize = getHeaderUint32(2);
    // const glFormat = getHeaderUint32(3);
    // const glInternalFormat = getHeaderUint32(4);
    // const glBaseInternalFormat = getHeaderUint32(5);
    // const pixelWidth = getHeaderUint32(6);
    // const pixelHeight = getHeaderUint32(7);
    // const pixelDepth = getHeaderUint32(8);
    // const numberOfArrayElements = getHeaderUint32(9);
    // const numberOfFaces = getHeaderUint32(10);
    // const numberOfMipmapLevels = getHeaderUint32(11);
    const bytesOfKeyValueData = getHeaderUint32(12);

    const dataOffset = KTX_HEADER_LENGTH + bytesOfKeyValueData;
    const imageSizeBuffer = await read(4, dataOffset);
    const imageSize = littleEndian ? imageSizeBuffer.readUInt32LE() : imageSizeBuffer.readUInt32BE();
    const data = await read(imageSize, dataOffset + 4)

    await file.close();

    return data;
}
