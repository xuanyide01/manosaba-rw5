from pathlib import Path
import json,collections,sys
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parents[1]; out=root/'normalized';out.mkdir(exist_ok=True)
counts=collections.Counter();examples={}; expr=collections.defaultdict(set)
def value(v):
    if not isinstance(v,dict):return v
    if 'raw' in v:
        parts=v['raw'].get('parts',[])
        if any(p.get('expression') for p in parts):return {'expr':''.join('{'+p['expression']+'}' if p.get('expression') else p.get('text','') for p in parts)}
    v=v.get('value',v)
    if isinstance(v,list):return [value(i) for i in v]
    if isinstance(v,dict):
        if 'parts' in v:return ''.join(p.get('id') or p.get('text','') for p in v['parts'])
        if 'name' in v:return [value(v['name']),value(v['value'])]
    return v
for p in sorted((root/'extracted').glob('naninovel*/*.json')):
    d=json.loads(p.read_text(encoding='utf8'))
    if d['path'].startswith('Debug/'):continue
    refs={r['rid']:r for r in d['references']['RefIds']};ops=[]
    for q in d['playlist']['commands']:
        c=refs[q['rid']];data=c['data'];k=c['type']['class']
        op={'op':k,'line':data['playbackSpot']['lineIndex'],'indent':data['indent']}
        op.update({k:value(v) for k,v in data.items() if isinstance(v,dict) and v.get('hasValue')})
        ops.append(op);counts[k]+=1;examples.setdefault(k,[])
        if len(examples[k])<3:examples[k].append({'path':d['path'],**op})
        if k=='SetCustomVariable':expr[k].add(str(op.get('Expression')))
    lines=[refs[q['rid']] for q in d['lines']]
    labels={c['data']['labelText']:c['data']['lineIndex'] for c in lines if c['type']['class']=='LabelScriptLine'}
    target=out/(d['m_Name']+'.json');target.write_text(json.dumps({'path':d['path'],'labels':labels,'textMap':dict(zip(d['textMap']['idToText']['keys'],d['textMap']['idToText']['values'])),'ops':ops},ensure_ascii=False,indent=2),encoding='utf8')
(root/'reports/commands.json').write_text(json.dumps({'counts':counts,'examples':examples,'expressions':{k:sorted(v) for k,v in expr.items()}},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(counts,ensure_ascii=False,indent=2))
