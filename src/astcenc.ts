import { loadASTC } from './astc';
import { getBinPath } from './bin-path';
import { CompressionFormat, isASTCFormat } from './format';
import { spawnProcess, SpawnProcessOptions } from './spawn-process';
import { CompressionTool, registerCompressionTool } from './tool';

function getQualityProfileName(value: number): string {
    if (value <= 0) {
        return 'fastest';
    }
    if (value <= 10) {
        return 'fast';
    }
    if (value <= 60) {
        return 'medium';
    }
    if (value <= 98) {
        return 'thorough';
    }
    return 'exhaustive';
}

function astcenc(
    format: CompressionFormat,
    quality: number,
    flags: string[] = []
): CompressionTool | undefined {
    if (!isASTCFormat(format)) {
        return undefined;
    }

    // parse format
    const m = format.match(/ASTC_(\d+x\d+)(_SRGB)?/);
    if (!m) {
        return undefined;
    }
    const [, blockSize, srgb] = m;

    const bin = getBinPath('astcenc-avx2');

    // compression color profile
    const colorProfileFlag = `-c${srgb ? 's' : 'l'}`;

    const args = [
        // block size
        blockSize,
        // quality preset
        `-${getQualityProfileName(quality)}`,
        // additional argument flags
        ...flags,
    ];

    return async function astcenc(
        input: string,
        output: string,
        spawnOptions?: Partial<SpawnProcessOptions>
    ) {
        const file = `${output}.astc`;
        await spawnProcess(bin, [colorProfileFlag, input, file, ...args], spawnOptions);

        const { data } = await loadASTC(file);

        return { file, data };
    };
}

registerCompressionTool('astcenc', astcenc);
