"""Compile serialized Naninovel commands into an inert, bounded 2D watch VM."""
from pathlib import Path
import json,re,bisect,collections,sys
root=Path(__file__).resolve().parents[1];probe=root.parent/'manosaba-probe';common=root/'src/common'
sys.stdout.reconfigure(encoding='utf8')
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),encoding='utf8')
def clean(s):
 s=re.sub(r'<br\s*/?>[ \t]*(?:\r?\n)?','\n',str(s),flags=re.I);s=re.sub(r'<[^>]*>','',s)
 return s.replace('・','·').replace('\r','').strip()
locale={}
for p in (probe/'extracted').glob('general-localization-zhhans-scripts*/*.txt'):
 key=None;lines=[]
 for line in p.read_text(encoding='utf8').splitlines()+['# END']:
  if line.startswith('# '):
   if key:locale[key]='\n'.join(lines).strip()
   key=line[2:].strip();lines=[]
  elif not line.startswith(';') and line.strip():lines.append(line)
def zh(array):return next((i['_text'] for i in array if i['_locale']==2),'')
data={d['m_Name']:d for d in [read(p) for p in (probe/'extracted/general-data_assets_all').glob('*.json')]}
names={i['_id']:clean(zh(i['_familyName'])+zh(i['_name'])) for i in data['CharacterData']['_items']}
authors={i['_id']:clean(zh(i['_taggedText'])) for i in data['AuthorData']['_items']}
names.update({k:v for k,v in authors.items() if v})
book={}
for category in ['Clue','Profile','Rule','Note','Map']:
 for i in data[category+'Data']['_items']:
  obj=i['_item'];label=zh(obj.get('_name',obj.get('_title',obj.get('_buttonText',[])))) or names.get(i['_id'],category+' '+i['_id'])
  book[category+':'+i['_id']+':'+str(i['_version'])]={'id':i['_id'],'category':category,'version':i['_version'],'name':clean(label),'text':clean(zh(obj.get('_description',[])))}
write(common/'book.txt',book)
areas={'RecreationRoom':'娱乐室','Library':'图书室','Infirmary':'医务室','SolitaryConfinement':'禁闭室','BasementHallway':'地下走廊','Lake':'湖畔','Lounge':'会客厅','EntranceHall':'入口大厅','MessHall':'食堂','Showers':'淋浴室','ChamberGnome':'地精的房间','ChamberSalamander':'火蜥蜴的房间','ChamberUndine':'水精灵的房间','Courtroom':'审判庭','CourtroomHallway':'审判庭走廊','Courtyard':'中庭','FlowerFields':'花田','FrontGuesthouse':'迎宾馆前','NoahStudio':'诺亚的画室','PrisonEntrance':'监牢入口','UnknownArea':'未知区域','Wall':'围墙','Warehouse':'仓库'}
ds=[read(p) for p in sorted((probe/'normalized').glob('*.json'))];ds=[d for d in ds if not d['path'].startswith('Debug/')]
by={d['path']:d for d in ds};idby={d['path']:d['path'].split('/')[-1] for d in ds}
missing=[];allops={};sceneinfo={};mapping={};stats=collections.Counter();omitted=collections.Counter();sourceops=collections.Counter()
visual={'Wait','WaitForNextFrame','PlayBgm','PlaySfxModified','StopBgm','StopSfx','PlayVoice','StopVoice','ModifyCamera','AnimateActorExtended','EmoteJumpDouble','SpawnBlur','ChangeActorMaskability','DestroySpawnedExtended','ShowToastUI','ResetText','HidePrinter','ModifyTextPrinter','ChangeActorPivot','ProcessInput','Skip','EmoteJump','EmoteShake','EmoteNod','PlayMovie','HidePerspectiveStageScreen','SetTrialTimer','ModifyPerspectiveStageCamera','ShowPerspectiveStageScreen','ChangeTrialPauseMode','GosubToObjectionCutIn','GosubToSplitPerspectiveStageScreens','ShowCreditsUi','HideCreditsUi','ClearBacklog','ShakePerspectiveStageCamera','ChangeCourtFireFxActivity','ShowPrinter','UnloadPerspectiveStage','SplitPerspectiveStageScreen'}
def translated(d,key):
 if key in locale:return locale[key]
 if key in d['textMap']:
  val=d['textMap'][key]
  if val and re.search('[\u3040-\u30ff]',val):missing.append((d['path'],key))
  return val
 return str(key or '')
def rawexpr(x):return x.get('expr','') if isinstance(x,dict) else x
for d in ds:
 sid=idby[d['path']];src=d['ops'];result=[];lineMap={};patches=[];moves=[]
 def emit(o,line):
  o['_line']=line
  if moves:o['moves']=list(moves);moves.clear()
  result.append(o);stats[o['op']]+=1;return o
 def blockend(i):
  j=i+1
  while j<len(src) and src[j]['indent']>src[i]['indent']:j+=1
  return j
 def lineat(i):return src[i]['line'] if i<len(src) else 100000000
 for i,o in enumerate(src):
  k=o['op'];sourceops[k]+=1;line=o['line'];lineMap[line]=len(result)
  if k=='DestroySpawnedExtended' and o.get('Path')=='Clue':emit({'op':'clueHide'},line);continue
  if k=='AnimateActorExtended' and not o.get('Loop'):
   ids=[a for a in o.get('ActorIds',[]) if a.split('-')[0] in names]
   params={key:o[key] for key in ['ScenePositionX','ScenePositionY','PositionX','PositionY','PositionZ','Scale'] if key in o}
   if ids and params:moves.append({'actors':ids,'params':params})
  if k=='ClearChoiceHandler':moves.append({'clearChoices':o.get('HandlerId','*')})
  if k in visual or k=='SpawnShake':omitted[k]+=1;continue
  if k=='ModifyBackgroundExtended':
   if o.get('SubId') in ['Overlay','Fade']:continue
   app=o.get('AppearanceAndTransition',[]);a=app[0] if isinstance(app,list) and app else o.get('Appearance')
   if a or 'Visible' in o:emit({'op':'bg','actor':o.get('Id') or 'MainBackground','image':a or '', 'visible':o.get('Visible',1),'color':o.get('TintColor','#ffffff'),'sub':o.get('SubId','')},line)
  elif k=='ModifyCharacterExtended':
   a=o.get('IdAndAppearance');actor=a[0] if isinstance(a,list) else o.get('Id');appearance=a[1] if isinstance(a,list) and len(a)>1 else ''
   if actor:
    value={'op':'char','actor':actor,'appearance':appearance,'visible':o.get('Visible',1)}
    for source,key in [('SubId','sub'),('ScenePosition','scene'),('Position','position'),('Scale','scale')]:
     if source in o:value[key]=o[source]
    emit(value,line)
  elif k in ['HideAllCharacters','HideAllActors']:emit({'op':'hideAll','all':k=='HideAllActors'},line)
  elif k in ['HideActors','ShowActors']:emit({'op':'visibility','actors':o.get('ActorIds',[]),'visible':k=='ShowActors'},line)
  elif k=='GosubToModifyPerspectiveStageCamera':
   if o.get('LookCharacterId'):emit({'op':'focus','actor':o['LookCharacterId']},line)
  elif k in ['PrintTextModified','PrintDebateText']:
   text=translated(d,o.get('Text',''));links=[{'text':clean(m[1]),'target':[sid,m[0]]} for m in re.findall(r'<link="([^"]+)">(.*?)</link>',text,re.S)]
   speaker=o.get('AuthorId','')
   if k=='PrintDebateText' and not speaker:
    speaker=next((x for x in names if re.search('_'+re.escape(x)+r'\d+',str(o.get('Text','')))),'')
   label=clean(translated(d,o['AuthorLabel'])) if o.get('AuthorLabel') else names.get(speaker,speaker)
   emit({'op':'text','text':clean(text),'speaker':label,'actor':speaker,'links':links,'debate':k=='PrintDebateText'},line)
  elif k=='AddChoice':
   text=clean(translated(d,o.get('ChoiceSummary','')))
   if not text and o.get('ChoiceSummary')=='Common_Return':text='返回'
   if not text:raise ValueError('Unlabeled choice '+d['path']+':'+str(line))
   end=blockend(i)
   menu=next((q['line'] for q in src[end:] if q['op']=='StopForChoice' and q['indent']<=o['indent']),None)
   if menu is None and d['path']=='System/System_BadEnd':menu=next((q['line'] for q in src[end:] if q['op']=='Stop'),None)
   guards=[]
   for gi,g in enumerate(src[:i]):
    if g['indent']>=o['indent'] or blockend(gi)<=i:continue
    if g['op']=='BeginIf':guards.append(g.get('Expression',''))
    elif g['op']=='BeginIfCurrentLanguage':guards.append((g.get('LanguageName')=='zh-Hans')!=bool(g.get('Unless')))
    elif g['op']=='Else':
     prior=next((x for x in reversed(src[:gi]) if x['indent']==g['indent'] and x['op']=='BeginIf'),None)
     if prior:guards.append('!('+str(prior.get('Expression',''))+')')
   o2=emit({'op':'offer','text':text,'toLine':lineat(i+1),'afterLine':lineat(end),'lock':o.get('Lock',0),'menu':menu,'when':guards},line)
  elif k=='StopForChoice':emit({'op':'choice','menu':line,'clear':o.get('Clear',0)},line)
  elif k in ['BeginIf','BeginIfCurrentLanguage']:
   expr=o.get('Expression','') if k=='BeginIf' else str(o.get('LanguageName'))=='zh-Hans'
   if k=='BeginIfCurrentLanguage' and o.get('Unless'):expr=not expr
   end=blockend(i);emit({'op':'if','expr':expr,'toLine':lineat(end)},line)
  elif k=='Else':
   # Previous false condition lands on Else; successful branches must skip it.
   emit({'op':'else','toLine':lineat(blockend(i))},line)
  elif k=='GotoModified':emit({'op':'jump','target':o.get('Path')},line)
  elif k=='Gosub':emit({'op':'call','target':o.get('Path')},line)
  elif k=='GosubResetWitchBook':
   m=re.match(r'Act(\d+)_Chapter(\d+)/.*_(Adv|Bad|Trial)',d['path'])
   if m:
    a,c,kind=m.groups();version=o.get('Version',1);label='Reset%d-%d-%s'%(int(a),int(c),'Trial'+str(version) if kind=='Trial' else 'Adv'+(str(version) if int(a)==2 and int(c)==5 else ''))
    emit({'op':'resetBook','target':['System_ResetWitchBook',label],'onlyDirect':'IsDebugDirectJump' in o},line)
  elif k in ['Return','CancelGosub']:emit({'op':'return' if k=='Return' else 'cancelCall'},line)
  elif k=='SetCustomVariable':emit({'op':'set','expr':o['Expression']},line)
  elif k=='SetCustomVariableAsFlag':emit({'op':'flag','variable':o['VariableName'],'number':o['Number']},line)
  elif k=='ClearWitchBook':emit({'op':'bookClear'},line)
  elif k=='UpdateWitchBook':emit({'op':'bookUpdate','category':o['Category'],'id':o['Id'],'version':o.get('Version',1)},line)
  elif k=='RecordCorrectChoice':emit({'op':'recordChoice','number':o.get('Number',0)},line)
  elif k=='ChoiceMapArea':emit({'op':'map','areas':o['MapAreaNames'],'flag':o.get('FlagVariableName','')},line)
  elif k=='ChoiceEvidence':emit({'op':'evidence','categories':o.get('CategoryNames',['Clue'])},line)
  elif k=='SetBadId':emit({'op':'set','expr':'commonBadEndId='+str(o.get('CommonBadEndId',1))},line)
  elif k=='Damage':emit({'op':'damage'},line)
  elif k=='AutoSave':emit({'op':'autosave'},line)
  elif k in ['ProcessBadEnd','ReturnToTitle','Quit']:emit({'op':'end','kind':'bad' if k=='ProcessBadEnd' else 'clear'},line)
  elif k=='Stop':
   # Unity resumes these waits via execution buttons / credits callbacks.
   # The watch has explicit execution confirmation; preserve remaining waits as taps.
   if o['indent'] and any(q['op']=='BeginIf' and q.get('Expression')=='!enableDebugSkip' for q in src[max(0,i-3):i]):omitted['Stop:confirmedExecution']+=1
   elif i+1<len(src):emit({'op':'pause','text':'点击继续'},line)
   elif d['path']=='System/System_BadEnd':emit({'op':'choice','menu':line},line)
   else:emit({'op':'stop'},line)
  elif k=='WaitForInput':emit({'op':'pause'},line)
  elif k=='SpawnExtended':
   if o.get('Path')=='Clue':emit({'op':'clueImage','id':(o.get('Params') or [''])[0]},line)
   else:omitted[k+':'+str(o.get('Path'))]+=1
  elif k=='ShowUI':
   if any(n in o.get('UINames',[]) for n in ['ExecutionButtonUI','ExecutionButton']):emit({'op':'execution'},line)
   else:omitted[k]+=1
  elif k in ['HideUI','ChangeTrialMode','LoadPerspectiveStage','ChangeDebateMode','ClearChoiceHandler','ShowLoadUi']:omitted[k]+=1
  else:raise ValueError('Unclassified semantic command '+k)
 if not result or result[-1]['op'] not in ['end','return','stop','jump']:emit({'op':'end','kind':'end'},100000001)
 lines=sorted(lineMap);indices=[lineMap[x] for x in lines]
 def resolveLine(l):
  index=bisect.bisect_left(lines,l);return indices[index] if index<len(lines) else len(result)-1
 labels={name:resolveLine(l) for name,l in d['labels'].items()}
 for j,o in enumerate(result):
  if 'toLine' in o:o['to']=resolveLine(o.pop('toLine'))
  if 'afterLine' in o:o['after']=resolveLine(o.pop('afterLine'))
  if o['op']=='if' and result[o['to']]['op']=='else':
   # Land just inside Else only when the condition is false.
   o['to']+=1
  if o['op']=='else':o['op']='jump';o['target']=[sid,o.pop('to')]
  o.pop('_line',None)
 for choice in result:
  if choice['op']=='choice':
   choice['items']=[{'text':item['text'],'to':j+1,'end':item['after'],'kind':'branch','when':item.get('when',[]),'lock':item.get('lock',0)} for j,item in enumerate(result) if item['op']=='offer' and item.get('menu')==choice.get('menu')]
 previousChoice=None
 for choice in result:
  if choice['op']=='choice':
   if not choice['items'] and choice.get('clear') and previousChoice:
    choice['items']=[dict(item) for item in previousChoice['items']];choice['reuseMenu']=previousChoice['menu']
   if choice['items']:previousChoice=choice
 allops[sid]=result;mapping[sid]=labels
 m=re.match(r'Act(\d+)_Chapter(\d+)_([A-Za-z]+)(\d+)?',sid)
 if m:
  a,c,kind,num=m.groups();route=(int(a)-1)*5+int(c)-1
  label=('日常' if kind=='Adv' else '审判' if kind=='Trial' else '结局')+(' '+str(int(num)) if num else '准备')
  name='第%s幕 第%d章 · %s'%('一' if a=='01' else '二',int(c),label)
 else:route=-1;name=sid
 sceneinfo[sid]={'name':name,'length':len(result),'route':route,'labels':labels}
unresolved=[]
def target(t,current):
 if isinstance(t,dict):return t
 scene,label=t
 scene=scene.split('/')[-1] if scene else current
 if scene not in allops:unresolved.append((current,t));return [scene,0]
 if isinstance(label,int):return [scene,label]
 if label and label not in mapping[scene]:unresolved.append((current,t));return [scene,0]
 return [scene,mapping[scene].get(label,0)]
for sid,ops in allops.items():
 for o in ops:
  if 'target' in o:o['target']=target(o['target'],sid)
  for item in o.get('links',[]):item['target']=target(item['target'],sid)
 for i in range(0,len(ops),512):write(common/'story'/sid/(str(i//512)+'.txt'),ops[i:i+512])
routes=[];chapters=[]
for route in range(11):
 ids=[sid for sid in allops if sceneinfo[sid]['route']==route and re.search(r'_(Adv|Trial)\d+$',sid)]
 ids.sort(key=lambda s:('Trial' in s,int(re.search(r'(\d+)$',s)[1])))
 name='第一幕 · 第%d章'%(route+1) if route<5 else '第二幕 · 第%d章'%(route-4)
 routes.append({'id':route,'name':name,'scenes':ids})
 chapters += [{'id':sid,'name':sceneinfo[sid]['name'],'route':route} for sid in ids]
catalog={'initial':'Act01_Chapter01_Adv01','scenes':sceneinfo,'routes':routes,'chapters':chapters,'endings':{},'names':names,'areas':areas}
(common/'catalog.js').write_text('export const catalog='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
report={'scenes':len(ds),'text':stats['text'],'operations':sum(map(len,allops.values())),'sourceCommands':sourceops,'compiledCommands':stats,'omittedPresentation':omitted,'missingChinese':missing,'unresolvedTargets':unresolved}
write(root/'reports/story.json',report)
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceCommands','compiledCommands','omittedPresentation']},ensure_ascii=False))
if unresolved or missing:raise SystemExit('Unresolved control flow or Chinese localization; inspect reports/story.json')
