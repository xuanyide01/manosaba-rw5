from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
import hashlib,json,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'anemoi-rw5/tools/image-deps'))
import imagequant
r=Path(__file__).resolve().parents[1];source=r/'resources/ost-cover-scan.jpg';box=(1490,325,2180,1098)
art=ImageOps.contain(Image.open(source).convert('RGB').crop(box),(168,168),Image.Resampling.LANCZOS).convert('RGBA')
im=Image.new('RGBA',(192,192),(24,20,30,255));im.alpha_composite(art,((192-art.width)//2,(192-art.height)//2))
mask=Image.new('L',(768,768));ImageDraw.Draw(mask).ellipse((4,4,763,763),fill=255);im.putalpha(mask.resize((192,192),Image.Resampling.LANCZOS));im=imagequant.quantize_pil_image(im,dithering_level=0.0,max_colors=256,min_quality=0,max_quality=100).convert('RGBA');im.save(r/'src/common/logo.png',optimize=True)
report={'sourcePage':'https://www.fwinc.co.jp/manosaba_CD/ost','scanSource':'https://nu.vgmtreasurechest.com/soundtracks/magical-girl-witch-trials-complete-original-soundtrack-2025/10%20Case%20Front%20and%20Back.jpg','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSize':list(Image.open(source).size),'crop':box,'outputSize':[192,192],'roundTransparentIcon':True,'perceptualColors':256,'pngMode':'RGBA','method':'Contain the full visible character from the soundtrack illustration and its cage in a round icon; no face-only crop','artMaxSize':[168,168],'fullVisibleCharacterRetained':True,'cageRetained':True,'cleanFullIllustrationLocated':False,'isIndependentTextlessArtistOriginal':False}
(r/'reports/icon-v017.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(json.dumps(report,ensure_ascii=False))
