import { CompressionFormat } from "./format";
import { QualityLevel } from "./quality";
import { SpawnProcessOptions } from "./spawn-process";

export type CompressionToolOutput = { file: string, data: Buffer };

export type CompressionTool = (
    input: string,
    output: string,
    spawnOptions?: Partial<SpawnProcessOptions>
) => Promise<CompressionToolOutput>;

export type CompressionToolFactoryFunction = (
    format: CompressionFormat,
    srgb: boolean,
    quality: QualityLevel,
    flags?: string[]
) => CompressionTool | undefined;

const registeredTools: [name: string, factory: CompressionToolFactoryFunction][] = [];

export function registerCompressionTool(name: string, factory: CompressionToolFactoryFunction) {
    registeredTools.push([name, factory]);
}

export function findCompressionTool(
    format: CompressionFormat,
    srgb: boolean,
    quality: QualityLevel,
    flags?: string[]
): CompressionTool | undefined {
    for (const [, factory] of registeredTools) {
        const tool = factory(format, srgb, quality, flags);
        if (tool) {
            return tool;
        }
    }
    return undefined;
}



// export interface CompressionTool {
//     compress(input: string, output: string, spawnOptions?: Partial<SpawnProcessOptions>): Promise<void>;
//     readOutput(file: string): Promise<Buffer>;
// }

// export type CompressionToolFactoryFunction = (
//     format: CompressionFormat,
//     srgb: boolean,
//     quality: QualityLevel,
//     flags?: string[]
// ) => CompressionTool | undefined;
