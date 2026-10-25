
from pathlib import Path
import sys,json,io,concurrent.futures
from PIL import Image
r=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(r/'tools/image-deps'));sys.path.insert(0,str(r.parent/'manosaba-image-deps'))
import oxipng
files=list((r/'src/common/images').glob('*.png'))+list((r/'src/common/ui').glob('*.png'))+[r/'src/common/logo.png']
def encode(p):
 before=p.read_bytes();im=Image.open(io.BytesIO(before)).convert('RGBA');pixels=im.tobytes()
 after=oxipng.optimize_from_memory(before,level=4,filter=[oxipng.RowFilter.NoOp,oxipng.RowFilter.Sub,oxipng.RowFilter.Up,oxipng.RowFilter.Paeth],optimize_alpha=False,bit_depth_reduction=False,color_type_reduction=False,grayscale_reduction=False,interlace=oxipng.Interlacing.Off)
 decoded=Image.open(io.BytesIO(after)).convert('RGBA')
 assert decoded.size==im.size and decoded.tobytes()==pixels,p
 if len(after)<len(before):p.write_bytes(after)
 return len(before),min(len(before),len(after))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(encode,files))
report={'optimizer':'pyoxipng 9.1.1','files':len(files),'beforeBytes':sum(x[0] for x in rows),'afterBytes':sum(x[1] for x in rows),'savedBytes':sum(x[0]-x[1] for x in rows),'rgbaPixelsIdentical':True,'bitDepthUnchanged':True,'interlaced':False}
(r/'reports/png-lossless.json').write_text(json.dumps(report,indent=2),'utf8')
p=r/'reports/art.json';art=json.loads(p.read_text('utf8'));art['imageBytes']=sum(x.stat().st_size for x in (r/'src/common/images').glob('*'));art['losslessPngOptimization']=report;p.write_text(json.dumps(art,indent=2),'utf8')
print(json.dumps(report),flush=True)

