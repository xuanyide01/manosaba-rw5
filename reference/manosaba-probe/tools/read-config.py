from pathlib import Path
import sys,json,collections
r=Path(__file__).resolve().parents[1];sys.path.insert(0,str(r.parent/'pydeps'))
import UnityPy
sys.stdout.reconfigure(encoding='utf8')
e=UnityPy.load(str(r/'inputs/resources.assets'));rows=[]
for o in e.objects:
 if o.type.name not in ['MonoBehaviour','MonoScript']:continue
 try:rows.append({'id':o.path_id,'type':o.type.name,'tree':o.read_typetree()})
 except ValueError:pass
(r/'reports/resources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print('CONFIG NAMES',[(x['id'],x['tree'].get('m_Name'),list(x['tree'])[4:9]) for x in rows if x['tree'].get('m_Name')])
print('VARS',*[x for x in rows if 'maxHp' in str(x)],sep='\n')
