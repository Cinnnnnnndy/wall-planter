// =====================================================================
//  墙面种植单元 v5.2 — 薄长方体(竖直)× 斜置锥盆「形体穿插」· 容器/套座
//  本版按第一次测试打印反馈大改:
//   1) 打印朝向: 盆口朝下贴板(盆轴竖直, 整体倾 50°), 储水腔/落水井免支撑;
//      => 主模型尽量不留"朝下的突出件"(原标管/帽/出水嘴/锥销都删)。
//   2) 去掉溢流阀(易炸毛/难拆支撑): 落水井改"贯通竖管", 串联下水;
//      层间用**单独打印的连接筒**插入上下井端 -> 密封接缝、不漏、兼对中。
//   3) 左右横拼 & 上下堆叠: 原模型**只留定位孔**, 突出的销改**单独插销**单独打印。
//   4) 把原来开在储水腔高度、会漏水的横拼孔**上移到储水腔以上**, 保证储水腔密封。
//  可拆真花盆: 148 / Ø131.2 / Ø93.2, 盆腔=同锥度 + 单边 1.5mm 间隙(直接放入)。
//  拓竹P2S: 三维 ≤240mm。
// =====================================================================

/* [可拆花盆外形 -> 盆腔按此 + 间隙] */
pot_top_d = 131.2;   // 盆上口外径
pot_bot_d = 93.2;    // 盆底外径
pot_height= 148;     // 盆高
fit_clear = 1.5;     // 单边间隙

/* [斜盆 / 壁] */
tilt      = 40;      // 盆轴高于水平角(打印时盆轴转竖直 = 倾 90-40=50°)
wall      = 3.0;     // 盆壁/箱壁厚
floor_t   = 6;       // 盆底座厚(沿轴)
mouth_ext = 16;      // 盆口端外伸(口完整张开)

/* [长方体箱 + 花盆后伸] */
box_d     = 66;      // 箱深
pot_back  = 28;      // 盆底外缘伸出箱背量
back_t    = 6;       // 背板带厚
side_gap  = 15;      // 锥盆两侧到箱边距(给落水井留壁厚走廊)
res_h     = 25;      // 储水/排水腔净高
lens_open = 5;       // 浸水窗高(盆腔最低点低于储水顶板, 盆底探进)

/* [落水井 = 贯通竖管(中央下水管)] */
shaft_d   = 23;      // 井径(贯通全高)
shaft_x   = 17;      // 井心 X(背角走廊, shaftcheck 校验不破盆腔)
shaft_y   = 19;      // 井心 Y
vent_d    = 6;       // 背面透气孔
vent_n    = 3;

/* [层间连接筒(单独打印): 插入上下井端, 密封接缝 + 对中] */
conn_od     = shaft_d - 1.0;   // 连接筒外径(滑配进井)
conn_bore   = 15;              // 连接筒内水道径
conn_sock   = 12;              // 连接筒每端插入深
conn_flange_d = shaft_d + 3;   // 中部止位环径(坐进井口沉孔, 叠合面仍贴平)
conn_flange_h = 3;             // 止位环高 = 井口沉孔深

/* [定位: 原模型只留孔, 销单独打印] */
join_d    = 7;       // 定位孔名义径(堆叠/横拼通用)
join_clear= 0.5;     // 孔比名义大
pin_clear = 0.35;    // 销比名义小(销径 = join_d - pin_clear)
peg_dp    = 9;       // 上下堆叠孔深(单边)
tile_dp   = 8;       // 左右横拼孔深(单边)
pin_len   = 16;      // 单独插销长(两端各插 ~8)

/* [盆口挡土唇(默认关; 真盆自带边)] */
lip_on   = false;
lip_w    = 6; lip_t = 4; drip_w = 1.6; drip_d2 = 2.2;

/* [稳定底座 — 单独打印, 顶面销向上插入最底层底孔, 中部留排水] */
base_reach_f = 112;  // 前伸(抗前倒)
base_reach_b = 58;   // 后伸(兜盆底 stub)
base_h       = 16;
base_wall    = 4;
base_deck    = 3;

dev      = true;
show_pot = false;
view     = "unit";   // unit/cutx/watercut/slabx/stack/stackcut/tile2/base/tower/
                     // towercut/wall33/connector/pin/parts/potcheck/shaftcheck
$fn = dev ? 40 : 96;

// ---- 派生 ----------------------------------------------------------
in_bot  = pot_bot_d + 2*fit_clear;
in_top  = pot_top_d + 2*fit_clear;
out_bot = in_bot + 2*wall;
out_top = in_top + 2*wall;
ay = cos(tilt); az = sin(tilt);
rate = (pot_top_d - pot_bot_d) / pot_height;
r_in = in_bot/2; r_out = out_bot/2;

z_dip = wall + res_h - lens_open;        // 盆腔最低点 z
p0y   = r_out*az - floor_t*ay - pot_back;
p0z   = z_dip - floor_t*az + r_in*ay;

drip_y = p0y + floor_t*ay + r_in*az;
drip_z = p0z + floor_t*az - r_in*ay;
back_y = p0y + floor_t*ay - r_out*az;

cup_len2 = floor_t + pot_height + mouth_ext;
seat_top = floor_t + pot_height;
od0 = (in_bot - rate*floor_t) + 2*wall;
od1 = (in_top + rate*mouth_ext) + 2*wall;
op_y = p0y + seat_top*ay;
op_z = p0z + seat_top*az;

mod_w = out_top + 2*side_gap;
cx    = mod_w/2;
front_y = op_y + (out_top/2)*az;
mod_d = front_y + 8;
tot_d = mod_d - back_y;

apex_mouth = p0z + cup_len2*az + (od1/2)*ay;
apex_lip   = op_z + ((out_top + 2*(lip_on ? lip_w : 0))/2)*ay;
top_margin = 8;
mod_h = max(apex_mouth, apex_lip) + top_margin;

vent_z = p0z + 8;
peg_xs = [mod_w*0.27, mod_w*0.70];       // 非对称 -> 防呆
peg_y  = back_t/2 + 2;                    // 定位孔落在背板带内(留壁不破背面)
tile_zs = [mod_h*0.34, mod_h*0.70];       // 横拼孔高度: **均在储水腔以上**(z>res_h+wall)

// ---- 基本模块 ------------------------------------------------------
module frustum(d1, d2, len) { rotate([-(90 - tilt), 0, 0]) cylinder(h = len, d1 = d1, d2 = d2); }
module along(d) { translate([0, d*ay, d*az]) children(); }
module clip_box() {
    intersection() { children(); translate([-1, -300, 0]) cube([mod_w + 2, mod_d + 600, mod_h + 400]); }
}
module pot_real() { translate([cx, p0y, p0z]) along(floor_t) frustum(pot_bot_d, pot_top_d, pot_height); }
module cavity_inflated(m = 1.2) {
    translate([cx, p0y, p0z]) along(floor_t) frustum(in_bot + 2*m, in_top + 2*m, pot_height);
    translate([cx, p0y, p0z]) along(seat_top) frustum(in_top + 2*m, in_top + rate*mouth_ext + 2*m, mouth_ext);
}

module outer() {
    union() {
        cube([mod_w, box_d, mod_h]);
        clip_box() translate([cx, p0y, p0z]) frustum(od0, od1, cup_len2);
        if (lip_on) translate([cx, p0y, p0z]) along(seat_top)
            frustum(out_top + 2*lip_w, out_top + 2*lip_w, lip_t);
    }
}

// ---- 单元(主模型): 只做减法, 不留任何突出件 ----------------------------
module unit() {
    difference() {
        outer();

        // 1) 盆内腔(同锥度 + 1.5mm 间隙; 真盆直接放入)
        translate([cx, p0y, p0z]) along(floor_t) frustum(in_bot, in_top, pot_height);
        translate([cx, p0y, p0z]) along(seat_top)
            frustum(in_top, in_top + rate*(mouth_ext + (lip_on?lip_t:0)), mouth_ext + (lip_on?lip_t:0) + 0.1);
        if (lip_on)
            translate([cx, p0y, p0z]) along(seat_top + lip_t - drip_w - 0.6)
                difference() {
                    frustum(out_top + 2*lip_w + 6, out_top + 2*lip_w + 6, drip_w);
                    frustum(out_top + 2*lip_w - 2*drip_d2, out_top + 2*lip_w - 2*drip_d2, 3*drip_w);
                }

        // 2) 储水/排水腔(箱下部; 盆底经浸水窗探入)
        translate([wall, wall, wall]) cube([mod_w - 2*wall, box_d - 2*wall, res_h]);

        // 3) 落水井 = 贯通竖管(穿透顶/底面)
        translate([shaft_x, shaft_y, -1]) cylinder(h = mod_h + 2, d = shaft_d);
        // 3b) 井口沉孔(顶端): 收层间连接筒的止位环, 叠合面贴平
        translate([shaft_x, shaft_y, mod_h - conn_flange_h - 0.6])
            cylinder(h = conn_flange_h + 1, d = conn_flange_d + 2*join_clear);
        // 3c) 井口锥形导入(底端, 便于连接筒插入)
        translate([shaft_x, shaft_y, -0.01]) cylinder(h = 3, d1 = shaft_d + 3, d2 = shaft_d);

        // 4) 背面透气孔(进盆腔根区)
        for (k = [0 : vent_n-1])
            translate([cx + (k - (vent_n-1)/2)*32, -0.5, vent_z])
                rotate([-90, 0, 0]) cylinder(h = box_d + 1, d = vent_d);

        // 5) 上下堆叠定位孔(顶面 & 底面 都开; 非对称防呆; 插单独销)
        for (sx = peg_xs) {
            translate([sx, peg_y, mod_h - peg_dp]) cylinder(h = peg_dp + 1, d = join_d + join_clear);
            translate([sx, peg_y, -1])             cylinder(h = peg_dp + 1, d = join_d + join_clear);
        }

        // 6) 左右横拼定位孔(左 & 右 都开; **储水腔以上**两个高度; 插单独销)
        for (sz = tile_zs) {
            translate([-1,            peg_y, sz]) rotate([0, 90, 0]) cylinder(h = tile_dp + 1, d = join_d + join_clear);
            translate([mod_w - tile_dp, peg_y, sz]) rotate([0, 90, 0]) cylinder(h = tile_dp + 1, d = join_d + join_clear);
        }
    }
}

// ---- 单独打印件: 层间连接筒 / 插销 / 底座 ------------------------------
// 层间连接筒: 中空管 + 中部止位环; 下半插下层井口(止位环坐沉孔, 叠合贴平),
// 上半露出插进上层井底。水从上层经筒内 Ø conn_bore 落到下层, 接缝密封不漏。
conn_fit = shaft_d - 0.8;        // 连接筒插入段外径(滑配进 Ø shaft_d 井, ~0.4 单边隙)
module connector() {
    difference() {
        union() {
            cylinder(h = conn_sock, d1 = conn_fit - 1.2, d2 = conn_fit);              // 下半(插下层, 端部小倒锥易插)
            translate([0,0,conn_sock]) cylinder(h = conn_flange_h, d = conn_flange_d); // 止位环
            translate([0,0,conn_sock + conn_flange_h])
                cylinder(h = conn_sock, d1 = conn_fit, d2 = conn_fit - 1.2);          // 上半(插上层)
        }
        translate([0,0,-1]) cylinder(h = 2*conn_sock + conn_flange_h + 2, d = conn_bore); // 内水道
    }
}
// 通用插销(堆叠/横拼共用): 两端倒角易插
module pin() {
    d = join_d - pin_clear;
    rotate_extrude($fn=48)
        polygon([[0,0],[d/2-1,0],[d/2,1],[d/2,pin_len-1],[d/2-1,pin_len],[0,pin_len]]);
}
// 打印拼版: 1 连接筒 + 6 插销(每层叠需 2 销 + 横拼每缝 2 销)
module parts_plate() {
    connector();
    for (i=[0:5]) translate([conn_flange_d + 6 + (i%3)*12, floor(i/3)*pin_len*0+ (i%3)*0 + floor(i/3)*14, 0])
        translate([0, floor(i/3)*16, 0]) pin();
}

module base() {
    by0 = -base_reach_b; byL = box_d + base_reach_f - by0;
    pin_d = join_d - pin_clear;
    union() {
        difference() {
            union() {
                translate([0, 0, base_h - base_deck]) cube([mod_w, box_d, base_deck]);
                hull() { translate([0, box_d - 0.1, 0]) cube([mod_w, 0.1, base_h]);
                         translate([0, box_d + base_reach_f - 2, 0]) cube([mod_w, 2, 3]); }
                hull() { translate([0, 0, 0]) cube([mod_w, 0.1, base_h]);
                         translate([0, by0, 0]) cube([mod_w, 2, 3]); }
                difference() {
                    translate([0, by0, 0]) cube([mod_w, byL, base_h]);
                    translate([base_wall, by0 + base_wall, -1]) cube([mod_w - 2*base_wall, byL - 2*base_wall, base_h + 2]);
                }
                translate([cx - base_wall/2, by0, 0]) cube([base_wall, byL, base_h - base_deck]);
                translate([0, box_d/2 - base_wall/2, 0]) cube([mod_w, base_wall, base_h - base_deck]);
            }
            // 中部排水清空腔(最底层井口朝下排水到托盘, 不顶住)
            translate([shaft_x, shaft_y, -1]) cylinder(h = base_h + 2, d = shaft_d + 1);
        }
        // 顶面定位销(向上插入最底层底孔; 在底座上向上打印免支撑)
        for (sx = peg_xs)
            translate([sx, peg_y, base_h - base_deck]) cylinder(h = peg_dp - 1, d = pin_d);
    }
}

// ---- 视图 / 自检 ---------------------------------------------------
module keep_x(x0, kr = true) { intersection(){ children(); translate([kr?x0:x0-500,-300,-50]) cube([500,mod_d+600,mod_h+400]); } }
module slab_x(x0,t=2){ intersection(){ children(); translate([x0-t/2,-300,-50]) cube([t,mod_d+600,mod_h+400]); } }
// 堆叠预览: 两单元 + 中间连接筒
module stack2(){ unit(); translate([0,0,mod_h]) unit();
    translate([shaft_x,shaft_y,mod_h-conn_sock]) connector(); }
module tile2(){ unit(); translate([mod_w,0,0]) unit(); }
wall_w = 520; wall_h = 730;
module wall33(nx=3,nz=3){ for(ix=[0:nx-1]){ translate([ix*mod_w,0,0]) base();
    for(iz=[0:nz-1]) translate([ix*mod_w,0,base_h+iz*mod_h]) unit(); } }
module tower(n=3){ translate([0,0,base_h]) for(i=[0:n-1]) translate([0,0,i*mod_h]) unit(); base(); }

if (view=="unit")          { unit(); if(show_pot) %pot_real(); }
else if (view=="cutx")     keep_x(cx,false) unit();
else if (view=="watercut") keep_x(shaft_x) unit();
else if (view=="slabx")    slab_x(cx) unit();
else if (view=="stack")    stack2();
else if (view=="stackcut") keep_x(shaft_x) stack2();
else if (view=="tile2")    tile2();
else if (view=="base")     base();
else if (view=="tower")    tower(3);
else if (view=="towercut") keep_x(shaft_x) tower(3);
else if (view=="wall33")   wall33();
else if (view=="connector") connector();
else if (view=="pin")      pin();
else if (view=="parts")    parts_plate();
else if (view=="potcheck")  intersection(){ unit(); pot_real(); }            // 应空
else if (view=="shaftcheck") intersection(){                                   // 应空
    cavity_inflated(1.2);
    translate([shaft_x,shaft_y,-1]) cylinder(h=mod_h+2, d=shaft_d+4);
}
else if (view=="tilecheck") intersection(){                                    // 横拼孔×盆腔(应空)
    cavity_inflated(0.8);
    for(sz=tile_zs){
        translate([-1,peg_y,sz]) rotate([0,90,0]) cylinder(h=tile_dp+1,d=join_d+join_clear);
        translate([mod_w-tile_dp,peg_y,sz]) rotate([0,90,0]) cylinder(h=tile_dp+1,d=join_d+join_clear);
    }
}
else if (view=="rescheck") intersection(){                                     // 横拼孔×储水腔(应空=密封)
    translate([wall,wall,wall]) cube([mod_w-2*wall, box_d-2*wall, res_h]);
    for(sz=tile_zs){
        translate([-1,peg_y,sz]) rotate([0,90,0]) cylinder(h=tile_dp+1,d=join_d+join_clear);
        translate([mod_w-tile_dp,peg_y,sz]) rotate([0,90,0]) cylinder(h=tile_dp+1,d=join_d+join_clear);
    }
}

// ---- 尺寸 / 配合 自检 ----------------------------------------------
echo(str("单元 W x H = ", mod_w, " x ", mod_h, "  真实进深 tot_d=", tot_d, "  三轴≤240? ",
         mod_w<=240 && mod_h<=240 && tot_d<=240));
echo(str("盆腔: 口径=", in_top, " 底径=", in_bot, " 深=", pot_height, " | 单边间隙 底=",
         (in_bot-pot_bot_d)/2, " 口=", (in_top-pot_top_d)/2, " mm"));
echo(str("横拼孔高度 tile_zs=", tile_zs, "  储水顶板 z=", wall+res_h,
         "  全在储水以上? ", (tile_zs[0]>wall+res_h) && (tile_zs[1]>wall+res_h), " (#4 密封)"));
echo(str("连接筒: 外径=", conn_od, " 内水道=", conn_bore, " 总长=", 2*conn_sock+conn_flange_h,
         " 止位环Ø", conn_flange_d, " | 井径=", shaft_d));
echo(str("稳定底座 W x 进深 = ", mod_w, " x ", box_d+base_reach_f+base_reach_b, "  ≤240? ",
         (box_d+base_reach_f+base_reach_b)<=240));
echo(str("落水井→盆轴 x距=", cx-(shaft_x+shaft_d/2), " (shaftcheck 应空)"));
