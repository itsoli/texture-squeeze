import { nextMipmapLevel } from './util';

// image metadata and buffer
export type ImageMetadata = { width: number; height: number; channels: number };
export type Image = ImageMetadata & { data: Buffer };

export class ImageValidationError extends Error {
    constructor(public readonly reason: string) {
        super(reason);
        this.name = 'ImageValidationError';
    }
}

export class MipmapValidationError extends Error {
    constructor(public readonly reason: string, public readonly level: number) {
        super(`Level ${level} image: ${reason}`);
        this.name = 'MipmapValidationError';
    }
}

export function validateImageData(image: Image) {
    const { width, height, channels, data } = image;

    const expectedByteLength = width * height * channels;
    if (data.byteLength !== expectedByteLength) {
        throw new ImageValidationError('Unexpected data buffer size');
    }
}

export function validateImageMetadata(image: ImageMetadata) {
    const { width, height, channels } = image;

    if (width <= 0 || height <= 0) {
        throw new ImageValidationError('Invalid dimensions');
    }

    if (channels !== 4 && channels !== 3 && channels !== 2 && channels !== 1) {
        throw new Error('Invalid number of color channels');
    }
}

export function validateImage(image: Image) {
    validateImageMetadata(image);
    validateImageData(image);
}

export function validateMipmapMetadata(levels: ImageMetadata[]) {
    const first = levels[0];
    const { channels } = first;
    let { width, height } = first;

    try {
        validateImageMetadata(first);
    } catch (error) {
        if (error instanceof ImageValidationError) {
            throw new MipmapValidationError(error.reason, 0);
        }
        throw error;
    }

    let index = 1;

    while (width < 1 && height < 1) {
        width = nextMipmapLevel(width);
        height = nextMipmapLevel(height);

        const level = levels[index];
        if (level.width !== width || level.height !== height) {
            throw new MipmapValidationError(
                `Invalid dimensions ${level.width}x${level.height} (expected: ${width}x${height})`,
                index
            );
        }
        if (level.channels !== channels) {
            throw new MipmapValidationError(
                `Different number of color channels ${level.channels} (expected: ${channels})`,
                index
            );
        }
    }

    if (index < levels.length) {
        throw new MipmapValidationError('Unused mipmap image', index + 1);
    }
}
