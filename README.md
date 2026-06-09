# Wall Planter — 参数化墙面种植单元

用 OpenSCAD 做的**参数化、可拼接、可 3D 打印**的单盆位墙面种植单元。对标实物:斜置花盆阵列 + 逐层滴灌 + 底部储水 + 四向堆叠拼接。面向**拓竹 P2S**(有效 256³,按 ≤240mm/轴 设计)。

## 正确形态(v5:薄长方体 × 斜盆穿插)
单元是**一个薄的竖直长方体(箱体/脊柱)与一个斜置锥盆的「形体穿插」**——不是"平板+花盆相交":

1. **薄长方体箱(box)** — 竖直满高、深度薄(`box_d`)的矩形箱;贴墙/堆叠基准面。
2. **斜置中空锥盆(cup)** — 有壁厚的圆台管,从箱体**前面穿出**、向前上方斜伸(~40°);宽端开口在前上方放可拆锥形花盆,窄端落在箱体下部。
3. **功能分区** — 箱体**下部**=储水/逐层下渗(储水区+溢流标管,底层塞橡胶塞);箱体**上部**=与上层堆叠连接(顶销+半圆缺口);**背面**=保留完整背板,仅开透气孔。

> v4 及更早是"薄背板 + 底部浅托盘 + 悬伸杯",剖面像"平板+花盆";v5 改为满高薄箱体让斜盆穿插,形体更贴合参考剖面。

## 当前文件
- **`filesv2/wall_planter_v5.scad`** — 当前基础(单元 164×176×197mm,三轴 ≤240,`Volumes=2`)。
- `filesv2/planter_v5.stl` — 导出的可打印件。
- `filesv2/v5_hero.png / v5_cut.png / v5_back.png / v5_front.png / v5_side.png` — 各向渲染图。
- **`filesv2/viewer.html`** — 浏览器内 3D 预览(模型已内嵌,**双击即可打开**,无需本地服务器)。
- `filesv2/build_viewer.py` — 把最新 STL 重新内嵌进 `viewer.html` 的脚本(默认 `planter_v5.stl`)。
- `filesv2/wall_planter_v4.scad` / `planter_v4.stl` — 上一版(薄背板+浅托盘),供参考。
- `filesv2/PROMPT.md` — 几何形态描述 + 已完成/待办清单。

## 在 HTML 里预览模型
直接双击 `filesv2/viewer.html`(或拖进浏览器)即可旋转/缩放查看 `planter_v5.stl`:
- 拖拽旋转 · 滚轮缩放 · 右键平移;按钮可切换 自动旋转 / 线框 / 显示边 / 复位视角,并显示外形尺寸。
- 模型已以纯文本内嵌进 HTML,**离线可用**;Three.js 运行库从 CDN 加载,首次打开需联网。
- 重新导出 STL 后,在 `filesv2/` 里跑 `python3 build_viewer.py`(默认 `planter_v5.stl`,可传文件名)重新生成内嵌数据。

`files/SPEC.md`、`files/CLAUDE.md` 为设计目标与建模迭代规范;`files/` 内为早期 v2 迭代(竖切开口版),供参考。

## 可调参数(在 .scad 顶部)
花盆尺寸 `pot_top_d / pot_bot_d / pot_height`、间隙 `fit_clear`、倾角 `tilt`、壁厚 `wall`、箱体深 `box_d` / 背板厚 `back_t`、储水区高 `res_h` / 水位 `water_h`、堆叠/横拼销径、透气孔等。

## 渲染 / 导出(OpenSCAD)
```bash
cd filesv2
# 立体预览
openscad --render -o v5_hero.png --colorscheme=Tomorrow \
  --imgsize=820,680 --camera=82,88,98,62,0,225,760 wall_planter_v5.scad
# 导出 STL(出图确认后)
openscad --render -o planter_v5.stl -D 'dev=false' wall_planter_v5.scad
```
开发期保持 `dev=true`(低精度快预览),导 STL 前用 `-D 'dev=false'` 提精度。
> 无头 Linux 需在命令前加 `xvfb-run -a`。

## 打印建议
建议**背面朝下平躺**打印(盆口朝上),基本免支撑;默认壁厚 3mm。
