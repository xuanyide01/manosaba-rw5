
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),environment=path.resolve(root,'../manosaba-environment'),url='http://127.0.0.1:43146/',log=path.join(environment,'emulator.log'),dir=path.join(root,'reports/native-v011');fs.mkdirSync(dir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let at=0;const checks=[];
function mark(){at=fs.statSync(log).size;}
function recent(){return fs.readFileSync(log).subarray(at).toString('utf8');}
async function get(e){const r=await fetch(url+e,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(await r.text());return r;}
async function click(x,y,delay=800){await get('click?x='+x+'&y='+y);await sleep(delay);}
async function wait(re,max=20000){for(let i=0;i<max/200;i++){if(re.test(recent()))return;await sleep(200);}throw Error('Missing native event '+re+'\n'+recent().slice(-3000));}
async function shot(name){await sleep(700);fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(await (await get('screen')).arrayBuffer()));console.log('SHOT',name);}
async function chapters(){await click(116,401);await click(310,34);}
async function title(){await click(270,478);await click(130,454,1100);}
(async()=>{
 for(let i=0;i<60;i++){try{await get('info');break;}catch(e){if(i===59)throw e;await sleep(250);}}
 const record=JSON.parse(fs.readFileSync(path.join(environment,'controller-pid.json'),'utf8'));
 let servicesReady=false;for(let i=0;i<480;i++){if(/Startup home app failure/.test(fs.readFileSync(log).subarray(record.logOffset||0).toString('utf8'))){servicesReady=true;break;}await sleep(250);}assert.ok(servicesReady,'Vela services did not finish booting');
 await sleep(1800);const m=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8')),rpk=path.join(root,'dist',m.package+'.debug.'+m.versionName+'.rpk'),sha=crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex');
 console.log('INSTALL',await (await get('install?rpk='+encodeURIComponent(rpk))).text());mark();await get('start');await wait(/MANOSABA_RW5 background loaded title/);await wait(/PageCallHook, name:onShow/);await shot('01-title');checks.push('cold installation, five original title button images and unified lower panel');
 mark();await click(312,331,1000);await wait(/slots ready load/);await shot('02-load-slots');mark();await click(110,122,800);await wait(/slot loaded 1 /);await shot('03-loaded-slot-01');checks.push('v0.1.0 slot 01 still loads with new portrait mapping');
 await click(270,478);mark();await click(130,142,1000);await wait(/slots ready load/);for(let i=0;i<7;i++)await click(351,473,150);mark();await click(110,212,800);await wait(/slot loaded 30 /);checks.push('v0.1.0 slot 30 still loads');
 await title();await chapters();await click(100,122);await shot('04-chapters-first-page');checks.push('chapter selector opens from Gallery and its first page refreshes');for(let i=0;i<9;i++)await click(351,473,180);mark();await click(120,305,800);await wait(/frame Act01_Chapter01_Trial02/);
 const {ops}=require('../tests/loader.cjs'),linked=ops('Act01_Chapter01_Trial02').findIndex(o=>o.op==='text'&&o.links.length);let cursor=-1;
 for(let i=0;i<30;i++){const latest=[...recent().matchAll(/frame Act01_Chapter01_Trial02 (\d+)/g)].pop();cursor=latest?Number(latest[1]):-1;if(cursor===linked)break;await click(370,478,450);}assert.equal(cursor,linked);await shot('05-sherry-testimony');
 mark();await click(165,478);await shot('06-bottom-handbook');await click(210,473);await click(355,313);await shot('07-keywords');mark();await click(120,130,700);await wait(/choice Act01_Chapter01_Trial02/);mark();await click(130,260,700);await wait(/frame Act01_Chapter01_Trial02/);checks.push('bottom handbook, improved Sherry portrait and original objection branch');
 mark();await get('drag?x0=150&y0=429&x1=150&y1=351');await sleep(350);assert.equal(/MANOSABA_RW5 frame/.test(recent()),false);await click(140,373,600);await wait(/MANOSABA_RW5 frame/);checks.push('dialogue scroll preserves sentence and fresh tap advances');
 await title();await chapters();await click(100,122);await click(351,473,180);mark();await click(120,122,800);await wait(/frame Act01_Chapter01_Adv05/);
 await click(270,478);await click(130,246);await click(130,298);await shot('08-auto-menu');mark();await click(130,402);await wait(/auto advance/,20000);await shot('09-auto-typing');await wait(/choice Act01_Chapter01_Adv05/,120000);await shot('10-auto-paused-choice');mark();await sleep(3500);assert.equal(/auto advance|MANOSABA_RW5 frame/.test(recent()),false);checks.push('native auto types, advances and pauses on the ordinary choice');
 mark();await click(150,135,600);await wait(/MANOSABA_RW5 frame/);await wait(/auto advance/,20000);await click(270,478);mark();await sleep(4000);assert.equal(/auto advance|MANOSABA_RW5 frame/.test(recent()),false);await shot('11-menu-pauses-auto');checks.push('choosing resumes auto; open menu cancels pending advance');
 await click(130,402);await click(45,478);await click(270,478);await shot('12-previous-disables-auto');await click(130,454);
 mark();await click(116,401,800);await shot('13-gallery');mark();await click(310,150,800);await wait(/MANOSABA_RW5 cg/);await shot('14-cg-variant-1');const before=fs.readFileSync(path.join(dir,'14-cg-variant-1.png'));mark();await click(210,220,800);await wait(/MANOSABA_RW5 cg/);await shot('15-cg-variant-2');assert.notDeepEqual(before,fs.readFileSync(path.join(dir,'15-cg-variant-2.png')));checks.push('CG grouped variations still work');
 await click(210,483);await click(210,474);await chapters();await click(351,473,180);await click(110,122);await click(351,473,180);await click(351,473,180);mark();await click(120,305,800);await wait(/frame Act01_Chapter05_Adv11/);mark();await click(370,478,1000);await click(370,478,1000);await wait(/frame Act02_Chapter01_Adv01/);await title();await shot('16-title-second-cg');assert.notDeepEqual(fs.readFileSync(path.join(dir,'01-title.png')),fs.readFileSync(path.join(dir,'16-title-second-cg.png')));checks.push('second original reclining title CG selected at original progress 6');
 mark();await click(216,471,1200);await wait(/MANOSABA_RW5 exit/);await sleep(1500);mark();await get('start');await wait(/MANOSABA_RW5 background loaded title/);await shot('17-title-reopened');checks.push('EXIT works; second title selection persists after restart');
 const report={packageSha256:sha,packageBytes:fs.statSync(rpk).size,checks,captures:fs.readdirSync(dir),captureDirectory:'reports/native-v011',nativePlatform:'official Vela watch generic 432x514',physicalDeviceTested:false};fs.writeFileSync(path.join(root,'reports/native-final-qa.json'),JSON.stringify(report,null,2));console.log('FINAL_NATIVE_QA',JSON.stringify(report));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

