#!/usr/bin/env python3
# texturize.py — 给打印件外表面叠加"牛皮纸褶皱"质感(F2-F1 Voronoi 折痕 + 值噪声)
#
# 算法参考(并对齐其 UI 滑块): ZhouWu-211/crumpled-paper-generator
#   - 折痕 = 多倍频 3D 元胞噪声的【有符号】(F2-F1)×随机元胞符号 -> 一块块小平面/折痕(crackle);
#   - 卷曲 = 值噪声(value noise)做大尺度起伏(curl)。
# 安全策略:
#   - 只位移"朝前/朝外的可见外壳"三角面; 盆内腔/顶/底/背/侧销区/内腔保持光滑;
#   - 仅向外凸(disp>=0) -> 不减薄壁、不缩小盆腔, 配合与强度不受影响;
#   - 位移方向用"仅外壳面平均"的顶点法线做重心插值 -> 纹理面之间共享边水密;
#   - 与光滑面相邻的边界做羽化(disp->0) -> 边界处位置不变, 无裂缝/T 接缝。
#
# 用法: python3 texturize.py [planter_v5.stl] [planter_v5_tex.stl]
import sys, math
import numpy as np

IN  = sys.argv[1] if len(sys.argv) > 1 else "planter_v5.stl"
OUT = sys.argv[2] if len(sys.argv) > 2 else "planter_v5_tex.stl"

# ---- 可调参数 -------------------------------------------------------------
# v5.6 对齐参考工具滑块 + 修两处问题(用户反馈); v5.6.1 保留修复, 强度/弯曲回调到 v5.5 值。
#   滑块: 网格分辨率400 / 褶皱密集度seeds36 / 褶皱层级oct5 / 起伏强度intensity=0.7 / 纸张整体弯曲curl=0。
#   算法用参考的【有符号 F2-F1 crackle】(每元胞随机± -> 小平面折痕); 取 1 参考单位 = 1mm。
#   仅外凸(用户要求): 只把"前面板+花盆外壳+挡土唇"向外 offset 出体积, 花盆内腔/箱体内部不变。
#   【修复1】前面板原始网格是细长 fan 三角形(放射条纹) -> 对整块平面板【重新均匀网格化】(见 remesh_panel)。
#   【修复2 v5.6.2】盆口"穿模"实为纹理爬到开口边沿、把净口顶得参差 -> 加盆口收口羽化 MOUTH_TAPER:
#     s→CUPLEN 顶沿把纹理羽化到 0(干净净口); 位移用 p2..p98 平滑归一化(同 v5.5 圆润观感, 非 clamp 尖锐)。
#   起伏强度=AMP(褶皱深度); 整体弯曲=CURL_AMP(独立低频外凸 swell)。位移恒>=0 仅外凸。
SEEDS       = 36      # 褶皱密集度(种子数, 参考滑块) → 基准元胞 CELL = PAPER/√SEEDS
OCTAVES     = 5       # 褶皱层级(参考滑块)
INTENSITY   = 0.7     # 起伏强度(参考滑块) → 褶皱外凸深度 AMP = 3.0×INTENSITY  (v5.6.1 用户回调 1.0→0.7)
CURL        = 0.0     # 纸张整体弯曲(参考滑块) → 低频 swell 振幅 CURL_AMP = 3.0×CURL  (v5.6.1 用户回调 0.5→0)
PAPER       = 100.0   # 参考逻辑纸张尺寸(取单位=mm)
FALLOFF     = 2.2     # 每层权重衰减(参考: weight = intensity / 2.2^oct)
TARGET_EDGE = 1.6     # 细分目标边长(mm) 越小越细; 参考 res 拉满(400) → 取较细值以多解析高倍频
CELL        = PAPER / SEEDS**0.5          # 基准 Voronoi 元胞间距(mm) ≈ 16.67 (octave0)
AMP         = round(3.0 * INTENSITY, 2)   # 褶皱外凸深度(mm); intensity=1.0 → 3.0
CURL_AMP    = round(3.0 * CURL, 2)        # 大尺度弯曲 swell 外凸深度(mm); curl=0.5 → 1.5
TAPER       = 4.0     # 与光滑面相邻边界的羽化宽度(mm)
MOUTH_TAPER = 9.0     # 盆口(s→CUPLEN)纹理收口宽度(mm): 顶沿羽化到光滑净口, 防纹理爬到开口边显得"穿模"
SEAM_BOOST  = 0.5     # 盆×箱相贯线处的振幅增强倍率(+50%, 柔和熔接)
SEAM_SIGMA  = 16.0    # 增强带宽度(mm, 高斯)
SEED        = 7
BINARY      = True    # 二进制 STL(体积约为 ASCII 的 1/5)

# ---- 模型几何常数(与 wall_planter_v5.scad 派生一致, 用于接缝/滴水槽定位) --
import math as _m
_TILT=40.0; _AY=_m.cos(_m.radians(_TILT)); _AZ=_m.sin(_m.radians(_TILT))
_WALL=3.0; _FLOOR=6.0; _RESH=25.0; _LENS=5.0; _FIT=1.5
_PBD=93.2; _PTD=131.2; _PH=148.0; _PBACK=28.0; _MEXT=6.0
_LIPW=6.0; _LIPT=4.0; _DRIPW=1.6; _DRIPD=2.2
_RATE=(_PTD-_PBD)/_PH
_INB=_PBD+2*_FIT; _INT=_PTD+2*_FIT
_OUTB=_INB+2*_WALL; _OUTT=_INT+2*_WALL
_SIDEG=15.0; _MODW=_OUTT+2*_SIDEG; _CX=_MODW/2
_ZDIP=_WALL+_RESH-_LENS
_P0Y=(_OUTB/2)*_AZ-_FLOOR*_AY-_PBACK
_P0Z=_ZDIP-_FLOOR*_AZ+(_INB/2)*_AY
_OD0=(_INB-_RATE*_FLOOR)+2*_WALL
_SEATTOP=_FLOOR+_PH
_CUPLEN=_FLOOR+_PH+_MEXT
_BOXD=66.0
_AX0=np.array([_CX,_P0Y,_P0Z]); _AXD=np.array([0.0,_AY,_AZ])

def axis_sr(P):
    """点到盆轴: 轴向坐标 s 与径向距离 r。"""
    rel = P - _AX0
    s = rel @ _AXD
    rad = rel - s[:,None]*_AXD[None,:]
    return s, np.linalg.norm(rad, axis=1)

def cone_R(s):
    return _OD0/2 + (_RATE/2)*s

def seam_gain(P):
    """盆×箱相贯线邻域增强: d=hypot(到箱前面距离, 到锥面径向距离)。"""
    s,r = axis_sr(P)
    d = np.hypot(P[:,1]-_BOXD, r - cone_R(s))
    return 1.0 + SEAM_BOOST*np.exp(-(d/SEAM_SIGMA)**2)

# ---- 解析 ASCII STL -------------------------------------------------------
def load_stl(fn):
    vs = []
    with open(fn) as f:
        for line in f:
            s = line.lstrip()
            if s.startswith("vertex"):
                vs.append([float(x) for x in s.split()[1:4]])
    return np.asarray(vs, float).reshape(-1, 3, 3)

tris = load_stl(IN)
F = tris.shape[0]
print(f"读取 {IN}: {F} 三角面")

# 去重顶点 -> 索引面
flat = tris.reshape(-1, 3)
key = np.round(flat / 1e-4).astype(np.int64)
_, idx, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
inv = np.asarray(inv).reshape(-1)  # 兼容新版 numpy 的 (N,1) 形状
V = flat[idx]                      # 唯一顶点坐标
faces = inv.reshape(F, 3)          # 面->顶点索引
nV = V.shape[0]
print(f"唯一顶点 {nV}")

# 面法线/重心
fn = np.cross(V[faces[:,1]]-V[faces[:,0]], V[faces[:,2]]-V[faces[:,0]])
fl = np.linalg.norm(fn, axis=1, keepdims=True); fl[fl==0]=1
fn = fn / fl
fc = V[faces].mean(axis=1)
center = V.mean(axis=0)

# ---- 选面: 朝前/朝外可见外壳 ---------------------------------------------
# 几何参数(与 .scad 对应, 用于排除盆内腔与顶/底)
mod_w = V[:,0].max()
mod_h = V[:,2].max()
# ---- 按盆轴解析分类(不靠朝向碰运气): 整段外露锥壁一圈全收 ----------------
_s_fc, _r_fc = axis_sr(fc)
_rel = fc - _AX0[None,:]
_radv = _rel - _s_fc[:,None]*_AXD[None,:]
_rlen = np.linalg.norm(_radv, axis=1, keepdims=True); _rlen[_rlen==0]=1
rad_out = np.einsum('ij,ij->i', fn, _radv/_rlen)          # 法线的"离轴"分量

# 1) 外露锥壁(含下侧/四周一整圈): 径向距离≈锥外径, 法线朝离轴, 在箱前(排除背后stub)
cone_shell = (np.abs(_r_fc - cone_R(_s_fc)) < 1.8) & (rad_out > 0.15) \
             & (fc[:,1] > 55.0) & (_s_fc > 0) & (_s_fc < _CUPLEN + 1.0)
# 2) 挡土唇法兰(外柱面+前后环面), 排除盆口内孔(r 小/法线朝轴)
lip_band = (_s_fc > _SEATTOP - 1.2) & (_s_fc < _SEATTOP + _LIPT + 1.2) \
           & (_r_fc > _OUTT/2 - 1.0) & (rad_out > -0.9)
# 3) 箱体前面板
panel = (fn[:,1] > 0.60) & (np.abs(fc[:,1] - _BOXD) < 1.5)
# 滴水槽保护: 只罩环槽本体±0.7mm(法兰其余部分照常纹理化)。
# 注意必须给 r 加上限: s∈窗口是垂直盆轴的"平板带", 不限 r 会斜穿整个模型,
# 把盆口上方的面板也错误罩进去(实测 bug: 上面板出现成片光滑楔形)。
groove = (_s_fc > _SEATTOP + _LIPT - _DRIPW - 1.3) & (_s_fc < _SEATTOP + _LIPT - 0.1) \
         & (_r_fc > _OUTT/2 + _LIPW - _DRIPD - 1.2) & (_r_fc < _OUTT/2 + _LIPW + 3.5)
# 顶叠合面保险(理论上不会被选到, 防参数漂移)
not_top  = ~((fn[:,2] > 0.80) & (fc[:,2] > mod_h-12))
textured = (cone_shell | lip_band | panel) & ~groove & not_top
print(f"纹理面 {textured.sum()} / {F}  (锥壁{cone_shell.sum()} 唇{lip_band.sum()} 面板{panel.sum()};"
      f" 内腔/顶底/背/侧拼面/滴水槽光滑)")

# ---- 仅用纹理面计算平均顶点法线(位移方向) --------------------------------
vn = np.zeros((nV,3))
for fi in np.where(textured)[0]:
    for k in range(3):
        vn[faces[fi,k]] += fn[fi]
ln = np.linalg.norm(vn, axis=1, keepdims=True); ln[ln==0]=1
vn = vn / ln

# ---- 边界边: 纹理面与非纹理面共享的边 -> 羽化源 --------------------------
from collections import defaultdict
edge_faces = defaultdict(list)
for fi in range(F):
    a,b,c = faces[fi]
    for e in [(a,b),(b,c),(c,a)]:
        edge_faces[tuple(sorted(e))].append(fi)
boundary_segs = []   # 与光滑面相邻的纹理面边(用于羽化距离)
for e, fis in edge_faces.items():
    tflags = [textured[i] for i in fis]
    if any(tflags) and not all(tflags):
        boundary_segs.append(V[list(e)])
boundary_segs = np.asarray(boundary_segs) if boundary_segs else np.zeros((0,2,3))
print(f"边界边 {len(boundary_segs)}")

# 沿边界边密采样点 -> KD 树, 查最近距离做羽化(快)
from scipy.spatial import cKDTree
_bpts = []
for A,B in boundary_segs:
    L = np.linalg.norm(B-A); m = max(2, int(L/1.0)+1)
    ts = np.linspace(0,1,m)
    _bpts.append(A[None]*(1-ts[:,None]) + B[None]*ts[:,None])
_bpts = np.concatenate(_bpts, axis=0) if _bpts else np.zeros((1,3))+1e9
_btree = cKDTree(_bpts)

def dist_to_boundary(P):
    if len(boundary_segs)==0:
        return np.full(len(P), 1e9)
    d,_ = _btree.query(P, k=1)
    return d

# ---- 噪声: 3D 元胞(F2-F1) + 值噪声 --------------------------------------
rng = np.random.default_rng(SEED)
def hash3(ix, iy, iz, salt=0):
    h = (ix*73856093) ^ (iy*19349663) ^ (iz*83492791) ^ (salt*2654435761)
    h = (h ^ (h>>13)) * 1274126177
    return (h & 0xffffff) / 0xffffff      # 0..1

def cellular_f2f1(P, cell):
    """3D 元胞 (F2-F1, 网格单位) + 最近元胞的随机符号(±)。
       参考工具对每个元胞随机赋正/负, 使折痕成为一块块凸/凹的小平面(crackle)。"""
    g = P / cell
    gi = np.floor(g).astype(np.int64)
    f1 = np.full(len(P), 1e9); f2 = np.full(len(P), 1e9)
    sign = np.ones(len(P))
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for dz in (-1,0,1):
                cx,cy,cz = gi[:,0]+dx, gi[:,1]+dy, gi[:,2]+dz
                jx = hash3(cx,cy,cz,1); jy = hash3(cx,cy,cz,2); jz = hash3(cx,cy,cz,3)
                seed = np.stack([cx+jx, cy+jy, cz+jz], axis=1)
                d = np.linalg.norm(g - seed, axis=1)
                cell_sign = np.where(hash3(cx,cy,cz,5) > 0.5, 1.0, -1.0)
                closer = d < f1
                f2   = np.where(closer, f1, f2)               # 旧 f1 退为 f2
                f2   = np.where((~closer) & (d < f2), d, f2)   # 否则 d 可能成为新 f2
                sign = np.where(closer, cell_sign, sign)
                f1   = np.where(closer, d, f1)
    return f2 - f1, sign

def value_noise(P, cell):
    g = P / cell; gi = np.floor(g).astype(np.int64); fr = g - gi
    w = fr*fr*(3-2*fr)
    val = np.zeros(len(P))
    for dx in (0,1):
        for dy in (0,1):
            for dz in (0,1):
                h = hash3(gi[:,0]+dx, gi[:,1]+dy, gi[:,2]+dz, 9)
                wx = w[:,0] if dx else 1-w[:,0]
                wy = w[:,1] if dy else 1-w[:,1]
                wz = w[:,2] if dz else 1-w[:,2]
                val += h*wx*wy*wz
    return val   # 0..1

def crackle_field(P):
    """参考的有符号 F2-F1 折痕场(物理 mm): 每层种子数×4(间距÷2)、权重 INTENSITY/FALLOFF^oct,
       每元胞随机 ± -> 一块块小平面折痕。返回有符号值(后续 clip 到正向, 负向贴原面)。"""
    h = np.zeros(len(P))
    for k in range(OCTAVES):
        cell_k = CELL / (2.0**k)                   # 种子数×4 ⇔ 元胞间距÷2
        d, sgn = cellular_f2f1(P, cell_k)
        h += (d * cell_k) * (INTENSITY / (FALLOFF**k)) * sgn
    return h

def curl_field(P):
    """参考的大尺度卷曲(双频值噪声), 作为独立的低频外凸 swell -> 纸张整体弯曲。"""
    return (2*value_noise(P, 1/0.03) - 1)*15.0 + (2*value_noise(P, 1/0.08) - 1)*5.0

# 全局归一化: 褶皱场按 p2..p98 平滑映射到 [0,1](圆润观感, 同 v5.5; 比 clamp-正向更柔, 不发"碎/尖");
# t∈[0,1] -> ×AMP 仍是仅外凸(只加料不减壁)。弯曲 swell 仍取正向 clip。
_cr = crackle_field(V); CR_LO=float(np.percentile(_cr,2.0)); CR_HI=float(np.percentile(_cr,98.0))
_cu = curl_field(V);    SCALE_CU=float(np.percentile(_cu,96.0)); SCALE_CU = SCALE_CU if SCALE_CU>1e-6 else 1.0
def disp_t(P):
    """外凸位移(mm, >=0): 褶皱 p2..p98 归一化×AMP(圆润) + 低频弯曲 swell(clip正向)×CURL_AMP。"""
    t = AMP * np.clip((crackle_field(P)-CR_LO)/(CR_HI-CR_LO+1e-9), 0, 1)
    if CURL_AMP > 0:
        t = t + CURL_AMP * np.clip(curl_field(P)/SCALE_CU, 0, 1)
    return t
print(f"crackle p2={CR_LO:.3f} p98={CR_HI:.3f}  CELL≈{CELL:.2f}mm AMP={AMP} CURL_AMP={CURL_AMP} 倍频={OCTAVES} 种子={SEEDS}")

# ---- 共形细分: 逐边一致的段数 + Delaunay 三角化 + 全局顶点焊接(水密) -----
from scipy.spatial import Delaunay as _Del

# 每条边的属性: 是否与纹理面相邻(决定是否细分)、是否与光滑面相邻(决定羽化)
edge_tex = {}; edge_smooth = {}
for e, fis in edge_faces.items():
    ts = [textured[i] for i in fis]
    edge_tex[e]    = any(ts)
    edge_smooth[e] = any(not t for t in ts)

def nseg(p, q):
    return int(min(160, max(1, round(np.linalg.norm(p-q)/TARGET_EDGE))))

# 全局顶点池: 以"原始(未位移)坐标"量化为键 -> 同一原始点焊到同一索引
vpool = {}; vcoord = []
def getv(orig, disp):
    k = (round(orig[0]/2e-3), round(orig[1]/2e-3), round(orig[2]/2e-3))
    idx = vpool.get(k)
    if idx is None:
        idx = len(vcoord); vpool[k] = idx; vcoord.append(disp)
    return idx

out_faces = []
CORNER = np.array([[1.,0,0],[0,1,0],[0,0,1]])   # 三角三个角的重心

# ---- 前面板整体重网格(修复1): 替换 OpenSCAD 的细长 fan 三角形(放射条纹根源) ----
# 共面前面板(法线≈+Y, y≈BOXD)当作整块平面: 板内铺均匀 hex 格点重新三角化, 取代细条。
# 边界共形: 与锥壁(纹理)相邻的"孔边"按 nseg 打点(焊到锥壁); 与光滑面相邻的"外框边"仅留端点+羽化。
panel_tex = panel & textured
def remesh_panel():
    pidx = np.where(panel_tex)[0]
    if len(pidx) == 0: return
    pn = fn[pidx].mean(0); pn = pn/(np.linalg.norm(pn)+1e-12)        # 面板法线≈+Y
    a1 = np.array([1.0,0,0]); a1 = a1 - pn*(a1@pn)
    if np.linalg.norm(a1) < 1e-6:
        a1 = np.array([0,0,1.0]); a1 = a1 - pn*(a1@pn)
    a1 /= np.linalg.norm(a1); a2 = np.cross(pn, a1)
    p0 = V[faces[pidx[0],0]]
    def to2(Q): return np.stack([(Q-p0)@a1, (Q-p0)@a2], axis=-1)
    cnt = {}
    for fi in pidx:
        a,b,c = faces[fi]
        for e in ((a,b),(b,c),(c,a)):
            kk = tuple(sorted(e)); cnt[kk] = cnt.get(kk,0)+1
    hole=[]; outer=[]
    for e,n in cnt.items():
        if n != 1: continue                                          # 板内边(消除掉)
        nb = [f for f in edge_faces[e] if not panel_tex[f]]
        (hole if any(textured[f] for f in nb) else outer).append(e)
    # 所有边界边都按 nseg 打点: 邻面(锥壁或箱体侧)因本边 edge_tex=True 都会按 nseg 细分,
    # 必须逐点对齐才水密(hole/outer 仅区分是否羽化, 不影响打点)。
    bpts=[]                                                          # 边界打点(原坐标 -> 焊接)
    for (va,vb) in (hole+outer):
        m = nseg(V[va],V[vb])
        for t in range(m+1): bpts.append(V[va]*(1-t/m)+V[vb]*(t/m))
    bpts = np.array(bpts)
    seg = np.array([[V[a],V[b]] for (a,b) in (hole+outer)])
    seg2 = to2(seg.reshape(-1,3)).reshape(-1,2,2)
    A = seg2[:,0,:]; B = seg2[:,1,:]
    allv = np.unique(np.concatenate([faces[fi] for fi in pidx]))
    vv = to2(V[allv]); umin,vmin = vv.min(0); umax,vmax = vv.max(0)
    hstep = TARGET_EDGE*0.866; rows = np.arange(vmin+hstep, vmax, hstep); lat=[]
    for ri,yv in enumerate(rows):
        us = np.arange(umin + (TARGET_EDGE/2 if ri%2 else 0) + 0.3*TARGET_EDGE, umax, TARGET_EDGE)
        if len(us): lat.append(np.stack([us, np.full(len(us),yv)],1))
    lat = np.concatenate(lat,0) if lat else np.zeros((0,2))
    def inside(Q):
        qy = Q[:,1][:,None]; ay=A[:,1][None,:]; by=B[:,1][None,:]
        cross = (ay>qy) != (by>qy)
        ix = A[:,0][None,:] + (qy-ay)/(by-ay+1e-12)*(B[:,0][None,:]-A[:,0][None,:])
        return ((cross & (Q[:,0][:,None] < ix)).sum(1) % 2) == 1
    def dist2seg(Q):
        AB=B-A; L2=(AB**2).sum(1)+1e-12; d=np.full(len(Q),1e9)
        for j in range(len(A)):
            ap=Q-A[j]; tt=np.clip((ap@AB[j])/L2[j],0,1)
            d=np.minimum(d, np.linalg.norm(Q-(A[j]+tt[:,None]*AB[j]),axis=1))
        return d
    if len(lat):
        lat = lat[inside(lat) & (dist2seg(lat) > 0.5*TARGET_EDGE)]
    P2 = np.concatenate([to2(bpts), lat],0)
    kk = np.round(P2/2e-3).astype(np.int64); _,uq = np.unique(kk,axis=0,return_index=True)
    P2 = P2[np.sort(uq)]
    if len(P2) < 3: return
    P3d = p0[None,:] + P2[:,0:1]*a1[None,:] + P2[:,1:2]*a2[None,:]
    tri = _Del(P2)
    mask = np.ones(len(P3d))                                         # 仅外框边羽化(孔边不羽化)
    for (va,vb) in outer:
        Aa=V[va]; AB=V[vb]-V[va]; Ll=np.linalg.norm(AB)+1e-12
        mask = np.minimum(mask, np.clip(np.linalg.norm(np.cross(P3d-Aa, AB/Ll),axis=1)/TAPER,0,1))
    disp = disp_t(P3d)*mask*seam_gain(P3d)
    Pd = P3d + pn[None,:]*disp[:,None]
    ixv = [getv(P3d[i], Pd[i]) for i in range(len(P3d))]
    # 剔除跨"孔"的伪三角(Delaunay 填的是凸包, 含孔; 孔内无点 -> 跨孔三角重心落在孔内): 仅保留重心在板材区内。
    keep = inside(P2[tri.simplices].mean(1))
    for si,s in enumerate(tri.simplices):
        if not keep[si]: continue
        ar = abs((P2[s[1],0]-P2[s[0],0])*(P2[s[2],1]-P2[s[0],1])
               - (P2[s[1],1]-P2[s[0],1])*(P2[s[2],0]-P2[s[0],0]))
        if ar < 1e-4: continue
        a,b,c = ixv[s[0]],ixv[s[1]],ixv[s[2]]
        tn = np.cross(P3d[s[1]]-P3d[s[0]], P3d[s[2]]-P3d[s[0]])
        if np.dot(tn, pn) < 0: b,c = c,b
        out_faces.append((a,b,c))

for fi in range(F):
    if panel_tex[fi]: continue                       # 面板交给 remesh_panel 整体处理
    vi = faces[fi]; P3 = V[vi]; N3 = vn[vi]
    es = [tuple(sorted((vi[a], vi[b]))) for a,b in ((0,1),(1,2),(2,0))]
    # 该面任一边需细分? 否则原样输出单三角(绝大多数光滑面走这里)
    ns = [nseg(P3[a], P3[b]) if edge_tex[es[k]] else 1
          for k,(a,b) in enumerate(((0,1),(1,2),(2,0)))]
    if max(ns) == 1:
        i0 = getv(P3[0], P3[0]); i1 = getv(P3[1], P3[1]); i2 = getv(P3[2], P3[2])
        out_faces.append((i0,i1,i2)); continue

    tex = textured[fi]
    # 面内正交标架(u,v): 采样/三角化都在物理平面坐标做, 与三角形长宽比无关
    e1 = P3[1]-P3[0]; e1 = e1/ (np.linalg.norm(e1)+1e-12)
    e2 = np.cross(fn[fi], e1); e2 = e2/ (np.linalg.norm(e2)+1e-12)
    def to_uv(Q): return np.stack([ (Q-P3[0]) @ e1, (Q-P3[0]) @ e2 ], axis=-1)
    uv3 = to_uv(P3)                                    # 三角形顶点的 uv
    # 边界点: 各边按 ns 等分(端点共享 -> 跨面共形)
    pts = []
    for k,(a,b) in enumerate(((0,1),(1,2),(2,0))):
        for t in range(ns[k]):
            pts.append(P3[a]*(1-t/ns[k]) + P3[b]*(t/ns[k]))
    pts = np.array(pts)
    # 内部点: 纹理面在面内铺等距六角格(各向同性, 防细长三角形的放射条纹)
    if tex:
        T2 = np.array([uv3[1]-uv3[0], uv3[2]-uv3[0]]).T
        Tinv = np.linalg.inv(T2) if abs(np.linalg.det(T2))>1e-9 else None
        if Tinv is not None:
            uvb = to_uv(pts)
            umin,vmin = uv3.min(0)-1; umax,vmax = uv3.max(0)+1
            h_step = TARGET_EDGE*0.866
            rows = np.arange(vmin, vmax, h_step)
            lat = []
            for ri,vv in enumerate(rows):
                us = np.arange(umin + (TARGET_EDGE/2 if ri%2 else 0), umax, TARGET_EDGE)
                lat.append(np.stack([us, np.full(len(us), vv)], axis=1))
            lat = np.concatenate(lat, axis=0)
            bc = (lat - uv3[0]) @ Tinv.T               # -> (β,γ), α=1-β-γ
            al = 1-bc[:,0]-bc[:,1]
            ok = (bc[:,0]>1e-6)&(bc[:,1]>1e-6)&(al>1e-6)   # 在三角形内
            # 距三条边的物理距离 ≥0.45*步长(防贴边退化三角形)
            dmin = 0.45*TARGET_EDGE
            for a,b in ((0,1),(1,2),(2,0)):
                ev = uv3[b]-uv3[a]; el = np.linalg.norm(ev)+1e-12
                d = np.abs((lat[:,0]-uv3[a,0])*ev[1]-(lat[:,1]-uv3[a,1])*ev[0])/el
                ok &= d > dmin
            # 与边界采样点去重(防近重合)
            if ok.any():
                dd = np.linalg.norm(lat[ok][:,None,:]-uvb[None,:,:], axis=2).min(1)
                sub = np.where(ok)[0]; ok[sub[dd < 0.6*TARGET_EDGE]] = False
            if ok.any():
                inner = P3[0] + np.outer(lat[ok,0]-uv3[0,0], e1) + np.outer(lat[ok,1]-uv3[0,1], e2)
                pts = np.concatenate([pts, inner], axis=0)
    # uv 去重 + Delaunay
    uvp = to_uv(pts)
    key = np.round(uvp/2e-3).astype(np.int64)
    _, uq = np.unique(key, axis=0, return_index=True)
    pts = pts[np.sort(uq)]; uvp = to_uv(pts)
    if len(pts) < 3:
        i0=getv(P3[0],P3[0]); i1=getv(P3[1],P3[1]); i2=getv(P3[2],P3[2])
        out_faces.append((i0,i1,i2)); continue
    tri2d = _Del(uvp)
    P = pts
    # 法线: 重心插值(由 uv 反解重心坐标)
    T2 = np.array([uv3[1]-uv3[0], uv3[2]-uv3[0]]).T
    bcP = (uvp - uv3[0]) @ np.linalg.inv(T2).T
    baryP = np.stack([1-bcP[:,0]-bcP[:,1], bcP[:,0], bcP[:,1]], axis=1)
    Nn = baryP @ N3; Nn /= (np.linalg.norm(Nn,axis=1,keepdims=True)+1e-9)
    if tex:
        # 羽化: 对"与光滑面相邻"的边, 按到该边的物理距离 disp->0
        mask = np.ones(len(P))
        for k,(a,b) in enumerate(((0,1),(1,2),(2,0))):
            if edge_smooth[es[k]]:
                A,B = P3[a], P3[b]; AB = B-A; L = np.linalg.norm(AB)+1e-12
                d = np.linalg.norm(np.cross(P-A, AB/L), axis=1)
                mask = np.minimum(mask, np.clip(d/TAPER,0,1))
        s_,_r_ = axis_sr(P)                        # 盆口收口: s→CUPLEN 处羽化到净口(防纹理爬到开口边)
        mt = np.clip((_CUPLEN - s_)/MOUTH_TAPER, 0, 1); mt = mt*mt*(3-2*mt)
        disp = disp_t(P) * mask * seam_gain(P) * mt   # >=0: 仅外凸(offset 出体积)
        Pd = P + Nn*disp[:,None]
    else:
        Pd = P                                       # 光滑面: 仅做共形(不位移)
    idx = [getv(P[i], Pd[i]) for i in range(len(P))]
    nf = fn[fi]
    for s in tri2d.simplices:
        # 剔除退化三角形(uv 面积≈0, 多出现在共线边界点上)
        a2 = abs((uvp[s[1],0]-uvp[s[0],0])*(uvp[s[2],1]-uvp[s[0],1])
               - (uvp[s[1],1]-uvp[s[0],1])*(uvp[s[2],0]-uvp[s[0],0]))
        if a2 < 1e-4: continue
        a,b,c = idx[s[0]], idx[s[1]], idx[s[2]]
        # 用未位移坐标判定绕向, 与原面法线对齐(Delaunay 不保证绕向)
        tn = np.cross(P[s[1]]-P[s[0]], P[s[2]]-P[s[0]])
        if np.dot(tn, nf) < 0: b,c = c,b
        out_faces.append((a,b,c))

remesh_panel()   # 前面板整体重网格(在锥壁等已建好孔边焊点后, 焊接共形)

Vout = np.array(vcoord)
Fout = np.array(out_faces)
# 修正三角朝向(与原面法线一致, 用未位移法线判定)
allt = Vout[Fout]
print(f"输出顶点 {len(Vout)}  三角面 {len(Fout)} (原 {F})")

# ---- 写 STL ---------------------------------------------------------------
def write_stl(fn, T, binary=True):
    nrm = np.cross(T[:,1]-T[:,0], T[:,2]-T[:,0])
    nl = np.linalg.norm(nrm,axis=1,keepdims=True); nl[nl==0]=1; nrm/=nl
    if binary:
        import struct
        with open(fn,"wb") as f:
            f.write(b"crumpled paper texture" + b"\0"*(80-22))
            f.write(struct.pack("<I", len(T)))
            buf = bytearray()
            for t,nv in zip(T,nrm):
                buf += struct.pack("<12fH", nv[0],nv[1],nv[2],
                    t[0,0],t[0,1],t[0,2], t[1,0],t[1,1],t[1,2], t[2,0],t[2,1],t[2,2], 0)
            f.write(buf)
    else:
        with open(fn,"w") as f:
            f.write("solid crumpled\n")
            for t,nv in zip(T,nrm):
                f.write(f"facet normal {nv[0]:.5e} {nv[1]:.5e} {nv[2]:.5e}\n outer loop\n")
                for v in t:
                    f.write(f"  vertex {v[0]:.5f} {v[1]:.5f} {v[2]:.5f}\n")
                f.write(" endloop\nendfacet\n")
            f.write("endsolid crumpled\n")
write_stl(OUT, allt, BINARY)
print(f"写出 {OUT} ({'binary' if BINARY else 'ascii'})")
