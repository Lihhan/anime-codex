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


 const labels={idle:'休息一下',read:'读书',meal:'吃饭',gaming:'玩游戏',office:'办公',sleep:'睡觉',walk:'出去跑跑',pet:'摸摸头'};
 const states=Object.keys(labels), edges=Object.fromEntries(states.map(a=>[a,states.filter(b=>b!==a)])),trail=[];
 function visit(a){while(edges[a].length)visit(edges[a].pop());trail.push(a);}visit('idle');trail.reverse();
 async function action(a){await pet.hover();await page.getByTitle('生活与文件投喂').click();await page.getByRole('button',{name:labels[a],exact:true}).click();}
 async function settled(a){await page.waitForFunction(a=>{const n=document.querySelector('.pet-sprite');return n.dataset.activity===a&&n.dataset.transition==='loop';},a);}
 await action('idle');await settled('idle');
 await page.evaluate(()=>{window.clips=[];window.observer=new MutationObserver(()=>window.clips.push(document.querySelector('.pet-sprite').dataset.clip));window.observer.observe(document.querySelector('.pet-sprite'),{attributes:true});});
 let count=0;
 for(const to of trail.slice(1)){
  const from=trail[count];await page.evaluate(()=>window.clips=[]);await action(to);await settled(to);
  const clips=await page.evaluate(()=>window.clips);
  const direct=`transition_${from}_${to}`;
  if(!clips.includes(direct)){
   if(from!=='idle')assert.ok(clips.includes('exit_'+from),`${from}->${to} missing exit: ${clips}`);
   if(to!=='idle')assert.ok(clips.includes('enter_'+to),`${from}->${to} missing entry: ${clips}`);
  }
  count++;if(count%14===0)console.log(`${count}/56 interaction pairs passed`);
 }
 await action('read');await settled('read');await page.evaluate(()=>window.clips=[]);
 await action('gaming');await action('sleep');await action('meal');await settled('meal');
 const queued=await page.evaluate(()=>window.clips);assert.ok(queued.includes('enter_gaming'));assert.ok(queued.includes('exit_gaming'));assert.ok(queued.includes('enter_meal'));
 assert.deepEqual(errors,[]);console.log('All 56 selectable directed pairs and latest-target queuing passed');
} finally {await app.close();}
