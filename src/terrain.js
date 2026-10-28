const groundImages={henesys:new Image(),perion:new Image()};
groundImages.henesys.src='assets/terrain/henesys-ground.png';groundImages.perion.src='assets/terrain/perion-ground.png';
const terrainImages={tree:new Image(),rock:new Image()};terrainImages.tree.src='assets/terrain/henesys-tree-top.png';terrainImages.rock.src='assets/terrain/perion-rock-top.png';
const terrainSpacing=340;
function terrainAtCell(ix,iy,region=regionAt(clock)){
  if(tileHash(ix,iy,3)<.32)return null;
  let x=(ix+.23+tileHash(ix,iy,4)*.54)*terrainSpacing,y=(iy+.23+tileHash(ix,iy,5)*.54)*terrainSpacing;
  if(Math.hypot(x,y)<230)return null;
  return {x,y,r:region==='perion'?32:26,type:region==='perion'?'rock':'tree',angle:Math.floor(tileHash(ix,iy,8)*4)*Math.PI/2};
}
function nearbyTerrain(x,y,region=regionAt(clock)){
  let ix=Math.floor(x/terrainSpacing),iy=Math.floor(y/terrainSpacing),out=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){let o=terrainAtCell(ix+dx,iy+dy,region);if(o)out.push(o)}return out;
}
function resolveTerrain(body){
  for(const o of nearbyTerrain(body.x,body.y)){
    let dx=body.x-o.x,dy=body.y-o.y,d=Math.hypot(dx,dy),min=body.r+o.r;
    if(d<min){if(d<.001){dx=1;dy=0;d=1}body.x=o.x+dx/d*min;body.y=o.y+dy/d*min}
  }
}
function steerEnemy(e,angle){
  let vx=Math.cos(angle),vy=Math.sin(angle);
  for(const o of nearbyTerrain(e.x,e.y)){
    let ox=e.x-o.x,oy=e.y-o.y,d=Math.hypot(ox,oy),limit=o.r+e.r+50;
    if(d>0&&d<limit&&(vx*ox+vy*oy)<0){
      let cross=ox*(p.y-o.y)-oy*(p.x-o.x),sign=cross>=0?1:-1;
      vx+=-oy/d*sign*1.5;vy+=ox/d*sign*1.5;
    }
  }
  return Math.atan2(vy,vx);
}
function drawGround(){
  const image=groundImages[regionAt(clock)],left=p.x-W/2,top=p.y-H/2,size=700;
  if(!image.complete||!image.naturalWidth){drawField();return}
  c.save();c.filter='brightness(0.43) saturate(0.63)';
  for(let x=Math.floor(left/size);x<=Math.floor((left+W)/size);x++)for(let y=Math.floor(top/size);y<=Math.floor((top+H)/size);y++)c.drawImage(image,x*size,y*size,size+1,size+1);
  c.restore();c.fillStyle='rgba(13,20,20,.20)';c.fillRect(left,top,W,H);
}
function drawTerrain(){
  const left=p.x-W/2,top=p.y-H/2,region=regionAt(clock);
  let x0=Math.floor(left/terrainSpacing)-1,x1=Math.ceil((left+W)/terrainSpacing)+1,y0=Math.floor(top/terrainSpacing)-1,y1=Math.ceil((top+H)/terrainSpacing)+1;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    let o=terrainAtCell(x,y,region);if(!o)continue;
    c.fillStyle='rgba(25,23,20,.32)';c.beginPath();c.ellipse(o.x,o.y+3,o.r*1.34,o.r*1.12,0,0,7);c.fill();
    const img=terrainImages[o.type];
    if(img.complete&&img.naturalWidth){let h=o.type==='tree'?110:116,w=h*img.naturalWidth/img.naturalHeight;c.save();c.translate(o.x,o.y);c.rotate(o.angle);c.filter='brightness(0.68) saturate(0.72)';c.drawImage(img,-w/2,-h/2,w,h);c.restore()}
    else{c.fillStyle=o.type==='tree'?'#285f32':'#9a6849';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill()}
  }
}
