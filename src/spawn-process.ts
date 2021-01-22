import { spawn } from 'child_process';

export interface SpawnProcessOptions {
  verbose: boolean;
}

export function spawnProcess(
  command: string,
  args: string[] = [],
  options: Partial<SpawnProcessOptions> = {}
): Promise<void> {
    const { verbose = false } = options;

    return new Promise((resolve, reject) => {
        if (verbose) {
            console.log(`${command} ${args.join(' ')}`);
        }

        const process = spawn(command, args);

        if (verbose) {
            process.stdout.on('data', data => {
                console.log(data.toString());
            });
        }

        process.stderr.on('data', data => {
            console.error(data.toString());
        });

        process.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`process exited with code ${code}`));
            }
        });
    });
}
