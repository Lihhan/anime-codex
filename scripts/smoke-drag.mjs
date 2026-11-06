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

 await page.getByTitle('设置',{exact:true}).click();
 await page.getByRole('button',{name:'角色、模型与更多设置 ↗'}).click();
 await page.getByLabel('切换角色').selectOption('c126295a-d3f1-4746-a748-122dfb001101');
 await page.getByLabel('外观画风').selectOption('sticker');
 await page.getByTitle('收起面板，角色继续陪伴').click();
 const box=await pet.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 assert.equal(await page.locator('.pet-carry').getAttribute('data-carry'),'rest');
 await page.mouse.move(box.x+box.width/2-100,box.y+box.height/2-70,{steps:10});
 await page.waitForFunction(()=>document.querySelector('.pet-carry').dataset.carry==='carried');
 assert.equal(await page.locator('.pet-sprite').getAttribute('data-activity'),'drag');
 assert.equal(await page.locator('.pet-sprite').getAttribute('data-transition'),'loop');
 assert.equal(await page.locator('.pet-sprite').getAttribute('data-clip'),'drag');
 assert.ok(await page.locator('.pet-sprite').evaluate(n=>n.style.backgroundImage.includes('drag-v1.png')));
 const frame=await page.locator('.pet-sprite').getAttribute('data-frame');
 await page.waitForFunction(f=>document.querySelector('.pet-sprite').dataset.frame!==f,frame);
 await page.screenshot({path:'test-results/pet-drag.png',omitBackground:true});
 await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('.pet-carry').dataset.carry==='landing');
 await page.waitForFunction(()=>document.querySelector('.pet-carry').dataset.carry==='rest');
 assert.notEqual(await page.locator('.pet-sprite').getAttribute('data-activity'),'drag');
 // Cancellation must not leave the pet suspended.
 const moved=await pet.boundingBox();await page.mouse.move(moved.x+80,moved.y+80);await page.mouse.down();
 await page.mouse.move(moved.x+40,moved.y+40,{steps:5});
 await pet.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('.pet-carry').dataset.carry==='rest');
 assert.deepEqual(errors,[]);console.log('Drag lift, sprite state, landing and cancellation passed');
} finally {await app.close();}
