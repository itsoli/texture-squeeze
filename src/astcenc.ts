import { loadASTC } from './astc';
import { getBinPath } from './bin-path';
import { CompressionFormat, isASTCFormat } from './format';
import { QualityLevel } from './quality';
import { spawnProcess, SpawnProcessOptions } from './spawn-process';
import { CompressionTool, registerCompressionTool } from './tool';

function astcenc(
    format: CompressionFormat,
    srgb: boolean,
    quality: QualityLevel,
    flags: string[] = []
): CompressionTool | undefined {
    if (!isASTCFormat(format)) {
        return undefined;
    }

    const bin = getBinPath('astcenc-avx2');

    // compression color profile
    const colorProfileFlag = `-c${srgb ? 's' : 'l'}`;

    const args = [
        // block size
        format.slice(5),
        // quality preset
        `-${quality}`,
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
