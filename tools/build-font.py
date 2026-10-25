from pathlib import Path
import json,sys
from fontTools import subset
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[1]
chars=set(chr(i) for i in range(32,127))
for p in (r/'src').rglob('*'):
 if p.suffix in ['.txt','.js','.ux','.json']:chars.update(p.read_text(encoding='utf8'))
options=subset.Options();options.name_IDs=['*'];options.name_languages=['*']
source=Path(sys.argv[1]) if len(sys.argv)>1 else r.parent/'summer-name-fix/NotoSansMonoCJKsc-Regular.otf';f=subset.load_font(str(source),options);cm=f.getBestCmap();missing=sorted(c for c in chars if ord(c)>=32 and not c.isspace() and ord(c) not in cm)
if missing:raise ValueError('Missing source font characters: '+repr(missing))
sub=subset.Subsetter(options=options);sub.populate(unicodes={ord(c) for c in chars if ord(c) in cm});sub.subset(f)
for n in f['name'].names:
 if n.nameID in [1,3,4,6,16]:n.string='ManosabaSubset'.encode(n.getEncoding(),errors='replace')
if 'CFF ' in f:f['CFF '].cff.fontNames=['ManosabaSubset']
output=r/'src/common/manosaba.otf';subset.save_font(f,str(output),options)
(r/'src/common/text-font.js').write_text("export function textFont(text){return 'manosabafont';}\n",encoding='utf8')
report={'fontFamily':'ManosabaSubset','source':'Noto Sans Mono CJK SC','license':'SIL OFL 1.1','codepoints':len(f.getBestCmap()),'fontBytes':output.stat().st_size,'missingGlyphs':missing,'embeddedForAllText':True}
(r/'reports/font.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report))
