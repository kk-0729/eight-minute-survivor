// Project test values, not Sephiria's full damage formula or item data.
const WEAPON_STATS={
  sword:{coefficient:1,interval:.50,range:92,projectileSpeed:0,pierce:0},
  crossbow:{coefficient:.66,interval:.33,range:738,projectileSpeed:410,pierce:0},
  staff:{coefficient:.8,interval:.40,range:441,projectileSpeed:245,pierce:0}
};
const ELEMENTS={physical:'물리',fire:'화염',ice:'냉기',lightning:'번개'};
const BASE_ATTACK={physical:20,fire:20,ice:20,lightning:20};
// No critical system existed previously; 0% preserves that behavior. Multiplier is provisional.
const BASE_CRIT={chance:0,multiplier:1.5};
// Final boss baseline; mid-boss uses the same defense so the relative build order is retained.
const BOSS_DEFENSE=50;
// Data-driven 18-build progression. All targets assume level 18, four +1 element picks,
// one stationary boss (4000 HP/50 DEF), no crit, attack speed, multi-shot or movement.
// Actual projectile flight and periodic burn ticks can shift measured times slightly.
const BUILD_ROUTES={
  fire:{
    A:{name:'지옥불',desc:'화상을 확산시키고 처치 시 불꽃 폭발',target:{sword:36,crossbow:44,staff:28}},
    B:{name:'태양의 심판',desc:'태양검·폭발탄·운석으로 직접 공격',target:{sword:31,crossbow:34,staff:22}}
  },
  ice:{
    A:{name:'영원한 겨울',desc:'동상·빙결·냉기 안개로 적 제어',target:{sword:58,crossbow:70,staff:48}},
    B:{name:'빙하의 무장',desc:'빙검·관통 얼음탄·자동 얼음 창',target:{sword:52,crossbow:65,staff:43}}
  },
  lightning:{
    A:{name:'초전도',desc:'감전과 연쇄 번개로 전류 확산',target:{sword:23,crossbow:29,staff:18}},
    B:{name:'뇌신의 폭풍',desc:'먹구름 충전과 강력한 자동 낙뢰',target:{sword:21,crossbow:27,staff:16}}
  }
};
function levelAttack(player,element){
  // 5% of the *starting* attack power per level, plus +1 for every chosen card.
  return player.attacks[element]*(1+.05*(player.lv-1))+(element==='physical'?0:(player.elementalStacks||0));
}
function buildStageMultiplier(level){
  if(level<3)return 0;
  if(level<6)return .18;
  if(level<10)return .4;
  if(level<14)return .68;
  return 1;
}
function buildBonusFactor(element,route,weapon){
  const target=BUILD_ROUTES[element]?.[route]?.target[weapon];
  if(!target)return 0;
  const w=WEAPON_STATS[weapon],referenceAttack=BASE_ATTACK[element]*(1+.05*17)+4;
  const referenceDps=referenceAttack*w.coefficient/w.interval;
  return Math.max(0,4000/(target*(1-defenseReduction(BOSS_DEFENSE))*referenceDps)-1);
}
function equipWeapon(player,id){if(!WEAPON_STATS[id])return false;player.weapon=id;return true}
function defenseReduction(defense){return Math.max(0,Math.min(.9,.445*Math.log1p(Math.max(0,defense)/40)))}
function calculateDirectDamage(attacks,element,coefficient,defense,critChance=0,critMultiplier=1.5,roll=Math.random()){
  const critical=roll<Math.max(0,Math.min(1,critChance));
  const base=(attacks[element]??0)*coefficient;
  return {damage:base*(1-defenseReduction(defense))*(critical?critMultiplier:1),critical};
}
function applyBurn(enemy,directDamage){
  // Refresh duration and damage without restarting the tick clock: fast hits
  // must not indefinitely postpone the next burn tick.
  const untilTick=enemy.burn?.untilTick??1;
  enemy.burn={remaining:3,untilTick,ticksLeft:3,damage:directDamage*.1};
  enemy.fire=3;
}
function applyIce(enemy){enemy.iceRemaining=2}
function tickStatuses(enemy,dt,onBurn){
  enemy.iceRemaining=Math.max(0,(enemy.iceRemaining||0)-dt);
  enemy.freezeRemaining=Math.max(0,(enemy.freezeRemaining||0)-dt);
  if(enemy.iceRemaining<1e-9)enemy.iceRemaining=0;
  const burn=enemy.burn;if(!burn)return;
  let time=Math.min(dt,burn.remaining);
  while(time+1e-9>=burn.untilTick&&burn.ticksLeft>0){
    time-=burn.untilTick;burn.remaining-=burn.untilTick;burn.untilTick=1;burn.ticksLeft--;
    onBurn(enemy,burn.damage);if(enemy.dead)break;
  }
  burn.remaining=Math.max(0,burn.remaining-time);burn.untilTick-=time;
  enemy.fire=burn.remaining;
  if(burn.ticksLeft===0||burn.remaining<=1e-9||enemy.dead){enemy.burn=null;enemy.fire=0}
}
function chooseLightningTarget(source,candidates,radius){
  let best=null,bestDist=radius;
  for(const e of candidates){if(e===source||e.dead)continue;const d=Math.hypot(e.x-source.x,e.y-source.y);if(d<bestDist){best=e;bestDist=d}}
  return best;
}
