// Sword hero is extracted from the user-provided Ren concept sheet.
// The previous swordsman atlas + drawn arm are NOT used for the sword class.
// Other classes retain their separate existing models until their own reference art is supplied.
const renReference = new Image();
renReference.src = 'assets/characters/ren-reference.png';
const heroAtlas = new Image();
heroAtlas.src = 'assets/characters/adventurers.png';
const REN_CELL=80;
function renFacingAngle(){
 if(p.action&&typeof p.action.aim==='number')return p.action.aim;
 if(typeof p.lookAngle==='number')return Math.PI/2-p.lookAngle;
 return 0;
}
// Distinct body and upper pose transforms: the feet follow walking motion,
// while the torso turns toward the sword target with only a small pixel-art tilt.
function drawRenReference(){
 const action=p.action;
 const aiming=Boolean(action);
 const angle=renFacingAngle();
 const facingLeft=Math.cos(angle)<-.08;
 const frame=action?(action.stage==='windup'?1:action.stage==='follow'?2:0):0;
 const bob=p.moving?Math.abs(Math.sin(clock*11))*1.2:Math.sin(clock*2)*.35;
 const walk=p.moving?Math.sin(clock*12)*1.2:0;
 const up=Math.sin(angle)<-.35;
 const shoulderTurn=aiming?Math.max(-.19,Math.min(.19,Math.sin(angle)*-.16)):0;
 // Frame selection uses original screenshots: idle, drawn sword, completed strike.
 c.save();c.translate(p.x,p.y);
 c.fillStyle='rgba(12,23,26,.27)';
 c.beginPath();c.ellipse(0,20,18,5,0,0,Math.PI*2);c.fill();
 if(state==='dead'){c.rotate(-1.1);c.globalAlpha=.7}
 c.scale(facingLeft?-1:1,1);
 if(!renReference.complete||!renReference.naturalWidth){
   // Never silently fall back to the old sword portrait.
   c.fillStyle='#c8c0d8';c.fillRect(-8,-32,16,37);c.restore();return;
 }
 c.imageSmoothingEnabled=false;
 const srcX=frame*REN_CELL;
 // Lower body is anchored to feet and continues to move independently of aim.
 c.save();c.translate(0,walk);
 c.drawImage(renReference,srcX,54,REN_CELL,26,-40,-4+bob,80,26);
 c.restore();
 // Upper body rotates a little in aiming direction rather than an unnatural
 // 360-degree rotation of a front-facing illustration.
 c.save();c.translate(0,-4+bob);c.rotate(shoulderTurn);
 if(aiming&&up)c.transform(1,0,0,.96,0,-1);
 c.drawImage(renReference,srcX,0,REN_CELL,55,-40,-54,80,55);
 c.restore();
 if(p.inv>0){c.fillStyle='rgba(255,255,255,.16)';c.fillRect(-13,-44,26,55)}
 c.restore();
}
function drawRangedArm(weapon,action){
 let t=action?(action.stage==='windup'?1-action.remaining/action.windup:1-action.remaining/action.follow):0;
 c.save();c.translate(7,-1);c.rotate((action?.aim??0)*.3);c.fillStyle=weapon==='crossbow'?'#567247':'#7561a4';c.fillRect(0,-3,13,7);c.fillStyle='#f2c6a6';c.fillRect(11,-2,5,5);
 if(weapon==='crossbow'){c.strokeStyle='#cdaa70';c.lineWidth=2;c.beginPath();c.moveTo(17,-10);c.quadraticCurveTo(27,0,17,10);c.stroke();c.strokeStyle='#eee6ce';c.beginPath();c.moveTo(17,-10);c.lineTo(15-(action?4*t:0),0);c.lineTo(17,10);c.stroke()}
 else{c.strokeStyle='#a98259';c.lineWidth=3;c.beginPath();c.moveTo(12,9);c.lineTo(22,-14);c.stroke();c.fillStyle='#bca8e8';c.fillRect(19,-17,6,6)}c.restore();
}
function drawHero2D(){
 if(p.weapon==='sword'){drawRenReference();return}
 const bob=p.moving?Math.abs(Math.sin(clock*10))*1.7:Math.sin(clock*2)*.4,index=p.weapon==='crossbow'?1:2;
 c.save();c.translate(p.x,p.y-bob);c.fillStyle='rgba(28,23,20,.22)';c.beginPath();c.ellipse(0,15+bob,11,3.5,0,0,7);c.fill();
 if(state==='dead'){c.rotate(-1.1);c.globalAlpha=.7}
 if(heroAtlas.complete&&heroAtlas.naturalWidth){const sw=heroAtlas.naturalWidth/3,sh=heroAtlas.naturalHeight;c.imageSmoothingEnabled=false;c.drawImage(heroAtlas,index*sw,0,sw,sh,-33,-38,66,66)}else{c.restore();drawHero();return}
 drawRangedArm(p.weapon,p.action);
 if(p.inv>0){c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-10,-23,20,31)}
 c.restore();
}
