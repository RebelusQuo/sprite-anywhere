import Sprite from '../../sprite';
import Metroid3Rom from '../rom';
import { rom_import } from './rom_import';

export default class SamusSprite extends Sprite {
    name = 'Samus';

    constructor(content, sheet) {
        super(content, sheet);
    }

    import_from_rom(rom) {
        const game_rom = new Metroid3Rom(rom);
        this.all_canvas = rom_import(this, game_rom);
        this.master_palette = [...this.all_canvas["palette_block"].data];
    }
}
