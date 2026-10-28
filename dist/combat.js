// Project test values, not Sephiria's full damage formula or item data.
const WEAPON_STATS={
  sword:{coefficient:1,interval:.50,range:92,projectileSpeed:0,pierce:0},
  crossbow:{coefficient:1,interval:.33,range:738,projectileSpeed:410,pierce:0},
  staff:{coefficient:.7,interval:.40,range:441,projectileSpeed:245,pierce:0}
};
const ELEMENTS={physical:'물리',fire:'화염',ice:'냉기',lightning:'번개'};
const BASE_ATTACK={physical:20,fire:20,ice:20,lightning:20};
// No critical system existed previously; 0% preserves that behavior. Multiplier is provisional.
const BASE_CRIT={chance:0,multiplier:1.5};
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
