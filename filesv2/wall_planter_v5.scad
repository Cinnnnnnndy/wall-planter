// =====================================================================
//  墙面种植单元 v5 — 薄长方体(竖直)× 斜置锥盆「形体穿插」
//  形态: 竖直长方体当脊柱/箱体, 斜锥盆从它前面穿出悬伸;
//        箱体下部=储水/逐层下渗, 上部=与上层堆叠连接, 背面=平整背板+透气孔。
//  关键修订: 盆腔是**完整斜圆锥座**(沿轴往后下方到底, 不被平面截断),
//            可拆锥盆能整支沿轴插到底; 箱体下部加深以兜住盆底下缘并在其下做储水。
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
floor_t   = 6;       // 盆底厚(承可拆盆, 沿轴方向的座厚)
mouth_ext = 16;      // 盆口端外伸(确保口完整张开)

/* [薄长方体箱] */
back_t    = 6;       // 背板厚(盆腔后界, 留完整背面只开透气孔)
side_gap  = 12;      // 锥盆两侧到箱边距
res_h     = 14;      // 储水区净高(箱体下部, 在盆底下缘之下)

/* [灌溉/孔] */
drain_d   = 8;       // 盆底排水孔(盆腔最低点 -> 储水区)
overflow_d= 12;      // 溢流标管内径(->下层, 底层塞橡胶塞)
water_h   = 9;       // 储水水位(标管高, < res_h)
vent_d    = 6;       // 背面透气孔
vent_n    = 3;

/* [堆叠/横拼定位] */
peg_d     = 8;       // 上下堆叠销径
peg_clear = 0.3;
tile_peg_d= 7;       // 左右横拼销径
tile_h    = 6;       // 横拼销长

dev      = true;
show_pot = false;    // true: 叠加半透明真花盆, 检查能否插到底(不导出)
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;       // 内腔底径(与盆底同心+间隙)
in_top  = pot_top_d + 2*fit_clear;       // 内腔口径
out_top = in_top + 2*wall;               // 开口端外径(用于尺寸/侧距)
ay = cos(tilt); az = sin(tilt);          // 盆轴方向 (0, ay, az)
rate = (pot_top_d - pot_bot_d) / pot_height;  // 花盆锥度 (dia/轴长)
r_in = in_bot/2;

// 盆底盘(窄端 s=0, 实际座面在 s=floor_t)中心位置:
//  - 背面: 盆腔后缘留 back_t 完整平背板
//  - 底部: 盆腔最低点 ~ (wall+res_h+floor_t), 其下做封闭储水区
p0y    = back_t + r_in*az;
p0z    = wall + res_h + floor_t*(1-az) + r_in*ay;

drip_y = p0y + floor_t*ay + r_in*az;     // 盆腔最低点(座面底盘 +Y 下缘)Y
drip_z = p0z + floor_t*az - r_in*ay;     // 盆腔最低点 z (= wall+res_h+floor_t)
box_d  = ceil(drip_y + wall + 5);        // 箱深: 兜住盆底下缘, 储水区在其正下方

mod_w  = out_top + 2*side_gap;           // 箱宽
cx     = mod_w/2;

cup_len2  = floor_t + pot_height + mouth_ext;        // 外锥总轴长
seat_top  = floor_t + pot_height;                    // 盆口处轴向位置(自 p0)
od0 = (in_bot - rate*floor_t) + 2*wall;              // 外锥 s=0 处外径
od1 = (in_top + rate*mouth_ext) + 2*wall;            // 外锥 s=cup_len2 处外径

op_y   = p0y + seat_top*ay;              // 盆口中心 Y
op_z   = p0z + seat_top*az;              // 盆口中心 Z
mod_d  = op_y + (out_top/2)*az + 8;      // 前向总深(含悬伸)
mod_h  = op_z + (out_top/2)*ay + 6;      // 总高

vent_z = p0z + 8;                        // 背面透气孔高度(盆根上沿区)

// 斜置圆台: 从局部原点沿盆轴(+Y上翘)伸出
module frustum(d1, d2, len) {
    rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2);
}

// 沿盆轴方向平移(把"座厚"沿轴让出, 留垂直于轴的平底座)
module along(d) { translate([0, d*ay, d*az]) children(); }

// 把 children 沿 Y>=0 与 Z>=0 平切(背/底与箱体齐平, 不外溢)
module clip_box() {
    intersection() {
        children();
        translate([-1, 0, 0]) cube([mod_w + 2, mod_d + 400, mod_h + 400]);
    }
}

// 可拆真花盆(用于 show_pot 自检): 底坐在座上, 沿轴伸出
module pot_real() {
    translate([cx, p0y, p0z]) along(floor_t) frustum(pot_bot_d, pot_top_d, pot_height);
}

// ---- 外形实体: 薄长方体 ∪ 穿插的斜锥(背/底平切) ----------------------
module outer() {
    union() {
        cube([mod_w, box_d, mod_h]);                         // 长方体脊柱箱
        clip_box()
            translate([cx, p0y, p0z]) frustum(od0, od1, cup_len2);
    }
}

module unit() {
    difference() {
        union() {
            difference() {
                outer();

                // 1) 盆内腔 = 完整斜圆锥座, 与花盆**同锥度**、均匀 1.5mm 间隙:
                //    主腔轴向长 = 盆高(座面起), 之上单独续接盆口外伸。NO 平面截断。
                translate([cx, p0y, p0z]) along(floor_t)
                    frustum(in_bot, in_top, pot_height);
                translate([cx, p0y, p0z]) along(seat_top)
                    frustum(in_top, in_top + rate*mouth_ext, mouth_ext + 0.1);

                // 2) 储水区内腔(箱体下部封闭盒: 留四壁+底+顶盖), 在盆底下缘之下
                translate([wall, wall, wall])
                    cube([mod_w - 2*wall, box_d - 2*wall, res_h]);

                // 3) 盆底排水孔: 盆腔最低点(drip_y) -> 储水区
                translate([cx, drip_y, wall + 1])
                    cylinder(h = drip_z, d = drain_d);

                // 4) 背面透气孔(盆根上沿一圈, 穿背板进盆腔给根透气)
                for (k = [0 : vent_n-1])
                    translate([cx + (k - (vent_n-1)/2)*32, -0.5, vent_z])
                        rotate([-90, 0, 0]) cylinder(h = box_d + 1, d = vent_d);

                // 5) 箱体顶后沿半圆缺口(给上层水路/透气让位)
                translate([cx, back_t/2 + 1, mod_h]) rotate([0, 90, 0])
                    cylinder(h = mod_w + 2, d = 26, center = true);

                // 6) 上下堆叠: 顶面定位孔(背板带内)
                for (sx = [mod_w*0.22, mod_w*0.78])
                    translate([sx, back_t/2 + 1, mod_h - 9]) cylinder(h = 10, d = peg_d + peg_clear);

                // 7) 左右横拼: 左侧面定位孔(背板厚度内)
                for (sz = [res_h, mod_h*0.62])
                    translate([-0.5, back_t/2 + 1, sz])
                        rotate([0, 90, 0]) cylinder(h = tile_h + 1, d = tile_peg_d + peg_clear);
            }

            // 8) 溢流标管(储水区内, 顶=水位)
            translate([cx, box_d*0.5, wall - 0.01])
                cylinder(h = water_h, d = overflow_d + 2*wall);

            // 9) 上下堆叠: 底面定位销
            for (sx = [mod_w*0.22, mod_w*0.78])
                translate([sx, back_t/2 + 1, -7]) cylinder(h = 8, d = peg_d);

            // 10) 左右横拼: 右侧面定位销
            for (sz = [res_h, mod_h*0.62])
                translate([mod_w - 0.01, back_t/2 + 1, sz])
                    rotate([0, 90, 0]) cylinder(h = tile_h, d = tile_peg_d);
        }

        // 11) 标管内孔贯穿到底(储水区 -> 下层; 底层塞橡胶塞)
        translate([cx, box_d*0.5, -0.5])
            cylinder(h = water_h + wall + 1, d = overflow_d);
    }
}

unit();
if (show_pot) %pot_real();

// ---- 尺寸 / 配合 自检(对标拓竹P2S ≤240, 可拆盆 148/Ø131.2/Ø93.2) ----
echo(str("单元 W x D x H = ", mod_w, " x ", mod_d, " x ", mod_h, " mm"));
echo(str("各轴 ≤240 ? W=", mod_w<=240, " D=", mod_d<=240, " H=", mod_h<=240));
echo(str("箱深 box_d=", box_d, "  背板 back_t=", back_t, "  盆腔后缘留壁=", p0y-r_in*az, " mm"));
echo(str("盆径向单边间隙: 底=", (in_bot-pot_bot_d)/2, " 口=", (in_top-pot_top_d)/2, " mm"));
echo(str("主腔轴向=盆高 ", pot_height, " mm + 口外伸 ", mouth_ext, " mm  (同锥度, 均匀间隙)"));
echo(str("盆腔最低点 (Y=", drip_y, ", z=", drip_z, ")  储水区高=", res_h, " 水位=", water_h));
