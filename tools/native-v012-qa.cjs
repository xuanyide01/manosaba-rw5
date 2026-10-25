
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),env=path.resolve(root,'../manosaba-environment'),url='http://127.0.0.1:43146/',log=path.join(env,'emulator.log'),dir=path.join(root,'reports/native-v012');fs.mkdirSync(dir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let at=0;const checks=[];
function mark(){at=fs.statSync(log).size;}function recent(){return fs.readFileSync(log).subarray(at).toString('utf8');}
async function get(e){const r=await fetch(url+e,{signal:AbortSignal.timeout(240000)});if(!r.ok)throw Error(await r.text());return r;}
async function click(x,y,ms=850){await get('click?x='+x+'&y='+y);await sleep(ms);}
async function wait(re,max=20000){for(let i=0;i<max/200;i++){if(re.test(recent()))return;await sleep(200);}throw Error('Missing '+re+'\n'+recent().slice(-2500));}
async function shot(name){await sleep(800);fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(await (await get('screen')).arrayBuffer()));console.log('SHOT',name);}
function current(){return [...recent().matchAll(/MANOSABA_RW5 frame ([A-Za-z0-9_]+) (\d+)/g)].map(x=>({scene:x[1],cursor:Number(x[2])})).pop();}
async function reach(scene,cursor,max=150){for(let i=0;i<max;i++){const c=current();if(c&&c.scene===scene&&c.cursor===cursor)return;await click(370,478,260);}throw Error('Failed to reach '+scene+':'+cursor+' latest '+JSON.stringify(current()));}
async function title(){await click(270,478);await click(120,454,1300);}
async function chapter(index){await click(116,401);await click(310,34);await click(100,122);for(let i=0;i<Math.floor(index/4);i++)await click(350,474,220);mark();await click(120,122+(index%4)*92,1100);await wait(/MANOSABA_RW5 frame/);}
(async()=>{
 for(let i=0;i<120;i++){try{await get('info');break;}catch(e){if(i===119)throw e;await sleep(250);}}
 const record=JSON.parse(fs.readFileSync(path.join(env,'controller-pid.json'),'utf8'));at=record.logOffset;await wait(/Startup home app failure/,120000);await sleep(1800);
 const m=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8')),rpk=path.join(root,'dist',m.package+'.debug.'+m.versionName+'.rpk'),sha=crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex');
 console.log('INSTALL',await (await get('install?rpk='+encodeURIComponent(rpk))).text());mark();await get('start');await wait(/MANOSABA_RW5 book ready/);await wait(/PageCallHook, name:onShow/);await shot('01-title');checks.push('final RPK installation and launch');
 mark();await click(312,331);await wait(/slots ready load/);mark();await click(120,122,1000);await wait(/slot loaded 1 /);checks.push('legacy saved slot loads at unchanged opcode positions');await title();
 await chapter(7);await reach('Act01_Chapter01_Adv08',8);await shot('02-user-scene-fixed');checks.push('reported dining-hall narrative renders Ema after prior foreground actors leave');
 await title();await chapter(3);await reach('Act01_Chapter01_Adv04',36);await shot('03-alisa-mask');await reach('Act01_Chapter01_Adv04',74);await shot('04-hanna');await reach('Act01_Chapter01_Adv04',101);await shot('05-hanna-duet');checks.push('Alisa mask and Hanna portrait size on actual story frames');
 await title();await chapter(1);await reach('Act01_Chapter01_Adv02',71);await shot('06-warden');checks.push('original numeric Warden appearance in its original scene');
 await title();await chapter(37);await reach('Act01_Chapter01_Trial01',19);
 await click(355,313);await shot('07-keywords');mark();await click(140,260);await wait(/frame Act01_Chapter01_Trial01 19/);await click(355,313);await click(140,138);await shot('08-trial-question');
 mark();await click(140,260);await wait(/frame Act01_Chapter01_Trial01 20/);await reach('Act01_Chapter01_Trial01',19);await click(355,313);mark();await click(140,138);await wait(/choice Act01_Chapter01_Trial01 40/);await shot('09-question-after-loop');checks.push('cancel keyword list, cancel answer, full debate loop and reopen the same question');
 // Store and reload the question itself, including a return stack.
 await click(330,474);mark();await click(130,90);await wait(/slots ready save/);for(let i=0;i<7;i++)await click(350,474,220);mark();await click(120,122);await sleep(400);if(/MANOSABA_RW5 overwrite/.test(recent()))await click(130,235);await wait(/slot saved 29 /);await click(330,474);mark();await click(130,142);await wait(/slots ready load/);for(let i=0;i<7;i++)await click(350,474,220);mark();await click(120,122);await wait(/slot loaded 29 /);await wait(/choice Act01_Chapter01_Trial01 40/);await shot('10-question-after-load');checks.push('question saved to slot 29 and restored with all answers and return');
 mark();await click(140,260);await wait(/frame Act01_Chapter01_Trial01 20/);await click(355,313);await click(140,138);await click(140,138);await wait(/frame Act01_Chapter01_Trial01/);
 for(let i=0;i<100;i++){if(/choice Act01_Chapter01_Trial01 97/.test(recent()))break;await click(370,478,260);}await wait(/choice Act01_Chapter01_Trial01 97/);await shot('11-three-answers');
 mark();await click(140,138);for(let i=0;i<100;i++){if(/choice Act01_Chapter01_Trial01 97/.test(recent()))break;await click(370,478,260);}await wait(/choice Act01_Chapter01_Trial01 97/);await shot('12-all-answers-after-wrong');
 mark();await click(140,380);for(let i=0;i<100;i++){if(/choice Act01_Chapter01_Trial01 97/.test(recent()))break;await click(370,478,260);}await wait(/choice Act01_Chapter01_Trial01 97/);await shot('13-all-answers-after-second-wrong');checks.push('both wrong answers loop back with all three original answers still available');
 mark();await click(140,260);for(let i=0;i<150;i++){if(/frame Act01_Chapter01_Trial02/.test(recent()))break;await click(370,478,260);}await wait(/frame Act01_Chapter01_Trial02/);await shot('14-trial-proceeds');checks.push('correct answer proceeds to next original trial segment after repeated wrong/cancel/reload');
 await title();mark();await click(216,471,1300);await wait(/MANOSABA_RW5 exit/);await sleep(1500);mark();await get('start');await wait(/PageCallHook, name:onShow/);await shot('15-title-reopened');checks.push('exit and reopen');
 const report={version:m.versionName,packageSha256:sha,packageBytes:fs.statSync(rpk).size,checks,captures:fs.readdirSync(dir),captureDirectory:'reports/native-v012',nativePlatform:'official Vela generic 432x514',physicalDeviceTested:false};fs.writeFileSync(path.join(root,'reports/native-final-qa.json'),JSON.stringify(report,null,2));console.log('NATIVE_V012_OK',JSON.stringify(report));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

