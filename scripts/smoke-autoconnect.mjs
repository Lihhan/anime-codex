import {_electron as electron} from 'playwright';import electronPath from 'electron';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const directory=await fs.mkdtemp(path.resolve('test-results/autoconnect-')),project=path.join(directory,'project');await fs.mkdir(project);
const env={...process.env,ANIME_CODEX_DATA_DIR:directory,ANIME_CODEX_DEV:'0'};delete env.CODEX_HOME;
const options={executablePath:process.env.ANIME_CODEX_EXECUTABLE||electronPath,args:process.env.ANIME_CODEX_EXECUTABLE?[]:['.'],env};const checks=[];
for(const stage of ['first','restart','missing']){
 if(stage==='missing')await fs.rmdir(project);
 const app=await electron.launch(options);try{const page=await app.firstWindow();await page.locator('.connection.online').waitFor({state:'attached',timeout:60000});
 if(stage==='first'){await app.evaluate(({dialog},project)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[project]})},project);await page.evaluate(()=>window.animeCodex.chooseWorkspace());}
 if(stage==='restart'){await page.waitForFunction(()=>!document.querySelector('[data-testid="gal-connect"]'));const threads=await page.evaluate(()=>window.animeCodex.listThreads());assert.ok(Array.isArray(threads.data));}
 if(stage==='missing'){await page.waitForFunction(()=>document.body.textContent.includes('上次的项目目录已不可访问'));assert.equal(await page.getByTestId('gal-connect').count(),1);}
 const prefs=JSON.parse(await fs.readFile(path.join(directory,'preferences.json')));assert.equal(prefs.lastWorkspaces.codex,project);checks.push({stage,automaticConnection:true});
 }finally{await app.close()}
}
await fs.writeFile('test-results/autoconnect.json',JSON.stringify({directory,checks},null,2));console.log(JSON.stringify(checks));
