// Ren's body is fixed; the forearm and sword animate independently.
const renBody = new Image();
renBody.src = 'assets/ren-body-2d.png';
const plumSword = new Image();
plumSword.src = 'assets/plum-sword.png';
function drawRenArm(action) {
  let angle=-.15;
  if(action){
    const aim=action.aim??0;
    if(action.stage==='windup') angle=aim-.35-.35*(1-action.remaining/action.windup);
    else {const t=1-action.remaining/action.follow;angle=t<.55?aim-.7+1.4*t/.55:aim+.7-.85*(t-.55)/.45}
  }
  c.save();c.translate(7,-1);c.rotate(angle);
  // The shoulder and sword move together; the character body stays in one pose.
  c.fillStyle='#f1e9d8';c.strokeStyle='#bd995f';c.lineWidth=1;
  c.beginPath();c.moveTo(0,-4);c.quadraticCurveTo(9,-5,13,1);c.lineTo(12,7);c.lineTo(3,7);c.closePath();c.fill();c.stroke();
  c.fillStyle='#f2c6a6';c.beginPath();c.arc(13,4,2.5,0,Math.PI*2);c.fill();
  c.strokeStyle='#4c3b30';c.lineWidth=2.4;c.beginPath();c.moveTo(11,4);c.lineTo(16,4);c.stroke();
  if(plumSword.complete&&plumSword.naturalWidth)c.drawImage(plumSword,11,-9,48,24);
  else {c.strokeStyle='#e47baf';c.lineWidth=4;c.beginPath();c.moveTo(13,4);c.lineTo(46,4);c.stroke()}
  c.restore();
}
function drawHero2D() {
  const bob=p.moving?Math.abs(Math.sin(clock*10))*1.7:0;
  c.save();
  c.translate(p.x,p.y-bob);
  c.fillStyle='rgba(28,23,20,.22)';c.beginPath();c.ellipse(0,15+bob,11,3.5,0,0,7);c.fill();
  if(p.weapon==='sword'&&renBody.complete&&renBody.naturalWidth){
    c.drawImage(renBody,-33,-38,66,66);
    drawRenArm(p.action);
  }else if(p.weapon!=='sword'&&sprites[weapons[p.weapon].image].complete&&sprites[weapons[p.weapon].image].naturalWidth){
    const image=sprites[weapons[p.weapon].image];
    const acting=p.action&&p.action.stage==='windup'?-0.07:p.action?0.04:0;
    c.scale(p.facing||1,1);c.rotate(acting);const scale=Math.min(57.4/image.naturalWidth,60.2/image.naturalHeight);
    c.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
  }else{
    c.restore();drawHero();return;
  }
  c.restore();
}
