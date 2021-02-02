import fs from 'fs';
import os from 'os';
import path from 'path';

import sharp from 'sharp';

import { CompressionFormat } from './format';
import { KTXContainer, storeKTX } from './ktx';
import { findCompressionTool } from './tool';
import { nextMipmapLevel, previousPowerOfTwo } from './util';

// register compression tools
import './astcenc';
import './crunch';
import { Image, validateImage, validateImageData, validateMipmapMetadata } from './image';

export { CompressionFormat };

export const RESIZE_FILTERS: (keyof sharp.KernelEnum)[] = [
    'nearest',
    'cubic',
    'mitchell',
    'lanczos2',
    'lanczos3',
];
export type ResizeFilter = typeof RESIZE_FILTERS[number];
export function isResizeFilter(format: string): format is ResizeFilter {
    return RESIZE_FILTERS.includes(format as ResizeFilter);
}

export type Options = {
    format: CompressionFormat;
    quality?: number;
    mipmaps?: boolean | number;
    filter?: ResizeFilter;
    pot?: boolean;
    square?: boolean;
    yflip?: boolean;
    verbose?: boolean;
    flags?: string[];
};

async function generateMipmapData(
    input: Image,
    filter: keyof sharp.KernelEnum,
    pot: boolean,
    square: boolean,
    maxLevel: number = Number.MAX_VALUE
): Promise<Image[]> {
    let width = Math.max(1, Math.floor(input.width));
    let height = Math.max(1, Math.floor(input.height));

    // square?
    if (square) {
        if (width < height) {
            height = width;
        } else if (width > height) {
            width = height;
        }
    }

    // power of two?
    if (pot) {
        width = previousPowerOfTwo(width);
        height = previousPowerOfTwo(height);
    }

    // calculate dimensions of individual mipmap levels to generate
    const dimensions: [width: number, height: number][] = [];
    for (let level = 0; level < maxLevel; ++level) {
        dimensions.push([width, height]);

        if (width === 1 && height === 1) {
            break;
        }

        width = nextMipmapLevel(width);
        height = nextMipmapLevel(height);
    }

    const pipeline = sharp(input.data, { raw: input as sharp.Raw });

    const { channels } = input;
    if (channels < 2) {
        pipeline.toColorspace('b-w');
    }

    pipeline.raw();

    return Promise.all(
        dimensions.map(([width, height]) =>
            pipeline
                .clone()
                .resize(width, height, { kernel: filter })
                .toBuffer()
                .then(data => ({ width, height, channels, data }))
        )
    );
}

export async function compress(
    input: Image[],
    options: Options
): Promise<{ container: KTXContainer; buffer: Buffer }> {
    if (input.length === 0) {
        throw new Error('No input image given');
    }
    validateImage(input[0]);

    const { format, quality = 60 } = options;

    // generate input according to options
    if (input.length === 1) {
        const { filter = 'lanczos3', pot = false, square = false } = options;

        let maxLevel = undefined;
        if (typeof options.mipmaps === 'number') {
            maxLevel = Math.max(0, options.mipmaps);
        } else if (typeof options.mipmaps === 'boolean' && !options.mipmaps) {
            maxLevel = 1;
        }

        input = await generateMipmapData(input[0], filter, pot, square, maxLevel);
    }
    // if multiple input buffers are given use those without modification
    else {
        validateMipmapMetadata(input);
        input.forEach(validateImageData);
    }

    // find the right tool for the job
    const compress = findCompressionTool(format, quality);
    if (!compress) {
        throw new Error(`Unsupported compression format: ${format}`);
    }

    // create uniquely named temporary directory
    const tmpDir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);

    const { yflip = false } = options;
    const spawnOptions = { verbose: options.verbose ?? false };
    const compressed: Buffer[] = [];

    // compression is intentionally executed in sequence to let the individual tools do parallelization on their own
    for (const [index, image] of input.entries()) {
        // write to temporary png file, y-flip if need be
        const inputFile = `${tmpDir}${path.sep}input${index}.png`;
        await sharp(image.data, { raw: image as sharp.Raw })
            .toColorspace(image.channels < 2 ? 'b-w' : 'srgb')
            .flip(yflip)
            .png()
            .toFile(inputFile);

        // compress to temporary file
        const outputFileBase = `${tmpDir}${path.sep}output${index}`;
        const { file: outputFile, data } = await compress(inputFile, outputFileBase, spawnOptions);

        // remove temporary input/output files
        await Promise.allSettled([inputFile, outputFile].map(fs.promises.unlink));

        compressed.push(data);
    }

    // clean up temp dir
    await fs.promises.rmdir(tmpDir, { recursive: true });

    // layout output as ktx
    const { width, height } = input[0];
    const ktx = storeKTX( compressed, { width, height, format, yflipped: yflip });

    return ktx;
}
