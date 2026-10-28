
const canvas=document.querySelector('#game'),c=canvas.getContext('2d'),overlay=document.querySelector('#overlay'),hud=document.querySelector('#hud');let W,H,dpr;function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;c.setTransform(dpr,0,0,dpr,0,0)}window.addEventListener('resize',resize);resize();
let state='menu',p,enemies,shots,gems,fx,hazards,clock,last=0,spawn=0,attack=0,noticeT=0,boss4=false,boss8=false,kills=0,levelQueue=0,keys={},pointer=null;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const weapons={sword:{name:'렌 · 대검',icon:'⚔',image:'ren',desc:'넓은 범위를 베는 근거리 공격'},crossbow:{name:'보우마스터 · 활',icon:'➶',image:'bowmaster',desc:'빠르게 화살을 발사하는 원거리 공격'},staff:{name:'에반 · 지팡이',icon:'✦',image:'evan',desc:'마법 구체를 발사하는 원거리 공격'}};
const TIMING={midBoss:240,finalBoss:480};

const monsters=[
 ['slime','슬라임',0,'normal'],['blue_snail','파란 달팽이',0,'normal'],['red_snail','빨간 달팽이',0,'normal'],['orange_mushroom','주황버섯',0,'normal'],['green_mushroom','초록버섯',0,'normal'],
 ['pig','돼지',1,'normal'],['ribbon_pig','리본돼지',1,'fast'],['stump','스텀프',1,'tank'],['axe_stump','도끼 스텀프',1,'tank'],['octopus','옥토퍼스',1,'normal'],
 ['horny_mushroom','뿔버섯',2,'normal'],['zombie_mushroom','좀비버섯',2,'tank'],['wild_boar','와일드보어',2,'fast'],['fire_boar','파이어보어',2,'fast'],['stone_golem','스톤골렘',2,'tank'],
 ['dark_stone_golem','다크 스톤골렘',3,'tank'],['drake','드레이크',3,'normal'],['copper_drake','카퍼 드레이크',3,'fast'],['tauromacis','타우로마시스',3,'tank'],['taurospear','타우로스피어',3,'fast']];
const monsterAtlas=new Image();monsterAtlas.src='assets/monsters/creatures.png';
function monsterSpriteIndex(type){if(type==='mini')return 6;if(type==='boss')return 7;const i=monsters.findIndex(m=>m[0]===type);return [0,1,1,2,2,3,3,5,5,4,2,2,3,3,5,5,3,3,6,6][Math.max(0,i)]}
function drawSprite(id,x,y,w,h){if(!monsterAtlas.complete||!monsterAtlas.naturalWidth)return false;const i=monsterSpriteIndex(id),sw=monsterAtlas.naturalWidth/4,sh=monsterAtlas.naturalHeight/2;c.imageSmoothingEnabled=false;c.drawImage(monsterAtlas,(i%4)*sw,Math.floor(i/4)*sh,sw,sh,x-w/2,y-h/2,w,h);return true}
const upgrades=[
 {id:'elemental',name:'속성 공격력 +1',desc:'선택한 속성 공격력이 1 증가합니다',icon:'✷',category:'attribute',apply:()=>p.elementalStacks++},
 {id:'speed',name:'신속한 손',desc:'공격 간격 15% 감소',icon:'»',category:'common',apply:()=>p.cool*=.85},
 {id:'multi',name:'다중 공격',desc:'한 번에 발사하는 투사체 +1',icon:'✧',category:'weapon',apply:()=>p.multi++},
 {id:'vital',name:'생명의 씨앗',desc:'최대 체력 +25, 체력 25 회복',icon:'♥',category:'common',apply:()=>{p.maxhp+=25;p.hp=Math.min(p.maxhp,p.hp+25)}},
 {id:'move',name:'가벼운 발걸음',desc:'이동 속도 +12%',icon:'➜',category:'common',apply:()=>p.speed*=1.12},
 {id:'magnet',name:'자석',desc:'경험치 획득 범위 +35%',icon:'◉',category:'common',apply:()=>p.magnet*=1.35},
 {id:'heal',name:'회복의 물약',desc:'체력 35 회복',icon:'✚',category:'common',apply:()=>p.hp=Math.min(p.maxhp,p.hp+35)},
 ...ARTIFACT_UPGRADES
];
function show(html){overlay.innerHTML=html;overlay.style.display='flex'}function startMenu(){state='menu';hud.style.display='none';show(`<div class="panel"><div class="eyebrow">SURVIVE · BUILD · REPEAT</div><h1>8분의 생존</h1><p class="muted">몰려오는 적을 피하고, 아이템을 조합해 강해지세요.<br>8분에 등장하는 최종 보스를 처치하면 클리어!</p><div class="choices">${Object.entries(weapons).map(([id,w])=>`<button class="choice" data-weapon="${id}"><span class="portrait character-${id}" aria-hidden="true"></span><span class="tag">시작 무기 선택</span><strong>${w.icon} ${w.name}</strong><small>${w.desc}</small></button>`).join('')}</div><div class="foot">PC: WASD 또는 방향키 이동 · 모바일: 화면을 드래그해 이동<br>공격은 자동입니다. 아이템은 선택하는 즉시 적용됩니다.</div></div>`);overlay.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>chooseElement(b.dataset.weapon))}
function chooseElement(weapon){state='element';show(`<div class="panel"><div class="eyebrow">ELEMENT</div><h2>속성을 선택하세요</h2><p class="muted">무기와 별도로 선택하며 공격할 때 즉시 적용됩니다.</p><div class="choices">${Object.entries(ELEMENTS).filter(([id])=>id!=='physical').map(([id,name])=>`<button class="choice" data-element="${id}"><strong>${name}</strong><small>${{physical:'기본 직접 피해',fire:'3초간 화상',ice:'2초간 20% 둔화',lightning:'주변 적에게 전류 확산'}[id]}</small></button>`).join('')}</div><button id="back">무기 다시 선택</button></div>`);overlay.querySelectorAll('[data-element]').forEach(b=>b.onclick=()=>start(weapon,b.dataset.element));document.querySelector('#back').onclick=startMenu}
function start(weapon,element='physical'){p={x:0,y:0,r:9,hp:100,maxhp:100,speed:160,swordSwingDirection:-1,elementalStacks:0,route:null,evolution:{},routeHits:0,artifactHits:0,skillTimers:{},skillPending:[],rerolls:1,cool:1,multi:1,magnet:145,lv:1,xp:0,need:7,weapon,element,attacks:{...BASE_ATTACK},critChance:BASE_CRIT.chance,critMultiplier:BASE_CRIT.multiplier,lightningReady:{sword:0,crossbow:0,staff:0},items:{},inv:0,facing:1,moving:0,lookAngle:0,action:null};if(!equipWeapon(p,weapon))throw new Error('Unknown weapon');enemies=[];shots=[];gems=[];fx=[];hazards=[];clock=0;spawn=0;attack=0;boss4=boss8=false;kills=0;levelQueue=0;keys={};pointer=null;state='playing';overlay.style.display='none';hud.style.display='block';last=performance.now();announce('살아남으세요',2)}
function announce(s,t=2){document.querySelector('#notice').textContent=s;noticeT=t}function addEnemy(type){let a=rand(0,Math.PI*2),r=Math.hypot(W,H)/2+50,e={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,type,hit:0,fire:0,shock:0,fireTick:0,shoot:rand(2,3),wind:0,pattern:0,phase:rand(0,Math.PI*2),facing:1};let m=monsters.find(v=>v[0]===type);if(m){let i=monsters.indexOf(m),role=m[3],hpValues=[11,12,12,13,24,55,52,65,70,58,70,80,72,80,110,127,130,145,175,160],defValues=[0,0,0,0,0,2,2,4,5,3,5,6,5,6,9,10,10,12,15,13],speedValues=[35,32,38,36,38,42,66,30,32,43,42,32,68,72,29,30,43,68,34,65],damageValues=[7,6,7,7,7,8,8,10,11,8,9,10,10,11,12,13,12,13,15,14];Object.assign(e,{name:m[1],r:role==='tank'?18:role==='fast'?12:13,hp:hpValues[i],defense:defValues[i],speed:speedValues[i],color:'#a3c49a',dmg:damageValues[i]})}if(type==='mini')Object.assign(e,{name:'듄켈',r:39,hp:1260,defense:BOSS_DEFENSE,speed:38,color:'#88be91',dmg:18});if(type==='boss')Object.assign(e,{name:'림보',r:46,hp:4000,defense:BOSS_DEFENSE,speed:43,color:'#a76cba',dmg:22});e.maxhp=e.hp;enemies.push(e);return e}
function makeHazard(type,x,y,angle=0){hazards.push({type,x,y,angle,wait:type==='meteor'?1.1:1.25,life:0,hit:false})}
function bossPattern(e){let a=Math.atan2(p.y-e.y,p.x-e.x);if(e.type==='mini'){if(e.pattern++%2===0){for(let i=0;i<3;i++)makeHazard('meteor',p.x+rand(-100,100),p.y+rand(-100,100))}else makeHazard('slash',e.x,e.y,a)}else{if(e.pattern++%2===0)makeHazard('charge',e.x,e.y,a);else makeHazard('ring',e.x,e.y)} }
function updateHazards(dt){for(const h of hazards){if(h.wait>0){h.wait-=dt;if(h.wait<=0){h.life=.35;let dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy),along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),across=Math.abs(-dx*Math.sin(h.angle)+dy*Math.cos(h.angle));let inside=h.type==='meteor'?d<48:h.type==='ring'?d>65&&d<180:h.type==='slash'?d<145&&along>0&&across<85:along>0&&along<360&&across<42;if(inside&&p.inv<=0){p.hp-=h.type==='meteor'?15:22;p.inv=.75}fx.push({type:'blast',x:h.x,y:h.y,r:h.type==='meteor'?48:70,life:.3,max:.3,color:h.type==='meteor'?'#ffaf6b':'#bb7bea'})}}else h.life-=dt}hazards=hazards.filter(h=>h.wait>0||h.life>0)}
function getNearest(){let best=null,d=1e9;for(const e of enemies){let x=dist(p,e);if(x<d){d=x;best=e}}return best}function fireWeapon(){
 const target=p.action?.target||getNearest();if(!target)return;
 const a=Math.atan2(target.y-p.y,target.x-p.x),w=WEAPON_STATS[p.weapon];
 if(p.weapon==='sword'){
   const range=w.range+(p.items.swordReach?18:0);
   const direction=p.action?.swingDirection||1;
   const slash={type:'swordArea',x:p.x,y:p.y,a,range,direction,element:p.element,
     progress:0,life:SWORD_SWING_DURATION,max:SWORD_SWING_DURATION};
   fx.push(slash);
   if(p.action?.stage==='windup'){
     // Active play: collision advances over the exact angle shown by the arc.
     p.action.swordSwing={x:p.x,y:p.y,aim:a,direction,range,progress:0,
       hitTargets:new Set(),visual:slash};
   }else{
     // Direct scripted attacks (e.g. deterministic collision tests).
     for(const enemy of [...enemies])if(!enemy.dead&&circleTouchesSword(enemy.x,enemy.y,enemy.r,p.x,p.y,a,range))
       weaponHit(enemy,p.weapon,p.element);
   }
 }else{
   for(let j=0;j<p.multi;j++){
     const angle=a+(j-(p.multi-1)/2)*.16;
     shots.push({x:p.x,y:p.y,vx:Math.cos(angle)*w.projectileSpeed,vy:Math.sin(angle)*w.projectileSpeed,
       life:w.range/w.projectileSpeed,r:p.weapon==='crossbow'?4:7,weapon:p.weapon,
       element:p.element,pierce:w.pierce+(p.items.crossbowPierce?1:0)+(p.element==='ice'&&p.route==='B'&&p.lv>=10&&p.weapon==='crossbow'?1:0),
       hitTargets:new Set(),kind:p.weapon});
   }
 }
}
// Continuous swing collision: enemies are struck only while the visible sword
// crosses their hitbox, and never more than once in one attack.
function advanceSwordSwing(action,dt){
 const swing=action.swordSwing;
 if(!swing||dt<=0)return;
 const previous=swing.progress;
 const current=Math.min(1,previous+dt/(action.follow||SWORD_SWING_DURATION));
 if(current<=previous)return;
 for(const enemy of [...enemies]){
   if(enemy.dead||swing.hitTargets.has(enemy))continue;
   if(!swordSweepTouches(enemy.x,enemy.y,enemy.r,swing.x,swing.y,swing.aim,
     swing.direction,previous,current,swing.range))continue;
   swing.hitTargets.add(enemy);
   const impactColor=swordElementPalette(p.element).impact;
   fx.push({type:'swordImpact',x:enemy.x,y:enemy.y,r:Math.min(20,enemy.r+4),
     color:impactColor,life:.13,max:.13});
   weaponHit(enemy,'sword',p.element);
 }
 swing.progress=current;
 swing.visual.progress=current;
}
function hit(e,d,secondary=false,critical=false,dot=false){if(e.dead)return;e.hp-=d;e.hit=.1;fx.push({type:'damage',x:e.x+rand(-6,6),y:e.y-e.r,life:.72,max:.72,value:Math.round(d),secondary,critical,dot});if(e.hp<=0)kill(e)}
function weaponHit(e,weapon,element){
 if(e.dead)return;const w=WEAPON_STATS[weapon],attacks={...p.attacks,[element]:levelAttack(p,element)};
 const result=calculateDirectDamage(attacks,element,w.coefficient,e.defense||0,p.critChance,p.critMultiplier);
 if(element==='fire'||p.items.fire)applyBurn(e,result.damage);if(element==='ice')applyIce(e);
 if(p.items.shock){e.shock++;if(p.items.chain){let other=chooseLightningTarget(e,enemies,115);if(other){fx.push({type:'line',x:e.x,y:e.y,x2:other.x,y2:other.y,life:.15,max:.15});hit(other,8,true)}}if(p.items.storm&&e.shock>=5){e.shock=0;blast(e.x,e.y,78,20,'#ffe078',false)}}
 hit(e,result.damage,false,result.critical);
 if(!e.dead)applyBuildHit(e,weapon,element,result.damage);
  onArtifactWeaponHit(e,weapon,element);
 if(element==='lightning'&&clock>=p.lightningReady[weapon]){let other=chooseLightningTarget(e,enemies,115);if(other){p.lightningReady[weapon]=clock+1;fx.push({type:'line',x:e.x,y:e.y,x2:other.x,y2:other.y,life:.15,max:.15});hit(other,result.damage*.4,true)}}
}

// The base bonus budget is split into steady damage and a weapon/element-shaped
// periodic special. Average single-target damage stays close to the calibrated build.
function applyBuildHit(enemy,weapon,element,baseDamage){
 if(!p.route||element==='physical'||enemy.dead)return;
 const factor=buildBonusFactor(element,p.route,weapon)*buildStageMultiplier(p.lv);
 if(factor<=0)return;
 const bonus=baseDamage*factor;
 const single=(p.evolution[6]==='focus'?1.05:1)*(p.evolution[14]==='focus'?1.06:1);
 hit(enemy,bonus*.7*single,true);
 if(enemy.dead)return;
 const cycle=(p.evolution[10]==='rapid'||p.items.routeCadence||p.items.lightningRod&&element==='lightning')?3:4;
 p.routeHits=(p.routeHits||0)+1;
 if(p.routeHits%cycle!==0)return;
 hit(enemy,bonus*.3*cycle*single*(p.evolution[10]==='heavy'?1.15:1),true);
 const color={fire:'#ff8a4d',ice:'#80d9ff',lightning:'#f8d759'}[element];
 const radius=(weapon==='sword'?83:weapon==='crossbow'?55:105)
  +(p.items.routeControl?30:0)+(p.evolution[6]==='spread'?25:0)+(p.evolution[14]==='spread'?25:0);
 fx.push({type:'blast',x:enemy.x,y:enemy.y,r:radius,life:.32,max:.32,color,element});
 if(element==='fire'){
   if(p.route==='A'){ // ember chain, fire ring and burn
     for(const other of [...enemies])if(other!==enemy&&!other.dead&&dist(enemy,other)<radius){
       applyBurn(other,baseDamage*.35);hit(other,baseDamage*.4,true);
     }
   }else{ // sun blades / explosive bolts / staff meteors
     if(weapon==='staff')fx.push({type:'meteorImpact',x:enemy.x,y:enemy.y,r:radius,life:.35,max:.35});
     if(weapon==='sword')fx.push({type:'bladeImpact',x:enemy.x,y:enemy.y,element:'fire',life:.35,max:.35});
     for(const other of [...enemies])if(other!==enemy&&!other.dead&&dist(enemy,other)<radius)
       hit(other,bonus*.18,true);
   }
 }else if(element==='ice'){
   if(p.route==='A'){ // frozen shroud and frostbite (bosses only slowed)
     for(const other of [...enemies])if(other!==enemy&&!other.dead&&dist(enemy,other)<radius)applyIce(other);
     enemy.iceRemaining=Math.max(enemy.iceRemaining||0,3);
     if(enemy.type!=='boss'&&enemy.type!=='mini')enemy.freezeRemaining=.65;
   }else{ // ice weaponry: blades / piercing ice needles / ice spears
      fx.push({type:'bladeImpact',x:enemy.x,y:enemy.y,element:'ice',life:.35,max:.35});
     for(const other of [...enemies])if(other!==enemy&&!other.dead&&dist(enemy,other)<radius){
       applyIce(other);hit(other,bonus*.2,true);
     }
   }
 }else if(element==='lightning'){
   if(p.route==='A'){ // shock chain; greatsword sweep, bow sparks, rotating staff chakram
     let other=chooseLightningTarget(enemy,enemies,radius+50);
     if(other){fx.push({type:'line',x:enemy.x,y:enemy.y,x2:other.x,y2:other.y,life:.2,max:.2});
       hit(other,bonus*(weapon==='staff'?.65:.35),true)}
   }else{ // storm cloud consumption, visually stronger for staff
     fx.push({type:'stormStrike',x:enemy.x,y:enemy.y,life:.4,max:.4});
     for(const other of [...enemies])if(other!==enemy&&!other.dead&&dist(enemy,other)<radius)
       hit(other,bonus*.28,true);
   }
 }
}
function blast(x,y,r,damage,color,spread){fx.push({type:'blast',x,y,r,life:.3,max:.3,color});for(const e of [...enemies])if(!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.r){if(spread)applyBurn(e,damage);hit(e,damage,true)}}function kill(e){if(e.dead)return;e.dead=true;kills++;fx.push({type:'death',x:e.x,y:e.y,r:e.r,life:.3,max:.3});if(e.type==='boss'){state='win';end(true);return}if(e.fire>0&&(p.items.ash||(p.element==='fire'&&p.route==='A')))blast(e.x,e.y,65,16,'#f6a359',!!p.items.ring||(p.element==='fire'&&p.route==='A'));gems.push({x:e.x,y:e.y,value:e.type==='mini'?15:e.type==='tank'?3:1});if(e.type==='mini'){p.hp=Math.min(p.maxhp,p.hp+30);levelQueue++;announce('듄켈 격파 · 강화 선택!',3)}}
function chooseRoute(){
 state='route';
 const paths=BUILD_ROUTES[p.element];
 show(`<div class="panel"><div class="eyebrow">BUILD PATH</div><h2>속성 성장 루트를 선택하세요</h2><p class="muted">한 번 선택하면 이번 판에서는 변경할 수 없어요.</p><div class="choices">${['A','B'].map((id,i)=>`<button class="choice" data-n="${i}"><span class="tag">${ELEMENTS[p.element]} · 루트 ${id}</span><strong>${paths[id].name}</strong><small>${paths[id].desc}</small></button>`).join('')}</div></div>`);
 overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{
   p.route=+b.dataset.n===0?'A':'B';state='playing';overlay.style.display='none';last=performance.now();choose();
 });
}
function chooseEvolution(stage){
 state='evolution';
 const labels=stage===6?['범위 확장','단일 집중']:stage===10?['신속한 발동','강력한 일격']:['광역 진화','보스 집중'];
 show('<div class="panel"><div class="eyebrow">WEAPON EVOLUTION · LV '+stage+'</div><h2>'+BUILD_ROUTES[p.element][p.route].name+' 기술 진화</h2>'+
 '<p class="muted">선택한 속성·무기의 전용 공격이 발전합니다.</p><div class="choices">'+
 labels.map((name,i)=>'<button class="choice" data-n="'+i+'"><span class="tag">진화 '+(i+1)+'</span><strong>'+name+'</strong><small>'+
 (i===0?(stage===10?'특수 공격이 더 자주 발동합니다':'추가 공격이 적을 더 넓게 공격합니다'):
 (stage===14?'단일 대상 추가 공격이 6% 강해집니다':'특수 공격의 적중 화력을 유지합니다'))+
 '</small></button>').join('')+'</div></div>');
 overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{
   const i=+b.dataset.n;
   p.evolution[stage]=stage===10?(i===0?'rapid':'heavy'):(i===0?'spread':'focus');
   state='playing';overlay.style.display='none';last=performance.now();choose();
 });
}
function availableUpgrades(){
 return upgrades.filter(u=>
   (p.weapon!=='sword'||u.id!=='multi')&&
   (!u.unique||!p.items[u.id])&&
   (!u.element||u.element===p.element)&&
   (!u.weapon||u.weapon===p.weapon)&&
   (!u.minLevel||p.lv>=u.minLevel)&&
   (u.category!=='route'||!!p.route)
 );
}
function rollUpgrades(){
 const pool=availableUpgrades().filter(u=>u.id!=='elemental');
 const randomPick=(items)=>items.length?items[Math.floor(Math.random()*items.length)]:null;
 const choices=[upgrades.find(u=>u.id==='elemental')];
 for(const group of ['weapon','artifact']){
   const candidates=pool.filter(u=>!choices.includes(u)&&(group==='weapon'?(u.weapon||u.id==='multi'):u.element));
   const chosen=randomPick(candidates);if(chosen)choices.push(chosen);
 }
 while(choices.length<4){
   const chosen=randomPick(pool.filter(u=>!choices.includes(u)));
   if(!chosen)break;choices.push(chosen);
 }
 return choices;
}
function choose(){
 if(state!=='playing'||levelQueue<=0)return;
 if(p.lv>=3&&p.element!=='physical'&&!p.route){chooseRoute();return}
 for(const lv of [6,10,14]){
   if(p.lv>=lv&&p.route&&!p.evolution[lv]){chooseEvolution(lv);return}
 }
 levelQueue--;state='choose';
 let choices=rollUpgrades();
 const display=()=>{
   show('<div class="panel"><div class="eyebrow">POWER UP · LV '+p.lv+'</div><h2>강화 하나를 선택하세요</h2>'+
    '<p class="muted">기본 공격력은 레벨당 5% 자동 증가. 아래에서 하나를 추가로 선택해요.</p>'+
    '<div class="choices">'+choices.map((u,i)=>'<button class="choice" data-n="'+i+'"><span class="tag">'+u.icon+' · '+
      (u.rarity==='rare'?'희귀 ':u.rarity==='common'?'일반 ':'')+
      (u.weapon?'무기 전용':u.category==='route'?'루트 강화':u.element?'속성 아티팩트':'능력 강화')+
      '</span><strong>'+u.name+'</strong><small>'+u.desc+'</small></button>').join('')+'</div>'+
    '<p class="foot">속성 공격력 +1 고정 · 무기/속성 카드 우선 · 다른 속성은 나오지 않음</p>'+
    (p.rerolls>0?'<button id="reroll" class="reroll">선택지 새로고침 ('+p.rerolls+'회)</button>':'')+'</div>');
   overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{
      choices[+b.dataset.n].apply();
      state='playing';overlay.style.display='none';last=performance.now();
      if(levelQueue>0)choose();
   });
   if(p.rerolls>0)document.querySelector('#reroll').onclick=()=>{
     p.rerolls--;choices=rollUpgrades();display();
   };
 };
 display();
}
function end(win){state=win?'win':'dead';show(`<div class="panel"><div class="eyebrow">${win?'SURVIVED':'GAME OVER'}</div><h1>${win?'생존 성공':'여정의 끝'}</h1><p class="muted">${win?'최종 보스를 쓰러뜨렸어요!':'다른 강화 조합으로 다시 도전해보세요.'}</p><p>생존 시간 ${fmt(clock)}　·　레벨 ${p.lv}　·　처치 ${kills}</p><div class="choices"><button class="choice" id="again"><strong>다시 도전하기 →</strong><small>무기를 다시 선택합니다</small></button></div></div>`);document.querySelector('#again').onclick=startMenu}function fmt(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`}
function update(dt){clock+=dt;if(noticeT>0){noticeT-=dt;if(noticeT<=0)document.querySelector('#notice').textContent=''}if(clock>=TIMING.midBoss&&!boss4){boss4=true;addEnemy('mini');announce('친위대장 듄켈 등장!',3)}if(clock>=TIMING.finalBoss&&!boss8){boss8=true;addEnemy('boss');announce('림보 등장!',4)}let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(pointer){dx=pointer.dx;dy=pointer.dy}let len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}p.x+=dx*p.speed*dt;p.y+=dy*p.speed*dt;resolveTerrain(p);p.moving=len>0?1:0;if(len&&!p.action)p.lookAngle=Math.atan2(dx,dy);if(dx&&!p.action)p.facing=dx<0?-1:1;p.inv=Math.max(0,p.inv-dt);spawn-=dt;if(spawn<=0&&enemies.length<210){let count=1+Math.floor(clock/160);for(let i=0;i<count;i++){let tier=Math.min(3,Math.floor(clock/120));let group=monsters.filter(m=>m[2]===tier);addEnemy(group[Math.floor(Math.random()*group.length)][0])}spawn=Math.max(.18,.85-clock/950)}attack-=dt;
if(p.action){
 const action=p.action;
 if(action.stage==='follow'&&action.swordSwing)advanceSwordSwing(action,Math.min(dt,Math.max(0,action.remaining)));
 action.remaining-=dt;
 if(action.remaining<=0){
   if(action.stage==='windup'){
     fireWeapon();action.stage='follow';action.remaining=action.follow;
   }else p.action=null;
 }
}
if(attack<=0){
 let target=getNearest();
 if(target){
   p.facing=target.x<p.x?-1:1;p.lookAngle=Math.atan2(target.x-p.x,target.y-p.y);
   let windup=Math.min(.08,WEAPON_STATS[p.weapon].interval*p.cool*.4);
   let follow=Math.min(SWORD_SWING_DURATION,WEAPON_STATS[p.weapon].interval*p.cool*.5);
   let swingDirection=1;
   if(p.weapon==='sword'){p.swordSwingDirection*=-1;swingDirection=p.swordSwingDirection}
   p.action={stage:'windup',windup,follow,remaining:windup,
     aim:Math.atan2(target.y-p.y,target.x-p.x),target:{x:target.x,y:target.y},swingDirection};
   attack=Math.max(.12,WEAPON_STATS[p.weapon].interval*p.cool);
 }
}
for(const e of enemies){if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);let slowedFor=Math.min(dt,e.iceRemaining||0);tickStatuses(e,dt,(enemy,damage)=>hit(enemy,damage,true,false,true));if(e.dead)continue;let d=dist(p,e),a=Math.atan2(p.y-e.y,p.x-e.x),speed=e.speed*(1-(dt>0?.2*slowedFor/dt:0));if(e.freezeRemaining>0)speed=0;a=steerEnemy(e,a);if(e.type==='mage'&&d<220)speed=d<140?-22:0;e.x+=Math.cos(a)*speed*dt;e.y+=Math.sin(a)*speed*dt;resolveTerrain(e);if(Math.abs(p.x-e.x)>1)e.facing=p.x<e.x?-1:1;if(e.type==='mage'){e.shoot-=dt;if(e.shoot<=0&&d<430){shots.push({x:e.x,y:e.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,life:3,r:6,kind:'enemy',damage:8});e.shoot=2.6}}if(e.type==='mini'||e.type==='boss'){e.shoot-=dt;if(e.shoot<=0){bossPattern(e);e.shoot=e.type==='boss'?3.8:4.8}}if(d<e.r+p.r&&p.inv<=0){p.hp-=e.dmg;p.inv=.65}if(p.hp<=0){end(false);return}}
updateHazards(dt);if(p.hp<=0){end(false);return}pulseArtifactCards(dt);for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.kind==='enemy'){if(dist(s,p)<s.r+p.r&&p.inv<=0){p.hp-=s.damage;p.inv=.65;s.life=0;if(p.hp<=0){end(false);return}}}else for(const e of enemies){if(!e.dead&&!s.hitTargets.has(e)&&dist(s,e)<s.r+e.r){s.hitTargets.add(e);if(s.skillDamage!==undefined){hit(e,s.skillDamage,true);if(!e.dead&&s.element==='ice')applyIce(e);if(!e.dead&&s.element==='fire')applyBurn(e,s.skillDamage)}else weaponHit(e,s.weapon,s.element);if(s.pierce<=0){s.life=0;break}s.pierce--}}}shots=shots.filter(s=>s.life>0);enemies=enemies.filter(e=>!e.dead);for(const g of gems){let d=dist(g,p);if(d<p.magnet){let a=Math.atan2(p.y-g.y,p.x-g.x);g.x+=Math.cos(a)*Math.min(d,330*dt);g.y+=Math.sin(a)*Math.min(d,330*dt)}if(dist(g,p)<18){g.collected=true;p.xp+=g.value;while(p.xp>=p.need){p.xp-=p.need;p.lv++;p.need=Math.floor(p.need*1.18+2);levelQueue++}}}gems=gems.filter(g=>!g.collected);for(const f of fx)f.life-=dt;fx=fx.filter(f=>f.life>0);document.querySelector('#clock').textContent=fmt(clock);document.querySelector('#hptext').textContent=`체력 ${Math.ceil(p.hp)} / ${p.maxhp}`;document.querySelector('#hpbar').style.width=`${100*p.hp/p.maxhp}%`;document.querySelector('#lvtext').textContent=`LV. ${p.lv} · ${weapons[p.weapon].name} · ${ELEMENTS[p.element]}${p.route?' '+BUILD_ROUTES[p.element][p.route].name:''} · 속공 +${p.elementalStacks} · 처치 ${kills}`;document.querySelector('#xpbar').style.width=`${100*p.xp/p.need}%`;document.querySelector('#items').textContent='획득한 조합: '+(Object.keys(p.items).map(id=>upgrades.find(u=>u.id===id)?.name||id).join(' · ')||'아직 없음');if(levelQueue)choose()}
function render(){c.fillStyle='#131d1d';c.fillRect(0,0,W,H);if(!p)return;c.save();c.translate(W/2-p.x,H/2-p.y);drawGround();drawTerrain();for(const h of hazards){c.save();c.translate(h.x,h.y);c.rotate(h.angle);c.strokeStyle=h.type==='meteor'?'#ffb36a':'#da8bff';c.fillStyle=h.type==='meteor'?'#ff924d55':'#b36dff55';c.lineWidth=3;if(h.type==='meteor'){c.beginPath();c.arc(0,0,48,0,Math.PI*2);c.fill();c.stroke()}else if(h.type==='ring'){c.beginPath();c.arc(0,0,180,0,Math.PI*2);c.arc(0,0,65,0,Math.PI*2,true);c.fill('evenodd');c.stroke()}else if(h.type==='charge'){c.fillRect(0,-42,360,84);c.strokeRect(0,-42,360,84)}else{c.beginPath();c.moveTo(0,0);c.arc(0,0,145,-.65,.65);c.closePath();c.fill();c.stroke()}c.restore()}for(const g of gems){c.fillStyle='#91e7bd';c.save();c.translate(g.x,g.y);c.rotate(Math.PI/4);c.fillRect(-4,-4,8,8);c.restore()}for(const e of enemies){if(e.wind>0){c.beginPath();c.arc(e.x,e.y,110,0,7);c.fillStyle='#ee74742e';c.fill();c.strokeStyle='#ff8b88aa';c.stroke()}drawMonster(e);drawStatusEffects(e);c.save();c.strokeStyle='rgba(255,230,220,.55)';c.lineWidth=1;c.beginPath();c.arc(e.x,e.y,e.r,0,Math.PI*2);c.stroke();c.restore();if(e.fire>0){c.beginPath();c.arc(e.x,e.y,e.r+2,0,7)}if(e.fire>0){c.strokeStyle='#ffad64';c.lineWidth=3;c.stroke()}if(e.shock>0){c.fillStyle='#ffe87e';c.font='12px sans-serif';c.fillText('ϟ'+e.shock,e.x-7,e.y-e.r-9)}drawEnemyHealth(e)}for(const s of shots)drawProjectile(s);for(const f of fx){c.globalAlpha=Math.max(0,f.life/f.max);if(f.type==='swordArea')drawSwordArea(f);if(['meteorFall','meteorImpact','stormStrike','bladeImpact','chakram'].includes(f.type))drawSkillEffect(f);if(f.type==='arc'){c.strokeStyle='#f4e0a0';c.lineWidth=9;c.beginPath();c.arc(f.x,f.y,70,f.a-.7,f.a+.7);c.stroke()}if(f.type==='line'){c.strokeStyle='#ffe77f';c.lineWidth=2;c.beginPath();c.moveTo(f.x,f.y);let dx=f.x2-f.x,dy=f.y2-f.y,len=Math.hypot(dx,dy)||1;for(let i=1;i<6;i++){let k=i/6,offset=(i%2?1:-1)*4;c.lineTo(f.x+dx*k-dy/len*offset,f.y+dy*k+dx/len*offset)}c.lineTo(f.x2,f.y2);c.stroke()}if(f.type==='swordImpact'){
 c.save();c.strokeStyle=f.color;c.lineWidth=2.5;c.beginPath();
 const r=f.r*(.5+(1-f.life/f.max)*.7);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;
   c.moveTo(f.x+Math.cos(a)*r*.35,f.y+Math.sin(a)*r*.35);
   c.lineTo(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r)}
 c.stroke();c.restore();
}
if(f.type==='death'){c.fillStyle='#e5d8ba';for(let i=0;i<4;i++){let a=i*Math.PI/2,r=f.r*(2-f.life/f.max);c.fillRect(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,4,4)}}if(f.type==='blast'){if(f.element)drawElementBurst(f);else{c.fillStyle=f.color;c.beginPath();c.arc(f.x,f.y,f.r*(1-f.life/f.max*.4),0,7);c.fill()}}if(f.type==='rune'){c.strokeStyle=f.color;c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,f.r,0,7);c.stroke()}if(f.type==='damage'){let rise=(1-f.life/f.max)*24;c.font=f.critical?'bold 18px system-ui':f.dot?'bold 11px system-ui':'bold 14px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#2b1e16';c.strokeText(String(f.value),f.x,f.y-rise);c.fillStyle=f.critical?'#ffe16f':f.dot?'#ff9c68':f.secondary?'#a8e9ff':'#fff1c9';c.fillText(String(f.value),f.x,f.y-rise);c.textAlign='start'}c.globalAlpha=1}c.globalAlpha=p.inv>0?.65:1;drawHero2D();c.globalAlpha=1;c.save();c.strokeStyle='rgba(255,219,233,.85)';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.stroke();c.restore();c.restore()}
function frame(now){let dt=Math.min((now-last)/1000,.05);last=now;if(state==='playing')update(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='escape')togglePause()});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>{keys={};pointer=null;if(state==='playing')togglePause()});function togglePause(){if(state==='playing'){state='paused';show('<div class="panel"><h2>일시정지</h2><p class="muted">잠시 쉬어가세요.</p><div class="choices"><button class="choice" id="resume"><strong>계속하기 →</strong></button><button class="choice" id="menu"><strong>처음으로</strong></button></div></div>');document.querySelector('#resume').onclick=togglePause;document.querySelector('#menu').onclick=startMenu}else if(state==='paused'){state='playing';overlay.style.display='none';last=performance.now()}}document.querySelector('#pause').onclick=togglePause;canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;let dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,l=Math.hypot(dx,dy);pointer.dx=dx/Math.max(35,l);pointer.dy=dy/Math.max(35,l);document.querySelector('#stick').style.transform=`translate(${pointer.dx*30}px,${pointer.dy*30}px)`});function release(e){if(pointer&&e.pointerId===pointer.id){pointer=null;document.querySelector('#stick').style.transform=''}}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);startMenu();
