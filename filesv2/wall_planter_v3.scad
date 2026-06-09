// =====================================================================
//  墙面种植单元 v3 — 正确形态: 薄背板 + 前伸斜置中空杯体 + 底部储水盒
//  对标剖面图: 杯体是露在外的管状件(有壁厚), 非实心块挖洞
//  拓竹P2S: 单元三维 ≤ 240mm | 仅堆叠 | 逐层淌水 | 可拆锥形盆
// =====================================================================

/* [可拆花盆外形 -> 腔体按此+间隙] */
pot_top_d = 131.2;   // 盆上口外径
pot_bot_d = 93.2;    // 盆底外径
pot_height= 148;     // 盆高
fit_clear = 1.5;     // 单边间隙

/* [杯体/壁] */
tilt      = 40;      // 杯轴高于水平的角度(越大开口越朝上)
wall      = 3.0;     // 杯壁/箱壁厚
floor_t   = 6;       // 杯底厚(承盆)
mouth_ext = 18;      // 开口端外伸(确保杯口完整张开)

/* [背板/储水盒] */
panel_t   = 8;       // 背板厚
res_h     = 24;      // 储水盒高
side_gap  = 12;      // 杯体两侧到边距

/* [灌溉/孔] */
drain_d   = 6;       // 杯底排水孔(->储水盒)
overflow_d= 12;      // 储水盒溢流孔(->下层, 底层可塞堵塞)
vent_d    = 6;       // 透气孔
vent_n    = 2;

/* [堆叠定位] */
peg_d     = 8;
peg_clear = 0.3;

dev = true;
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;
in_top  = pot_top_d + 2*fit_clear;
out_bot = in_bot + 2*wall;
out_top = in_top + 2*wall;
cup_len = pot_height + 4;
ay = cos(tilt); az = sin(tilt);          // 杯轴方向 (0, ay, az)

mod_w = out_top + 2*side_gap;
cx    = mod_w/2;
base_y = panel_t;                         // 杯底(窄端)贴在背板前
base_z = res_h;                           // 杯底坐在储水盒顶
op_y  = base_y + cup_len*ay;              // 开口中心 Y
op_z  = base_z + cup_len*az;              // 开口中心 Z
mod_d = op_y + (out_top/2)*az + 14;       // 前向总深
mod_h = op_z + (out_top/2)*ay + 14;       // 总高

// 斜置圆台(从局部原点沿杯轴伸出)
module frustum(d1, d2, len) {
    rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2);
}

// ---- 实体 ----------------------------------------------------------
module body() {
    union() {
        // 背板(薄板, 贴墙/堆叠面)
        cube([mod_w, panel_t, mod_h]);
        // 储水盒(底部实体块, 后面掏空)
        cube([mod_w, mod_d, res_h]);
        // 杯体外形(前伸斜圆台实体)
        translate([cx, base_y, base_z]) frustum(out_bot, out_top, cup_len);
    }
}

module unit() {
    difference() {
        body();

        // 1) 掏空杯体内腔(留 floor_t 杯底), 并外伸开口
        translate([cx, base_y + ay*floor_t, base_z + az*floor_t])
            frustum(in_bot, in_top, cup_len - floor_t + mouth_ext);

        // 2) 杯底排水孔 -> 储水盒
        translate([cx, base_y + ay*floor_t*0.6, base_z + 1])
            translate([0, 2, 0]) cylinder(h = base_z + 6, d = drain_d, center=false);
        translate([cx, base_y + 6, -0.5]) cylinder(h = base_z + floor_t + 2, d = drain_d);

        // 3) 储水盒内腔(留壁)
        translate([wall, panel_t + wall, wall])
            cube([mod_w - 2*wall, mod_d - panel_t - 2*wall, res_h - wall + 0.01]);

        // 4) 溢流孔(储水盒底 -> 下层; 底层塞橡胶塞)
        translate([cx, mod_d*0.5, -0.5]) cylinder(h = wall + 1, d = overflow_d);

        // 5) 透气孔(背板上部)
        for (k = [0 : vent_n-1])
            translate([cx - 20 + k*40, -0.5, mod_h*0.62])
                rotate([-90,0,0]) cylinder(h = panel_t + 1, d = vent_d);

        // 6) 背板顶部半圆缺口(让上层水路/透气)
        translate([cx, panel_t/2, mod_h]) rotate([0,90,0])
            cylinder(h = mod_w, d = 26, center=true);

        // 7) 顶面堆叠定位孔
        for (sx = [mod_w*0.28, mod_w*0.72])
            translate([sx, panel_t/2, mod_h - 8]) cylinder(h = 9, d = peg_d + peg_clear);
    }

    // 8) 底面堆叠定位销
    for (sx = [mod_w*0.28, mod_w*0.72])
        translate([sx, panel_t/2, -7]) cylinder(h = 8, d = peg_d);
}

unit();
echo(str("单元 W x D x H = ", mod_w, " x ", mod_d, " x ", mod_h, " mm  (需 ≤240)"));
