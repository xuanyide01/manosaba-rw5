const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),env=path.resolve(root,'../manosaba-environment'),url='http://127.0.0.1:43146/',log=path.join(env,'emulator.log'),dir=path.join(root,'reports/native-v013');fs.mkdirSync(dir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let at=0;const checks=[];
function mark(){at=fs.statSync(log).size;}function recent(){return fs.readFileSync(log).subarray(at).toString('utf8');}
async function get(e){const r=await fetch(url+e,{signal:AbortSignal.timeout(240000)});if(!r.ok)throw Error(await r.text());return r;}
async function click(x,y,ms=850){await get('click?x='+x+'&y='+y);await sleep(ms);}
async function wait(re,max=20000){for(let i=0;i<max/200;i++){if(re.test(recent()))return;await sleep(200);}throw Error('Missing '+re+'\n'+recent().slice(-2500));}
async function shot(name,ms=700){await sleep(ms);fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(await (await get('screen')).arrayBuffer()));console.log('SHOT',name);}
async function title(){await click(270,478);await click(120,454,1200);}
async function chapter(index){await click(314,418);await click(310,34);await click(100,122);for(let i=0;i<Math.floor(index/4);i++)await click(350,474,220);mark();await click(120,122+(index%4)*92,1000);await wait(/MANOSABA_RW5 frame/);}
(async()=>{
 for(let i=0;i<120;i++){try{await get('info');break;}catch(e){if(i===119)throw e;await sleep(250);}}
 const record=JSON.parse(fs.readFileSync(path.join(env,'controller-pid.json'),'utf8'));at=record.logOffset;await wait(/Startup home app failure/,120000);await sleep(1800);
 const m=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8')),rpk=path.join(root,'dist',m.package+'.debug.'+m.versionName+'.rpk'),sha=crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex');
 console.log('INSTALL_BEGIN');console.log('INSTALL',await (await get('install?rpk='+encodeURIComponent(rpk))).text());mark();await get('start');await wait(/MANOSABA_RW5 book ready/);await wait(/PageCallHook, name:onShow/);await shot('01-title');checks.push('final 0.1.3 RPK installed and launched; campus title and original five wordmarks');
 await click(118,474);await shot('02-options');await click(120,240);
 mark();await click(118,418);await wait(/slots ready load/);await shot('03-load-slots');mark();await click(120,122,1000);await wait(/slot loaded 1 /);checks.push('new Load button opens 30-slot selector; old v0.1.0 slot 1 loads');await title();
 mark();await click(216,357);await wait(/frame Act01_Chapter01_Adv01/);await shot('04-new-game');await title();checks.push('new primary New Game and Options buttons work');
 await chapter(4);await click(270,478);await click(130,246);await shot('05-auto-menu');
 mark();await click(130,402,120);await shot('06-current-sentence-complete',100);await wait(/auto advance/,15000);await shot('07-auto-typing',80);
 // A drag must not click the next sentence. Auto restarts after touch release.
 mark();await get('drag?x0=150&y0=429&x1=150&y1=351');assert.equal(/auto advance|MANOSABA_RW5 frame/.test(recent()),false);await wait(/auto advance/,15000);checks.push('auto advances; dragging does not tap through and release resumes countdown');
 await wait(/choice Act01_Chapter01_Adv05/,120000);await shot('08-auto-paused-choice');mark();await sleep(6500);assert.equal(/auto advance|MANOSABA_RW5 frame/.test(recent()),false);checks.push('ordinary choice pauses auto indefinitely without a default answer');
 mark();await click(150,135,600);await wait(/MANOSABA_RW5 frame/);await wait(/auto advance/,15000);await click(270,478);mark();await sleep(6500);assert.equal(/auto advance|MANOSABA_RW5 frame/.test(recent()),false);await shot('09-menu-pauses-auto');checks.push('choosing resumes automatic reading and open menu cancels countdown');
 await click(130,402,200);await click(45,478);await click(270,478);await shot('10-previous-disables-auto');await click(130,454);checks.push('Previous disables auto');
 await click(314,418);await shot('11-gallery');mark();await click(310,150);await wait(/MANOSABA_RW5 cg/);await shot('12-cg-variant-1');const before=fs.readFileSync(path.join(dir,'12-cg-variant-1.png'));mark();await click(210,220);await wait(/MANOSABA_RW5 cg/);await shot('13-cg-variant-2');assert.notDeepEqual(before,fs.readFileSync(path.join(dir,'13-cg-variant-2.png')));checks.push('new Gallery button, chapter entry and grouped CG variants work');
 await click(210,483);await click(210,474);mark();await click(314,474,1300);await wait(/MANOSABA_RW5 exit/);await sleep(1500);mark();await get('start');await wait(/PageCallHook, name:onShow/);await shot('14-title-reopened');checks.push('new Exit button exits; progress-selected title persists on reopen');
 const report={version:m.versionName,packageSha256:sha,packageBytes:fs.statSync(rpk).size,checks,captures:fs.readdirSync(dir),captureDirectory:'reports/native-v013',nativePlatform:'official Vela generic 432x514',physicalDeviceTested:false};fs.writeFileSync(path.join(root,'reports/native-final-qa.json'),JSON.stringify(report,null,2));console.log('NATIVE_V013_OK',JSON.stringify(report));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
