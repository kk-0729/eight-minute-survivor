// The attack sector is shared by collision and its visual effect.
const SWORD_HALF_ANGLE=.72;
function circleTouchesSword(x,y,r,originX,originY,angle,range=WEAPON_STATS.sword.range){
  const dx=x-originX,dy=y-originY,d=Math.hypot(dx,dy);
  if(d<=r)return true;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
  if(Math.abs(delta)<=SWORD_HALF_ANGLE)return d<=range+r;
  for(const side of [-1,1]){
    const a=angle+side*SWORD_HALF_ANGLE,ux=Math.cos(a),uy=Math.sin(a);
    const projection=Math.max(0,Math.min(range,dx*ux+dy*uy));
    if(Math.hypot(dx-ux*projection,dy-uy*projection)<=r)return true;
  }
  return false;
}
function drawSwordArea(f){
  const radius=f.range||WEAPON_STATS.sword.range;
  const progress=Math.max(0,Math.min(1,1-f.life/f.max));
  const sweep=Math.min(1,progress/.55);
  const start=f.a-SWORD_HALF_ANGLE;
  const end=start+2*SWORD_HALF_ANGLE*sweep;
  const tail=Math.max(start,end-SWORD_HALF_ANGLE*.9);
  c.save();c.globalAlpha=Math.max(0,Math.min(1,(1-progress)*1.4));
  // A faint sector keeps the actual hit area legible without a solid wedge.
  c.beginPath();c.moveTo(f.x,f.y);c.arc(f.x,f.y,radius,start,start+2*SWORD_HALF_ANGLE);c.closePath();
  c.fillStyle='rgba(222,126,167,.06)';c.fill();c.clip();
  // Two tapered, translucent curves follow the swing, like the reference.
  function ribbon(r,width,color){
    const steps=16,span=end-tail;if(span<=0)return;
    c.beginPath();
    for(let i=0;i<=steps;i++){
      const t=i/steps,a=tail+span*t;
      const x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    for(let i=steps;i>=0;i--){
      const t=i/steps,a=tail+span*t,inner=r-Math.sin(Math.PI*t)*width;
      c.lineTo(f.x+Math.cos(a)*inner,f.y+Math.sin(a)*inner);
    }
    c.closePath();c.fillStyle=color;c.fill();
  }
  ribbon(radius,10,f.element==='fire'?'rgba(255,150,83,.7)':f.element==='ice'?'rgba(142,219,255,.7)':f.element==='lightning'?'rgba(255,224,101,.7)':'rgba(250,197,218,.6)');
  ribbon(radius-12,4,'rgba(255,235,243,.55)');
  c.lineWidth=1.2;c.strokeStyle='rgba(255,231,241,.8)';c.beginPath();
  c.arc(f.x,f.y,radius-.8,tail,end);c.stroke();
  c.fillStyle='rgba(255,202,222,.7)';
  for(let i=0;i<3;i++){const a=tail+(end-tail)*(i+1)/4,r=radius-20-i*8;c.fillRect(f.x+Math.cos(a)*r-1,f.y+Math.sin(a)*r-1,3,2)}
  c.restore();
}
