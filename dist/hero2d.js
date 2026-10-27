// Four hand-drawn, reference-based poses: idle, windup, strike, recovery.
const renSwordFrames = new Image();
renSwordFrames.src = 'assets/ren-sword-2d.png';
function renFrame(action) {
  if (!action) return 0;
  if (action.stage === 'windup') return 1;
  return action.remaining > action.follow * .5 ? 2 : 3;
}
function drawHero2D() {
  const bob=p.moving?Math.abs(Math.sin(clock*10))*1.7:0;
  c.save();
  c.translate(p.x,p.y-bob);
  c.scale(p.facing||1,1);
  c.fillStyle='rgba(28,23,20,.22)';c.beginPath();c.ellipse(0,21+bob,16,5,0,0,7);c.fill();
  if(p.weapon==='sword'&&renSwordFrames.complete&&renSwordFrames.naturalWidth){
    const frame=renFrame(p.action),width=renSwordFrames.naturalWidth/4,height=renSwordFrames.naturalHeight;
    c.drawImage(renSwordFrames,frame*width,0,width,height,-47,-66,94,125);
  }else if(p.weapon!=='sword'&&sprites[weapons[p.weapon].image].complete&&sprites[weapons[p.weapon].image].naturalWidth){
    const image=sprites[weapons[p.weapon].image];
    const acting=p.action&&p.action.stage==='windup'?-0.07:p.action?0.04:0;
    c.rotate(acting);const scale=Math.min(82/image.naturalWidth,86/image.naturalHeight);
    c.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
  }else{
    c.restore();drawHero();return;
  }
  c.restore();
}
