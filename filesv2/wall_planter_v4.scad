// =====================================================================
//  墙面种植单元 v4 — 薄背板 + 前伸斜置中空杯体 + 底部"封闭"储水盒
//  基于 v3 正确形态继续: 封闭储水盒(带前唇/标管溢流) + 左右横拼定位 + 优化堆叠/透气
//  对标剖面图: 杯体=露在外的有壁厚管件(非实心挖洞)
//  拓竹P2S: 单元三维 ≤240mm | 仅堆叠 | 逐层淌水 | 可拆锥形盆
//  打印朝向建议: 背板朝下平躺, 杯口朝上, 基本免支撑。
// =====================================================================

/* [可拆花盆外形 -> 内腔按此+间隙] */
pot_top_d = 131.2;   // 盆上口外径
pot_bot_d = 93.2;    // 盆底外径
pot_height= 148;     // 盆高
fit_clear = 1.5;     // 单边间隙

/* [杯体/壁] */
tilt      = 40;      // 杯轴高于水平的角度(越大开口越朝上)
wall      = 3.0;     // 杯壁/箱壁厚
floor_t   = 6;       // 杯底厚(承盆)
mouth_ext = 18;      // 开口端外伸(确保杯口完整张开)
mouth_lip = 0;       // 开口前沿挡土唇高(0=不加; >0 在杯口加一圈内唇)

/* [背板/储水盒] */
panel_t   = 8;       // 背板厚
res_h     = 26;      // 储水盒高
res_lip   = 7;       // 储水盒前唇高(高出盒盖, 挡水/还原剖面)
side_gap  = 12;      // 杯体两侧到边距

/* [灌溉/孔] */
drain_d   = 7;       // 杯底排水孔(->储水盒, 兼作储水盒透气)
overflow_d= 12;      // 溢流标管内径(->下层, 底层塞橡胶塞)
water_h   = 14;      // 储水盒水位(标管高, < res_h-wall)
vent_d    = 6;       // 透气孔
vent_n    = 2;

/* [堆叠/横拼定位] */
peg_d     = 8;       // 上下堆叠销径
peg_clear = 0.3;
tile_peg_d= 7;       // 左右横拼销径
tile_h    = 6;       // 横拼销长

dev = true;
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;
in_top  = pot_top_d + 2*fit_clear;
out_bot = in_bot + 2*wall;
out_top = in_top + 2*wall;
cup_len = pot_height + 4;
ay = cos(tilt); az = sin(tilt);          // 杯轴方向 (0, ay, az)

mod_w  = out_top + 2*side_gap;
cx     = mod_w/2;
base_y = panel_t;                         // 杯底(窄端)贴背板前
base_z = res_h;                           // 杯底坐储水盒顶
op_y   = base_y + cup_len*ay;             // 开口中心 Y
op_z   = base_z + cup_len*az;             // 开口中心 Z
mod_d  = op_y + (out_top/2)*az + 14;      // 前向总深
mod_h  = op_z + (out_top/2)*ay + 14;      // 总高

// 斜置圆台(从局部原点沿杯轴伸出)
module frustum(d1, d2, len) {
    rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2);
}

floor_top = base_z + floor_t;            // 杯内平底高度(花盆坐此, =32)

// ---- 实体 ----------------------------------------------------------
module body() {
    union() {
        cube([mod_w, panel_t, mod_h]);                       // 背板
        cube([mod_w, mod_d, res_h]);                         // 储水盒(实块, 后掏)
        translate([0, mod_d - wall, res_h]) cube([mod_w, wall, res_lip]); // 储水盒前唇
        // 杯外管: 把倾斜窄端**平切**坐在储水盒顶(裁掉下垂的尖, 避免和水盒纠缠)
        intersection() {
            translate([cx, base_y, base_z]) frustum(out_bot, out_top, cup_len);
            translate([-1, -1, base_z - 2]) cube([mod_w + 2, mod_d + 300, mod_h + 300]);
        }
    }
}

module unit() {
    difference() {
        union() {
            difference() {
                body();

                // 1) 杯内腔: **平底**(z>=floor_top), 花盆坐平底上, 内腔一路通顶不挡盆
                intersection() {
                    translate([cx, base_y, base_z]) frustum(in_bot, in_top, cup_len + mouth_ext);
                    translate([-1, -1, floor_top]) cube([mod_w + 2, mod_d + 400, mod_h + 400]);
                }

                // 2) 储水盒内腔(封闭盒: 留四壁+盒底+盒盖; 杯已平底裁切, 盒盖在杯底下方不挡盆)
                translate([wall, panel_t, wall])
                    cube([mod_w - 2*wall, mod_d - panel_t - wall, res_h - 2*wall]);

                // 3) 杯底排水孔: 杯内底 -> 储水盒腔(兼给储水盒透气, 故全局 Volumes=2)
                translate([cx, base_y + 6, wall + 1])
                    cylinder(h = res_h + floor_t + 6, d = drain_d);

                // 4) 透气孔(背板下部水平穿入杯体后下根区)
                for (k = [0 : vent_n-1])
                    translate([cx - 22 + k*44, -0.5, res_h + 12])
                        rotate([-90, 0, 0]) cylinder(h = panel_t + 30, d = vent_d);

                // 5) 背板顶部半圆缺口
                translate([cx, panel_t/2, mod_h]) rotate([0,90,0])
                    cylinder(h = mod_w, d = 26, center=true);

                // 6) 上下堆叠: 顶面定位孔(背板顶)
                for (sx = [mod_w*0.22, mod_w*0.78])
                    translate([sx, panel_t/2, mod_h - 9]) cylinder(h = 10, d = peg_d + peg_clear);

                // 7) 左右横拼: 左侧面定位孔(背板厚度内)
                for (sz = [res_h*0.5, mod_h*0.55])
                    translate([-0.5, panel_t/2, sz])
                        rotate([0,90,0]) cylinder(h = tile_h + 1, d = tile_peg_d + peg_clear);
            }

            // 8) 溢流标管(储水盒内, 顶=水位)
            translate([cx, mod_d*0.55, wall - 0.01])
                cylinder(h = water_h, d = overflow_d + 2*wall);

            // 9) 上下堆叠: 底面定位销
            for (sx = [mod_w*0.22, mod_w*0.78])
                translate([sx, panel_t/2, -7]) cylinder(h = 8, d = peg_d);

            // 10) 左右横拼: 右侧面定位销
            for (sz = [res_h*0.5, mod_h*0.55])
                translate([mod_w - 0.01, panel_t/2, sz])
                    rotate([0,90,0]) cylinder(h = tile_h, d = tile_peg_d);
        }

        // 11) 标管内孔贯穿到底(储水盒 -> 下层; 底层塞橡胶塞)
        translate([cx, mod_d*0.55, -0.5])
            cylinder(h = water_h + wall + 1, d = overflow_d);
    }
}

unit();
echo(str("单元 W x D x H = ", mod_w, " x ", mod_d, " x ", mod_h, " mm  (需 ≤240)"));
echo(str("储水盒: 高 ", res_h, " 水位 ", water_h, " 前唇 ", res_lip));
