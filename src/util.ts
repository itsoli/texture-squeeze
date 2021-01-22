export function isPowerOfTwo(n: number) {
    // return (n !== 0) && ((n & (n - 1)) === 0);
    return Math.log2(n) % 1 === 0;
}

export function previousPowerOfTwo(n: number): number {
    // return Math.floor(2 ** Math.log2(n));
    let p = 1;
    while (p <= n) {
        p <<= 1;
    }
    p >>= 1;
    return p;
}

export function pad4(n: number): number {
    return Math.floor((n + 3) / 4) * 4;
}

export function calcNumMipmapLevels(width: number, height: number, depth: number): number {
    return 1 + Math.floor(Math.log2(Math.max(width, height, depth)));
}

export function toArray<T>(x: T | T[]): T[] {
    return Array.isArray(x) ? x : [x];
}
