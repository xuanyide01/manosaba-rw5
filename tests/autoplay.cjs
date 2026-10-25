
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common');
function setup(saved={},fileDelay=0){
 let now=0,id=0,tasks=new Map(),writes={...saved};const logs=[];
 const set=(f,ms)=>{tasks.set(++id,{f,at:now+ms});return id;},clear=i=>tasks.delete(i);
 function tick(ms){const end=now+ms;for(let i=0;i<20000;i++){let target=null;for(const [id,t] of tasks)if(t.at<=end&&(!target||t.at<target[1].at))target=[id,t];if(!target){now=end;return;}now=target[1].at;tasks.delete(target[0]);target[1].f();}throw Error('Timer loop');}
 const storage={get(o){o.success(writes[o.key]||'');},set(o){writes[o.key]=o.value;if(o.success)o.success();}};
 const file={readText(o){const run=()=>{try{o.success({text:fs.readFileSync(path.join(root,'src',o.uri),'utf8')});}catch(e){if(o.fail)o.fail(e.message,1);else throw e;}};if(fileDelay)set(run,fileDelay);else run();}};
 const ctx=vm.createContext({console:{log(...x){logs.push(x.join(' '));},error(...x){logs.push(x.join(' '));}},setTimeout:set,clearTimeout:clear,storage,file,prompt:{showToast(){}},Math,Date,JSON,Number,String,Array,Object,Error,RegExp});
 let code='';for(const n of ['runtime-helpers','program-store','catalog','assets','expressions','scene','engine','saves','gallery','text-font','portrait-layout','autoplay'])code+=fs.readFileSync(path.join(common,n+'.js'),'utf8').replace(/^import .*?;\s*$/mg,'').replace(/\bexport /g,'')+'\n';
 const ux=fs.readFileSync(path.join(root,'src/pages/index/index.ux'),'utf8');code+=ux.split('<script>')[1].split('</script>')[0].replace(/^import .*?;\s*$/mg,'').replace('export default','globalThis.definition=');
 code+='\nglobalThis.api={newState,readFrame,next,choose,autoDelay,canAutoAdvance,createAutoplay};';vm.runInContext(code,ctx);
 const ui=Object.assign({},ctx.definition,JSON.parse(JSON.stringify(ctx.definition.private)),{$element(){return {scrollTo(){}};},$app:{exit(){}}});
 ui.onInit();ui.onShow();return {ui,tick,logs,writes,api:ctx.api,tasks};
}
test('autoplay uses three post-type waits and extra time for long paragraphs',()=>{
 const {api}=setup();assert.equal(api.autoDelay(0,60),2600);assert.equal(api.autoDelay(1,60),1500);assert.equal(api.autoDelay(2,60),800);assert.equal(api.autoDelay(1,100),2700);assert.equal(api.autoDelay(1,500),6500);assert.equal(api.autoDelay(0,5000),7600);
});
test('enabling auto keeps completed sentence, later sentences type and manual tap completes',()=>{
 const {ui,tick,logs}=setup();ui.startNew();tick(0);const cursor=ui.session.cursor;ui.showMenu();ui.toggleAuto();ui.resume();assert.equal(ui.displayText,ui.fullText);tick(1499);assert.equal(ui.session.cursor,cursor);tick(1);assert.ok(logs.some(x=>x.includes('auto advance')));const c=ui.session.cursor;assert.equal(ui.displayText.length,1);tick(30);assert.equal(ui.displayText.length,Math.min(2,ui.fullText.length));ui.advance();assert.equal(ui.displayText,ui.fullText);assert.equal(ui.session.cursor,c);tick(1499);assert.equal(ui.session.cursor,c);
});
test('choices pause indefinitely and selecting an answer resumes automatic reading',()=>{
 const {ui,tick}=setup(),{load,advanceToDecision}=require('./loader.cjs'),a=load(),s=a.newState('Act01_Chapter01_Adv05');advanceToDecision(a,s);
 ui.session=s;ui.autoEnabled=true;ui.renderFrame();assert.equal(ui.mode,'choice');const c=ui.session.cursor;tick(60000);assert.equal(ui.session.cursor,c);assert.ok(ui.autoEnabled);
 ui.pick(0);tick(0);assert.equal(ui.mode,'play');const after=ui.session.cursor;tick((ui.fullText.length-1)*30+1500);assert.ok(ui.session.cursor!==after||ui.mode==='choice');
});
test('map/evidence/execution and debate keyword cannot be bypassed by auto',()=>{
 const {load,advanceToDecision}=require('./loader.cjs'),a=load();
 for(const scene of ['Act01_Chapter01_Adv15','Act01_Chapter01_Trial14','Act01_Chapter01_Adv35','Act01_Chapter01_Trial02']){
  const {ui,tick}=setup(),s=a.newState(scene);advanceToDecision(a,s);ui.session=s;ui.autoEnabled=true;ui.renderFrame();const cursor=ui.session.cursor;tick(60000);assert.equal(ui.session.cursor,cursor,scene);assert.ok(ui.autoEnabled);
 }
});
test('menu, handbook, slots and background pause and restart a full wait',()=>{
 const {ui,tick,logs}=setup();ui.startNew();tick(0);ui.showMenu();ui.toggleAuto();ui.resume();const c=ui.session.cursor;ui.showMenu();tick(20000);assert.equal(ui.session.cursor,c);ui.saveGame();tick(20000);assert.equal(ui.session.cursor,c);ui.closeSlots();ui.resume();ui.openBook();tick(20000);assert.equal(ui.session.cursor,c);ui.closeBook();tick(1499);assert.equal(ui.session.cursor,c);ui.onHide();tick(5000);assert.equal(ui.session.cursor,c);ui.onShow();tick(1499);assert.equal(ui.session.cursor,c);tick(1);assert.ok(logs.some(x=>x.includes('auto advance')));
});
test('scroll holds auto until release then restarts reading wait; previous disables it',()=>{
 const {ui,tick}=setup();ui.startNew();tick(0);ui.showMenu();ui.toggleAuto();ui.resume();const c=ui.session.cursor;ui.dialogueTouchStart({touches:[{pageX:150,pageY:420}]});ui.dialogueTouchMove({touches:[{pageX:150,pageY:350}]});ui.dialogueTap();tick(20000);assert.equal(ui.session.cursor,c);ui.dialogueTouchEnd();tick(180);tick(1499);assert.equal(ui.session.cursor,c);tick(1);assert.notEqual(ui.session.cursor,c);ui.goBack();assert.equal(ui.autoEnabled,false);const at=ui.session.cursor;tick(20000);assert.equal(ui.session.cursor,at);ui.dialogueTouchStart({touches:[{pageX:150,pageY:375}]});ui.dialogueTouchEnd();ui.dialogueTap();assert.notEqual(ui.session.cursor,at);
});
test('speed persists but auto defaults off; title background follows original progress boundary',()=>{
 const {ui,writes}=setup();ui.autoEnabled=true;ui.autoSpeed=2;ui.persistSettings();ui._titleProgress=6;ui.toTitle();assert.equal(ui.autoEnabled,false);assert.equal(ui.titleSrc,'/common/ui/title-2.jpg');
 const x=setup(writes);assert.equal(x.ui.autoSpeed,2);assert.equal(x.ui.autoEnabled,false);assert.equal(x.ui.titleSrc,'/common/ui/title-2.jpg');
});
test('end, error, title and destroy invalidate automatic callbacks',()=>{
 for(const action of ['toTitle','fail','onDestroy','exitApplication']){
  const {ui,tick,logs}=setup();ui.startNew();tick(0);ui.autoEnabled=true;ui.scheduleAuto();ui[action]('test');tick(20000);assert.equal(ui.autoEnabled,false);assert.ok(!logs.some(x=>x.includes('auto advance')));
 }
 const {ui,tick}=setup();ui.startNew();tick(0);ui.autoEnabled=true;ui.session.ended=true;ui.renderFrame();assert.equal(ui.mode,'end');assert.equal(ui.autoEnabled,false);tick(20000);
});
test('cancelled callback is harmless even if an event loop has already queued it',()=>{
 const {api}=setup();let f,n=0;const c=api.createAutoplay(fn=>{f=fn;return 1;},()=>{});c.schedule(1,()=>true,()=>n++);c.cancel();f();assert.equal(n,0);
});


test('backgrounding during an asynchronous scene hop resumes the pending frame',()=>{
 const {ui,tick}=setup({},10);tick(30);ui.startNew();assert.ok(ui._framePending);ui.onHide();tick(10000);ui.onShow();tick(100);assert.equal(ui.mode,'play');assert.equal(ui.loading,false);assert.ok(ui.fullText.length);assert.equal(ui._framePending,false);
});

test('Gallery opens chapters, first-page route/back navigation returns to Gallery',()=>{
 const {ui}=setup();ui.openGallery();assert.equal(ui.mode,'gallery');const galleryPage=ui.galleryPage;
 ui.openChapterRoutes();assert.equal(ui.mode,'routes');const routeKey=ui.browseRows[0].key;ui.selectBrowse(0);assert.equal(ui.mode,'chapters');assert.notEqual(ui.browseRows[0].key,routeKey);
 ui.closeBrowse();assert.equal(ui.mode,'routes');assert.equal(ui.browseRows[0].key,routeKey);ui.closeBrowse();assert.equal(ui.mode,'gallery');assert.equal(ui.galleryPage,galleryPage);
});

test('original Act 1 finale unlocks second title and persists before returning to title',()=>{
 const {ui,tick,writes}=setup();const {load}=require('./loader.cjs'),a=load();ui.session=a.newState('Act01_Chapter05_Adv11');ui.cachedChapter=0;ui.renderFrame();tick(0);
 assert.equal(ui.session.cursor,5);ui.syncProgress();ui.refreshTitle();assert.equal(ui.titleSrc,'/common/ui/title-1.jpg');
 ui.advance();tick(0);ui.syncProgress();ui.refreshTitle();assert.equal(ui.titleSrc,'/common/ui/title-1.jpg');
 ui.advance();tick(0);assert.equal(ui.session.chapter,'Act02_Chapter01_Adv01');assert.equal(ui.mode,'play');assert.equal(writes.manosaba_rw5_title_progress_v1,'6');
 ui.onHide();ui.onDestroy();const reopened=setup(writes);assert.equal(reopened.ui.titleSrc,'/common/ui/title-2.jpg');reopened.ui.startNew();reopened.tick(0);reopened.ui.toTitle();assert.equal(reopened.ui.titleSrc,'/common/ui/title-2.jpg');
});

test('return to testimony creates fresh option widgets and rejects a stale click',()=>{
 const {ui,tick,api}=setup();ui.session=api.newState('Act01_Chapter01_Trial01');ui.cachedChapter=0;ui.renderFrame();tick(0);
 for(let i=0;i<80&&!ui.hasObjection;i++){ui.advance();tick(0);}assert.ok(ui.hasObjection);ui.openObjections();const stale=ui.options[0].key;ui.pick(ui.options.length-1);tick(0);assert.equal(ui.mode,'play');ui.openObjections();const fresh=ui.options[0].key;assert.notEqual(fresh,stale);const cursor=ui.session.cursor;ui.pick(0,stale);assert.equal(ui.mode,'choice');assert.equal(ui.session.cursor,cursor);ui.pick(0,fresh);tick(0);assert.equal(ui.mode,'choice');assert.ok(ui.options.some(x=>x.text==='返回'));const idx=ui.options.findIndex(x=>x.text==='返回');ui.pick(idx,ui.options[idx].key);tick(0);assert.equal(ui.mode,'play');
});

test('inertial scrolling resets idle debounce and menu cancels queued resume',()=>{
 const {ui,tick}=setup();ui.startNew();tick(0);ui.showMenu();ui.toggleAuto();ui.resume();const cursor=ui.session.cursor;ui.dialogueTouchStart({touches:[{pageX:150,pageY:420}]});ui.dialogueTouchMove({touches:[{pageX:150,pageY:350}]});ui.dialogueTouchEnd();tick(100);ui.dialogueScrolled({scrollY:30});tick(179);assert.ok(ui._readPause);tick(1);assert.equal(ui._readPause,false);tick(1499);assert.equal(ui.session.cursor,cursor);ui.showMenu();tick(10000);assert.equal(ui.session.cursor,cursor);
});
test('auto speed leaves manual type setting and save keys unchanged',()=>{
 const {ui,tick,writes}=setup();ui.startNew();tick(0);ui.textSpeed=0;ui.showMenu();ui.toggleAuto();ui.toggleAutoSpeed();assert.equal(ui.textSpeed,0);const settings=JSON.parse(writes.manosaba_rw5_settings_v1);assert.equal(settings.textSpeed,0);assert.ok(!('autoEnabled' in settings));ui.resume();ui.onHide();ui.onDestroy();const reopened=setup(writes);assert.equal(reopened.ui.autoEnabled,false);assert.equal(reopened.ui.autoSpeed,ui.autoSpeed);
});

test('manual chapter skip preserves enabled auto and waits at the next meaningful boundary',()=>{
 const {ui,tick}=setup();ui.startNew();tick(0);ui.showMenu();ui.toggleAuto();ui.goNextChapter();tick(0);assert.equal(ui.mode,'choice');assert.equal(ui.session.chapter,'Act01_Chapter01_Adv05');assert.equal(ui.autoEnabled,true);const cursor=ui.session.cursor;tick(60000);assert.equal(ui.session.cursor,cursor);
});
test('chapter skip from an open option list retains the same original pending answer',()=>{
 const {ui,tick,api}=setup();ui.session=api.newState('Act01_Chapter01_Trial01');ui.cachedChapter=0;ui.renderFrame();tick(0);for(let i=0;i<80&&!ui.hasObjection;i++){ui.advance();tick(0);}ui.openObjections();const options=JSON.stringify(ui.options),cursor=ui.session.cursor;ui.showMenu();ui.goNextChapter();assert.equal(ui.mode,'choice');assert.equal(JSON.stringify(ui.options),options);assert.equal(ui.session.cursor,cursor);ui.pick(ui.options.length-1);tick(0);assert.equal(ui.mode,'play');assert.equal(ui.session.cursor,cursor);
});


test('chapter skipping leaves disabled auto disabled',()=>{
 const {ui,tick}=setup();ui.startNew();tick(0);ui.showMenu();ui.goNextChapter();tick(0);assert.equal(ui.mode,'choice');assert.equal(ui.autoEnabled,false);
});
test('enabled auto resumes after the skipped-to choice is answered',()=>{
 const {ui,tick,logs}=setup();ui.startNew();tick(0);ui.showMenu();ui.toggleAuto();ui.goNextChapter();tick(0);ui.pick(1,ui.options[1].key);tick(0);assert.equal(ui.autoEnabled,true);tick(15000);assert.ok(logs.some(x=>x.includes('auto advance')));
});
test('trial-opening hold preserves auto while manual continue resumes it',()=>{
 const {ui,tick,api,logs}=setup();ui.session=api.newState('Act01_Chapter01_Adv34');ui.cachedChapter=0;ui.renderFrame();tick(0);ui.showMenu();ui.toggleAuto();ui.goNextChapter();tick(0);assert.equal(ui.session.chapter,'Act01_Chapter01_Trial00');assert.equal(ui.autoEnabled,true);assert.equal(ui._manualBoundary,true);const p=ui.session.cursor;tick(60000);assert.equal(ui.session.cursor,p);ui.advance();tick(10000);assert.ok(logs.some(x=>x.includes('auto advance')));
});
test('ordinary new chapter retains auto and resumes with its normal reading wait',()=>{
 const {ui,tick,api,logs}=setup();ui.session=api.newState('Act01_Chapter01_Adv36');ui.cachedChapter=0;ui.renderFrame();tick(0);ui.showMenu();ui.toggleAuto();ui.goNextChapter();tick(0);assert.equal(ui.session.chapter,'Act01_Chapter02_Adv01');assert.equal(ui.autoEnabled,true);assert.equal(ui._manualBoundary,false);tick(10000);assert.ok(logs.some(x=>x.includes('auto advance')));
});
test('late file callbacks after returning to title cannot repopulate story cache',()=>{
 const {ui,tick}=setup({},10);tick(30);ui.startNew();ui.toTitle();tick(100);assert.equal(ui.mode,'title');assert.equal(ui._programs.stats().cachedBlocks,0);assert.equal(ui.ops.length,0);ui.onDestroy();assert.equal(ui._programs.stats().residentBlocks,0);
});


test('large original-word buttons open exactly their source objection and reject stale words',()=>{
 const {ui,tick,api,logs}=setup();ui.session=api.newState('Act01_Chapter01_Trial02');ui.cachedChapter=0;ui.renderFrame();tick(0);for(let i=0;i<80&&!ui.hasObjection;i++){ui.advance();tick(0);}assert.equal(ui.objectionWords.length,3);assert.equal(ui.objectionWords[1].text,'死前');assert.equal(ui.artHeight,236);const cursor=ui.session.cursor;ui.rebutWord(1,'stale');assert.equal(ui.session.cursor,cursor);ui.rebutWord(1,ui.objectionWords[1].key);tick(0);assert.ok(logs.some(x=>x.includes('objection word 死前')));assert.equal(ui.session.chapter,'Act01_Chapter01_Trial02');assert.ok(ui.mode==='choice'||ui.session.cursor!==cursor);
});
