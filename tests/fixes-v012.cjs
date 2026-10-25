
const test=require('node:test'),assert=require('node:assert/strict');
const {load,ops,frame,advanceToDecision}=require('./loader.cjs');
test('all 691 choice stops rebuild their own options without a transient cache',()=>{
 const a=load();let menus=0,offers=0;for(const [id,scene] of Object.entries(a.catalog.scenes)){const all=ops(id);offers+=all.filter(x=>x.op==='offer').length;for(let i=0;i<all.length;i++){const o=all[i];if(o.op!=='choice')continue;const s=a.newState(id);s.cursor=i;s.pending=[];s.activeChoices={chapter:id,cursor:i-1,items:[{text:'unrelated',to:0}]};const f=frame(a,s);assert.equal(f.type,'choice');assert.ok(f.items.length>0,id+':'+i);assert.deepEqual(Array.from(f.items,x=>x.text),Array.from(o.items,x=>x.text),id+':'+i);for(const item of f.items){assert.ok(item.to>0&&item.to<scene.length);assert.ok(item.end>=item.to&&item.end<scene.length);}menus++;}}assert.equal(menus,691);assert.equal(offers,1522);
});
test('first trial decline, loop and saved reload never consume the questions',()=>{
 const a=load();let s=a.newState('Act01_Chapter01_Trial01'),visits=0;
 for(let i=0;i<600&&visits<8;i++){let f=frame(a,s);assert.equal(f.type,'text');if(s.links.length){a.objectTo(s,0);f=frame(a,s);const texts=Array.from(f.items,x=>x.text);assert.ok(texts.includes('返回'));s=a.restore(JSON.parse(JSON.stringify(a.checkpoint(s))));s.pending=[];s.activeChoices=null;f=frame(a,s);assert.deepEqual(Array.from(f.items,x=>x.text),texts);const idx=f.items.findIndex(x=>x.text==='返回');a.choose(s,f.items[idx],idx);visits++;}else a.next(s);}assert.equal(visits,8);
});
test('discussion gates stay locked until the original flags advance',()=>{
 const a=load();let s=a.newState('Act02_Chapter01_Trial02');frame(a,s);
 function loop(){let links=[];const start=s.cursor;for(let i=0;i<100;i++){const f=frame(a,s);assert.equal(f.type,'text');links.push(...f.links.map(x=>x.text));a.next(s);frame(a,s);if(s.cursor===start)return links;}throw Error('No discussion loop');}
 assert.ok(!loop().includes('同时'));s.variables.Skip6_2_3flag1=true;assert.ok(loop().includes('同时'));
 s=a.restore(JSON.parse(JSON.stringify(a.checkpoint(s))));assert.equal(s.variables.Skip6_2_3flag1,true);assert.ok(loop().includes('同时'));
});
test('actor sub-instances exit independently and preserve the remaining actor',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv05');a.modifyCharacter(s,{actor:'Alisa',sub:'Middle',appearance:'Normal1',visible:1,scene:[30]});a.modifyCharacter(s,{actor:'Ema',appearance:'Normal1',visible:1,scene:[70]});a.sceneBodies(s,{});assert.equal(s.bodies.length,2);
 a.setSceneVisibility(s,['Alisa-Middle'],false);a.sceneBodies(s,{});assert.deepEqual(Array.from(s.bodyActors),['Ema']);
 a.modifyCharacter(s,{actor:'Alisa',appearance:'Normal1',visible:1});a.setSceneVisibility(s,['Alisa-Middle'],false);assert.equal(s.sprites.Alisa.visible,true);
});
test('offstage court actors remain hidden until the movement returns them',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Trial02');s.variables.hiddenCharacterPositionY=-95;s.variables.characterPositionY=5;
 a.modifyCharacter(s,{actor:'Warden',appearance:'1',visible:1,position:{expr:',{hiddenCharacterPositionY}'}});a.sceneBodies(s,{actor:'Warden'});assert.equal(s.bodies.length,0);
 a.applySceneMoves(s,[{actors:['Warden'],params:{PositionY:'{characterPositionY}'}}]);a.sceneBodies(s,{actor:'Warden'});assert.equal(s.bodies.length,1);
});
test('different Warden numbers select the original different sprites',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv05');let paths=[];for(let i=1;i<=13;i++){a.modifyCharacter(s,{actor:'Warden',appearance:String(i),visible:1});a.sceneBodies(s,{});assert.equal(s.sprites.Warden.appearance,String(i));paths.push(s.body);}assert.equal(new Set(paths).size,13);
});
test('background overlay exits restore the underlying scene',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv05');a.modifyBackground(s,{actor:'MainBackground',image:'1_1',visible:1});const base=s.background;assert.ok(base);a.modifyBackground(s,{actor:'Stills',sub:'Middle',image:'1_1',visible:1});assert.notEqual(s.background,base);a.setSceneVisibility(s,['Stills-Middle'],false);assert.equal(s.background,base);
});
test('Hanna stays on the panel edge and has comparable two-person portrait height',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv05');a.modifyCharacter(s,{actor:'Hanna',appearance:'Normal1',visible:1});a.sceneBodies(s,{});const box=a.portraitBox(s.body,2,0);assert.ok(box.height>=260,JSON.stringify(box));assert.equal(box.top+box.height,286);assert.ok(box.width<=216);
});


test('original previous-scene choice cannot leave Alisa on the reported Ema narration',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv07');const choice=advanceToDecision(a,s);a.choose(s,choice.items[1],1);for(let i=0;i<80;i++){const f=frame(a,s);if(s.chapter==='Act01_Chapter01_Adv08'&&s.cursor===8){assert.deepEqual(Array.from(s.bodyActors),['Ema']);assert.match(f.text,/四周观察着/);return;}assert.equal(f.type,'text');a.next(s);}assert.fail('Did not reach reported narrative');
});
