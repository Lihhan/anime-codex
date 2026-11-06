// Read alpha bounds to calibrate renderer metadata; never rewrite image pixels.
const fs=require('node:fs');
const {PNG}=require('pngjs');
const file='shared/pet-appearances.json', data=JSON.parse(fs.readFileSync(file)),pack=data.furina.sticker,cache={};
const report=[];
for(const [key,clip] of Object.entries(pack.clips)){
 if(key.startsWith('walk_') || key==='drag')continue; // Preserve locomotion and hanging anchors.
 const src=clip.src||pack.src,png=cache[src]||=PNG.sync.read(fs.readFileSync('public/'+src.replace('./','')));
 const columns=clip.columns||pack.columns,rows=clip.rows||pack.rows,aspect=clip.aspect||pack.aspect||1;
 const scale=src.includes('activity-bridges')?1.035:src.includes('sleep-read')?1.055:key==='sleep'?.90:key==='gaming'?.94:1;
 clip.renderScale=scale;clip.offsetX=[];clip.offsetY=[];
 for(const cell of new Set(clip.frames||clip.durations.map((_,i)=>i))){
  const w=png.width/columns,h=clip.cropY?.height||png.height/rows,left=cell%columns*w,top=clip.cropY?.top??(clip.row+Math.floor(cell/columns))*h;
  let minX=w,maxX=0,maxY=0;
  for(let y=Math.ceil(top);y<Math.floor(top+h);y++)for(let x=Math.ceil(left);x<Math.floor(left+w);x++){
   if(png.data[(y*png.width+x)*4+3]<80)continue;
   minX=Math.min(minX,x-left);maxX=Math.max(maxX,x-left);maxY=Math.max(maxY,y-top);
  }
  clip.offsetX[cell]=Number(((.5-(minX+maxX)/2/w)*100*scale).toFixed(3));
  clip.offsetY[cell]=Number(((1-maxY/h)*scale*100-3*Math.max(1,aspect)).toFixed(3));
  report.push({key,cell,scale,offsetX:clip.offsetX[cell],offsetY:clip.offsetY[cell]});
 }
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/sprite-calibration.json',JSON.stringify(report,null,2));
console.log(`Calibrated ${report.length} rendered cells without modifying source PNGs`);
