// Procedural 3D chibi models rendered into the 2D game through an orthographic camera.
const hero3D = (() => {
  try {
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(160,160,false); renderer.setClearColor(0,0); renderer.setPixelRatio(1);
    const scene=new THREE.Scene();
    const camera=new THREE.OrthographicCamera(-2.2,2.2,2.2,-2.2,.1,50);
    camera.position.set(0,5.5,6.5); camera.lookAt(0,1,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x8b8ea3,2));
    const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-3,7,5);scene.add(sun);
    const mat = color => new THREE.MeshStandardMaterial({color,roughness:.7});
    const colors={skin:mat(0xffd7b4),hairRen:mat(0xe9ebee),hairBow:mat(0x73442c),hairEvan:mat(0x75442c),dark:mat(0x342d36),white:mat(0xf2e5d8),red:mat(0xa83648),green:mat(0x3e7754),purple:mat(0x57447e),gold:mat(0xe8b861),steel:mat(0xddebf1),wood:mat(0x965b34),fire:mat(0xff8d2d)};
    const sphere=(parent,m,x,y,z,sx,sy,sz)=>{let o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o};
    const box=(parent,m,x,y,z,sx,sy,sz)=>{let o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);parent.add(o);return o};
    const capsule=(parent,m,x,y,z,r,h)=>{let o=new THREE.Mesh(new THREE.CapsuleGeometry(r,h,4,8),m);o.position.set(x,y,z);parent.add(o);return o};
    function model(kind){
      const root=new THREE.Group(), torso=kind==='sword'?colors.white:kind==='crossbow'?colors.green:colors.purple;
      sphere(root,torso,0,1.05,0,.48,.55,.3);box(root,colors.gold,0,.93,.27,.8,.13,.08);
      const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();leftLeg.position.set(-.22,.76,0);rightLeg.position.set(.22,.76,0);root.add(leftLeg,rightLeg);
      capsule(leftLeg,colors.dark,0,-.25,0,.14,.23);capsule(rightLeg,colors.dark,0,-.25,0,.14,.23);
      sphere(leftLeg,colors.dark,0,-.48,.11,.18,.11,.24);sphere(rightLeg,colors.dark,0,-.48,.11,.18,.11,.24);
      sphere(root,colors.skin,0,1.85,0,.54,.53,.49);
      const hair=kind==='sword'?colors.hairRen:kind==='crossbow'?colors.hairBow:colors.hairEvan;
      sphere(root,hair,0,2.17,-.06,.56,.32,.5);
      for(let i=-2;i<=2;i++)sphere(root,hair,i*.19,2.13,.31,.18,.22,.18);
      sphere(root,colors.dark,-.19,1.84,.459,.045,.065,.03);sphere(root,colors.dark,.19,1.84,.459,.045,.065,.03);
      if(kind==='sword'){capsule(root,colors.hairRen,-.32,2.55,-.08,.1,.43).rotation.z=.25;capsule(root,colors.hairRen,.18,2.56,-.08,.1,.43).rotation.z=-.15;box(root,colors.red,0,1.34,.27,.42,.12,.08)}
      if(kind==='crossbow'){box(root,colors.gold,0,2.31,-.08,.84,.12,.65)}
      if(kind==='staff'){box(root,colors.gold,0,1.48,.28,.3,.12,.08)}
      const leftArm=new THREE.Group(),rightArm=new THREE.Group();leftArm.position.set(-.48,1.32,0);rightArm.position.set(.48,1.32,0);root.add(leftArm,rightArm);
      capsule(leftArm,torso,0,-.18,0,.13,.22);sphere(leftArm,colors.skin,0,-.38,0,.14,.14,.14);
      capsule(rightArm,torso,0,-.18,0,.13,.22);sphere(rightArm,colors.skin,0,-.38,0,.14,.14,.14);
      if(kind==='sword'){
        box(rightArm,colors.wood,0,-.49,.05,.12,.26,.12);box(rightArm,colors.gold,0,-.56,.05,.38,.08,.12);
        const blade=box(rightArm,colors.steel,0,-1.02,.05,.19,.87,.07);blade.rotation.z=.08;
      }else if(kind==='crossbow'){
        const curve=new THREE.EllipseCurve(0,0,.38,.72,-Math.PI/2,Math.PI/2,false,0);
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24).map(v=>new THREE.Vector3(v.x,v.y,0))),new THREE.LineBasicMaterial({color:0xd9a15a}));line.position.set(0,-.35,.08);rightArm.add(line);
        const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.07,.08),new THREE.Vector3(0,.37,.08)]),new THREE.LineBasicMaterial({color:0xffffff}));rightArm.add(string);
      }else{capsule(rightArm,colors.wood,0,-.68,0,.045,.9);sphere(rightArm,colors.fire,0,-1.2,0,.16,.16,.16)}
      scene.add(root);root.visible=false;return {root,leftArm,rightArm,leftLeg,rightLeg};
    }
    const models={sword:model('sword'),crossbow:model('crossbow'),staff:model('staff')};
    return {renderer,scene,camera,models,draw(ctx,player,time){
      for(const m of Object.values(models))m.root.visible=false;
      const m=models[player.weapon];m.root.visible=true;
      // The model faces the current movement or attack direction.
      m.root.rotation.y=player.lookAngle||0;
      const walk=player.moving?Math.sin(time*10):0;
      m.leftLeg.rotation.x=walk*.6;m.rightLeg.rotation.x=-walk*.6;
      m.leftArm.rotation.x=-walk*.38;m.rightArm.rotation.x=walk*.38;
      m.root.position.y=player.moving?Math.abs(walk)*.06:0;
      const a=player.action;
      if(a){const t=a.stage==='windup'?1-a.remaining/a.windup:1-a.remaining/a.follow;
        if(player.weapon==='sword'){m.rightArm.rotation.z=a.stage==='windup'?-1.6-t*.6:-2.2+t*2.9;m.rightArm.rotation.x=-.9;m.leftArm.rotation.x=-.4}
        else if(player.weapon==='crossbow'){m.rightArm.rotation.x=-1.35;m.rightArm.rotation.z=-.35;m.leftArm.rotation.x=-1.4;m.leftArm.rotation.z=a.stage==='windup'?.3+t*.55:.6*(1-t)}
        else{m.rightArm.rotation.x=-1.2;m.rightArm.rotation.z=a.stage==='windup'?-.4-t*.7:-1.1+t*.7;m.leftArm.rotation.x=-.6}
      }
      renderer.render(scene,camera);ctx.drawImage(renderer.domElement,player.x-69,player.y-82,138,138);return true;
    }};
  } catch(e) { console.warn('3D renderer unavailable; using 2D fallback',e);return null; }
})();
