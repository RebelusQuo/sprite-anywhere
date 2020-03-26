import Sheet from '../../sheet';

import each from 'lodash/each';
import filter from 'lodash/filter';
import transform from 'lodash/transform';
import flatten from 'lodash/flatten';
import times from 'lodash/times';
import range from 'lodash/range';
import includes from 'lodash/includes';
import at from 'lodash/at';
import replace from 'lodash/replace';
import startsWith from 'lodash/startsWith';
import isString from 'lodash/isString';

import { _555_to_rgba, canvas_from_raw_data } from '../../graphics';

export function rom_import(sprite, game_rom) {
    const { sheet } = sprite;

    // For every image referenced explicitly in the sheet
    return transform(flatten(sheet.layout), (canvas, image) => {
        // Import a representative animation and pose
        const [_animation, pose] = image.usage[0];
        // Convert from hex if needed
        const animation = startsWith(_animation, '0x') ? parseInt(_animation) : _animation;

        const bounding_box = Sheet.raw_bounding_box(image);
        const import_table = image['import table'];
        if (import_table && !includes(['upper', 'lower'], import_table))
            throw new Error(`Tried to import a pose ${image.name} from a specific table, but the table value was invalid: ${import_table}`);
        
        const table = import_table
            ? { upper: false, lower: false, [import_table]: true }
            : { upper: true, lower: true };

        canvas[image.name] = read_sprite_pose(sprite, game_rom, animation, pose, bounding_box, table);
    },
    {});
}

function read_sprite_pose(sprite, rom, animation, pose, bounding_box, table) {
    // Todo: duration unused variable from pose data
    let tilemaps, dma_data;
    if (isString(animation)) {
        switch (animation) {
            case "death_left":
            case "death_right":
                const facing = replace(animation, /^death_/, '');
                [tilemaps, dma_data,] = rom.read_death_pose_data(pose, facing);
                // Trim out the suit pieces. The body does not have palette 0b100
                if (!table.upper)
                    tilemaps = filter(tilemaps, tilemap => tilemap.p !== 0b100);
                // Trim out the body. The suit pieces have palette 0b100
                if (!table.lower)
                    tilemaps = filter(tilemaps, tilemap => tilemap.p === 0b100);
                break;
            case "file_select":
                tilemaps = rom.make_file_select_tilemaps(pose);
                dma_data = rom.read_file_select_dma_data();
                break;
            case "gun":
                // Use highest significant decimal digit as the level of opening, and lowest as direction
                const direction = pose % 10;
                const level = (pose - direction) / 10;
                const [tilemap, gun_tile, gun_dma] = rom.read_minimal_gun_data(direction, level);
                tilemaps = [tilemap];
                dma_data = { [gun_tile]: gun_dma };
                break;
            case "palette_block":
                // No need to make tilemaps or anything, just make the image and then early exit
                const palette_block = flatten([
                    _555_to_rgba(rom.read_palette("standard","power")[0][1].slice(-15)),
                    _555_to_rgba(rom.read_palette("standard","varia")[0][1].slice(-15)),
                    _555_to_rgba(rom.read_palette("standard","gravity")[0][1].slice(-15)),
                    _555_to_rgba(rom.read_palette("death_flesh")[0][1].slice(-15)),
                    _555_to_rgba(rom.read_palette("crystal_flash")[0][1].slice(-15)),
                    _555_to_rgba(rom.read_palette("file_select")[0][1].slice(-15)),
                    times(1, () => [0, 0, 0, 0]),
                    _555_to_rgba(rom.read_nightvisor_colors()),
                    times(7, () => [0, 0, 0, 0]),
                    // 7 is when the underglow is brightest
                    _555_to_rgba(at(rom.read_palette("ship")[7][1], 1, 9, 15)),
                    times(1, () => [0, 0, 0, 0]),
                ]);
                return { w: 15, h: 7, rgba: true, data: palette_block };
            default:
                throw new Error(`Unknown animation: ${animation}`);
        }
    }
    else
        // Todo: do full port opening animation
        [tilemaps, dma_data,] = rom.read_dma_pose_data(animation, pose, table);

    // There is stuff in VRAM by default, so populate this and then overwrite
    // with the dma_data
    const Tilesize = 0x20;
    const collected_data = {};
    add_flattened_tiles(collected_data, rom.read_default_vram_data());
    add_flattened_tiles(collected_data, dma_data);

    function add_flattened_tiles(aggregate, data) {
        return transform(data,
            (vram_data, tile_data, index) => {
                index = index >> 0;
                each(range(0, tile_data.length, Tilesize), (offset, i) =>
                    vram_data[index+i] = tile_data.slice(offset, offset + Tilesize)
                )
            },
            aggregate
        );
    }

    return canvas_from_raw_data(tilemaps, collected_data, bounding_box);
}
