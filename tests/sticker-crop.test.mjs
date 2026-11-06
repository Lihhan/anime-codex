import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {PNG}=require('pngjs');const pack=require('../shared/pet-appearances.json').furina.sticker;
test('sticker action crop boundaries lie in transparent gaps instead of adjacent figures',()=>{const png=PNG.sync.read(fs.readFileSync('public/characters/furina/sticker/atlas.png'));for(const name of ['idle','sleep','read','meal']){const c=pack.clips[name].cropY;assert.equal(c.sheetHeight,png.height);for(const y of [c.top,c.top+c.height-1]){let solid=0;for(let x=0;x<png.width;x++)if(png.data[(y*png.width+x)*4+3]>128)solid++;assert.equal(solid,0,name+' boundary '+y);}}assert.ok(pack.clips.sleep.cropY.top+pack.clips.sleep.cropY.height<pack.clips.read.cropY.top);});

test('standing blink frames keep both-foot anchor fixed after registration',()=>{
 const png=PNG.sync.read(fs.readFileSync('public/characters/furina/sticker/atlas.png')),width=png.width/4,anchors=[];
 for(let frame=0;frame<4;frame++){let min=Infinity,max=-Infinity;for(let y=275;y<330;y++)for(let x=Math.ceil(frame*width);x<(frame+1)*width;x++)if(png.data[(y*png.width+x)*4+3]>128){min=Math.min(min,x-frame*width);max=Math.max(max,x-frame*width);}assert.ok(Number.isFinite(min));anchors.push((min+max)/2+pack.clips.idle.offsetX[frame]*width/100);}
 assert.ok(Math.max(...anchors)-Math.min(...anchors)<1,JSON.stringify(anchors));
});
