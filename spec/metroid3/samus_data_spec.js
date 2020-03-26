import chai from 'chai';
const should = chai.should();

import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import filter from 'lodash/filter';
import each from 'lodash/each';
import orderBy from 'lodash/orderBy';
import transform from 'lodash/transform';

import samus from '../../src/metroid3/samus/sheet.json';
import Sheet from '../../src/sheet';

describe('Samus sheet data', () => {

    it('has dimensions for all poses, thus no circular dependencies', () => {
        const images = new Sheet(samus).images;

        should.exist(images);
        images.should.be.an('array');
        each(images, image => image.should.have.property('dimensions'));
    });

    it('has the correct sheet layout', () => {
        const expected = require('./samus_layout.json');

        const layout = new Sheet(samus).layout;

        const actual = map(layout, x => map(x, 'name'));
        actual.should.deep.equal(expected);
    });

    it('has the correct usage association', () => {
        const expected = require('./samus_usage.json');

        const usage = new Sheet(samus).usage;

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
