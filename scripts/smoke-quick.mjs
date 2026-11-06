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
 assert.equal(await page.locator('.pet-dock button').count(),4);
 for (const title of ['任务','设置','生活与文件投喂']) {
   await page.getByTitle(title,{exact:true}).click();
   await page.keyboard.press('Escape');assert.equal(await page.locator('.pet-quick').count(),0);
   await pet.hover();await page.getByTitle(title,{exact:true}).click();
   await page.getByRole('button',{name:'收起快捷选项',exact:true}).click();assert.equal(await page.locator('.pet-quick').count(),0);
   await pet.hover();await page.getByTitle(title,{exact:true}).click();
   await page.getByTestId('quick-dismiss').click({position:{x:20,y:20}});assert.equal(await page.locator('.pet-quick').count(),0);
   await pet.hover();
 }

 for (const scale of [40,70,140]) {
   await page.getByTitle('设置',{exact:true}).click();await page.getByLabel('快捷角色大小').fill(String(scale));
   await page.getByTitle('生活与文件投喂').click();
   const boxes=await page.locator('.life-orbit button, .pet-quick-life .quick-close').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
   for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y, `overlap at ${scale}: ${i},${j}`);}
   const viewport=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
   for(const b of boxes) assert.ok(b.x>=0 && b.y>=0 && b.x+b.w<=viewport.w && b.y+b.h<=viewport.h, JSON.stringify({scale,b,viewport}));
   await page.getByRole('button',{name:'读书',exact:true}).hover();await page.getByText('读书',{exact:true}).waitFor();
   const hint=await page.locator('.orbit-hint').boundingBox();for(const b of boxes.slice(1)) assert.ok(hint.y+hint.height<=b.y);
   await page.keyboard.press('Escape');await pet.hover();
 }
 const dock=await page.locator('.pet-dock').boundingBox();
 await page.getByTitle('聊天',{exact:true}).click();
 const input=await page.locator('.compact-input').boundingBox(), shifted=await page.locator('.pet-dock').boundingBox();
 assert.ok(input.height<60);assert.ok(input.y+input.height<=shifted.y);assert.ok(shifted.y>dock.y);
 await page.getByLabel('气泡输入').fill('你好');await page.keyboard.press('Escape');
 await pet.hover();await page.getByTitle('生活与文件投喂').click();
 assert.equal(await page.getByTestId('companion-panel').count(),0);assert.equal(await page.locator('.life-orbit button').count(),9);
 await page.screenshot({path:'test-results/quick-life.png',omitBackground:true});
 await page.getByRole('button',{name:'读书',exact:true}).click();assert.equal(await page.locator('.pet-quick').count(),0);
 await pet.hover();await page.getByTitle('任务',{exact:true}).click();assert.equal(await page.getByTestId('companion-panel').count(),0);await page.getByText('暂时没有进行中的任务').waitFor();
 await page.getByTitle('设置',{exact:true}).click();await page.getByLabel('快捷角色大小').fill('90');
 const bodyBox=await pet.boundingBox(), cardBox=await page.locator('.pet-quick-settings').boundingBox();
 assert.ok(cardBox.x+cardBox.width<=bodyBox.x || cardBox.x>=bodyBox.x+bodyBox.width, 'settings must not cover pet');
 await page.screenshot({path:'test-results/quick-settings.png',omitBackground:true});
 await page.getByRole('button',{name:'角色、模型与更多设置 ↗'}).click();await page.getByLabel('切换角色').selectOption('c126295a-d3f1-4746-a748-122dfb001101');await page.getByLabel('外观画风').selectOption('sticker');
 await page.getByTitle('收起面板，角色继续陪伴').click();await pet.hover();await page.getByTitle('聊天',{exact:true}).click();
 await page.screenshot({path:'test-results/quick-chat.png',omitBackground:true});assert.deepEqual(errors,[]);console.log('Quick interactions passed');
} finally {await app.close();}
