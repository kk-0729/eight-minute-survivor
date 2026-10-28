// A 120-degree alternating arc, shared by the hitbox and the sword ribbon.
const SWORD_HALF_ANGLE=Math.PI/3;
const SWORD_SWING_DURATION=.20;
function swordEase(t){
  const u=Math.max(0,Math.min(1,t));
  return .5-.5*Math.cos(Math.PI*u);
}
function swordSwingAngle(aim,direction,t){
  const side=direction<0?-1:1;
  return aim+side*SWORD_HALF_ANGLE*(2*swordEase(t)-1);
}
function swordArmAngle(action){
  if(!action)return -.65;
  if(action.stage!=='windup'&&action.stage!=='follow')return action.aim??-.65;
  const aim=action.aim??0,side=action.swingDirection<0?-1:1;
  if(action.stage==='windup'){
    const ready=1-Math.max(0,action.remaining)/(action.windup||.08);
    return swordSwingAngle(aim,side,0)-side*.27*(1-Math.max(0,Math.min(1,ready)));
  }
  const t=1-Math.max(0,action.remaining)/(action.follow||SWORD_SWING_DURATION);
  return swordSwingAngle(aim,side,t);
}
// "halfAngle" lets a frame test only the newly swept portion of the arc,
// so the hitbox follows the visible sword instead of striking the full wedge at once.
function circleTouchesSword(x,y,r,originX,originY,angle,range=WEAPON_STATS.sword.range,halfAngle=SWORD_HALF_ANGLE){
  const dx=x-originX,dy=y-originY,d=Math.hypot(dx,dy);
  if(d<=r)return true;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
  if(Math.abs(delta)<=halfAngle)return d<=range+r;
  for(const side of [-1,1]){
    const a=angle+side*halfAngle,ux=Math.cos(a),uy=Math.sin(a);
    const projection=Math.max(0,Math.min(range,dx*ux+dy*uy));
    if(Math.hypot(dx-ux*projection,dy-uy*projection)<=r)return true;
  }
  return false;
}
function swordSweepTouches(x,y,r,ox,oy,aim,direction,previous,current,range){
  const from=swordSwingAngle(aim,direction,previous);
  const to=swordSwingAngle(aim,direction,current);
  return circleTouchesSword(x,y,r,ox,oy,(from+to)/2,range,Math.max(.0001,Math.abs(to-from)/2));
}
function swordElementPalette(element){
  return {
    fire:{outer:'rgba(255,65,10,.9)',inner:'rgba(255,238,116,.98)',impact:'#ffa04e'},
    ice:{outer:'rgba(17,148,255,.88)',inner:'rgba(224,251,255,.98)',impact:'#b5ebff'},
    lightning:{outer:'rgba(255,206,74,.87)',inner:'rgba(255,249,177,.92)',impact:'#ffe47a'},
    physical:{outer:'rgba(255,174,32,.88)',inner:'rgba(255,250,175,.98)',impact:'#ffe794'}
  }[element]||{outer:'#efc1db',inner:'#fff0fb',impact:'#f9e5f0'};
}
function drawSwordArea(f){
  const radius=f.range||WEAPON_STATS.sword.range;
  const progress=Math.max(0,Math.min(1,f.progress??(1-f.life/f.max)));
  const side=f.direction<0?-1:1, aim=f.a;
  const start=aim-side*SWORD_HALF_ANGLE;
  const advance=2*SWORD_HALF_ANGLE*swordEase(progress);
  const tip=start+side*advance;
  const tail=start+side*Math.max(0,advance-.68);
  const palette=swordElementPalette(f.element);
  const opacity=Math.max(.08,1-progress*.62);
  c.save();
  c.globalAlpha*=opacity;
  // Layered crescent trails share the attack's angle and radius with the hitbox.
  // A fixed set of sparks avoids flicker and allocation on every frame.
  function ribbon(outer,width,color,offset=0){
    const steps=22, span=tip-tail;
    if(Math.abs(span)<.0001)return;
    c.beginPath();
    for(let i=0;i<=steps;i++){
      const t=i/steps,a=tail+span*t, r=outer-offset;
      if(i===0)c.moveTo(f.x+r*Math.cos(a),f.y+r*Math.sin(a));
      else c.lineTo(f.x+r*Math.cos(a),f.y+r*Math.sin(a));
    }
    for(let i=steps;i>=0;i--){
      const t=i/steps,a=tail+span*t;
      const inner=outer-offset-(2+width*Math.sin(Math.PI*t));
      c.lineTo(f.x+inner*Math.cos(a),f.y+inner*Math.sin(a));
    }
    c.closePath();c.fillStyle=color;c.fill();
  }
  c.shadowColor=palette.impact;c.shadowBlur=15;
  ribbon(radius,24,palette.outer);
  ribbon(radius-3,10,palette.inner);
  c.shadowBlur=0;
  if(f.element==='ice'){
    ribbon(radius-20,10,palette.outer);
    ribbon(radius-34,7,palette.inner);
  }
  c.fillStyle=palette.inner;c.strokeStyle=palette.inner;c.lineWidth=1.5;
  for(let i=0;i<8;i++){
    const a=tip-side*(.08+i*.09),d=radius-5-(i%3)*9;
    const x=f.x+Math.cos(a)*d,y=f.y+Math.sin(a)*d;
    if(f.element==='lightning'){
      c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a+.65)*8,y+Math.sin(a+.65)*8);
      c.lineTo(x+Math.cos(a+.3)*12,y+Math.sin(a+.3)*12);c.stroke();
    }else if(f.element==='ice'){
      c.beginPath();c.moveTo(x,y-4);c.lineTo(x+3,y);c.lineTo(x,y+4);c.lineTo(x-3,y);c.closePath();c.fill();
    }else c.fillRect(x-2,y-2,i%2?3:5,i%2?3:5);
  }
  c.restore();
}
