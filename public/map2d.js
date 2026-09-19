// Original code-drawn pixel art; the camera never mutates authoritative world state.
const TILE = 24;
const PAD = 72;
const DAY_MS = 1_800_000;
const CLASS_COLORS = {builder:'#c78a4c',keeper:'#78a868',pathfinder:'#e0b65b',connector:'#819fce'};
const LANDMARKS = [
  ['home',7,22,'Nơi trú ẩn'], ['bridge',16,17,'Cầu qua sông'],
  ['gate',14,10,'Cống tưới'], ['farm',10,12,'Ruộng chung'],
  ['depot',11,19,'Kho chung'], ['west',6,8,'Làng Thượng'],
  ['east',24,12,'Làng Hạ'], ['ruin',25,25,'Tàn tích'],
];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const noise = (x,y,s=0) => {
  let n = Math.imul(x+s*129,374761393)^Math.imul(y+17,668265263);
  n = Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
};
export function projectPoint(x,z,v) {
  return [v.width/2+(x-v.x)*v.tile,v.height/2+(z-v.z)*v.tile];
}
export function unprojectPoint(px,py,v) {
  return {x:(px-v.width/2)/v.tile+v.x,z:(py-v.height/2)/v.tile+v.z};
}
export function isMapTile(x,z) {
  return Number.isInteger(x)&&Number.isInteger(z)&&x>=1&&x<=30&&z>=1&&z<=30;
}
function rect(c,x,y,w,h,color) {
  c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),w,h);
}
function road(x,z) {
  return (x===7&&z>=8&&z<=22)||(z===17&&x>=7&&x<=25)||(x===24&&z>=12&&z<=17);
}
function freeDecoration(x,z) {
  return x>1&&x<30&&z>1&&z<30&&(x<14||x>18)&&!road(Math.round(x),Math.round(z))&&!LANDMARKS.some(p=>Math.hypot(x-p[1],z-p[2])<1.7);
}
export class Map2D {
  constructor(container,choose,travel) {
    this.container=container;
    this.canvas=document.createElement('canvas');
    this.canvas.setAttribute('aria-label','Bản đồ pixel thung lũng. Nhấp để chọn hoặc di chuyển, kéo để xem, cuộn để phóng to.');
    Object.assign(this.canvas.style,{touchAction:'none',imageRendering:'pixelated',cursor:'grab'});
    container.replaceChildren(this.canvas);
    this.ctx=this.canvas.getContext('2d',{alpha:false});
    this.choose=choose; this.travel=travel;
    this.zoom=1; this.center={x:15.5,z:15.5}; this.showLabels=true; this.targets=[];
    this.animationTime=0;this.lastAnimationAt=null;this.actorPositions=new Map();
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.terrain=this.makeTerrain();
    this.layer=document.createElement('canvas');
    this.layer.width=this.layer.height=this.terrain.width;
    this.layerContext=this.layer.getContext('2d');
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,cx:this.center.x,cz:this.center.z,moved:false};
      this.canvas.setPointerCapture?.(e.pointerId); this.canvas.style.cursor='grabbing';
    });
    this.canvas.addEventListener('pointermove',e=>{
      const p=this.pointer; if(!p||p.id!==e.pointerId)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(Math.hypot(dx,dy)>5)p.moved=true;
      if(p.moved){this.center.x=p.cx-dx/this.tile;this.center.z=p.cz-dy/this.tile;this.clampView();}
    });
    const end=(e,cancelled=false)=>{
      const p=this.pointer;if(!p||p.id!==e.pointerId)return;
      this.pointer=null;this.canvas.style.cursor='grab';
      if(this.canvas.hasPointerCapture?.(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
      if(!cancelled&&!p.moved&&this.state){const b=this.canvas.getBoundingClientRect();this.pick(e.clientX-b.left,e.clientY-b.top);}
    };
    this.canvas.addEventListener('pointerup',e=>end(e));
    this.canvas.addEventListener('pointercancel',e=>end(e,true));
    this.canvas.addEventListener('lostpointercapture',()=>{this.pointer=null;this.canvas.style.cursor='grab';});
    this.canvas.addEventListener('wheel',e=>{
      e.preventDefault();const b=this.canvas.getBoundingClientRect();
      this.zoomBy(Math.exp(-clamp(e.deltaY,-100,100)*.0025),e.clientX-b.left,e.clientY-b.top);
    },{passive:false});
  }
  get view(){return {width:this.w||1,height:this.h||1,x:this.center.x,z:this.center.z,tile:this.tile||1};}
  project(x,z){return projectPoint(x,z,this.view);}
  unproject(x,y){return unprojectPoint(x,y,this.view);}
  zoomBy(factor,px=this.w/2,py=this.h/2){
    if(!Number.isFinite(factor)||factor<=0)return;
    const before=this.unproject(px,py);this.zoom=clamp(this.zoom*factor,.7,3.5);
    this.tile=(this.baseTile||1)*this.zoom;const after=this.unproject(px,py);
    this.center.x+=before.x-after.x;this.center.z+=before.z-after.z;this.clampView();
  }
  resetView(){this.zoom=1;this.center={x:15.5,z:15.5};this.tile=this.baseTile||1;}
  focus(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))return;
    this.zoom=Math.max(this.zoom,1.8);this.tile=(this.baseTile||1)*this.zoom;this.center={x,z};this.clampView();
  }
  toggleLabels(){this.showLabels=!this.showLabels;return this.showLabels;}
  clampView(){
    const hx=Math.min(16.5,(this.w||1)/(2*(this.tile||1))),hz=Math.min(16.5,(this.h||1)/(2*(this.tile||1)));
    this.center.x=clamp(this.center.x,-1+hx,32-hx);this.center.z=clamp(this.center.z,-1+hz,32-hz);
  }
  pick(px,py){
    if(!this.state)return;const p=this.unproject(px,py);
    if(!this.preview){
      const sprite=[...(this.spriteTargets||[])].reverse().find(t=>p.x>=t.left&&p.x<=t.right&&p.z>=t.top&&p.z<=t.bottom);
      if(sprite){this.choose(sprite.id);return;}
    }
    const nearest=this.targets.map(t=>({t,d:Math.hypot(p.x-t.x,p.z-t.z)})).sort((a,b)=>a.d-b.d)[0];
    if(!this.preview&&nearest&&nearest.d<=.85){this.choose(nearest.t.id);return;}
    if(this.preview){
      const x=Math.round(p.x),z=Math.round(p.z);if(isMapTile(x,z))this.travel({x,z});
    }else if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=1&&p.x<=30&&p.z>=1&&p.z<=30){
      this.travel(p);
    }
  }
  makeTerrain(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32*TILE+PAD*2;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    rect(c,0,0,canvas.width,canvas.height,'#245a78');
    for(let y=0;y<canvas.height;y+=6)for(let x=0;x<canvas.width;x+=6){
      const n=noise(x,y,2);if(n>.65)rect(c,x,y,6,6,n>.9?'#286481':'#255e7c');
    }
    c.save();c.translate(PAD,PAD);
    // Shores occupy the outside ring; every land tile 1–30 remains land.
    for(let z=0;z<32;z++)for(let x=0;x<32;x++){
      const px=x*TILE,py=z*TILE,river=x>=15&&x<=17,border=x===0||x===31||z===0||z===31;
      if(river){
        rect(c,px,py,TILE,TILE,x===16?'#277b9b':'#3196aa');
        for(let j=0;j<9;j++)rect(c,px+Math.floor(noise(x,z,j+6)*11)*2,py+Math.floor(noise(z,x,j+31)*11)*2,4,2,j%2?'#358fa5':'#3c9fb0');
        if(x===15){rect(c,px,py,3,TILE,'#70bdb7');rect(c,px,py+2,1,9,'#b4daca');}
        if(x===17){rect(c,px+21,py,3,TILE,'#69b8b4');rect(c,px+23,py+11,1,7,'#b4daca');}
        continue;
      }
      if(border){
        const inset=4+Math.floor(noise(x,z)*3)*2;rect(c,px,py,TILE,TILE,'#338da0');
        let sx=px,sy=py,sw=TILE,sh=TILE;
        if(x===0){sx+=inset;sw-=inset;}if(x===31)sw-=inset;
        if(z===0){sy+=inset;sh-=inset;}if(z===31)sh-=inset;
        rect(c,sx,sy,sw,sh,'#79c1b5');rect(c,sx+(x===0?3:0),sy+(z===0?3:0),Math.max(0,sw-3),Math.max(0,sh-3),'#d4c98d');continue;
      }
      const grass=['#6f9c50','#78a655','#80ad5d','#86b25f','#729e52'][Math.floor(noise(Math.floor(x/2),Math.floor(z/2),13)*5)];
      rect(c,px,py,TILE,TILE,grass);
      for(let j=0;j<13;j++)rect(c,px+Math.floor(noise(x,z,j+5)*11)*2,py+Math.floor(noise(z,x,j+27)*11)*2,j%3?2:4,2,j%2?'#8bb761':'#69964c');
      if(x===1||x===18){rect(c,px,py,4,TILE,'#c7c283');rect(c,px+4,py+(z%3)*4,2,8,'#a9b574');}
      if(x===30||x===14){rect(c,px+20,py,4,TILE,'#c7c283');rect(c,px+18,py+(z%3)*4,2,8,'#a9b574');}
      if(z===1)rect(c,px,py,TILE,4,'#c7c283');if(z===30)rect(c,px,py+20,TILE,4,'#c7c283');
      if(road(x,z)){
        if((x===7&&z>=8&&z<=22)||(x===24&&z>=12&&z<=17)){rect(c,px+7,py,10,TILE,'#9d9c64');rect(c,px+8,py,8,TILE,'#c4b47a');}
        if(z===17){rect(c,px,py+7,TILE,10,'#9d9c64');rect(c,px,py+8,TILE,8,'#c4b47a');}
        rect(c,px+10,py+10,2,1,'#d9c991');
      }else if(noise(x,z,72)>.91&&freeDecoration(x,z)){
        rect(c,px+8,py+12,1,3,'#4f8244');rect(c,px+7,py+11,3,2,'#e6d997');rect(c,px+17,py+6,2,2,'#f0e0af');
      }
    }
    for(const [id,x,z] of LANDMARKS)if(['west','east','home','depot'].includes(id)){
      rect(c,x*TILE-14,z*TILE-10,52,40,'#acaa72');rect(c,x*TILE-8,z*TILE-14,40,48,'#b8b17a');
      for(let j=0;j<15;j++)rect(c,x*TILE-10+Math.floor(noise(x,z,j)*44),z*TILE-10+Math.floor(noise(z,x,j)*39),2,1,'#d0c38c');
    }
    c.restore();return canvas;
  }
  tree(c,x,y,seed,small=false){
    c.save();c.translate(Math.round(x),Math.round(y));if(small)c.scale(.72,.72);
    rect(c,-8,-2,21,8,'#426f4073');rect(c,-2,-8,4,10,'#765332');rect(c,-1,-7,1,8,'#b28b52');
    const a=seed%3===0?['#285e48','#347e4c','#4b9654','#77ad5c']:['#2d6846','#42884b','#60a34f','#8bbb61'];
    rect(c,-8,-21,15,18,a[0]);rect(c,-11,-18,21,11,a[0]);rect(c,-7,-24,13,19,a[1]);rect(c,-10,-19,19,11,a[1]);
    rect(c,-6,-24,10,14,a[2]);rect(c,-8,-20,12,8,a[2]);rect(c,-5,-24,6,3,a[3]);rect(c,-8,-19,4,5,a[3]);
    rect(c,5,-16,3,5,a[0]);rect(c,-2,-8,6,3,a[0]);c.restore();
  }
  stone(c,x,y,seed=0){
    rect(c,x-10,y-2,23,7,'#466c3e75');rect(c,x-8,y-10,17,13,'#596b69');rect(c,x-11,y-6,22,7,'#758780');
    rect(c,x-6,y-14,11,13,'#92a39a');rect(c,x-8,y-10,7,7,'#b0beb0');rect(c,x-5,y-14,8,3,'#c6cdbc');
    rect(c,x+3,y-9,4,9,'#74847f');rect(c,x+12,y-2,5,4,'#a2ad99');if(seed%2)rect(c,x-5,y-5,4,3,'#7b975d');
  }
  house(c,x,y,variant=0,tiny=false){
    c.save();c.translate(Math.round(x),Math.round(y));if(tiny)c.scale(.8,.8);
    rect(c,-12,-1,32,9,'#486e4270');rect(c,-12,-14,26,19,'#715844');rect(c,-10,-13,22,16,'#e0cb96');
    rect(c,-10,-1,22,4,'#b49c71');rect(c,9,-12,3,13,'#ac976e');rect(c,-3,-5,6,10,'#594c3d');rect(c,-2,-4,4,8,'#826646');
    rect(c,-8,-9,4,4,'#5b8282');rect(c,5,-9,4,4,'#5b8282');rect(c,-8,-9,4,1,'#b0ccba');rect(c,5,-9,4,1,'#b0ccba');
    const a=variant===1?['#3e6670','#557f82','#739a95','#92b0a2']:['#794b39','#a25d3f','#bd7949','#d99958'];
    rect(c,-15,-18,32,7,a[0]);rect(c,-12,-23,26,9,a[1]);rect(c,-9,-27,20,10,a[2]);rect(c,-5,-30,12,7,a[3]);
    rect(c,-12,-18,26,2,a[2]);rect(c,-8,-24,18,1,a[3]);for(let i=0;i<5;i++)rect(c,-9+i*5,-21,1,4,a[0]);
    rect(c,6,-30,5,10,'#7b7b65');rect(c,5,-31,7,3,'#b8b29a');rect(c,-4,4,8,2,'#d6c491');c.restore();
  }
  ruin(c,x,y){
    rect(c,x-25,y-16,50,36,'#789363');rect(c,x-19,y-13,36,29,'#8e9a78');
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)rect(c,x-16+i*8,y-10+j*8,7,7,(i+j)%3?'#a6ad8f':'#98a382');
    for(const [dx,dy,h] of [[-20,-8,25],[13,-9,29],[-20,13,17],[12,12,14]]){
      rect(c,x+dx+3,y+dy,11,4,'#526c4c75');rect(c,x+dx,y+dy-h,8,h,'#697970');
      rect(c,x+dx,y+dy-h,5,h-2,'#aab29b');rect(c,x+dx-1,y+dy-h,10,3,'#c1c6aa');rect(c,x+dx,y+dy-6,6,3,'#618450');
    }
    rect(c,x-17,y-32,32,7,'#899780');rect(c,x-17,y-34,32,3,'#b4bca0');rect(c,x-3,y-33,4,7,'#70836b');rect(c,x+23,y+11,7,5,'#aab397');
  }
  person(c,x,y,color,you=false,phase=0,role='',hungry=false){
    x=Math.round(x);y=Math.round(y);rect(c,x-4,y+1,9,3,'#355c4260');
    if(you){rect(c,x-5,y+1,11,1,'#ffe19a');rect(c,x-6,y-1,1,3,'#ffe19a');rect(c,x+6,y-1,1,3,'#ffe19a');}
    rect(c,x-2,y-2,2,4+phase,'#4f5144');rect(c,x+1,y-2,2,4-phase,'#4f5144');rect(c,x-3,y-7,7,6,color);
    rect(c,x-4,y-6+phase,1,4,'#ddb98b');rect(c,x+4,y-6-phase,1,4,'#ddb98b');rect(c,x-2,y-12,5,5,'#e2bb89');
    rect(c,x-3,y-14,6,3,you?'#8a5735':'#766644');rect(c,x+1,y-10,1,1,'#574b3a');if(!you)rect(c,x-4,y-12,9,1,'#cbbb78');
    if(role==='builder'){
      rect(c,x-4,y-13,8,2,'#d9b77a');rect(c,x-2,y-16,5,3,'#ebc98b');
      rect(c,x-2,y-6,4,5,'#866343');rect(c,x+5,y-9+phase,1,8,'#85603b');rect(c,x+3,y-10+phase,5,3,'#c2cdc0');
    }else if(role==='keeper'){
      rect(c,x-3,y-14,6,3,'#47744f');rect(c,x-4,y-12,9,1,'#a9c580');
      rect(c,x+4,y-3+phase,5,4,'#9da49b');rect(c,x+5,y-5+phase,3,1,'#d6d9bc');rect(c,x+8,y-4+phase,3,1,'#b9c7b0');
    }else if(role==='pathfinder'){
      rect(c,x-4,y-8,3,7,'#80623d');rect(c,x-3,y-14,6,3,'#b8904d');rect(c,x-5,y-12,10,1,'#e2c77d');
      rect(c,x+6,y-10,1,13,'#79603f');rect(c,x+5,y-11,3,2,'#d4c493');
    }else if(role==='connector'){
      rect(c,x-3,y-8,7,2,'#e8c87d');rect(c,x+2,y-6,2,4,'#e8c87d');
      rect(c,x+4,y-3+phase,4,4,'#926748');rect(c,x+4,y-3+phase,4,1,'#d5ac69');
    }else if(role==='fisher'){
      rect(c,x-4,y-13,9,2,'#dccb89');rect(c,x-2,y-15,5,2,'#b9a865');
      rect(c,x+6,y-17,1,19,'#8a693c');rect(c,x+7,y-17,4,1,'#d5ddbf');rect(c,x+10,y-16,1,7,'#d5ddbf');
      rect(c,x-7,y-3,3,4,'#a4b4a5');
    }else if(role==='farmer'){
      rect(c,x-5,y-12,11,2,'#d5bf79');rect(c,x-2,y-15,5,3,'#e8d291');
      rect(c,x+6,y-11,1,13,'#85603b');rect(c,x+4,y-12,5,2,'#b7c1ad');rect(c,x-2,y-6,4,5,'#89754c');
    }
    if(hungry){
      rect(c,x-4,y-24,9,7,'#513e33');rect(c,x-3,y-23,7,5,'#edbd73');
      rect(c,x-1,y-22,3,1,'#704b32');rect(c,x,y-21,1,2,'#704b32');
    }
  }
  cart(c,x,y,cart,time){
    c.save();c.translate(Math.round(x),Math.round(y));
    // Heading points in travel direction; the handle is the front of the cart.
    if(Number.isFinite(cart.heading))c.rotate(Math.round((cart.heading-Math.PI/2)/(Math.PI/2))*Math.PI/2);
    rect(c,-13,-3,29,11,'#355c4260');rect(c,-10,-7,22,12,'#70583c');rect(c,-8,-10,18,11,'#c3a367');
    for(let j=0;j<4;j++)rect(c,-7+j*5,-9,1,9,'#997b4d');
    rect(c,-12,-4,4,9,'#394c44');rect(c,10,-4,4,9,'#394c44');
    const spoke=cart.moving&&time?Math.floor(time*7)%2:0;
    rect(c,-11,-1+spoke,2,2,'#c6ae7d');rect(c,11,-1-spoke,2,2,'#c6ae7d');rect(c,-2,4,3,9,'#88673e');
    if(cart.cargo>0){rect(c,-6,-15,8,9,'#cfbc7d');rect(c,2,-13,7,7,'#e2ce91');rect(c,-5,-14,6,1,'#eee0a6');}
    c.restore();
    if(cart.paused||cart.status==='blocked'){
      rect(c,x+10,y-20,8,8,'#513e33');rect(c,x+12,y-18,1,4,'#edbd73');rect(c,x+15,y-18,1,4,'#edbd73');
    }
  }
  label(text,x,y,selected=false,village=false){
    const c=this.ctx;c.font=`${village?'600 12':'500 11'}px system-ui, sans-serif`;
    const width=Math.ceil(c.measureText(text).width);c.fillStyle=selected?'#283b30f2':'#203d36df';
    c.fillRect(Math.round(x-width/2-9),Math.round(y-11),width+18,23);c.fillStyle=selected?'#e5c982':'#819a74';
    c.fillRect(Math.round(x-width/2-9),Math.round(y+11),width+18,1);c.textAlign='center';c.textBaseline='middle';
    c.fillStyle=selected?'#fff0ba':'#f1eacd';c.fillText(text,Math.round(x),Math.round(y+1));
  }
  draw(state,selected,_angle=0,preview=null){
    this.preview=preview;this.spriteTargets=[];
    this.state=state;this.w=Math.max(1,this.container.clientWidth);this.h=Math.max(1,this.container.clientHeight);
    this.baseTile=Math.min(this.w/37,this.h/36);this.tile=this.baseTile*this.zoom;this.clampView();
    const dpr=Math.min(window.devicePixelRatio||1,2),width=Math.round(this.w*dpr),height=Math.round(this.h*dpr);
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;this.canvas.style.width=`${this.w}px`;this.canvas.style.height=`${this.h}px`;}
    const display=this.ctx;display.setTransform(dpr,0,0,dpr,0,0);display.imageSmoothingEnabled=false;rect(display,0,0,this.w,this.h,'#245a78');
    // Draw world pixels at their native resolution, then scale the complete
    // scene with nearest-neighbour sampling. Labels stay at readable CSS size.
    const c=this.layerContext;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.layer.width,this.layer.height);
    const [ox,oy]=this.project(-.5,-.5),scale=this.tile/TILE;c.save();c.translate(PAD,PAD);c.drawImage(this.terrain,-PAD,-PAD);
    const now=performance.now(),elapsed=this.lastAnimationAt===null?0:Math.min(.05,Math.max(0,(now-this.lastAnimationAt)/1000));
    this.lastAnimationAt=now;if(!this.reducedMotion?.matches)this.animationTime+=elapsed;
    const time=this.reducedMotion?.matches?0:this.animationTime;
    for(let i=0;i<27;i++)rect(c,15*TILE+5+Math.floor(noise(i,1)*59),(i*31+Math.floor(time*3))%(32*TILE),5+i%4,1,i%3?'#71b9bd70':'#b1d7c680');
    const crop=clamp(state?.crop||0,0,1),fx=9*TILE,fy=11*TILE;
    rect(c,fx-2,fy-2,TILE*3+4,TILE*3+4,'#b4ae71');rect(c,fx,fy,TILE*3,TILE*3,state?.gate?'#685d3c':'#817044');
    for(let row=0;row<9;row++){
      rect(c,fx+3,fy+3+row*8,66,2,'#544c35');
      for(let col=0;col<8;col++){
        const x=fx+5+col*8,y=fy+3+row*8;rect(c,x,y-1-Math.round(crop*4),2,3+Math.round(crop*4),crop>.75?'#d9c15f':'#719847');
        if(crop>.2){rect(c,x-2,y-1,2,2,crop>.75?'#bba24a':'#8ca957');rect(c,x+2,y-3,2,2,crop>.75?'#e9d17a':'#8ca957');}
      }
    }
    if(state?.gate){rect(c,13*TILE+20,10*TILE+12,4,3*TILE+7,'#61a6a0');rect(c,12*TILE,13*TILE+16,2*TILE,3,'#61a6a0');}
    const by=17*TILE;
    for(let j=0;j<18;j++){
      if(!state?.bridge&&j>4&&j<14)continue;
      rect(c,15*TILE+j*4,by+4+(!state?.bridge&&j===4?3:0),3,16,j%3?'#b08a55':'#d2aa6a');
    }
    if(state?.bridge){rect(c,15*TILE,by+3,TILE*3,2,'#76583d');rect(c,15*TILE,by+19,TILE*3,2,'#76583d');}
    for(const x of [15*TILE,18*TILE-3]){rect(c,x,by,3,8,'#dfbf7c');rect(c,x,by+16,3,8,'#dfbf7c');}
    const gx=14*TILE+12,gy=10*TILE+12;
    rect(c,gx-5,gy-9,19,19,'#6d7b68');rect(c,gx-6,gy-11,6,22,'#b8b895');rect(c,gx+11,gy-11,6,22,'#b8b895');
    rect(c,gx,gy-6,11,12,state?.gate?'#53a3ab':'#695a40');rect(c,gx-7,gy-13,25,4,'#d1c8a0');
    if(!state?.gate)for(let j=0;j<3;j++)rect(c,gx+1+j*4,gy-6,1,12,'#b19864');
    this.targets=state?LANDMARKS.map(([id,x,z,label])=>({id,x,z,label})):[];
    const player=state?.players[state.you],route=this.route||[];
    if(player&&route.length){
      c.save();c.strokeStyle='#f6e1a6aa';c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();
      c.moveTo((player.x+.5)*TILE,(player.z+.5)*TILE);
      for(const p of route)c.lineTo((p.x+.5)*TILE,(p.z+.5)*TILE);
      c.stroke();c.restore();
      const end=route.at(-1),x=(end.x+.5)*TILE,y=(end.z+.5)*TILE;
      rect(c,x-4,y-1,9,2,'#fff0ba');rect(c,x-1,y-4,2,9,'#fff0ba');
    }
    const cart=state?.cart;
    if(selected==='depot'&&Array.isArray(cart?.route)&&cart.route.length>1){
      c.save();c.strokeStyle=cart.paused?'#dca874b3':'#eff0c29c';c.lineWidth=2;c.setLineDash([3,6]);c.beginPath();
      let started=false;
      for(const p of cart.route){
        if(!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
        if(started)c.lineTo((p.x+.5)*TILE,(p.z+.5)*TILE);else{c.moveTo((p.x+.5)*TILE,(p.z+.5)*TILE);started=true;}
      }
      c.stroke();c.restore();
    }
    const objects=[];
    for(const [id,x,z] of LANDMARKS){
      if(['west','east'].includes(id)){
        objects.push({id,kind:'house',x:x-.8,z:z-.55,variant:id==='east'?1:0});
        objects.push({id,kind:'house',x:x+.85,z:z+.3,variant:id==='east'?1:0,tiny:true});
        objects.push({id,kind:'house',x:x-.45,z:z+1.15,variant:id==='east'?1:0,tiny:true});
      }else if(id==='home'||id==='depot')objects.push({id,kind:'house',x,z,variant:id==='depot'?1:0});
      else if(id==='ruin')objects.push({id,kind:'ruin',x,z});
    }
    // Preview vegetation has no interactions. Live forests follow actual resources.
    const resources=state?.resources||Array.from({length:34},(_,i)=>({id:`preview-${i}`,type:i%3?'wood':'stone',x:2+(i*7)%27,z:2+(i*11)%27,remaining:8})).filter(r=>freeDecoration(r.x,r.z));
    for(const [i,r] of resources.entries()){
      if(r.remaining<=0){if(r.type==='wood'){rect(c,r.x*TILE+9,r.z*TILE+10,6,5,'#775637');rect(c,r.x*TILE+9,r.z*TILE+10,6,2,'#c49b62');}continue;}
      if(state)this.targets.push({id:r.id,x:r.x,z:r.z,label:r.type==='wood'?`Gỗ · ${r.remaining}`:`Đá · ${r.remaining}`});
      objects.push({id:r.id,kind:r.type,x:r.x,z:r.z,seed:i});
      if(r.type==='wood')for(let j=0;j<4;j++){
        const x=r.x+[-.65,.65,-.4,.5][j],z=r.z+[-.6,-.5,.5,.65][j];
        if(freeDecoration(x,z)&&!(state?.buildings||[]).some(b=>Math.hypot(b.x-x,b.z-z)<1))objects.push({id:r.id,kind:'wood',x,z,seed:i+j,small:true});
      }
    }
    for(const b of state?.buildings||[]){this.targets.push({id:b.id,x:b.x,z:b.z,label:b.kind==='house'?'Nhà nhỏ':'Kho cá nhân'});objects.push({id:b.id,kind:'house',x:b.x,z:b.z,variant:b.kind==='storehouse'?1:0});}
    if(cart){
      const x=Number.isFinite(cart.x)?cart.x:11,z=Number.isFinite(cart.z)?cart.z:19;
      objects.push({...cart,id:'depot',kind:'cart',x,z});
    }
    for(const n of state?.npcs||[]){
      const v=LANDMARKS.find(p=>p[0]===n.village);if(!v)continue;
      const i=Number(n.id?.split('-').at(-1))||1,a=i*2.4,d=1.5+(i%3)*.34;
      // A tiny idle shift is decorative only; village membership comes from the server.
      const idle=time?Math.sin(time*.55+i)*.035:0,x=v[1]+Math.cos(a)*d+idle,z=v[2]+Math.sin(a)*d;
      const role=n.job==='Đánh cá'?'fisher':'farmer';
      this.targets.push({id:n.id,x,z,label:`${n.name} · ${n.job}${n.hungryDays>0?' · Thiếu ăn':''}`});
      objects.push({id:n.id,kind:'person',x,z,color:n.hungryDays>2?'#a58468':role==='fisher'?'#79a1a0':'#b58b54',seed:i,role,hungry:n.hungryDays>0});
    }
    for(let i=0;i<Math.min(22,Math.max(0,Math.round(state?.grazers??18)));i++){
      const x=2.5+noise(i,4,15)*26,z=3+noise(i,7,15)*25;if(freeDecoration(x,z))objects.push({kind:'sheep',x,z,seed:i});
    }
    const actorPositions=new Map();
    for(const [id,p] of Object.entries(state?.players||{})){
      const previous=this.actorPositions.get(id),changed=previous&&Math.hypot(p.x-previous.x,p.z-previous.z)>.001;
      const lastMoved=changed?this.animationTime:previous?.lastMoved??-1;
      actorPositions.set(id,{x:p.x,z:p.z,lastMoved});
      objects.push({kind:'person',x:p.x,z:p.z,color:CLASS_COLORS[p.classId]||'#c78a4c',you:id===state.you,role:p.classId||'builder',moving:lastMoved>=0&&this.animationTime-lastMoved<.18,player:true});
    }
    this.actorPositions=actorPositions;
    objects.sort((a,b)=>a.z-b.z);
    for(const o of objects){
      const x=(o.x+.5)*TILE,y=(o.z+.5)*TILE;
      if(state&&o.id){
        const size=o.tiny?.8:o.small?.72:1;
        const box=o.kind==='house'?[-15,-32,18,6]:o.kind==='wood'?[-11,-24,11,3]:o.kind==='ruin'?[-26,-35,31,20]:o.kind==='person'?[-7,o.hungry?-25:-19,12,5]:o.kind==='cart'?[-19,-21,19,17]:[-12,-15,18,6];
        this.spriteTargets.push({id:o.id,left:o.x+box[0]*size/TILE,top:o.z+box[1]*size/TILE,right:o.x+box[2]*size/TILE,bottom:o.z+box[3]*size/TILE});
      }
      if(o.kind==='wood')this.tree(c,x,y,o.seed,o.small);
      else if(o.kind==='stone')this.stone(c,x,y,o.seed);
      else if(o.kind==='house')this.house(c,x,y,o.variant,o.tiny);
      else if(o.kind==='ruin')this.ruin(c,x,y);
      else if(o.kind==='person')this.person(c,x,y,o.color,o.you,time&&(!o.player||o.moving)?Math.floor(time*(o.player?7:1.2)+(o.seed||0))%2:0,o.role,o.hungry);
      else if(o.kind==='cart')this.cart(c,x,y,o,time);
      else if(o.kind==='sheep'){
        rect(c,x-4,y,11,3,'#456c4160');rect(c,x-3,y-1,2,4,'#766d50');rect(c,x+3,y-1,2,4,'#766d50');
        rect(c,x-5,y-6,10,6,'#d4d3b1');rect(c,x-3,y-8,6,7,'#eee8c8');rect(c,x+4,y-5,4,4,'#887f62');rect(c,x+7,y-5,1,1,'#414d3c');
      }
    }
    if(state&&Number.isFinite(state.dayProgress)){
      const day=((state.dayProgress/DAY_MS)%1+1)%1,daylight=Math.max(0,Math.cos((day-.3)*Math.PI*2));
      c.fillStyle=`rgba(33,48,79,${(.12*(1-daylight)).toFixed(3)})`;c.fillRect(-PAD,-PAD,this.layer.width,this.layer.height);
      if(day<.12||day>.64&&day<.8){c.fillStyle='rgba(237,179,110,0.035)';c.fillRect(-PAD,-PAD,this.layer.width,this.layer.height);}
    }
    const chosen=this.targets.find(t=>t.id===selected);
    const outline=(x,z,color)=>{
      c.strokeStyle=color;c.lineWidth=1.5;c.strokeRect(x*TILE+1,z*TILE+1,TILE-2,TILE-2);
      for(const [dx,dy] of [[0,0],[TILE-4,0],[0,TILE-4],[TILE-4,TILE-4]])rect(c,x*TILE+dx,z*TILE+dy,4,4,color);
    };
    if(preview&&Number.isFinite(preview.x)&&Number.isFinite(preview.z)){
      rect(c,preview.x*TILE,preview.z*TILE,TILE,TILE,preview.valid?'#c3e49366':'#df8c7766');outline(preview.x,preview.z,preview.valid?'#e0efad':'#ffc0a0');
    }
    if(chosen)outline(chosen.x,chosen.z,'#ffe6a0');c.restore();
    display.save();display.translate(ox,oy);display.scale(scale,scale);display.drawImage(this.layer,-PAD,-PAD);display.restore();
    if(this.showLabels){
      for(const id of ['west','east']){
        const p=LANDMARKS.find(t=>t[0]===id);if(selected===id)continue;
        const [x,y]=this.project(p[1],p[2]+2),population=state?.npcs?.filter(n=>n.village===id).length;
        this.label(p[3]+(population!==undefined?` · ${population}`:''),x,y,false,true);
      }
      if(!state){const [x,y]=this.project(7,23.8);this.label('Nơi câu chuyện bắt đầu',x,y);}
    }
    if(chosen&&this.showLabels){const [x,y]=this.project(chosen.x,chosen.z-1.8);this.label(chosen.label,x,y,true);}
    if(cart&&selected==='depot'&&this.showLabels&&Number.isFinite(cart.x)&&Number.isFinite(cart.z)){
      const [x,y]=this.project(cart.x,cart.z+1.35),status=cart.paused||cart.status==='blocked'?'Đang chờ':cart.leg==='return'?'Về kho':cart.moving?'Đang giao':'Tại kho';
      this.label(`Xe hàng · ${Math.max(0,Math.floor(cart.cargo||0))} lương thực · ${status}`,x,y,true);
    }
    if(player&&this.showLabels){const [x,y]=this.project(player.x,player.z+1.05);this.label('Bạn',x,y,true);}
  }
}
