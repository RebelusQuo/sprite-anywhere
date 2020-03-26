import chai from 'chai';
const expect = chai.expect;
const should = chai.should();

import each from 'lodash/each';
import find from 'lodash/find';
import reverse from 'lodash/reverse';
import shuffle from 'lodash/shuffle';

import { with_cases } from './spec_utils';

import { make_prototype_hierarchy } from '../src/util';

describe('Generating a prototype hierarchy', () => {

    context('works with', () => {

        with_cases({
            'a - b - c': [
                [node('a'), node('b', 'a'), node('c', 'b')],
                [['a', 'b'], ['b', 'c']],
            ],
            'a - b - c / a - d / b - e': [
                [node('a'), node('b', 'a'), node('c', 'b'), node('d', 'a'), node('e', 'b')],
                [['a', 'b'], ['a', 'd'], ['b', 'c'], ['b', 'e']],
            ],
        },
        (graph, [list, expected]) => it(`a chain ${graph}`, () => {
            spec(list, 'with original list');
            spec(reverse(list), 'with reversed list');
            spec(shuffle(list), 'with shuffled list');

            function spec(list, msg) {
                const [actual] = make_prototype_hierarchy(list);

                each(expected, ([parent, child]) => {
                    parent = find(actual, { name: parent });
                    child = find(actual, { name: child });

                    parent.should.equal(Object.getPrototypeOf(child), msg);
                });
            }
        }));

    });

    context('breaks with', () => {

        with_cases({
            'a - b x a':
                [node('a', 'b'), node('b', 'a')],
            'a - b x a / b - c':
                [node('a', 'b'), node('b', 'a'), node('c', 'b')],
            'a - b - c x a':
                [node('a', 'c'), node('b', 'a'), node('c', 'b')],
            'a - b - c x b':
                [node('a'), node('b', 'c'), node('c', 'b')],
        },
        (graph, list) => it(`a chain ${graph}`, () => {
            spec(list, 'the original list');
            spec(reverse(list), 'the reversed list');
            spec(shuffle(list), 'the shuffled list');

            function spec(list, msg) {
                const fn = () => make_prototype_hierarchy(list)
                expect(fn, msg).to.throw();
            }
        }));

    });

    function node(name, parent) {
        const x = { name, parent };
        if (!x.parent) delete x.parent;
        return x;
    }

});
