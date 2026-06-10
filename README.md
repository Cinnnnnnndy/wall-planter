# Wall Planter — 参数化墙面种植单元

用 OpenSCAD 做的**参数化、可拼接、可 3D 打印**的单盆位墙面种植单元。对标实物:斜置花盆阵列 + 逐层滴灌 + 底部储水 + 四向堆叠拼接。面向**拓竹 P2S**(有效 256³,按 ≤240mm/轴 设计)。

## 正确形态(v5:竖直长方体 × 斜盆穿插)
单元是**一个竖直长方体(箱体/脊柱)与一个斜置锥盆的「形体穿插」**——不是"平板+花盆相交":

1. **长方体箱(box)** — 竖直满高的矩形箱;背面平整,作贴靠/堆叠基准面。
2. **斜置中空锥盆(cup)** — 有壁厚的圆台管,**穿过箱体**、向前上方斜伸(~40°);宽端开口在前上方放可拆锥形花盆,窄端(盆底)坐在箱体下部的座面上。
3. **功能分区** — 箱体**下部**=储水/逐层下渗(盆底正下方封闭储水盒+溢流标管,底层塞橡胶塞);箱体**上部**=与上层堆叠连接(顶销+半圆缺口);**背面**=完整平背板,仅开透气孔。

> **盆腔=与花盆同锥度、均匀 1.5mm 间隙的完整斜圆锥座**(不被平面截断),可拆锥盆能整支沿轴插到底坐在座面上(已用干涉自检验证)。
> **箱深可调 + 花盆后伸**:箱深 `box_d`(当前 66mm,向前缩减更薄)与盆底后伸量 `pot_back`(当前 18mm)为可调参数;允许斜盆**盆底从背面 Y<0 穿出**一截 → 背面下半会出现一处敞口(盆从此露出/穿出,装盆后被盆体填住),排水点仍落在箱内储水盒上方。`pot_back` 调小=后伸/敞口小、`pot_back→2` 近似平背。
> 形态演进:v4 是"薄背板+浅托盘+悬伸杯"(剖面像平板+花盆);v5 改为长方体让斜锥**穿透**,盆腔为完整锥座。

### 已深化的细节
- **盆口挡土唇 + 滴水线**:开口外翻法兰(`lip_w/lip_t`,不缩小通孔不挡插盆)挡土;法兰外缘一圈环槽(`drip_w/drip_d2`)断流,水滴落不回爬箱体。
- **储水盒防虹吸帽**:溢流标管顶加帽,架在 `siphon_gap` 进水缝上(3 立柱留侧缝);水从侧缝越管顶进溢流孔,缝口进气**断虹吸**,不会把储水抽空。`res_h` 已加高给帽留空间。
- **堆叠锥销防呆**:底面定位销改**锥销**(顶缩径 `peg_taper`,自对中易插),顶孔口扩成锥孔导入;销位**非对称**(`peg_xs`)→ 转 180° 错叠对不上,防呆。

## 当前文件
- **`filesv2/wall_planter_v5.scad`** — 当前基础(单元 W164×H219, 真实进深≈199mm(含后伸), 三轴 ≤240,`Volumes=2`;含 `show_pot` 自检与尺寸 echo)。
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
花盆尺寸 `pot_top_d / pot_bot_d / pot_height`、间隙 `fit_clear`、倾角 `tilt`、壁厚 `wall`、座厚 `floor_t`、背板厚 `back_t`、储水区高 `res_h` / 水位 `water_h`、堆叠/横拼销径、透气孔等。
箱深 `box_d` 与盆位 `p0y/p0z` 为**派生量**(由倾角与盆径自动算,保证盆能整支插入且背面平整)。把 `show_pot=true` 可叠加半透明真花盆做插入自检。

## 渲染 / 导出(OpenSCAD)
```bash
cd filesv2
# 立体预览
openscad --render -o v5_hero.png --colorscheme=Tomorrow \
  --imgsize=820,680 --camera=82,104,107,62,0,225,820 wall_planter_v5.scad
# 盆插入自检(叠加半透明真花盆)
openscad --render -o v5_potcheck.png -D 'show_pot=true' \
  --camera=82,104,107,62,0,225,820 wall_planter_v5.scad
# 导出 STL(出图确认后)
openscad --render -o planter_v5.stl -D 'dev=false' wall_planter_v5.scad
```
开发期保持 `dev=true`(低精度快预览),导 STL 前用 `-D 'dev=false'` 提精度。
> 无头 Linux 需在命令前加 `xvfb-run -a`。

## 打印建议
建议**背面朝下平躺**打印(盆口朝上),基本免支撑;默认壁厚 3mm。
