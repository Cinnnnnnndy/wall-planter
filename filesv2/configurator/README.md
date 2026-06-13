# 墙面种植单元 · 参数配置器

`planter_configurator.html` — 浏览器里实时调参 + 一键导出 STL 的配置器(不只是 viewer)。

## 打开
- 直接双击 `planter_configurator.html`(需联网,three.js/manifold/lil-gui 等从 CDN 加载)。
- 若浏览器拦截本地文件加载模块:在本文件夹运行 `python3 -m http.server`,
  浏览器开 `http://localhost:8000/planter_configurator.html`(推荐 Chrome/Edge)。

## 能调什么
- **盒子/花盆**:侧边距(→整机宽)、盒厚(进深)、花盆倾角、花盆总高。
- **背板镂空**:开关、六角对边宽、筋宽、掏空深(贴墙隐藏减料,不破储水盒/落水管/盆腔)。
- **表面纹理(替换式)**:烘焙开关、起伏幅度、折痕尺度、倍频、卷曲占比、网格密度。
  纹理是「替换外表面本身」(内外起伏, 均值≈0),**不额外加料**;阵列各模块在**全局坐标**
  下取噪声 → 拼接处纹理**连续无缝**(3×3 实测连续,见 `cfg_array_3x3.png`)。
- **阵列**:列(横)×行(竖)如 3×3 / 4×3、模块间距;HUD 显示阵列总尺寸。

## 导出
- **整列 STL(一体)**:整张阵列合成一个 STL,直接丢进切片器当一块板。
- **拆分零件 ZIP**:每个单元各一个 STL(在各自阵列坐标下烘焙纹理,原点导出 → 拼回仍无缝)
  + connector / pin / base 各一个。

## 工作方式 / 已验证
- 几何引擎 `geometry.mjs`(manifold-3d 移植自 wall_planter_v5.scad)Node 实测体积/外形与
  OpenSCAD 一致。
- 纹理引擎 `texture.mjs`(移植 texturize.py + 全局坐标 + 居中位移)Node 实测前壳起皱、
  内腔光滑、双拼/3×3 接缝连续。
- HTML 由 `build_html.mjs` 从以上两个模块自动拼装(单一真源):`node build_html.mjs`。

## 已知限制(请在你浏览器里确认)
- 浏览器端 3D 显示/UI 交互未在此环境实测(无浏览器);计算内核已 Node 验证。
- 反复重建会累积少量 manifold WASM 内存;长时间使用若变慢,刷新页面即可。
- 纹理烘焙:3×3 约 1.5s,阵列越大越久;几何预览是实时的,纹理按「烘焙纹理」开关触发。
