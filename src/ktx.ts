import fs from 'fs';
import { BufferReader } from './buffer-reader';
import { BufferWriter } from './buffer-writer';

import { CompressionFormat, GLPixelFormat, toGLPixelFormat } from './format';
import { calcNumMipmapLevels, pad4 } from './util';

/** identifier + header elements (not including key value meta-data pairs) */
const KTX_HEADER_LENGTH = 12 + 13 * 4;

/** ktx identifier / file magic */
const KTX_IDENTIFIER = new Uint8Array([
    0xab,
    0x4b,
    0x54,
    0x58,
    0x20,
    0x31,
    0x31,
    0xbb,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
]);

/** indicates the endianess of the stored data */
const KTX_ENDIANESS = 0x04030201;

// OpenGL 4.5 guaranteed minimum limits
const GL_MAX_TEXTURE_SIZE = 16384;
const GL_MAX_3D_TEXTURE_SIZE = 2048;
const GL_MAX_ARRAY_TEXTURE_LAYERS = 2048;

export type KTXContainer = {
    /** `type` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
    glType: number;
    /** data type size (must be 1 for compressed textures) */
    glTypeSize: number;
    /** `format` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
    glFormat: number;
    /** `internalformat` parameter passed to `gl.TexStorage*D`, `gl.TexImage*D` or `gl.compressedTexImage*D` */
    glInternalFormat: number;
    /** base internal format of the texture (`gl.RGB`, `gl.RGBA`, `gl.ALPHA`, etc) */
    glBaseInternalFormat: number;
    /** width of the texture at level 0 in pixels */
    pixelWidth: number;
    /** height of the texture at level 0 in pixels (must be 0 for 1D textures) */
    pixelHeight: number;
    /** depth of the texture at level 0 in pixels (must be 0 for 1D and 2D textures) */
    pixelDepth: number;
    /** number of texture array elements (must be 0 if texture is not an array texture) */
    numberOfArrayElements: number;
    /** must be 1 for non cubemaps or 6 for cubemaps (+X, -X, +Y, -Y, +Z, -Z.) */
    numberOfFaces: number;
    /** number of mimmap levels (0 indicates that mipmaps should be generated at load time) */
    numberOfMipmapLevels: number;
    /** byte size of arbitrary key value data */
    bytesOfKeyValueData: number;
    /** arbitrary key value pairs */
    keyValuePairs: Map<string, string>;
    /** image data (mipmap levels * array elements * faces) */
    imageData: Buffer[];
};

class KTXError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KTXError';
    }
}

function keyAndValueByteSize(key: string, value: string): number {
    // uint32 byte size + key chars + 0 terminator + value chars + 0 terminator
    return pad4(4 + key.length + value.length + 2);
}

export type DataDescriptor = {
    format: CompressionFormat;
    width: number;
    height?: number;
    depth?: number;
    levels?: number;
    layers?: number;
    faces?: number;
    yflipped?: boolean;
};

type Output = { container: KTXContainer; buffer: Buffer };

/**
 * Stores given image data into a buffer formatted as KTX.
 * Image data of the container points to slices of the underlying buffer memory.
 */
export function storeKTX(data: Buffer[], descriptor: DataDescriptor): Output {
    const {
        format,
        width,
        height = 0,
        depth = 0,
        levels = data.length,
        layers = 0,
        faces = 1,
        yflipped = false,
    } = descriptor;

    // TODO: input validation

    const keyValuePairs = new Map<string, string>();
    keyValuePairs.set('KTXorientation', `S=r,T=${yflipped ? 'u' : 'd'}`);

    const bytesOfKeyValueData = [...keyValuePairs.entries()].reduce(
        (len, [key, val]) => len + keyAndValueByteSize(key, val),
        0
    );
    const bytesOfImageData = data.reduce((len, d) => len + 4 + pad4(d.byteLength), 0);

    const buffer = Buffer.alloc(KTX_HEADER_LENGTH + bytesOfKeyValueData + bytesOfImageData);
    const writer = new BufferWriter(buffer);

    const glFormat = toGLPixelFormat(format);

    const container: KTXContainer = {
        ...glFormat,
        pixelWidth: width,
        pixelHeight: height,
        pixelDepth: depth,
        numberOfArrayElements: layers,
        numberOfFaces: faces,
        numberOfMipmapLevels: data.length,
        bytesOfKeyValueData,
        keyValuePairs,
        imageData: [],
    };

    // identifier
    writer.writeUint8Array(KTX_IDENTIFIER);

    // endianess
    writer.writeUInt32(KTX_ENDIANESS);

    // metadata
    writer.writeUInt32(container.glType);
    writer.writeUInt32(container.glTypeSize);
    writer.writeUInt32(container.glFormat);
    writer.writeUInt32(container.glInternalFormat);
    writer.writeUInt32(container.glBaseInternalFormat);
    writer.writeUInt32(container.pixelWidth);
    writer.writeUInt32(container.pixelHeight);
    writer.writeUInt32(container.pixelDepth);
    writer.writeUInt32(container.numberOfArrayElements);
    writer.writeUInt32(container.numberOfFaces);
    writer.writeUInt32(container.numberOfMipmapLevels);
    writer.writeUInt32(container.bytesOfKeyValueData);

    // key value data
    for (const [key, value] of keyValuePairs) {
        writer.writeUInt32(key.length + value.length + 1);
        writer.writeString(key);
        writer.writeString(value);
        writer.align4();
    }

    // mipmap data
    for (const level of data) {
        writer.writeUInt32(level.byteLength);
        container.imageData.push(buffer.slice(writer.offset, writer.offset + level.byteLength));
        writer.writeUint8Array(level);
        writer.align4();
    }

    if (writer.offset !== buffer.byteLength) {
        throw new Error('KTX data length mismatch');
    }

    return { container, buffer };
}

export type LoadOptions = {
    mipmapStart?: number;
    mipmapEnd?: number;
    keyValuePairs?: boolean;
};

export async function loadKTX(path: string, options: LoadOptions = {}): Promise<KTXContainer> {
    const file = await fs.promises.open(path, 'r');

    const read = async (length: number, position?: number) => {
        const { bytesRead, buffer } = await file.read(Buffer.alloc(length), 0, length, position);
        if (bytesRead !== length) {
            throw new Error(`Failed reading KTX file: ${path}`);
        }
        return buffer;
    };

    // read header into buffer
    const headerBuffer = await read(KTX_HEADER_LENGTH);

    // check identifier
    for (const [index, byte] of KTX_IDENTIFIER.entries()) {
        if (headerBuffer[index] !== byte) {
            throw new Error(`Invalid KTX identifier: ${path}`);
        }
    }

    // determine endianess of data
    const endianness = headerBuffer.readUInt32LE(KTX_IDENTIFIER.byteLength);
    const littleEndian = endianness === KTX_ENDIANESS;

    const readUint32 = async (offset: number) => {
        const buffer = await read(4, offset);
        return littleEndian ? buffer.readUInt32LE() : buffer.readUInt32BE();
    };

    const headerReader = new BufferReader(
        headerBuffer,
        littleEndian,
        KTX_IDENTIFIER.byteLength + 4
    );

    // decode header metadata
    const glType = headerReader.readUint32();
    const glTypeSize = headerReader.readUint32();
    const glFormat = headerReader.readUint32();
    const glInternalFormat = headerReader.readUint32();
    const glBaseInternalFormat = headerReader.readUint32();
    const pixelWidth = headerReader.readUint32();
    const pixelHeight = headerReader.readUint32();
    const pixelDepth = headerReader.readUint32();
    const numberOfArrayElements = headerReader.readUint32();
    const numberOfFaces = headerReader.readUint32();
    const numberOfMipmapLevels = headerReader.readUint32();
    const bytesOfKeyValueData = headerReader.readUint32();

    // validate
    if (pixelWidth < 1 || pixelWidth > GL_MAX_TEXTURE_SIZE) {
        throw new KTXError('Invalid pixel width');
    }
    if (pixelHeight > GL_MAX_TEXTURE_SIZE) {
        throw new KTXError('Invalid pixel height');
    }
    if (pixelDepth > GL_MAX_3D_TEXTURE_SIZE || pixelHeight === 0) {
        throw new KTXError('Invalid pixel depth');
    }
    if (numberOfArrayElements > GL_MAX_ARRAY_TEXTURE_LAYERS) {
        throw new KTXError('Invalid number of array elements');
    }
    if (numberOfFaces !== 1 && numberOfFaces !== 6) {
        throw new KTXError('Invalid number of cube faces');
    }
    if (
        numberOfMipmapLevels > 1 &&
        numberOfMipmapLevels > calcNumMipmapLevels(pixelWidth, pixelHeight, pixelDepth)
    ) {
        throw new KTXError('Invalid number of mipmap levels');
    }

    // read key value pairs
    const keyValuePairs = new Map<string, string>();
    if ((options.keyValuePairs === undefined || options.keyValuePairs) && bytesOfKeyValueData > 0) {
        const keyValueData = await read(bytesOfKeyValueData);
        const keyValueReader = new BufferReader(keyValueData, littleEndian);
        while (keyValueReader.offset < keyValueData.byteLength) {
            const size = keyValueReader.readUint32();
            const { offset } = keyValueReader;
            const key = keyValueReader.readString(size);
            const value = keyValueReader.readString(size - keyValueReader.offset - offset);
            keyValuePairs.set(key, value);
            keyValueReader.offset = pad4(offset + size);
        }
    }

    let { mipmapStart = 0, mipmapEnd = numberOfMipmapLevels } = options;
    mipmapStart = Math.max(0, mipmapStart);
    mipmapEnd = Math.min(numberOfMipmapLevels, mipmapEnd);

    const layerCount = Math.max(1, numberOfArrayElements);

    // read offset and size of image data requested to being loaded
    const imageIndex: [offset: number, size: number][] = [];
    await [...new Array(mipmapEnd).keys()].reduce(promise => {
        return promise.then(async offset => {
            // read image size of this mipmap level
            const size = await readUint32(offset);
            offset += 4;

            for (let layer = 0; layer < layerCount; ++layer) {
                for (let face = 0; face < numberOfFaces; ++face) {
                    imageIndex.push([offset, size]);
                    offset += size;
                    offset = pad4(offset); // cube padding
                }
            }

            return pad4(offset); // mip padding
        });
    }, Promise.resolve(KTX_HEADER_LENGTH + bytesOfKeyValueData));

    const imageData: Buffer[] = [];

    if (imageIndex.length > 0) {
        // read image data into buffer
        const [dataOffset] = imageIndex[0];
        const [, dataSize] = imageIndex[imageIndex.length - 1];
        const imageBuffer = await read(dataSize, dataOffset);

        // create buffer slices for all images in index
        for (const [offset, size] of imageIndex) {
            const bufferOffset = offset - dataOffset;
            imageData.push(imageBuffer.slice(bufferOffset, bufferOffset + size));
        }
    }

    await file.close();

    return {
        glType,
        glTypeSize,
        glFormat,
        glInternalFormat,
        glBaseInternalFormat,
        pixelWidth,
        pixelHeight,
        pixelDepth,
        numberOfArrayElements,
        numberOfFaces,
        numberOfMipmapLevels,
        bytesOfKeyValueData,
        keyValuePairs,
        imageData,
    };
}
