import map from 'lodash/map';
import each from 'lodash/each';
import flatten from 'lodash/flatten';
import transform from 'lodash/transform';
import times from 'lodash/times';
import inRange from 'lodash/inRange';
import isEmpty from 'lodash/isEmpty';
import isArray from 'lodash/isArray';
import isArrayLike from 'lodash/isArrayLike';

import { min, max } from './util';

// Converts either a single color or a list of colors in 555 format to their
// RGBA 4-entry equivalents
export function _555_to_rgba(value) {
    function convert(color) {
        const r = color & 0b11111;
        color >>>= 5;
        const g = color & 0b11111;
        color >>>= 5;
        const b = color & 0b11111;
        return [r << 3, g << 3, b << 3, 0xFF];
    }

    return isArray(value)
        ? map(value, convert)
        : convert(value);
}

export function apply_palette(canvas, palette) {
    if (canvas.indexed) {
        let color;
        const { w, h } = canvas;
        // Treat index 0 and any out of range as transparent, otherwise fully opaque
        const data = map(canvas.data, i => i !== 0 && palette[i-1] || [0,0,0,0]);
        return { w, h, rgba: true, data };
    }
    return canvas;
}

export function image_data_from_canvas(canvas) {
    if (!canvas.rgba)
        throw new Error('Can only convert canvas to BitmapData from rgba mode');
    const { w, h, data } = canvas;
    return new ImageData(Uint8ClampedArray.from(flatten(data)), w, h);
}

export const nil_canvas = Object.freeze({ w: 0, h: 0, indexed: true, rgba: true, data: [] });

export function transparent_canvas(w, h) {
    const data = times(w*h, () => [0,0,0,0]);
    return { w, h, rgba: true, data };
}

// Expects:
// A list of tilemaps objects
// An object consisting of writes to the DMA and what should be there
export function canvas_from_raw_data(tilemaps, tile_data, bounding_box) {
    const tiles = [];

    for (const tilemap of tilemaps) {
        const x_offset = tilemap.x - (tilemap.x >= 0x100 ? 0x200 : 0);
        const y_offset = tilemap.y - (tilemap.y >= 0x80 ? 0x100 : 0);
        const { size: big_tile, index, v: v_flip, h: h_flip } = tilemap;

        if (big_tile) {
            add_tile(x_offset + (h_flip ? 8 : 0), y_offset + (v_flip ? 8 : 0), index + 0x00);
            add_tile(x_offset + (h_flip ? 0 : 8), y_offset + (v_flip ? 8 : 0), index + 0x01);
            add_tile(x_offset + (h_flip ? 8 : 0), y_offset + (v_flip ? 0 : 8), index + 0x10);
            add_tile(x_offset + (h_flip ? 0 : 8), y_offset + (v_flip ? 0 : 8), index + 0x11);
        }
        else
            add_tile(x_offset, y_offset, index);

        function add_tile(x_offset, y_offset, index) {
            let tile = tile_from_4bbp(tile_data[index]);
            if (h_flip)
               tile = tile_flip_horizontal(tile);
            if (v_flip)
               tile = tile_flip_vertical(tile);
            tiles.push({ x_offset, y_offset, tile });
        }
    }

    return canvas_from_tiles(tiles, bounding_box);
}

function canvas_from_tiles(tiles, bounding_box) {
    if (isEmpty(tiles)) {
        return nil_canvas;
    }

    const x_min = min([...map(tiles, 'x_offset'), 0]);
    const y_min = min([...map(tiles, 'y_offset'), 0]);

    const x0_min = bounding_box[0] - x_min;
    const y0_min = bounding_box[1] - y_min;
    const x0_max = bounding_box[2] - x_min;
    const y0_max = bounding_box[3] - y_min;

    const w = x0_max - x0_min;
    const h = y0_max - y0_min;

    const data = transform(tiles, (data, { x_offset, y_offset, tile }) => {
        each(tile, (v, i) => {
            if (v === 0)
                return;
            const x = i % 8;
            const y = (i - x) / 8;
            const x0 = x + x_offset - x_min;
            const y0 = y + y_offset - y_min;
            if (inRange(x0, x0_min, x0_max) &&
                inRange(y0, y0_min, y0_max))
                data[(x0-x0_min) + (y0-y0_min)*w] = v;
        });
    },
    new Uint8Array(w*h));

    return { w, h, indexed: true, data };
}

const _4bbp_bit_mask = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
const _4bbp_byte_map = [
    [ 0,  1, 16, 17],
    [ 2,  3, 18, 19],
    [ 4,  5, 20, 21],
    [ 6,  7, 22, 23],
    [ 8,  9, 24, 25],
    [10, 11, 26, 27],
    [12, 13, 28, 29],
    [14, 15, 30, 31],
];

function tile_from_4bbp(data) {
    return transform(_4bbp_byte_map, (tile, row, y) => {
        const [b0, b1, b2, b3] = map(row, i => data[i]);
        each(_4bbp_bit_mask, (m, x) => {
            tile[x + y*8] =
                ((b0 & m) > 0 ? 1 : 0) +
                ((b1 & m) > 0 ? 2 : 0) +
                ((b2 & m) > 0 ? 4 : 0) +
                ((b3 & m) > 0 ? 8 : 0);
        });
    },
    new Uint8Array(64));
}

function tile_flip_horizontal(tile) {
    // xor three low bits to flip a column out of 8
    return transform(tile,
        (flip, v, i) => flip[i ^ 0b000111] = v,
        new Uint8Array(64));
}

function tile_flip_vertical(tile) {
    // xor three high bits to flip a row out of 8
    return transform(tile,
        (flip, v, i) => flip[i ^ 0b111000] = v,
        new Uint8Array(64));
}

// Tilemap represents the data of a 5 byte tilemap entry
//
// The entry is in the form $s000_000x_xxxx_xxxx $yyyy_yyyy $vhoo_pppt_tttt_tttt where
// s = big/small tile
// x/y = X/Y center offset (high x bit for negative x wrap)
// v/h = vert/hor flip
// p = palette
// o = priority
// t = tile index (high bit for next vram page)

const Flags = {
    Size: 0x8000,
    Vert: 0x8000,
    Hor:  0x4000,
};

const Shifts = {
    Prio: 12,
    Pal: 9,
};

export class Tilemap {

    constructor(value) {
        const args = isArrayLike(value) ? Tilemap.decompile(value) : arguments;
        this.construct_from_args(...args);
    }

    construct_from_args(x, y, index, p, o, size = false, v = false, h = false) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.p = p;
        this.o = o;
        this.size = size;
        this.v = v;
        this.h = h;
    }

    flip_around_center(flip = { v: false, h: false }) {
        const { x, y, index, p, o, size, v, h } = this;
        const copy = new Tilemap(x, y, index, p, o, size, v, h);
        const tile_width = size ? 16 : 8
        if (flip.h) {
            copy.h = !copy.h;
            copy.x = -copy.x - tile_width;
        }
        if (flip.v) {
            copy.v = !copy.v;
            copy.y = -copy.y - tile_width;
        }
        return copy;
    }

    compile() {
        if ((this.p & ~0b111) > 0) throw new Error('Expected a Palette within a 3 bit field range');
        if ((this.o & ~0b11) > 0) throw new Error('Expected a Priority within a 2 bit field range');
        if ((this.index & ~0x1FF) > 0) throw new Error('Expected an index within the range [0,512)');

        const size = this.size ? Flags.Size : 0;
        // Since the 9th x bit allow for screen wrap, modulo $200 will handle
        // both negative and out of bounds positive x values.
        const x = this.x % 0x200;
        const y = this.y % 0x100;

        const v = this.v ? Flags.Vert : 0;
        const h = this.h ? Flags.Hor : 0;
        const o = this.o << Shifts.Prio;
        const p = this.p << Shifts.Pal;

        return [size|x, y, v|h|o|p|this.index];
    }

    static decompile(values) {
        const [a, b, c] = values;
        return [
            a & 0x1FF,                   // x
            b & 0xFF,                    // y
            c & 0x1FF,                   // index
            (c >>> Shifts.Pal) & 0b111,  // p
            (c >>> Shifts.Prio) & 0b11,  // o
            (a & Flags.Size) > 0,        // size
            (c & Flags.Vert) > 0,        // v
            (c & Flags.Hor) > 0,         // h
        ];
    }
}
