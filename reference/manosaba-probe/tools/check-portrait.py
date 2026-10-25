from pathlib import Path
import json,sys,hashlib
sys.stdout.reconfigure(encoding='utf8')
r=Path(__file__).resolve().parents[1]
print([(p.name,hashlib.sha256(p.read_bytes()).hexdigest()[:10]) for p in (r/'art/characters/ema').glob('*.png')])
a=json.loads((r/'reports/art-samples/ema.json').read_text(encoding='utf8'))
g={x['id']:x['tree']['m_Name'] for x in a if x['type']=='GameObject'}
t={x['id']:x['tree'] for x in a if x['type']=='Transform'}
for name in ['Eyes01_Smile_Closed01','Angle01','Head01','Body']:
 id=next(i for i,d in t.items() if g[d['m_GameObject']['m_PathID']]==name);parts=[]
 while id:
  d=t[id];parts.insert(0,g[d['m_GameObject']['m_PathID']]);id=d['m_Father']['m_PathID']
 print(name,parts)
sys.path.insert(0,str(r.parent/'pydeps'))
import UnityPy
e=UnityPy.load(str(r/'art-inputs/general-witchbook_assets_all.bundle'))
print('BOOK TEXTURES',[(o.path_id,o.read().m_Name) for o in e.objects if o.type.name=='Texture2D'][:30])
