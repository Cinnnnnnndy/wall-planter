# Wall Planter — 参数化墙面种植单元

用 OpenSCAD 做的**参数化、可拼接、可 3D 打印**的单盆位墙面种植单元。对标实物:斜置花盆阵列 + 逐层滴灌 + 底部储水 + 四向堆叠拼接。面向**拓竹 P2S**(有效 256³,按 ≤240mm/轴 设计)。

## 正确形态
单元由**三个部件**组成(不是"实心块挖洞"):

1. **薄背板(panel)** — 竖直基准面,贴墙/堆叠用。
2. **前伸斜置中空杯体(cup)** — 有壁厚的圆台管,从背板向前上方斜伸(~40°);宽端开口在前上方放可拆锥形花盆,窄端平切坐在储水盒上。
3. **底部储水盒(reservoir)** — 封闭浅盒 + 前唇 + 溢流标管;杯底排水进盒,超水位经标管穿底滴到下层,底层塞橡胶塞。

## 当前文件
- **`filesv2/wall_planter_v4.scad`** — 当前基础(单元 164×183×191mm,三轴 ≤240,`Volumes=2`)。
- `filesv2/planter_v4.3mf` — 导出的可打印件(**推荐**,带 mm 单位,直接拖进拓竹 Bambu Studio / 其它切片软件)。
- `filesv2/planter_v4.stl` — 同一几何的 STL 版本(兼容老工具链)。
- `filesv2/PROMPT.md` — 几何形态描述 + 已完成/待办清单。
- `files/SPEC.md`、`files/CLAUDE.md` — 设计目标与建模迭代规范。
- `files/` 内为早期 v2 迭代(竖切开口版),供参考。

## 可调参数(在 .scad 顶部)
花盆尺寸 `pot_top_d / pot_bot_d / pot_height`、间隙 `fit_clear`、倾角 `tilt`、壁厚 `wall`、储水盒高 `res_h` / 水位 `water_h` / 前唇 `res_lip`、堆叠/横拼销径、透气孔等。

## 渲染 / 导出(OpenSCAD)
```bash
cd filesv2
# 立体预览
openscad --render -o v4_hero.png --colorscheme=Tomorrow \
  --imgsize=1000,820 --camera=82,150,150,62,0,225,720 wall_planter_v4.scad
# 导出 3MF(出图确认后,推荐)
openscad --render -o planter_v4.3mf -D 'dev=false' wall_planter_v4.scad
# 导出 STL(同一几何,兼容用)
openscad --render -o planter_v4.stl -D 'dev=false' wall_planter_v4.scad
```
开发期保持 `dev=true`(低精度快预览),导 STL 前用 `-D 'dev=false'` 提精度。

## 打印建议
建议**背板朝下平躺**打印(杯口朝上),基本免支撑;默认壁厚 3mm。
