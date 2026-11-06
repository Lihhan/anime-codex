const fs=require('node:fs/promises'),path=require('node:path');
const {CharacterStudio}=require('../electron/character-studio.cjs');
(async()=>{
 const directory=await fs.mkdtemp(path.resolve('test-results/research-'));
 const state=JSON.parse(await fs.readFile(path.join(process.env.HOME,'Library/Application Support/anime-codex/companion/state.json'),'utf8'));
 const studio=new CharacterStudio(directory,e=>{if(e.stage!=='working')console.log(e.message)},()=>({model:state.settings.brainModel,effort:state.settings.brainEffort}));
 const job=await studio.draft({name:'芙宁娜',work:'原神',customSetting:'日常桌面陪伴；不把每句话都变成舞台比喻。'});
 console.log(JSON.stringify({directory,id:job.id,research:job.research,voiceRules:job.profile.voiceRules},null,2));
 if(job.research.status!=='web-researched')throw Error('No traceable opened sources');
})().catch(e=>{console.error(e);process.exitCode=1});
