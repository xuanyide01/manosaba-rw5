"""Read only the supplied game; copy script/configuration inputs into this probe."""
from pathlib import Path
import json, shutil

game = Path(r'G:\SteamLibrary\steamapps\common\manosaba_game')
root = Path(__file__).resolve().parents[1]
data = game/'manosaba_Data'
bundle_dir = data/'StreamingAssets/aa/StandaloneWindows64'
files = sorted(bundle_dir.glob('*.bundle'))
inventory = [{'name':p.name,'bytes':p.stat().st_size} for p in files]
(root/'reports/bundle-inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf8')
copied = []
for file in files:
    name = file.name.lower()
    if any(x in name for x in ('scripts','general-data','managedtext','localization-zhhans-text','monoscripts','unitybuiltinassets')) and not any(x in name for x in ('voice','bgm','audio')):
        shutil.copyfile(file,root/'inputs'/file.name)
        copied.append(file.name)
for name in ['ScriptingAssemblies.json','RuntimeInitializeOnLoads.json','app.info']:
    shutil.copyfile(data/name,root/'inputs'/name)
for source,dest in [('StreamingAssets/aa/AddressablesLink/link.xml','link.xml'),('StreamingAssets/aa/settings.json','settings.json'),('StreamingAssets/aa/catalog.bin','catalog.bin')]:
    shutil.copyfile(data/source,root/'inputs'/dest)
non_audio = [x for x in inventory if not any(k in x['name'] for k in ('voice','bgm','audio','music','se-','sound','localization'))]
print(json.dumps({'bundleCount':len(inventory),'totalBundleBytes':sum(x['bytes'] for x in inventory),'copied':copied,'nonAudioBundles':non_audio[:110]},ensure_ascii=False))
