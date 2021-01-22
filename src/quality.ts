// same as astcenc
export const QUALITY_LEVELS = ['fastest', 'fast', 'medium', 'thorough', 'exhaustive'] as const;

export type QualityLevel = typeof QUALITY_LEVELS[number];

export function isQualityLevel(level: string): level is QualityLevel {
    return QUALITY_LEVELS.includes(level as QualityLevel);
}
