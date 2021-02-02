const { spawn } = require('child_process');

function compress(file, format, quality) {
    return new Promise((resolve, reject) => {
        const args = [
            '--format', format,
            file,
            `${file.split('.')[0]}-${format}.ktx`,
            '--quality', quality,
            '--mipmaps',
            '--yflip',
            '--verbose',
        ];

        const label = `texture-squeeze ${args.join(' ')}`;
        console.time(label);

        const proc = spawn('node', ['../bin/texture-squeeze.js', ...args], { cwd: __dirname });

        proc.stdout.on('data', data => {
            process.stdout.write(data);
        });

        proc.stderr.on('data', data => {
            process.stderr.write(data);
        });

        proc.on('close', code => {
            console.timeEnd(label);
            if (code === 0) {
                resolve();
            } else {
                reject();
            }
        });

        proc.on('error', reject);
    });
}

const tasks = [
    ['backstein.jpg', 'ASTC_4x4', 50],
    ['backstein.jpg', 'ETC_R8G8B8', 50],
    ['backstein.jpg', 'ETC2_R8G8B8', 50],
    ['backstein.jpg', 'BC1', 50],

    ['moewe.png', 'ASTC_4x4', 50],
    ['moewe.png', 'ETC2_R8G8B8A8', 50],
    ['moewe.png', 'BC3', 50],
];

tasks.reduce((p, task) => p.then(() => compress(...task)).catch(() => {}) , Promise.resolve());
