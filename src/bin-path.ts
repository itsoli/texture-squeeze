import os from 'os';
import path from 'path';

function getPlatform(): 'linux' | 'macos' | 'windows' {
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            return 'macos';
        case 'win32':
            return 'windows';
        case 'linux':
            return platform;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function getArchitecture(): 'x64' {
    const arch = os.arch();
    switch (arch) {
        case 'x64':
            return arch;
        default:
            throw new Error(`Unsupported architecture: ${arch}`);
    }
}

export function getBinPath(binary: string, base: string = `${__dirname}/../bin`): string {
    const platform = getPlatform();
    const arch = getArchitecture();
    let binpath = `${base}/${platform}-${arch}/${binary}`;
    if (platform === 'windows') {
        binpath += '.exe';
    }
    return path.normalize(binpath);
}
