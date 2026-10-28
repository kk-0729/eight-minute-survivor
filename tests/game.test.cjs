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
    staff:calculateDirectDamage(BASE_ATTACK,'ice',.8,0,0,1.5,1).damage,
    critical:calculateDirectDamage(BASE_ATTACK,'lightning',1,0,1,1.5,0).damage,
    high:calculateDirectDamage(BASE_ATTACK,'physical',1,1e12,0,1.5,1).damage,
    negative: defenseReduction(-10)}))()`);
  assert.equal(r.zero,20);assert.equal(r.staff,16);assert.equal(r.critical,30);
  assert.ok(Math.abs(r.high-2)<1e-9);assert.equal(r.negative,0);
});

test('first two minutes: normal enemies take one hit and strongest takes two with every weapon', () => {
  const {context}=gameContext();
  const result=run(context,`(() => {const out={};for(const weapon of ['sword','crossbow','staff']) {
    start(weapon);out[weapon]=monsters.filter(m=>m[2]===0).map(m=>{
      const e=addEnemy(m[0]),hp=e.hp,defense=e.defense;
      const damage=calculateDirectDamage(BASE_ATTACK,'physical',WEAPON_STATS[weapon].coefficient,defense,0,1.5,1).damage;
      return {type:m[0],hp,defense,hits:Math.ceil(hp/damage)};
    });
  }return out})()`);
  for(const entries of Object.values(result)) {
    assert.deepEqual(Array.from(entries, e=>e.hits),[1,1,1,1,2]);
    assert.ok(entries.every(e=>e.defense===0));
  }
});

test('each level grants +5% base attack; element card adds exactly +1', () => {
  const {context}=gameContext();
  const r=run(context,`(() => {
    start('sword','fire'); const attr=upgrades.find(u=>u.id==='elemental');
    const initial=levelAttack(p,'fire');p.lv=18;
    const at18=levelAttack(p,'fire');for(let i=0;i<4;i++)attr.apply();
    return {initial,at18,after:levelAttack(p,'fire'),stacks:p.elementalStacks,hasOld:upgrades.some(u=>u.id==='attack')};
  })()`);
  assert.equal(r.initial,20);assert.equal(r.at18,37);
  assert.equal(r.after,41);assert.equal(r.stacks,4);assert.equal(r.hasOld,false);
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
  assert.ok(Math.abs(r.first[0]-26.4)<1e-8);assert.ok(Math.abs(r.first[1]-5.28)<1e-8);assert.equal(r.first[2],0);
  assert.ok(Math.abs(r.after[0]-39.6)<1e-8);assert.ok(Math.abs(r.after[1]-10.56)<1e-8);assert.equal(r.lines,2);
});

test('weapon cadence, projectile data and representative time to kill', (t) => {
  const { context }=gameContext();
  const r=run(context, `(() => {let out={};for(const weapon of ['sword','crossbow','staff']){
    start(weapon);spawn=100;let e=addEnemy('slime');e.x=70;e.y=0;e.hp=e.maxhp=40;e.defense=0;e.speed=0;
    while(clock<5&&!e.dead)update(.01);out[weapon]={dead:e.dead,time:clock};}
    return {out,stats:WEAPON_STATS};})()`);
  assert.equal(r.stats.sword.coefficient,1);assert.equal(r.stats.crossbow.interval,.33);assert.equal(r.stats.staff.coefficient,.8);
  for(const weapon of ['sword','crossbow','staff'])assert.equal(r.out[weapon].dead,true);
  assert.ok(r.out.crossbow.time>0);assert.ok(r.out.staff.time>0);
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
  t.diagnostic(`4000 HP / 50 DEF, no upgrades: sword ${r.sword.time.toFixed(1)}s, crossbow ${r.crossbow.time.toFixed(1)}s, staff ${r.staff.time.toFixed(1)}s`);
});

test('sword upgrades exclude multishot; ranged weapons retain it', () => {
  const { context } = gameContext();
  const result = run(context, `(() => {
    const candidates=upgrades.filter(u=>['elemental','speed','multi','vital'].includes(u.id));
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

test('base DPS is equal and all weapons use the same +1 element attack cards', () => {
  const {context}=gameContext();
  const r=run(context,`(() => {
    const base=Object.fromEntries(Object.entries(WEAPON_STATS).map(([w,v])=>[w,BASE_ATTACK.fire*v.coefficient/v.interval]));
    const after=Object.fromEntries(Object.entries(WEAPON_STATS).map(([w,v])=>[w,41*v.coefficient/v.interval]));
    start('staff','fire'); p.lv=18;p.elementalStacks=4;
    return {base,after,staffDirect:levelAttack(p,'fire')*WEAPON_STATS.staff.coefficient};
  })()`);
  for(const v of Object.values(r.base)) assert.ok(Math.abs(v-40)<1e-8);
  for(const v of Object.values(r.after)) assert.ok(Math.abs(v-82)<1e-8);
  assert.ok(Math.abs(r.staffDirect-32.8)<1e-8);
});

test('level-up excludes upgrades from other elements and physical selection in menu', () => {
  const {context}=gameContext();
  const r=run(context,`(() => {
    const choices={};
    for(const el of ['fire','ice','lightning']){
      start('sword',el);levelQueue=1;choose();
      const allowed=upgrades.filter(u=> (u.id!=='elemental'||p.element!=='physical')&&(!['fire','ash','ring'].includes(u.id)||p.element==='fire')&&(!['shock','chain','storm'].includes(u.id)||p.element==='lightning'));
      choices[el]={allowed:allowed.map(u=>u.id),html:overlay.innerHTML};
    }
    chooseElement('staff');return {choices,menu:overlay.innerHTML};
  })()`);
  assert.ok(!r.choices.fire.allowed.includes('shock'));
  assert.ok(!r.choices.lightning.allowed.includes('fire'));
  assert.ok(!r.choices.ice.allowed.includes('fire')&&!r.choices.ice.allowed.includes('shock'));
  assert.ok(!r.menu.includes('data-element="physical"'));
});

test('route selection opens at level 3 and attribute +1 is always offered',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','ice');p.lv=3;levelQueue=1;choose();
   const routeMenu=state==='route'&&overlay.innerHTML.includes('영원한 겨울')&&overlay.innerHTML.includes('빙하의 무장');
   p.route='A';state='playing';choose();
   const attrCard=overlay.innerHTML.includes('속성 공격력 +1');
   return {routeMenu,attrCard,remaining:levelQueue};
 })()`);
 assert.equal(r.routeMenu,true);assert.equal(r.attrCard,true);assert.equal(r.remaining,0);
});

test('ranged shots retain target coordinates without homing',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('crossbow','lightning');spawn=1000;attack=1000;
   const target=addEnemy('stone_golem');target.x=200;target.y=0;target.speed=0;
   p.action={target:{x:200,y:0}};fireWeapon();p.action=null;
   const s=shots[0],oldVx=s.vx,oldVy=s.vy;
   target.x=0;target.y=300;update(.05);
   return {vx:oldVx,vy:oldVy,afterX:s.vx,afterY:s.vy,shootX:s.x,shootY:s.y};
 })()`);
 assert.ok(r.vx>0);assert.ok(Math.abs(r.vy)<1e-8);
 assert.equal(r.afterX,r.vx);assert.equal(r.afterY,r.vy);assert.ok(Math.abs(r.shootY)<1e-8);
});

test('18 completed build boss fights show ordered TTK targets', (t)=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   const out=[];
   for(const el of ['fire','ice','lightning'])for(const route of ['A','B'])for(const weapon of ['sword','crossbow','staff']){
     start(weapon,el);p.lv=18;p.elementalStacks=4;p.route=route;
     spawn=1000;p.hp=1e6;const boss=addEnemy('boss');boss.x=70;boss.y=0;boss.speed=0;boss.shoot=1000;boss.dmg=0;
     while(clock<90&&!boss.dead)update(.01);
     out.push({el,route,weapon,time:clock,dead:boss.dead,target:BUILD_ROUTES[el][route].target[weapon]});
   }
   return out;
 })()`);
 for(const x of r){
   assert.equal(x.dead,true,x.el+x.route+x.weapon);
   assert.ok(Math.abs(x.time-x.target)<=3, `${x.el} ${x.route} ${x.weapon} actual=${x.time.toFixed(1)} target=${x.target}`);
 }
 const get=(el,route,weapon)=>r.find(x=>x.el===el&&x.route===route&&x.weapon===weapon).time;
 assert.ok(get('lightning','B','staff')<get('lightning','B','sword'));
 assert.ok(get('lightning','B','sword')<get('lightning','B','crossbow'));
 assert.ok(get('ice','A','crossbow')>get('ice','B','crossbow'));
 for(const x of r)t.diagnostic(`${x.el}/${x.route}/${x.weapon} ${x.time.toFixed(1)}s (target ${x.target}s)`);
});

test('midboss uses comparable defense and HP scaling',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('staff','lightning'); const mini=addEnemy('mini'),boss=addEnemy('boss');
   return {midHP:mini.hp,bossHP:boss.hp,midDef:mini.defense,bossDef:boss.defense};
 })()`);
 assert.equal(r.midHP,1260);assert.equal(r.bossHP,4000);
 assert.equal(r.midDef,50);
 assert.equal(r.midDef,r.bossDef);
});


test('every normal level-up offers four unique cards and the selected element only', () => {
 const {context}=gameContext();
 const result=run(context,`(() => {
   const answer={};
   for (const element of ['fire','ice','lightning']){
     for(const weapon of ['sword','crossbow','staff']){
       start(weapon,element);p.lv=11;p.route='B';p.evolution[6]='spread';p.evolution[10]='rapid';
       const choices=rollUpgrades();
       answer[element+'/'+weapon]={ids:choices.map(c=>c.id),foreign:choices.some(c=>c.element&&c.element!==element),
         wrongWeapon:choices.some(c=>c.weapon&&c.weapon!==weapon)};
       levelQueue=1;choose();
       answer[element+'/'+weapon].has4=overlay.innerHTML.includes('data-n="3"');
       answer[element+'/'+weapon].reroll=overlay.innerHTML.includes('선택지 새로고침');
     }
   }
   return answer;
 })()`);
 for(const [key,value] of Object.entries(result)){
   assert.equal(value.ids.length,4,key);assert.equal(new Set(value.ids).size,4,key);
   assert.equal(value.ids[0],'elemental',key);
   assert.equal(value.foreign,false,key);assert.equal(value.wrongWeapon,false,key);
   assert.equal(value.has4,true,key);assert.equal(value.reroll,true,key);
 }
});

test('artifact cards unlock by level, are element locked and cannot repeat',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','ice');p.lv=2;const early=availableUpgrades().map(x=>x.id);
   p.lv=8;p.route='A';const late=availableUpgrades().map(x=>x.id);
   upgrades.find(u=>u.id==='iceBolt').apply();
   const after=availableUpgrades().map(x=>x.id);
   return {early,late,after};
 })()`);
 assert.ok(r.early.includes('iceBolt')&&!r.early.includes('frozenHeart'));
 assert.ok(r.late.includes('frozenHeart')&&r.late.includes('iceBolt'));
 assert.ok(!r.late.includes('meteorEye')&&!r.late.includes('thunderEarring'));
 assert.ok(!r.after.includes('iceBolt'));
});

test('weapon-only upgrades and elemental attacks produce visible gameplay effects',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','ice');let enemy=addEnemy('stone_golem');enemy.x=118;enemy.y=0;enemy.speed=0;
   p.action={target:{x:118,y:0}};fireWeapon();const before=enemy.hp;
   p.items.swordReach=true;fireWeapon();const after=enemy.hp;
   start('crossbow','ice');enemy=addEnemy('stone_golem');enemy.x=250;enemy.y=0;enemy.speed=0;
   p.items.iceBolt=true;pulseArtifactCards(3.01);
   const iceShots=shots.filter(s=>s.skillTag==='ice').length;
   start('staff','fire');enemy=addEnemy('stone_golem');enemy.x=70;enemy.y=0;enemy.speed=0;
   p.items.meteorEye=true;pulseArtifactCards(5.01);
   const scheduled=p.skillPending.length;const hpBefore=enemy.hp;
   pulseArtifactCards(.7);
   return {before,after,iceShots,scheduled,meteorDamage:hpBefore-enemy.hp};
 })()`);
 assert.equal(r.before,110);
 assert.ok(r.after<r.before);
 assert.equal(r.iceShots,2);assert.equal(r.scheduled,1);assert.ok(r.meteorDamage>0);
});

test('three evolutionary milestones offer explicit direction choices',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   const result={};
   for(const lv of [6,10,14]){
     start('staff','lightning');p.route='B';p.lv=lv;levelQueue=1;
     for(const earlier of [6,10,14])if(earlier<lv)p.evolution[earlier]='spread';
     choose();result[lv]={state,menu:overlay.innerHTML};
   }
   return result;
 })()`);
 for(const lv of [6,10,14]){
   assert.equal(r[lv].state,'evolution');
   assert.ok(r[lv].menu.includes('data-n="1"'));
   assert.ok(r[lv].menu.includes('기술 진화'));
 }
});

test('Sephiria-inspired element cards trigger different nonhoming effects',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   const out={};
   for(const element of ['fire','ice','lightning']){
     start('staff',element);p.lv=8;p.route='A';spawn=1000;
     const target=addEnemy('stone_golem');target.x=70;target.y=0;target.hp=target.maxhp=1000;target.speed=0;
     const id={fire:'phoenixFeather',ice:'glacierEcho',lightning:'electroChakram'}[element];
     p.items[id]=true;pulseArtifactCards(5);
     out[element]={shots:shots.length,fx:fx.map(x=>x.type),damage:1000-target.hp};
   }
   return out;
 })()`);
 assert.ok(r.fire.shots>0);
 assert.ok(r.ice.fx.includes('blast')&&r.ice.damage>0);
 assert.ok(r.lightning.fx.includes('blast')&&r.lightning.damage>0);
});

test('oak coal shortens burn interval without extending burn duration',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('staff','fire');p.items.oakCoal=true;
   const enemy={};const ticks=[];applyBurn(enemy,30);
   tickStatuses(enemy,3,(_e,v)=>ticks.push(v));
   return {interval:.7,ticks,expired:!enemy.burn};
 })()`);
 assert.equal(r.ticks.length,4);
 assert.ok(r.ticks.every(x=>x===3));
 assert.equal(r.expired,true);
});

test('weapon artifacts count lethal hits and activate once without recursive hits',()=>{
 const {context}=gameContext();
 const results=run(context,`(() => {
  const out=[];
  for(const [weapon,element,item] of [['sword','fire','swordWave'],['sword','fire','solarBlade'],['sword','ice','iceVine'],['crossbow','lightning','crossbowVolley'],['staff','ice','staffEcho'],['staff','fire','staffNova']]){
   start(weapon,element);p.critChance=0;p.items[item]=true;
   for(let i=0;i<4;i++){const e=addEnemy('slime');e.x=50+i*10;e.y=0;e.hp=1;weaponHit(e,weapon,element)}
   out.push({item,count:p.artifactHits,kills,blasts:fx.filter(f=>f.type==='blast').length,shots:shots.length});
  }
  return out;
 })()`);
 for(const r of results){assert.equal(r.count,4,r.item);assert.equal(r.kills,4,r.item);
  if(['swordWave','iceVine'].includes(r.item))assert.equal(r.blasts,1,r.item);
  if(r.item==='staffNova')assert.equal(r.blasts,4,r.item);
  if(['solarBlade','staffEcho'].includes(r.item))assert.equal(r.shots,1,r.item);
  if(r.item==='crossbowVolley')assert.equal(r.shots,2,r.item);
 }
});

test('all evolution choices improve their described route effect',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
  function scenario(evolution,n){
   start('sword','fire');p.lv=14;p.route='B';p.evolution=evolution;
   const e=addEnemy('stone_golem');e.x=40;e.y=0;e.hp=10000;
   for(let i=0;i<n;i++)applyBuildHit(e,'sword','fire',20);
   return {damage:10000-e.hp,radius:fx.find(f=>f.type==='blast')?.r||0};
  }
  return {base:scenario({},4),focus:scenario({6:'focus'},4),wide:scenario({6:'spread'},4),
   heavy:scenario({10:'heavy'},4),rapid:scenario({10:'rapid'},3),
   wide14:scenario({14:'spread'},4),focus14:scenario({14:'focus'},4),base3:scenario({},3)};
 })()`);
 assert.ok(r.focus.damage>r.base.damage);assert.equal(r.wide.radius,r.base.radius+25);
 assert.ok(r.heavy.damage>r.base.damage);assert.ok(r.rapid.damage>r.base3.damage);
 assert.equal(r.wide14.radius,r.base.radius+25);assert.ok(r.focus14.damage>r.base.damage);
});

test('elemental area effect records its element and renders without error',()=>{
 const {context}=gameContext();
 for(const element of ['fire','ice','lightning']){
  const r=run(context,`(() => {start('staff','${element}');triggerAreaSkill(0,0,55,10,'${element}');const f=fx.find(x=>x.type==='blast');drawElementBurst(f);return f.element})()`);
  assert.equal(r,element);
 }
});

test('sword slash exactly covers the visible 120-degree cone and retains base range',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   const a=58*Math.PI/180,b=68*Math.PI/180,range=WEAPON_STATS.sword.range;
   return {totalDegrees:2*SWORD_HALF_ANGLE*180/Math.PI,range,
     inside:circleTouchesSword(80*Math.cos(a),80*Math.sin(a),0,0,0,0),
     outside:circleTouchesSword(80*Math.cos(b),80*Math.sin(b),0,0,0,0),
     rear:circleTouchesSword(-80,0,0,0,0,0)};
 })()`);
 assert.ok(Math.abs(r.totalDegrees-120)<1e-8);
 assert.equal(r.range,92);assert.equal(r.inside,true);
 assert.equal(r.outside,false);assert.equal(r.rear,false);
});

test('real sword attacks alternate left-to-right and right-to-left',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','ice');spawn=1000;let e=addEnemy('stone_golem');
   e.x=70;e.y=0;e.speed=0;e.hp=e.maxhp=900;e.defense=0;
   const out=[];
   for(let i=0;i<2;i++){
      attack=0;p.action=null;update(.01);
      const a=p.action;const direction=a.swingDirection;
      out.push({dir:direction,start:swordArmAngle(a)});
      update(.1);
      out[i].progress=p.action?.swordSwing?.progress??-1;
      out[i].fx=fx.some(f=>f.type==='swordArea'&&f.direction===direction);
      out[i].end=swordSwingAngle(0,direction,1);
   }
   return out;
 })()`);
 assert.equal(r.length,2);
 assert.equal(r[0].dir,-r[1].dir);
 assert.ok(r[0].fx&&r[1].fx);
 assert.ok(r[0].progress>=0&&r[1].progress>=0);
 assert.ok(Math.abs(r[0].end+r[1].end)<1e-8);
});

test('sword damage occurs as swing crosses target, never before or twice per attack',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','ice');spawn=1000;
   const e=addEnemy('stone_golem');e.x=80;e.y=0;e.speed=0;e.hp=e.maxhp=1000;e.defense=0;
   attack=0;update(.01); // launch windup
   update(.09); // windup finishes, sword visual begins
   const before=1000-e.hp;
   update(.1); // crosses centre
   const during=1000-e.hp, hits=p.action.swordSwing.hitTargets.size,
     visual=p.action.swordSwing.visual.progress;
   update(.1);
   const after=1000-e.hp;
   const impacts=fx.filter(f=>f.type==='swordImpact').length;
   return {before,during,after,hits,visual,impacts};
 })()`);
 assert.equal(r.before,0);
 assert.ok(r.during>0);
 assert.equal(r.after,r.during);
 assert.equal(r.hits,1);
 assert.ok(Math.abs(r.visual-.5)<1e-6);
 assert.equal(r.impacts,1);
});

test('sword swing only hits targets as they enter its arc',()=>{
 const {context}=gameContext();
 const r=run(context,`(() => {
   start('sword','physical');spawn=1000;
   const e=addEnemy('stone_golem');e.x=80*Math.cos(.9);e.y=80*Math.sin(.9);
   e.speed=0;e.hp=e.maxhp=1000;e.defense=0;
   attack=0;update(.01);update(.09);
   update(.1);const halfway=1000-e.hp;
   update(.1);const completed=1000-e.hp;
   return {halfway,completed};
 })()`);
 assert.equal(r.halfway,0);
 assert.ok(r.completed>0);
});
