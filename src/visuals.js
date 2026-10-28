// Top-down interpretations of Henesys and Perion and articulated combat poses.
const regionAt = time => time >= TIMING.midBoss ? 'perion' : 'henesys';
const tileHash = (x,y,n=0) => { const v=Math.sin(x*127.1+y*311.7+n*74.7)*43758.5453; return v-Math.floor(v); };
function drawField() {
  const perion=regionAt(clock)==='perion', size=112;
  const left=p.x-W/2, top=p.y-H/2;
  c.fillStyle=perion?'#9f704c':'#76a65a'; c.fillRect(left,top,W,H);
  const x0=Math.floor(left/size)-1,x1=Math.ceil((left+W)/size)+1;
  const y0=Math.floor(top/size)-1,y1=Math.ceil((top+H)/size)+1;
  for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) {
    const px=x*size,py=y*size,h=tileHash(x,y);
    c.fillStyle=perion?(h>.5?'#ac7951':'#986847'):(h>.5?'#82b265':'#6d9e54');
    c.fillRect(px,py,size+1,size+1);
    for(let i=0;i<5;i++) {
      const xx=px+tileHash(x,y,i+1)*size, yy=py+tileHash(y,x,i+9)*size;
      if(perion){
        c.fillStyle=i%2?'#be8c63':'#80593f';c.beginPath();c.ellipse(xx,yy,5+3*h,2+h*3,.3,0,Math.PI*2);c.fill();
        c.strokeStyle='#76523d';c.lineWidth=1;c.beginPath();c.moveTo(xx-4,yy+9);c.lineTo(xx+2,yy+7);c.lineTo(xx+5,yy+9);c.stroke();
      }else{
        c.strokeStyle=i%2?'#c1d98b':'#548b48';c.lineWidth=2;c.beginPath();c.moveTo(xx,yy+3);c.lineTo(xx-2,yy-3);c.moveTo(xx,yy+3);c.lineTo(xx+3,yy-4);c.stroke();
        if(i===0&&h>.45){c.fillStyle='#f7e9bb';c.beginPath();c.arc(xx,yy-5,2.5,0,7);c.fill();}
      }
    }
    if(h>.79){
      const xx=px+35,yy=py+48;
      if(perion){c.fillStyle='#765039';c.beginPath();c.moveTo(xx-13,yy+6);c.lineTo(xx-8,yy-9);c.lineTo(xx+6,yy-13);c.lineTo(xx+15,yy+5);c.closePath();c.fill();c.fillStyle='#c89a70';c.fillRect(xx-5,yy-8,9,3)}
      else {c.fillStyle='#e7d5ad';c.fillRect(xx-3,yy,6,10);c.fillStyle='#ed8d6b';c.beginPath();c.ellipse(xx,yy,10,6,0,Math.PI,0);c.fill();c.fillStyle='#fff1ce';c.fillRect(xx-5,yy-3,3,2);c.fillRect(xx+2,yy-5,3,2)}
    }
  }
}
function drawMonster(e) {
  const isBoss=e.type==='mini'||e.type==='boss';
  const phase=clock*(e.speed>55?11:7)+e.phase;
  const hop=Math.abs(Math.sin(phase))* (isBoss?2:4);
  const lean=Math.sin(phase)* (isBoss?.025:.08);
  const size=e.r*(isBoss?4:3);
  c.fillStyle='rgba(28,23,20,.22)';c.beginPath();c.ellipse(e.x,e.y+e.r*.9,e.r*1.05,e.r*.27,0,0,7);c.fill();
  c.save();c.translate(e.x,e.y-hop);c.rotate(lean);c.scale(e.facing,1+(isBoss?0:Math.sin(phase*2)*.035));
  if(!drawSprite(e.type,0,0,size,size)){c.fillStyle=e.color;c.beginPath();c.arc(0,0,e.r,0,7);c.fill()}
  c.restore();
}
function drawEnemyHealth(e) {
  const boss=e.type==='mini'||e.type==='boss';
  const width=boss?88:Math.max(30,e.r*2.4), height=boss?6:4;
  const x=e.x-width/2,y=e.y-e.r*(boss?2:1.5)-11;
  const ratio=Math.max(0,Math.min(1,e.hp/e.maxhp));
  c.fillStyle='rgba(29,24,25,.85)';c.fillRect(x-1,y-1,width+2,height+2);
  c.fillStyle=boss?'#f06f6a':'#d7615a';c.fillRect(x,y,width*ratio,height);
}
function drawStatusEffects(e){
  if(e.iceRemaining>0){
    const opacity=Math.min(1,e.iceRemaining/.35);
    c.save();c.globalAlpha=opacity;c.fillStyle='rgba(82,187,255,.25)';c.beginPath();c.arc(e.x,e.y,e.r+2,0,7);c.fill();
    c.fillStyle='#bceeff';for(let i=0;i<3;i++){const a=i*2.1+clock*.6;c.fillRect(e.x+Math.cos(a)*e.r-2,e.y+Math.sin(a)*e.r-2,4,4)}c.restore();
  }
  if(e.fire>0){
    c.save();c.fillStyle='#ff983e';for(let i=0;i<3;i++){let x=e.x-e.r*.65+i*e.r*.6,y=e.y+e.r*.4-Math.abs(Math.sin(clock*9+i))*e.r;c.fillRect(x,y,4,6)}
    c.fillStyle='#ffda76';c.fillRect(e.x-2,e.y-e.r-4-(clock*12%8),3,3);c.restore();
  }
}
function limb(x1,y1,x2,y2,color,width=6){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function drawHero() {
  const weapon=p.weapon, facing=p.facing||1, moving=p.moving||0;
  const step=moving?Math.sin(clock*11)*5:0, bob=moving?Math.abs(Math.sin(clock*11))*2:0;
  const anim=p.action, wind=anim&&anim.stage==='windup'?1-anim.remaining/anim.windup:0;
  const follow=anim&&anim.stage==='follow'?1-anim.remaining/anim.follow:1;
  const acting=!!anim;
  c.save();c.translate(p.x,p.y-bob);c.scale(facing,1);
  c.fillStyle='rgba(28,23,20,.25)';c.beginPath();c.ellipse(0,18+bob,15,5,0,0,7);c.fill();
  limb(-5,9,-7+step,18,'#54443e',6);limb(5,9,7-step,18,'#54443e',6);
  c.fillStyle=weapon==='sword'?'#f1e5d9':weapon==='crossbow'?'#54815c':'#6463a4';
  c.beginPath();c.roundRect(-10,-9,20,23,5);c.fill();
  c.fillStyle=weapon==='sword'?'#99444c':weapon==='crossbow'?'#dfbc6f':'#dcc98b';c.fillRect(-10,3,20,4);
  c.fillStyle='#f6d6b3';c.beginPath();c.arc(0,-17,11,0,7);c.fill();
  c.fillStyle=weapon==='sword'?'#e6e5df':weapon==='crossbow'?'#73513c':'#754d39';
  c.beginPath();c.arc(0,-20,11,Math.PI,Math.PI*2);c.lineTo(11,-18);c.lineTo(6,-22);c.lineTo(-2,-18);c.lineTo(-10,-19);c.fill();
  if(weapon==='sword'){c.fillStyle='#e7dfd8';c.beginPath();c.ellipse(-6,-31,3,9,-.3,0,7);c.ellipse(1,-32,3,9,.1,0,7);c.fill()}
  c.fillStyle='#303039';c.fillRect(3,-18,2,2);c.fillStyle='#d88886';c.fillRect(7,-14,2,1);
  if(weapon==='sword'){
    const angle=acting?(anim.stage==='windup'?-1.65-wind*.5:-2.15+follow*2.9):-.65;
    const hx=9+Math.cos(angle)*12,hy=-2+Math.sin(angle)*12;
    limb(-7,-4,-11,6,'#f6d6b3');limb(7,-5,hx,hy,'#f6d6b3');
    c.save();c.translate(hx,hy);c.rotate(angle);c.strokeStyle='#e8f2f0';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(24,0);c.stroke();c.strokeStyle='#77624b';c.lineWidth=4;c.beginPath();c.moveTo(-3,-5);c.lineTo(-3,5);c.stroke();c.restore();
  }else if(weapon==='crossbow'){
    const pull=acting?(anim.stage==='windup'?wind:Math.max(0,1-follow*5)):0;
    limb(6,-5,15,-4,'#f6d6b3');limb(-6,-5,9-pull*11,-4,'#f6d6b3');
    c.strokeStyle='#c29351';c.lineWidth=3;c.beginPath();c.moveTo(15,-18);c.quadraticCurveTo(27,-4,15,10);c.stroke();
    c.strokeStyle='#f6ead6';c.lineWidth=1.5;c.beginPath();c.moveTo(15,-18);c.lineTo(15-pull*12,-4);c.lineTo(15,10);c.stroke();
    if(acting&&anim.stage==='windup'){c.strokeStyle='#f8e8b9';c.beginPath();c.moveTo(3-pull*8,-4);c.lineTo(24,-4);c.stroke()}
  }else{
    let lift=acting?(anim.stage==='windup'?wind:1-follow):0;
    limb(-7,-4,-11,4,'#f6d6b3');limb(7,-5,14,-3-lift*9,'#f6d6b3');
    c.strokeStyle='#a47a50';c.lineWidth=4;c.beginPath();c.moveTo(12,10);c.lineTo(18,-19-lift*6);c.stroke();
    c.fillStyle=acting?'#ffb24c':'#c7b9ff';c.beginPath();c.arc(19,-21-lift*6,5,0,7);c.fill();
  }
  c.restore();
}
function drawProjectile(s){
 c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));
 const color={physical:'#f4dfad',fire:'#ff8649',ice:'#9adfff',lightning:'#ffec74'}[s.element]||'#ed87a3';
 if(s.kind==='crossbow'){c.fillStyle=color;c.fillRect(-11,-1,21,3);c.fillRect(6,-3,5,7);c.fillStyle='#e7e1c9';c.fillRect(-10,-4,3,8)}
 else if(s.kind==='staff'){c.fillStyle=color;c.fillRect(-8,-5,15,10);c.fillStyle='#fff2ce';c.fillRect(-1,-3,7,6)}
 else {c.fillStyle='#ed87a3';c.beginPath();c.arc(0,0,s.r,0,7);c.fill()}
 c.restore();
}
