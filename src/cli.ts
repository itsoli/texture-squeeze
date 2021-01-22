import minimist from 'minimist';

import { Arguments, compress, isResizeFilter, RESIZE_FILTERS } from '.';
import { COMPRESSION_FORMATS, isCompressionFormat } from './format';
import { isQualityLevel, QUALITY_LEVELS } from './quality';

const formatList = (list: readonly string[], indent: number) =>
    list.map(format => `${' '.repeat(indent)}${format}`).join('\n');

const help = () => `\
Usage:
    texture-squeeze INPUT_FILES OUTPUT_FILE --format FORMAT [options] [-- tooloptions]

Options:
    --format FORMAT
        The texture compression format to use. Available formats are:

${formatList(COMPRESSION_FORMATS, 12)}

    --srgb
        Use sRGB color space if available for format.

    --quality QUALITY
        Specify quality-performance tradeoff. Available presets are:

${QUALITY_LEVELS.map(format => `            ${format}`).join('\n')}

    --mipmaps
        Enable generation of mipmap levels.

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

function parseArguments(argv: string[]): Arguments {
    if (argv.length === 0) {
        console.log(help());
        process.exit(0);
    }

    const args = minimist(argv, {
        string: ['format', 'quality', 'filter'],
        boolean: ['srgb', 'mipmaps', 'pot', 'square', 'yflip', 'verbose', 'help'],
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

    const { format, srgb, quality, mipmaps, filter, pot, square, yflip, verbose } = args;

    if (format === undefined) {
        throw new Error('Missing compression format');
    }
    if (!isCompressionFormat(format)) {
        throw new Error(`Not a valid compression format: ${format}`);
    }

    if (quality !== undefined && !isQualityLevel(quality)) {
        throw new Error(`Not a valid quality level: ${quality}`);
    }

    if (filter !== undefined && !isResizeFilter(filter)) {
        throw new Error(`Not a valid resize filter format: ${filter}`);
    }

    const flags = args['--'];

    return {
        input,
        output,
        format,
        srgb,
        quality,
        mipmaps,
        filter,
        pot,
        square,
        yflip,
        verbose,
        flags,
    };
}

async function main() {
    try {
        const args = parseArguments(process.argv.slice(2));
        await compress(args);
    } catch (e) {
        console.log(`${e}`);
        process.exit(1);
    }
}

main();
