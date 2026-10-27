# Image sources

The prototype uses MapleStory character, monster, and boss artwork obtained from
[MapleStory Wiki](https://maplestorywiki.net/). The artwork belongs to its
respective rights holders, including Nexon. Its inclusion here does not grant
permission for redistribution or commercial use.

- Characters: [Ren](https://maplestorywiki.net/w/Ren), [Bow Master](https://maplestorywiki.net/w/Bow_Master), [Evan](https://maplestorywiki.net/w/Evan).
- Bosses: [Guard Captain Darknell](https://maplestorywiki.net/w/Darknell/Monster), [Limbo](https://maplestorywiki.net/w/Limbo/Monster).
- Field monsters: images are named after the corresponding English wiki article in `dist/assets/`.

Boss attack patterns are simplified adaptations for this top-down prototype.

## Generated environment assets

Generated with the built-in image generation tool from the user's screenshots.
The prompts requested top-down, seamless Henesys-style grass and Perion-style
sandstone ground, plus isolated transparent sprites of a broadleaf tree and a
Perion-style sandstone outcrop. They are stored in `dist/assets/` as
`henesys-ground.png`, `perion-ground.png`, `henesys-tree.png`, and
`perion-rock.png`.

The in-game 3D characters are original procedural interpretations, not extracted
MapleStory character models. Three.js 0.160.1 is included under the MIT license;
see `THREE-LICENSE.txt`.
