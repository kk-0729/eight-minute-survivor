const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', 'src');
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
      const attribute = selector === '[data-n]' ? 'data-n' : selector === '[data-element]' ? 'data-element' : 'data-weapon';
      const re = new RegExp(`${attribute}="([^"]+)"`, 'g');
      return [...this.innerHTML.matchAll(re)].map(match => ({ dataset: attribute === 'data-n' ? { n: match[1] } : attribute === 'data-element' ? { element:match[1] } : { weapon: match[1] } }));
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
    return {damage: targets.map(e=>e.maxhp-e.hp), expected:calculateDirectDamage(BASE_ATTACK,'physical',1,targets[0].defense,0,1.5,1).damage, visible:fx.some(f=>f.type==='swordArea'),
      edge:circleTouchesSword(94,0,3,0,0,0), outside:circleTouchesSword(96,0,3,0,0,0)};
  })()`);
  for(const actual of Array.from(result.damage).slice(0,3)) assert.ok(Math.abs(actual-result.expected)<1e-9);
  assert.equal(result.damage[3], 0);
  assert.equal(result.visible, true);
  assert.equal(result.edge, true);
  assert.equal(result.outside, false);
});

test('damage, defense clamp, coefficients, and critical apply once', () => {
  const { context } = gameContext();
  const r=run(context, `(() => ({zero:calculateDirectDamage(BASE_ATTACK,'fire',1,0,0,1.5,1).damage,
    staff:calculateDirectDamage(BASE_ATTACK,'ice',.7,0,0,1.5,1).damage,
    critical:calculateDirectDamage(BASE_ATTACK,'lightning',1,0,1,1.5,0).damage,
    high:calculateDirectDamage(BASE_ATTACK,'physical',1,1e12,0,1.5,1).damage,
    negative: defenseReduction(-10)}))()`);
  assert.equal(r.zero,20);assert.equal(r.staff,14);assert.equal(r.critical,30);
  assert.ok(Math.abs(r.high-2)<1e-9);assert.equal(r.negative,0);
});

test('ice refreshes for two seconds without stacking', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {let e={};applyIce(e);tickStatuses(e,1,()=>{});applyIce(e);
    let refreshed=e.iceRemaining;tickStatuses(e,1.99,()=>{});let active=e.iceRemaining>0;
    tickStatuses(e,.01,()=>{});return {refreshed,active,finished:e.iceRemaining===0};})()`);
  assert.equal(r.refreshed,2);assert.equal(r.active,true);assert.equal(r.finished,true);
});

test('ice actually slows movement and returns to normal', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {function travel(ice){start('sword');attack=100;spawn=100;
    let e=addEnemy('slime');e.x=140;e.y=0;e.speed=100;if(ice)applyIce(e);update(.5);return 140-e.x}
    return {normal:travel(false),slowed:travel(true)};})()`);
  assert.ok(Math.abs(r.normal-50)<1e-6);assert.ok(Math.abs(r.slowed-40)<1e-6);
});

test('slow expires partway through a simulation step', () => {
  const { context }=gameContext();
  const distance=run(context, `(() => {start('sword');attack=100;spawn=100;
    steerEnemy=(e,a)=>a;resolveTerrain=()=>{};let e=addEnemy('slime');e.x=500;e.y=0;e.speed=100;
    applyIce(e);update(3);return 500-e.x;})()`);
  assert.ok(Math.abs(distance-260)<1e-6);
});

test('burn deals exactly three ticks and refresh replaces rather than stacks', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {let e={},damage=[];applyBurn(e,30);tickStatuses(e,3,(_,v)=>damage.push(v));
    let stopped=!e.burn;applyBurn(e,30);tickStatuses(e,.8,()=>{});applyBurn(e,40);let fresh=[];
    tickStatuses(e,3,(_,v)=>fresh.push(v));return {damage,stopped,fresh,ended:!e.burn};})()`);
  assert.deepEqual(Array.from(r.damage),[3,3,3]);assert.equal(r.stopped,true);
  assert.deepEqual(Array.from(r.fresh),[4,4,4]);assert.equal(r.ended,true);
});

test('repeated fast fire hits do not postpone burn indefinitely', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {let e={},ticks=[];applyBurn(e,30);
    for(let i=0;i<10;i++){tickStatuses(e,.2,(_,v)=>ticks.push(v));applyBurn(e,30)}
    return ticks;})()`);
  assert.deepEqual(Array.from(r),[3,3]);
});

test('direct hits actually apply selected fire and ice', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {start('sword','fire');let e=addEnemy('stone_golem');e.hp=500;e.defense=0;
    p.attacks.fire=30;weaponHit(e,'sword','fire');let ticks=[];tickStatuses(e,3,(target,v)=>ticks.push(v));
    start('sword','ice');let chilled=addEnemy('stone_golem');chilled.hp=500;chilled.defense=0;weaponHit(chilled,'sword','ice');
    return {hp:e.hp,ticks,ice:chilled.iceRemaining};})()`);
  assert.equal(r.hp,470);assert.deepEqual(Array.from(r.ticks),[3,3,3]);assert.equal(r.ice,2);
});

test('lightning hits one other target, has a per-weapon cooldown, and cannot recurse', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {start('crossbow','lightning');let enemiesHere=[];
    for(const x of [50,65,85]){let e=addEnemy('stone_golem');e.x=x;e.y=0;e.hp=e.maxhp=500;e.defense=0;enemiesHere.push(e)}
    weaponHit(enemiesHere[0],'crossbow','lightning');weaponHit(enemiesHere[0],'crossbow','lightning');
    let first=enemiesHere.map(e=>500-e.hp);clock=1;weaponHit(enemiesHere[0],'crossbow','lightning');
    return {first,after:enemiesHere.map(e=>500-e.hp),lines:fx.filter(f=>f.type==='line').length};})()`);
  assert.deepEqual(Array.from(r.first),[40,8,0]);assert.deepEqual(Array.from(r.after),[60,16,0]);assert.equal(r.lines,2);
});

test('weapon cadence, projectile data and representative time to kill', (t) => {
  const { context }=gameContext();
  const r=run(context, `(() => {let out={};for(const weapon of ['sword','crossbow','staff']){
    start(weapon);spawn=100;let e=addEnemy('slime');e.x=70;e.y=0;e.hp=e.maxhp=40;e.defense=0;e.speed=0;
    while(clock<5&&!e.dead)update(.01);out[weapon]={dead:e.dead,time:clock};}
    return {out,stats:WEAPON_STATS};})()`);
  assert.equal(r.stats.sword.coefficient,1);assert.equal(r.stats.crossbow.interval,.33);assert.equal(r.stats.staff.coefficient,.7);
  for(const weapon of ['sword','crossbow','staff'])assert.equal(r.out[weapon].dead,true);
  assert.ok(r.out.crossbow.time<r.out.sword.time);assert.ok(r.out.staff.time>r.out.sword.time);
  t.diagnostic(`40 HP / 0 DEF: sword ${r.out.sword.time.toFixed(2)}s, crossbow ${r.out.crossbow.time.toFixed(2)}s, staff ${r.out.staff.time.toFixed(2)}s`);
});

test('attack speed upgrade increases the rate of actual projectiles', () => {
  const { context }=gameContext();
  const r=run(context, `(() => {function count(cool){start('crossbow');p.cool=cool;spawn=100;
    let e=addEnemy('stone_golem');e.x=450;e.y=0;e.speed=0;for(let i=0;i<60;i++)update(.01);return shots.length}
    return {normal:count(1),faster:count(.5)};})()`);
  assert.ok(r.faster>r.normal,`normal ${r.normal}, faster ${r.faster}`);
});

test('unupgraded weapons can defeat the final boss in a controlled TTK trial', (t) => {
  const { context }=gameContext();
  const r=run(context, `(() => {let out={};for(const weapon of ['sword','crossbow','staff']){
    start(weapon);spawn=1000;p.hp=1e6;let boss=addEnemy('boss');boss.x=70;boss.y=0;boss.speed=0;boss.shoot=1000;boss.dmg=0;
    while(clock<200&&!boss.dead)update(.01);out[weapon]={dead:boss.dead,time:clock};}return out;})()`);
  for(const weapon of ['sword','crossbow','staff'])assert.equal(r[weapon].dead,true,weapon);
  t.diagnostic(`4000 HP / 12 DEF, no upgrades: sword ${r.sword.time.toFixed(1)}s, crossbow ${r.crossbow.time.toFixed(1)}s, staff ${r.staff.time.toFixed(1)}s`);
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
