from pathlib import Path
import json,io,zipfile,hashlib
from PIL import Image
from fontTools.ttLib import TTFont
from rpk_signature import audit
r=Path(__file__).resolve().parents[1];m=json.loads((r/'src/manifest.json').read_text(encoding='utf8'));p=r/'dist'/(m['package']+'.debug.'+m['versionName']+'.rpk')
report=audit(p);assert p.stat().st_size<=10000000
z=zipfile.ZipFile(p);assert json.loads(z.read('manifest-watch.json'))==m
images=0;maxPixels=0;strings=[]
def visit(v):
 if isinstance(v,str):strings.append(v)
 elif isinstance(v,list):
  for i in v:visit(i)
 elif isinstance(v,dict):
  for i in v.values():visit(i)
for n in z.namelist():
 if n.endswith('/'):continue
 if n.startswith('common/'):
  source=r/'src'/n;assert source.exists() and source.read_bytes()==z.read(n),n
 if n.endswith(('.png','.jpg')):
  im=Image.open(io.BytesIO(z.read(n)));im.load();images+=1;maxPixels=max(maxPixels,im.width*im.height)
  assert im.width<=432 and im.height<=514,(n,im.size)
 if n.startswith('common/story/') and n.endswith('.txt'):
  data=json.loads(z.read(n));chunk=data if isinstance(data,list) else data['ops'];assert len(chunk)<=512;visit(chunk)
  if not isinstance(data,list):
   assert data['format']==2 and len(data['plan']['textEnds'])==len(chunk)
   assert all(0<=ord(c)-1024<=len(chunk) for c in data['plan']['textEnds'])
   visit(data['plan'].get('display',{}));visit(data['plan'].get('objections',{}))
for n in ['common/book.txt','common/gallery.txt']:visit(json.loads(z.read(n)))
font=TTFont(io.BytesIO(z.read('common/manosaba.otf'))).getBestCmap()
for s in strings:assert all(c.isspace() or ord(c)<32 or ord(c) in font for c in s),repr(s)
logo=Image.open(io.BytesIO(z.read('common/logo.png'))).convert('RGBA')
assert logo.size==(192,192)
assert all(logo.getpixel(p)[3]==0 for p in [(0,0),(191,0),(0,191),(191,191)])
report.update({'capBytes':10000000,'watchManifestValid':True,'commonResourcesIdenticalToSource':True,'decodedImages':images,'maxImagePixels':maxPixels,'allStoryAndNotebookGlyphsCovered':True,'roundTransparentIcon':True,'chunkMaxOps':512,'physicalDeviceTested':False})
(r/'reports/package-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(report,ensure_ascii=False))
