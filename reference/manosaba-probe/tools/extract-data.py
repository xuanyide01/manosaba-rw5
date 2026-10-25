"""Extract inert Unity assets; never load game code."""
from pathlib import Path
import sys,json,collections
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root.parent/'pydeps'))
import UnityPy
out=root/'extracted';out.mkdir(exist_ok=True)
report=[]
for p in sorted((root/'inputs').glob('*.bundle')):
    env=UnityPy.load(str(p)); rows=[]
    folder=out/p.stem;folder.mkdir(exist_ok=True)
    for obj in env.objects:
        row={'id':obj.path_id,'type':obj.type.name}
        if obj.type.name=='TextAsset':
            d=obj.read();row['name']=d.m_Name
            data=d.m_Script.encode('utf8',errors='surrogateescape') if isinstance(d.m_Script,str) else d.m_Script
            (folder/(d.m_Name.replace('/','_')+'.txt')).write_bytes(data);row['bytes']=len(data)
        elif obj.type.name in ('MonoBehaviour','MonoScript'):
            try:
                tree=obj.read_typetree();row['name']=tree.get('m_Name','');row['keys']=list(tree)
                (folder/(str(obj.path_id)+'.json')).write_text(json.dumps(tree,ensure_ascii=False,indent=2),encoding='utf8')
            except Exception as e:row['error']=str(e)
        rows.append(row)
    report.append({'bundle':p.name,'types':dict(collections.Counter(r['type'] for r in rows)),'objects':rows})
(root/'reports/extracted.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for r in report:
    print(r['bundle'],r['types'],[(o.get('name'),o.get('keys'),o.get('error')) for o in r['objects'][:3]])
