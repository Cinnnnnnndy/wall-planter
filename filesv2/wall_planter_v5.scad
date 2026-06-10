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

/* [长方体箱 + 花盆后伸] */
box_d     = 66;      // 箱体深度(向前缩减; 花盆盆底从后面伸出一部分)
pot_back  = 18;      // 盆底盘(外)伸出箱背 Y=0 的量(0=不伸出/平背)
back_t    = 6;       // 背板带厚(透气孔/堆叠定位参考)
side_gap  = 12;      // 锥盆两侧到箱边距
res_h     = 18;      // 储水区净高(需 > 水位+进水缝+帽厚, 给防虹吸帽留空间)

/* [灌溉/孔] */
drain_d   = 8;       // 盆底排水孔(盆腔最低点 -> 储水区)
overflow_d= 12;      // 溢流标管内径(->下层, 底层塞橡胶塞)
water_h   = 10;      // 储水水位(标管高, < res_h - 进水缝 - 帽厚)
vent_d    = 6;       // 背面透气孔
vent_n    = 3;

/* [逐层淌水: 前伸导流嘴] 把溢流从前壁导到下层盆口正上方 */
spout_id    = 8;     // 导流道内径
spout_extra = 14;    // 滴水点伸进下层盆口后缘之内的量
drip_out_d  = 7;     // 嘴端向下滴孔径(底层塞此孔)

/* [盆口挡土唇 / 滴水线] */
lip_w    = 6;        // 挡土唇外翻半径增量(开口处外法兰, 不缩小通孔, 不挡插盆)
lip_t    = 4;        // 唇厚(沿轴)
drip_w   = 1.6;      // 滴水槽环宽
drip_d2  = 2.2;      // 滴水槽深(法兰下缘断流, 水滴落不回爬)

/* [储水盒防虹吸] */
siphon_gap = 3;      // 标管顶 ↔ 防虹吸帽 进水缝高(进气断虹吸)
cap_t      = 2.5;    // 帽厚
cap_on     = true;

/* [堆叠/横拼定位] */
peg_d     = 8;       // 上下堆叠销径
peg_clear = 0.3;
peg_taper = 2.4;     // 销顶缩径(锥销, 自对中易插)
tile_peg_d= 7;       // 左右横拼销径
tile_h    = 6;       // 横拼销长

dev      = true;
show_pot = false;    // true: 叠加半透明真花盆, 检查能否插到底(不导出)
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;       // 内腔底径(与盆底同心+间隙)
in_top  = pot_top_d + 2*fit_clear;       // 内腔口径
out_bot = in_bot + 2*wall;               // 盆底端外径(座处管外径)
out_top = in_top + 2*wall;               // 开口端外径(用于尺寸/侧距)
ay = cos(tilt); az = sin(tilt);          // 盆轴方向 (0, ay, az)
rate = (pot_top_d - pot_bot_d) / pot_height;  // 花盆锥度 (dia/轴长)
r_in = in_bot/2;
r_out= out_bot/2;

// 盆底盘(窄端 s=0, 座面在 s=floor_t)中心:
//  - Y: 由"盆底外缘伸出箱背 pot_back"反推 (允许锥盆从后面穿出)
//  - z: 盆腔最低点 = wall+res_h+floor_t, 其下做封闭储水区
p0y    = r_out*az - floor_t*ay - pot_back;
p0z    = wall + res_h + floor_t*(1-az) + r_in*ay;

drip_y = p0y + floor_t*ay + r_in*az;     // 盆腔最低点(排水点) Y(应落在箱内)
drip_z = p0z + floor_t*az - r_in*ay;     // 盆腔最低点 z (= wall+res_h+floor_t)
back_y = p0y + floor_t*ay - r_out*az;    // 盆底(外)最后缘 Y (= -pot_back, 伸出箱背)

cup_len2  = floor_t + pot_height + mouth_ext;        // 外锥总轴长
seat_top  = floor_t + pot_height;                    // 盆口处轴向位置(自 p0)
od0 = (in_bot - rate*floor_t) + 2*wall;              // 外锥 s=0 处外径
od1 = (in_top + rate*mouth_ext) + 2*wall;            // 外锥 s=cup_len2 处外径

op_y   = p0y + seat_top*ay;              // 盆口中心 Y
op_z   = p0z + seat_top*az;              // 盆口中心 Z

mod_w  = out_top + 2*side_gap;           // 箱宽
cx     = mod_w/2;

front_y= op_y + (out_top/2)*az;          // 盆口(外)最前缘 Y
mod_d  = front_y + 8;                     // 前向总深(以盆口前缘计)
tot_d  = mod_d - back_y;                  // 真实进深(含后伸 stub), 供尺寸核对

// 箱顶高于花盆最高点 -> 盆上沿低于箱体高度(堆叠时箱顶平整不顶盆)
apex_mouth = p0z + cup_len2*az + (od1/2)*ay;       // 盆口外伸管顶
apex_lip   = op_z + ((out_top + 2*lip_w)/2)*ay;    // 挡土唇顶
top_margin = 8;
mod_h  = max(apex_mouth, apex_lip) + top_margin;    // 总高

vent_z = p0z + 8;                        // 背面透气孔高度(盆根上沿区)

// 前伸导流嘴: 标管移到储水盒前壁, 溢流经前壁→导流臂→嘴端向下滴入"下层盆口"
sp_od  = overflow_d + 2*wall;            // 标管外径
sp_y   = box_d - wall - sp_od/2 + 1;     // 标管中心 Y(并入前壁)
ch_z   = wall + spout_id/2 + 0.5;        // 导流道中心高
ch_top = ch_z + spout_id/2 + wall;       // 导流臂顶高
op_back_rim = op_y - (out_top/2)*az;     // 下层盆口(外)后缘 Y(对齐目标)
spout_y = op_back_rim + spout_extra;     // 嘴端滴水点 Y(伸进下层盆口内)
spout_od= spout_id + 2*wall;             // 导流臂外径

// 上下堆叠销位: **非对称** -> 防呆(转 180° 错叠对不上孔)
peg_xs = [mod_w*0.27, mod_w*0.70];
peg_y  = back_t/2 + 1;                    // 销/孔落在背板带内

// 斜置圆台: 从局部原点沿盆轴(+Y上翘)伸出
module frustum(d1, d2, len) {
    rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2);
}

// 沿盆轴方向平移(把"座厚"沿轴让出, 留垂直于轴的平底座)
module along(d) { translate([0, d*ay, d*az]) children(); }

// 仅沿 Z>=0 平切(底面齐平); Y 方向不切 -> 允许锥盆从背面 Y<0 穿出
module clip_box() {
    intersection() {
        children();
        translate([-1, -300, 0]) cube([mod_w + 2, mod_d + 600, mod_h + 400]);
    }
}

// 可拆真花盆(用于 show_pot 自检): 底坐在座上, 沿轴伸出
module pot_real() {
    translate([cx, p0y, p0z]) along(floor_t) frustum(pot_bot_d, pot_top_d, pot_height);
}

// ---- 外形实体: 长方体 ∪ 穿插斜锥(背/底平切) ∪ 盆口挡土唇 ---------------
module outer() {
    union() {
        cube([mod_w, box_d, mod_h]);                         // 长方体脊柱箱
        clip_box()
            translate([cx, p0y, p0z]) frustum(od0, od1, cup_len2);
        // 盆口挡土唇: 开口处外翻法兰(增大外径, 通孔不变 -> 不挡插盆, 挡土/导滴)
        translate([cx, p0y, p0z]) along(seat_top)
            frustum(out_top + 2*lip_w, out_top + 2*lip_w, lip_t);
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
                    frustum(in_top, in_top + rate*(mouth_ext + lip_t), mouth_ext + lip_t + 0.1);

                // 1b) 滴水线: 挡土唇外柱面一圈环槽(切到法兰外径之外, 明确向外开口),
                //     水沿唇外缘到此处断流滴落, 不沿底面回爬到箱体。
                translate([cx, p0y, p0z]) along(seat_top + lip_t - drip_w - 0.6)
                    difference() {
                        frustum(out_top + 2*lip_w + 6, out_top + 2*lip_w + 6, drip_w);
                        frustum(out_top + 2*lip_w - 2*drip_d2, out_top + 2*lip_w - 2*drip_d2, 3*drip_w);
                    }

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

                // 6) 上下堆叠: 顶面定位孔(背板带内, 非对称防呆; 顶口扩成锥孔便于导入)
                for (sx = peg_xs)
                    translate([sx, peg_y, mod_h - 9])
                        cylinder(h = 10.1, d1 = peg_d + peg_clear, d2 = peg_d + peg_clear + 1.6);

                // 7) 左右横拼: 左侧面定位孔(背板厚度内)
                for (sz = [res_h, mod_h*0.62])
                    translate([-0.5, back_t/2 + 1, sz])
                        rotate([0, 90, 0]) cylinder(h = tile_h + 1, d = tile_peg_d + peg_clear);
            }

            // 8) 溢流标管(并入储水盒前壁) + 防虹吸帽 + 前伸导流嘴
            translate([cx, sp_y, wall - 0.01]) {
                cylinder(h = water_h, d = sp_od);                              // 标管
                if (cap_on) {
                    for (a = [0:120:359])                                      // 3 立柱(留侧缝)
                        rotate([0, 0, a]) translate([sp_od/2 - 1.2, -1.5, water_h - 0.01])
                            cube([2.4, 3, siphon_gap + 0.02]);
                    translate([0, 0, water_h + siphon_gap])                    // 防虹吸帽
                        cylinder(h = cap_t, d = sp_od + 6);
                }
            }
            // 导流臂(实体): 从标管前壁前伸到下层盆口上方(内部水道后面挖)
            hull() {
                translate([cx, sp_y,    0]) cylinder(h = ch_top, d = sp_od);
                translate([cx, spout_y, 0]) cylinder(h = ch_top, d = spout_od);
            }

            // 9) 上下堆叠: 底面定位**锥销**(顶缩径, 自对中; 非对称防呆)
            for (sx = peg_xs)
                translate([sx, peg_y, -7])
                    cylinder(h = 8, d1 = peg_d, d2 = peg_d - peg_taper);

            // 10) 左右横拼: 右侧面定位销
            for (sz = [res_h, mod_h*0.62])
                translate([mod_w - 0.01, back_t/2 + 1, sz])
                    rotate([0, 90, 0]) cylinder(h = tile_h, d = tile_peg_d);
        }

        // 11) 溢流水路: 标管竖孔(顶=水位) -> 前伸水道 -> 嘴端向下滴孔
        //     直叠时嘴端正对"下层盆口", 水滴进下层花盆; 底层塞嘴端滴孔。
        translate([cx, sp_y, ch_z - 0.01])
            cylinder(h = water_h + wall, d = overflow_d);                      // 标管竖孔
        translate([cx, sp_y, ch_z]) rotate([-90, 0, 0])
            cylinder(h = spout_y - sp_y + 0.1, d = spout_id);                  // 前伸水道
        translate([cx, spout_y, -0.5])
            cylinder(h = ch_z + spout_id/2 + 1, d = drip_out_d);              // 嘴端向下滴孔
    }
}

unit();
if (show_pot) %pot_real();

// ---- 尺寸 / 配合 自检(对标拓竹P2S ≤240, 可拆盆 148/Ø131.2/Ø93.2) ----
echo(str("单元 W x H = ", mod_w, " x ", mod_h, "  | 箱深 box_d=", box_d,
         "  盆底后伸 pot_back=", pot_back, "  真实进深 tot_d=", tot_d, " mm"));
echo(str("各轴 ≤240 ? W=", mod_w<=240, " H=", mod_h<=240, " 真实进深=", tot_d<=240));
echo(str("盆底外缘后伸到 Y=", back_y, " (负=伸出箱背); 排水点 Y=", drip_y,
         " <箱深-壁 ", box_d-wall, " ? ", drip_y < box_d-wall));
echo(str("盆径向单边间隙: 底=", (in_bot-pot_bot_d)/2, " 口=", (in_top-pot_top_d)/2, " mm"));
echo(str("盆腔最低点 z=", drip_z, "  储水区高=", res_h, " 水位=", water_h));
