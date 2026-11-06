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

 async function action(label) {await pet.hover();await page.getByTitle('生活与文件投喂').focus();await page.getByTitle('生活与文件投喂').click();await page.getByRole('button',{name:label,exact:true}).click();}
 await action('睡觉');
 await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='sleep');
 await page.evaluate(()=>{window.seen=[];window.spriteObserver=new MutationObserver(()=>{const n=document.querySelector('.pet-sprite');window.seen.push({at:performance.now(),clip:n.dataset.clip,frame:n.dataset.frame,opacity:getComputedStyle(n).opacity,background:n.style.backgroundPosition});});window.spriteObserver.observe(document.querySelector('.pet-sprite'),{attributes:true});});
 await action('读书');
 await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='transition_sleep_read');
 await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='transition_sleep_read' && document.querySelector('.pet-sprite').dataset.frame==='7');
 await pet.screenshot({path:'test-results/calibrated-enter-read.png',omitBackground:true});
 await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='read');
 await pet.screenshot({path:'test-results/calibrated-read.png',omitBackground:true});
 const frames=await page.evaluate(()=>{window.spriteObserver.disconnect();return window.seen.filter(f=>f.clip==='transition_sleep_read');});
 assert.deepEqual([...new Set(frames.map(f=>Number(f.frame)))],[0,1,2,3,4,5,6,7]);
 assert.ok(frames.every(f=>f.opacity==='1'));
 assert.ok(frames.find(f=>f.frame==='7').at-frames.find(f=>f.frame==='0').at>=1950,'key poses should remain readable rather than flash by');
 assert.ok(frames.find(f=>f.frame==='4').background.endsWith('100%'),'second atlas row must play');
 await page.emulateMedia({reducedMotion:'reduce'});await action('睡觉');
 await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='sleep');
 await action('读书');await page.waitForFunction(()=>document.querySelector('.pet-sprite').dataset.clip==='read');
 assert.deepEqual(errors,[]);console.log('Sleep → rise → catch book → read: all eight opaque frames, row wrap and reduced motion passed');
} finally {await app.close();}
