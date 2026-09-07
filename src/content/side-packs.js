import z00 from './packs/xajh_z00_fuwei_waybill.json' with { type: 'json' };
import z01 from './packs/xajh_z01_hanshui_boat.json' with { type: 'json' };
import z02 from './packs/xajh_z02_songshan_post.json' with { type: 'json' };
import z03 from './packs/xajh_z03_yanmen_token.json' with { type: 'json' };
import z04 from './packs/xajh_z04_steppe_lost_horse.json' with { type: 'json' };
import z05 from './packs/xajh_z05_border_mistranslation.json' with { type: 'json' };
import z06 from './packs/xajh_z06_ningguta_tune.json' with { type: 'json' };
import z07 from './packs/xajh_z07_hexirumor_horses.json' with { type: 'json' };
import z08 from './packs/xajh_z08_huashan_grain.json' with { type: 'json' };
import z09 from './packs/xajh_z09_jianmen_toll.json' with { type: 'json' };
import z10 from './packs/xajh_z10_miasma_guide.json' with { type: 'json' };
import z11 from './packs/xajh_z11_wuliang_false_manual.json' with { type: 'json' };
import z12 from './packs/xajh_z12_eastsea_letter.json' with { type: 'json' };

const packs = [z00, z01, z02, z03, z04, z05, z06, z07, z08, z09, z10, z11, z12];
export const PACK_EVENTS = Object.fromEntries(packs.map(p => [p.id, {
  name: p.event.name, start: p.event.start, requires: p.event.requires || {}, version: p.event.version || 1, nodes: p.event.nodes,
}]));
