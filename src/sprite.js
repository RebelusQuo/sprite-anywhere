import Rom from './rom';
import Sheet from './sheet';
import { nil_canvas } from './graphics';

import get from 'lodash/get';

export default class Sprite {
    metadata = {
        sprite: { name: '' },
        author: { name: '', short_name: '' },
    };

    constructor(content, sheet) {
        // Default to a scale factor of 1
        this.overview_scale_factor = get(sheet, 'formats.png.overview_scale_factor', 1);

        this.sheet = new Sheet(sheet.sheet_data);
        //this.load_animations()
        this.import_from_content(content, sheet);
    }

    import_from_content(content, sheet) {
        if (content instanceof Rom) {
            this.import_from_rom(content);
        }
        this.import_finalize();
    }

    import_finalize() {
        this.all_canvas['nil'] = nil_canvas;
    }

    async master_png_image() {
        return await this.sheet.export_all_canvas_to_png(this.all_canvas, this.master_palette);
    }
}
