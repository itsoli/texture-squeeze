import fs from 'fs';
import os from 'os';
import path from 'path';

import sharp from 'sharp';

import { CompressionFormat } from './format';
import { storeKTX } from './ktx';
import { QualityLevel } from './quality';
import { findCompressionTool } from './tool';
import { previousPowerOfTwo, toArray } from './util';

// register compression tools
import './astcenc';
import './crunch';

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

export type Arguments = {
    input: string | string[];
    output: string;
    format: CompressionFormat;
    srgb?: boolean;
    quality?: QualityLevel;
    mipmaps?: boolean | number;
    filter?: ResizeFilter;
    pot?: boolean;
    square?: boolean;
    yflip?: boolean;
    verbose?: boolean;
    flags?: string[];
};

type MipmapData = { width: number; height: number; data: Buffer[] };

async function generateMipmapData(
    file: string,
    mipmaps: boolean | number,
    filter: keyof sharp.KernelEnum,
    pot: boolean,
    square: boolean,
    yflip: boolean
): Promise<MipmapData> {
    const metadata = await sharp(file).metadata();
    const { width: sourceWidth, height: sourceHeight, channels } = metadata;

    if (!sourceWidth || !sourceHeight) {
        throw new Error(`Source image ${file} has invalid size`);
    }
    if (!channels) {
        throw new Error(`Source image ${file} has invalid number of color channels`);
    }

    let width = sourceWidth;
    let height = sourceHeight;

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

    const sharedPipeline = sharp(file);

    if (channels < 2) {
        sharedPipeline.toColorspace('b-w');
    }

    sharedPipeline.raw();

    if (yflip) {
        sharedPipeline.flip(true);
    }

    let levels = Number.MAX_VALUE;
    if (typeof mipmaps === 'number') {
        levels = mipmaps;
    } else if (typeof mipmaps === 'boolean') {
        if (!mipmaps) {
            levels = 1;
        }
    }

    let levelWidth = width;
    let levelHeight = height;

    const tasks = [];

    for (;;) {
        tasks.push(
            sharedPipeline
                .clone()
                .resize(levelWidth, levelHeight, { kernel: filter })
                .png()
                .toBuffer()
        );
        if (levels === 1) {
            break;
        }
        if (levelWidth === 1 && levelHeight === 1) {
            break;
        }
        levels--;
        levelWidth = Math.max(1, Math.floor(levelWidth / 2));
        levelHeight = Math.max(1, Math.floor(levelHeight / 2));
    }

    const data = await Promise.all(tasks);

    return { width, height, data };
}

async function loadMipmapData(files: string[]): Promise<MipmapData> {
    if (files.length === 0) {
        throw new Error('No input files given');
    }

    const metadata = await Promise.all(files.map(file => sharp(file).metadata()));
    const { width, height, channels } = metadata[0];

    if (!width || !height) {
        throw new Error(`Level 0 image ${files[0]} has invalid size`);
    }
    if (!channels) {
        throw new Error(`Level 0 image ${files[0]} has invalid number of color channels`);
    }

    // validate input images
    let levelWidth = width;
    let levelHeight = height;
    for (let i = 1; i < metadata.length; ++i) {
        levelWidth = Math.max(1, Math.floor(levelWidth / 2));
        levelHeight = Math.max(1, Math.floor(levelHeight / 2));

        const level = metadata[i];

        if (level.width !== levelWidth || level.height !== levelHeight) {
            throw new Error(`Level ${i} image ${files[i]} has invalid size: ${level.width}x${level.height} (expected: ${levelWidth}x${levelHeight})`);
        }

        if (level.channels !== channels) {
            throw new Error(`Level ${i} image ${files[i]} has different number of color channels: ${level.channels} (expected: ${channels})`);
        }
    }

    const data = await Promise.all(files.map(file => {
        const pipeline = sharp(file);
        if (channels < 2) {
            pipeline.toColorspace('b-w');
        }
        return pipeline.png().toBuffer();
    }));

    return { width, height, data };
}

export async function compress(args: Arguments): Promise<void> {
    const input = toArray(args.input).filter(Boolean);
    if (input.length === 0) {
        throw new Error('No input file given');
    }
    const { output } = args;
    if (output.length === 0) {
        throw new Error('No output file given');
    }

    // default image options
    const {
        mipmaps = true,
        filter = 'lanczos3',
        pot = false,
        square = false,
        yflip = false,
    } = args;

    let width;
    let height;
    let uncompressedData: Buffer[];

    if (input.length === 1) {
        ({ width, height, data: uncompressedData } = await generateMipmapData(
            input[0],
            mipmaps,
            filter,
            pot,
            square,
            yflip
        ));
    } else {
        ({ width, height, data: uncompressedData } = await loadMipmapData(input));
    }

    const { format, srgb = false, quality = 'medium' } = args;

    // find the right tool for the job
    const compress = findCompressionTool(format, false, quality);
    if (!compress) {
        throw new Error(`Unsupported compression format: ${format}`);
    }

    const tmpDir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);

    const options = { verbose: false };

    const compressedData = await Promise.all(
        uncompressedData.map(async (mipdata, index) => {
            const inputFile = `${tmpDir}${path.sep}input${index}.png`;
            await fs.promises.writeFile(inputFile, mipdata);

            const outputFileBase = `${tmpDir}${path.sep}output${index}`;
            const { file: outputFile, data } = await compress(inputFile, outputFileBase, options);

            await Promise.all([fs.promises.rm(inputFile), fs.promises.rm(outputFile)]);

            return data;
        })
    );

    await fs.promises.rmdir(tmpDir);

    const ktx = storeKTX({ width, height, format, srgb, yflip, data: compressedData });

    await fs.promises.writeFile(output, ktx);
}
