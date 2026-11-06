import {_electron as electron} from 'playwright';
import electronPath from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory=await fs.mkdtemp(path.resolve('test-results/sticker-'));
const app=await electron.launch({executablePath:electronPath,args:['.'],env:{...process.env,ANIME_CODEX_DATA_DIR:directory,ANIME_CODEX_DEV:'0'}});
const errors=[];
try{
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 const settings=async()=>{await page.getByTestId('pet-body').hover();await page.getByTitle('设置',{exact:true}).click();};
 await page.getByTestId('pet-body').waitFor();await settings();
 await page.getByLabel('切换角色').selectOption('c126295a-d3f1-4746-a748-122dfb001101');
 await page.getByLabel('外观画风').selectOption('sticker');
 assert.equal(await page.getByRole('slider',{name:'角色大小'}).inputValue(),'70');
 await page.getByRole('slider',{name:'角色大小'}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 assert.ok(Math.abs((await page.getByTestId('pet-body').boundingBox()).width-95)<1);
 await page.reload();await page.getByTestId('pet-body').waitFor();await settings();assert.equal(await page.getByRole('slider',{name:'角色大小'}).inputValue(),'50');
 for(const [label,activity,row] of [['读书','read','2'],['吃饭','meal','3'],['玩游戏','gaming','0'],['办公','office','1'],['向左跑','walk_left','1'],['向右跑','walk_right','0'],['向上跑','walk_up','2'],['向下跑','walk_down','3']]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForFunction(a=>document.querySelector('.pet-sprite')?.dataset.activity===a,activity);
  assert.equal(await page.locator('.pet-sprite').getAttribute('data-row'),row);
 }
 await page.getByRole('button',{name:'办公',exact:true}).click();
 await page.screenshot({path:'test-results/sticker-settings.png',omitBackground:true});await page.getByRole('button',{name:'睡觉',exact:true}).click();await page.waitForTimeout(150);await page.getByTestId('pet-body').screenshot({path:'test-results/sticker-sleep-fixed.png',omitBackground:true});
 await page.getByTitle('收起面板，角色继续陪伴').click();
 const box=await page.getByTestId('pet-body').boundingBox();const viewport=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(viewport.w-5,viewport.h/2,{steps:8});await page.mouse.up();
 await page.getByTestId('pet-body').hover();await page.getByTitle('生活与文件投喂').click();await page.getByRole('button',{name:'出去跑跑',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.pet-sprite')?.dataset.direction==='left',{},{timeout:5000});
 const edge=await page.locator('.pet-world').boundingBox();await page.waitForTimeout(700);const inward=await page.locator('.pet-world').boundingBox();assert.ok(inward.x<edge.x-15);assert.ok(inward.x+inward.width<=viewport.w);
 await page.getByTestId('pet-body').dblclick();await page.getByLabel('气泡输入').waitFor();
 const bubble=await page.locator('.bubble-composer').boundingBox();assert.ok(bubble.width>=300);
 await page.screenshot({path:'test-results/sticker-small.png',omitBackground:true});
 assert.deepEqual(errors,[]);await fs.writeFile('test-results/sticker-ui.json',JSON.stringify({sizePersists:true,bodyWidth:95,directions:4,lifeActions:4,edgeBounce:true,bubbleWidth:bubble.width,errors,directory},null,2));
}finally{await app.close();}
