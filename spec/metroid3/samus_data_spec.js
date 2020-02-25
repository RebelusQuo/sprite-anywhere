import chai from 'chai';
chai.should();

import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import orderBy from 'lodash/orderBy';
import transform from 'lodash/transform';

import samus from '../../src/metroid3/samus.json';

describe('Samus data structure', () => {

    it('has the correct sheet layout', () => {
        const expected = require('./samus_layout.json');

        let layout = orderBy(samus.images, ['layout[0]', 'layout[1]']);
        layout = groupBy(layout, 'layout[0]');
        layout = transform(layout, (a, v, k) => a[k] = v, []);

        const actual = map(layout, x => map(x, 'name'));
        actual.should.deep.equal(expected);
    });

    it('has the correct usage association', () => {
        const expected = require('./samus_usage.json');

        const usage = transform(samus.images, (a, image) => {
            for (const [anim, pose] of image.usage) {
                const poses = a[anim] || (a[anim] = {});
                const images = poses[pose] || (poses[pose] = []);
                images.push(image);
            }
        }, {});

        const actual = mapValues(usage, x => mapValues(x, y => map(y, 'name')));
        actual.should.deep.equal(expected);
    });

    it('has the correct dma bank sequence', () => {
        const expected = require('./samus_dma.json');

        let dma = filter(samus.images, 'dma');
        dma = orderBy(dma, ['dma[0]', 'dma[1]']);

        const actual = map(dma, 'name');
        actual.should.deep.equal(expected);
    });

});
