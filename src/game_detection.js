import transform from 'lodash/transform';
import some from 'lodash/some';
import includes from 'lodash/includes';
import startsWith from 'lodash/startsWith';

import { readAsArrayBuffer } from './file';
import Rom from './rom';

import game_titles from './meta/game_titles.json';

import * as Metroid3 from './metroid3/';

const games = {
    metroid3: Metroid3.Game,
};

export async function detect(file) {
    let game, sprite;
    const extension = file_extension(file.name);
    
    if (includes(['.sfc', '.smc'], extension)) {
        const [game_names, rom] = await detect_games_from_rom(file);
        // Todo: just pick the first game for now
        const selected_game = game_names[0];
        /*selected_game = None

        selected_game = gui_common.create_chooser(game_names)

        if not selected_game:
            selected_game = random.choice(game_names)
        */

        const Game = games[selected_game];
        game = new Game();
        // Todo: skipped `animation_assist`
        sprite = game.make_player_sprite(rom);
    }
    else
        throw new Error(`Cannot recognize the type of file from its filename: ${file.name}`);

    return [game, sprite];
}

function file_extension(filename) {
    const file_extension_pattern = /\.[^\.]+$/;
    const match = filename.match(file_extension_pattern);
    return match ? match[0] : '';
}

async function detect_games_from_rom(file) {
    Rom.verify_file_size(file);
    const content = await readAsArrayBuffer(file);
    const rom = new Rom(content, file.size);

    const rom_title = rom.game_title();

    const games = transform(game_titles, (games, { game, titles }) => {
        if (some(titles, (title) => startsWith(rom_title, title)))
            games.push(game);
    });

    if (games.length === 0)
        console.log(`Could not identify the game of the ROM from its header title: ${rom_title}`);

    return [games, rom];
}
