// Original implementations inspired by Sephiria's artifact families (not its assets or code).
// Cards are equipped immediately and are locked to the chosen element.
const ELEMENT_CARDS=[
 {id:'meteorEye',element:'fire',name:'붉은 뱀의 눈 · 운석',desc:'5초마다 적이 있던 좌표에 운석 낙하',icon:'☄',rarity:'rare',minLevel:4},
 {id:'phoenixFeather',element:'fire',name:'봉황의 깃털',desc:'3.5초마다 작은 화염 투사체를 추가 발사',icon:'❧',rarity:'common'},
 {id:'oakCoal',element:'fire',name:'신갈나무 숯',desc:'화상의 피해 간격이 1초에서 0.7초로 단축',icon:'♨',rarity:'common'},
 {id:'solarBlade',element:'fire',name:'태양검',desc:'네 번째 무기 적중마다 불꽃 칼날을 추가 발사',icon:'✴',rarity:'rare',minLevel:6},
 {id:'iceBolt',element:'ice',name:'아이스 볼트',desc:'3초마다 얼음 바늘 두 발을 발사',icon:'❄',rarity:'common'},
 {id:'glacierEcho',element:'ice',name:'빙하의 메아리',desc:'4초마다 주변에 냉기 파동을 방출',icon:'◈',rarity:'rare',minLevel:4},
 {id:'iceVine',element:'ice',name:'얼음 덩굴',desc:'네 번째 무기 적중마다 주변에 얼음 가시 생성',icon:'♧',rarity:'common'},
 {id:'frozenHeart',element:'ice',name:'얼어붙은 심장',desc:'동상 중첩이 쌓이면 적을 빙결 (보스 둔화)',icon:'◇',rarity:'rare',minLevel:6},
 {id:'electroChakram',element:'lightning',name:'전격 차크람',desc:'4초마다 적 주변에 회전하는 전격 고리',icon:'◉',rarity:'rare',minLevel:4},
 {id:'lightningArrow',element:'lightning',name:'번개 화살',desc:'2.5초마다 추가 번개탄 발사',icon:'ϟ',rarity:'common'},
 {id:'thunderEarring',element:'lightning',name:'천둥 귀걸이',desc:'4초마다 주변의 두 적을 낙뢰로 공격',icon:'⌁',rarity:'common'},
 {id:'lightningRod',element:'lightning',name:'피뢰침',desc:'먹구름·감전 루트의 추가 공격 빈도 증가',icon:'⚡',rarity:'rare',minLevel:6}
];
const WEAPON_CARDS=[
 {id:'swordReach',weapon:'sword',name:'확장 검기',desc:'참격 사거리 +18, 얼음·화염·번개 검기 시각효과 강화',icon:'⚔',rarity:'common'},
 {id:'swordWave',weapon:'sword',name:'검기 충격파',desc:'네 번째 참격에 주변으로 추가 충격파',icon:'✦',rarity:'rare',minLevel:5},
 {id:'crossbowPierce',weapon:'crossbow',name:'관통 석궁',desc:'모든 화살 관통 횟수 +1',icon:'➶',rarity:'common'},
 {id:'crossbowVolley',weapon:'crossbow',name:'정밀 연사',desc:'네 번째 적중마다 원래 목표 좌표로 화살 두 발 추가',icon:'⌁',rarity:'rare',minLevel:5},
 {id:'staffNova',weapon:'staff',name:'마력 파동',desc:'마법구체가 적중할 때 근처에 작은 속성 파동',icon:'✺',rarity:'common'},
 {id:'staffEcho',weapon:'staff',name:'메아리 구체',desc:'네 번째 마법 적중마다 추가 마법구체 발사',icon:'✧',rarity:'rare',minLevel:5}
];
const ROUTE_CARDS=[
 {id:'routeControl',category:'route',name:'전용 기술 · 확장',desc:'선택한 루트의 고유 공격 범위가 증가',icon:'◆',rarity:'rare',minLevel:6},
 {id:'routeCadence',category:'route',name:'전용 기술 · 연속 발동',desc:'선택한 루트의 특수 공격 발동 주기 감소',icon:'✶',rarity:'rare',minLevel:10}
];
const ARTIFACT_UPGRADES=[...ELEMENT_CARDS,...WEAPON_CARDS,...ROUTE_CARDS].map(card=>({
 ...card,category:card.category||'artifact',unique:true,
 apply:()=>{p.items[card.id]=true}
}));
function skillPower(ratio=1){return levelAttack(p,p.element)*ratio*(1-defenseReduction(0));}
function shotAtPoint(x,y,element,damage,skillTag='bolt',speed=300,spread=0){
 const a=Math.atan2(y-p.y,x-p.x)+spread;
 shots.push({x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
  life:2.3,r:skillTag==='ice'?4:5,kind:p.weapon==='crossbow'?'crossbow':'staff',
  element,skillTag,skillDamage:damage,pierce:0,hitTargets:new Set()});
}
function triggerAreaSkill(x,y,r,damage,element,applyStatus=false){
 const color={fire:'#fa763a',ice:'#83dafa',lightning:'#efce52'}[element]||'#c7b8e9';
 fx.push({type:'blast',x,y,r,life:.35,max:.35,color,element});
 for(const e of [...enemies]){
   if(e.dead||Math.hypot(e.x-x,e.y-y)>=r+e.r)continue;
   hit(e,damage,true);
   if(!e.dead&&applyStatus&&element==='ice')applyIce(e);
   if(!e.dead&&applyStatus&&element==='fire')applyBurn(e,damage);
 }
}
function queueMeteor(x,y,damage,element='fire',radius=60,delay=.6){
 if(!p.skillPending)p.skillPending=[];
 p.skillPending.push({x,y,damage,element,radius,delay});
 fx.push({type:'rune',x,y,r:radius,life:delay,max:delay,color:'#fa9c54'});
}
function pulseArtifactCards(dt){
 if(!p||!p.items||!p.element)return;
 if(!p.skillTimers)p.skillTimers={};
 if(p.skillPending){
   for(const obj of p.skillPending){obj.delay-=dt;if(obj.delay<=0)triggerAreaSkill(obj.x,obj.y,obj.radius,obj.damage,obj.element,true)}
   p.skillPending=p.skillPending.filter(o=>o.delay>0);
 }
 const enemy=getNearest();
 if(!enemy)return;
 const timer=(id,interval)=>{
   p.skillTimers[id]=(p.skillTimers[id]??interval)-dt;
   if(p.skillTimers[id]>0)return false;
   p.skillTimers[id]+=interval;
   return true;
 };
 if(p.element==='fire'){
   if(p.items.meteorEye&&timer('meteorEye',5))queueMeteor(enemy.x,enemy.y,skillPower(1.3));
   if(p.items.phoenixFeather&&timer('phoenixFeather',3.5)){
     for(const angle of [-.17,0,.17])shotAtPoint(enemy.x,enemy.y,'fire',skillPower(.27),'feather',365,angle);
   }
 }else if(p.element==='ice'){
   if(p.items.iceBolt&&timer('iceBolt',3)){
     for(const angle of [-.13,.13])shotAtPoint(enemy.x,enemy.y,'ice',skillPower(.35),'ice',325,angle);
   }
   if(p.items.glacierEcho&&timer('glacierEcho',4))triggerAreaSkill(p.x,p.y,125,skillPower(.35),'ice',true);
 }else if(p.element==='lightning'){
   if(p.items.lightningArrow&&timer('lightningArrow',2.5))shotAtPoint(enemy.x,enemy.y,'lightning',skillPower(.62),'lightning',375);
   if(p.items.electroChakram&&timer('electroChakram',4))triggerAreaSkill(enemy.x,enemy.y,75,skillPower(.8),'lightning');
   if(p.items.thunderEarring&&timer('thunderEarring',4)){
     let targets=enemies.filter(e=>!e.dead).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,2);
     for(const e of targets){fx.push({type:'line',x:p.x,y:p.y,x2:e.x,y2:e.y,life:.2,max:.2});hit(e,skillPower(.5),true)}
   }
 }
}
function onArtifactWeaponHit(enemy,weapon,element){
 if(!p.items)return;
 p.artifactHits=(p.artifactHits||0)+1;
 const n=p.artifactHits;
 if(element==='fire'&&p.items.solarBlade&&n%4===0){
   shotAtPoint(enemy.x,enemy.y,element,skillPower(.65),'solar',385,.05);
 }
 if(element==='ice'){
   if(p.items.iceVine&&n%4===0)triggerAreaSkill(enemy.x,enemy.y,52,skillPower(.45),element,true);
   if(p.items.frozenHeart&&!enemy.dead){
     enemy.frostStacks=(enemy.frostStacks||0)+1;
     if(enemy.frostStacks>=5){enemy.frostStacks=0;enemy.iceRemaining=3;
       if(enemy.type!=='boss'&&enemy.type!=='mini')enemy.freezeRemaining=.8;
     }
   }
 }
 if(weapon==='sword'&&p.items.swordWave&&n%4===0)triggerAreaSkill(enemy.x,enemy.y,70,skillPower(.6),element);
 if(weapon==='crossbow'&&p.items.crossbowVolley&&n%4===0){
   shotAtPoint(enemy.x,enemy.y,element,skillPower(.28),'volley',410,-.07);
   shotAtPoint(enemy.x,enemy.y,element,skillPower(.28),'volley',410,.07);
 }
 if(weapon==='staff'){
   if(p.items.staffNova)triggerAreaSkill(enemy.x,enemy.y,33,skillPower(.13),element);
   if(p.items.staffEcho&&n%4===0)shotAtPoint(enemy.x,enemy.y,element,skillPower(.5),'echo',300);
 }
}
