import { loadASTC } from './astc';
import { getBinPath } from './bin-path';
import { CompressionFormat, isASTCFormat } from './format';
import { spawnProcess, SpawnProcessOptions } from './spawn-process';
import { CompressionTool, registerCompressionTool } from './tool';

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

    // validate quality
    quality = Number.isFinite(quality) ? Math.max(0, Math.min(100, quality)) : 100

    // compression color profile
    const colorProfileFlag = `-c${srgb ? 's' : 'l'}`;

    const simd = process.arch === 'arm64' ? 'neon' : 'avx2';
    const bin = getBinPath(`astcenc-${simd}`);

    const args = [
        // block size
        blockSize,
        // quality preset
        quality.toFixed(1),
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
