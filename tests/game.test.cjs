const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];

function gameContext() {
  const requestedImages = [];
  class ImageStub {
    constructor() { this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; }
    set src(value) { this.url = value; requestedImages.push(value); }
    get src() { return this.url; }
  }
  const context2d = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  const elements = new Map();
  const makeElement = () => ({
    style: {}, innerHTML: '', textContent: '', dataset: {},
    addEventListener() {}, setPointerCapture() {},
    getContext: () => context2d,
    querySelectorAll(selector) {
      const attribute = selector === '[data-n]' ? 'data-n' : 'data-weapon';
      const re = new RegExp(`${attribute}="([^"]+)"`, 'g');
      return [...this.innerHTML.matchAll(re)].map(match => ({ dataset: attribute === 'data-n' ? { n: match[1] } : { weapon: match[1] } }));
    },
  });
  const document = { querySelector(selector) { if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); } };
  const window = { addEventListener() {} };
  const sandbox = { document, window, Image: ImageStub, innerWidth: 1000, innerHeight: 700, devicePixelRatio: 1,
    performance: { now: () => 1000 }, requestAnimationFrame() {}, console, Math };
  const context = vm.createContext(sandbox);
  for (const script of scripts) {
    const src = script[1].match(/\bsrc="([^"]+)"/);
    const code = src ? fs.readFileSync(path.join(root, src[1]), 'utf8') : script[2];
    new vm.Script(code, { filename: src ? src[1] : 'index.html inline script' }).runInContext(context);
  }
  return { context, requestedImages };
}
const run = (context, code) => vm.runInContext(code, context);

test('all game scripts parse and referenced images exist', () => {
  const { context, requestedImages } = gameContext();
  assert.ok(scripts.length >= 2);
  for (const image of requestedImages) assert.ok(fs.existsSync(path.join(root, image)), `Missing ${image}`);
  assert.equal(run(context, 'state'), 'menu');
  assert.equal(run(context, 'monsters.length'), 20);
});

test('sword hits multiple enemies once, within its displayed sector', () => {
  const { context } = gameContext();
  const result = run(context, `(() => {
    start('sword'); let targets=[];
    for (const [x,y] of [[50,0],[55,20],[55,-20],[-55,0]]) {
      const e=addEnemy('stone_golem'); e.x=x; e.y=y; targets.push(e);
    }
    p.action={aim:0}; fireWeapon();
    return {damage: targets.map(e=>e.maxhp-e.hp), visible:fx.some(f=>f.type==='swordArea'),
      edge:circleTouchesSword(94,0,3,0,0,0), outside:circleTouchesSword(96,0,3,0,0,0)};
  })()`);
  assert.deepEqual(Array.from(result.damage), [40, 40, 40, 0]);
  assert.equal(result.visible, true);
  assert.equal(result.edge, true);
  assert.equal(result.outside, false);
});

test('sword upgrades exclude multishot; ranged weapons retain it', () => {
  const { context } = gameContext();
  const result = run(context, `(() => {
    const candidates=upgrades.filter(u=>['power','speed','multi','vital'].includes(u.id));
    upgrades.splice(0,upgrades.length,...candidates);const oldRandom=Math.random;Math.random=()=>.5;
    start('sword');levelQueue=1;choose();let found=overlay.innerHTML.includes('다중 공격');
    start('crossbow');levelQueue=1;choose();let ranged=overlay.innerHTML.includes('다중 공격');Math.random=oldRandom;
    return {found,ranged};
  })()`);
  assert.equal(result.found, false);
  assert.equal(result.ranged, true);
});

test('experience, combinations, boss timing, and restart work', () => {
  const { context } = gameContext();
  const result = run(context, `(() => {
    start('sword'); attack=100;spawn=100;
    let g={x:120,y:0,value:1};gems.push(g);update(.05);let magnet=g.x<120;
    p.items.fire=p.items.ash=p.items.ring=true;
    const a=addEnemy('slime'),b=addEnemy('stone_golem');a.x=b.x=p.x;a.y=b.y=p.y;a.fire=3;hit(a,999);let fire=b.fire>0;
    start('sword');clock=TIMING.midBoss-.01;update(.05);let mid=boss4&&enemies.some(e=>e.type==='mini')&&regionAt(clock)==='perion';
    start('sword');clock=TIMING.finalBoss-.01;update(.05);let boss=enemies.find(e=>e.type==='boss');hit(boss,99999);let win=state==='win';
    startMenu();let restarted=state==='menu';
    return {magnet,fire,mid,win,restarted};
  })()`);
  for (const key of ['magnet', 'fire', 'mid', 'win', 'restarted']) assert.equal(result[key], true, key);
});
