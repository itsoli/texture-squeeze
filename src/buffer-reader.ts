import { pad4 } from './util';

export class BufferReader {
    private readBufferUint32: (offset: number) => number;

    constructor(readonly buffer: Buffer, littleEndian: boolean, public offset: number = 0) {
        if (littleEndian) {
            this.readBufferUint32 = offset => buffer.readUInt32LE(offset);
        } else {
            this.readBufferUint32 = offset => buffer.readUInt32BE(offset);
        }
    }

    readUint32(): number {
        const value = this.readBufferUint32(this.offset);
        this.offset += 4;
        return value;
    }

    readString(maxLength?: number): string {
        const start = this.offset;
        let len = 0;
        while (maxLength === undefined || len < maxLength) {
            if (this.buffer.readUInt8(this.offset++) === 0) {
                break;
            }
            ++len;
        }
        return this.buffer.toString('utf8', start, start + len);
    }

    align4() {
        this.offset = pad4(this.offset);
    }
}
