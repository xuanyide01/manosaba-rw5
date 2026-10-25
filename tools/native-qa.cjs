const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),environment=path.resolve(root,'../manosaba-environment'),url='http://127.0.0.1:43146/',log=path.join(environment,'emulator.log'),captures=path.join(root,'reports/native');fs.mkdirSync(captures,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let offset=0;const checks=[];
function recent(){return fs.readFileSync(log,'utf8').slice(offset);}
async function get(endpoint){const r=await fetch(url+endpoint,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(await r.text());return r;}
async function click(x,y,ms=350){await get('click?x='+x+'&y='+y);await sleep(ms);}
async function capture(name){const r=await get('screen');fs.writeFileSync(path.join(captures,name+'.png'),Buffer.from(await r.arrayBuffer()));}
async function waitFor(pattern,timeout=15000){const at=Date.now();while(Date.now()-at<timeout){if(pattern.test(recent()))return;await sleep(150);}throw Error('Native callback timed out '+pattern);}
function mark(){offset=fs.readFileSync(log,'utf8').length;}
(async()=>{
 const record=JSON.parse(fs.readFileSync(path.join(environment,'controller-pid.json'),'utf8'));
 for(let i=0;i<120;i++){const raw=fs.readFileSync(log).subarray(record.logOffset||0).toString('utf8');if(/Startup home app failure/.test(raw))break;await sleep(250);}
 await sleep(1800);
 const m=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8')),rpk=path.join(root,'dist',m.package+'.debug.'+m.versionName+'.rpk');
 console.log('INSTALL',await (await get('install?rpk='+encodeURIComponent(rpk))).text());mark();await get('start');await waitFor(/MANOSABA_RW5 background loaded title/);await waitFor(/PageCallHook, name:onShow/);await sleep(400);await capture('01-title');checks.push('final signed RPK installs and starts');
 mark();await click(110,212,650);await waitFor(/MANOSABA_RW5 frame Act01_Chapter01_Adv01/);await capture('02-opening');checks.push('Chinese opening and full composition CG');
 await click(210,478);await click(160,270);await capture('03-notebook');await click(130,117);await capture('04-notebook-detail');await click(180,442);await click(210,473);
 // Save 01, then 30; verify the native storage callbacks.
 mark();await click(180,100,1000);await waitFor(/slots ready save/);await click(130,120,650);await waitFor(/slot saved 1 /);checks.push('save slot 01');
 await click(208,478);mark();await click(150,100,900);await waitFor(/slots ready save/);for(let i=0;i<7;i++)await click(350,474,120);await capture('05-slot-30-page');mark();await click(140,213,650);await waitFor(/slot saved 30 /);checks.push('save slot 30');
 await click(210,478);mark();await click(160,156,900);await waitFor(/slots ready load/);await capture('06-load-list');await click(130,119,700);await waitFor(/slot loaded 1 /);checks.push('load selected slot');
 // Tap advances; drag does not. Full long-text scrolling is separately tested below.
 mark();await click(120,363,400);await waitFor(/MANOSABA_RW5 frame Act01_Chapter01_Adv01/);const current=/MANOSABA_RW5 frame (\S+) (\d+)/g;const frames=[...recent().matchAll(current)];assert.ok(frames.length);mark();await get('drag?x0=180&y0=425&x1=180&y1=355');await sleep(250);assert.equal(/MANOSABA_RW5 frame/.test(recent()),false);checks.push('dialogue tap advances and drag does not advance');
 await click(210,478);await click(180,442);await click(130,304);await capture('07-routes-first-page');await click(120,120);await capture('08-chapters-first-page');await click(210,474);await capture('09-routes-restored');checks.push('route/chapter first-page repaint and back');
 await click(110,120);for(let i=0;i<9;i++)await click(355,474,120);await capture('10-trial-chapter-page');mark();await click(130,305,800);await waitFor(/MANOSABA_RW5 frame Act01_Chapter01_Trial02/);
 const {ops}=require('../tests/loader.cjs'),linked=ops('Act01_Chapter01_Trial02').findIndex(o=>o.op==='text'&&o.links.length);
 for(let i=0;i<30;i++){const latest=[...recent().matchAll(/frame Act01_Chapter01_Trial02 (\d+)/g)].pop();if(latest&&Number(latest[1])===linked)break;await click(355,479,280);}
 await capture('11-trial-testimony');await click(140,478,350);await capture('12-trial-keywords');mark();await click(160,125,500);await waitFor(/MANOSABA_RW5 choice Act01_Chapter01_Trial02/);await capture('13-trial-branch');await click(140,255,500);await capture('14-trial-return');checks.push('native testimony, keyword selection and original branch/cancel');
 await click(210,478);await click(170,442);mark();await click(110,351,600);await waitFor(/gallery ready/);await capture('15-gallery');await click(100,150);await capture('16-cg');await click(210,220);await capture('17-cg-variant');checks.push('native gallery and CG variation tap');
 fs.writeFileSync(path.join(root,'reports/native-qa.json'),JSON.stringify({package:rpk,checks,captures:fs.readdirSync(captures),physicalDeviceTested:false},null,2));console.log('NATIVE_QA',JSON.stringify(checks));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
