import { getBinPath } from './bin-path';
import { CompressionFormat, isETC1Format, isETC2Format, isS3TCFormat } from './format';
import { loadKTXImageData } from './ktx';
import { QualityLevel } from './quality';
import { spawnProcess, SpawnProcessOptions } from './spawn-process';
import { CompressionTool, registerCompressionTool } from './tool';

const crunchQuality: Record<QualityLevel, string> = {
    fastest: 'superfast',
    fast: 'fast',
    medium: 'normal',
    thorough: 'better',
    exhaustive: 'uber',
};

function crunch(
    format: CompressionFormat,
    _srgb: boolean,
    quality: QualityLevel,
    flags: string[] = []
): CompressionTool | undefined {
    if (!isETC1Format(format) && !isETC2Format(format) && !isS3TCFormat(format)) {
        return undefined;
    }

    const bin = getBinPath('crunch');

    const args = [
        '-fileformat',
        'ktx',
        `-${format}`,
        '-dxtQuality',
        crunchQuality[quality],
        ...flags,
    ];

    return async function astcenc(
        input: string,
        output: string,
        spawnOptions?: Partial<SpawnProcessOptions>
    ) {
        const file = `${output}.ktx`;
        await spawnProcess(bin, ['-file', input, '-out', file, ...args], spawnOptions);

        const data = await loadKTXImageData(file);

        return { file, data };
    };
}

registerCompressionTool('crunch', crunch);
