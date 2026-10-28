// One geometry defines both the pink attack area and its collision test.
const SWORD_HALF_ANGLE=.72;
function circleTouchesSword(x,y,r,originX,originY,angle){
  const dx=x-originX,dy=y-originY,d=Math.hypot(dx,dy);
  if(d<=r)return true;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
  if(Math.abs(delta)<=SWORD_HALF_ANGLE)return d<=WEAPON_STATS.sword.range+r;
  for(const side of [-1,1]){
    const a=angle+side*SWORD_HALF_ANGLE,ux=Math.cos(a),uy=Math.sin(a);
    const projection=Math.max(0,Math.min(WEAPON_STATS.sword.range,dx*ux+dy*uy));
    if(Math.hypot(dx-ux*projection,dy-uy*projection)<=r)return true;
  }
  return false;
}
function drawSwordArea(f){
  c.save();c.globalAlpha=Math.max(0,f.life/f.max);
  c.beginPath();c.moveTo(f.x,f.y);c.arc(f.x,f.y,WEAPON_STATS.sword.range,f.a-SWORD_HALF_ANGLE,f.a+SWORD_HALF_ANGLE);c.closePath();
  c.fillStyle='rgba(210,62,120,.28)';c.fill();c.strokeStyle='rgba(255,175,207,.8)';c.lineWidth=1.5;c.stroke();
  c.clip();c.translate(f.x,f.y);c.rotate(f.a);
  for(let i=0;i<5;i++){let x=28+i*12,y=Math.sin(i*2.1)*18;c.save();c.translate(x,y);c.rotate(i*.8);c.fillStyle=i%2?'#ffe1ed':'#ef8fb3';c.beginPath();c.ellipse(0,0,3,1.5,0,0,Math.PI*2);c.fill();c.restore()}
  c.restore();
}
