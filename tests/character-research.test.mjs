import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeResearch}=require('../electron/character-research.cjs');
const {personaFor,normalizeProfile}=require('../electron/character-studio.cjs');
test('research rejects invented, unvisited and unsafe sources and their dependent claims',()=>{
 const raw={sources:[{url:'https://example.com/real',title:'Real'},{url:'https://example.com/fake'},{url:'javascript:alert(1)'}],traits:[{text:'sourced trait',sourceUrl:'https://example.com/real'},{text:'invented',sourceUrl:'https://example.com/fake'}]};
 const evidence=[{type:'webSearch',status:'completed',urls:['https://example.com/real']}];
 const r=normalizeResearch(raw,evidence);assert.equal(r.status,'web-researched');assert.equal(r.sources.length,1);assert.equal(r.traits.length,1);
 assert.equal(normalizeResearch(raw,[]).status,'insufficient-evidence');
});
test('research survives persona serialization without exceeding character limits',()=>{
 const p=normalizeProfile({summary:'x'.repeat(2000),voiceRules:Array(12).fill('v'.repeat(400))},{name:'test',customSetting:'custom'});
 p.research={status:'web-researched',background:Array(10).fill({text:'b'.repeat(900)})};
 const persona=personaFor(p);assert.ok(persona.length<=12000);assert.match(persona,/Public character research/);assert.match(persona,/permission boundaries take priority/);
});
