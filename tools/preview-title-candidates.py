
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFilter,ImageFont
import json,sys
r=Path(__file__).resolve().parents[1];art=r.parent/'manosaba-probe/art';out=r/'reports/title-candidates';out.mkdir(exist_ok=True)
def bg(name,center=(.5,.5)):return ImageOps.fit(Image.open(next((art/'mainbackground').glob(name+'__*.png'))).convert('RGBA'),(432,514),method=Image.Resampling.LANCZOS,centering=center)
a=bg('2_1',(.54,.5));character=Image.open(art/'characters/ema/Default.png').convert('RGBA');character.thumbnail((330,630),Image.Resampling.LANCZOS);a.alpha_composite(character,(168,65));b=bg('17_2',(.55,.5))
c=ImageOps.fit(Image.open(out/'remote-3.jpg').convert('RGBA'),(432,514),method=Image.Resampling.LANCZOS,centering=(.44,.45))
source=Image.open(out/'tea-party-art.jpg').convert('RGBA');source=source.crop((339,260,945,source.height));d=ImageOps.fit(source,(432,514),method=Image.Resampling.LANCZOS,centering=(.5,.02))
names={'A':'艾玛 · 青影回廊','B':'月光森林 · 无人物','C':'校园群像 · 官方活动图','D':'三人茶会 · 宣传插画裁切'}
sources={'A':'用户提供的原作素材：Ema 默认立绘 + 背景 2_1','B':'用户提供的原作素材：背景 17_2','C':'https://manosaba.com/posts/ReadingEvent-nextpage','D':'https://www.animatetimes.com/news/details.php?id=1771997232'}
for key,im in zip('ABCD',[a,b,c,d]):
 im.convert('RGB').save(out/('candidate-'+key+'.jpg'),quality=90,optimize=True)
 shade=Image.new('RGBA',(432,514));draw=ImageDraw.Draw(shade)
 for y in range(514):
  alpha=round(90*(1-y/150)) if y<150 else round(212*min(1,max(0,(y-268)/148)))
  draw.line((0,y,431,y),fill=(16,16,26,max(0,alpha)))
 im=Image.alpha_composite(im,shade);draw=ImageDraw.Draw(im)
 logo=Image.open(r/'src/common/ui/title-logo.png').convert('RGBA');logo.thumbnail((258,94),Image.Resampling.LANCZOS);im.alpha_composite(logo,(22,18))
 # Match the proposed native UI: one primary button and two secondary rows.
 draw.line((30,320,181,320),fill=(191,165,153,145));draw.line((251,320,402,320),fill=(191,165,153,145));draw.polygon([(216,316),(220,320),(216,324),(212,320)],fill=(213,178,185,180))
 boxes=[('NewGame',(26,330,406,384)),('LoadGame',(26,394,211,442)),('Gallery',(221,394,406,442)),('Options',(26,450,211,498)),('Exit',(221,450,406,498))]
 for name,box in boxes:
  x0,y0,x1,y1=box;primary=name=='NewGame';cut=6
  draw.polygon([(x0+cut,y0),(x1-cut,y0),(x1,y0+cut),(x1,y1-cut),(x1-cut,y1),(x0+cut,y1),(x0,y1-cut),(x0,y0+cut)],fill=(44,32,43,150) if not primary else (88,42,61,195),outline=(199,165,166,170) if primary else (141,118,135,125))
  if primary:draw.line((x0+1,y0+8,x0+1,y1-8),fill=(241,175,188,230),width=2)
  button=Image.open(r/'src/common/ui'/('button-'+name+'.png')).convert('RGBA');pixels=button.load();white=Image.new('L',button.size);mask=white.load()
  for yy in range(button.height):
   for xx in range(button.width):
    rr,gg,bb,aa=pixels[xx,yy];mask[xx,yy]=255 if min(rr,gg,bb)>165 and aa>90 else 0
  bounds=white.getbbox();x,y,w,h=bounds;button=button.crop((max(0,x-4),max(0,y-3),min(button.width,w+4),min(button.height,h+3)))
  button.thumbnail((158,44 if primary else 38 if name=='LoadGame' else 28),Image.Resampling.LANCZOS)
  data=[]
  for rr,gg,bb,aa in button.getdata():data.append((245,237,238,round(aa*max(0,min(1,(min(rr,gg,bb)-80)/175)))))
  button.putdata(data);im.alpha_composite(button,(round((x0+x1-button.width)/2),round((y0+y1-button.height)/2)))
 im.convert('RGB').save(out/('candidate-'+key+'-preview.png'))
fontPath=r.parent/'summer-name-fix/NotoSansMonoCJKsc-Regular.otf';font=ImageFont.truetype(str(fontPath),21);small=ImageFont.truetype(str(fontPath),14)
sheet=Image.new('RGB',(984,1246),'#10121b');dr=ImageDraw.Draw(sheet)
dr.text((32,18),'《魔法少女的魔女审判》 · 标题背景候选',font=font,fill='#f5e8e9');dr.text((32,50),'432 × 514 · 主按钮突出 / 保留原作英文按键 / 画面与菜单一体',font=small,fill='#b2b1bd')
for i,key in enumerate('ABCD'):
 x=34+(i%2)*486;y=92+(i//2)*576
 dr.text((x,y),key+'  '+names[key],font=font,fill='#f0c6d3')
 preview=Image.open(out/('candidate-'+key+'-preview.png')).convert('RGB');mask=Image.new('L',(432,514));ImageDraw.Draw(mask).rounded_rectangle((0,0,431,513),radius=28,fill=255);sheet.paste(preview,(x,y+35),mask)
sheet.save(out/'title-candidates-contact.png')
(out/'candidates.json').write_text(json.dumps({'names':names,'sources':sources,'status':'preview; final selection pending','layout':{'primary':[26,330,406,384],'secondaryRows':[[26,394,211,442],[221,394,406,442],[26,450,211,498],[221,450,406,498]]}},ensure_ascii=False,indent=2),'utf8')
print('TITLE_CANDIDATES_READY',out)

