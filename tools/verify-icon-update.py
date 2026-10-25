from pathlib import Path
import hashlib,json,re,zipfile

r=Path(__file__).resolve().parents[1]
out=r.parents[1]/'outputs'
m=json.loads((r/'src/manifest.json').read_text(encoding='utf8'))
assert m['versionName']=='0.1.7' and m['versionCode']==8
native=json.loads((r/'reports/native-final-qa.json').read_text(encoding='utf-8-sig'))
baseline=out/'魔法少女的魔女审判-RW5-0.1.6.bin'
current=r/'dist'/f"{m['package']}.debug.{m['versionName']}.rpk"
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert native['version']=='0.1.6' and sha(baseline)==native['packageSha256']=='a7fec6038265448a3598742aaef6e3b36b1dd5f02021aadd55190867831fb4a4'
pa=json.loads((r/'reports/package-audit.json').read_text(encoding='utf8'))
assert pa['sha256']==sha(current) and pa['outerSignatureValid'] and pa['innerSignatureValid']
with zipfile.ZipFile(out/'魔法少女的魔女审判-RW5-0.1.6-源码.zip') as z:
 prefix='manosaba-rw5/'
 old_files={n[len(prefix):] for n in z.namelist() if n.startswith(prefix+'src/') and not n.endswith('/')}
 new_files={p.relative_to(r).as_posix() for p in (r/'src').rglob('*') if p.is_file()}
 assert old_files==new_files
 source_changes=[n for n in sorted(new_files) if z.read(prefix+n)!=(r/n).read_bytes()]
 assert set(source_changes)=={'src/manifest.json','src/common/logo.png'}
 old_m=json.loads(z.read(prefix+'src/manifest.json'))
 assert dict(old_m,versionName=m['versionName'],versionCode=m['versionCode'])==m
with zipfile.ZipFile(baseline) as a,zipfile.ZipFile(current) as b:
 assert set(a.namelist())==set(b.namelist())
 changes=[n for n in sorted(a.namelist()) if a.read(n)!=b.read(n)]
 assert set(changes)=={'META-INF/CERT','META-INF/build.txt','app.js','common/logo.png','manifest-watch.json','manifest.json'}
 version=lambda v:v.replace(b'"versionName":"0.1.6","versionCode":7',b'"versionName":"0.1.7","versionCode":8')
 assert version(a.read('app.js'))==b.read('app.js')
 timestamp=lambda v:re.sub(rb'"timeStamp":"[^"]+"',b'"timeStamp":"BUILD_TIME"',v)
 assert timestamp(version(a.read('manifest.json')))==timestamp(b.read('manifest.json'))
 assert dict(json.loads(a.read('manifest-watch.json')),versionName=m['versionName'],versionCode=m['versionCode'])==json.loads(b.read('manifest-watch.json'))
 buildtime=lambda v:re.sub(rb'timeStamp=[^\r\n]+',b'timeStamp=BUILD_TIME',v)
 assert buildtime(a.read('META-INF/build.txt'))==buildtime(b.read('META-INF/build.txt'))
 png=b.read('common/logo.png')
 assert png[24:26]==bytes([8,6]) and png==(r/'src/common/logo.png').read_bytes()
 unchanged=len(a.namelist())-len(changes)
report={'version':m['versionName'],'sha256':sha(current),'bytes':current.stat().st_size,'baselineVersion':'0.1.6','baselineSha256':sha(baseline),'sourceFilesCompared':len(new_files),'sourceChanges':source_changes,'packageChanges':changes,'unchangedPackageEntries':unchanged,'compiledGameplayUnchanged':True,'allOtherSourceFilesIdentical':True,'iconPngBitDepth':8,'iconPngColorType':6,'nativeEvidenceInheritedFrom':'0.1.6','currentPackageNativeTested':False,'currentPackagePhysicalTested':False,'scope':'Icon and version metadata only; existing 0.1.6 gameplay checks were not rerun'}
(r/'reports/icon-only-v017.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
