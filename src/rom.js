import map from 'lodash/map';
import transform from 'lodash/transform';
import some from 'lodash/some';
import includes from 'lodash/includes';
import repeat from 'lodash/repeat';
import sumBy from 'lodash/sumBy';
import zip from 'lodash/zip';
import isEqual from 'lodash/isEqual';
import isInteger from 'lodash/isInteger';
import isString from 'lodash/isString';

import { readAsArrayBuffer } from './file';
import * as util from './util';
import { hex } from './util';

const LoRom =   0x000;
const HiRom =   0b001;
const ExLoRom = 0b010;
const ExHiRom = 0b101;

const HeaderSize = 0x200;
const MegaBit = 0x20000;
const HalfBank = 0x8000;

const LowerAscii = 0x20;
const UpperAscii = 0x7E;
const RomTitleSize = 21;

export default class Rom {

    // Reading file content is an asynch operation in javascript. Since it's
    // highly discouraged to do asynch operations in a constructor we split off
    // this helper method to be called first, then read the content, and then
    // finally instantiate a Rom instance.
    static verify_file_size(file) {
        const excess = file.size % HalfBank;
        if (excess !== 0 && excess !== HeaderSize)
            throw new Error(`The file ${file.name} does not contain a precise number of half banks... is it a valid ROM?`);
    }

    constructor(content, size) {
        if (size % HalfBank === 0) {
            this.headered = false;
            this.size = size;
        }
        else if (size % HalfBank === HeaderSize) {
            this.headered = true;
            this.size = size - HeaderSize;
        }

        if (this.headered) {
            this.header = new Uint8Array(content.slice(0, HeaderSize));
            this.content = new Uint8Array(content.slice(HeaderSize));
        }
        else {
            this.header = new Uint8Array(0);
            this.content = new Uint8Array(content);
        }

        [this.map_mode, this.hi_mode, this.ext_mode] = this.check_map_mode();
        this.verify_map_mode();
    }

    check_map_mode() {
        const extended = this.size > 32 * MegaBit;
        const lorom_checksum = 0x7FDE + (extended ? 0x40000 : 0);
        const hirom_checksum = 0xFFDE + (extended ? 0x40000 : 0);
        if (this.read(lorom_checksum, 2) + this.read(lorom_checksum-2, 2) === 0xFFFF)
            return extended
                ? ['ExLoRom', false, extended]
                : ['LoRom', false, extended];
        else if (this.read(hirom_checksum, 2) + this.read(hirom_checksum-2, 2) === 0xFFFF)
            return extended
                ? ['ExHiRom', true, extended]
                : ['HiRom', true, extended];
        // The checksum is bad, so try to infer from the internal header being valid characters or not
        else {
            const lorom_title = 0x7FC0 + (extended ? 0x40000 : 0);
            const hirom_title = 0xFFC0 + (extended ? 0x40000 : 0);
            const lorom_char_count = sumBy(this.read(lorom_title, repeat('1', RomTitleSize)), x => x >= LowerAscii && x <= UpperAscii);
            const hirom_char_count = sumBy(this.read(hirom_title, repeat('1', RomTitleSize)), x => x >= LowerAscii && x <= UpperAscii);
            return lorom_char_count >= hirom_char_count
                ? extended
                    ? ['ExLoRom', false, extended]
                    : ['LoRom', false, extended]
                : extended
                    ? ['ExHiRom', true, extended]
                    : ['HiRom', true, extended];
        }
    }

    verify_map_mode() {
        const mapping = this.read_from_internal_header(0x15, 1);
        const mappings = [
            ['LoRom', [0x20, 0x30]],
            ['HiRom', [0x21, 0x31]],
            ['LoRom', [0x23]], // Maybe SA-1 will work, MAYBE
            ['HiRom', [0x23]], // -"-
            ['ExLoRom', [0x32, 0x30]], // Technically 0x32 is the correct value, but not all hackers respect this
            ['ExHiRom', [0x35]],
        ];
        const recognized = some(mappings, ([map_mode, values]) => this.map_mode === map_mode && includes(values, mapping));
        if (!recognized)
            throw new Error(`Cannot recognize the mapping mode byte of this ROM: ${hex(mapping)}.`);
    }

    game_title() {
        const text = this.read_from_internal_header(0, repeat('1', 21));
        return new TextDecoder('ascii').decode(Uint8Array.from(text).buffer);
    }

    read_from_internal_header(offset, size) {
        return this.read_from_snes_address(0xFFC0 + offset, size);
    }

    read_from_snes_address(addr, encoding) {
        return this.read(this.snes_to_pc(addr), encoding);
    }

    bulk_read_from_snes_address(addr, size) {
        return this.bulk_read(this.snes_to_pc(addr), size);
    }

    write_to_snes_address(addr, encoding, values) {
        return this.write(this.snes_to_pc(addr), encoding, values);
    }

    // Checks to see if, indeed, a value is still in the classic (bugged) value,
    // and if so, fixes it
    // Returns true if the fix was applied
    verified_write_to_snes_address(snes_address, encoding, classic_values, fixed_values) {
        // First make sure the input makes sense -- either all integers or matching length lists
        if (!isInteger(encoding) && classic_values.length !== fixed_values.length)
            throw new Error(`Classic and fixed value lists have different length: ${classic_values.length} vs ${fixed_values.length}`);

        if (isEqual(this.read_from_snes_address(snes_address, encoding), classic_values)) {
            this.write_to_snes_address(snes_address, encoding, fixed_values);
            return true;
        }
        return false;
    }

    // Expects a ROM address and an encoding
    //
    // If encoding is an integer:
    // Returns a single value which is the unpacked integer in normal
    // (big-endian) format from addr to addr+encoding
    // Example: .read(0x7FDC, 2) will return the big-endian conversion of bytes
    // 0x7FDC and 0x7FDD
    //
    // If encoding is a string:
    // Starting from addr, unpacks values according to the encoding string,
    // converting them from little endian as it goes
    // Example: .read(0x7FDC, "22") will read two words that start at 0x7FDC
    // and return them in normal (big-endian) format as a list
    read(addr, encoding) {
        if (isInteger(encoding))
            return this.read_single(addr, encoding)
        if (isString(encoding) && /^[\d]*$/.test(encoding)) {
            // Spread syntax splits the string into individual characters
            return transform([...encoding], (values, code) => {
                const size = code >> 0;
                values.push(this.read_single(addr, size));
                addr += size;
            }, []);
        }
        throw new Error(`Unrecognized encoding: ${encoding}`);
    }

    // If encoding is an integer:
    // Expects a value and an address to write to. It will convert it to little-endian format automatically.
    // Example: .write(0x7FDC, 0x1f2f, 2) will write 0x2f to 0x7FDC and 0x1f to 0x7FDD
    //
    // If encoding is a string:
    // Does essentially the same thing, but expects a list of values instead of a single value
    // converting them to little endian and writing them in order.
    // Example: .write(0x7FDC, [0x111F,0x222F], "22") will write $1F $11 $2F $22 to 0x7FDC-0x7FDF
    write(addr, encoding, values) {
        if (isInteger(encoding)) {
            if (!isInteger(values))
                throw new Error(`Encoded for a single value, but ${values} was not a single value`);
            this.write_single(values, encoding, addr);
        }
        else if (isString(encoding)) {
            if (isInteger(values))
                throw new Error(`Encoded for multiple values, but only one value was given`);
            if (values.length !== encoding.length)
                throw new Error(`Encoded for multiple values, but number of values mismatch: ${values.length} vs ${encoding.length}`);
            // Spread syntax splits the string into individual characters
            for (const [value, code] of zip(values, [...encoding])) {
                const size = code >> 0;
                this.write_single(value, size, addr)
                addr += size;
            }
        }
        else
            throw new Error(`Unrecognized encoding: ${encoding}`);
    }

    read_single(addr, size) {
        if (addr + size > this.size)
            throw Error(`Address range lies beyond ROM file boundary: addr ${hex(addr, 6)}, size ${hex(size)}`);
        
        if (size === 1)
            return this.content[addr];

        const bytes = this.content.slice(addr, addr+size);

        switch (size) {
            case 2: return util.le_dw_value(bytes);
            case 3: return util.le_dl_value(bytes);
            case 4: return util.le_dd_value(bytes);
        }
        
        throw new Error(`Size ${size} is not a valid size`);
    }

    write_single(value, size, addr) {
        if (addr + size > this.size)
            throw new Error(`Address range lies beyond ROM file boundary: addr ${hex(addr, 6)}, size ${hex(size)}`);

        if (size === 1) {
            this.content[addr] = value;
            return;
        }

        switch (size) {
            case 2: this.content.set(util.le_dw_bytes(value), addr); return;
            case 3: this.content.set(util.le_dl_bytes(value), addr); return;
            case 4: this.content.set(util.le_dd_bytes(value), addr); return;
        }
        
        throw new Error(`Size ${size} is not a valid size`);
    }

    bulk_read(addr, size) {
        return this.content.slice(addr, addr + size);
    }

    snes_to_pc(addr) {
        if (addr > 0xFFFFFF || addr < 0)
            throw new Error(`SNES address ${hex(addr, 4)} lies outside of SNES address space`);

        if (this.hi_mode) {
            if ((addr & 0xFE0000) === 0x7E0000 || // wram
                (addr & 0x408000) === 0x000000)   // hardware regs, ram mirrors, other strange junk
                throw new Error(`SNES address ${hex(addr, 4)} does not map to ROM`);
        }
        else {
            if ((addr & 0xFE0000) === 0x7E0000 || // wram
                (addr & 0x408000) === 0x000000 || // hardware regs, ram mirrors, other strange junk
                (addr & 0x708000) === 0x700000)   // sram (low parts of banks 70-7D)
                throw new Error(`SNES address ${hex(addr, 4)} does not map to ROM`);
        }

        const ex = this.ext_mode && addr < 0x800000 ? 0x400000 : 0;
        // LoRom includes $[40,70):<8000 which has something to do with MAD-1 or lack thereof
        const pc = this.hi_mode ? (addr & 0x3FFFFF) : ((addr & 0x7F0000) >>> 1) | (addr & 0x7FFF);

        return ex | pc;
    }
}
