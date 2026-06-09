// =====================================================================
//  模块化墙面种植系统 v4 — 单盆位托座 (OpenSCAD)
//  对标参考剖面图: 斜置可拆锥形花盆 + 盆底排水 + 储水沟+溢流 + 堆叠拼接
//  *省料楔形外壳 + 沿花盆角度斜切的洁净开口*
//    开口面 ⟂ 花盆轴线(沿盆倾角切), 是完整正圆、不被腔壁遮挡; 顶/前随盆斜切去废料。
//  打印机: 拓竹 P2S (256^3, 按 ≤240/轴) | 单件 1 个盆位
//  单位 mm | FDM 可打印 | 改顶部参数即可调花盆/模块尺寸
// =====================================================================

/* [可拆花盆 Pot — 实测外形, 上大下小圆台] */
pot_top_d   = 131.2;  // 花盆上开口外径(宽端, 落在开口)
pot_bot_d   = 93.2;   // 花盆底外径(窄端, 落在后下方)
pot_height  = 148;    // 花盆高
fit_clear   = 1.5;    // 腔体单边间隙(直径方向 = +2*该值)

/* [杯腔姿态 Pose] */
pot_tilt    = 55;     // 杯腔轴线与水平的夹角(越大越竖立, 开口越朝前)

/* [模块网格 Grid] 单盆位 */
cols        = 1;
gap_x       = 8;      // 盆侧净壁余量

/* [箱体 Shell] */
wall        = 2.6;    // 壁厚(0.4 喷嘴约 6 层)
back_gap    = 8;      // 杯底窄端与背板净间隙
sump_clear  = 12;     // 杯腔最低点离箱内底余量(=储水沟深, 须 > water_h)
top_clear   = 12;     // 开口最高点到顶余量

/* [灌溉 Irrigation] */
vent_d      = 5;      // 透气孔径
vent_count  = 3;      // 透气孔数
overflow_d  = 9;      // 溢流标管内径
water_h     = 8;      // 储水沟水位(标管高, < sump_clear)

/* [顶部缺口 Notch] */
notch       = true;
notch_d     = 26;

/* [堆叠定位 Interlock] 仅堆叠, 非承重 */
loc_peg_d   = 7;
loc_h       = 6;
loc_clear   = 0.3;

dev = true;
$fn = dev ? 32 : 96;

// ---- 派生尺寸 ------------------------------------------------------
cav_top_d = pot_top_d + 2*fit_clear;
cav_bot_d = pot_bot_d + 2*fit_clear;
pot_depth = pot_height + 2;
pot_d     = cav_top_d;
r_top     = cav_top_d/2;
r_bot     = cav_bot_d/2;
st        = sin(pot_tilt);
ct        = cos(pot_tilt);

mod_w     = cols*(pot_d + gap_x) + gap_x + 2*wall;

// 锥腔宽端中心 (Cy, oz0): 由"后上点离背 back_gap"和"最低点离底 sump_clear"反推
floor_in_z = wall + sump_clear;
Cy  = wall + back_gap + pot_depth*ct + r_bot*st;   // 宽端中心 Y
oz0 = floor_in_z + pot_depth*st + r_bot*ct;        // 宽端中心 Z
floor_y = Cy - pot_depth*ct;                        // 窄端中心 Y
floor_z = oz0 - pot_depth*st;                       // 窄端中心 Z

// 锥腔侧剖 rim 点 (Y,Z): F=前/宽端开口, B=后/窄端
FTy = Cy - r_top*st;  FTz = oz0 + r_top*ct;   // 前-上(开口顶)
FBy = Cy + r_top*st;  FBz = oz0 - r_top*ct;   // 前-下(开口底, 最前)
BTy = floor_y - r_bot*st;  BTz = floor_z + r_bot*ct;  // 后-上
back_face = max(0, BTy - wall);               // 后竖壁外面 Y

// 杯腔最低点(储水沟/排水)
low_y = floor_y + r_bot*st;
low_z = floor_z - r_bot*ct;

mod_d = FBy;                       // 最前 = 开口底
mod_h = FTz + top_clear;           // 最高 = 开口顶 + 余量

function cx(i) = wall + gap_x + pot_d/2 + i*(pot_d+gap_x);
// 顶斜面(C→D)在某 Y 处的外表面 Z
function slope_z(y) = (BTz+wall) + (FTz-(BTz+wall))*(y-back_face)/(FTy-back_face);

// ---- 侧剖面(楔形+斜开口, 局部坐标 x=Y, y=Z)----------------------
module side_profile() {
    polygon([
        [FBy,       0      ],   // 前-底(最前下角)
        [back_face, 0      ],   // 后-底
        [back_face, BTz+wall],  // 后竖壁顶
        [FTy,       FTz    ],   // 顶斜面到开口顶
        [FBy,       FBz    ]    // 开口斜面到开口底, 再竖直回前-底
    ]);
}
module shell() {
    multmatrix([[0,0,1,0],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
        linear_extrude(mod_w) side_profile();
}

// 花盆腔: 圆台, 宽端(d1)朝开口, 窄端(d2)在后下; 开口落在斜剖面上 → 洁净正圆
module pocket(i) {
    translate([cx(i), Cy, oz0])
        rotate([90 + pot_tilt, 0, 0])
            cylinder(h = pot_depth + 1, d1 = cav_top_d, d2 = cav_bot_d);
}

// ---- 主模块 -------------------------------------------------------
module unit() {
    difference() {
        union() {
            difference() {
                shell();

                // 1) 花盆腔(在斜剖面开洁净正圆)
                for (i=[0:cols-1]) pocket(i);

                // 2) 储水沟(竖直短腔, 与锥腔底重叠 → 排水且不封闭)
                translate([cx(0), low_y, wall])
                    cylinder(h = low_z + 2 - wall, d = overflow_d + 2*wall + 10);

                // 3) 透气孔(开口上沿后方, 竖直穿顶斜面进腔)
                for (i=[0:cols-1], k=[0:vent_count-1])
                    translate([cx(i) - pot_d/4 + k*(pot_d/4), FTy - 16, mod_h + 1])
                        cylinder(h = mod_h + 1 - (slope_z(FTy-16) - 8), d = vent_d);

                // 4) 顶后沿半圆缺口
                if (notch)
                    translate([mod_w/2, back_face + notch_d*0.45, BTz + wall])
                        rotate([0,90,0])
                            cylinder(h = pot_d*0.4, d = notch_d, center = true);

                // 5) 堆叠定位孔: 底面 + 左侧
                for (sx=[mod_w*0.3, mod_w*0.7])
                    translate([sx, low_y, -0.01])
                        cylinder(h = loc_h + 0.5, d = loc_peg_d + loc_clear);
                for (sz=[55, 110])
                    translate([-0.5, Cy, sz])
                        rotate([0,90,0]) cylinder(h = loc_h + 1, d = loc_peg_d + loc_clear);
            }

            // 6) 溢流标管(立在储水沟最低处, 顶=水位)
            translate([cx(0), low_y, wall - 0.01])
                cylinder(h = water_h, d = overflow_d + 2*wall);

            // 7) 堆叠定位销: 后顶斜面 + 右侧(销立在顶斜面上, 与上层底孔配合)
            for (sx=[mod_w*0.3, mod_w*0.7])
                translate([sx, back_face + 14, slope_z(back_face + 14) - 0.01])
                    cylinder(h = loc_h, d = loc_peg_d);
            for (sz=[55, 110])
                translate([mod_w - 0.01, Cy, sz])
                    rotate([0,90,0]) cylinder(h = loc_h, d = loc_peg_d);
        }

        // 8) 标管内孔贯穿到底(储水沟 → 下层; 底层塞橡胶塞)
        translate([cx(0), low_y, -0.5])
            cylinder(h = water_h + wall + 1, d = overflow_d);
    }
}

unit();
echo(str("模块外形 W x D x H = ", mod_w, " x ", mod_d, " x ", mod_h, " mm  (限 240)"));
echo(str("开口顶 FT=(", FTy, ",", FTz, ")  开口底 FB=(", FBy, ",", FBz, ")  后壁 Y=", back_face));
echo(str("杯腔最低点 Z = ", low_z));
