from pathlib import Path
import json,re,hashlib,sys
from PIL import Image,ImageOps,ImageDraw,ImageFilter
r=Path(__file__).resolve().parents[1];probe=r.parent/'manosaba-probe';common=r/'src/common';art=probe/'art'
sys.path.insert(0,str(r.parent/'pydeps'))
import UnityPy
# pip install imagequant==1.1.5; local cached wheel is an optional build dependency.
sys.path.insert(0,str(r.parent/'anemoi-rw5/tools/image-deps'))
import imagequant
sys.stdout.reconfigure(encoding='utf8')
def read(p):return json.loads(p.read_text(encoding='utf8'))
images=common/'images';images.mkdir(exist_ok=True);bg={};portraits={};dims={};gallery=[]
for row in read(probe/'reports/background-art.json'):
 im=Image.open(art/row['file']).convert('RGB');im.thumbnail((360,286),Image.Resampling.LANCZOS)
 name=('cg_' if row['kind']=='stills' else 'bg_' if row['kind']=='mainbackground' else 'tr_')+row['bundle']+'.jpg';im.save(images/name,quality=52,optimize=True,progressive=False)
 bg[row['kind']+':'+row['bundle']]=name
 if row['kind']=='stills':gallery.append({'image':name,'group':'cg_'+row['bundle'].split('_')[0],'label':'CG '+row['bundle'].split('_')[0],'source':row['bundle']})
for row in read(probe/'reports/character-art.json'):
 im=Image.open(art/row['file']).convert('RGBA')
 # Keep the face and upper body readable, with the waist aligned to the panel edge.
 if row['actor']=='hanna':im=im.crop((round(im.width*.15),0,round(im.width*.85),round(im.height*.62)))
 elif not row['actor'].startswith('creature') and im.height>im.width*1.3:im=im.crop((0,0,im.width,round(im.height*.62)))
 im.thumbnail((240,300),Image.Resampling.LANCZOS)
 im=imagequant.quantize_pil_image(im,dithering_level=0.0,max_colors=256,min_quality=0,max_quality=100)
 import io
 buffer=io.BytesIO();im.save(buffer,format='PNG',optimize=True);data=buffer.getvalue();name='p_'+hashlib.sha256(data).hexdigest()[:18]+'.png';(images/name).write_bytes(data)
 portraits[row['actor']+':'+row['appearance']]=name;dims[name]=im.size
# Small evidence/map images remain legible in the notebook and during submission.
bookImages={};env=UnityPy.load(str(probe/'art-inputs/general-witchbook_assets_all.bundle'))
for obj in env.objects:
 if obj.type.name!='Texture2D':continue
 d=obj.read();im=d.image.convert('RGB');im.thumbnail((300,230),Image.Resampling.LANCZOS);name='book_'+re.sub('[^A-Za-z0-9_-]','_',d.m_Name)+'.jpg';im.save(images/name,quality=52,optimize=True)
 m=re.match('Clue_(\d+)_(\d+)',d.m_Name)
 key='Clue:'+str(int(m[1]))+'-'+str(int(m[2])) if m else d.m_Name.replace('_',':',1)
 bookImages[key]=name
# Remove only obsolete generated portraits inside this project's images directory.
for p in images.glob('p_*.png'):
 assert p.resolve().parent==images.resolve()
 if p.name not in dims:p.unlink()
(common/'gallery.txt').write_text(json.dumps(gallery,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(common/'assets.js').write_text('const bg='+json.dumps(bg,separators=(',',':'))+';\nconst portraits='+json.dumps(portraits,separators=(',',':'))+';\nexport const bookImages='+json.dumps(bookImages,separators=(',',':'))+''';
export function imagePath(name){return name?'/common/images/'+name:'/common/ui/blank.png';}
export function backgroundAsset(actor,image){const kind=actor==='Stills'?'stills':actor==='Tricks'?'tricks':'mainbackground';return bg[kind+':'+image]||'';}
export function portraitAsset(actor,appearance){const id=String(actor).split(/[-,]/)[0].toLowerCase();return portraits[id+':'+appearance]||portraits[id+':Default']||'';}
''',encoding='utf8')
(common/'portrait-layout.js').write_text('const dimensions='+json.dumps(dims,separators=(',',':'))+''';
export function portraitBox(path,count,index){const size=dimensions[String(path||'').split('/').pop()]||[180,286],cell=count>=3?144:count===2?216:432,scale=Math.min((count===1?286:cell)/size[0],286/size[1]),width=Math.round(size[0]*scale),height=Math.round(size[1]*scale);return {width,height,left:Math.round(index*cell+(cell-width)/2),top:286-height};}
''',encoding='utf8')
ui=common/'ui';ui.mkdir(exist_ok=True)
Image.new('RGBA',(2,2)).save(ui/'blank.png')
Image.new('RGB',(432,514),'#201820').save(ui/'system.png')
Image.new('RGB',(432,286),'#241b27').save(ui/'art-fill.png')
logo=Image.open(art/'ui/TitleLogo_White@ZhHans.png').convert('RGBA');logo.thumbnail((376,138),Image.Resampling.LANCZOS);logo.save(ui/'title-logo.png')
# Original title CGs selected by the same g_gameProgress < 6 boundary.
for idx,src,cx in [(1,'1_1__Still_001_001.png',.23),(2,'2_1__Still_002_001.png',.89)]:
 original=Image.open(art/'stills'/src).convert('RGB')
 hero=ImageOps.fit(original,(432,290),method=Image.Resampling.LANCZOS,centering=(cx,.6)).convert('RGBA')
 title=Image.new('RGBA',(432,514),'#201820');title.alpha_composite(hero)
 shade=Image.new('RGBA',(432,514));draw=ImageDraw.Draw(shade)
 for y in range(120):draw.line((0,y,431,y),fill=(20,13,20,round(160*(1-y/120))))
 for y in range(230,310):draw.line((0,y,431,y),fill=(32,24,32,round(255*(y-230)/79)))
 title=Image.alpha_composite(title,shade)
 # Carry the CG's cage/rose palette through the lower menu instead of a flat void.
 texture=ImageOps.fit(original,(432,230),method=Image.Resampling.LANCZOS,centering=(cx,.8)).filter(ImageFilter.GaussianBlur(4)).convert('RGBA')
 tint=Image.new('RGBA',texture.size,(29,19,31,233));texture=Image.alpha_composite(texture,tint);title.alpha_composite(texture,(0,284))
 decor=Image.new('RGBA',title.size);dd=ImageDraw.Draw(decor)
 for x in [14,19,412,417]:dd.line((x,284,x,503),fill=(167,119,136,65),width=1)
 for y in [287,507]:
  dd.line((30,y,196,y),fill=(174,130,146,115));dd.line((236,y,402,y),fill=(174,130,146,115));dd.polygon([(216,y-4),(220,y),(216,y+4),(212,y)],outline=(207,164,180,170))
 for x0,y0,x1,y1 in [(26,296,204,360),(228,296,406,360),(26,366,204,430),(228,366,406,430),(112,436,320,500)]:
  cut=7;dd.polygon([(x0+cut,y0),(x1-cut,y0),(x1,y0+cut),(x1,y1-cut),(x1-cut,y1),(x0+cut,y1),(x0,y1-cut),(x0,y0+cut)],fill=(50,30,47,150),outline=(153,108,129,135))
  dd.line((x0+12,y0+3,x0+42,y0+3),fill=(216,170,188,150));dd.line((x1-42,y1-3,x1-12,y1-3),fill=(216,170,188,150))
 title=Image.alpha_composite(title,decor);title.convert('RGB').save(ui/('title-'+str(idx)+'.jpg'),quality=85,optimize=True)
# Preserve the original painted English buttons, trim only empty padding.
for label in ['NewGame','LoadGame','Gallery','Options','Exit']:
 button=Image.open(art/'ui'/('Button_'+label+'_Normal.png')).convert('RGBA')
 button=button.crop(button.getbbox());button.thumbnail((172,64),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(184,68));canvas.alpha_composite(button,((184-button.width)//2,(68-button.height)//2));canvas.save(ui/('button-'+label+'.png'),optimize=True)
if (ui/'title.jpg').exists():(ui/'title.jpg').unlink()
face=Image.open(art/'characters/ema/Default.png').convert('RGBA');face=face.crop((0,0,face.width,min(face.height,round(face.width*1.1))));face=ImageOps.fit(face,(192,192),centering=(.5,.2));bgicon=Image.new('RGBA',(192,192),'#49323e');bgicon.alpha_composite(face);mask=Image.new('L',(192,192));ImageDraw.Draw(mask).ellipse((1,1,190,190),fill=255);bgicon.putalpha(mask);bgicon.save(common/'logo.png',optimize=True)
report={'backgrounds':len(bg),'cgImages':len(gallery),'cgGroups':len({x['group'] for x in gallery}),'portraitAppearances':len(portraits),'uniquePortraits':len(dims),'bookImages':len(bookImages),'imageBytes':sum(p.stat().st_size for p in images.glob('*')),'portraitColors':256,'portraitQuantizer':'libimagequant 1.1.5, perceptual palette, no dithering','backgroundMaxWidth':360,'backgroundJpegQuality':52,'bookJpegQuality':52}
(r/'reports/art.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))

# Apply the user-selected campus title and its matching native button assets.
import runpy
runpy.run_path(str(r/"tools/prepare-title.py"),run_name="__main__")
