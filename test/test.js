const { exec } = require('child_process');

process.chdir(__dirname);

const command = `node ../bin/texture-squeeze.js`;

function compress(file, format, quality) {
    const args = `--format ${format} ${file} ${file.split('.')[0]}-${format}.ktx --quality ${quality} --mipmaps --yflip`;
    const label = `texture-squeeze ${args}`;
    console.time(label);
    exec(`${command} ${args}`, (error, stdout, stderr) => {
        console.timeEnd(label);
        // if (error) {
        //     console.error(`exec error: ${error}`);
        //     return;
        // }
        if (stdout) {
            console.log(`${stdout}`);
        }
        if (stderr) {
            console.log(`${stderr}`);
        }
    });
}

const quality = 'exhaustive';

compress('backstein.jpg', 'ASTC_4x4',  quality);
compress('backstein.jpg', 'ETC1',  quality);
compress('backstein.jpg', 'ETC2',  quality);
compress('backstein.jpg', 'DXT1',  quality);

compress('moewe.png', 'ASTC_4x4',  quality);
compress('moewe.png', 'ETC2A',  quality);
compress('moewe.png', 'DXT5',  quality);
