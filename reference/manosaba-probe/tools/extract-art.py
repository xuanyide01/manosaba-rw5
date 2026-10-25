from pathlib import Path
import sys,json,re,collections,math
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'pydeps'))
import UnityPy
from PIL import Image,ImageDraw,ImageChops
sys.stdout.reconfigure(encoding='utf8')
r=Path(__file__).resolve().parents[1];out=r/'art';out.mkdir(exist_ok=True)
def save(im,p):p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def backgrounds():
 rows=[]
 for p in sorted((r/'art-inputs/naninovel-backgrounds_assets_naninovel/backgrounds').rglob('*.bundle')):
  env=UnityPy.load(str(p));kind=p.parent.name
  sprites=[o for o in env.objects if o.type.name=='Sprite']
  for o in sprites:
   d=o.read();name=d.m_Name;dest=out/kind/(p.stem+'__'+name+'.png');im=d.image
   # Preserve the complete composition; resize only for the intermediate cache.
   im.thumbnail((960,720),Image.Resampling.LANCZOS);save(im,dest)
   rows.append({'kind':kind,'bundle':p.stem,'name':name,'file':str(dest.relative_to(out)),'size':im.size})
 (r/'reports/background-art.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');print('BACKGROUND',len(rows),flush=True)
def ui():
 env=UnityPy.load(str(r/'art-inputs/general-sprites_assets_all.bundle'));rows=[]
 for o in env.objects:
  if o.type.name!='Sprite':continue
  d=o.read();im=d.image;save(im,out/'ui'/(d.m_Name+'.png'));rows.append({'name':d.m_Name,'size':im.size})
 (r/'reports/ui-art.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');print('UI',len(rows),flush=True)
def character(p):
 cached=r/'reports'/('character-'+p.stem+'.json')
 if cached.exists():
  rows=json.loads(cached.read_text(encoding='utf8'))
  if all(x.get('renderVersion')==(4 if p.stem in ['alisa','warden'] else 3) for x in rows):return rows
 env=UnityPy.load(str(p));objects={o.path_id:o for o in env.objects}
 trees={o.path_id:o.read_typetree() for o in env.objects if o.type.name in ['GameObject','Transform','MonoBehaviour','SpriteRenderer']}
 gos={i:d for i,d in trees.items() if objects[i].type.name=='GameObject'}
 transforms={i:d for i,d in trees.items() if objects[i].type.name=='Transform'}
 gt={d['m_GameObject']['m_PathID']:i for i,d in transforms.items()}
 if not transforms:
  sprites=[o for o in env.objects if o.type.name=='Sprite']
  if not sprites:return []
  decoded=[o.read() for o in sprites];decoded.sort(key=lambda d:(0 if d.m_Name=='1' else 1,d.m_Name));rows=[]
  selected=decoded if p.stem=='warden' else [max(decoded,key=lambda d:d.m_Rect.width*d.m_Rect.height)]
  for d in selected:
   im=d.image.convert('RGBA');box=im.getbbox();im=im.crop(box) if box else im;im.thumbnail((600,1100),Image.Resampling.LANCZOS)
   appearances=[d.m_Name]+(['Default'] if d is selected[0] else [])
   for appearance in appearances:
    dest=out/'characters'/p.stem/(appearance+'.png');save(im,dest)
    rows.append({'actor':p.stem,'appearance':appearance,'size':im.size,'file':str(dest.relative_to(out)),'renderVersion':4 if p.stem=='warden' else 3})
  cached.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');return rows
 root=next(i for i,d in transforms.items() if not d['m_Father']['m_PathID'])
 sr={gt[d['m_GameObject']['m_PathID']]:d for i,d in trees.items() if objects[i].type.name=='SpriteRenderer'}
 paths={};positions={};scales={}
 def visit(i,path,pos,scale):
  d=transforms[i];n=gos[d['m_GameObject']['m_PathID']]['m_Name'];path='' if i==root else path+'/'+n if path else n
  paths[path]=i;local=d['m_LocalPosition'];s=d['m_LocalScale'];pos=(pos[0]+local['x']*scale[0],pos[1]+local['y']*scale[1]);scale=(scale[0]*s['x'],scale[1]*s['y']);positions[i]=pos;scales[i]=scale
  for c in d['m_Children']:visit(c['m_PathID'],path,pos,scale)
 visit(root,'',(0,0),(1,1))
 comps=next((d for d in trees.values() if 'compositionMap' in d),{})
 mapping={x['Key']:x['Composition'] for x in comps.get('compositionMap',[])}
 names=['Default']+[k for k in mapping if re.match(r'^(Normal|Smile|Angry|Pensive|Cry|Flushed|Surprised|Fearful|Determined)\d*$',k)]
 if not comps:names=['Default']
 names=list(dict.fromkeys(names));images={};rows=[]
 for name in names:
  enabled={i:bool(d['m_Enabled']) for i,d in sr.items()}
  def subtree(i):
   yield i
   for c in transforms[i]['m_Children']:yield from subtree(c['m_PathID'])
  def seton(path,on):
   i=paths.get(path)
   if i is not None:
    for j in subtree(i):
     if j in sr:enabled[j]=on
  def apply(expr,depth=0):
   if depth>12:raise ValueError('Recursive composition '+expr)
   for part in expr.split(','):
    if not part:continue
    if part in mapping:apply(mapping[part],depth+1);continue
    m=re.match(r'^(.*?)([>+\-])(.*?)$',part)
    if m:
     parent,op,child=m.groups()
     if op=='>':seton(parent,False);seton(parent+'/'+child,True)
     elif op=='+':seton(parent+'/'+child,True)
     else:seton(parent,False)
  apply(comps.get('defaultAppearance',''));apply(name)
  parts=[]
  for i,d in sr.items():
   if not enabled[i] or gos[d['m_GameObject']['m_PathID']]['m_Name'].lower().startswith('clippingmask'):continue
   sprite=objects[d['m_Sprite']['m_PathID']].read();sid=d['m_Sprite']['m_PathID']
   if sid not in images:images[sid]=sprite.image
   im=images[sid];sx,sy=scales[i];x,y=positions[i];unit=sprite.m_PixelsToUnits
   if unit<=0:unit=100
   w,h=im.size;w=w/unit*abs(sx);h=h/unit*abs(sy)
   pivot=sprite.m_Pivot
   material=objects[d['m_Materials'][0]['m_PathID']].read().m_Name if d['m_Materials'] else ''
   parts.append((d['m_SortingOrder'],im,(x-w*pivot.x,y+h*(1-pivot.y),w,h),d['m_Color'],material))
  if not parts:continue
  x0=min(q[2][0] for q in parts);x1=max(q[2][0]+q[2][2] for q in parts)
  y1=max(q[2][1] for q in parts);y0=min(q[2][1]-q[2][3] for q in parts)
  factor=100;canvas=Image.new('RGBA',(math.ceil((x1-x0)*factor),math.ceil((y1-y0)*factor)))
  for z,im,(x,y,w,h),color,material in sorted(parts,key=lambda q:q[0]):
   im=im.resize((max(1,round(w*factor)),max(1,round(h*factor))),Image.Resampling.LANCZOS)
   channels=list(im.convert('RGBA').split())
   for ch,key in enumerate(['r','g','b','a']):
    if color[key]!=1:channels[ch]=channels[ch].point(lambda value,m=color[key]:round(value*m))
   im=Image.merge('RGBA',channels)
   layer=Image.new('RGBA',canvas.size);layer.alpha_composite(im,(round((x-x0)*factor),round((y1-y)*factor)))
   if 'Multiply' in material or 'Softlight' in material:
    alpha=ImageChops.multiply(canvas.getchannel('A'),layer.getchannel('A'))
    mixed=(ImageChops.multiply if 'Multiply' in material else ImageChops.soft_light)(canvas.convert('RGB'),layer.convert('RGB'))
    rgb=Image.composite(mixed,canvas.convert('RGB'),alpha);rgb.putalpha(canvas.getchannel('A'));canvas=rgb
   else:canvas=Image.alpha_composite(canvas,layer)
  box=canvas.getbbox()
  if not box:continue
  canvas=canvas.crop(box);canvas.thumbnail((600,1100),Image.Resampling.LANCZOS)
  dest=out/'characters'/p.stem/(name+'.png');save(canvas,dest)
  rows.append({'actor':p.stem,'appearance':name,'size':canvas.size,'file':str(dest.relative_to(out)),'renderVersion':4 if p.stem=='alisa' else 3})
 cached.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');return rows
if __name__=='__main__':
 task=sys.argv[1] if len(sys.argv)>1 else 'all'
 if task in ['all','backgrounds']:backgrounds()
 if task in ['all','ui']:ui()
 if task in ['all','characters']:
  rows=[]
  for p in sorted((r/'art-inputs/naninovel-characters_assets_naninovel/characters').glob('*.bundle')):
   a=character(p);rows+=a;print('CHAR',p.stem,len(a),flush=True)
  (r/'reports/character-art.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
