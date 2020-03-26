import map from 'lodash/map';
import flatMap from 'lodash/flatMap';
import transform from 'lodash/transform';
import times from 'lodash/times';
import has from 'lodash/has';
import includes from 'lodash/includes';
import reverse from 'lodash/reverse';
import range from 'lodash/range';
import repeat from 'lodash/repeat';
import isNil from 'lodash/isNil';
import isUndefined from 'lodash/isUndefined';
import isEqual from 'lodash/isEqual';
import inRange from 'lodash/inRange';

import { Tilemap } from '../graphics';
import { min, cache, le_dw_value } from '../util';

export default class Metroid3Rom {
    constructor(rom) {
        this.rom = rom;

        this.apply_bugfixes();
        this.apply_improvements();
    }

    // Todo: removed third argument `port_frame` and the gun data code in the method
    read_dma_pose_data(animation, pose, table = { upper: true, lower: true }) {
        const tilemaps = this.read_pose_tilemaps(animation, pose, table);
        const dma_data = this.read_dma_data(animation, pose);
        const duration = this.read_pose_duration(animation, pose);
        return [tilemaps, dma_data, duration];
    }

    // Wrapper method to allow for IDE navigation
    read_death_pose_data(pose, facing) {
        return this._read_death_pose_data(pose, facing);
    }

    _read_death_pose_data = cache(this.make_death_pose_cache, (pose, facing, data) => {
        const { rom } = this;
        const { size, source_bank, dest_tile_addr, classic, dma_table_addr } = data;

        const table_addr = dma_table_addr[facing];
        const tilemaps_addr = { left: 0x92EDDB, right: 0x92EDD0 }[facing];

        const tilemaps = this.read_pose_tilemaps_from_addr(tilemaps_addr, 0, pose);

        // Classically, there are 5 double rows, but the modifications expand this to 16
        const dma_data = transform(range(classic ? 5 : 16), (writes, i) => {
            // x / 0x10 => x >>> 4
            const dest_tile = (rom.read_from_snes_address(dest_tile_addr + 2*i, 2) - 0x6000) >>> 4;
            const source_data = source_bank + rom.read_from_snes_address(table_addr + 2*i, 2);
            writes[dest_tile] = rom.bulk_read_from_snes_address(source_data, size);
        }, {});

        // How long to hold this pose, and an index to which palette to use
        // Todo: palette_index unused variable
        const [duration, palette_index] = rom.read_from_snes_address(0x9BB823 + 2*pose, '11');

        return [reverse(tilemaps), dma_data, duration];
    });

    make_death_pose_cache() {
        const { rom } = this;

        const data = {
            size: rom.read_from_snes_address(0x9BB6DF, 2),
            source_bank: rom.read_from_snes_address(0x9BB6EF, 1) * 0x10000,
            dest_tile_addr: 0x9B0000 + rom.read_from_snes_address(0x9BB6F6, 2),
        };

        const [inst, addr] = rom.read_from_snes_address(0x9BB6E5, '12')
        // Classic, LDA (B9) $B7BF
        if (isEqual([inst, addr], [0xB9, 0xB7BF])) {
            const dma_table_addr = { left: 0x9BB7BF, right: 0x9BB7BF };
            return { ...data, classic: true, dma_table_addr };
        }
        // Modified ROM, JSR (20) Addr, have to go into the JSR and pull out the pointers
        if (inst === 0x20) {
            const search_addr = 0x9B0000 + addr;
            const search_size = min(0x100, 0x9C0000 - search_addr);
            const search = rom.bulk_read_from_snes_address(search_addr, search_size);

            let dma_cue = 0;
            const dma_table_addr = {};
            [dma_table_addr.left, dma_cue] = find_table_addr(search, dma_cue);
            [dma_table_addr.right] = find_table_addr(search, dma_cue);
            
            function find_table_addr(search, cue) {
                cue = cue + search.indexOf(0xB9, cue) + 1;
                if (cue < 1) throw new Error('Could not find a LDA ($B9) asm instruction to use as cue');
                const addr = 0x9B0000 + le_dw_value(search.slice(cue, cue+2));
                return [addr, cue];
            }

            return { ...data, classic: false, dma_table_addr };
        }
        throw new Error('Cannot find the DMA location of the death sequence tiles');
    }

    read_pose_tilemaps(animation, pose, table = { upper: true, lower: true }) {
        const lower_tilemaps = this.read_pose_tilemaps_from_addr(0x92945D, animation, pose);
        const upper_tilemaps = this.read_pose_tilemaps_from_addr(0x929263, animation, pose);

        // Special case here for elevator poses, they have this extra stupid
        // tile. The position is hardcoded into the game at a block starting at
        // $90:868D.
        // I did not make the code go in there and dig out the offsets because
        // this tile is stupid.
        const stupid_tile_tilemap = animation === 0x00
            ? pose === 0
                // Elevator pose (power suit only), stupid offsets
                ? [new Tilemap([0x01F9,0xF5,0x3821])]
                // Launcher pose (power suit only), stupider offsets
                : [new Tilemap([0x01F9,0xF0,0x3821])]
            : [];

        // The tiles are rendered in this specific order: backwards lower, backwards upper
        return [
            ...(table.lower ? reverse(lower_tilemaps) : []),
            ...stupid_tile_tilemap,
            ...(table.upper ? reverse(upper_tilemaps) : []),
        ];
    }

    read_pose_tilemaps_from_addr(base_addr, animation, pose) {
        const { rom } = this;
        // Get the pointer to the list of pose pointers (in disassembly: get P??_UT or P??_LT)
        const animation_all_poses_index = rom.read_from_snes_address(base_addr + 2*animation, 2);
        
        // Now get the specific pointer to the tilemap set (in disassembly: get TM_???)
        const pose_tilemaps_pointer = 0x920000 + rom.read_from_snes_address(0x92808D + 2*animation_all_poses_index + 2*pose, 2);
        
        // Now use that pointer to find out how many tilemaps there actually are.
        // A zero pointer means no tiles.
        const num_tilemaps = pose_tilemaps_pointer === 0x920000 ? 0
            : rom.read_from_snes_address(pose_tilemaps_pointer, 2);
        
        // And now get the tilemaps! They start right after the word specifying their number
        return range(num_tilemaps)
            .map(i => rom.read_from_snes_address(pose_tilemaps_pointer + 2 + 5*i, "212"))
            .map(values => new Tilemap(values));
    }

    read_dma_data(animation, pose) {
        const { rom } = this;
        // Get the pointer to the big animation frame progression table of
        // indices (in disassembly: get AFP_T??)
        const afp_table_addr = 0x920000 + rom.read_from_snes_address(0x92D94E + 2*animation, 2);
        
        // Get two sets of table/entry indices for use in the DMA table
        const [top_table, top_entry, bottom_table, bottom_entry] = rom.read_from_snes_address(afp_table_addr + 4*pose, '1111');
        
        // Get the data for each part
        return transform([
            [0x92D938, bottom_table, bottom_entry, 0x08], // Lower body VRAM
            [0x92D91E, top_table,    top_entry,    0x00], // Upper body VRAM
        ], (dma_data, [base_addr, table, entry, vram_offset]) => {
            // Reference the first index to figure out where the relevant DMA table is
            const dma_table = 0x920000 + rom.read_from_snes_address(base_addr + 2*table, 2);

            // From this table, get the appropriate entry in the list which
            // contains the DMA pointer and the row sizes
            const [dma_pointer, first_row_size, second_row_size] = rom.read_from_snes_address(dma_table + 7*entry, "322");

            // Read the DMA data
            const first_row = rom.read_from_snes_address(dma_pointer, repeat('1', first_row_size));
            const second_row = rom.read_from_snes_address(dma_pointer+first_row_size, repeat('1', second_row_size));

            dma_data[vram_offset] = first_row;
            dma_data[0x10+vram_offset] = second_row;
        }, {});
    }

    read_pose_duration(animation, pose) {
        // Get the duration list pointer (FD_?? in disassembly)
        const duration_list_addr = this.read_duration_list_location(animation);
        return this.rom.read_from_snes_address(duration_list_addr+pose, 1);
    }

    read_duration_list_location(animation) {
        return 0x910000 + this.rom.read_from_snes_address(0x91B010 + 2*animation, 2);
    }

    read_minimal_gun_data(direction, level) {
        if (!inRange(level, 3))
            throw new Error(`Invalid level value ${level}`);
        if (!inRange(direction, 10))
            throw new Error(`Invalid direction value ${direction}`);

        const { rom } = this;

        // For the port tilemap, we normalize it to position (0, 0)
        const c = rom.read_from_snes_address(0x90C791 + 2*direction, 2);
        const tilemap = new Tilemap([0x0000, 0x00, c]);

        // Need DMA info
        const dma_list_addr = 0x900000 + rom.read_from_snes_address(0x90C7A5 + 2*direction, 2);
        const dma_pointer = 0x9A0000 + rom.read_from_snes_address(dma_list_addr + 2*(level+1), 2);

        // This is where the tile is loaded into in VRAM
        // x / 0x10 => x >>> 4
        const gun_tile = (rom.read_from_snes_address(0x90C786, 2) - 0x6000) >>> 4;

        // This is the actual graphics data for the tile
        const gun_dma = rom.bulk_read_from_snes_address(dma_pointer, 0x20);

        return [tilemap, gun_tile, gun_dma];
    }

    read_file_select_dma_data() {
        const { rom } = this;
        // Classically, the file select DMA data is located at $B6:C000.
        // However, many hacks relocate this to make more room for pause menu
        // graphics.

        const file_select_data_addr = rom.read_from_snes_address(0x818E34, 3);
        return { [0x00]: rom.bulk_read_from_snes_address(file_select_data_addr, 0x2000)};
    }

    make_file_select_tilemaps(item) {
        const { rom } = this;

        // For now, I have just coded these up by hand because it does not seem
        // worth it to extract this information dynamically.
        
        const pal_prio = [1, 2];
        switch (item) {
            // Samus heads
            case 0: case 1: case 2:
                return flatMap(range(3), x => map(range(3), y =>
                    new Tilemap(8*x, 8*y, 0xD0 + 3*item + x + 0x10*y, ...pal_prio)
                ));
            // Samus visors
            case 3: case 4: case 5: case 6: case 7:
                const x = (item-3) % 3;
                const y = (item-3-x) / 3;
                return map(range(2), i =>
                    new Tilemap(4 + 8*i, 10, 0xD9 + i + 2*x + 0x10*y, ...pal_prio)
                );
            // Cursor
            case 8:
                return [
                    new Tilemap(0x00, 0x18, 0xFE, ...pal_prio),
                    new Tilemap(0x00, 0x10, 0xEE, ...pal_prio),
                    new Tilemap(0x00, 0x08, 0xDF, ...pal_prio),
                    new Tilemap(0x00, 0x00, 0xC8, ...pal_prio),
                    new Tilemap(0x08, 0x18, 0xCC, ...pal_prio),
                    new Tilemap(0x08, 0x10, 0xFF, ...pal_prio),
                    new Tilemap(0x08, 0x08, 0xEF, ...pal_prio),
                ];
            // Pipe framework
            case 9:
                return [
                    new Tilemap(0x00, 0x00, 0xF9, ...pal_prio),
                    new Tilemap(0x08, 0x00, 0xFA, ...pal_prio),
                    new Tilemap(0x10, 0x00, 0xFB, ...pal_prio),
                    new Tilemap(0x10, 0x08, 0xED, ...pal_prio),
                    new Tilemap(0x00, 0x10, 0xFC, ...pal_prio),
                    new Tilemap(0x10, 0x10, 0xFD, ...pal_prio),
                ];
        }
        throw new Error(`Unknown item number ${item}`);
    }

    // Returns a list. Each element of the list is a tuple, where the first
    // entry is the amount of time that the palette should display for (here
    // $00 is a special case for static palettes).
    // The second entry is the 555 palette data.
    read_palette(base_type, suit_type) {
        const { rom } = this;

        // Lookup table with data and handler functions
        const base = {
            standard:      { power: 0x9B9400, varia: 0x9B9520, gravity: 0x9B9800, fn: static_palette },
            loader:        { power: 0x8DDB62, varia: 0x8DDCC8, gravity: 0x8DDE2E, fn: loader },
            heat:          { power: 0x8DE45E, varia: 0x8DE68A, gravity: 0x8DE8B6, fn: heat },
            charge:        { power: 0x9B9820, varia: 0x9B9920, gravity: 0x9B9A20, fn: charge },
            speed_boost:   { power: 0x9B9B20, varia: 0x9B9D20, gravity: 0x9B9F20, fn: speed_boost },
            speed_squat:   { power: 0x9B9BA0, varia: 0x9B9DA0, gravity: 0x9B9FA0, fn: speed_squat },
            shinespark:    { power: 0x9B9C20, varia: 0x9B9E20, gravity: 0x9BA020, fn: shinespark },
            screw_attack:  { power: 0x9B9CA0, varia: 0x9B9EA0, gravity: 0x9BA0A0, fn: screw_attack },
            hyper_beam:    { _: 0x9BA240, fn: hyper_beam },
            death_suit:    { power: 0x9BB7D3, varia: 0x9BB7E7, gravity: 0x9BB7FB, fn: death_suit },
            death_flesh:   { _: 0x9BB80F, fn: death_flesh },
            crystal_flash: { _: 0x9B96C0, fn: crystal_flash },
            sepia:           { _: 0x8CE569, fn: static_palette },
            sepia_hurt:      { _: 0x9BA380, fn: static_palette },
            sepia_alternate: { _: 0x9BA3A0, fn: static_palette },
            door:            { _: 0x82E52C, fn: door },
            xray:            { _: null, fn: xray },
            file_select:     { _: 0x8EE5E0, fn: static_palette },
            ship:            { _: [0xA2A59E, 0x8DCA4E], fn: ship },
            // Technically the thrusters alternate white and black every frame,
            // but this is a bit much on the eyes
            intro_ship:      { _: 0x8CE689, fn: static_palette },
            outro_ship:      { _: 0x8DD6BA, fn: outro_ship },
        }

        function static_palette(base_address) {
            return [this.read_static_palette(base_address)];
        }

        function loader(base_address) {
            // This is a set of rotating palettes implemented in microcode
            // (loader is the most complex case of these, thankfully)
            return transform(range(5), (full_set, i) => {
                // There are four "cycles" before a special fifth cycle
                if (i < 4) {
                    const counter = rom.read_from_snes_address(base_address + 6, 1);
                    // Skip over the control codes for this cycle
                    base_address += 7
                    // Each cycle has two palettes each
                    const current_set = times(2, () => {
                        const set = this.read_timed_palette(base_address);
                        // Skip over the duration dbyte, the palette, and the control code
                        base_address += 0x24;
                        return set;
                    });
                    // Append the whole cycle and all its repetitions
                    times(counter, () => full_set.push(...current_set));
                    return;
                }
                // Fifth cycle is special (not really a cycle... just a single
                // frame addition to the end)

                // Skip over the final control codes
                base_address += 4;
                full_set.push(this.read_timed_palette(base_address));

                // Don't keep flashing forever (for the animator)
                full_set.push([0, full_set[0][1]]);
            });
        }

        function heat(base_address) {
            // Skip over the control codes
            base_address += 8;
            // heat is not coded with transparency
            return this.read_sequence_of_timed_palettes(base_address, 16, { add_transparency: true });
        }

        function charge(base_address) {
            // The charged shot palette advances every frame
            // (determined by manual frame advance)
            return map(range(8), i => [1, this.read_raw_palette(base_address + i*0x20)]);
        }

        function speed_boost(base_address) {
            // 4 frames each during the warm up, then stay at last palette forever
            // (determined by manual frame advance)
            return [
                ...map(range(3), i => [4, this.read_raw_palette(base_address + i*0x20)]),
                [0, this.read_raw_palette(base_address + 0x60)]
            ];
        }

        function speed_squat(base_address) {
            // Timing and order determined by manual frame advance.
            // One frame each, oscillates between 0 and 3
            return map([0,1,2,3,2,1], i => [1, this.read_raw_palette(base_address + i*0x20)]);
        }

        function shinespark(base_address) {
            // Timing and order determined by manual frame advance.
            // One frame each, goes 0 to 3 then resets
            return map(range(4), i => [1, this.read_raw_palette(base_address + i*0x20)]);
        }

        function screw_attack(base_address) {
            // Timing and order determined by manual frame advance.
            // One frame each, oscillates between 0 and 3
            return map([0,1,2,3,2,1], i => [1, this.read_raw_palette(base_address + i*0x20)]);
        }

        function hyper_beam(base_address) {
            // Todo: what is a "Youtube frame advance"??
            // Timing and order estimated by Youtube frame advance.
            // Each frame goes down 1, overall from 9 to 0 then resets
            return map(range(9,-1,-1), i => [2, this.read_raw_palette(base_address + i*0x20)]);
        }

        // Todo: could combine with death_flesh if it turns out they should pick a palette the same way
        function death_suit(palette_table_addr) {
            // There are ten pointers in total, grab them all
            const palette_list = map(
                rom.read_from_snes_address(palette_table_addr, repeat('2', 10)),
                offset => 0x9B0000 + offset
            );

            // Ironically, the code doesn't even use all of these palettes,
            // because that is determined by the next parameters
            return transform(range(9), (full_set, i) => {
                const [duration, palette_index] = rom.read_from_snes_address(0x9BB823 + 2*i, '11');
                // Todo: is this wrong? death_flesh calls read_raw_palette here..
                full_set.push([duration, palette_list[palette_index]]);
            });
        }

        function death_flesh(palette_list_addr) {
            // There are ten pointers in total, grab them all
            const palette_list = map(
                rom.read_from_snes_address(palette_list_addr, repeat('2', 10)),
                offset => 0x9B0000 + offset
            );

            // Ironically, the code doesn't even use all of these palettes,
            // because that is determined by the next parameters
            return transform(range(9), (full_set, i) => {
                const [duration, palette_index] = rom.read_from_snes_address(0x9BB823 + 2*i, '11');
                full_set.push([duration, this.read_raw_palette(palette_list[palette_index])]);
            });
        }

        function crystal_flash(base_address) {
            // Timing determined by manual frame advance
            return map(range(6), i => [2, this.read_raw_palette(base_address + i*0x20)]);
        }

        function door(base_address) {
            const visor_color = rom.read_from_snes_address(base_address, 2);
            // Use 0 as the base color...technically this fades upwards into the suit color
            const colors = times(16, () => 0);
            colors[4] = visor_color;
            return [(0, colors)];
        }

        function xray() {
            // Recurse to get the regular suit palette
            const [, base_palette] = this.read_palette('standard', suit_type)[0];
            const visor_colors = this.read_nightvisor_colors();
            // I did manual frame advances to learn that the duration is 6
            // frames for each visor color
            return map(visor_colors, visor => [6, map(base_palette, (color, i) => i === 4 ? visor : color)]);
        }

        function ship([base_palette_addr, ship_underglow_addr]) {
            // Intentionally skipping last color
            const base_palette = rom.read_from_snes_address(base_palette_addr, repeat('2', 15));

            // Skip over the control codes
            ship_underglow_addr += 4;
            return transform(range(14), (full_set, i) => {
                // Now what you're going to get is a list of duration, color,
                // control code (2 bytes each, 14 in total)
                const [duration, glow_color] = rom.read_from_snes_address(ship_underglow_addr + 6*i, '22');
                // The glow color appends at the final index (index 15)
                full_set.push([duration, [...base_palette, glow_color]]);
            });
        }

        function outro_ship(base_address) {
            // Skip the control codes
            base_address += 4;
            return this.read_sequence_of_timed_palettes(base_address, 16);
        }

        const suit = base[base_type];
        if (!suit)
            throw new Error(`Unknown palette type: ${base_type}`);

        if (has(suit, '_') && !isNil(suit_type))
            throw new Error(`Called for ${base_type} palette with suit type ${suit_type} when no suit type was expected`);

        const arg = suit[suit_type] || suit._;
        if (isUndefined(arg))
            throw new Error(`Called for ${base_type} palette with unknown suit type: ${suit_type}`);

        // Invoke with `call` to give access to `this`
        return suit.fn.call(this, arg);
    }

    read_nightvisor_colors() {
        return this.rom.read_from_snes_address(0x9BA3C6, '222');
    }

    read_static_palette(snes_address) {
        return [0, this.read_raw_palette(snes_address)];
    }

    read_sequence_of_timed_palettes(snes_address, num_palettes, { add_transparency = false }) {
        // Adding 0x24 skips over the duration dbyte, previous palette, and the control code each time
        const skip_amount = add_transparency ? 0x22 : 0x24;
        return map(range(num_palettes), i =>
            this.read_timed_palette(snes_address + skip_amount*i, { add_transparency }));
    }

    read_timed_palette(snes_address, { add_transparency = false }) {
        const duration = this.rom.read_from_snes_address(snes_address, 2);
        // Some palettes don't have transparent pixels already in there
        const palette = this.read_raw_palette(snes_address + (add_transparency ? 0 : 2));
        return [duration, palette];
    }

    read_raw_palette(snes_address) {
        return this.rom.read_from_snes_address(snes_address, repeat('2', 0x10));
    }

    // Go in and get the data that is by default loaded into the VRAM.
    // Except for stupid tile, this shouldn't be rendered as part of a
    // Samus pose unless something is glitched out (by this I mean a game
    // glitch, not a bug in my code) in which case the data here will
    // depend upon what kind of weapon Samus has equipped.
    read_default_vram_data(equipped_weapon = "standard") {
        // Main population is from data starting at D5200-D71FF LOROM
        // (populates from 0x00 on)
        // Note: grapple beam (e.g. $D0200 LOROM) can overwrite parts of row 2,
        // and Mode 7 rooms (e.g. $183A00 LOROM) can load "sprites" into the
        // last three rows. Rain can also go in row 0xD0.
        const dma_write_00 = this.rom.bulk_read_from_snes_address(0x9AD200, 0x2000);

        // Row 0x30 is populated with 8 tiles depending upon equipped weapon (0x30-0x37)
        const snes_addr = {
            regular: 0x9AF200,
            standard: 0x9AF200,
            charge: 0x9AF200,
            ice: 0x9AF400,
            wave: 0x9AF600,
            plasma: 0x9AF800,
            spazer: 0x9AFA00,
        }[equipped_weapon];
        const dma_write_30 = this.rom.bulk_read_from_snes_address(snes_addr, 0x100);

        return {
            [0x00]: dma_write_00,
            [0x30]: dma_write_30,
        };
    }

    // These are significant typos that reference bad palettes or similar,
    // and would raise assertion errors in any clean code.
    apply_bugfixes() {
        const { rom } = this;

        /*
        TM_193:
        DW $0001
        DB $F8, $01, $F8, $00, $30
        */
        // Last byte should be $28, like everything else
        rom.verified_write_to_snes_address(0x92BEC1, "11111",
            [0xF8,0x01,0xF8,0x00,0x30],
            [0xF8,0x01,0xF8,0x00,0x28]);

        /*
        TM_181:
        DW $0001
        DB $F8, $01, $F8, $00, $10
        */
        // Last byte should be $28, like everything else
        rom.verified_write_to_snes_address(0x92BC7C,"11111",
            [0xF8,0x01,0xF8,0x00,0x10],
            [0xF8,0x01,0xF8,0x00,0x28]);

        /*
        TM_0DA:
        DW $0004
        DB $FD, $01, $0F, $0A, $78
        */
        // Last byte should be $68, like everything else
        rom.verified_write_to_snes_address(0x92AEE3,"11111",
            [0xFD,0x01,0x0F,0x0A,0x78],
            [0xFD,0x01,0x0F,0x0A,0x68]);

        /*
        TM_06F:
        DW $0001
        DB $F8, $01, $F8, $00, $30
        */
        // Last byte should be $38, just like the other elevator poses
        rom.verified_write_to_snes_address(0x92A12E,"11111",
            [0xF8,0x01,0xF8,0x00,0x30],
            [0xF8,0x01,0xF8,0x00,0x38]);
    }

    // These are not mandatory for the animation viewer to work, but they are
    // general quality of life improvements that I recommend to make.
    apply_improvements() {
        const { rom } = this;

        /*
        ;E508
        AFP_T31:;Midair morphball facing right without springball
        AFP_T32:;Midair morphball facing left without springball
        */
        // This bug preventing left and right morphball from being different,
        // but now we fix this. Have to fix tilemaps too.
        rom.verified_write_to_snes_address(0x92D9B2, 2, 0xE508, 0xE530);
        rom.verified_write_to_snes_address(0x9292C7, 2, 0x0710, 0x071A); // upper tilemap
        rom.verified_write_to_snes_address(0x9294C1, 2, 0x0710, 0x071A); // lower tilemap

        /*
        ;$B361
        FD_6D:  ;Falling facing right, aiming upright
        FD_6E:  ;Falling facing left, aiming upleft
        FD_6F:  ;Falling facing right, aiming downright
        FD_70:  ;Falling facing left, aiming downleft
        DB $02, $F0, $10, $FE, $01
        */
        // The second byte here was probably supposed to be $10, just like the
        // animations above it.
        // $F0 is a terminator, and this is the only time that $F0 would ever
        // be invoked (also, there is a pose in this spot!)
        rom.verified_write_to_snes_address(0x91B361, "11111",
            [0x02,0xF0,0x10,0xFE,0x01],
            [0x02,0x10,0x10,0xFE,0x01]);

        /*
        ;C9DB
        XY_P00:     ;00:;Facing forward, ala Elevator pose (power suit)
        XY_P9B:     ;9B:;Facing forward, ala Elevator pose (Varia and/or Gravity Suit)
        DB $00, $02
        */
        // The second byte here is supposed to be 00, but because it is not,
        // the missile port is rendered behind Samus's left fist during
        // elevator pose.
        rom.verified_write_to_snes_address(0x90C9DB, "11", [0x00,0x02], [0x00,0x00]);

        // It is my intention to be as hands-off as possible with the
        // positioning of the cannon port onto the sprite, but the directly
        // downwards aiming ones are super broken.

        // Start by redirects to new XY lists
        //rom.verified_write_to_snes_address(0x90C80D, 2, 0xCAC5, 0xCAC5);
        rom.verified_write_to_snes_address(0x90C80F, 2, 0xCACB, 0xCB31);
        rom.verified_write_to_snes_address(0x90C839, 2, 0xCB31, 0xCAC5);
        rom.verified_write_to_snes_address(0x90C83B, 2, 0xCB37, 0xCB31);
        // New XY lists
        rom.verified_write_to_snes_address(0x90CAC5, "11111111",
            [0x04,0x01,0x00,0x0D,0x00,0x0D,0x05,0x01],
            [0x83,0x01,0x84,0x01,0x0B,0x01,0x00,0x0D]);
        rom.verified_write_to_snes_address(0x90CB31, "11111111",
            [0x04,0x01,0x00,0x09,0x00,0x09,0x05,0x01],
            [0x86,0x01,0x85,0x01,0xED,0x01,0xF7,0x0D]);

        // The application of the right-facing jump begin/jump land missile
        // port placements is inconsistent across the animations and in many
        // animations is omitted. These lines make this consistent by always
        // omitting it.
        rom.verified_write_to_snes_address(0x90CAD1, "11", [0x03,0x01], [0x00,0x00]);
        rom.verified_write_to_snes_address(0x90CBF9, "11", [0x03,0x01], [0x00,0x00]);
        rom.verified_write_to_snes_address(0x90CC05, "11", [0x03,0x01], [0x00,0x00]);

        /*
        ;CBA5
        XY_P49:     ;49:;Moonwalk, facing left
        DB $02, $01
        DB $F1, $FD, $F1, $FC, $F1, $FC, $F1, $FD, $F1, $FC, $F1, $FC

        ;CBB3
        XY_P4A:     ;4A:;Moonwalk, facing right
        DB $07, $01
        DB $07, $FD, $07, $FC, $07, $FC, $07, $FD, $07, $FC, $07, $FC
        */
        // In this case the cannon was actually placed onto
        // the gun port backwards...
        rom.verified_write_to_snes_address(0x90CBA5, repeat('1', 14),
            [0x02,0x01,0xF1,0xFD,0xF1,0xFC,0xF1,0xFC,0xF1,0xFD,0xF1,0xFC,0xF1,0xFC],
            [0x07,0x01,0xED,0xFD,0xED,0xFC,0xED,0xFC,0xED,0xFD,0xED,0xFC,0xED,0xFC]);
        rom.verified_write_to_snes_address(0x90CBB3, repeat('1', 14),
            [0x07,0x01,0x07,0xFD,0x07,0xFC,0x07,0xFC,0x07,0xFD,0x07,0xFC,0x07,0xFC],
            [0x02,0x01,0x0B,0xFD,0x0B,0xFC,0x0B,0xFC,0x0B,0xFD,0x0B,0xFC,0x0B,0xFC]);
    }
}