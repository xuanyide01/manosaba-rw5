# 《魔法少女的魔女审判》红米手表 5 移植准备

原游戏位置：`G:\SteamLibrary\steamapps\common\manosaba_game`。

目标为红米手表 5（432 × 514），安装包约 10 MB。沿用先前项目的要求：中文剧情、透明角色立绘、CG 鉴赏和差分切换、30 个独立存档、路线／章节入口、遇到选项停止的章节跳跃、长文本换行和滚动、圆形图标、独立存档键。推理和审判交互需先依据原作资源核对，不能直接删除交互或自动选择答案。

## 已确认

- 原版使用 Unity，存在 `GameAssembly.dll` 和 `il2cpp_data`。
- 资源位于 `manosaba_Data/StreamingAssets/aa/StandaloneWindows64`，是 Unity Addressables Bundle。
- 存在独立的简体中文剧情和审判脚本，例如 `general-localization-zhhans-scripts-act01_chapter01_advbad_assets_all.bundle` 和 `general-localization-zhhans-scripts-act01_chapter01_trial_assets_all.bundle`。
- 存在 `general-data_assets_all.bundle`、`general-choicebuttons_assets_all.bundle`、中文字体和 Sprite 资源；尚未提取其内容，不能据此声称审判逻辑已经可转换。
- 本地已有可导入的 UnityPy 及图像、字体处理依赖。

## 当前进度（已更新）

2026-10-19：已读取原作文件并生成相邻 `manosaba-rw5` 项目。转换了 424 个非调试剧本、33,219 条对白／辩论文本、253 张背景／CG 和 243 个主要立绘表情映射；原始文件未修改。此前的权限与资源提取阻塞已经解决。

`tools/copy-scripts.py` 只读取上述游戏的资源目录，将剧本和配置复制到此项目的 `inputs/`，并将资源文件清单保存至 `reports/bundle-inventory.json`。`copy-art.py` 复制图片 Bundle，不复制语音。可在本机依次执行：

```powershell
python manosaba-probe/tools/copy-scripts.py
python manosaba-probe/tools/extract-data.py
python manosaba-probe/tools/summarize.py
python manosaba-probe/tools/copy-art.py
python manosaba-probe/tools/extract-art.py
python manosaba-rw5/tools/convert-story.py
python manosaba-rw5/tools/prepare-art.py
python manosaba-rw5/tools/build-font.py PATH/TO/NotoSansMonoCJKsc-Regular.otf
```

需要 UnityPy、Pillow、fontTools 等 Python 依赖。转换后的手表源码可直接构建，不必重新提取；原始大型 Bundle 不包括在交付源码中。原游戏路径可在两个 `copy-*.py` 中调整。

## 验证范围

已验证静态跳转、371 个日常／审判段落的推进路径，以及保留状态从开场到最终结局的连续自动路径；另使用官方 Vela 模拟器验证原生安装和界面。详细范围与实机待测状态见 `manosaba-rw5/README.md` 及检查报告。

角色图层导出处理 SpriteRenderer 的透明度、正片叠底与柔光；主要表情为静态图，不声称复现全部 3D 演出。
