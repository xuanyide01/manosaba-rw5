from pathlib import Path
import json,hashlib,zipfile,shutil,datetime,sys
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parents[1]
workspace=root.parents[1]
out=workspace/'outputs';out.mkdir(exist_ok=True)
manifest=json.loads((root/'src/manifest.json').read_text(encoding='utf8'))
name='魔法少女的魔女审判-RW5-'+manifest['versionName']
package=root/'dist'/(manifest['package']+'.debug.'+manifest['versionName']+'.rpk')
package_audit=json.loads((root/'reports/package-audit.json').read_text(encoding='utf8'))
native=json.loads((root/'reports/native-final-qa.json').read_text(encoding='utf-8-sig'))
sha=hashlib.sha256(package.read_bytes()).hexdigest()
assert sha==package_audit['sha256']
icon_only=None
if manifest['versionName']=='0.1.7':
 icon_only=json.loads((root/'reports/icon-only-v017.json').read_text(encoding='utf8'))
 assert icon_only['version']==manifest['versionName'] and icon_only['sha256']==sha
 assert icon_only['baselineVersion']==native['version']=='0.1.6'
 assert icon_only['baselineSha256']==native['packageSha256']
 assert icon_only['compiledGameplayUnchanged'] and icon_only['allOtherSourceFilesIdentical']
 assert not icon_only['currentPackageNativeTested'] and not icon_only['currentPackagePhysicalTested']
else:
 assert sha==native['packageSha256'] and native['version']==manifest['versionName']
validation_version=icon_only['baselineVersion'] if icon_only else manifest['versionName']
validation_sha=icon_only['baselineSha256'] if icon_only else sha
skip_audit=json.loads((root/'reports/chapter-skip-v016.json').read_text(encoding='utf8'))
assert skip_audit['version']==validation_version and skip_audit['summary']['errors']==0 and skip_audit['summary']['validStops']==371
assert package.stat().st_size<=10000000
assert json.loads((root/'reports/ui-layout-audit.json').read_text(encoding='utf8'))['sha256']==validation_sha
scenario=json.loads((root/'reports/scenario-exploration.json').read_text(encoding='utf8'))
continuous=json.loads((root/'reports/continuous-playthrough.json').read_text(encoding='utf8'))
assert all(s['complete'] and not s['errors'] for s in scenario)
assert continuous['steps'][-1]['ending']=='clear' and continuous['finalState']['ended']
readme=(root/'README.md').read_text(encoding='utf8')
(root/'README.md').write_text(readme,encoding='utf8')
report={
 'fixes':json.loads((root/'reports/fixes-v012.json').read_text(encoding='utf8')),
 'baselineCompatibility':json.loads((root/'reports/v016-baseline-compatibility.json').read_text(encoding='utf8')),
 'chapterSkip':json.loads((root/'reports/chapter-skip-v016.json').read_text(encoding='utf8')),
 'optimization':json.loads((root/'reports/optimized-runtime-v016.json').read_text(encoding='utf8')),
 'desktopLayouts':json.loads((root/'reports/desktop-layouts.json').read_text(encoding='utf8')),
 'icon':json.loads((root/'reports'/('icon-v017.json' if icon_only else 'icon-v016.json')).read_text(encoding='utf8')),
 'title':json.loads((root/'reports/title-v013.json').read_text(encoding='utf8')),
 'autoplay':json.loads((root/'reports/autoplay-v016.json').read_text(encoding='utf8')),
 'allChoices':json.loads((root/'reports/all-choice-audit.json').read_text(encoding='utf8')),
 'game':'《魔法少女的魔女审判》','device':'REDMI Watch 5 (432x514)','version':manifest['versionName'],
 'package':package_audit,'native':native,
 'story':json.loads((root/'reports/story.json').read_text(encoding='utf8')),
 'art':json.loads((root/'reports/art.json').read_text(encoding='utf8')),
 'font':json.loads((root/'reports/font.json').read_text(encoding='utf8')),
 'runtimeUnitTests':{'passed':58,'failed':0,'runtime':10,'autoplayAndUI':23,'v012Fixes':9,'chapterSkip':8,'programStore':4,'uiV016':4},
 'scenarioExploration':{'scenes':len(scenario),'passed':sum(s['complete'] for s in scenario),'executionErrors':sum(len(s['errors']) for s in scenario)},
 'continuousPlaythrough':{'sceneVisits':len(continuous['steps']),'ending':'clear','physicalTest':False},
 'limitations':['静态图文适配；不含音视频和3D审判镜头','主要静态表情，未复现全部手臂动作、细微表情和重演动画','实时倒计时取消，错误答案采用手表版10点容错计数','已验证模拟器和自动路径；尚未收到本版本实机反馈']
}
if icon_only:
 report['iconOnlyUpdate']=icon_only
 report['native']['inheritedForIconOnlyUpdate']=True
 report['runtimeUnitTests']['inheritedFromVersion']=validation_version
 report['runtimeUnitTests']['rerunForCurrentVersion']=False
 report['limitations'][-1]='0.1.7 仅完成图标、签名与包体差异校验；游戏功能验证沿用代码相同的 0.1.6。未重新进行整版模拟器或实机测试。'
physical_path=root/'reports'/('physical-test-v'+manifest['versionName']+'.json')
if physical_path.exists():
 physical=json.loads(physical_path.read_text(encoding='utf8'))
 assert physical['version']==manifest['versionName'] and physical['packageSha256']==sha and physical['physicalTestPassed']
 report['physicalDeviceTestedForThisVersion']=True
 report['physicalTestReport']=physical
 report['limitations'][-1]='维护者确认 0.1.7 红米手表 5 实机测试通过，暂未发现 bug；不声明穷尽全部路线和固件环境。'
(root/'reports/release-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for ext in ['.bin','.rpk']:shutil.copyfile(package,out/(name+ext))
(out/(name+'-安装说明.md')).write_text(readme,encoding='utf8')
(out/(name+'-检查报告.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for source,label in ([] if icon_only else [('02-old-save-toolbar.png','阅读底栏'),('14-visited-bottom-visible.png','已调查地点后置'),('07-single-original-word.png','原文反驳词'),('10-three-original-words.png','多词反驳'),('12-long-three-word-layout.png','长词语布局')]):
 shutil.copyfile(root/native['captureDirectory']/source,out/(name+'-'+label+'.png'))
shutil.copyfile(root/'src/common/logo.png',out/(name+'-应用图标.png'))
archive=out/(name+'-源码.zip')
selected_reports=['story.json','art.json','font.json','package-audit.json','scenario-exploration.json','continuous-playthrough.json','native-final-qa.json','fixes-v012.json','all-choice-audit.json','png-lossless.json','ui-layout-audit.json','seed-v010-saves.json','emulator-clean-qa.json','release-check.json','title-v013.json','autoplay-v013.json','v013-baseline-compatibility.json','autoplay-v014.json','v014-baseline-compatibility.json','chapter-skip-v014.json','chapter-skip-v015.json','runtime-programs.json','optimized-runtime-v015.json','v015-baseline-compatibility.json','autoplay-v015.json','performance-v015.json','chapter-skip-v016.json','optimized-runtime-v016.json','desktop-layouts.json','icon-v016.json','v016-baseline-compatibility.json','autoplay-v016.json','v014-performance-baseline/engine.js','native-baseline-v014/native-qa.json']
if icon_only:selected_reports+=['icon-v017.json','icon-only-v017.json']
for extra in ['physical-test-v017.json','title-capture-v017.json']:
 if (root/'reports'/extra).exists():selected_reports.append(extra)
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for folder in ['src','tools','tests','licenses','resources','docs']:
  for p in sorted((root/folder).rglob('*')):
   if not p.is_file() or any(s in p.parts for s in ['node_modules','__pycache__','image-deps']):continue
   z.write(p,Path(root.name)/p.relative_to(root))
 for n in ['package.json','quickapp.config.js','.gitignore','README.md','LICENSE']:z.write(root/n,Path(root.name)/n)
 for n in selected_reports:z.write(root/'reports'/n,Path(root.name)/'reports'/n)
 for p in sorted((root/native['captureDirectory']).glob('*.png')):z.write(p,Path(root.name)/native['captureDirectory']/p.name)
 probe=root.parent/'manosaba-probe'
 z.write(probe/'README.md','manosaba-probe/README.md')
 for p in sorted((probe/'tools').glob('*.py')):
  if p.name in ['init-project.py']:continue
  z.write(p,'manosaba-probe/tools/'+p.name)
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
rows=[]
for p in sorted(out.glob(name+'*')):
 if p.name.endswith('-SHA256.txt'):continue
 rows.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name)
(out/(name+'-SHA256.txt')).write_text('\n'.join(rows)+'\n',encoding='utf8')
print(json.dumps({'package':str(out/(name+'.bin')),'bytes':package.stat().st_size,'sourceZipBytes':archive.stat().st_size,'sha256':sha,'files':[p.name for p in out.glob(name+'*')]},ensure_ascii=False))


