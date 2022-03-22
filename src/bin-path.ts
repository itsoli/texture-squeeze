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

function getArchitecture(): 'arm64' | 'x64' {
    const arch = os.arch();
    switch (arch) {
        case 'arm64':
        case 'x64':
            return arch;
        default:
            throw new Error(`Unsupported architecture: ${arch}`);
    }
}

const SUPPORTED_TARGETS = ['linux-x64', 'macos-arm64', 'macos-x64', 'windows-x64'];

export function getBinPath(binary: string, base: string = `${__dirname}/../bin`): string {
    const platform = getPlatform();
    const arch = getArchitecture();
    const target = `${platform}-${arch}`;
    if (!SUPPORTED_TARGETS.includes(target)) {
        throw new Error(`Unsupported target: ${target}`);
    }
    let binpath = `${base}/${target}/${binary}`;
    if (platform === 'windows') {
        binpath += '.exe';
    }
    return path.normalize(binpath);
}
