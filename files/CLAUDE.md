# 墙面种植系统 3D 打印建模

## 项目目标
用 OpenSCAD 做**参数化、可拼接、可 3D 打印**的模块化墙面种植单元。
对标实物:倾斜圆柱花盆阵列 + 逐层滴灌 + 底部储水 + 四向拼接。
主文件:`wall_planter_v2.scad`(顶部参数区可调花盆/模块尺寸)。
目标尺寸与设计决定见 `SPEC.md`,改模型前先读它。

## 工具与命令
建模用 OpenSCAD 命令行。每次改完 `.scad` 必须渲染 PNG 并**亲自查看**,确认几何对了再导 STL。

```bash
# 1) 立体预览(改完先看这张)
openscad --render -o preview.png --colorscheme=Tomorrow --imgsize=1000,820 \
  --camera=149,-40,93,72,0,205,1150 wall_planter_v2.scad

# 2) 正前视图(正交,看开口阵列对不对)
openscad --render -o front.png --colorscheme=Tomorrow --projection=ortho \
  --imgsize=820,700 --camera=149,-200,93,90,0,180,1150 wall_planter_v2.scad

# 3) 导出 STL(几何确认无误后)
openscad --render -o planter_v2.stl -D 'dev=false' wall_planter_v2.scad
```
> 相机的 7 个数会随模块尺寸变化;以模块中心 (W/2, ?, H/2) 为视点,距离按整体尺寸放大即可。
> 仅**无头 Linux** 需在命令前加 `xvfb-run -a`;Mac/Windows 有显示器直接跑。

## 迭代闭环(必须遵守)
1. 改 `wall_planter_v2.scad` 参数或几何;
2. 跑命令 1 渲染 `preview.png`,**用读图能力查看**它;
3. 几何不对就继续改、重渲,直到正确;
4. 正确后跑命令 3 导出 STL。
开发期保持 `dev=true`(低精度快);出图/导 STL 临时用 `-D 'dev=false'` 提精度。

## 已知坑(别重新踩)
- **相机朝向**:前面板是 **+Y 面**。正交正视图必须用 `rz=180`(`--camera=...,90,0,180,...`)。`rz=0` 看到的是**背面**,会把开口误判成细缝。
- **杯体不能穿背**:倾斜杯体在杯底处沿 Y 向有跨度,`mod_d` 公式已包含 `pot_d/2*sin(pot_tilt)` 容差项,改倾角/盆深后别删它,否则杯体从背板穿出。
- **`Volumes: 2` 是正常的**:CGAL 把「实体 + 无界外部」算作 2,代表单一实心体。出现 `3` 才说明有内部封闭空腔。
- 圆角盒、燕尾、定位销与主体需有 ≥1mm 重叠才焊成单一实体(知识边缘相切会断开)。

## 打印约束
- 单模块外形不得超过 `SPEC.md` 里的打印机有效尺寸;**超了就自动分块**(优先沿列方向切,保留燕尾接口)。
- 默认壁厚 2.6mm(0.4 喷嘴约 6 层),兼顾强度与防渗。
- 免支撑优先;倾斜开口朝上打印通常无需支撑,导出前确认朝向。

## 单位
全部 mm。改完务必 `echo` 出模块外形尺寸核对。
