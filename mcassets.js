const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const crypto = require('crypto');

let baseDir = null;
const setBaseDir = (d) => { baseDir = d; };
const UA = { 'User-Agent': 'plugin-maker-asset-reader' };
const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES = 'https://resources.download.minecraft.net/';

function mcDir() {
  if (process.platform === 'win32') return path.join(process.env.APPDATA || '', '.minecraft');
  if (process.platform === 'darwin') return path.join(process.env.HOME || '', 'Library', 'Application Support', 'minecraft');
  return path.join(process.env.HOME || '', '.minecraft');
}
const cacheDir = (ver) => { const d = path.join(baseDir, 'mc-assets', ver.replace(/[^0-9A-Za-z._-]/g, '_')); fs.mkdirSync(d, { recursive: true }); return d; };

function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: UA }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('서버 응답 ' + res.statusCode)); return; }
      const parts = [];
      res.on('data', (c) => parts.push(c));
      res.on('end', () => resolve(Buffer.concat(parts)));
      res.on('error', reject);
    }).on('error', reject);
  });
}
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('게임 파일이 깨졌습니다 (zip)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.set(name, { method, csize, off });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = (name) => {
    const e = entries.get(name);
    if (!e) return null;
    const lh = e.off;
    const start = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
    const data = buf.subarray(start, start + e.csize);
    return e.method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
  };
  return { entries, read };
}

let manifestCache = null;
async function manifest() {
  if (!manifestCache) manifestCache = JSON.parse((await get(MANIFEST)).toString('utf8'));
  return manifestCache;
}
async function versionJson(ver) {
  const local = path.join(mcDir(), 'versions', ver, ver + '.json');
  if (fs.existsSync(local)) { try { return JSON.parse(fs.readFileSync(local, 'utf8')); } catch (e) {  } }
  const cached = path.join(cacheDir(ver), 'version.json');
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'));
  const m = await manifest();
  const v = m.versions.find((x) => x.id === ver);
  if (!v) throw new Error('마크 ' + ver + ' 버전을 공식 목록에서 못 찾았습니다');
  const buf = await get(v.url);
  if (v.sha1 && sha1(buf) !== v.sha1) throw new Error('받은 버전 정보가 깨졌습니다');
  fs.writeFileSync(cached, buf);
  return JSON.parse(buf.toString('utf8'));
}
async function clientJar(ver, vj, log) {
  const local = path.join(mcDir(), 'versions', ver, ver + '.jar');
  if (fs.existsSync(local)) { log('내 컴퓨터의 마인크래프트 ' + ver + ' 파일을 읽습니다'); return fs.readFileSync(local); }
  const cached = path.join(cacheDir(ver), 'client.jar');
  const dl = vj.downloads && vj.downloads.client;
  if (fs.existsSync(cached)) { const b = fs.readFileSync(cached); if (!dl || sha1(b) === dl.sha1) return b; }
  if (!dl) throw new Error('게임 파일 주소가 없습니다');
  log('마인크래프트 ' + ver + ' 게임 파일을 받는 중입니다 (약 ' + Math.round(dl.size / 1048576) + 'MB, 처음 한 번만)');
  const buf = await get(dl.url);
  if (sha1(buf) !== dl.sha1) throw new Error('받은 게임 파일이 깨졌습니다. 다시 해주세요.');
  fs.writeFileSync(cached, buf);
  return buf;
}
async function assetIndex(vj) {
  const id = vj.assetIndex && vj.assetIndex.id;
  const local = id && path.join(mcDir(), 'assets', 'indexes', id + '.json');
  if (local && fs.existsSync(local)) { try { return JSON.parse(fs.readFileSync(local, 'utf8')); } catch (e) {  } }
  return JSON.parse((await get(vj.assetIndex.url)).toString('utf8'));
}
async function assetObject(index, name) {
  const o = index.objects && index.objects[name];
  if (!o) return null;
  const sub = o.hash.slice(0, 2) + '/' + o.hash;
  const local = path.join(mcDir(), 'assets', 'objects', o.hash.slice(0, 2), o.hash);
  if (fs.existsSync(local)) return fs.readFileSync(local);
  const buf = await get(RESOURCES + sub);
  if (sha1(buf) !== o.hash) throw new Error('받은 파일이 깨졌습니다 (' + name + ')');
  return buf;
}

const FACE = {
  zombie: ['entity/zombie/zombie', 8, 8, 8, 8], husk: ['entity/zombie/husk', 8, 8, 8, 8], drowned: ['entity/zombie/drowned', 8, 8, 8, 8],
  skeleton: ['entity/skeleton/skeleton', 8, 8, 8, 8], stray: ['entity/skeleton/stray', 8, 8, 8, 8], wither_skeleton: ['entity/skeleton/wither_skeleton', 8, 8, 8, 8],
  bogged: ['entity/skeleton/bogged', 8, 8, 8, 8], creeper: ['entity/creeper/creeper', 8, 8, 8, 8], enderman: ['entity/enderman/enderman', 8, 8, 8, 8],
  spider: ['entity/spider/spider', 40, 12, 8, 8], cave_spider: ['entity/spider/cave_spider', 40, 12, 8, 8], slime: ['entity/slime/slime', 8, 8, 8, 8],
  blaze: ['entity/blaze', 8, 8, 8, 8], ghast: ['entity/ghast/ghast', 16, 16, 16, 16],
  pig: [['entity/pig/pig', 'entity/pig/temperate_pig'], 8, 8, 8, 8], cow: [['entity/cow/cow', 'entity/cow/temperate_cow'], 6, 6, 8, 8], mooshroom: ['entity/cow/red_mooshroom', 6, 6, 8, 8], sheep: ['entity/sheep/sheep', 8, 8, 6, 6],
  chicken: [['entity/chicken', 'entity/chicken/temperate_chicken'], 3, 3, 4, 6], wolf: ['entity/wolf/wolf', 4, 4, 6, 6], villager: ['entity/villager/villager', 8, 8, 8, 10],
  wandering_trader: ['entity/wandering_trader', 8, 8, 8, 10], witch: ['entity/witch', 8, 8, 8, 10], zombie_villager: ['entity/zombie_villager/zombie_villager', 8, 8, 8, 10],
  pillager: ['entity/illager/pillager', 8, 8, 8, 10], vindicator: ['entity/illager/vindicator', 8, 8, 8, 10], evoker: ['entity/illager/evoker', 8, 8, 8, 10],
  iron_golem: ['entity/iron_golem/iron_golem', 8, 8, 8, 10], snow_golem: ['block/carved_pumpkin', 0, 0, 16, 16], piglin: ['entity/piglin/piglin', 8, 8, 10, 8],
  piglin_brute: ['entity/piglin/piglin_brute', 8, 8, 10, 8], zombified_piglin: ['entity/piglin/zombified_piglin', 8, 8, 10, 8],
  wither: ['entity/wither/wither', 8, 8, 8, 8], polar_bear: ['entity/bear/polarbear', 7, 7, 7, 7], panda: ['entity/panda/panda', 9, 15, 13, 10],
  rabbit: ['entity/rabbit/brown', 37, 5, 5, 4], fox: ['entity/fox/fox', 9, 11, 8, 6], player: [['entity/player/wide/steve', 'entity/steve'], 8, 8, 8, 8], shield: ['entity/shield_base_nopattern', 1, 1, 12, 22],
  llama: ['entity/llama/creamy', 6, 20, 8, 8], trader_llama: ['entity/llama/creamy', 6, 20, 8, 8],
  horse: ['entity/horse/horse_brown', { w: 12, h: 5, parts: [[0, 30, 5, 5, 0, 0], [0, 20, 7, 5, 5, 0]] }], donkey: ['entity/horse/donkey', { w: 12, h: 5, parts: [[0, 30, 5, 5, 0, 0], [0, 20, 7, 5, 5, 0]] }], mule: ['entity/horse/mule', { w: 12, h: 5, parts: [[0, 30, 5, 5, 0, 0], [0, 20, 7, 5, 5, 0]] }],
  skeleton_horse: ['entity/horse/horse_skeleton', { w: 12, h: 5, parts: [[0, 30, 5, 5, 0, 0], [0, 20, 7, 5, 5, 0]] }], zombie_horse: ['entity/horse/horse_zombie', { w: 12, h: 5, parts: [[0, 30, 5, 5, 0, 0], [0, 20, 7, 5, 5, 0]] }],
  parrot: ['entity/parrot/parrot_red_blue', 4, 4, 2, 3], dolphin: ['entity/dolphin', 6, 6, 8, 7], turtle: ['entity/turtle/big_sea_turtle', 9, 6, 6, 5],
  bat: ['entity/bat', 2, 2, 4, 3], axolotl: ['entity/axolotl/axolotl_lucy', 5, 6, 8, 5], camel: ['entity/camel/camel', 79, 43, 7, 8],
  sniffer: ['entity/sniffer/sniffer', 19, 45, 13, 11], breeze: ['entity/breeze/breeze', 8, 8, 8, 8], creaking: ['entity/creaking/creaking', 6, 6, 6, 10],
  phantom: ['entity/phantom', 5, 5, 7, 3], endermite: ['entity/endermite', 2, 2, 4, 3], silverfish: ['entity/silverfish', 2, 2, 3, 2],
  vex: ['entity/illager/vex', 5, 5, 5, 5], ravager: ['entity/illager/ravager', 16, 16, 16, 20], ender_dragon: ['entity/enderdragon/dragon', 128, 46, 16, 16],
  goat: ['entity/goat/goat', 44, 56, 5, 7], frog: ['entity/frog/temperate_frog', 1, 3, 11, 8], armadillo: ['entity/armadillo', 43, 15, 10, 7],
  magma_cube: ['entity/slime/magmacube', { w: 8, h: 8, parts: [[8, 0, 8, 8, 0, 0], [8, 26, 8, 1, 0, 2], [8, 35, 8, 1, 0, 5]] }],
  bee: ['entity/bee/bee', 10, 10, 7, 7], hoglin: ['entity/hoglin/hoglin', 80, 20, 14, 6], zoglin: ['entity/hoglin/zoglin', 80, 20, 14, 6],
  warden: ['entity/warden/warden', 10, 42, 16, 16],
  giant: ['entity/zombie/zombie', 8, 8, 8, 8], illusioner: ['entity/illager/illusioner', 8, 8, 8, 10],
  allay: ['entity/allay/allay', 5, 5, 5, 5], squid: ['entity/squid/squid', 12, 12, 12, 16], glow_squid: ['entity/squid/glow_squid', 12, 12, 12, 16],
  guardian: ['entity/guardian', 16, 16, 12, 12], elder_guardian: ['entity/guardian_elder', 16, 16, 12, 12], cat: ['entity/cat/tabby', 5, 5, 5, 4],
  ocelot: ['entity/cat/ocelot', 5, 5, 5, 4], strider: ['entity/strider/strider', 16, 16, 16, 14], shulker: ['entity/shulker/shulker', 6, 58, 6, 6]
};

function makeResolver(zip) {
  const modelCache = {};
  const loadModel = (name) => {
    const n = String(name).replace(/^minecraft:/, '');
    if (modelCache[n] !== undefined) return modelCache[n];
    const buf = zip.read('assets/minecraft/models/' + n + '.json');
    let j = null;
    try { j = buf ? JSON.parse(buf.toString('utf8')) : null; } catch (e) { j = null; }
    modelCache[n] = j;
    return j;
  };
  return function resolve(name, id) {
    const textures = {};
    let generated = false;
    let elements = null;
    let gui = null;
    let n = String(name).replace(/^minecraft:/, '');
    for (let depth = 0; n && depth < 14; depth++) {
      if (n === 'builtin/generated' || n === 'item/generated') generated = true;
      const m = loadModel(n);
      if (!m) break;
      Object.keys(m.textures || {}).forEach((k) => { if (textures[k] === undefined) textures[k] = m.textures[k]; });
      if (!elements && Array.isArray(m.elements)) elements = m.elements;
      if (!gui && m.display && m.display.gui) gui = m.display.gui;
      n = m.parent ? String(m.parent).replace(/^minecraft:/, '') : null;
    }
    const ref = (v, guard = 0) => {
      if (!v || guard > 8) return null;
      if (v[0] === '#') return ref(textures[v.slice(1)], guard + 1);
      return String(v).replace(/^minecraft:/, '');
    };
    if (generated && !elements) {
      const layers = [];
      for (let i = 0; i < 4; i++) { const t = ref(textures['layer' + i]); if (t) layers.push(t); }
      if (layers.length) return { flat: layers };
    }
    if (elements && elements.length) {
      const els = [];
      elements.forEach((e) => {
        const faces = {};
        Object.keys(e.faces || {}).forEach((k) => {
          const f = e.faces[k];
          const t = ref(f.texture);
          if (t) faces[k] = { texture: t, uv: f.uv || null, rotation: f.rotation || 0, tint: f.tintindex != null };
        });
        if (Object.keys(faces).length && Array.isArray(e.from) && Array.isArray(e.to)) els.push({ from: e.from, to: e.to, rotation: e.rotation || null, shade: e.shade !== false, faces });
      });
      if (els.length) return { model: { elements: els, gui: gui || { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] } } };
    }
    const cm = /^(trapped_|ender_)?chest$/.exec(id || '');
    if (cm) return { box: { kind: 'chest', tex: 'entity/chest/' + (cm[1] === 'trapped_' ? 'trapped' : cm[1] === 'ender_' ? 'ender' : 'normal') } };
    const HEADS = { skeleton_skull: 'skeleton', wither_skeleton_skull: 'wither_skeleton', zombie_head: 'zombie', creeper_head: 'creeper', piglin_head: 'piglin', player_head: 'player' };
    if (HEADS[id]) return { head: HEADS[id] };
    if (id === 'shield') return { head: 'shield' };
    const bed = /^([a-z_]+)_bed$/.exec(id || '');
    if (bed) {
      const wool = 'block/' + bed[1] + '_wool';
      const cube = (from, to, tex, top) => ({ from, to, rotation: null, shade: true, faces: { up: { texture: top || tex, uv: null }, north: { texture: tex, uv: null }, south: { texture: tex, uv: null }, east: { texture: tex, uv: null }, west: { texture: tex, uv: null }, down: { texture: tex, uv: null } } });
      return { model: { elements: [
        cube([0, 0, 0], [3, 3, 3], 'block/oak_planks'), cube([13, 0, 0], [16, 3, 3], 'block/oak_planks'), cube([0, 0, 13], [3, 3, 16], 'block/oak_planks'), cube([13, 0, 13], [16, 3, 16], 'block/oak_planks'),
        cube([0, 3, 0], [16, 8, 16], wool), cube([1, 8, 1], [15, 10, 6], 'block/white_wool')
      ], gui: { rotation: [30, 160, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] } } };
    }
    const bm = /^([a-z_]+)_banner$/.exec(id || '');
    if (bm) return { banner: 'block/' + bm[1] + '_wool' };
    const p = ref(textures.particle) || ref(textures.layer0);
    if (p && /shulker_box$/.test(id || '')) return { cube: { top: p, side: p, front: p } };
    return p ? { flat: [p] } : null;
  };
}
function itemModelName(json) {
  let found = null;
  const walk = (o) => {
    if (found || !o || typeof o !== 'object') return;
    if (typeof o.model === 'string' && (o.type === 'minecraft:model' || o.type === 'model')) { found = o.model; return; }
    if (typeof o.base === 'string') { found = o.base; return; }
    Object.values(o).forEach(walk);
  };
  walk(json);
  return found;
}

const TABS = ['buildingBlocks', 'coloredBlocks', 'natural', 'functional', 'redstone', 'tools', 'combat', 'foodAndDrink', 'ingredients', 'spawnEggs', 'op'];
const COLORS = '(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)';
const RX = {
  op: /^(command_block|chain_command_block|repeating_command_block|command_block_minecart|structure_block|structure_void|jigsaw|barrier|light|debug_stick|test_block|test_instance_block|knowledge_book|petrified_oak_slab)$|^infested_/,
  colored: new RegExp('^' + COLORS + '_(wool|carpet|terracotta|glazed_terracotta|concrete|concrete_powder|stained_glass|stained_glass_pane|candle|bed|banner|shulker_box)$|^(terracotta|glass|glass_pane|tinted_glass|shulker_box|candle)$'),
  redstone: /^(redstone|redstone_torch|redstone_block|repeater|comparator|target|lever|piston|sticky_piston|observer|dispenser|dropper|crafter|hopper|daylight_detector|tripwire_hook|tnt|redstone_lamp|sculk_sensor|calibrated_sculk_sensor|note_block|lightning_rod|slime_block|honey_block|trapped_chest|tnt_minecart|hopper_minecart|chest_minecart|furnace_minecart|minecart|rail|powered_rail|detector_rail|activator_rail|stone_button|oak_button|stone_pressure_plate|oak_pressure_plate|light_weighted_pressure_plate|heavy_weighted_pressure_plate|iron_door|iron_trapdoor)$|copper_bulb$/,
  combat: /_(sword|helmet|chestplate|leggings|boots|horse_armor)$|^(bow|crossbow|arrow|spectral_arrow|tipped_arrow|trident|mace|shield|totem_of_undying|turtle_helmet|wolf_armor|end_crystal|snowball|egg|wind_charge|blue_egg|brown_egg)$/,
  tools: /_(shovel|pickaxe|axe|hoe|boat|chest_boat|raft|chest_raft|bucket|bundle)$|^(flint_and_steel|shears|brush|fishing_rod|carrot_on_a_stick|warped_fungus_on_a_stick|compass|recovery_compass|clock|spyglass|lead|name_tag|bundle|saddle|bucket|map|writable_book|written_book|goat_horn|elytra|ender_pearl|ender_eye|firework_rocket|trial_key|ominous_trial_key|filled_map)$|^music_disc_/,
  food: /^(apple|golden_apple|enchanted_golden_apple|melon_slice|sweet_berries|glow_berries|chorus_fruit|carrot|golden_carrot|potato|baked_potato|poisonous_potato|beetroot|dried_kelp|beef|porkchop|mutton|chicken|rabbit|cod|salmon|tropical_fish|pufferfish|bread|cookie|pumpkin_pie|rotten_flesh|spider_eye|mushroom_stew|beetroot_soup|rabbit_stew|suspicious_stew|milk_bucket|honey_bottle|potion|splash_potion|lingering_potion|ominous_bottle)$|^cooked_/,
  functional: /_(sign|hanging_sign|head|skull|anvil|shelf)$|^(torch|soul_torch|copper_torch|lantern|soul_lantern|copper_lantern|campfire|soul_campfire|end_rod|chain|iron_chain|crafting_table|furnace|blast_furnace|smoker|stonecutter|cartography_table|fletching_table|smithing_table|grindstone|loom|anvil|enchanting_table|brewing_stand|cauldron|composter|barrel|chest|ender_chest|beacon|conduit|bell|lectern|respawn_anchor|lodestone|item_frame|glow_item_frame|painting|armor_stand|flower_pot|decorated_pot|ladder|scaffolding|beehive|bee_nest|jukebox|glowstone|sea_lantern|shroomlight|ochre_froglight|verdant_froglight|pearlescent_froglight|dragon_egg|end_portal_frame|vault|trial_spawner|spawner|suspicious_sand|suspicious_gravel|heavy_core|creaking_heart|bookshelf|chiseled_bookshelf|jack_o_lantern|redstone_lamp|lightning_rod|copper_chest)$/,
  natural: /_(ore|leaves|sapling|log|stem|hyphae|wood|coral|coral_block|coral_fan|tulip|seeds|mushroom_block|fungus|roots|nylium|bud|propagule)$|^(grass_block|dirt|coarse_dirt|podzol|rooted_dirt|mud|mycelium|sand|red_sand|gravel|clay|dirt_path|farmland|dandelion|poppy|blue_orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|torchflower|pitcher_plant|pink_petals|wildflowers|leaf_litter|spore_blossom|open_eyeblossom|closed_eyeblossom|short_grass|grass|tall_grass|fern|large_fern|dead_bush|short_dry_grass|tall_dry_grass|bush|firefly_bush|cactus|cactus_flower|sugar_cane|bamboo|kelp|seagrass|sea_pickle|vine|lily_pad|moss_block|moss_carpet|pale_moss_block|pale_moss_carpet|pale_hanging_moss|azalea|flowering_azalea|big_dripleaf|small_dripleaf|glow_lichen|hanging_roots|sculk|sculk_vein|sculk_catalyst|sculk_shrieker|amethyst_cluster|budding_amethyst|pointed_dripstone|dripstone_block|obsidian|crying_obsidian|bedrock|magma_block|end_stone|chorus_plant|chorus_flower|sponge|wet_sponge|turtle_egg|sniffer_egg|frogspawn|melon|pumpkin|carved_pumpkin|hay_block|cobweb|cocoa_beans|nether_wart|nether_wart_block|warped_wart_block|mangrove_roots|muddy_mangrove_roots|weeping_vines|twisting_vines|netherrack|soul_sand|soul_soil|basalt|blackstone|ice|packed_ice|blue_ice|snow|snow_block|powder_snow_bucket|stone|deepslate|granite|diorite|andesite|tuff|calcite|ancient_debris|brown_mushroom|red_mushroom|crimson_fungus|warped_fungus|honeycomb_block|bone_block|resin_block|pitcher_pod|glow_berries|sweet_berries|wheat_seeds|beetroot_seeds|melon_seeds|pumpkin_seeds|torchflower_seeds|raw_iron_block|raw_gold_block|raw_copper_block|eyeblossom)$/,
  ingredients: /_(ingot|nugget|dye|smithing_template|pottery_sherd|banner_pattern|scute)$|^(coal|charcoal|raw_iron|raw_gold|raw_copper|diamond|emerald|lapis_lazuli|quartz|amethyst_shard|netherite_scrap|stick|flint|wheat|bone|bone_meal|string|feather|leather|rabbit_hide|honeycomb|ink_sac|glow_ink_sac|slime_ball|clay_ball|prismarine_shard|prismarine_crystals|nautilus_shell|heart_of_the_sea|fire_charge|blaze_rod|blaze_powder|breeze_rod|ghast_tear|magma_cream|gunpowder|glowstone_dust|paper|book|enchanted_book|brick|nether_brick|nether_star|phantom_membrane|sugar|glass_bottle|experience_bottle|echo_shard|disc_fragment_5|rabbit_foot|dragon_breath|fermented_spider_eye|glistering_melon_slice|resin_clump|resin_brick|scute|armadillo_scute|turtle_scute|popped_chorus_fruit|egg|blue_egg|brown_egg)$/
};
function creativeTab(id, isBlock) {
  if (/_spawn_egg$/.test(id)) return 'spawnEggs';
  if (RX.op.test(id)) return 'op';
  if (RX.colored.test(id)) return 'coloredBlocks';
  if (RX.food.test(id)) return 'foodAndDrink';
  if (RX.combat.test(id)) return 'combat';
  if (RX.tools.test(id)) return 'tools';
  if (RX.redstone.test(id)) return 'redstone';
  if (RX.functional.test(id)) return 'functional';
  if (RX.ingredients.test(id) && !isBlock) return 'ingredients';
  if (RX.natural.test(id) && !/^(stripped_|polished_|cut_|chiseled_|smooth_)/.test(id)) return 'natural';
  if (isBlock) return 'buildingBlocks';
  return 'ingredients';
}

const SND_ACT = {
  break: '부서지는 소리', place: '놓는 소리', step: '발소리', hit: '캐는 소리', fall: '떨어지는 소리', land: '떨어지는 소리',
  ambient: '평소 소리', hurt: '다치는 소리', death: '죽는 소리', attack: '공격 소리', eat: '먹는 소리', open: '열리는 소리', close: '닫히는 소리',
  loop: '계속 나는 소리', mood: '으스스한 소리', additions: '가끔 나는 소리', rare: '드문 소리', ultra_rare: '아주 드문 소리', enter: '들어갈 때', exit: '나올 때',
  short: '짧은 소리', tongue: '혀 내미는 소리', scream: '비명', inside: '안에 탔을 때', underwater: '물속', breath: '숨소리', saddle: '안장 얹는 소리',
  howl: '울부짖는 소리', click: '누르는 소리', select_pattern: '무늬 고르는 소리', select_recipe: '제작법 고르는 소리',
  challenge_complete: '도전 과제 완료', in: '알림 뜨는 소리', out: '알림 사라지는 소리', click_on: '켜지는 소리', click_off: '꺼지는 소리',
  splash: '물 튀기는 소리', swim: '헤엄치는 소리', shoot: '쏘는 소리', throw: '던지는 소리', use: '쓰는 소리', idle: '평소 소리'
};
const SND_SUBJ = {
  generic: '공통', hostile: '적 몹', player: '플레이어', item: '아이템', puffer_fish: '복어', wood: '나무', stone: '돌', metal: '금속',
  ui: '화면', button: '버튼', toast: '알림', underwater: '물속', minecart: '광산 수레', note_block: '소리 블록', fungus: '균', conduit: '전달체',
  bamboo_wood: '대나무 나무', coral_block: '산호 블록', crop: '작물', froglight: '개구리불', hanging_sign: '매다는 표지판', nether_ore: '네더 광석',
  nether_wood_hanging_sign: '네더 나무 매다는 표지판', nether_wood: '네더 나무', nylium: '나일리움', roots: '뿌리', stem: '줄기', wart_block: '사마귀 블록',
  wet_grass: '젖은 풀', wool: '양털', fish: '물고기', portal: '차원문', wooden: '나무', nether_wood: '네더 나무', metal: '금속', copper: '구리', cave: '동굴', old_growth_taiga: '원시 타이가'
};
const SND_PART = { fence_gate: '울타리 문', pressure_plate: '압력판', button: '버튼', trapdoor: '다락문', door: '문', hanging_sign: '매다는 표지판', fence: '울타리', sign: '표지판' };
const SND_WORD = {
  banjo: '밴조', basedrum: '베이스 드럼', bass: '베이스', bell: '종', bit: '비트', chime: '차임', cow: '카우', didgeridoo: '디저리두', flute: '플루트',
  guitar: '기타', harp: '하프', hat: '하이햇', iron: '철', xylophone: '실로폰', pling: '플링', snare: '스네어', screaming: '비명 지르는', far: '멀리서',
  large: '큰', small: '작은', big: '큰', extend: '늘어남', contract: '줄어듦', water: '물', air: '공기', land: '땅', sand: '모래', fill: '채움',
  success: '완료', launch: '발사', dispense: '배출', stray: '떠돌이', peek: '살핌', unroll: '몸 펴기', start: '시작', blast: '폭발', twinkle: '반짝임',
  jump: '점프', milk: '젖 짜기', prepare: '준비', ram: '박치기', impact: '부딪힘', wood: '나무', squish: '철퍽', nodamage: '피해 없음',
  weak: '약하게', lava: '용암', pant: '헐떡임', whine: '낑낑', scrape: '긁기', strip: '껍질 벗기기', dragonbreath: '드래곤의 숨결', empty: '비움',
  axolotl: '아홀로틀', fish: '물고기', powder: '가루', snow: '눈', tadpole: '올챙이', loading: '장전', middle: '중간', quick: '빠른', charge: '장전',
  sound: '소리', smash: '내려찍기', ground: '땅', heavy: '세게', riptide: '급류', above: '위', attack: '공격',
  travel: '이동', flying: '날기',
  paddle: '노', idle: '평소', purreow: '야옹', long: '길게', pop: '튀김', fall: '떨어짐', step: '발소리', ambient: '평소', death: '죽음', eat: '먹음'
};
const MUSIC = { creative: '크리에이티브', credits: '엔딩 크레딧', dragon: '엔더 드래곤 전투', end: '엔드', game: '게임', menu: '메인 화면', under_water: '물속' };

function soundList(soundsJson, index, name) {
  const has = (ev, depth) => {
    const e = soundsJson[ev];
    if (!e || !Array.isArray(e.sounds) || depth > 4) return false;
    return e.sounds.some((s) => {
      const o = typeof s === 'string' ? { name: s } : s;
      if (o.type === 'event') return has(o.name.replace(/^minecraft:/, ''), depth + 1);
      if (!index || !index.objects) return true;
      return !!index.objects['minecraft/sounds/' + o.name.replace(/^minecraft:/, '') + '.ogg'];
    });
  };
  const nm = (...keys) => { for (const k of keys) { const v = name(k); if (v) return v; } return null; };
  const thing = (key) => SND_SUBJ[key] || nm('block.minecraft.' + key, 'item.minecraft.' + key, 'entity.minecraft.' + key,
    'block.minecraft.' + key.replace('_wood_', '_'), 'block.minecraft.' + key + '_block', 'block.minecraft.' + key + 's',
    'entity.minecraft.' + key.replace(/_/g, ''), 'biome.minecraft.' + key) || part(key);
  const part = (key) => {
    const suf = Object.keys(SND_PART).find((k) => key === k || key.endsWith('_' + k));
    if (!suf) return null;
    const pre = key.slice(0, -suf.length).replace(/_$/, '');
    const p = pre && (SND_SUBJ[pre] || nm('block.minecraft.' + pre, 'block.minecraft.' + pre + '_planks'));
    return (p ? p + ' ' : '') + SND_PART[suf];
  };
  const act = (rest) => { const w = rest[rest.length - 1]; return SND_ACT[w] || thing(w) || w.split('_').map((x) => SND_WORD[x] || SND_ACT[x] || x).join(' '); };
  const fallback = (id) => {
    const p = id.split('.');
    if (p[0] === 'music_disc') {
      const song = nm('jukebox_song.minecraft.' + p[1], 'item.minecraft.music_disc_' + p[1] + '.desc');
      return '음반: ' + (song || p[1]);
    }
    if (p[0] === 'music') {
      if (p[1] === 'nether' || p[1] === 'overworld') return '배경 음악: ' + (nm('biome.minecraft.' + p[2]) || thing(p[2]) || p[2]);
      return '배경 음악: ' + (MUSIC[p[1]] || p[1]);
    }
    if (p[0] === 'ambient') return '주변 소리: ' + (nm('biome.minecraft.' + p[1]) || thing(p[1]) || p[1]) + (p.length > 2 ? ' · ' + act(p.slice(2)) : '');
    if (p[0] === 'ui') return '화면: ' + (thing(p[1]) || p[1]) + ' ' + act(p.slice(2));
    const subj = p[1] ? thing(p[1]) : null;
    return (subj || p[1] || id) + (p.length > 2 ? ' · ' + act(p.slice(2)) : '');
  };
  const list = Object.keys(soundsJson).filter((id) => has(id, 0)).map((id) => {
    const sub = soundsJson[id].subtitle && name(soundsJson[id].subtitle);
    return { id, sub, name: sub || fallback(id) };
  });
  const count = {};
  list.forEach((s) => { count[s.name] = (count[s.name] || 0) + 1; });
  list.forEach((s) => {
    if (s.sub && count[s.sub] > 1) {
      const p = s.id.split('.');
      const subj = p[1] && thing(p[1]);
      const last = p[p.length - 1];
      if (subj && !s.sub.startsWith(subj)) s.name = subj + ' · ' + (p[0] === 'block' && SND_ACT[last] && p.length === 3 ? SND_ACT[last] : s.sub);
    }
    delete s.sub;
  });
  const again = {};
  list.forEach((s) => { again[s.name] = (again[s.name] || 0) + 1; });
  list.forEach((s) => {
    if (again[s.name] < 2) return;
    const p = s.id.split('.');
    const last = p[p.length - 1];
    const subj = p.length > 2 && thing(p[1]);
    if (subj && !s.name.startsWith(subj) && !s.name.includes(' · ')) s.name = subj + ' · ' + s.name;
    if (SND_ACT[last] && !s.name.endsWith(SND_ACT[last])) s.name += ' (' + SND_ACT[last] + ')';
  });
  const third = {};
  list.forEach((s) => { third[s.name] = (third[s.name] || 0) + 1; });
  list.forEach((s) => {
    if (third[s.name] < 2) return;
    const p = s.id.split('.');
    let tail;
    if (p[2] === 'imitate') tail = (thing(p[3]) || p[3]) + ' 흉내';
    else tail = p.slice(2).join('_').split('_').map((w) => SND_WORD[w] || SND_ACT[w] || w).join(' ');
    s.name = s.name.replace(/ \([^)]*\)$/, '') + ' (' + tail + ')';
  });
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

async function buildRaw(ver, log) {
  const vj = await versionJson(ver);
  const jar = await clientJar(ver, vj, log);
  const zip = readZip(jar);
  const en = JSON.parse((zip.read('assets/minecraft/lang/en_us.json') || Buffer.from('{}')).toString('utf8'));
  let ko = null;
  let soundsJson = {};
  let index = null;
  try {
    index = await assetIndex(vj);
    const k = await assetObject(index, 'minecraft/lang/ko_kr.json');
    if (k) ko = JSON.parse(k.toString('utf8'));
    const sj = await assetObject(index, 'minecraft/sounds.json');
    if (sj) soundsJson = JSON.parse(sj.toString('utf8'));
  } catch (e) { log('한국어 이름은 못 가져왔습니다 (영어로 보입니다): ' + e.message); }
  const name = (key) => (ko && ko[key]) || en[key] || null;

  const ids = new Set();
  const newStyle = [...zip.entries.keys()].some((k) => k.startsWith('assets/minecraft/items/'));
  zip.entries.forEach((e, k) => {
    const m = newStyle ? /^assets\/minecraft\/items\/([a-z0-9_]+)\.json$/.exec(k) : /^assets\/minecraft\/models\/item\/([a-z0-9_]+)\.json$/.exec(k);
    if (m && m[1] !== 'air' && (en['item.minecraft.' + m[1]] || en['block.minecraft.' + m[1]])) ids.add(m[1]);
  });
  const resolve = makeResolver(zip);
  const textures = {};
  const need = (t) => {
    if (!t || textures[t] !== undefined) return;
    const b = zip.read('assets/minecraft/textures/' + t + '.png');
    textures[t] = b ? b.toString('base64') : null;
  };
  const items = [];
  [...ids].sort().forEach((id) => {
    let modelName = 'item/' + id;
    if (newStyle) {
      try { modelName = itemModelName(JSON.parse(zip.read('assets/minecraft/items/' + id + '.json').toString('utf8'))) || modelName; } catch (e) {  }
    }
    let icon = null;
    try { icon = resolve(modelName, id); } catch (e) { icon = null; }
    if (icon && icon.flat) icon.flat.forEach(need);
    if (icon && icon.cube) Object.values(icon.cube).forEach(need);
    if (icon && icon.model) icon.model.elements.forEach((el) => Object.values(el.faces).forEach((f) => need(f.texture)));
    if (icon && icon.banner) { need(icon.banner); need('block/oak_planks'); }
    if (icon && icon.box) { need(icon.box.tex); if (!textures[icon.box.tex]) icon = null; }
    if (icon && icon.head) {
      const f = FACE[icon.head];
      const tex = f && [].concat(f[0]).find((t) => { need(t); return !!textures[t]; });
      icon = tex ? { face: { tex, x: f[1], y: f[2], w: f[3], h: f[4] } } : null;
    }
    const isBlock = !!en['block.minecraft.' + id];
    items.push({ id, name: name((isBlock ? 'block' : 'item') + '.minecraft.' + id) || name('item.minecraft.' + id) || id, block: isBlock, tab: creativeTab(id, isBlock), icon });
  });

  const entities = [];
  Object.keys(en).forEach((k) => {
    const m = /^entity\.minecraft\.([a-z_]+)$/.exec(k);
    if (!m) return;
    const id = m[1];
    if (!ids.has(id + '_spawn_egg') && !['iron_golem', 'snow_golem', 'wither', 'ender_dragon', 'giant', 'illusioner'].includes(id)) return;
    let face = null;
    const f = FACE[id];
    if (f) {
      const tex = [].concat(f[0]).find((t) => { need(t); return !!textures[t]; });
      if (tex) face = typeof f[1] === 'object' ? { tex, w: f[1].w, h: f[1].h, parts: f[1].parts } : { tex, x: f[1], y: f[2], w: f[3], h: f[4] };
    }
    const AS_ITEM = { cod: 'cod', salmon: 'salmon', pufferfish: 'pufferfish', tropical_fish: 'tropical_fish', tadpole: 'tadpole_bucket' };
    const egg = AS_ITEM[id] && ids.has(AS_ITEM[id]) ? AS_ITEM[id] : ids.has(id + '_spawn_egg') ? id + '_spawn_egg' : null;
    entities.push({ id, name: name(k) || id, face, egg });
  });
  const effects = [];
  Object.keys(en).forEach((k) => {
    const m = /^effect\.minecraft\.([a-z_]+)$/.exec(k);
    if (!m) return;
    const t = 'mob_effect/' + m[1];
    need(t);
    effects.push({ id: m[1], name: name(k) || m[1], tex: textures[t] ? t : null });
  });
  const enchants = [];
  Object.keys(en).forEach((k) => { const m = /^enchantment\.minecraft\.([a-z_]+)$/.exec(k); if (m) enchants.push({ id: m[1], name: name(k) || m[1] }); });
  const sounds = soundList(soundsJson, index, name);
  Object.keys(textures).forEach((k) => { if (!textures[k]) delete textures[k]; });
  const tabNames = {};
  TABS.forEach((t) => { tabNames[t] = name('itemGroup.' + t) || t; });
  return { version: ver, lang: ko ? 'ko' : 'en', tabs: TABS, tabNames, items, entities, effects, enchants, sounds, textures };
}

const CATALOG_VERSION = 7;
function cachedCatalog(ver) {
  const f = path.join(cacheDir(ver), 'catalog.json');
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    return c && c.format === CATALOG_VERSION ? c : null;
  } catch (e) { return null; }
}
function saveCatalog(ver, cat) {
  if (!cat || typeof cat !== 'object') return false;
  cat.format = CATALOG_VERSION;
  const text = JSON.stringify(cat);
  if (text.length > 30 * 1048576) return false;
  fs.writeFileSync(path.join(cacheDir(ver), 'catalog.json'), text);
  return true;
}

module.exports = { setBaseDir, buildRaw, cachedCatalog, saveCatalog, CATALOG_VERSION };
