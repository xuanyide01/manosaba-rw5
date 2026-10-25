
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),env=path.resolve(root,'../manosaba-environment'),log=path.join(env,'emulator.log'),url='http://127.0.0.1:43146/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));let at=0;
async function get(e){const r=await fetch(url+e,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(await r.text());return r;}
function mark(){at=fs.statSync(log).size;}function recent(){return fs.readFileSync(log).subarray(at).toString('utf8');}
async function wait(re,max=20000){for(let i=0;i<max/200;i++){if(re.test(recent()))return;await sleep(200);}throw Error('Missing '+re+'\n'+recent().slice(-2000));}
async function click(x,y,ms=800){await get('click?x='+x+'&y='+y);await sleep(ms);}
(async()=>{
 for(let i=0;i<120;i++){try{await get('info');break;}catch(e){if(i===119)throw e;await sleep(250);}}
 const record=JSON.parse(fs.readFileSync(path.join(env,'controller-pid.json'),'utf8'));at=record.logOffset;await wait(/Startup home app failure/,120000);await sleep(2000);
 const rpk=path.resolve(root,'../../outputs/魔法少女的魔女审判-RW5-0.1.0.bin');if(!process.argv.includes('--resume')){console.log('SEED INSTALL',await (await get('install?rpk='+encodeURIComponent(rpk))).text());
 mark();await get('start');await wait(/book ready/);await wait(/PageCallHook, name:onShow/);}
 await sleep(1000);await click(120,212);await wait(/MANOSABA_RW5 frame/);await click(210,478);
 mark();await click(130,100);await wait(/slots ready save/);mark();await click(110,122);await wait(/slot saved 1 /);
 await click(210,478);mark();await click(130,100);await wait(/slots ready save/);for(let i=0;i<7;i++)await click(351,473,150);mark();await click(110,212);await wait(/slot saved 30 /);
 await click(210,478);await click(170,440,1500);mark();await click(100,444);await wait(/MANOSABA_RW5 exit/);
 fs.writeFileSync(path.join(root,'reports/seed-v010-saves.json'),JSON.stringify({seedVersion:'0.1.0',packageSha256:crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex'),slots:[1,30],method:'actual v0.1.0 application native save UI on official clean data image'},null,2));console.log('V010_SEED_COMPLETE');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

