import { getBinPath } from './bin-path';
import { CompressionFormat, isETC1Format, isETC2Format, isS3TCFormat } from './format';
import { loadKTX } from './ktx';
import { spawnProcess, SpawnProcessOptions } from './spawn-process';
import { CompressionTool, registerCompressionTool } from './tool';

function getQualityProfileName(value: number): string {
    if (value <= 0) {
        return 'superfast';
    }
    if (value <= 25) {
        return 'fast';
    }
    if (value <= 50) {
        return 'normal';
    }
    if (value <= 75) {
        return 'better';
    }
    return 'uber';
}

function crunch(
    format: CompressionFormat,
    _srgb: boolean,
    quality: number,
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
        getQualityProfileName(quality),
        ...flags,
    ];

    return async function astcenc(
        input: string,
        output: string,
        spawnOptions?: Partial<SpawnProcessOptions>
    ) {
        const file = `${output}.ktx`;
        await spawnProcess(bin, ['-file', input, '-out', file, ...args], spawnOptions);

        const ktx = await loadKTX(file, { mipmapStart: 0, mipmapEnd: 1, keyValuePairs: false });
        if (ktx.imageData.length !== 1) {
            throw new Error('Failed reading crunch output');
        }

        return { file, data: ktx.imageData[0] };
    };
}

registerCompressionTool('crunch', crunch);
