
(function () {
  const LATEST_KNOWN = '1.21.4';

  function parse(v) {
    const m = /^1\.(\d+)(?:\.(\d+))?/.exec(String(v || ''));
    return m ? [1, +m[1], +(m[2] || 0)] : [99, 0, 0];
  }
  function cmp(a, b) {
    const x = parse(a), y = parse(b);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  }

  const MC = {
    version: LATEST_KNOWN,
    platform: 'paper',
    latestKnown: LATEST_KNOWN,
    cmp,
    set(v) { MC.version = v || LATEST_KNOWN; },
    atLeast(min) { return cmp(MC.version, min) >= 0; },
    ok(item) { return !item.since || cmp(MC.version, item.since) >= 0; },
    isNewerThanKnown() { return cmp(MC.version, LATEST_KNOWN) > 0; }
  };
  window.MC = MC;

  const MAT = {};
  const add = (group, list) => { MAT[group] = (MAT[group] || []).concat(list); };

  const tiers = [
    ['WOODEN', '나무'], ['STONE', '돌'], ['IRON', '철'],
    ['GOLDEN', '금'], ['DIAMOND', '다이아몬드'], ['NETHERITE', '네더라이트']
  ];
  const toolKinds = [['SWORD', '검'], ['PICKAXE', '곡괭이'], ['AXE', '도끼'], ['SHOVEL', '삽'], ['HOE', '괭이']];
  const armorTiers = [
    ['LEATHER', '가죽'], ['CHAINMAIL', '사슬'], ['IRON', '철'],
    ['GOLDEN', '금'], ['DIAMOND', '다이아몬드'], ['NETHERITE', '네더라이트']
  ];
  const armorKinds = [['HELMET', '투구'], ['CHESTPLATE', '갑옷'], ['LEGGINGS', '바지'], ['BOOTS', '신발']];

  const tools = [];
  toolKinds.forEach(([k, kn]) => tiers.forEach(([t, tn]) =>
    tools.push([t + '_' + k, tn + ' ' + kn, t === 'NETHERITE' ? '1.16' : ''])));
  add('무기·도구', tools);
  add('무기·도구', [
    ['BOW', '활'], ['CROSSBOW', '쇠뇌', '1.14'], ['TRIDENT', '삼지창'], ['ARROW', '화살'], ['SHIELD', '방패'],
    ['FISHING_ROD', '낚싯대'], ['FLINT_AND_STEEL', '부싯돌과 철'], ['SHEARS', '가위'], ['COMPASS', '나침반'],
    ['CLOCK', '시계'], ['SPYGLASS', '망원경', '1.17'], ['ELYTRA', '겉날개'], ['TOTEM_OF_UNDYING', '불사의 토템'],
    ['BUCKET', '양동이'], ['WATER_BUCKET', '물 양동이'], ['LAVA_BUCKET', '용암 양동이'],
    ['BRUSH', '솔', '1.20'], ['MACE', '철퇴', '1.21'], ['WIND_CHARGE', '윈드 차지', '1.21']
  ]);

  const armor = [];
  armorKinds.forEach(([k, kn]) => armorTiers.forEach(([t, tn]) =>
    armor.push([t + '_' + k, tn + ' ' + kn, t === 'NETHERITE' ? '1.16' : ''])));
  add('갑옷', armor);
  add('갑옷', [['TURTLE_HELMET', '거북 껍질'], ['WOLF_ARMOR', '늑대 갑옷', '1.20.5']]);

  add('광물·재료', [
    ['DIAMOND', '다이아몬드'], ['EMERALD', '에메랄드'], ['GOLD_INGOT', '금괴'], ['IRON_INGOT', '철괴'],
    ['COPPER_INGOT', '구리괴', '1.17'], ['NETHERITE_INGOT', '네더라이트 주괴', '1.16'], ['NETHERITE_SCRAP', '고대 잔해 조각', '1.16'],
    ['RAW_IRON', '철 원석', '1.17'], ['RAW_GOLD', '금 원석', '1.17'], ['RAW_COPPER', '구리 원석', '1.17'],
    ['COAL', '석탄'], ['CHARCOAL', '숯'], ['REDSTONE', '레드스톤 가루'], ['LAPIS_LAZULI', '청금석'],
    ['QUARTZ', '네더 석영'], ['AMETHYST_SHARD', '자수정 조각', '1.17'], ['IRON_NUGGET', '철 조각'], ['GOLD_NUGGET', '금 조각'],
    ['STICK', '막대기'], ['STRING', '실'], ['FEATHER', '깃털'], ['LEATHER', '가죽'], ['BONE', '뼈'],
    ['GUNPOWDER', '화약'], ['SLIME_BALL', '슬라임볼'], ['ENDER_PEARL', '엔더 진주'], ['ENDER_EYE', '엔더의 눈'],
    ['BLAZE_ROD', '블레이즈 막대'], ['BLAZE_POWDER', '블레이즈 가루'], ['GHAST_TEAR', '가스트의 눈물'],
    ['NETHER_STAR', '네더의 별'], ['EXPERIENCE_BOTTLE', '경험치 병'], ['PAPER', '종이'], ['BOOK', '책'],
    ['ENCHANTED_BOOK', '마법이 부여된 책'], ['NAME_TAG', '이름표'], ['SADDLE', '안장'], ['FIREWORK_ROCKET', '폭죽 로켓'],
    ['GLOW_INK_SAC', '발광 먹물 주머니', '1.17'], ['ECHO_SHARD', '반향 조각', '1.19'], ['GOAT_HORN', '염소 뿔', '1.19'],
    ['ARMADILLO_SCUTE', '아르마딜로 비늘', '1.20.5'], ['BREEZE_ROD', '브리즈 막대', '1.21'],
    ['DIAMOND_ORE', '다이아몬드 광석'], ['IRON_ORE', '철 광석'], ['GOLD_ORE', '금 광석'], ['COAL_ORE', '석탄 광석'],
    ['EMERALD_ORE', '에메랄드 광석'], ['REDSTONE_ORE', '레드스톤 광석'], ['LAPIS_ORE', '청금석 광석'],
    ['COPPER_ORE', '구리 광석', '1.17'], ['DEEPSLATE_DIAMOND_ORE', '심층암 다이아몬드 광석', '1.17'],
    ['ANCIENT_DEBRIS', '고대 잔해', '1.16']
  ]);

  add('음식', [
    ['APPLE', '사과'], ['GOLDEN_APPLE', '황금 사과'], ['ENCHANTED_GOLDEN_APPLE', '마법이 부여된 황금 사과'],
    ['GOLDEN_CARROT', '황금 당근'], ['BREAD', '빵'], ['COOKED_BEEF', '익힌 소고기(스테이크)'],
    ['COOKED_PORKCHOP', '익힌 돼지고기'], ['COOKED_CHICKEN', '익힌 닭고기'], ['COOKED_MUTTON', '익힌 양고기'],
    ['COOKED_SALMON', '익힌 연어'], ['COOKED_COD', '익힌 대구'], ['BEEF', '날 소고기'], ['PORKCHOP', '날 돼지고기'],
    ['CARROT', '당근'], ['POTATO', '감자'], ['BAKED_POTATO', '구운 감자'], ['MELON_SLICE', '수박 조각'],
    ['COOKIE', '쿠키'], ['PUMPKIN_PIE', '호박 파이'], ['CAKE', '케이크'], ['MILK_BUCKET', '우유 양동이'],
    ['SWEET_BERRIES', '달콤한 열매', '1.14'], ['GLOW_BERRIES', '발광 열매', '1.17'], ['DRIED_KELP', '말린 켈프'],
    ['HONEY_BOTTLE', '꿀 병', '1.15'], ['MUSHROOM_STEW', '버섯 스튜'], ['WHEAT', '밀'], ['SUGAR', '설탕'], ['POTION', '물약']
  ]);

  add('메뉴 장식', [
    ['GRAY_STAINED_GLASS_PANE', '회색 색유리판'], ['BLACK_STAINED_GLASS_PANE', '검은색 색유리판'], ['WHITE_STAINED_GLASS_PANE', '흰색 색유리판'],
    ['LIGHT_GRAY_STAINED_GLASS_PANE', '연회색 색유리판'], ['LIME_STAINED_GLASS_PANE', '연두색 색유리판'], ['RED_STAINED_GLASS_PANE', '빨간색 색유리판'],
    ['YELLOW_STAINED_GLASS_PANE', '노란색 색유리판'], ['LIGHT_BLUE_STAINED_GLASS_PANE', '하늘색 색유리판'], ['GLASS_PANE', '유리판'],
    ['OAK_SIGN', '참나무 표지판'], ['ARROW', '화살'], ['CLOCK', '시계'], ['COMPASS', '나침반'], ['PLAYER_HEAD', '플레이어 머리'], ['EMERALD', '에메랄드'], ['GOLD_INGOT', '금괴']
  ]);

  add('블록', [
    ['STONE', '돌'], ['COBBLESTONE', '조약돌'], ['DIRT', '흙'], ['GRASS_BLOCK', '잔디 블록'], ['SAND', '모래'],
    ['GRAVEL', '자갈'], ['GLASS', '유리'], ['OAK_LOG', '참나무 원목'], ['OAK_PLANKS', '참나무 판자'],
    ['BRICKS', '벽돌'], ['OBSIDIAN', '흑요석'], ['BEDROCK', '기반암'], ['TNT', 'TNT'], ['GLOWSTONE', '발광석'],
    ['SEA_LANTERN', '바다 랜턴'], ['BOOKSHELF', '책장'], ['CRAFTING_TABLE', '제작대'], ['FURNACE', '화로'],
    ['CHEST', '상자'], ['ENDER_CHEST', '엔더 상자'], ['ANVIL', '모루'], ['ENCHANTING_TABLE', '마법 부여대'],
    ['BEACON', '신호기'], ['SPAWNER', '몬스터 스포너'], ['COMMAND_BLOCK', '명령 블록'], ['BARRIER', '배리어'],
    ['DIAMOND_BLOCK', '다이아몬드 블록'], ['GOLD_BLOCK', '금 블록'], ['IRON_BLOCK', '철 블록'],
    ['EMERALD_BLOCK', '에메랄드 블록'], ['NETHERITE_BLOCK', '네더라이트 블록', '1.16'], ['COAL_BLOCK', '석탄 블록'],
    ['LAPIS_BLOCK', '청금석 블록'], ['REDSTONE_BLOCK', '레드스톤 블록'], ['QUARTZ_BLOCK', '석영 블록'],
    ['COPPER_BLOCK', '구리 블록', '1.17'], ['AMETHYST_BLOCK', '자수정 블록', '1.17'], ['ICE', '얼음'], ['SNOW_BLOCK', '눈 블록'],
    ['HAY_BLOCK', '건초 더미'], ['SLIME_BLOCK', '슬라임 블록'], ['HONEY_BLOCK', '꿀 블록', '1.15'], ['SPONGE', '스펀지'],
    ['PUMPKIN', '호박'], ['MELON', '수박'], ['JACK_O_LANTERN', '잭오랜턴'], ['NETHERRACK', '네더랙'],
    ['END_STONE', '엔드 스톤'], ['SOUL_SAND', '영혼 모래'], ['MAGMA_BLOCK', '마그마 블록'],
    ['WHITE_WOOL', '흰색 양털'], ['RED_WOOL', '빨간색 양털'], ['BLUE_WOOL', '파란색 양털'],
    ['COBWEB', '거미줄'], ['TORCH', '횃불'], ['LADDER', '사다리'], ['OAK_DOOR', '참나무 문'],
    ['OAK_SIGN', '참나무 표지판', '1.14'], ['WHITE_BED', '흰색 침대'], ['PISTON', '피스톤'], ['STICKY_PISTON', '끈끈이 피스톤'],
    ['DISPENSER', '발사기'], ['HOPPER', '호퍼'], ['LEVER', '레버'], ['REDSTONE_TORCH', '레드스톤 횃불'],
    ['MINECART', '광산 수레'], ['OAK_BOAT', '참나무 보트'], ['POPPY', '양귀비'], ['DANDELION', '민들레'],
    ['CRYING_OBSIDIAN', '우는 흑요석', '1.16'], ['BLACKSTONE', '흑석', '1.16'], ['LODESTONE', '자석석', '1.16'],
    ['RESPAWN_ANCHOR', '리스폰 정박기', '1.16'],
    ['DEEPSLATE', '심층암', '1.17'], ['TUFF', '응회암', '1.17'], ['CALCITE', '방해석', '1.17'],
    ['LIGHTNING_ROD', '피뢰침', '1.17'],
    ['MANGROVE_LOG', '맹그로브 원목', '1.19'], ['SCULK', '스컬크', '1.19'],
    ['CHERRY_LOG', '벚나무 원목', '1.20'], ['CHERRY_PLANKS', '벚나무 판자', '1.20'],
    ['CRAFTER', '제작기', '1.21'], ['TRIAL_SPAWNER', '시련 스포너', '1.21'], ['HEAVY_CORE', '무거운 코어', '1.21'],
    ['PALE_OAK_LOG', '창백한 참나무 원목', '1.21.4'], ['RESIN_BLOCK', '수지 블록', '1.21.4'],
    ['CREAKING_HEART', '크리킹 심장', '1.21.4']
  ]);

  const item = (v, k, g, since, old, until) =>
    ({ v, k, g, since: since || '', old: old || '', until: until || '' });
  const flat = (obj) => {
    const out = [];
    Object.keys(obj).forEach((g) => obj[g].forEach(([v, k, since, old, until]) => out.push(item(v, k, g, since, old, until))));
    return out;
  };
  const mk = (list, g) => list.map(([v, k, since, old, until]) => item(v, k, g, since, old, until));

  const CUSTOM_ID = /^[A-Z][A-Z0-9_]*$/;

  window.SLOT_TYPES = {
    material: {
      kind: 'choice',
      title: '아이템·블록 고르기',
      items: flat(MAT),
      custom: CUSTOM_ID,
      customHint: '목록에 없으면 영어 이름을 직접 씁니다 (예: BRUSH)'
    },
    sound: {
      kind: 'choice',
      title: '소리 고르기',
      custom: CUSTOM_ID,
      customHint: '목록에 없으면 영어 이름을 직접 씁니다',
      items: mk([
        ['ENTITY_PLAYER_LEVELUP', '레벨업'], ['ENTITY_EXPERIENCE_ORB_PICKUP', '경험치 먹는 소리'],
        ['UI_TOAST_CHALLENGE_COMPLETE', '도전 과제 완료'], ['ENTITY_FIREWORK_ROCKET_BLAST', '폭죽 터지는 소리'],
        ['BLOCK_NOTE_BLOCK_PLING', '음표 블록 (띵)'], ['BLOCK_NOTE_BLOCK_BELL', '음표 블록 (종소리)'],
        ['BLOCK_ANVIL_LAND', '모루 떨어지는 소리'], ['BLOCK_CHEST_OPEN', '상자 열리는 소리'],
        ['BLOCK_BEACON_ACTIVATE', '신호기 켜지는 소리'], ['ENTITY_ITEM_PICKUP', '아이템 줍는 소리'],
        ['ENTITY_ENDERMAN_TELEPORT', '엔더맨 순간이동'], ['ENTITY_GENERIC_EXPLODE', '폭발'],
        ['ENTITY_LIGHTNING_BOLT_THUNDER', '천둥'], ['ENTITY_ENDER_DRAGON_GROWL', '엔더 드래곤 울음'],
        ['ENTITY_WITHER_SPAWN', '위더 소환'], ['ENTITY_VILLAGER_YES', '주민 "네"'], ['ENTITY_VILLAGER_NO', '주민 "아니오"'],
        ['ENTITY_ARROW_HIT_PLAYER', '화살 맞는 소리(딩)'], ['ENTITY_PLAYER_HURT', '플레이어 아야'],
        ['ENTITY_PLAYER_BURP', '트림'], ['ENTITY_CAT_AMBIENT', '고양이 야옹'], ['ENTITY_CHICKEN_EGG', '닭이 알 낳는 소리'],
        ['ENTITY_ZOMBIE_AMBIENT', '좀비 신음'], ['ITEM_TOTEM_USE', '불사의 토템 쓰는 소리'],
        ['ENTITY_PLAYER_ATTACK_CRIT', '치명타 소리'], ['ENTITY_CREEPER_PRIMED', '크리퍼 치지직'],
        ['BLOCK_AMETHYST_BLOCK_CHIME', '자수정 맑은 소리', '1.17'],
        ['ENTITY_ALLAY_ITEM_GIVEN', '알레이가 아이템 받는 소리', '1.19'],
        ['ENTITY_WARDEN_ROAR', '워든 포효', '1.19'], ['ENTITY_WARDEN_SONIC_BOOM', '워든 음파 공격', '1.19'],
        ['ITEM_MACE_SMASH_GROUND', '철퇴 내려치는 소리', '1.21']
      ], '소리')
    },
    effect: {
      kind: 'choice',
      title: '효과 고르기',
      custom: CUSTOM_ID,
      customHint: '목록에 없으면 영어 이름을 직접 씁니다',
      items: mk([
        ['SPEED', '신속'], ['SLOWNESS', '구속(느려짐)', '', 'SLOW', '1.20.5'],
        ['HASTE', '성급함', '', 'FAST_DIGGING', '1.20.5'], ['MINING_FATIGUE', '채굴 피로', '', 'SLOW_DIGGING', '1.20.5'],
        ['STRENGTH', '힘', '', 'INCREASE_DAMAGE', '1.20.5'], ['JUMP_BOOST', '점프 강화', '', 'JUMP', '1.20.5'],
        ['REGENERATION', '재생'], ['RESISTANCE', '저항', '', 'DAMAGE_RESISTANCE', '1.20.5'],
        ['FIRE_RESISTANCE', '화염 저항'], ['WATER_BREATHING', '수중 호흡'], ['INVISIBILITY', '투명화'],
        ['NIGHT_VISION', '야간 투시'], ['BLINDNESS', '실명'], ['NAUSEA', '멀미', '', 'CONFUSION', '1.20.5'],
        ['HUNGER', '허기'], ['WEAKNESS', '나약함'], ['POISON', '독'], ['WITHER', '시듦'], ['ABSORPTION', '흡수'],
        ['SATURATION', '포화'], ['GLOWING', '발광'], ['LEVITATION', '공중 부양'], ['LUCK', '행운'],
        ['SLOW_FALLING', '느린 낙하'], ['INSTANT_HEALTH', '즉시 회복', '', 'HEAL', '1.20.5'],
        ['INSTANT_DAMAGE', '즉시 피해', '', 'HARM', '1.20.5'], ['HEALTH_BOOST', '생명력 강화'], ['UNLUCK', '불운'],
        ['DOLPHINS_GRACE', '돌고래의 가호'], ['CONDUIT_POWER', '전달체 능력'],
        ['HERO_OF_THE_VILLAGE', '마을의 영웅', '1.14'], ['DARKNESS', '어둠', '1.19'],
        ['WIND_CHARGED', '바람 충전', '1.21'], ['WEAVING', '거미줄 짜기', '1.21'],
        ['OOZING', '점액 분출', '1.21'], ['INFESTED', '벌레 감염', '1.21']
      ], '효과')
    },
    entity: {
      kind: 'choice',
      title: '몹 고르기',
      custom: CUSTOM_ID,
      customHint: '목록에 없으면 영어 이름을 직접 씁니다',
      items: [].concat(
        mk([['ZOMBIE', '좀비'], ['SKELETON', '스켈레톤'], ['CREEPER', '크리퍼'], ['SPIDER', '거미'],
            ['ENDERMAN', '엔더맨'], ['WITCH', '마녀'], ['SLIME', '슬라임'], ['BLAZE', '블레이즈'],
            ['GHAST', '가스트'], ['WITHER_SKELETON', '위더 스켈레톤'], ['PIGLIN', '피글린', '1.16'],
            ['HOGLIN', '호글린', '1.16'], ['DROWNED', '드라운드'], ['PHANTOM', '팬텀'],
            ['PILLAGER', '약탈자', '1.14'], ['RAVAGER', '파괴수', '1.14'],
            ['WARDEN', '워든', '1.19'], ['BREEZE', '브리즈', '1.21'], ['BOGGED', '보그드', '1.21'],
            ['CREAKING', '크리킹', '1.21.4']], '적대적'),
        mk([['COW', '소'], ['PIG', '돼지'], ['SHEEP', '양'], ['CHICKEN', '닭'], ['HORSE', '말'],
            ['WOLF', '늑대'], ['CAT', '고양이'], ['FOX', '여우', '1.14'], ['PANDA', '팝니다', '1.14'], ['BEE', '벌', '1.15'],
            ['RABBIT', '토끼'], ['PARROT', '앵무새'], ['LLAMA', '라마'], ['VILLAGER', '주민'],
            ['IRON_GOLEM', '철 골렘'], ['SQUID', '오징어'], ['DOLPHIN', '돌고래'], ['BAT', '박쥐'],
            ['TURTLE', '바다거북'], ['STRIDER', '스트라이더', '1.16'],
            ['SNOW_GOLEM', '눈 골렘', '', 'SNOWMAN', '1.20.5'], ['MOOSHROOM', '무시룸', '', 'MUSHROOM_COW', '1.20.5'],
            ['AXOLOTL', '아홀로틀', '1.17'], ['GLOW_SQUID', '발광 오징어', '1.17'], ['GOAT', '염소', '1.17'],
            ['ALLAY', '알레이', '1.19'], ['FROG', '개구리', '1.19'],
            ['CAMEL', '낙타', '1.20'], ['SNIFFER', '스니퍼', '1.20'], ['ARMADILLO', '아르마딜로', '1.20.5']], '착한 친구들')
      )
    },
    gamemode: {
      kind: 'choice',
      title: '게임모드 고르기',
      items: mk([['SURVIVAL', '서바이벌'], ['CREATIVE', '크리에이티브'], ['ADVENTURE', '모험'], ['SPECTATOR', '관전']], '')
    },
    onoff: {
      kind: 'choice',
      title: '켜기 / 끄기',
      items: mk([['true', '켜기'], ['false', '끄기']], '')
    },
    daytime: {
      kind: 'choice',
      title: '시간대 고르기',
      custom: /^\d{1,6}$/,
      customHint: '직접 숫자를 쓸 수도 있습니다 (0~24000)',
      items: mk([['1000', '아침'], ['6000', '정오'], ['12000', '해질녘'], ['13000', '밤'], ['18000', '한밤중']], '')
    },

    text:    { kind: 'input', placeholder: '글자' },
    word:    { kind: 'input', placeholder: 'abc', hint: '영어 소문자와 숫자만 쓸 수 있습니다' },
    number:  { kind: 'input', placeholder: '0' },
    int:     { kind: 'input', placeholder: '1', unit: '' },
    seconds: { kind: 'input', placeholder: '1', unit: '초' },
    level:   { kind: 'input', placeholder: '1', unit: '단계' }
  };


  Object.assign(window.SLOT_TYPES, {
    particle: {
      kind: 'choice', title: '파티클(입자 효과) 고르기', custom: CUSTOM_ID,
      customHint: '목록에 없으면 영어 이름을 직접 씁니다 (일부 파티클은 추가 설정이 필요합니다)',
      items: mk([
        ['HEART', '하트'], ['FLAME', '불꽃'], ['CRIT', '치명타 별'], ['NOTE', '음표'], ['PORTAL', '포탈 입자'],
        ['END_ROD', '엔드 막대 빛'], ['CLOUD', '구름'], ['LAVA', '용암 방울'], ['SWEEP_ATTACK', '휘두르기'],
        ['DAMAGE_INDICATOR', '피해 하트'],
        ['HAPPY_VILLAGER', '반짝이는 초록 별', '', 'VILLAGER_HAPPY', '1.20.5'],
        ['ANGRY_VILLAGER', '화난 주민', '', 'VILLAGER_ANGRY', '1.20.5'],
        ['SMOKE', '연기', '', 'SMOKE_NORMAL', '1.20.5'], ['POOF', '퐁(하얀 연기)', '', 'EXPLOSION_NORMAL', '1.20.5'],
        ['EXPLOSION', '폭발', '', 'EXPLOSION_LARGE', '1.20.5'],
        ['EXPLOSION_EMITTER', '큰 폭발', '', 'EXPLOSION_HUGE', '1.20.5'],
        ['ENCHANT', '마법 글자', '', 'ENCHANTMENT_TABLE', '1.20.5'], ['FIREWORK', '폭죽 불꽃', '', 'FIREWORKS_SPARK', '1.20.5'],
        ['WITCH', '마녀 보라색 입자', '', 'SPELL_WITCH', '1.20.5'], ['SPLASH', '물 튀김', '', 'WATER_SPLASH', '1.20.5'],
        ['TOTEM_OF_UNDYING', '불사의 토템', '', 'TOTEM', '1.20.5'],
        ['ENCHANTED_HIT', '마법 타격', '', 'CRIT_MAGIC', '1.20.5'], ['BUBBLE', '물방울', '', 'WATER_BUBBLE', '1.20.5'],
        ['SNOWFLAKE', '눈송이', '1.17'], ['GLOW', '반짝임', '1.17'], ['SCULK_SOUL', '스컬크 영혼', '1.19'],
        ['CHERRY_LEAVES', '벚꽃잎', '1.20']
      ], '파티클')
    },
    enchant: {
      kind: 'choice', title: '마법 부여 고르기', custom: /^[a-z][a-z0-9_]*$/,
      customHint: '목록에 없으면 영어 소문자 이름을 직접 씁니다 (예: sweeping_edge)',
      items: mk([
        ['sharpness', '날카로움'], ['smite', '강타'], ['bane_of_arthropods', '살충'], ['knockback', '밀치기'],
        ['fire_aspect', '발화'], ['looting', '약탈'], ['efficiency', '효율'], ['silk_touch', '섬세한 손길'],
        ['unbreaking', '내구성'], ['fortune', '행운'], ['power', '힘(활)'], ['punch', '밀어내기(활)'],
        ['flame', '화염(활)'], ['infinity', '무한'], ['luck_of_the_sea', '바다의 행운'], ['lure', '미끼'],
        ['mending', '수선'], ['protection', '보호'], ['fire_protection', '화염 보호'], ['feather_falling', '가벼운 착지'],
        ['blast_protection', '폭발 보호'], ['projectile_protection', '발사체 보호'], ['respiration', '호흡'],
        ['aqua_affinity', '친수성'], ['thorns', '가시'], ['depth_strider', '물갈퀴'], ['frost_walker', '차가운 걸음'],
        ['channeling', '번개'], ['loyalty', '충성'], ['riptide', '급류'], ['impaling', '찌르기'],
        ['multishot', '다중 발사'], ['quick_charge', '빠른 장전'], ['piercing', '관통'],
        ['soul_speed', '영혼 가속', '1.16'], ['swift_sneak', '신속 잠행', '1.19']
      ], '마법')
    },
    chatcolor: {
      kind: 'choice', title: '글자 색 고르기',
      items: mk([['RED', '빨강'], ['GOLD', '금색'], ['YELLOW', '노랑'], ['GREEN', '연두'], ['DARK_GREEN', '초록'],
        ['AQUA', '하늘'], ['DARK_AQUA', '청록'], ['BLUE', '파랑'], ['DARK_BLUE', '남색'], ['LIGHT_PURPLE', '분홍'],
        ['DARK_PURPLE', '보라'], ['WHITE', '흰색'], ['GRAY', '회색'], ['DARK_GRAY', '진회색'], ['BLACK', '검정'],
        ['DARK_RED', '진빨강']], '')
    },
    color: {
      kind: 'choice', title: '색 고르기',
      items: mk([['RED', '빨강'], ['ORANGE', '주황'], ['YELLOW', '노랑'], ['LIME', '연두'], ['GREEN', '초록'],
        ['AQUA', '하늘'], ['BLUE', '파랑'], ['PURPLE', '보라'], ['FUCHSIA', '분홍'], ['WHITE', '흰색'], ['GRAY', '회색'],
        ['BLACK', '검정'], ['MAROON', '밤색'], ['NAVY', '남색'], ['OLIVE', '올리브'], ['SILVER', '은색'],
        ['TEAL', '청록']], '')
    },
    barcolor: {
      kind: 'choice', title: '보스바 색 고르기',
      items: mk([['PINK', '분홍'], ['BLUE', '파랑'], ['RED', '빨강'], ['GREEN', '초록'], ['YELLOW', '노랑'],
        ['PURPLE', '보라'], ['WHITE', '흰색']], '')
    },
    barstyle: {
      kind: 'choice', title: '보스바 모양 고르기',
      items: mk([['SOLID', '꽉 찬 막대'], ['SEGMENTED_6', '6칸'], ['SEGMENTED_10', '10칸'], ['SEGMENTED_12', '12칸'],
        ['SEGMENTED_20', '20칸']], '')
    },
    difficulty: {
      kind: 'choice', title: '난이도 고르기',
      items: mk([['PEACEFUL', '평화로움'], ['EASY', '쉬움'], ['NORMAL', '보통'], ['HARD', '어려움']], '')
    },
    blockface: {
      kind: 'choice', title: '방향 고르기',
      items: mk([['UP', '위'], ['DOWN', '아래'], ['NORTH', '북쪽'], ['SOUTH', '남쪽'], ['EAST', '동쪽'], ['WEST', '서쪽']], '')
    },
    projectile: {
      kind: 'choice', title: '던질 것 고르기',
      items: mk([['Snowball', '눈덩이'], ['Arrow', '화살'], ['Egg', '달걀'], ['Fireball', '화염구'],
        ['SmallFireball', '작은 화염구'], ['EnderPearl', '엔더 진주'], ['WitherSkull', '위더 해골']], '')
    },
    damagecause: {
      kind: 'choice', title: '피해 원인 고르기',
      items: mk([['FALL', '낙하'], ['FIRE', '불'], ['FIRE_TICK', '불 붙어서 타는 중'], ['LAVA', '용암'], ['DROWNING', '익사'],
        ['VOID', '공허(낭떠러지)'], ['LIGHTNING', '번개'], ['ENTITY_ATTACK', '몹/플레이어의 공격'], ['PROJECTILE', '화살 등 발사체'],
        ['BLOCK_EXPLOSION', '블록 폭발'], ['ENTITY_EXPLOSION', '몹 폭발(크리퍼 등)'], ['STARVATION', '굶주림'], ['POISON', '독'],
        ['SUFFOCATION', '질식'], ['CONTACT', '선인장 등 닿음'], ['MAGIC', '마법'], ['WITHER', '시듦'],
        ['FLY_INTO_WALL', '겉날개로 벽 충돌'], ['THORNS', '가시']], '')
    },
    fwtype: {
      kind: 'choice', title: '폭죽 모양 고르기',
      items: mk([['BALL', '동그란 공'], ['BALL_LARGE', '큰 공'], ['STAR', '별'], ['BURST', '터지는 모양'],
        ['CREEPER', '크리퍼 얼굴']], '')
    },
    mccmd: {
      kind: 'choice', title: '마크 명령어 고르기',
      items: [].concat(
        mk([['give', '아이템 주기  (예: @p diamond 3)'], ['clear', '인벤토리 비우기  (예: @p)'], ['item', '아이템 칸 바꾸기', '1.17'], ['enchant', '마법 부여  (예: @p sharpness 5)'],
          ['effect', '효과 주기  (예: give @p speed 10 1)'], ['experience', '경험치  (예: add @p 5 levels)'], ['xp', '경험치 (짧게)'], ['gamemode', '게임모드  (예: creative @p)'],
          ['kill', '죽이기  (예: @e[type=zombie])'], ['damage', '피해 주기', '1.19.4'], ['attribute', '능력치 바꾸기', '1.16'], ['spawnpoint', '부활 지점 정하기'],
          ['teleport', '순간이동  (예: @p 0 64 0)'], ['tp', '순간이동 (짧게)'], ['spreadplayers', '여기저기 흩뿌리기'], ['ride', '타기 · 내리기', '1.19.4'],
          ['spectate', '관전하기', '1.15'], ['rotate', '바라보는 방향 돌리기', '1.21.2'], ['transfer', '다른 서버로 보내기', '1.20.5']], '플레이어'),
        mk([['say', '모두에게 말하기'], ['tellraw', '꾸민 글 보내기 (JSON)'], ['title', '화면 큰 글씨  (예: @a title "안녕")'], ['msg', '귓속말'], ['tell', '귓속말 (다른 이름)'],
          ['me', '행동 말하기'], ['teammsg', '팀에게 말하기', '1.14'], ['bossbar', '보스바'], ['playsound', '소리 내기'], ['stopsound', '소리 멈추기'],
          ['particle', '파티클'], ['dialog', '대화창 띄우기', '1.21.6'], ['waypoint', '길 안내 표시', '1.21.6']], '말 · 화면 · 소리'),
        mk([['setblock', '블록 놓기  (예: 0 64 0 stone)'], ['fill', '블록 채우기'], ['clone', '블록 복사'], ['fillbiome', '생물 군계 채우기', '1.19.3'],
          ['place', '구조물 · 지형 놓기', '1.19'], ['summon', '소환하기  (예: zombie ~ ~ ~)'], ['time', '시간  (예: set day)'], ['weather', '날씨  (예: clear)'],
          ['gamerule', '게임 규칙'], ['difficulty', '난이도'], ['worldborder', '월드 경계'], ['setworldspawn', '월드 스폰 정하기'], ['locate', '구조물 찾기'],
          ['forceload', '청크 늘 켜 두기'], ['tick', '시간 흐름 바꾸기', '1.20.3'], ['loot', '전리품 주기'], ['seed', '월드 시드 보기']], '월드'),
        mk([['scoreboard', '점수판'], ['team', '팀'], ['tag', '태그 붙이기'], ['trigger', '트리거'], ['advancement', '발전과제'], ['recipe', '제작법 알려주기 · 뺏기'],
          ['data', '데이터(NBT) 바꾸기'], ['execute', '조건 · 위치 바꿔 실행'], ['function', '함수(데이터팩) 실행'], ['schedule', '예약 실행'],
          ['random', '무작위 숫자', '1.20.2'], ['datapack', '데이터팩 켜기 · 끄기']], '점수 · 데이터'),
        mk([['kick', '내보내기'], ['ban', '차단하기'], ['ban-ip', 'IP 차단'], ['pardon', '차단 풀기'], ['pardon-ip', 'IP 차단 풀기'], ['banlist', '차단 목록'],
          ['op', '관리자 주기'], ['deop', '관리자 빼기'], ['whitelist', '화이트리스트'], ['list', '접속자 목록'], ['defaultgamemode', '기본 게임모드'],
          ['setidletimeout', '잠수 시간 정하기'], ['save-all', '월드 저장'], ['reload', '데이터팩 다시 읽기']], '서버 관리')
      )
    },
    gamerule: {
      kind: 'choice', title: '게임 규칙 고르기',
      items: mk([['DO_DAYLIGHT_CYCLE', '낮밤이 흐르게'], ['DO_MOB_SPAWNING', '몹이 자연 생성되게'],
        ['KEEP_INVENTORY', '죽어도 인벤토리 유지'], ['MOB_GRIEFING', '몹이 블록을 부수게'], ['DO_FIRE_TICK', '불이 번지게'],
        ['DO_WEATHER_CYCLE', '날씨가 바뀌게'], ['ANNOUNCE_ADVANCEMENTS', '발전과제 알림'],
        ['SHOW_DEATH_MESSAGES', '사망 메시지 보이기'], ['NATURAL_REGENERATION', '체력 자연 회복'],
        ['DO_IMMEDIATE_RESPAWN', '즉시 부활', '1.15']], '')
    }
  });

  const CLASS_TYPE = { Material: 'material', Sound: 'sound', PotionEffectType: 'effect', EntityType: 'entity', Particle: 'particle' };
  const CLASS_RE = '\\b(' + Object.keys(CLASS_TYPE).join('|') + ')\\.([A-Z][A-Z0-9_]*)\\b';

  const INDEX = {};
  MC.find = function (type, name) {
    let ix = INDEX[type];
    if (!ix) {
      const T = window.SLOT_TYPES[type];
      if (!T || !T.items) return undefined;
      ix = INDEX[type] = { cur: new Map(), old: new Map() };
      T.items.forEach((it) => {
        if (!ix.cur.has(it.v)) ix.cur.set(it.v, it);
        if (it.old && !ix.old.has(it.old)) ix.old.set(it.old, it);
      });
    }
    return ix.cur.get(name) || ix.old.get(name);
  };

  MC.resolve = function (type, value) {
    const it = MC.find(type, value);
    if (it && it.old && cmp(MC.version, it.until) < 0) return it.old;
    return it ? it.v : value;
  };

  const ATTR_RENAME_FROM = '1.21.2';
  const ATTR_PAIRS = [
    ['GENERIC_ARMOR', 'ARMOR'], ['GENERIC_ARMOR_TOUGHNESS', 'ARMOR_TOUGHNESS'],
    ['GENERIC_ATTACK_DAMAGE', 'ATTACK_DAMAGE'], ['GENERIC_ATTACK_KNOCKBACK', 'ATTACK_KNOCKBACK'],
    ['GENERIC_ATTACK_SPEED', 'ATTACK_SPEED'], ['GENERIC_BURNING_TIME', 'BURNING_TIME'],
    ['GENERIC_EXPLOSION_KNOCKBACK_RESISTANCE', 'EXPLOSION_KNOCKBACK_RESISTANCE'],
    ['GENERIC_FALL_DAMAGE_MULTIPLIER', 'FALL_DAMAGE_MULTIPLIER'], ['GENERIC_FLYING_SPEED', 'FLYING_SPEED'],
    ['GENERIC_FOLLOW_RANGE', 'FOLLOW_RANGE'], ['GENERIC_GRAVITY', 'GRAVITY'],
    ['GENERIC_JUMP_STRENGTH', 'JUMP_STRENGTH'], ['GENERIC_KNOCKBACK_RESISTANCE', 'KNOCKBACK_RESISTANCE'],
    ['GENERIC_LUCK', 'LUCK'], ['GENERIC_MAX_ABSORPTION', 'MAX_ABSORPTION'], ['GENERIC_MAX_HEALTH', 'MAX_HEALTH'],
    ['GENERIC_MOVEMENT_EFFICIENCY', 'MOVEMENT_EFFICIENCY'], ['GENERIC_MOVEMENT_SPEED', 'MOVEMENT_SPEED'],
    ['GENERIC_OXYGEN_BONUS', 'OXYGEN_BONUS'], ['GENERIC_SAFE_FALL_DISTANCE', 'SAFE_FALL_DISTANCE'],
    ['GENERIC_SCALE', 'SCALE'], ['GENERIC_STEP_HEIGHT', 'STEP_HEIGHT'],
    ['GENERIC_WATER_MOVEMENT_EFFICIENCY', 'WATER_MOVEMENT_EFFICIENCY'],
    ['PLAYER_BLOCK_BREAK_SPEED', 'BLOCK_BREAK_SPEED'], ['PLAYER_BLOCK_INTERACTION_RANGE', 'BLOCK_INTERACTION_RANGE'],
    ['PLAYER_ENTITY_INTERACTION_RANGE', 'ENTITY_INTERACTION_RANGE'], ['PLAYER_MINING_EFFICIENCY', 'MINING_EFFICIENCY'],
    ['PLAYER_SNEAKING_SPEED', 'SNEAKING_SPEED'], ['PLAYER_SUBMERGED_MINING_SPEED', 'SUBMERGED_MINING_SPEED'],
    ['PLAYER_SWEEPING_DAMAGE_RATIO', 'SWEEPING_DAMAGE_RATIO'], ['ZOMBIE_SPAWN_REINFORCEMENTS', 'SPAWN_REINFORCEMENTS']
  ];
  const ATTR_OLD_TO_NEW = {};
  const ATTR_NEW_TO_OLD = {};
  ATTR_PAIRS.forEach(([o, n]) => { ATTR_OLD_TO_NEW[o] = n; ATTR_NEW_TO_OLD[n] = o; });

  MC.convert = function (code) {
    let count = 0;
    let out = String(code).replace(new RegExp(CLASS_RE, 'g'), (m, cls, name) => {
      const it = MC.find(CLASS_TYPE[cls], name);
      if (!it) return m;
      const want = MC.resolve(CLASS_TYPE[cls], it.v);
      if (want === name) return m;
      count++;
      return cls + '.' + want;
    });
    out = out.replace(/\bAttribute\.([A-Z][A-Z0-9_]*)\b/g, (m, name) => {
      const modern = ATTR_OLD_TO_NEW[name] || (ATTR_NEW_TO_OLD[name] ? name : '');
      if (!modern) return m;
      const want = cmp(MC.version, ATTR_RENAME_FROM) < 0 ? ATTR_NEW_TO_OLD[modern] : modern;
      if (want === name) return m;
      count++;
      return 'Attribute.' + want;
    });
    return { code: out, count };
  };

  MC.unavailable = function (code) {
    const out = [];
    String(code).split('\n').forEach((raw, i) => {
      const text = raw.replace(/\/\/.*$/, '');
      const re = new RegExp(CLASS_RE, 'g');
      let m;
      while ((m = re.exec(text))) {
        const it = MC.find(CLASS_TYPE[m[1]], m[2]);
        if (it && !MC.ok(it)) out.push({ line: i + 1, name: m[1] + '.' + m[2], since: it.since, label: it.k });
      }
    });
    return out;
  };
})();
