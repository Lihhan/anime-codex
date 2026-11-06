import {_electron as electron} from 'playwright';
import electronPath from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory=await fs.mkdtemp(path.resolve('test-results/quick-'));
const app=await electron.launch({executablePath:electronPath,args:['.'],env:{...process.env,ANIME_CODEX_DATA_DIR:directory,ANIME_CODEX_DEV:'0'}});
try {
 const page=await app.firstWindow(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pet=page.getByTestId('pet-body');await pet.waitFor();if(await page.getByRole('button',{name:'稍后再认识'}).count())await page.getByRole('button',{name:'稍后再认识'}).click();await pet.hover();
 const viewport=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
 for(const position of [{x:viewport.w-245,y:viewport.h-305},{x:20,y:100},{x:viewport.w-550,y:viewport.h-290}]) {
 await page.evaluate(p=>{localStorage.setItem('companion.position',JSON.stringify(p));localStorage.setItem('companion.scale','0.4');},position);
 await page.reload();await pet.waitFor();await pet.hover();
 // Exercise real continuous pointer dragging; fill() cannot detect moving targets.
 await page.getByTitle('设置',{exact:true}).click();
 const slider=page.getByLabel('快捷角色大小');
 await slider.fill('40');
 const fixed=await slider.boundingBox();
 const card=await page.locator('.pet-quick-settings').boundingBox();
 const y=fixed.y+fixed.height/2;
 await page.mouse.move(fixed.x+5,y);await page.mouse.down();
 for (const fraction of [0.2,0.4,0.6,0.8,1,0.8,0.6,0.4,0.2,0,1]) {
   await page.mouse.move(fixed.x+5+(fixed.width-10)*fraction,y,{steps:5});
   await page.waitForTimeout(80);
   const current=await slider.boundingBox();
   assert.ok(Math.abs(current.x-fixed.x)<1 && Math.abs(current.y-fixed.y)<1,'slider moved while dragging');
 }
 await page.mouse.up();assert.equal(await slider.inputValue(),'140');
 const after=await page.locator('.pet-quick-settings').boundingBox();
 assert.ok(Math.abs(after.x-card.x)<1 && Math.abs(after.y-card.y)<1,'card jumped on release');
 await page.keyboard.press('Escape');await pet.hover();
 }
 assert.deepEqual(errors,[]);console.log('Stable size slider: continuous 40–140% pointer drags passed at three screen positions');
} finally {await app.close();}
