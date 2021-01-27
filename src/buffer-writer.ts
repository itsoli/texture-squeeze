import { pad4 } from './util';

export class BufferWriter {
    offset: number = 0;

    constructor(readonly buffer: Buffer) {}

    writeUint8Array(array: Uint8Array) {
        for (const item of array) {
            this.buffer.writeUInt8(item, this.offset++);
        }
    }

    writeUInt32(n: number) {
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
    }

    writeString(s: string) {
        this.buffer.write(s, this.offset, 'utf8');
        this.offset += s.length;
        this.buffer.writeUInt8(0, this.offset++);
    }

    align4() {
        const paddedOffset = pad4(this.offset);
        while (this.offset < paddedOffset) {
            this.buffer.writeUInt8(0, this.offset++);
        }
    }
}
