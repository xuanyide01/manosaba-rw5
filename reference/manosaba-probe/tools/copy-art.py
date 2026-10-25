from pathlib import Path
import shutil,json
r=Path(__file__).resolve().parents[1]
b=Path(r'G:\SteamLibrary\steamapps\common\manosaba_game\manosaba_Data\StreamingAssets\aa\StandaloneWindows64')
files=[]
for folder in ['naninovel-backgrounds_assets_naninovel','naninovel-characters_assets_naninovel']:
 for p in (b/folder).rglob('*.bundle'):files.append(p)
files += [b/n for n in ['general-sprites_assets_all.bundle','general-witchbook_assets_all.bundle','general-prefabs_assets_all.bundle','naninovel-spawn_assets_all.bundle']]
print('COPY',len(files),sum(p.stat().st_size for p in files),flush=True)
rows=[]
for p in files:
 q=r/'art-inputs'/p.relative_to(b);q.parent.mkdir(parents=True,exist_ok=True)
 if not q.exists() or q.stat().st_size!=p.stat().st_size:shutil.copyfile(p,q)
 rows.append({'path':str(p.relative_to(b)),'bytes':p.stat().st_size})
(r/'reports/art-bundles.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
print('DONE',len(rows),flush=True)
