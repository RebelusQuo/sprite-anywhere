import Game from '../game';

import * as Samus from './samus/';

export default class Metroid3Game extends Game {
    name = 'Super Metroid';

    sheets = {
        Samus: {
            type: 'Player Character Sprite',
            ...Samus,
            format: {
                png: {
                    dimensions: [876,2543]
                }
            }
        }
    };

    make_player_sprite(content) {
        return this.make_sprite_by_name('Samus', content);
    }
    
}
