from pathlib import Path
import json,sys,collections
sys.stdout.reconfigure(encoding='utf8')
r=Path(__file__).resolve().parents[1]
ds=[json.loads(p.read_text(encoding='utf8')) for p in (r/'normalized').glob('*.json')]
ops=[o for d in ds for o in d['ops']]
for key in ['ConditionalExpression']:
 print(key,sorted({str(o.get(key)) for o in ops if o.get(key)}))
print('IF',sorted({str(o.get('Expression')) for o in ops if o['op']=='BeginIf'}))
print('GOSUB',sorted({str(o.get('Path')) for o in ops if o['op']=='Gosub' and not str(o.get('Path')).startswith("['System/")}))
print('Goto expr',[o for o in ops if o['op']=='GotoModified' and not isinstance(o.get('Path'),list)])
print('Choice extra',[o for o in ops if o['op']=='AddChoice' and any(k in o for k in ['Gosub','Goto','OnSelect','ConditionalExpression'])][:8])
print('flags',[o for o in ops if o['op']=='ChoiceEvidence' and o.get('FlagVariableName')][:5])
print('var cond choices',[(d['path'],o) for d in ds for o in d['ops'] if o['op']=='BeginIf' and any(x in str(o) for x in ['Evidence','evidence','Area','area','Hp'])][:15])
for name in ['Act01_Chapter01_Trial02','Act01_Chapter01_Adv11','System_ResetWitchBook']:
 d=next(d for d in ds if d['path'].endswith('/'+name))
 print('SCRIPT',name,'labels',d['labels'])
 if name.endswith('Adv11') or name.startswith('System_'):print(json.dumps(d['ops'],ensure_ascii=False,indent=1))
print('debate links',[(d['path'],k,v) for d in ds for k,v in d['textMap'].items() if '<link' in str(v)][:8])
