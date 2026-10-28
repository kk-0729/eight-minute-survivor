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
    fire:{outer:'rgba(255,112,47,.85)',inner:'rgba(255,216,123,.9)',impact:'#ffa04e'},
    ice:{outer:'rgba(102,199,255,.83)',inner:'rgba(224,251,255,.91)',impact:'#b5ebff'},
    lightning:{outer:'rgba(255,206,74,.87)',inner:'rgba(255,249,177,.92)',impact:'#ffe47a'},
    physical:{outer:'rgba(247,178,218,.82)',inner:'rgba(255,242,252,.92)',impact:'#fce1ed'}
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
  // Only a whisper of the complete attack sector is shown; the strong trail
  // follows the same interpolated angle used by hit detection.
  c.beginPath();c.moveTo(f.x,f.y);
  c.arc(f.x,f.y,radius,aim-SWORD_HALF_ANGLE,aim+SWORD_HALF_ANGLE);
  c.closePath();c.fillStyle='rgba(245,235,238,.035)';c.fill();
  function ribbon(outer,width,color){
    const steps=18,span=tip-tail;
    if(Math.abs(span)<.0001)return;
    c.beginPath();
    for(let i=0;i<=steps;i++){
      const t=i/steps,a=tail+span*t;
      if(i===0)c.moveTo(f.x+outer*Math.cos(a),f.y+outer*Math.sin(a));
      else c.lineTo(f.x+outer*Math.cos(a),f.y+outer*Math.sin(a));
    }
    for(let i=steps;i>=0;i--){
      const t=i/steps,a=tail+span*t;
      const inner=outer-(3+width*Math.sin(Math.PI*t));
      c.lineTo(f.x+inner*Math.cos(a),f.y+inner*Math.sin(a));
    }
    c.closePath();c.fillStyle=color;c.fill();
  }
  ribbon(radius,15,palette.outer);
  ribbon(radius-11,5,palette.inner);
  c.fillStyle=palette.inner;
  for(let i=0;i<3;i++){
    const a=tip-side*(.1+i*.17),d=radius-10-i*9;
    c.fillRect(f.x+Math.cos(a)*d-2,f.y+Math.sin(a)*d-2,4,4);
  }
  c.restore();
}
