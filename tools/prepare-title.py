from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import hashlib,json
r=Path(__file__).resolve().parents[1];ui=r/'src/common/ui';source=r/'resources/title-campus.jpg'
boxes=[('NewGame',(26,330,406,384)),('LoadGame',(26,394,211,442)),('Gallery',(221,394,406,442)),('Options',(26,450,211,498)),('Exit',(221,450,406,498))]
for idx,center in [(1,(.44,.45)),(2,(.68,.45))]:
 im=ImageOps.fit(Image.open(source).convert('RGBA'),(432,514),method=Image.Resampling.LANCZOS,centering=center)
 shade=Image.new('RGBA',im.size);draw=ImageDraw.Draw(shade)
 for y in range(514):
  alpha=round(90*(1-y/150)) if y<150 else round(212*min(1,max(0,(y-268)/148)))
  draw.line((0,y,431,y),fill=(16,16,26,max(0,alpha)))
 im=Image.alpha_composite(im,shade)
 decor=Image.new('RGBA',im.size);draw=ImageDraw.Draw(decor)
 draw.line((30,320,181,320),fill=(191,165,153,145));draw.line((251,320,402,320),fill=(191,165,153,145));draw.polygon([(216,316),(220,320),(216,324),(212,320)],fill=(213,178,185,180))
 for name,(x0,y0,x1,y1) in boxes:
  primary=name=='NewGame';cut=6
  draw.polygon([(x0+cut,y0),(x1-cut,y0),(x1,y0+cut),(x1,y1-cut),(x1-cut,y1),(x0+cut,y1),(x0,y1-cut),(x0,y0+cut)],fill=(88,42,61,195) if primary else (44,32,43,150),outline=(199,165,166,170) if primary else (141,118,135,125))
  if primary:draw.line((x0+1,y0+8,x0+1,y1-8),fill=(241,175,188,230),width=2)
 Image.alpha_composite(im,decor).convert('RGB').save(ui/('title-'+str(idx)+'.jpg'),quality=85,optimize=True,progressive=False)
for name,(x0,y0,x1,y1) in boxes:
 button=Image.open(ui/('button-'+name+'.png')).convert('RGBA');white=Image.new('L',button.size);mask=white.load();pixels=button.load()
 for y in range(button.height):
  for x in range(button.width):
   rr,gg,bb,aa=pixels[x,y];mask[x,y]=255 if min(rr,gg,bb)>165 and aa>90 else 0
 bounds=white.getbbox();assert bounds,name
 x,y,w,h=bounds;button=button.crop((max(0,x-4),max(0,y-3),min(button.width,w+4),min(button.height,h+3)))
 button.thumbnail((158,44 if name=='NewGame' else 38 if name=='LoadGame' else 28),Image.Resampling.LANCZOS)
 button.putdata([(245,237,238,round(aa*max(0,min(1,(min(rr,gg,bb)-80)/175)))) for rr,gg,bb,aa in button.getdata()])
 canvas=Image.new('RGBA',(x1-x0,y1-y0));canvas.alpha_composite(button,((canvas.width-button.width)//2,(canvas.height-button.height)//2));canvas.save(ui/('title-'+name+'.png'),optimize=True)
# Reproducible preview uses the same coordinates/assets as native UX.
for idx in [1,2]:
 im=Image.open(ui/('title-'+str(idx)+'.jpg')).convert('RGBA');logo=ImageOps.contain(Image.open(ui/'title-logo.png').convert('RGBA'),(258,94),Image.Resampling.LANCZOS);im.alpha_composite(logo,(22+(258-logo.width)//2,18+(94-logo.height)//2))
 for name,(x0,y0,x1,y1) in boxes:im.alpha_composite(Image.open(ui/('title-'+name+'.png')).convert('RGBA'),(x0,y0))
 im.convert('RGB').save(r/'reports'/('title-v013-preview-'+str(idx)+'.png'))
report={'selected':'C: official school group artwork','sourcePage':'https://manosaba.com/posts/ReadingEvent-nextpage','sourceImage':'https://storage.googleapis.com/studio-design-asset-files/projects/6kq9vB8bap/s-5787x4093_v-frms_webp_a551565d-a905-47af-a1d8-e94a31c2e043.jpg','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceDimensions':list(Image.open(source).size),'titleCropCenters':[[.44,.45],[.68,.45]],'progressThreshold':6,'buttons':dict(boxes),'originalButtonLettering':True}
(r/'reports/title-v013.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
print(json.dumps(report,ensure_ascii=False))
