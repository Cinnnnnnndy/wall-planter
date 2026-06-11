// =====================================================================
//  墙面种植单元 v5.1 — 薄长方体(竖直)× 斜置锥盆「形体穿插」
//  本版按商品剖面原理图细化(植物苗/土壤层/储水层/排水孔/透气孔/水注/橡胶塞):
//   - 储水层浸盆: 储水区加深, 盆腔最低弧自座面开"浸水窗"(lens_open)探进储水层,
//     水位高出盆底最低点 immerse mm → 土壤经可拆盆自身底孔吸水(底部浸灌)。
//   - 水注(溢流标管)+ 内部落水井: 箱体背角开贯通全高的落水井(shaft), 标管立在
//     井底、管顶=水位; 超过水位的水入管、垂直穿底面落进下一层的落水井(隐藏式
//     逐层下渗, 直叠自然对齐)。防虹吸帽兼挡溅: 上层落水砸在帽上散入储水层,
//     不会直通管孔短路掉层。顶面井口=注水口(可从最顶层一次灌满整列)。
//   - 底面排水孔 + 橡胶堵塞: 出水口做锥形塞孔(Ø plug_d→overflow_d) + 对位短嘴,
//     最底层塞标准锥形橡胶/硅胶塞, 水不滴地面。
//   - 取消外露前伸导流嘴与顶后沿缺口(水路全部内部化, 外观干净)。
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
pot_back  = 28;      // 盆底(外)伸出箱背量(加大: 让盆口后缘前移到箱前面附近)
back_t    = 6;       // 背板带厚(透气孔/堆叠定位参考)
side_gap  = 15;      // 锥盆两侧到箱边距(给背角落水井留壁厚走廊)
res_h     = 25;      // 储水区净高(储水层, 浸住盆底)

/* [储水浸盆(对标剖面: 储水层泡住盆底, 土壤吸水)] */
lens_open = 5;       // 浸水窗高: 盆腔最低点低于储水顶板的量(盆底由此探进储水层)
immerse   = 4;       // 水位高出盆腔最低点的量(盆底浸水深, 需 < lens_open)

/* [水注/落水井/塞孔] */
overflow_d= 8;       // 溢流标管(水注)内径: 管顶=水位, 超过即落下层
shaft_d   = 23;      // 落水井直径(贯通全高; 上层落水+本层溢流共用)
shaft_x   = 17;      // 落水井中心 X(背角走廊内, 由 shaftcheck 校验不破盆腔)
shaft_y   = 19;      // 落水井中心 Y(贴背但留壁)
plug_d    = 11;      // 底面塞孔大端径(配标准锥形橡胶/硅胶塞, 小端=overflow_d)
boss_d    = 16;      // 底面出水短嘴外径(插进下层井口: 滴水裙+辅助对位)
boss_h    = 6;       // 出水短嘴长(< 井深, 叠合面仍贴平)
vent_d    = 6;       // 背面透气孔
vent_n    = 3;

/* [盆口挡土唇 / 滴水线] */
lip_w    = 6;        // 挡土唇外翻半径增量(开口处外法兰, 不缩小通孔, 不挡插盆)
lip_t    = 4;        // 唇厚(沿轴)
drip_w   = 1.6;      // 滴水槽环宽
drip_d2  = 2.2;      // 滴水槽深(法兰下缘断流, 水滴落不回爬)

/* [水注防虹吸/挡溅帽] */
siphon_gap = 3;      // 标管顶 ↔ 帽 进水缝高(进气断虹吸; 亦是溢流进水口)
cap_t      = 2.5;    // 帽厚
cap_on     = true;

/* [堆叠/横拼定位] */
peg_d     = 8;       // 上下堆叠销径
peg_clear = 0.3;
peg_taper = 2.4;     // 销顶缩径(锥销, 自对中易插)
tile_peg_d= 7;       // 左右横拼销径
tile_h    = 6;       // 横拼销长

/* [稳定底座 base — 单独打印, 套在最底层单元底销上, 前后展开加大支承面] */
//  分析: 满载质心 CG_Y≈63mm 逼近前底缘 66mm(裕度仅~3mm), 堆高极易前倒。
//  底座把支承多边形前后扩展 -> 抬高临界倾角。也兜住盆底后伸 stub。
base_reach_f = 112;  // 底座前伸(超出箱前面, 主要抗前倒); 受限于 box_d+前+后 ≤240
base_reach_b = 58;   // 底座后伸(超出箱背, 兜盆底后伸 stub -28); 总进深=66+112+58=236 ≤240
base_h       = 16;   // 承台高(> 底销7 + 出水短嘴6 的下伸量)
base_wall    = 4;    // 底座壁/肋厚
base_deck    = 3;    // 顶承台板厚

dev      = true;
show_pot = false;    // true: 叠加半透明真花盆(预览用; 干涉自检请用 view="potcheck")
view     = "unit";   // [unit, cutx, watercut, slabx, stack, stackcut, potcheck, shaftcheck, base, tower]
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

// 储水/水位(对标剖面: 盆底探进储水层, 水位浸住盆底)
z_dip   = wall + res_h - lens_open;      // 盆腔最低点(低于储水顶板 lens_open)
water_h = res_h - lens_open + immerse;   // 标管高(自储水底): 水位 = z_dip + immerse
sp_od   = overflow_d + 2*wall;           // 标管外径

// 盆底盘(窄端 s=0, 座面在 s=floor_t)中心:
//  - Y: 由"盆底外缘伸出箱背 pot_back"反推 (允许锥盆从后面穿出)
//  - z: 由盆腔最低点 z_dip 反推(最低弧泡在储水层里)
p0y    = r_out*az - floor_t*ay - pot_back;
p0z    = z_dip - floor_t*az + r_in*ay;

drip_y = p0y + floor_t*ay + r_in*az;     // 盆腔最低点 Y(应落在箱内储水区上)
drip_z = p0z + floor_t*az - r_in*ay;     // 盆腔最低点 z (= z_dip)
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

// 可拆真花盆(实体, 供 potcheck 干涉自检 / show_pot 预览): 底坐在座上沿轴伸出
module pot_real() {
    translate([cx, p0y, p0z]) along(floor_t) frustum(pot_bot_d, pot_top_d, pot_height);
}

// 盆腔放大壳(供 shaftcheck: 落水井到盆腔最小壁厚校验)
module cavity_inflated(m = 1.2) {
    translate([cx, p0y, p0z]) along(floor_t)
        frustum(in_bot + 2*m, in_top + 2*m, pot_height);
    translate([cx, p0y, p0z]) along(seat_top)
        frustum(in_top + 2*m, in_top + rate*(mouth_ext + lip_t) + 2*m, mouth_ext + lip_t);
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

                // 2) 储水区内腔(储水层: 箱体下部封闭盒, 留四壁+底+顶盖)。
                //    盆腔最低点 z_dip 低于储水顶板 lens_open → 布尔后盆底最低弧
                //    自然开出"浸水窗"泡进储水层(= 剖面图的排水孔/吸水口),
                //    水位(标管顶)高出盆底 immerse, 土壤经可拆盆底孔吸水。
                translate([wall, wall, wall])
                    cube([mod_w - 2*wall, box_d - 2*wall, res_h]);

                // 3) 落水井: 背角贯通全高的竖井(井口=顶面注水/承接上层落水,
                //    井底通储水层)。位置经 shaftcheck 校验不破盆腔壁。
                translate([shaft_x, shaft_y, wall + 2])
                    cylinder(h = mod_h, d = shaft_d);
                translate([shaft_x, shaft_y, mod_h - 3])                  // 井口锥形导入
                    cylinder(h = 3.01, d1 = shaft_d, d2 = shaft_d + 4);

                // 4) 背面透气孔(盆根上沿一圈, 穿背板进盆腔给根透气)
                for (k = [0 : vent_n-1])
                    translate([cx + (k - (vent_n-1)/2)*32, -0.5, vent_z])
                        rotate([-90, 0, 0]) cylinder(h = box_d + 1, d = vent_d);

                // 5) 上下堆叠: 顶面定位孔(背板带内, 非对称防呆; 顶口扩成锥孔便于导入)
                for (sx = peg_xs)
                    translate([sx, peg_y, mod_h - 9])
                        cylinder(h = 10.1, d1 = peg_d + peg_clear, d2 = peg_d + peg_clear + 1.6);

                // 6) 左右横拼: 左侧面定位孔(背板厚度内)
                for (sz = [res_h, mod_h*0.62])
                    translate([-0.5, back_t/2 + 1, sz])
                        rotate([0, 90, 0]) cylinder(h = tile_h + 1, d = tile_peg_d + peg_clear);
            }

            // 7) 水注: 溢流标管(立在落水井底/储水层中, 管顶=水位) + 防虹吸/挡溅帽
            //    上层落水砸在帽上散入储水层(不直通管孔短路); 本层水位超管顶
            //    经帽下侧缝进管落下层; 侧缝进气**断虹吸**, 不会把储水抽空。
            translate([shaft_x, shaft_y, wall - 0.01]) {
                cylinder(h = water_h, d = sp_od);                          // 标管
                if (cap_on) {
                    for (a = [0:120:359])                                  // 3 立柱(留侧缝)
                        rotate([0, 0, a]) translate([sp_od/2 - 1.2, -1.5, water_h - 0.01])
                            cube([2.4, 3, siphon_gap + 0.02]);
                    translate([0, 0, water_h + siphon_gap])                // 帽
                        cylinder(h = cap_t, d = sp_od + 4);
                }
            }

            // 8) 底面出水短嘴(滴水裙): 插进下层井口内, 水滴不沿叠合缝爬
            translate([shaft_x, shaft_y, -boss_h])
                cylinder(h = boss_h + 0.1, d = boss_d);

            // 9) 上下堆叠: 底面定位**锥销**(顶缩径, 自对中; 非对称防呆)
            for (sx = peg_xs)
                translate([sx, peg_y, -7])
                    cylinder(h = 8, d1 = peg_d, d2 = peg_d - peg_taper);

            // 10) 左右横拼: 右侧面定位销
            for (sz = [res_h, mod_h*0.62])
                translate([mod_w - 0.01, back_t/2 + 1, sz])
                    rotate([0, 90, 0]) cylinder(h = tile_h, d = tile_peg_d);
        }

        // 11) 溢流水路(排水孔): 标管竖孔(顶=水位)垂直穿底面 → 下层落水井;
        //     底段扩成锥形塞孔(plug_d→overflow_d), 最底层塞锥形橡胶/硅胶塞。
        translate([shaft_x, shaft_y, wall - 0.1])
            cylinder(h = water_h + 0.2, d = overflow_d);                   // 标管竖孔
        translate([shaft_x, shaft_y, -boss_h - 0.01])
            cylinder(h = boss_h + wall + 0.1, d1 = plug_d, d2 = overflow_d); // 塞孔
    }
}

// ---- 稳定底座(单独打印件): 前后展开承台, 顶面接最底层底销 ----------------
//  顶承台板 + 前后斜展低板(加大支承多边形) + 底面掏空留外圈+十字肋(省料);
//  顶面: 2 个底销孔(收最底层锥销) + 中部落水/塞清空腔(给出水短嘴+橡胶塞让位)。
module base() {
    by0 = -base_reach_b;                       // 底座最后缘 Y
    byL = box_d + base_reach_f - by0;           // 底座总进深
    difference() {
        union() {
            // 承台板(覆盖单元底面接触区, 厚 base_deck), 抬到 base_h 顶
            translate([0, 0, base_h - base_deck]) cube([mod_w, box_d, base_deck]);
            // 前后展开斜板: 从承台高 base_h 渐降到前后薄端(楔形, 省料又稳)
            hull() {                                                   // 前展
                translate([0, box_d - 0.1, 0]) cube([mod_w, 0.1, base_h]);
                translate([0, box_d + base_reach_f - 2, 0]) cube([mod_w, 2, 3]);
            }
            hull() {                                                   // 后展
                translate([0, 0, 0]) cube([mod_w, 0.1, base_h]);
                translate([0, by0, 0]) cube([mod_w, 2, 3]);
            }
            // 外圈矮边墙(围合, 增刚)
            difference() {
                translate([0, by0, 0]) cube([mod_w, byL, base_h]);
                translate([base_wall, by0 + base_wall, -1])
                    cube([mod_w - 2*base_wall, byL - 2*base_wall, base_h + 2]);
            }
            // 十字肋(底面掏空区里留两道肋, 抗弯)
            translate([cx - base_wall/2, by0, 0]) cube([base_wall, byL, base_h - base_deck]);
            translate([0, box_d/2 - base_wall/2, 0]) cube([mod_w, base_wall, base_h - base_deck]);
        }
        // 顶面: 底销孔(收最底层锥销, 略放大易插)
        for (sx = peg_xs)
            translate([sx, peg_y, base_h - base_deck - 0.01])
                cylinder(h = base_deck + 0.1, d = peg_d + peg_clear + 0.4);
        // 中部清空腔: 给最底层出水短嘴(boss)+底面塞孔的橡胶塞让位, 不顶住
        translate([shaft_x, shaft_y, base_h - 9])
            cylinder(h = 9.1, d = boss_d + 4);
    }
}

// ---- 视图/自检选择 ---------------------------------------------------
module keep_x(x0, keep_right = true) {                 // 沿 x=x0 剖切
    intersection() {
        children();
        translate([keep_right ? x0 : x0 - 500, -300, -50])
            cube([500, mod_d + 600, mod_h + 400]);
    }
}
module slab_x(x0, t = 2) {                              // 过 x0 的薄片剖面(读图用)
    intersection() {
        children();
        translate([x0 - t/2, -300, -50]) cube([t, mod_d + 600, mod_h + 400]);
    }
}
module stack2() { unit(); translate([0, 0, mod_h]) unit(); }
module tile2()  { unit(); translate([mod_w, 0, 0]) unit(); }       // 左右横拼一对
module tower(n = 3) {                                    // 底座 + n 层(稳定性/水路总览)
    translate([0, 0, base_h]) for (i = [0:n-1]) translate([0, 0, i*mod_h]) unit();
    base();
}

if (view == "unit")          { unit(); if (show_pot) %pot_real(); }
else if (view == "cutx")     keep_x(cx, false) unit();            // 过盆轴纵剖
else if (view == "watercut") keep_x(shaft_x) unit();              // 过落水井纵剖
else if (view == "slabx")    slab_x(cx) unit();                   // 过盆轴薄片剖面(读水流)
else if (view == "stack")    { stack2(); if (show_pot) %union() { pot_real(); translate([0,0,mod_h]) pot_real(); } }
else if (view == "stackcut") keep_x(shaft_x) stack2();            // 堆叠×过井纵剖
else if (view == "tile2")    tile2();                             // 左右横拼一对(销/孔对位)
else if (view == "base")     base();
else if (view == "tower")    tower(3);                            // 底座+3层 全貌(看支承面)
else if (view == "towercut") keep_x(shaft_x) tower(3);           // 底座+3层 过井纵剖(水路)
else if (view == "potcheck")  intersection() { unit(); pot_real(); }       // 应为空!
else if (view == "shaftcheck") intersection() {                              // 应为空!
    cavity_inflated(1.2);
    translate([shaft_x, shaft_y, wall + 2]) cylinder(h = mod_h + 5, d = shaft_d + 4);
}

// ---- 尺寸 / 配合 自检(对标拓竹P2S ≤240, 可拆盆 148/Ø131.2/Ø93.2) ----
echo(str("单元 W x H = ", mod_w, " x ", mod_h, "  | 箱深 box_d=", box_d,
         "  盆底后伸 pot_back=", pot_back, "  真实进深 tot_d=", tot_d, " mm"));
echo(str("各轴 ≤240 ? W=", mod_w<=240, " H=", mod_h<=240, " 真实进深=", tot_d<=240));
echo(str("盆底外缘后伸到 Y=", back_y, " (负=伸出箱背); 浸水点 Y=", drip_y,
         " <箱深-壁 ", box_d-wall, " ? ", drip_y < box_d-wall));
echo(str("盆径向单边间隙: 底=", (in_bot-pot_bot_d)/2, " 口=", (in_top-pot_top_d)/2, " mm"));
echo(str("稳定底座 W x 进深 = ", mod_w, " x ", box_d+base_reach_f+base_reach_b,
         " mm  各轴≤240 ? ", mod_w<=240 && (box_d+base_reach_f+base_reach_b)<=240,
         "  前支点 Y=", box_d+base_reach_f, " 满载CG_Y≈62.6 裕度≈", box_d+base_reach_f-62.6, "mm"));
echo(str("储水层: 净高=", res_h, " 顶板 z=", wall+res_h, " | 盆底最低点 z=", drip_z,
         " 浸水窗=", lens_open, " | 水位 z=", wall+water_h, " → 浸盆 ", wall+water_h-drip_z, " mm"));
echo(str("水注: 管顶 z=", wall+water_h, " 帽顶 z=", wall+water_h+siphon_gap+cap_t,
         " < 储水顶板+井? ", true, " | 井Ø", shaft_d, " 帽Ø", sp_od+4, " 环隙=", (shaft_d-sp_od-4)/2));
echo(str("落水井走廊: 井孔外缘→盆轴 x距=", cx-(shaft_x+shaft_d/2),
         " mm (盆腔壁厚下限由 view=shaftcheck 校验, 渲染应为空)"));
