import map from 'lodash/map';
import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import transform from 'lodash/transform';
import zip from 'lodash/zip';
import zipWith from 'lodash/zipWith';
import has from 'lodash/has';
import join from 'lodash/join';
import sumBy from 'lodash/sumBy';
import isEmpty from 'lodash/isEmpty';

import {
    nil_canvas,
    transparent_canvas,
    apply_palette,
    image_data_from_canvas,
} from './graphics';

import { min, max, make_prototype_hierarchy } from './util';

const { abs } = Math;

import { saveAs } from 'file-saver';

export default class Sheet {
    constructor(sheet) {
        this.border_size = sheet.border_size;
        this.border_color = `rgba(${join(sheet.border_color)},1)`;

        [this.images, this.lookup] = make_prototype_hierarchy(sheet.images);
        this.layout = this.construct_layout(this.images);
        this.usage = this.construct_usage(this.images);
    }

    construct_layout(images) {
        let layout;
        layout = orderBy(images, ['layout[0]', 'layout[1]']);
        layout = groupBy(layout, 'layout[0]');
        return transform(layout, (a, v, k) => a[k] = v, []);
    }

    construct_usage(images) {
        return transform(images, (a, image) => {
            for (const [animation, pose] of image.usage) {
                const poses = a[animation] || (a[animation] = {});
                const images = poses[pose] || (poses[pose] = []);
                images.push(image);
            }
        }, {});
    }

    async export_all_canvas_to_png(all_canvas, master_palette) {
        const bitmap_row = [];
        for (const image_row of this.layout) {
            const entries = [];
            for (const image of image_row) {
                const { name, shift = 0 } = image;
                let canvas = all_canvas[name];

                const [bounds, dimensions] = Sheet.scaled_dimensions(image);
                const [x_min, y_min, x_max, y_max] = bounds;

                if (!canvas) {
                    // There was no image there to grab, so make a blank image
                    canvas = transparent_canvas(x_max-x_min, y_max-y_min);
                }
                else {
                    const palette_range = image['palette range'];
                    const palette = palette_range
                        ? master_palette.slice(palette_range[0], palette_range[1])
                        : [];
                    canvas = apply_palette(canvas, palette);
                }

                const image_data = image_data_from_canvas(canvas);
                const bitmap = await Sheet.make_bitmap(image_data, image.scale);
                const [framed_bitmap, y_origin] = await this.add_border(bitmap, image, bounds, dimensions);

                // Add any vertical shift to line up better in the sprite sheet
                entries.push([framed_bitmap, y_origin - shift]);
            }

            bitmap_row.push(await this.make_horizontal_collage(entries));
        }

        return await this.make_vertical_collage(bitmap_row);
    }

    // Add a border, including possible spacing, to the bitmap by painting
    // onto a bigger canvas. Also return the y origin.
    async add_border(bitmap, image, bounds, dimensions) {
        const { border_color, border_size } = this;
        // The spacing property default to zero, we don't access the prototype
        const spacing = has(image, 'spacing') ? image.spacing : 0;
        const [x_min, y_min, x_max, y_max] = bounds;
        
        // Set up a border colored canvas with border and spacing
        let { width, height } = bitmap;
        width += border_size*2 + abs(spacing);
        height += border_size*2;

        const ctx = Sheet.prepare_html_canvas_context(width, height);
        ctx.globalCompositeOperation = 'copy';

        ctx.fillStyle = border_color;
        ctx.fillRect(0, 0, width, height);

        // Find the origin relative to border and spacing
        const x_origin = border_size - x_min - min(spacing, 0);
        const y_origin = border_size - y_min;
        ctx.translate(x_origin, y_origin);

        // Make a transparent clip region for the bitmap
        ctx.beginPath();
        for (const [x0, y0, x1, y1] of dimensions) {
            ctx.rect(x0, y0, x1-x0, y1-y0);
        }
        ctx.clip();
        
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fill();

        // Draw the image within the clip region
        ctx.drawImage(bitmap, x_min, y_min);

        bitmap = await Sheet.bitmap_from_html_canvas();

        return [bitmap, y_origin];
    }

    async make_horizontal_collage(row) {
        const { border_color } = this;
        const y_min = min(map(row, ([,y_origin]) => -y_origin));
        const y_max = max(map(row, ([{ height },y_origin]) => height-y_origin));
        const width = sumBy(row, ([{ width }]) => width);
        const height = y_max - y_min;

        const ctx = Sheet.prepare_html_canvas_context(width, height);
        // Compositions are silly with drawImage. Drawing an image paints
        // transparency all over so we have to draw within a clip region.
        // Todo: is there a better operation one can use so that this whole clip region thing can be avoided?
        ctx.globalCompositeOperation = 'copy';

        ctx.fillStyle = border_color;
        ctx.fillRect(0, 0, width, height);

        let x = 0;
        for (const [bitmap, y_origin] of row) {
            const y = -(y_min + y_origin);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, bitmap.width, bitmap.height);
            ctx.clip();
            ctx.drawImage(bitmap, x, y);
            ctx.restore();
            x += bitmap.width;
        }

        return await Sheet.bitmap_from_html_canvas();
    }

    async make_vertical_collage(bitmaps) {
        const width = max(map(bitmaps, 'width'));
        const height = sumBy(bitmaps, 'height');

        const ctx = Sheet.prepare_html_canvas_context(width, height);
        ctx.clearRect(0, 0, width, height);

        let y = 0;
        for (const bitmap of bitmaps) {
            ctx.drawImage(bitmap, (width - bitmap.width) >>> 1, y);
            y += bitmap.height;
        }

        return await Sheet.bitmap_from_html_canvas();
    }

    static async make_bitmap(image_data, scale) {
        const { width, height } = image_data;
        return await createImageBitmap(image_data, scale
            ? { resizeWidth: width*scale,
                resizeHeight: height*scale,
                resizeQuality: 'pixelated' }
            : {}
        );
    }

    static prepare_html_canvas_context(width, height) {
        const canvas = Sheet._canvas || (Sheet._canvas = document.createElement('canvas'));
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    static async bitmap_from_html_canvas() {
        return await createImageBitmap(Sheet._canvas);
    }

    static scaled_dimensions(image) {
        let { dimensions: primary, 'dimensions+': secondary = [] } = image;
        const { scale } = image;
        if (scale) {
            primary = map(primary, v => v * scale);
            secondary = map(secondary, dims => map(dims, v => v * scale));
        }
        return [Sheet.bounding_box(primary, secondary), [primary, ...secondary]];
    }

    static raw_bounding_box(image) {
        return Sheet.bounding_box(image.dimensions, image['dimensions+'] || []);
    }

    static bounding_box(primary, secondary) {
        if (isEmpty(secondary))
            return primary;

        const [x0, y0, x1, y1] = zip(primary, ...secondary);
        return [min(x0), min(y0), max(x1), max(y1)];
    }

}
