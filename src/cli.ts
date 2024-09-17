import fs from 'fs';

import minimist from 'minimist';
import sharp from 'sharp';

import { compress, isResizeFilter, Options, RESIZE_FILTERS } from '.';
import { COMPRESSION_FORMATS, isCompressionFormat } from './format';
import { Image, MipmapValidationError, validateMipmapMetadata } from './image';

const formatList = (list: readonly string[], indent: number) =>
    list.map(format => `${' '.repeat(indent)}${format}`).join('\n');

const help = () => `\
Usage:
    texture-squeeze INPUT_FILES OUTPUT_FILE --format FORMAT [options] [-- tooloptions]

Options:
    --format FORMAT
        The texture compression format to use. Available formats are:

${formatList(COMPRESSION_FORMATS, 12)}

    --quality QUALITY
        A float value between 0 (fastest) and 100 (best quality) controlling the
        quality vs performance trade-off.

    --no-mipmaps
        Disable generation of mipmap levels.

    --filter
        Interpolation filter to use when resizing. Available filters are:

${RESIZE_FILTERS.map(format => `            ${format}`).join('\n')}

    --pot
        Ensure image dimensions are a power of two. Downscale if necessary.

    --square
        Ensure all image dimensions are equal. Downscale if necessary.

    --yflip
        Flip image in the vertical axis prior to compression.

    --verbose
        Print compression tool output.

    --help
        Print usage information.
`;

function parseArguments(argv: string[]): [input: string[], output: string, options: Options] {
    if (argv.length === 0) {
        console.log(help());
        process.exit(0);
    }

    const args = minimist(argv, {
        string: ['format', 'quality', 'filter'],
        boolean: ['mipmaps', 'pot', 'square', 'yflip', 'verbose', 'help'],
        default: { mipmaps: true },
        alias: { h: 'help', v: 'verbose' },
        unknown: (arg: string) => {
            if (arg.startsWith('-')) {
                throw new Error(`Unknown argument: ${arg}`);
            }
            return true;
        },
        '--': true,
    });

    if (args.help) {
        console.log(help());
        process.exit(0);
    }

    const files = args['_'];
    if (files.length < 1) {
        throw new Error('No input file specified');
    }
    if (files.length < 2) {
        throw new Error('No output file specified');
    }
    const input = files.slice(0, -1);
    const [output] = files.slice(-1);

    const { format, mipmaps, filter, pot, square, yflip, verbose } = args;

    if (format === undefined) {
        throw new Error('Missing compression format');
    }
    if (!isCompressionFormat(format)) {
        throw new Error(`Not a valid compression format: ${format}`);
    }

    if (filter !== undefined && !isResizeFilter(filter)) {
        throw new Error(`Not a valid resize filter format: ${filter}`);
    }

    let { quality } = args;
    if (quality !== undefined) {
        quality = Number.parseFloat(quality);
        if (!Number.isFinite(quality) || quality < 0 || quality > 100) {
            throw new Error(`Not a valid quality value: ${args.quality}`);
        }
    }

    const flags = args['--'];

    return [
        input,
        output,
        { format, quality, mipmaps, filter, pot, square, yflip, verbose, flags },
    ];
}

async function loadInputImages(files: string[]): Promise<Image[]> {
    const extract = (m: sharp.Metadata) => ({
        width: m.width ?? 0,
        height: m.height ?? 0,
        channels: m.channels ?? 0,
    });
    const metadata = await Promise.all(files.map(file => sharp(file).metadata().then(extract)));

    try {
        validateMipmapMetadata(metadata);
    } catch (error) {
        if (error instanceof MipmapValidationError) {
            throw new Error(`Level ${error.level} image ${files[error.level]}: ${error.reason}`);
        }
        throw error;
    }

    // target colorspace
    const { channels } = metadata[0];
    const colorspace = channels < 2 ? 'b-w' : 'srgb';

    return await Promise.all(
        files.map((file, index) =>
            sharp(file)
                .toColorspace(colorspace)
                .raw()
                .toBuffer()
                .then(data => ({ ...metadata[index], data }))
        )
    );
}

async function main() {
    try {
        const [input, output, options] = parseArguments(process.argv.slice(2));
        const inputImages = await loadInputImages(input);
        const ktx = await compress(inputImages, options);
        fs.promises.writeFile(output, ktx.buffer);
    } catch (e) {
        console.error(`${e}`);
        process.exit(1);
    }
}

main();
