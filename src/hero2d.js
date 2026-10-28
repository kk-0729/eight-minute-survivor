// Ren's body is fixed; the forearm and sword animate independently.
const heroAtlas = new Image();
heroAtlas.src = 'assets/characters/adventurers.png';
function drawRenArm(action) {
  const angle=swordArmAngle(action);
  const blade=swordElementPalette(p.element);
  c.save();c.translate(7,-1);c.rotate(angle);
  // The shoulder and sword move together; the character body stays in one pose.
  c.fillStyle='#f1e9d8';c.strokeStyle='#bd995f';c.lineWidth=1;
  c.beginPath();c.moveTo(0,-4);c.quadraticCurveTo(9,-5,13,1);c.lineTo(12,7);c.lineTo(3,7);c.closePath();c.fill();c.stroke();
  c.fillStyle='#f2c6a6';c.beginPath();c.arc(13,4,2.5,0,Math.PI*2);c.fill();
  c.strokeStyle='#4c3b30';c.lineWidth=2.4;c.beginPath();c.moveTo(11,4);c.lineTo(16,4);c.stroke();
  c.fillStyle='#80344f';c.fillRect(11,2,10,4);
  c.fillStyle='#dda6ad';c.fillRect(18,-2,3,12);
  // The blade inherits the selected element; its tip leads the matching slash.
  c.fillStyle=blade.impact;c.fillRect(21,1,25,5);
  c.fillStyle=blade.inner;c.fillRect(23,1,20,2);
  c.fillStyle='#fff8ed';c.fillRect(44,2,5,3)
  c.restore();
}
function drawRangedArm(weapon,action){
 let t=action?(action.stage==='windup'?1-action.remaining/action.windup:1-action.remaining/action.follow):0;
 c.save();c.translate(7,-1);c.rotate((action?.aim??0)*.3);c.fillStyle=weapon==='crossbow'?'#567247':'#7561a4';c.fillRect(0,-3,13,7);c.fillStyle='#f2c6a6';c.fillRect(11,-2,5,5);
 if(weapon==='crossbow'){c.strokeStyle='#cdaa70';c.lineWidth=2;c.beginPath();c.moveTo(17,-10);c.quadraticCurveTo(27,0,17,10);c.stroke();c.strokeStyle='#eee6ce';c.beginPath();c.moveTo(17,-10);c.lineTo(15-(action?4*t:0),0);c.lineTo(17,10);c.stroke()}
 else{c.strokeStyle='#a98259';c.lineWidth=3;c.beginPath();c.moveTo(12,9);c.lineTo(22,-14);c.stroke();c.fillStyle='#bca8e8';c.fillRect(19,-17,6,6)}c.restore();
}
function drawHero2D(){
 const bob=p.moving?Math.abs(Math.sin(clock*10))*1.7:Math.sin(clock*2)*.4,index=p.weapon==='sword'?0:p.weapon==='crossbow'?1:2;
 c.save();c.translate(p.x,p.y-bob);c.fillStyle='rgba(28,23,20,.22)';c.beginPath();c.ellipse(0,15+bob,11,3.5,0,0,7);c.fill();
 if(state==='dead'){c.rotate(-1.1);c.globalAlpha=.7}
 if(heroAtlas.complete&&heroAtlas.naturalWidth){const sw=heroAtlas.naturalWidth/3,sh=heroAtlas.naturalHeight;c.imageSmoothingEnabled=false;c.drawImage(heroAtlas,index*sw,0,sw,sh,-33,-38,66,66)}else{c.restore();drawHero();return}
 if(p.weapon==='sword')drawRenArm(p.action);else drawRangedArm(p.weapon,p.action);
 if(p.inv>0){c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-10,-23,20,31)}c.restore();
}
