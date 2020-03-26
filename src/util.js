import map from 'lodash/map';
import each from 'lodash/each';
import some from 'lodash/some';
import transform from 'lodash/transform';
import get from 'lodash/get';
import set from 'lodash/set';
import update from 'lodash/update';
import concat from 'lodash/concat';
import assign from 'lodash/assign';
import MapCache from 'lodash/_MapCache';
import wrap from 'lodash/wrap';
import _min from 'lodash/min';
import _max from 'lodash/max';
import isArray from 'lodash/isArray';

// A cache is a function wrapper that stores a value for subsequent calls from
// a cache value function. The cache is stored on the wrapped function.
export function cache(cache_fn, fn) {
    return function(...args) {
        const data = fn._cache || (fn._cache = new MapCache());
        if (!data.has(fn))
            data.set(fn, cache_fn.call(this, ...args));
        return fn.call(this, ...args, data.get(fn));
    };
}

// Expects a list of items, where each item has at least two string properties
// `name` and `parent`, where the later indicate a prototype dependency on the
// later.
// Note: Using setPrototypeOf potentially sets up very slow object property
// lookup. We're using this for now, Object.create is the alternative.
export function make_prototype_hierarchy(items) {
    const seen = {};
    const lookup = transform(items, (a, item) => a[item.name] = item, {});

    each(items, item => {
        const { name: node, parent } = item;
        if (parent) {
            const ancestors = get(seen, [parent, 'ancestor'], {});

            // - verify that the parent does not have the node as an ancestor
            // - verify that the node does not have the parent as a decendant
            const parent_is_decendant = (child) => child === parent || some(decend(child));
            if (ancestors[node] || some(decend(node, parent_is_decendant)))
                throw new Error(`Detected a circular prototype dependency between nodes ${node} and ${parent}`);

            // - set the node's prototype to be the parent
            Object.setPrototypeOf(lookup[node], lookup[parent]);
            
            // - tell the parent it has a new child
            // - tell every decendant about this node's ancestors
            // - remember the ancestors for the node
            update(seen, [parent, 'child'], v => concat(v || [], node));
            decend(node, child => update(seen, [child, 'ancestor'], v => assign(v, ancestors)));
            set(seen, [node, 'ancestor'], { parent, ...ancestors });
        }
    });

    function decend(node, fn) {
        return map(get(seen, [node, 'children'], []), child => fn(child));
    }

    return [items, lookup];
}

export function min(...args) {
    args = isArray(args[0]) ? args[0] : args;
    return _min(args);
}

export function max(...args) {
    args = isArray(args[0]) ? args[0] : args;
    return _max(args);
}

export function hex(x, pad = 2) {
    return `$${x.toString(16).toUpperCase().padStart(pad, '0')}`;
}

export function le_dw_value(bytes) {
    return bytes[0] | (bytes[1] << 8);
}

export function le_dl_value(bytes) {
    return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16);
}

export function le_dd_value(bytes) {
    return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
}

export function le_dw_bytes(value) {
    return [value & 0xFF, (value >>> 8) & 0xFF];
}

export function le_dl_bytes(value) {
    return [value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF];
}

export function le_dd_bytes(value) {
    return [value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF];
}
