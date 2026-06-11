# Wall Planter — 参数化墙面种植单元

用 OpenSCAD 做的**参数化、可拼接、可 3D 打印**的单盆位墙面种植单元。对标实物:斜置花盆阵列 + 逐层滴灌 + 底部储水 + 四向堆叠拼接。面向**拓竹 P2S**(有效 256³,按 ≤240mm/轴 设计)。

## 正确形态(v5:竖直长方体 × 斜盆穿插)
单元是**一个竖直长方体(箱体/脊柱)与一个斜置锥盆的「形体穿插」**——不是"平板+花盆相交":

1. **长方体箱(box)** — 竖直满高的矩形箱;背面平整,作贴靠/堆叠基准面。
2. **斜置中空锥盆(cup)** — 有壁厚的圆台管,**穿过箱体**、向前上方斜伸(~40°);宽端开口在前上方放可拆锥形花盆,窄端(盆底)坐在箱体下部的座面上。
3. **功能分区** — 箱体**下部**=储水层(浸住盆底,土壤吸水)+ 背角**落水井**(水注溢流→垂直落下层,底层塞橡胶塞);箱体**上部**=与上层堆叠连接(顶销);**背面**=平背板开透气孔,并按 `pot_back` 让盆底穿出一截(见下)。

> **盆腔=与花盆同锥度、均匀 1.5mm 间隙的完整斜圆锥座**(不被平面截断),可拆锥盆能整支沿轴插到底坐在座面上(`view="potcheck"` 布尔干涉自检为空,已验证)。
> **箱深可调 + 花盆后伸**:箱深 `box_d`(当前 66mm,向前缩减更薄)与盆底后伸量 `pot_back`(当前 28mm)为可调参数;允许斜盆**盆底从背面 Y<0 穿出**一截 → 背面下半会出现一处敞口(盆从此露出/穿出,装盆后被盆体填住),盆腔最低点仍落在箱内储水层上方。`pot_back` 调小=后伸/敞口小、`pot_back→2` 近似平背。
> 形态演进:v4 是"薄背板+浅托盘+悬伸杯"(剖面像平板+花盆);v5 改为长方体让斜锥**穿透**,盆腔为完整锥座;v5.1 按商品剖面把水路全部内部化(见下)。

### 水路原理(v5.1,对标商品剖面图)
商品剖面各要素 → 本设计的对应实现:

| 商品剖面 | 本设计 |
|---|---|
| 植物苗 / 土壤层 | 可拆锥形盆插入斜锥盆腔,植物从前上方开口长出 |
| 储水层 | 箱体下部封闭储水区(`res_h=25`),水位由水注管顶定在 `z=27` |
| 排水孔(盆底吸水) | 盆腔最低弧自座面开**浸水窗**(`lens_open=5`)探进储水层,水位浸住盆底 `immerse=4` mm,土壤经可拆盆自带底孔**吸水**(底部浸灌) |
| 水注(超水位流下层) | 背角**落水井**(Ø`shaft_d=23` 贯通全高)井底立**溢流标管**(管顶=水位);超水位入管、垂直穿底面落进下一层落水井——直叠自然对齐,水路全隐藏 |
| 透气孔 | 背面 3×Ø6 透气孔穿进盆腔根区 |
| 橡胶堵塞 | 底面出水口为锥形塞孔(Ø11→Ø8)+对位短嘴,**最底层**塞标准锥形橡胶/硅胶塞,水不滴地面 |

防虹吸帽兼**挡溅板**:上层落水砸在帽上散入储水层(不会直通管孔短路掉层);帽下侧缝进气断虹吸,不会把储水抽空。**顶面井口即注水口**——从最顶层井口灌水可一次充满整列储水层,不必淋湿叶面。

### 已深化的细节
- **盆口挡土唇 + 滴水线**:开口外翻法兰(`lip_w/lip_t`,不缩小通孔不挡插盆)挡土;法兰外缘一圈环槽(`drip_w/drip_d2`)断流,水滴落不回爬箱体。
- **储水浸盆(底部浸灌)**:储水层加深,盆底最低弧经浸水窗泡进储水层、水位浸盆底 4mm,土壤吸水;浇多了经水注逐层下渗(见上"水路原理")。
- **水注 + 落水井 + 橡胶塞孔**:溢流全部内部化,外观无外露导流嘴;层间靠底面出水短嘴(滴水裙)插进下层井口,水滴不沿叠合缝爬。
- **堆叠锥销防呆**:底面定位销改**锥销**(顶缩径 `peg_taper`,自对中易插),顶孔口扩成锥孔导入;销位**非对称**(`peg_xs`)→ 转 180° 错叠对不上,防呆。
- **箱顶高于盆口**:箱顶 `mod_h` 按花盆最高点+余量自动抬高,盆上沿低于箱体高度,堆叠时箱顶平整不顶盆。
- **布尔自检**:`view="potcheck"`(真盆×单元干涉)与 `view="shaftcheck"`(落水井×盆腔壁厚≥1.2mm)渲染均应为空。

## 当前文件
- **`filesv2/wall_planter_v5.scad`** — 当前基础 v5.1(单元 W170.2×H228.5, 真实进深≈199mm, 三轴 ≤240,流形单一实体;含 `view` 视图/自检选择器与尺寸 echo)。
- `filesv2/planter_v5.stl` — 导出的可打印件。
- `filesv2/v5_hero.png / v5_cut.png / v5_back.png / v5_front.png / v5_side.png / v5_mouth.png` — 各向渲染图。
- `filesv2/v5_watercut.png` — 过落水井纵剖(水注/帽/塞孔);`filesv2/reservoir_cap_schematic.png` — 井底水注特写。
- `filesv2/v5_stack.png / v5_stackcut.png` — 两单元直叠及其过井纵剖(逐层落水路径)。
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
花盆尺寸 `pot_top_d / pot_bot_d / pot_height`、间隙 `fit_clear`、倾角 `tilt`、壁厚 `wall`、座厚 `floor_t`、背板厚 `back_t`、储水区高 `res_h`、浸水窗/浸盆深 `lens_open / immerse`(水位 `water_h` 由此派生)、水注/落水井 `overflow_d / shaft_d / shaft_x / shaft_y`、塞孔/短嘴 `plug_d / boss_d / boss_h`、堆叠/横拼销径、透气孔等。
箱深 `box_d` 与后伸 `pot_back` 为**可调参数**(盆位 `p0y` 由 `pot_back` 反推);`p0z` 派生(由浸水点 `z_dip` 与倾角算)。`view` 可切 `unit / cutx / watercut / stack / stackcut / potcheck / shaftcheck`;`show_pot=true` 叠加半透明真花盆预览。

## 渲染 / 导出(OpenSCAD)
```bash
cd filesv2
# 立体预览
openscad --render -o v5_hero.png --colorscheme=Tomorrow \
  --imgsize=820,680 --camera=85,104,107,62,0,225,820 wall_planter_v5.scad
# 干涉自检(渲染应为空: 输出 "Current top level object is empty")
openscad --render -o /tmp/chk.stl -D 'view="potcheck"'  wall_planter_v5.scad
openscad --render -o /tmp/chk.stl -D 'view="shaftcheck"' wall_planter_v5.scad
# 水路剖面 / 堆叠剖面
openscad --render -o v5_watercut.png -D 'view="watercut"' --colorscheme=Tomorrow \
  --imgsize=820,680 --camera=85,85,112,65,0,255,780 wall_planter_v5.scad
openscad --render -o v5_stackcut.png -D 'view="stackcut"' --colorscheme=Tomorrow \
  --imgsize=700,860 --camera=85,90,228,72,0,262,1350 wall_planter_v5.scad
# 导出 STL(出图确认后)
openscad --render -o planter_v5.stl -D 'dev=false' wall_planter_v5.scad
```
开发期保持 `dev=true`(低精度快预览),导 STL 前用 `-D 'dev=false'` 提精度。
> 无头 Linux 需在命令前加 `xvfb-run -a`。

## 打印建议
建议**背面朝下平躺**打印(盆口朝上),基本免支撑;默认壁厚 3mm。
