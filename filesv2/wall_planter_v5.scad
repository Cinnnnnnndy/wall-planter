// =====================================================================
//  墙面种植单元 v5 — 薄长方体(竖直满高) × 斜置锥盆「形体穿插」
//  形态: 一个薄的竖直长方体当脊柱/箱体, 斜锥盆从它前面穿出悬伸;
//        长方体下部=储水/逐层下渗, 上部=与上层堆叠连接, 背面=透气孔。
//  对标剖面: 不是「平板+花盆相交」, 而是「薄箱体+斜盆穿插」。
//  拓竹P2S: 单元三维 ≤240mm | 仅堆叠 | 逐层淌水 | 可拆锥形盆
//  打印朝向建议: 背面朝下平躺, 盆口朝上, 基本免支撑。
// =====================================================================

/* [可拆花盆外形 -> 内腔按此+间隙] */
pot_top_d = 131.2;   // 盆上口外径
pot_bot_d = 93.2;    // 盆底外径
pot_height= 148;     // 盆高
fit_clear = 1.5;     // 单边间隙

/* [斜盆/壁] */
tilt      = 40;      // 盆轴高于水平的角度(越大盆口越朝上)
wall      = 3.0;     // 盆壁/箱壁厚
floor_t   = 6;       // 盆底厚(承可拆盆)
mouth_ext = 16;      // 盆口端外伸(确保口完整张开)

/* [薄长方体箱] */
box_d     = 48;      // 箱体深度(薄! 长方体的"薄"方向)
back_t    = 6;       // 背板厚(内腔后界, 留完整背面只开透气孔)
side_gap  = 12;      // 锥盆两侧到箱边距
res_h     = 32;      // 储水区高(箱体下部)

/* [灌溉/孔] */
drain_d   = 8;       // 盆底排水孔(->储水区)
overflow_d= 12;      // 溢流标管内径(->下层, 底层塞橡胶塞)
water_h   = 18;      // 储水水位(标管高, < res_h-2*wall)
vent_d    = 6;       // 背面透气孔
vent_n    = 3;

/* [堆叠/横拼定位] */
peg_d     = 8;       // 上下堆叠销径
peg_clear = 0.3;
tile_peg_d= 7;       // 左右横拼销径
tile_h    = 6;       // 横拼销长

dev = true;
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;       // 内腔底径
in_top  = pot_top_d + 2*fit_clear;       // 内腔口径
out_bot = in_bot + 2*wall;               // 外锥底径
out_top = in_top + 2*wall;               // 外锥口径
cup_len = pot_height + 6;                // 外锥长
ay = cos(tilt); az = sin(tilt);          // 盆轴方向 (0, ay, az)

mod_w  = out_top + 2*side_gap;           // 箱宽
cx     = mod_w/2;

// 窄端(盆底)中心: 贴近背面、落在储水区顶
p0y    = wall;                           // 近背面(背面外溢部分按 Y>=0 平切)
p0z    = res_h;                          // 坐在储水区顶

op_y   = p0y + cup_len*ay;               // 盆口中心 Y
op_z   = p0z + cup_len*az;               // 盆口中心 Z

mod_d  = op_y + (out_top/2)*az + 10;     // 前向总深(含悬伸)
mod_h  = op_z + (out_top/2)*ay + 12;     // 总高

floor_z = p0z + floor_t;                 // 盆内水平底高度(可拆盆坐此)
vent_z  = res_h + 30;                     // 背面透气孔高度(盆根上沿区)

// 斜置圆台: 从局部原点沿盆轴(+Y上翘)伸出
module frustum(d1, d2, len) {
    rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2);
}

// 把 children 沿 Y>=0 与 Z>=0 平切(背面/底面与箱体齐平, 不外溢)
module clip_box() {
    intersection() {
        children();
        translate([-1, 0, 0]) cube([mod_w + 2, mod_d + 400, mod_h + 400]);
    }
}

// ---- 外形实体: 薄长方体 ∪ 穿插的斜锥(背/底平切) ----------------------
module outer() {
    union() {
        cube([mod_w, box_d, mod_h]);                         // 薄长方体(脊柱箱)
        clip_box()
            translate([cx, p0y, p0z]) frustum(out_bot, out_top, cup_len);
    }
}

module unit() {
    difference() {
        union() {
            difference() {
                outer();

                // 1) 盆内腔: 斜锥掏空, 上端外伸开口; 后界留 back_t 完整背板, 下界 floor_z 留平底
                intersection() {
                    translate([cx, p0y, p0z]) frustum(in_bot, in_top, cup_len + mouth_ext);
                    translate([-1, back_t, floor_z]) cube([mod_w + 2, mod_d + 400, mod_h + 400]);
                }

                // 2) 储水区内腔(箱体下部封闭盒: 留四壁+底+顶盖)
                translate([wall, wall, wall])
                    cube([mod_w - 2*wall, box_d - 2*wall, res_h - 2*wall]);

                // 3) 盆底排水孔: 盆内平底最低处 -> 储水区
                translate([cx, p0y + 5, wall + 1])
                    cylinder(h = floor_z, d = drain_d);

                // 4) 背面透气孔(箱体上部, 盆根上沿一圈, 穿背板进盆腔给根透气)
                for (k = [0 : vent_n-1])
                    translate([cx + (k - (vent_n-1)/2)*32, -0.5, vent_z])
                        rotate([-90, 0, 0]) cylinder(h = box_d + 1, d = vent_d);

                // 5) 箱体顶后沿半圆缺口(给上层水路/透气让位)
                translate([cx, box_d/2, mod_h]) rotate([0, 90, 0])
                    cylinder(h = mod_w + 2, d = 26, center = true);

                // 6) 上下堆叠: 顶面定位孔
                for (sx = [mod_w*0.22, mod_w*0.78])
                    translate([sx, box_d/2, mod_h - 9]) cylinder(h = 10, d = peg_d + peg_clear);

                // 7) 左右横拼: 左侧面定位孔(箱体厚度内)
                for (sz = [res_h*0.5, mod_h*0.6])
                    translate([-0.5, box_d/2, sz])
                        rotate([0, 90, 0]) cylinder(h = tile_h + 1, d = tile_peg_d + peg_clear);
            }

            // 8) 溢流标管(储水区内, 顶=水位)
            translate([cx, box_d*0.5, wall - 0.01])
                cylinder(h = water_h, d = overflow_d + 2*wall);

            // 9) 上下堆叠: 底面定位销
            for (sx = [mod_w*0.22, mod_w*0.78])
                translate([sx, box_d/2, -7]) cylinder(h = 8, d = peg_d);

            // 10) 左右横拼: 右侧面定位销
            for (sz = [res_h*0.5, mod_h*0.6])
                translate([mod_w - 0.01, box_d/2, sz])
                    rotate([0, 90, 0]) cylinder(h = tile_h, d = tile_peg_d);
        }

        // 11) 标管内孔贯穿到底(储水区 -> 下层; 底层塞橡胶塞)
        translate([cx, box_d*0.5, -0.5])
            cylinder(h = water_h + wall + 1, d = overflow_d);
    }
}

unit();

// ---- 尺寸 / 配合 自检(对标拓竹P2S ≤240, 可拆盆 148/Ø131.2/Ø93.2) ----
echo(str("单元 W x D x H = ", mod_w, " x ", mod_d, " x ", mod_h, " mm"));
echo(str("各轴 ≤240 ? W=", mod_w<=240, " D=", mod_d<=240, " H=", mod_h<=240,
         "  (P2S 有效256, 留余量)"));
echo(str("盆径向单边间隙: 底=", (in_bot-pot_bot_d)/2, " 口=", (in_top-pot_top_d)/2, " mm"));
echo(str("腔轴向长 cup_len=", cup_len, " mm  vs 盆高=", pot_height,
         " -> 余量 ", cup_len-pot_height, " mm(盆口微缩进)"));
echo(str("储水区: 高 res_h=", res_h, "  水位 water_h=", water_h,
         "  溢流余量 ", res_h-2*wall-water_h, " mm  (>0 OK)"));
echo(str("背板厚 back_t=", back_t, "  箱体深 box_d=", box_d, "  透气孔高 vent_z=", vent_z));
