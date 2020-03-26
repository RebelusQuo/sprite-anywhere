import get from 'lodash/get';

export default class Game {
    name = '';
    platform = 'snes';

    sheets = {};

    make_sprite_by_name(name, content) {
        const sheet = get(this.sheets, name);
        if (!sheet)
            throw new Error(`Unknown sprite ${name}`);

        const { Sprite } = sheet;
        return new Sprite(content, sheet);

        /*try:
            animationlib = importlib.import_module(f"{source_subpath}.animation")
            animation_assist = animationlib.AnimationEngine(resource_subpath, sprite)
        except ImportError:    #there was no sprite-specific animation library, so import the parent
            animationlib = importlib.import_module(f"source.animationlib")
            animation_assist = animationlib.AnimationEngineParent(resource_subpath, sprite)

        return sprite, animation_assist
        */
    }
}
