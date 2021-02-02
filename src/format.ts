// Adaptive Scalable Texture Compression (ASTC)
export const ASTC_COMPRESSION_FORMATS = [
    // 128-bit RGB+A, variable block size, linear color
    'ASTC_4x4',
    'ASTC_5x4',
    'ASTC_5x5',
    'ASTC_6x5',
    'ASTC_6x6',
    'ASTC_8x5',
    'ASTC_8x6',
    'ASTC_8x8',
    'ASTC_10x5',
    'ASTC_10x6',
    'ASTC_10x8',
    'ASTC_10x10',
    'ASTC_12x10',
    'ASTC_12x12',
    // 128-bit RGB+A, variable block size, sRGB
    'ASTC_4x4_SRGB',
    'ASTC_5x4_SRGB',
    'ASTC_5x5_SRGB',
    'ASTC_6x5_SRGB',
    'ASTC_6x6_SRGB',
    'ASTC_8x5_SRGB',
    'ASTC_8x6_SRGB',
    'ASTC_8x8_SRGB',
    'ASTC_10x5_SRGB',
    'ASTC_10x6_SRGB',
    'ASTC_10x8_SRGB',
    'ASTC_10x10_SRGB',
    'ASTC_12x10_SRGB',
    'ASTC_12x12_SRGB',
] as const;
export type ASTCFormat = typeof ASTC_COMPRESSION_FORMATS[number];
export function isASTCFormat(format: string): format is ASTCFormat {
    return ASTC_COMPRESSION_FORMATS.includes(format as ASTCFormat);
}

// Ericsson Texture Compression (ETC)
export const ETC_COMPRESSION_FORMATS = [
    // 24-bit RGB, 64-bit 4x4 block
    'ETC_R8G8B8',
] as const;
export type ETCFormat = typeof ETC_COMPRESSION_FORMATS[number];
export function isETC1Format(format: string): format is ETCFormat {
    return ETC_COMPRESSION_FORMATS.includes(format as ETCFormat);
}

// Ericsson Texture Compression 2 (ETC2)
export const ETC2_COMPRESSION_FORMATS = [
    // 4x4 24-bit RGB, 64-bit 4x4 block
    'ETC2_R8G8B8',
    // 4x4 32-bit RGBA, 128-bit 4x4 block
    'ETC2_R8G8B8A8',
] as const;
export type ETC2Format = typeof ETC2_COMPRESSION_FORMATS[number];
export function isETC2Format(format: string): format is ETC2Format {
    return ETC2_COMPRESSION_FORMATS.includes(format as ETC2Format);
}

// Block Compression (S3TC, BCn, DXTn)
export const BC_COMPRESSION_FORMATS = [
    // 24-bit RGB, 64-bit 4x4 block (2-bit color / 4 opaque colors)
    'BC1',
    // 24-bit RGB, 64-bit 4x4 block (2-bit color / 3 opaque colors + 1 punch-thorugh alpha)
    'BC1_ALPHA',
    // 32-bit RGBA, 128-bit 4x4 block (2-bit color + 4-bit direct alpha -> sharp alpha)
    'BC2',
    // 32-bit RGBA, 128-bit 4x4 block (2-bit color + 3-bit interpolated alpha -> gradient alpha)
    'BC3',
] as const;
export type BCFormat = typeof BC_COMPRESSION_FORMATS[number];
export function isS3TCFormat(format: string): format is BCFormat {
    return BC_COMPRESSION_FORMATS.includes(format as BCFormat);
}

export const COMPRESSION_FORMATS = [
    ...ASTC_COMPRESSION_FORMATS,
    ...ETC_COMPRESSION_FORMATS,
    ...ETC2_COMPRESSION_FORMATS,
    ...BC_COMPRESSION_FORMATS,
] as const;
export type CompressionFormat = typeof COMPRESSION_FORMATS[number];
export function isCompressionFormat(format: string): format is CompressionFormat {
    return COMPRESSION_FORMATS.includes(format as CompressionFormat);
}

export type GLPixelFormat = {
    /** `type` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
    glType: number;
    /** data type size (must be 1 for compressed textures) */
    glTypeSize: number;
    /** `format` parameter passed to `gl.Tex{,Sub}Image*D` (must be 0 for compressed textures) */
    glFormat: number;
    /** `internalformat` parameter passed to `gl.TexStorage*D`, `gl.TexImage*D` or `gl.compressedTexImage*D` */
    glInternalFormat: number;
    /** base internal format of the texture (`gl.RGB`, `gl.RGBA`, `gl.ALPHA`, etc) */
    glBaseInternalFormat: number;
};

// const GL_RED = 0x1903;
// const GL_RG = 0x8227;
const GL_RGB = 0x1907;
const GL_RGBA = 0x1908;
// const GL_BGR = 0x80E0;
// const GL_BGRA = 0x80E1;
// const GL_LUMINANCE = 0x1909;
// const GL_LUMINANCE_ALPHA = 0x190A;

// const GL_UNSIGNED_BYTE = 0x1401;
// const GL_UNSIGNED_SHORT = 0x1403;
// const GL_HALF_FLOAT = 0x140B;
// const GL_FLOAT = 0x1406;

const GL_COMPRESSED_RGBA_ASTC_4x4 = 0x93b0;
const GL_COMPRESSED_RGBA_ASTC_5x4 = 0x93b1;
const GL_COMPRESSED_RGBA_ASTC_5x5 = 0x93b2;
const GL_COMPRESSED_RGBA_ASTC_6x5 = 0x93b3;
const GL_COMPRESSED_RGBA_ASTC_6x6 = 0x93b4;
const GL_COMPRESSED_RGBA_ASTC_8x5 = 0x93b5;
const GL_COMPRESSED_RGBA_ASTC_8x6 = 0x93b6;
const GL_COMPRESSED_RGBA_ASTC_8x8 = 0x93b7;
const GL_COMPRESSED_RGBA_ASTC_10x5 = 0x93b8;
const GL_COMPRESSED_RGBA_ASTC_10x6 = 0x93b9;
const GL_COMPRESSED_RGBA_ASTC_10x8 = 0x93ba;
const GL_COMPRESSED_RGBA_ASTC_10x10 = 0x93bb;
const GL_COMPRESSED_RGBA_ASTC_12x10 = 0x93bc;
const GL_COMPRESSED_RGBA_ASTC_12x12 = 0x93bd;

const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4x4 = 0x93d0;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x4 = 0x93d1;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x5 = 0x93d2;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x5 = 0x93d3;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x6 = 0x93d4;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x5 = 0x93d5;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x6 = 0x93d6;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x8 = 0x93d7;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x5 = 0x93d8;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x6 = 0x93d9;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x8 = 0x93da;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x10 = 0x93db;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x10 = 0x93dc;
const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x12 = 0x93dd;

const GL_COMPRESSED_RGB_ETC1 = 0x8d64;

// const GL_COMPRESSED_R11_EAC = 0x9270;
// const GL_COMPRESSED_SIGNED_R11_EAC = 0x9271;
// const GL_COMPRESSED_RG11_EAC = 0x9272;
// const GL_COMPRESSED_SIGNED_RG11_EAC = 0x9273;
const GL_COMPRESSED_RGB8_ETC2 = 0x9274;
// const GL_COMPRESSED_SRGB8_ETC2 = 0x9275;
// const GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9276;
// const GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9277;
const GL_COMPRESSED_RGBA8_ETC2_EAC = 0x9278;
// const GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = 0x9279;

const GL_COMPRESSED_RGB_S3TC_DXT1 = 0x83f0;
const GL_COMPRESSED_RGBA_S3TC_DXT1 = 0x83f1;
const GL_COMPRESSED_RGBA_S3TC_DXT3 = 0x83f2;
const GL_COMPRESSED_RGBA_S3TC_DXT5 = 0x83f3;

// const GL_COMPRESSED_SRGB_S3TC_DXT1 = 0x8c4c;
// const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT1 = 0x8c4d;
// const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT3 = 0x8c4e;
// const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT5 = 0x8c4f;

const glInternalFormat: Record<CompressionFormat, number> = {
    ASTC_4x4: GL_COMPRESSED_RGBA_ASTC_4x4,
    ASTC_5x4: GL_COMPRESSED_RGBA_ASTC_5x4,
    ASTC_5x5: GL_COMPRESSED_RGBA_ASTC_5x5,
    ASTC_6x5: GL_COMPRESSED_RGBA_ASTC_6x5,
    ASTC_6x6: GL_COMPRESSED_RGBA_ASTC_6x6,
    ASTC_8x5: GL_COMPRESSED_RGBA_ASTC_8x5,
    ASTC_8x6: GL_COMPRESSED_RGBA_ASTC_8x6,
    ASTC_8x8: GL_COMPRESSED_RGBA_ASTC_8x8,
    ASTC_10x5: GL_COMPRESSED_RGBA_ASTC_10x5,
    ASTC_10x6: GL_COMPRESSED_RGBA_ASTC_10x6,
    ASTC_10x8: GL_COMPRESSED_RGBA_ASTC_10x8,
    ASTC_10x10: GL_COMPRESSED_RGBA_ASTC_10x10,
    ASTC_12x10: GL_COMPRESSED_RGBA_ASTC_12x10,
    ASTC_12x12: GL_COMPRESSED_RGBA_ASTC_12x12,
    ASTC_4x4_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4x4,
    ASTC_5x4_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x4,
    ASTC_5x5_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x5,
    ASTC_6x5_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x5,
    ASTC_6x6_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x6,
    ASTC_8x5_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x5,
    ASTC_8x6_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x6,
    ASTC_8x8_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x8,
    ASTC_10x5_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x5,
    ASTC_10x6_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x6,
    ASTC_10x8_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x8,
    ASTC_10x10_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x10,
    ASTC_12x10_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x10,
    ASTC_12x12_SRGB: GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x12,
    ETC_R8G8B8: GL_COMPRESSED_RGB_ETC1,
    ETC2_R8G8B8: GL_COMPRESSED_RGB8_ETC2,
    ETC2_R8G8B8A8: GL_COMPRESSED_RGBA8_ETC2_EAC,
    BC1: GL_COMPRESSED_RGB_S3TC_DXT1,
    BC1_ALPHA: GL_COMPRESSED_RGBA_S3TC_DXT1,
    BC2: GL_COMPRESSED_RGBA_S3TC_DXT3,
    BC3: GL_COMPRESSED_RGBA_S3TC_DXT5,
};

function toGLInternalFormat(format: CompressionFormat): number {
    return glInternalFormat[format];
}

function toGLBaseInternalFormat(format: CompressionFormat): number {
    switch (format) {
        case 'ETC_R8G8B8':
        case 'ETC2_R8G8B8':
        case 'BC1':
            return GL_RGB;
        default:
            return GL_RGBA;
    }
}

export function toGLPixelFormat(format: CompressionFormat): GLPixelFormat {
    return {
        glType: 0,
        glTypeSize: 1,
        glFormat: 0,
        glInternalFormat: toGLInternalFormat(format),
        glBaseInternalFormat: toGLBaseInternalFormat(format),
    };
}
