
(function (root) {
  function b(type, fields, inputs, body, elseBody) {
    const blk = { type };
    if (fields) blk.fields = fields;
    const ins = {};
    Object.keys(inputs || {}).forEach((k) => { ins[k] = inputs[k]; });
    if (body && body.length) ins.DO = { block: stack(body) };
    if (elseBody && elseBody.length) ins.ELSE = { block: stack(elseBody) };
    if (Object.keys(ins).length) blk.inputs = ins;
    return blk;
  }
  function stack(list) {
    for (let i = 0; i < list.length - 1; i++) list[i].next = { block: list[i + 1] };
    return list[0];
  }
  const blk = (x) => ({ block: x });
  const P = { shadow: { type: 'pm_player' } };
  const T = (t) => ({ shadow: { type: 'pm_text', fields: { TEXT: t } } });
  const N = (n) => ({ shadow: { type: 'pm_number', fields: { NUM: n } } });
  const nameOf = () => blk(b('pm_player_name', null, { WHO: P }));
  const join = (a, c) => blk(b('pm_join', null, { A: a, B: c }));
  const MONEY = { id: 'tpl_money' };
  const RUBY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAV0lEQVR4nGNgIBP875r6H4TJ1nxNy4o8A5A1V/FLkWbASNAcZaX0H4TJthmk+dkhTbAhMM0kOxlmCAiTrBkErNVE/oMwzCCSNSO7BDk8SNJMMqBI84ADANuqc/K84qN4AAAAAElFTkSuQmCC';
  const FEATHER_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUElEQVR4nGNgIAHIx3T9R8Yka+y68h+OiTYAXSMIv/xBpAFU1QzSSH/NMI1Ea8ZlAMmaSdaIzQD6aoYZQLbmOdnO/0GYZI0Ua4YZQLZmagAAU7TQahi7LTMAAAAASUVORK5CYII=';
  const money = () => blk(b('pm_var_get', { VAR: MONEY }, { WHO: P }));

  const TEMPLATES = [
    {
      title: '환영 인사 + 첫 선물', desc: '들어오면 인사하고, 처음 온 사람에게는 빵과 돌 도구를 줍니다.',
      blocks: [
        b('pm_on_join', null, null, [
          b('pm_title', null, { WHO: P, TITLE: T('&a환영합니다!'), SUB: join(nameOf(), T('님, 즐거운 시간 보내세요')) }),
          b('pm_sound', { SND: 'ENTITY_PLAYER_LEVELUP' }, { WHO: P }),
          b('pm_if', null, { COND: blk(b('pm_first_join', null, { WHO: P })) }, [
            b('pm_broadcast', null, { MSG: join(T('&e처음 온 '), join(nameOf(), T('&e님을 환영해 주세요!'))) }),
            b('pm_give', { MAT: 'BREAD', N: 16 }, { WHO: P }),
            b('pm_give', { MAT: 'STONE_PICKAXE', N: 1 }, { WHO: P })
          ])
        ])
      ]
    },
    {
      title: '돈 시스템', desc: '몹을 잡으면 돈 +10, 오른쪽 점수판에 내 돈이 보이고, /money 로 확인합니다.',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        b('pm_on_kill', null, null, [
          b('pm_var_add', { VAR: MONEY }, { WHO: P, N: N(10) }),
          b('pm_actionbar', null, { WHO: P, MSG: T('&a+10원') })
        ]),
        b('pm_on_timer', { SEC: 1 }, null, [
          b('pm_each_player', null, null, [
            b('pm_sidebar', null, { WHO: P, TITLE: T('&e&l내 정보'), L1: join(T('&f돈: &a'), money()), L2: join(T('&f접속자: &b'), blk(b('pm_online_count'))) })
          ])
        ]),
        b('pm_on_command', { NAME: 'money' }, null, [
          b('pm_message', null, { WHO: P, MSG: join(T('&e내 돈: &a'), join(money(), T('원'))) })
        ])
      ]
    },
    {
      title: '상점 메뉴', desc: '/shop 을 치면 상점이 열립니다. 돈 100원으로 다이아를 삽니다. (돈 시스템과 같이 씁니다)',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        b('pm_on_command', { NAME: 'shop' }, null, [
          b('pm_menu_open', { MENU: '상점' }, { WHO: P })
        ]),
        b('pm_menu_def', { NAME: '상점', TITLE: '&8상점', ROWS: 3 }, null, [
          b('pm_menu_button', { SLOT: 12, MAT: 'DIAMOND', LABEL: '&b다이아몬드', DESC: '&7100원' }, null, [
            b('pm_ifelse', null, { COND: blk(b('pm_compare', { OP: '>=' }, { A: money(), B: N(100) })) }, [
              b('pm_var_sub', { VAR: MONEY }, { WHO: P, N: N(100) }),
              b('pm_give', { MAT: 'DIAMOND', N: 1 }, { WHO: P }),
              b('pm_message', null, { WHO: P, MSG: T('&a다이아몬드를 샀습니다!') })
            ], [
              b('pm_message', null, { WHO: P, MSG: T('&c돈이 부족합니다') })
            ])
          ]),
          b('pm_menu_button', { SLOT: 16, MAT: 'BARRIER', LABEL: '&c닫기', DESC: '' }, null, [
            b('pm_menu_close', null, { WHO: P })
          ]),
          b('pm_menu_fill', { MAT: 'GRAY_STAINED_GLASS_PANE' })
        ])
      ]
    },
    {
      title: '번개 지팡이', desc: '/wand 로 커스텀 아이템을 받고, 들고 우클릭하면 보는 곳에 번개가 칩니다.',
      blocks: [
        b('pm_item_def', { NAME: '번개 지팡이' }, null, [
          b('pm_ip_base', { MAT: 'BLAZE_ROD' }),
          b('pm_ip_name', { TEXT: '&e&l번개 지팡이' }),
          b('pm_ip_lore', { TEXT: '&7우클릭하면 번개가 칩니다' }),
          b('pm_ip_glow')
        ]),
        b('pm_on_command', { NAME: 'wand' }, null, [
          b('pm_give_custom', { ITEM: '번개 지팡이', N: 1 }, { WHO: P })
        ]),
        b('pm_on_rightclick', null, null, [
          b('pm_if', null, { COND: blk(b('pm_hand_custom', { ITEM: '번개 지팡이' }, { WHO: P })) }, [
            b('pm_lightning_look', null, { WHO: P })
          ])
        ])
      ]
    },
    {
      title: '욕설 막기', desc: '채팅에 나쁜 말이 있으면 채팅을 막고 경고합니다.',
      blocks: [
        b('pm_on_chat', null, null, [
          b('pm_if', null, { COND: blk(b('pm_or', null, {
            A: blk(b('pm_contains', null, { A: blk(b('pm_chat_msg')), B: T('바보') })),
            B: blk(b('pm_contains', null, { A: blk(b('pm_chat_msg')), B: T('멍청이') }))
          })) }, [
            b('pm_cancel'),
            b('pm_message', null, { WHO: P, MSG: T('&c고운 말을 써주세요!') })
          ])
        ])
      ]
    },
    {
      title: '다이아 보너스', desc: '다이아 광석을 캐면 30% 확률로 다이아를 하나 더 줍니다.',
      blocks: [
        b('pm_on_break', null, null, [
          b('pm_if', null, { COND: blk(b('pm_and', null, {
            A: blk(b('pm_block_is', { MAT: 'DIAMOND_ORE' })),
            B: blk(b('pm_chance', { N: 30 }))
          })) }, [
            b('pm_drop_item', { MAT: 'DIAMOND', N: 1 }, { WHO: P }),
            b('pm_message', null, { WHO: P, MSG: T('&b보너스 다이아몬드!') })
          ])
        ])
      ]
    },
    {
      title: '낙하 피해 없애기', desc: '높은 곳에서 떨어져도 안 다칩니다.',
      blocks: [
        b('pm_on_damage', null, null, [
          b('pm_if', null, { COND: blk(b('pm_cause_is', { CAUSE: 'FALL' })) }, [b('pm_cancel')])
        ])
      ]
    },
    {
      title: '켜질 때 공지 + 5분마다 알림', desc: '플러그인이 켜지면 콘솔에 남기고, 5분마다 모두에게 공지합니다.',
      blocks: [
        b('pm_on_enable', null, null, [
          b('pm_log', null, { MSG: T('플러그인이 켜졌습니다!') })
        ]),
        b('pm_on_timer', { SEC: 300 }, null, [
          b('pm_broadcast', null, { MSG: T('&6[공지] &f규칙을 지켜서 즐겁게 놉니다!') })
        ])
      ]
    },
    {
      title: '루비 검 (그림 그린 아이템)', desc: '직접 그린 그림의 루비 검입니다. /ruby 로 받고, 때리면 불이 붙습니다. 그림 블록을 눌러 고쳐보세요.',
      blocks: [
        b('pm_item_def', { NAME: '루비 검' }, null, [
          b('pm_ip_base', { MAT: 'DIAMOND_SWORD' }),
          b('pm_ip_texture', { IMG: RUBY_PNG }),
          b('pm_ip_name', { TEXT: '&c&l루비 검' }),
          b('pm_ip_lore', { TEXT: '&7때리면 상대에게 불이 붙습니다' }),
          b('pm_ip_enchant', { ENCH: 'sharpness', LV: 3 })
        ]),
        b('pm_on_command', { NAME: 'ruby' }, null, [
          b('pm_give_custom', { ITEM: '루비 검', N: 1 }, { WHO: P })
        ]),
        b('pm_on_hit', null, null, [
          b('pm_if', null, { COND: blk(b('pm_hand_custom', { ITEM: '루비 검' }, { WHO: P })) }, [
            b('pm_t_fire', { SEC: 3 }),
            b('pm_loc_particle', { PART: 'FLAME', N: 20 }, { LOC: blk(b('pm_loc_ctx')) })
          ])
        ])
      ]
    },
    {
      title: '대시 깃털 (쿨타임)', desc: '깃털을 들고 우클릭하면 앞으로 휙 날아갑니다. 3초 쿨타임이 있습니다.',
      blocks: [
        b('pm_item_def', { NAME: '대시 깃털' }, null, [
          b('pm_ip_base', { MAT: 'FEATHER' }),
          b('pm_ip_texture', { IMG: FEATHER_PNG }),
          b('pm_ip_name', { TEXT: '&b대시 깃털' }),
          b('pm_ip_glow')
        ]),
        b('pm_on_join', null, null, [
          b('pm_if', null, { COND: blk(b('pm_first_join', null, { WHO: P })) }, [
            b('pm_give_custom', { ITEM: '대시 깃털', N: 1 }, { WHO: P })
          ])
        ]),
        b('pm_on_rightclick', null, null, [
          b('pm_if', null, { COND: blk(b('pm_hand_custom', { ITEM: '대시 깃털' }, { WHO: P })) }, [
            b('pm_ifelse', null, { COND: blk(b('pm_cool_ready', { NAME: '대시' }, { WHO: P })) }, [
              b('pm_dash', { N: 1.8 }, { WHO: P }),
              b('pm_particle', { PART: 'CLOUD', N: 30 }, { WHO: P }),
              b('pm_cool_start', { NAME: '대시', SEC: 3 }, { WHO: P })
            ], [
              b('pm_actionbar', null, { WHO: P, MSG: join(T('&c아직 '), join(blk(b('pm_cool_left', { NAME: '대시' }, { WHO: P })), T('초 남았습니다'))) })
            ])
          ])
        ])
      ]
    },
    {
      title: '/pay 송금', desc: '/pay 이름 금액 으로 다른 사람에게 돈을 보냅니다. (돈 시스템과 같이 씁니다)',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        b('pm_on_command', { NAME: 'pay' }, null, [
          b('pm_if', null, { COND: blk(b('pm_not', null, { C: blk(b('pm_arg_count', { N: 2 })) })) }, [
            b('pm_message', null, { WHO: P, MSG: T('&e사용법: /pay 이름 금액') }),
            b('pm_stop')
          ]),
          b('pm_find_player', null, { NAME: blk(b('pm_arg', { N: 1 })) }, [
            b('pm_ifelse', null, { COND: blk(b('pm_compare', { OP: '>=' }, {
              A: blk(b('pm_var_get', { VAR: MONEY }, { WHO: blk(b('pm_cmd_sender')) })),
              B: blk(b('pm_arg_num', { N: 2 }))
            })) }, [
              b('pm_var_sub', { VAR: MONEY }, { WHO: blk(b('pm_cmd_sender')), N: blk(b('pm_arg_num', { N: 2 })) }),
              b('pm_var_add', { VAR: MONEY }, { WHO: P, N: blk(b('pm_arg_num', { N: 2 })) }),
              b('pm_message', null, { WHO: blk(b('pm_cmd_sender')), MSG: T('&a돈을 보냈습니다!') }),
              b('pm_message', null, { WHO: P, MSG: T('&a돈을 받았습니다!') })
            ], [
              b('pm_message', null, { WHO: blk(b('pm_cmd_sender')), MSG: T('&c돈이 부족합니다') })
            ])
          ], [
            b('pm_message', null, { WHO: P, MSG: T('&c그 사람은 지금 없습니다') })
          ])
        ])
      ]
    },
    {
      title: '럭키 블록', desc: '금 블록을 부수면 랜덤으로 다이아·좀비·폭죽 중 하나가 나옵니다.',
      blocks: [
        b('pm_on_break', null, null, [
          b('pm_if', null, { COND: blk(b('pm_block_is', { MAT: 'GOLD_BLOCK' })) }, [
            { type: 'pm_random_pick', inputs: {
              A: { block: stack([b('pm_loc_drop', { MAT: 'DIAMOND', N: 3 }, { LOC: blk(b('pm_loc_ctx')) }), b('pm_message', null, { WHO: P, MSG: T('&b대박! 다이아 3개!') })]) },
              B: { block: stack([b('pm_loc_spawn', { ENT: 'ZOMBIE', N: 3 }, { LOC: blk(b('pm_loc_ctx')) }), b('pm_message', null, { WHO: P, MSG: T('&c으악 좀비다!') })]) },
              C: { block: stack([b('pm_loc_firework', { COLOR: 'FUCHSIA', TYPE: 'STAR' }, { LOC: blk(b('pm_loc_ctx')) }), b('pm_message', null, { WHO: P, MSG: T('&d펑! 축하합니다') })]) }
            } }
          ])
        ])
      ]
    },
    {
      title: '보스바 이벤트 타이머', desc: '/event 를 치면 모두에게 보스바가 뜨고 10초 뒤에 이벤트가 시작됩니다.',
      blocks: [
        b('pm_on_command', { NAME: 'event' }, null, [
          b('pm_each_player', null, null, [
            b('pm_bossbar', { COLOR: 'YELLOW', N: 100 }, { WHO: P, MSG: T('&e10초 뒤에 이벤트가 시작됩니다!') })
          ]),
          b('pm_wait', { SEC: 10 }, null, [
            b('pm_each_player', null, null, [
              b('pm_bossbar_hide', null, { WHO: P }),
              b('pm_title', null, { WHO: P, TITLE: T('&6이벤트 시작!'), SUB: T('&f다이아를 찾아라') }),
              b('pm_firework', { COLOR: 'YELLOW' }, { WHO: P })
            ])
          ])
        ])
      ]
    },
    {
      title: 'PvP 금지 + 폭발 방지', desc: '사람끼리 때리지 못하게 하고, 크리퍼가 터져도 땅이 안 부서집니다.',
      blocks: [
        b('pm_on_hit', null, null, [
          b('pm_if', null, { COND: blk(b('pm_t_isplayer')) }, [
            b('pm_cancel'),
            b('pm_actionbar', null, { WHO: P, MSG: T('&c여기서는 사람을 때릴 수 없습니다') })
          ])
        ]),
        b('pm_on_explode', null, null, [b('pm_no_block_damage')])
      ]
    }
  ];


  const A = (n) => blk(b('pm_arg', { N: n }));
  const AREST = (n) => blk(b('pm_arg_rest', { N: n }));
  const ORIG = () => blk(b('pm_orig_player'));
  const msg = (who, text) => b('pm_message', null, { WHO: who, MSG: typeof text === 'string' ? T(text) : text });
  const isOp = (who) => blk(b('pm_is_op', null, { WHO: who || P }));
  const not = (c) => blk(b('pm_not', null, { C: c }));
  const and = (x, y) => blk(b('pm_and', null, { A: x, B: y }));
  const or = (x, y) => blk(b('pm_or', null, { A: x, B: y }));
  const onlyOp = () => b('pm_if', null, { COND: not(isOp()) }, [msg(P, '&c관리자(OP)만 쓸 수 있습니다'), b('pm_stop')]);
  const usage = (n, text) => b('pm_if', null, { COND: not(blk(b('pm_arg_count', { N: n }))) }, [msg(P, '&e사용법: ' + text), b('pm_stop')]);
  const LOCP = (who) => blk(b('pm_loc_of', null, { WHO: who || P }));
  const SLOC = (name) => blk(b('pm_sloc_get', null, { NAME: typeof name === 'string' ? T(name) : name }));
  const SHAS = (name) => blk(b('pm_sloc_has', null, { NAME: typeof name === 'string' ? T(name) : name }));
  const tp = (who, loc) => b('pm_tp_loc', null, { WHO: who, LOC: loc });
  const snd = (s) => b('pm_sound', { SND: s }, { WHO: P });
  const vget = (id, who) => blk(b('pm_var_get', { VAR: { id } }, { WHO: who || P }));
  const cmp = (x, op, y) => blk(b('pm_compare', { OP: op }, { A: x, B: y }));
  const num = (n) => N(n);
  const flagIs = (name, who) => blk(b('pm_pflag_is', null, { WHO: who || P, NAME: T(name) }));
  const today = () => blk(b('pm_today'));
  const now = () => blk(b('pm_now_sec'));
  const cmd = (name, body) => b('pm_on_command', { NAME: name }, null, body);

  const MORE = [
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '스폰 (/spawn · /setspawn)',
      desc: '관리자가 /setspawn 으로 스폰을 정하면, /spawn 으로 가고 처음 온 사람과 죽은 사람도 거기서 시작합니다.',
      blocks: [
        cmd('setspawn', [onlyOp(), b('pm_sloc_set', null, { NAME: T('스폰'), LOC: LOCP() }), msg(P, '&a여기를 스폰으로 정했습니다!')]),
        cmd('spawn', [b('pm_ifelse', null, { COND: SHAS('스폰') }, [tp(P, SLOC('스폰')), snd('ENTITY_ENDERMAN_TELEPORT'), msg(P, '&a스폰으로 왔습니다')], [msg(P, '&c아직 스폰이 없습니다. 관리자가 /setspawn 을 해야 합니다')])]),
        b('pm_on_join', null, null, [b('pm_if', null, { COND: and(blk(b('pm_first_join', null, { WHO: P })), SHAS('스폰')) }, [tp(P, SLOC('스폰'))])]),
        b('pm_on_respawn', null, null, [b('pm_if', null, { COND: SHAS('스폰') }, [b('pm_respawn_at', null, { LOC: SLOC('스폰') })])])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '집 (/sethome · /home · /delhome)',
      desc: '/sethome 으로 지금 자리를 내 집으로 저장하고, /home 으로 언제든 돌아갑니다.',
      blocks: [
        cmd('sethome', [b('pm_ploc_set', null, { WHO: P, NAME: T('집'), LOC: LOCP() }), msg(P, '&a여기를 집으로 저장했습니다! &7(/home)')]),
        cmd('home', [b('pm_ifelse', null, { COND: blk(b('pm_ploc_has', null, { WHO: P, NAME: T('집') })) },
          [tp(P, blk(b('pm_ploc_get', null, { WHO: P, NAME: T('집') }))), snd('ENTITY_ENDERMAN_TELEPORT'), msg(P, '&a집에 왔습니다')],
          [msg(P, '&c저장한 집이 없습니다. 먼저 /sethome 을 해주세요')])]),
        cmd('delhome', [b('pm_ploc_del', null, { WHO: P, NAME: T('집') }), msg(P, '&e집을 지웠습니다')])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '워프 (/setwarp · /warp · /warps)',
      desc: '관리자가 /setwarp 이름 으로 장소를 저장하면, 누구나 /warp 이름 으로 갑니다. /warps 로 목록을 봅니다.',
      blocks: [
        cmd('setwarp', [onlyOp(), usage(1, '/setwarp 이름'), b('pm_sloc_set', null, { NAME: A(1), LOC: LOCP() }), msg(P, join(T('&a워프를 저장했습니다: &f'), A(1)))]),
        cmd('warp', [usage(1, '/warp 이름  (목록은 /warps)'), b('pm_ifelse', null, { COND: SHAS(A(1)) },
          [tp(P, SLOC(A(1))), snd('ENTITY_ENDERMAN_TELEPORT'), msg(P, join(T('&a워프했습니다: &f'), A(1)))],
          [msg(P, '&c그런 워프가 없습니다. /warps 로 목록을 봅니다')])]),
        cmd('warps', [msg(P, join(T('&e워프 목록: &f'), blk(b('pm_sloc_list'))))]),
        cmd('delwarp', [onlyOp(), usage(1, '/delwarp 이름'), b('pm_sloc_del', null, { NAME: A(1) }), msg(P, '&e워프를 지웠습니다')])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '/back (죽은 곳으로 돌아가기)',
      desc: '죽으면 죽은 자리를 기억합니다. 채팅의 [돌아가기]를 누르거나 /back 을 치면 그 자리로 갑니다.',
      blocks: [
        b('pm_on_death', null, null, [
          b('pm_ploc_set', null, { WHO: P, NAME: T('죽은 곳'), LOC: blk(b('pm_loc_ctx')) })
        ]),
        b('pm_on_respawn', null, null, [
          b('pm_wait', { SEC: 1 }, null, [b('pm_clickmsg', null, { WHO: P, MSG: T('&e[여기를 눌러서 죽은 곳으로 돌아가기]'), CMD: T('back') })])
        ]),
        cmd('back', [b('pm_ifelse', null, { COND: blk(b('pm_ploc_has', null, { WHO: P, NAME: T('죽은 곳') })) },
          [tp(P, blk(b('pm_ploc_get', null, { WHO: P, NAME: T('죽은 곳') }))), msg(P, '&a죽은 곳으로 돌아왔습니다')],
          [msg(P, '&c돌아갈 곳이 없습니다')])])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '텔레포트 요청 (/tpa · /tpaccept · /tpdeny)',
      desc: '/tpa 이름 으로 요청을 보내고, 받은 사람이 /tpaccept 하면 요청한 사람이 그 사람에게 갑니다.',
      blocks: [
        cmd('tpa', [usage(1, '/tpa 이름'),
          b('pm_find_player', null, { NAME: A(1) }, [
            b('pm_remember', null, { WHO: P, NAME: T('텔레포트 요청'), OTHER: ORIG() }),
            b('pm_clickmsg', null, { WHO: P, MSG: join(T('&e'), join(blk(b('pm_player_name', null, { WHO: ORIG() })), T('님이 텔레포트를 요청했습니다. &a[수락하려면 여기를 누릅니다]'))), CMD: T('tpaccept') }),
            msg(ORIG(), '&a요청을 보냈습니다. 30초 안에 수락해야 합니다'),
            b('pm_wait', { SEC: 30 }, null, [b('pm_forget', null, { WHO: P, NAME: T('텔레포트 요청') })])
          ], [msg(P, '&c그 사람은 지금 없습니다')])]),
        cmd('tpaccept', [b('pm_remembered', null, { WHO: P, NAME: T('텔레포트 요청') }, [
          tp(P, LOCP(ORIG())), msg(P, '&a텔레포트했습니다!'), msg(ORIG(), '&a요청을 수락했습니다'),
          b('pm_forget', null, { WHO: ORIG(), NAME: T('텔레포트 요청') })
        ], [msg(P, '&c받은 요청이 없습니다')])]),
        cmd('tpdeny', [b('pm_forget', null, { WHO: P, NAME: T('텔레포트 요청') }), msg(P, '&e요청을 거절했습니다')])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '편의 명령어 (/heal /feed /fly /hat /repair /trash /ec /craft)',
      desc: '자주 쓰는 명령어 모음입니다. 회복·날기·수리는 관리자만, 쓰레기통·엔더 상자·제작대는 누구나 씁니다.',
      blocks: [
        cmd('heal', [onlyOp(), b('pm_heal', null, { WHO: P }), b('pm_clear_effects', null, { WHO: P }), msg(P, '&a회복했습니다')]),
        cmd('feed', [b('pm_set_food', { N: 20 }, { WHO: P }), msg(P, '&a배가 부릅니다')]),
        cmd('fly', [onlyOp(), b('pm_pflag_toggle', null, { WHO: P, NAME: T('날기') }),
          b('pm_ifelse', null, { COND: flagIs('날기') }, [b('pm_fly', { ON: 'true' }, { WHO: P }), msg(P, '&a날기 켜짐 &7(스페이스 두 번)')], [b('pm_fly', { ON: 'false' }, { WHO: P }), msg(P, '&e날기 꺼짐')])]),
        cmd('hat', [b('pm_hat', null, { WHO: P }), msg(P, '&a머리에 썼습니다')]),
        cmd('repair', [onlyOp(), b('pm_repair', null, { WHO: P }), msg(P, '&a손에 든 아이템을 고쳤습니다')]),
        cmd('trash', [b('pm_open_trash', null, { WHO: P })]),
        cmd('ec', [b('pm_open_ender', null, { WHO: P })]),
        cmd('craft', [b('pm_open_workbench', null, { WHO: P })])
      ]
    },
    {
      cat: '기본 명령어', like: 'EssentialsX', title: '무적 · 투명 모드 (/god · /vanish)',
      desc: '관리자용입니다. /god 은 안 다치게, /vanish 는 다른 사람에게 안 보이게 켜고 끕니다. 다시 들어와도 유지됩니다.',
      blocks: [
        cmd('god', [onlyOp(), b('pm_pflag_toggle', null, { WHO: P, NAME: T('무적') }),
          b('pm_ifelse', null, { COND: flagIs('무적') }, [b('pm_god', { ON: 'true' }, { WHO: P }), msg(P, '&a무적 켜짐')], [b('pm_god', { ON: 'false' }, { WHO: P }), msg(P, '&e무적 꺼짐')])]),
        cmd('vanish', [onlyOp(), b('pm_pflag_toggle', null, { WHO: P, NAME: T('투명') }),
          b('pm_ifelse', null, { COND: flagIs('투명') }, [b('pm_vanish', { ON: 'true' }, { WHO: P }), msg(P, '&a투명 켜짐 &7(다른 사람에게 안 보입니다)')], [b('pm_vanish', { ON: 'false' }, { WHO: P }), msg(P, '&e투명 꺼짐')])]),
        b('pm_on_join', null, null, [
          b('pm_if', null, { COND: flagIs('무적') }, [b('pm_god', { ON: 'true' }, { WHO: P })]),
          b('pm_if', null, { COND: flagIs('투명') }, [b('pm_hide_evmsg')]),
          b('pm_each_player', null, null, [b('pm_if', null, { COND: flagIs('투명') }, [b('pm_vanish', { ON: 'true' }, { WHO: P })])])
        ])
      ]
    },
    {
      cat: '채팅·메시지', like: 'EssentialsX', title: '닉네임 (/nick)',
      desc: '/nick 이름 으로 채팅·탭 목록에 보이는 이름을 바꿉니다. /nick off 로 원래대로. 다시 들어와도 유지됩니다.',
      blocks: [
        cmd('nick', [usage(1, '/nick 새이름  (원래대로: /nick off)'),
          b('pm_if', null, { COND: blk(b('pm_text_eq', null, { A: A(1), B: T('off') })) }, [
            b('pm_ptext_set', null, { WHO: P, NAME: T('닉네임'), VAL: T('') }),
            b('pm_displayname', null, { WHO: P, MSG: nameOf() }), b('pm_tabname', null, { WHO: P, MSG: nameOf() }),
            msg(P, '&e닉네임을 지웠습니다'), b('pm_stop')
          ]),
          b('pm_ptext_set', null, { WHO: P, NAME: T('닉네임'), VAL: join(T('&e'), AREST(1)) }),
          b('pm_displayname', null, { WHO: P, MSG: blk(b('pm_ptext_get', null, { WHO: P, NAME: T('닉네임') })) }),
          b('pm_tabname', null, { WHO: P, MSG: blk(b('pm_ptext_get', null, { WHO: P, NAME: T('닉네임') })) }),
          msg(P, join(T('&a닉네임을 바꿨습니다: '), blk(b('pm_ptext_get', null, { WHO: P, NAME: T('닉네임') }))))]),
        b('pm_on_join', null, null, [b('pm_if', null, { COND: blk(b('pm_ptext_has', null, { WHO: P, NAME: T('닉네임') })) }, [
          b('pm_displayname', null, { WHO: P, MSG: blk(b('pm_ptext_get', null, { WHO: P, NAME: T('닉네임') })) }),
          b('pm_tabname', null, { WHO: P, MSG: blk(b('pm_ptext_get', null, { WHO: P, NAME: T('닉네임') })) })
        ])])
      ]
    },
    {
      cat: '경제·보상', like: 'EssentialsX Kits', title: '하루 한 번 킷 (/kit)',
      desc: '/kit 으로 하루에 한 번 도구와 음식을 받습니다. 날짜가 바뀌면 다시 받을 수 있습니다.',
      variables: [{ name: '킷 받은 날', id: 'tpl_kitday', type: 'PMValue' }],
      blocks: [
        cmd('kit', [
          b('pm_if', null, { COND: cmp(vget('tpl_kitday'), '==', today()) }, [msg(P, '&c오늘은 이미 받았습니다. 내일 다시 옵니다!'), b('pm_stop')]),
          b('pm_var_set', { VAR: { id: 'tpl_kitday' } }, { WHO: P, N: today() }),
          b('pm_give', { MAT: 'IRON_PICKAXE', N: 1 }, { WHO: P }), b('pm_give', { MAT: 'IRON_SWORD', N: 1 }, { WHO: P }),
          b('pm_give', { MAT: 'COOKED_BEEF', N: 16 }, { WHO: P }), b('pm_give', { MAT: 'TORCH', N: 32 }, { WHO: P }),
          snd('ENTITY_PLAYER_LEVELUP'), msg(P, '&a오늘의 킷을 받았습니다!')
        ])
      ]
    },
    {
      cat: '경제·보상', like: '출석 보상 플러그인', title: '출석 보상 (매일 첫 접속)',
      desc: '하루에 처음 들어오면 출석 일수가 올라가고 다이아를 받습니다. 7일마다 특별 보상이 있습니다.',
      variables: [{ name: '출석한 날', id: 'tpl_attday', type: 'PMValue' }, { name: '출석 일수', id: 'tpl_attcount', type: 'PMValue' }],
      blocks: [
        b('pm_on_join', null, null, [
          b('pm_if', null, { COND: cmp(vget('tpl_attday'), '<', today()) }, [
            b('pm_var_set', { VAR: { id: 'tpl_attday' } }, { WHO: P, N: today() }),
            b('pm_var_add', { VAR: { id: 'tpl_attcount' } }, { WHO: P, N: num(1) }),
            b('pm_give', { MAT: 'DIAMOND', N: 1 }, { WHO: P }),
            b('pm_title', null, { WHO: P, TITLE: T('&6출석 완료!'), SUB: join(T('&f출석 '), join(vget('tpl_attcount'), T('일째'))) }),
            b('pm_if', null, { COND: cmp(blk(b('pm_math', { OP: '%' }, { A: vget('tpl_attcount'), B: num(7) })), '==', num(0)) }, [
              b('pm_give', { MAT: 'NETHERITE_INGOT', N: 1 }, { WHO: P }), b('pm_broadcast', null, { MSG: join(nameOf(), T(' &e님이 7일 연속(누적) 출석! 특별 보상을 받았습니다')) })
            ])
          ])
        ])
      ]
    },
    {
      cat: '경제·보상', like: 'Jobs Reborn', title: '직업 보상 (몹·광물로 돈 벌기)',
      desc: '좀비·스켈레톤·크리퍼를 잡거나 다이아·금 광석을 캐면 돈을 법니다. (돈 시스템과 같이 씁니다)',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        b('pm_on_kill', null, null, [
          b('pm_if', null, { COND: or(blk(b('pm_mob_is', { ENT: 'ZOMBIE' })), blk(b('pm_mob_is', { ENT: 'SKELETON' }))) }, [
            b('pm_var_add', { VAR: MONEY }, { WHO: P, N: num(5) }), b('pm_actionbar', null, { WHO: P, MSG: T('&a+5원 (사냥)') })]),
          b('pm_if', null, { COND: blk(b('pm_mob_is', { ENT: 'CREEPER' })) }, [
            b('pm_var_add', { VAR: MONEY }, { WHO: P, N: num(10) }), b('pm_actionbar', null, { WHO: P, MSG: T('&a+10원 (사냥)') })])
        ]),
        b('pm_on_break', null, null, [
          b('pm_if', null, { COND: blk(b('pm_block_name_has', null, { NAME: T('DIAMOND_ORE') })) }, [
            b('pm_var_add', { VAR: MONEY }, { WHO: P, N: num(20) }), b('pm_actionbar', null, { WHO: P, MSG: T('&b+20원 (채굴)') })]),
          b('pm_if', null, { COND: blk(b('pm_block_name_has', null, { NAME: T('GOLD_ORE') })) }, [
            b('pm_var_add', { VAR: MONEY }, { WHO: P, N: num(8) }), b('pm_actionbar', null, { WHO: P, MSG: T('&e+8원 (채굴)') })])
        ])
      ]
    },
    {
      cat: '경제·보상', like: 'EssentialsX', title: '돈 1등 (/baltop) · 플레이 시간 보상',
      desc: '/baltop 으로 접속자 중 돈 1등을 보여주고, 30분마다 접속한 모두에게 돈 100원을 줍니다.',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        cmd('baltop', [msg(P, join(T('&6접속자 중 돈 1등: &e'), blk(b('pm_top_name', { VAR: MONEY }))))]),
        b('pm_on_timer', { SEC: 1800 }, null, [b('pm_each_player', null, null, [
          b('pm_var_add', { VAR: MONEY }, { WHO: P, N: num(100) }), msg(P, '&a30분 놀아서 100원을 받았습니다!')
        ])])
      ]
    },
    {
      cat: '경제·보상', like: 'Shopkeepers', title: 'NPC 상인 (우클릭하면 상점)',
      desc: '관리자가 /npc 를 치면 그 자리에 상인이 섭니다. 상인을 우클릭하면 돈으로 물건을 사는 메뉴가 열립니다.',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        cmd('npc', [onlyOp(), b('pm_npc', { ENT: 'VILLAGER' }, { LOC: LOCP(), MSG: T('&a&l상인') }), msg(P, '&a상인을 세웠습니다. 지우려면 /npcremove')]),
        cmd('npcremove', [onlyOp(), b('pm_npc_clear', { N: 3 }, { LOC: LOCP() }), msg(P, '&e근처 상인을 지웠습니다')]),
        b('pm_on_click_entity', null, null, [b('pm_if', null, { COND: blk(b('pm_t_named', null, { NAME: T('&a&l상인') })) }, [
          b('pm_cancel'), b('pm_menu_open', { MENU: '상인' }, { WHO: P })
        ])]),
        b('pm_menu_def', { NAME: '상인', TITLE: '&2상인', ROWS: 3 }, null, [
          b('pm_menu_button', { SLOT: 11, MAT: 'GOLDEN_APPLE', LABEL: '&e황금 사과', DESC: '&750원' }, null, [
            b('pm_ifelse', null, { COND: cmp(money(), '>=', num(50)) }, [b('pm_var_sub', { VAR: MONEY }, { WHO: P, N: num(50) }), b('pm_give', { MAT: 'GOLDEN_APPLE', N: 1 }, { WHO: P }), msg(P, '&a샀습니다!')], [msg(P, '&c돈이 부족합니다')])]),
          b('pm_menu_button', { SLOT: 13, MAT: 'DIAMOND', LABEL: '&b다이아몬드', DESC: '&7100원' }, null, [
            b('pm_ifelse', null, { COND: cmp(money(), '>=', num(100)) }, [b('pm_var_sub', { VAR: MONEY }, { WHO: P, N: num(100) }), b('pm_give', { MAT: 'DIAMOND', N: 1 }, { WHO: P }), msg(P, '&a샀습니다!')], [msg(P, '&c돈이 부족합니다')])]),
          b('pm_menu_button', { SLOT: 15, MAT: 'EXPERIENCE_BOTTLE', LABEL: '&a경험치 병 8개', DESC: '&730원' }, null, [
            b('pm_ifelse', null, { COND: cmp(money(), '>=', num(30)) }, [b('pm_var_sub', { VAR: MONEY }, { WHO: P, N: num(30) }), b('pm_give', { MAT: 'EXPERIENCE_BOTTLE', N: 8 }, { WHO: P }), msg(P, '&a샀습니다!')], [msg(P, '&c돈이 부족합니다')])]),
          b('pm_menu_button', { SLOT: 23, MAT: 'GOLD_NUGGET', LABEL: '&6내 돈 보기', DESC: '' }, null, [msg(P, join(T('&6내 돈: &e'), join(money(), T('원'))))]),
          b('pm_menu_fill', { MAT: 'GREEN_STAINED_GLASS_PANE' })
        ])
      ]
    },
    {
      cat: '채팅·메시지', like: 'EssentialsX Chat', title: '채팅 꾸미기 (관리자·멤버 칭호)',
      desc: '채팅 앞에 [관리자] 또는 [멤버] 칭호가 붙고, 이름과 내용 사이에 » 가 들어갑니다.',
      blocks: [
        b('pm_on_chat', null, null, [b('pm_ifelse', null, { COND: isOp() },
          [b('pm_chat_format', null, { FMT: T('&c[관리자] &f{이름} &7» &f{내용}') })],
          [b('pm_chat_format', null, { FMT: T('&7[멤버] &f{이름} &8» &7{내용}') })])])
      ]
    },
    {
      cat: '채팅·메시지', like: '접속 메시지 플러그인', title: '입장 · 퇴장 · 죽음 메시지 꾸미기',
      desc: '들어오고 나갈 때 [+] [-] 표시로 바꾸고, 처음 온 사람은 크게 환영합니다. 죽으면 위치를 알려줍니다.',
      blocks: [
        b('pm_on_join', null, null, [
          b('pm_set_evmsg', null, { MSG: join(T('&a[+] &f'), nameOf()) }),
          b('pm_if', null, { COND: blk(b('pm_first_join', null, { WHO: P })) }, [b('pm_broadcast', null, { MSG: join(T('&d&l처음 온 '), join(nameOf(), T('&d&l님을 환영해 주세요!'))) })])
        ]),
        b('pm_on_quit', null, null, [b('pm_set_evmsg', null, { MSG: join(T('&c[-] &f'), nameOf()) })]),
        b('pm_on_death', null, null, [
          b('pm_set_evmsg', null, { MSG: join(T('&7☠ '), join(nameOf(), T('&7님이 쓰러졌습니다'))) }),
          msg(P, join(T('&c죽은 곳: &fX '), join(blk(b('pm_coord', { AXIS: 'X' }, { WHO: P })), join(T(' Y '), join(blk(b('pm_coord', { AXIS: 'Y' }, { WHO: P })), join(T(' Z '), blk(b('pm_coord', { AXIS: 'Z' }, { WHO: P }))))))))
        ])
      ]
    },
    {
      cat: '채팅·메시지', like: 'AutoBroadcast', title: '자동 공지 (3분마다 랜덤)',
      desc: '3분마다 준비한 공지 중 하나를 랜덤으로 모두에게 보냅니다.',
      blocks: [
        b('pm_on_timer', { SEC: 180 }, null, [{ type: 'pm_random_pick', inputs: {
          A: { block: b('pm_broadcast', null, { MSG: T('&6[공지] &f/spawn 으로 언제든 스폰에 갈 수 있습니다') }) },
          B: { block: b('pm_broadcast', null, { MSG: T('&6[공지] &f욕설·도배는 금지입니다. 즐겁게 놉니다!') }) },
          C: { block: b('pm_broadcast', null, { MSG: T('&6[공지] &f/kit 으로 하루 한 번 킷을 받습니다') }) }
        } }])
      ]
    },
    {
      cat: '채팅·메시지', like: 'TAB', title: '점수판 + 탭 목록 꾸미기',
      desc: '오른쪽 점수판에 돈과 플레이 시간을, Tab 목록 위아래에 서버 이름과 핑을 보여줍니다. 1초마다 새로 고칩니다.',
      variables: [{ name: '돈', id: 'tpl_money', type: 'PMValue' }],
      blocks: [
        b('pm_on_timer', { SEC: 1 }, null, [b('pm_each_player', null, null, [
          b('pm_sidebar', null, { WHO: P, TITLE: T('&b&l내 서버'), L1: join(T('&f돈: &a'), money()), L2: join(T('&f플레이: &e'), join(blk(b('pm_playtime', null, { WHO: P })), T('분'))) }),
          b('pm_tab_hf', null, { WHO: P, H: T('&b&l내 서버에 어서 옵니다'), F: join(T('&7접속자 '), join(blk(b('pm_online_count')), join(T('명 · 내 핑 '), join(blk(b('pm_ping', null, { WHO: P })), T('ms'))))) })
        ])])
      ]
    },
    {
      cat: '서버 관리', like: 'ClearLagg', title: '아이템 청소 (5분마다, 30초 전 경고)',
      desc: '5분마다 땅에 떨어진 아이템을 치워서 렉을 줄입니다. 치우기 30초 전에 미리 알려줍니다.',
      blocks: [
        b('pm_on_timer', { SEC: 300 }, null, [
          b('pm_broadcast', null, { MSG: T('&e[청소] &f30초 뒤에 땅에 떨어진 아이템을 치웁니다!') }),
          b('pm_wait', { SEC: 30 }, null, [b('pm_clear_items'), b('pm_broadcast', null, { MSG: T('&a[청소] &f떨어진 아이템을 치웠습니다') })])
        ])
      ]
    },
    {
      cat: '서버 관리', like: '점검 모드 플러그인', title: '점검 모드 (/maintenance)',
      desc: '관리자가 /maintenance 로 켜면 관리자 말고는 아무도 못 들어옵니다. 다시 치면 꺼집니다.',
      variables: [{ name: '점검 중', id: 'tpl_maint', type: 'PMGlobal' }],
      blocks: [
        cmd('maintenance', [onlyOp(), b('pm_ifelse', null, { COND: cmp(blk(b('pm_gvar_get', { VAR: { id: 'tpl_maint' } })), '==', num(1)) },
          [b('pm_gvar_set', { VAR: { id: 'tpl_maint' } }, { N: num(0) }), b('pm_broadcast', null, { MSG: T('&a점검이 끝났습니다. 이제 누구나 들어올 수 있습니다') })],
          [b('pm_gvar_set', { VAR: { id: 'tpl_maint' } }, { N: num(1) }), b('pm_broadcast', null, { MSG: T('&c점검 모드를 켰습니다. 관리자만 들어올 수 있습니다') })])]),
        b('pm_on_login', null, null, [b('pm_if', null, { COND: and(cmp(blk(b('pm_gvar_get', { VAR: { id: 'tpl_maint' } })), '==', num(1)), not(isOp())) }, [
          b('pm_login_deny', null, { MSG: T('&c지금은 서버 점검 중입니다\n&7잠시 뒤에 다시 들어와 주세요') })])])
      ]
    },
    {
      cat: '서버 관리', like: 'ServerListPlus', title: '서버 목록 꾸미기 (MOTD)',
      desc: '멀티플레이 목록에 보이는 서버 설명 두 줄과 최대 인원 숫자를 꾸밉니다.',
      blocks: [
        b('pm_on_ping', null, null, [
          b('pm_motd', null, { L1: T('&b&l내 서버 &7| &f야생 · 경제 · 미니게임'), L2: T('&e지금 접속하면 출석 보상!') }),
          b('pm_maxplayers', { N: 100 })
        ])
      ]
    },
    {
      cat: '서버 관리', like: 'CommandBlocker', title: '플러그인 목록 숨기기 (/pl 막기)',
      desc: '관리자가 아닌 사람이 /pl · /plugins · /ver 로 서버 플러그인을 엿보지 못하게 막습니다.',
      blocks: [
        b('pm_on_cmd_pre', null, null, [b('pm_if', null, { COND: and(not(isOp()), or(
          or(blk(b('pm_text_eq', null, { A: blk(b('pm_chat_msg')), B: T('/pl') })), blk(b('pm_contains', null, { A: blk(b('pm_chat_msg')), B: T('/plugins') }))),
          or(blk(b('pm_contains', null, { A: blk(b('pm_chat_msg')), B: T('/ver') })), blk(b('pm_contains', null, { A: blk(b('pm_chat_msg')), B: T('/about') }))))) }, [
          b('pm_cancel'), msg(P, '&c그 명령어는 쓸 수 없습니다')])])
      ]
    },
    {
      cat: '서버 관리', like: 'AntiAFK', title: '잠수 감지 (5분 동안 안 움직이면)',
      desc: '5분 동안 안 움직이면 모두에게 "잠수 중"이라고 알리고, 다시 움직이면 "돌아왔습니다"라고 알립니다.',
      variables: [{ name: '마지막 움직임', id: 'tpl_lastmove', type: 'PMValue' }],
      blocks: [
        b('pm_on_join', null, null, [b('pm_var_set', { VAR: { id: 'tpl_lastmove' } }, { WHO: P, N: now() }), b('pm_pflag_set', { ON: 'false' }, { WHO: P, NAME: T('잠수') })]),
        b('pm_on_move', null, null, [
          b('pm_var_set', { VAR: { id: 'tpl_lastmove' } }, { WHO: P, N: now() }),
          b('pm_if', null, { COND: flagIs('잠수') }, [b('pm_pflag_set', { ON: 'false' }, { WHO: P, NAME: T('잠수') }), b('pm_broadcast', null, { MSG: join(T('&7'), join(nameOf(), T('님이 돌아왔습니다'))) })])
        ]),
        b('pm_on_timer', { SEC: 30 }, null, [b('pm_each_player', null, null, [
          b('pm_if', null, { COND: and(not(flagIs('잠수')), cmp(blk(b('pm_math', { OP: '-' }, { A: now(), B: vget('tpl_lastmove') })), '>=', num(300))) }, [
            b('pm_pflag_set', { ON: 'true' }, { WHO: P, NAME: T('잠수') }), b('pm_broadcast', null, { MSG: join(T('&7'), join(nameOf(), T('님은 지금 잠수 중입니다'))) })
          ])
        ])])
      ]
    },
    {
      cat: '서버 관리', like: 'Harbor', title: '한 명만 자도 아침',
      desc: '누군가 침대에 누우면 5초 뒤에 아침이 되고 비도 그칩니다. 모두가 잘 필요가 없습니다.',
      blocks: [
        b('pm_on_bed', null, null, [
          b('pm_broadcast', null, { MSG: join(T('&e'), join(nameOf(), T('님이 자러 갔습니다. 5초 뒤에 아침이 됩니다 &7(zzz)'))) }),
          b('pm_wait', { SEC: 5 }, null, [b('pm_time', { T: '1000' }, { WHO: P }), b('pm_weather', null, { WHO: P }), b('pm_broadcast', null, { MSG: T('&6☀ 좋은 아침입니다!') })])
        ])
      ]
    },
    {
      cat: '채굴·생존', like: 'Timber', title: '나무 한 번에 베기',
      desc: '도끼로 원목을 하나 베면 붙어 있는 원목이 한꺼번에 쓰러집니다. 웅크리고 베면 하나만 벱니다.',
      blocks: [
        b('pm_on_break', null, null, [b('pm_if', null, { COND: and(
          and(blk(b('pm_block_name_has', null, { NAME: T('LOG') })), blk(b('pm_hand_name_has', null, { WHO: P, NAME: T('_AXE') }))),
          not(blk(b('pm_is_sneaking', null, { WHO: P })))) }, [b('pm_vein', { N: 128 }, { WHO: P })])])
      ]
    },
    {
      cat: '채굴·생존', like: 'VeinMiner', title: '광물 한 번에 캐기',
      desc: '곡괭이를 들고 웅크린 채 광석을 캐면 붙어 있는 같은 광석을 한꺼번에 캡니다.',
      blocks: [
        b('pm_on_break', null, null, [b('pm_if', null, { COND: and(
          and(blk(b('pm_block_name_has', null, { NAME: T('_ORE') })), blk(b('pm_hand_name_has', null, { WHO: P, NAME: T('_PICKAXE') }))),
          blk(b('pm_is_sneaking', null, { WHO: P }))) }, [b('pm_vein', { N: 32 }, { WHO: P })])])
      ]
    },
    {
      cat: '채굴·생존', like: 'AutoSmelt', title: '자동 제련 (철·금 광석 → 주괴)',
      desc: '철·금 광석을 캐면 원석 대신 바로 주괴가 나옵니다. 화로가 필요 없습니다.',
      blocks: [
        b('pm_on_break', null, null, [
          b('pm_if', null, { COND: blk(b('pm_block_name_has', null, { NAME: T('IRON_ORE') })) }, [b('pm_no_bdrops'), b('pm_loc_drop', { MAT: 'IRON_INGOT', N: 1 }, { LOC: blk(b('pm_loc_ctx')) })]),
          b('pm_if', null, { COND: blk(b('pm_block_name_has', null, { NAME: T('GOLD_ORE') })) }, [b('pm_no_bdrops'), b('pm_loc_drop', { MAT: 'GOLD_INGOT', N: 1 }, { LOC: blk(b('pm_loc_ctx')) })])
        ])
      ]
    },
    {
      cat: '채굴·생존', like: 'Graves', title: '무덤 상자 (죽으면 아이템을 상자에)',
      desc: '죽으면 아이템이 흩어지지 않고 죽은 자리 상자에 들어갑니다. 좌표도 알려줍니다.',
      blocks: [b('pm_on_death', null, null, [b('pm_death_chest')])]
    },
    {
      cat: '채굴·생존', like: 'KeepInventory 플러그인', title: '죽어도 인벤토리 유지 (기본 월드만)',
      desc: '기본 월드(world)에서 죽으면 아이템과 레벨을 지켜줍니다. 네더·엔드에서는 원래대로 잃습니다.',
      blocks: [b('pm_on_death', null, null, [b('pm_if', null, { COND: blk(b('pm_world_is', { NAME: 'world' }, { WHO: P })) }, [
        b('pm_keep_inv'), msg(P, '&a이 월드에서는 죽어도 아이템을 지켜줍니다')])])]
    },
    {
      cat: '채굴·생존', like: 'RandomTeleport', title: '랜덤 텔레포트 (/rtp, 1분 쿨타임)',
      desc: '/rtp 를 치면 2000칸 안 아무 안전한 땅으로 순간이동합니다. 1분에 한 번만 쓸 수 있습니다.',
      blocks: [
        cmd('rtp', [b('pm_ifelse', null, { COND: blk(b('pm_cool_ready', { NAME: '랜덤 텔레포트' }, { WHO: P })) },
          [b('pm_rtp', { N: 2000 }, { WHO: P }), b('pm_cool_start', { NAME: '랜덤 텔레포트', SEC: 60 }, { WHO: P }), msg(P, '&a랜덤 위치로 왔습니다!')],
          [msg(P, join(T('&c아직 '), join(blk(b('pm_cool_left', { NAME: '랜덤 텔레포트' }, { WHO: P })), T('초 기다려야 합니다'))))])])
      ]
    },
    {
      cat: '전투·PvP', like: 'PlayerHeads', title: '머리 사냥 (사람을 잡으면 머리)',
      desc: '다른 사람을 쓰러뜨리면 그 사람 머리가 떨어지고 모두에게 알립니다.',
      blocks: [b('pm_on_kill', null, null, [b('pm_as_target', null, null, [
        b('pm_drop_head', null, { LOC: blk(b('pm_loc_ctx')), WHO: P }),
        b('pm_broadcast', null, { MSG: join(T('&c⚔ '), join(blk(b('pm_player_name', null, { WHO: ORIG() })), join(T('&7님이 &c'), join(nameOf(), T('&7님을 쓰러뜨렸습니다'))))) })
      ])])]
    },
    {
      cat: '전투·PvP', like: 'KillStreaks', title: '연속 처치 (킬 스트릭)',
      desc: '죽지 않고 연속으로 사람을 잡을수록 숫자가 올라갑니다. 5연속이면 모두에게 알리고 폭죽이 터집니다.',
      variables: [{ name: '연속 킬', id: 'tpl_streak', type: 'PMValue' }],
      blocks: [b('pm_on_kill', null, null, [b('pm_as_target', null, null, [
        b('pm_var_set', { VAR: { id: 'tpl_streak' } }, { WHO: P, N: num(0) }),
        b('pm_var_add', { VAR: { id: 'tpl_streak' } }, { WHO: ORIG(), N: num(1) }),
        b('pm_actionbar', null, { WHO: ORIG(), MSG: join(T('&c연속 처치 '), vget('tpl_streak', ORIG())) }),
        b('pm_if', null, { COND: cmp(vget('tpl_streak', ORIG()), '==', num(5)) }, [
          b('pm_broadcast', null, { MSG: join(T('&6&l'), join(blk(b('pm_player_name', null, { WHO: ORIG() })), T('님이 5연속 처치 중입니다!'))) }),
          b('pm_firework', { COLOR: 'ORANGE' }, { WHO: ORIG() })
        ])
      ])])]
    },
    {
      cat: '전투·PvP', like: 'PvPManager', title: 'PvP 켜고 끄기 (/pvp)',
      desc: '/pvp 로 내 PvP 를 끌 수 있습니다. 둘 중 한 명이라도 꺼져 있으면 서로 못 때립니다.',
      blocks: [
        cmd('pvp', [b('pm_pflag_toggle', null, { WHO: P, NAME: T('PvP 끔') }),
          b('pm_ifelse', null, { COND: flagIs('PvP 끔') }, [msg(P, '&ePvP 를 껐습니다. 다른 사람과 싸우지 않습니다')], [msg(P, '&cPvP 를 켰습니다. 조심합니다!')])]),
        b('pm_on_hit', null, null, [b('pm_as_target', null, null, [b('pm_if', null, { COND: or(flagIs('PvP 끔'), flagIs('PvP 끔', ORIG())) }, [
          b('pm_cancel'), b('pm_actionbar', null, { WHO: ORIG(), MSG: T('&e둘 중 한 명이 PvP 를 꺼서 때릴 수 없습니다') })])])])
      ]
    },
    {
      cat: '재미·이벤트', like: 'DoubleJump', title: '더블 점프',
      desc: '서바이벌에서 스페이스를 두 번 누르면 한 번 더 점프합니다. 땅에 닿으면 다시 쓸 수 있습니다.',
      blocks: [
        b('pm_on_join', null, null, [b('pm_if', null, { COND: blk(b('pm_gamemode_is', { GM: 'SURVIVAL' }, { WHO: P })) }, [b('pm_fly', { ON: 'true' }, { WHO: P })])]),
        b('pm_on_double_jump', null, null, [
          b('pm_cancel'), b('pm_fly', { ON: 'false' }, { WHO: P }),
          b('pm_dash', { N: 0.8 }, { WHO: P }), b('pm_launch', { N: 0.9 }, { WHO: P }),
          b('pm_particle', { PART: 'CLOUD', N: 15 }, { WHO: P }), snd('ENTITY_BAT_TAKEOFF')
        ]),
        b('pm_on_move', null, null, [b('pm_if', null, { COND: and(blk(b('pm_on_ground', null, { WHO: P })), blk(b('pm_gamemode_is', { GM: 'SURVIVAL' }, { WHO: P }))) }, [b('pm_fly', { ON: 'true' }, { WHO: P })])])
      ]
    },
    {
      cat: '재미·이벤트', like: 'JumpPads', title: '점프대 (철 압력판)',
      desc: '무거운 압력판(철)을 밟으면 보는 쪽으로 휙 날아갑니다.',
      blocks: [b('pm_on_plate', null, null, [b('pm_if', null, { COND: blk(b('pm_block_is', { MAT: 'HEAVY_WEIGHTED_PRESSURE_PLATE' })) }, [
        b('pm_dash', { N: 2.2 }, { WHO: P }), b('pm_launch', { N: 1.0 }, { WHO: P }), snd('ENTITY_FIREWORK_ROCKET_LAUNCH'), b('pm_particle', { PART: 'FIREWORK', N: 20 }, { WHO: P })])])]
    },
    {
      cat: '재미·이벤트', like: 'GSit', title: '앉기 (/sit)',
      desc: '/sit 을 치면 그 자리에 앉습니다. Shift 를 누르면 일어납니다.',
      blocks: [cmd('sit', [b('pm_sit', null, { WHO: P }), b('pm_actionbar', null, { WHO: P, MSG: T('&7Shift 를 누르면 일어납니다') })])]
    },
    {
      cat: '재미·이벤트', like: 'DecentHolograms', title: '떠 있는 글 (/holo)',
      desc: '관리자가 /holo 글 을 치면 그 자리 공중에 글이 뜹니다. /holoremove 로 근처 글을 지웁니다.',
      blocks: [
        cmd('holo', [onlyOp(), usage(1, '/holo 띄울 글  (&e 같은 색 코드도 됩니다)'),
          b('pm_holo', null, { LOC: blk(b('pm_loc_up', { N: 1 }, { L: LOCP() })), MSG: AREST(1) }), msg(P, '&a글을 띄웠습니다')]),
        cmd('holoremove', [onlyOp(), b('pm_holo_clear', { N: 4 }, { LOC: LOCP() }), msg(P, '&e근처 떠 있는 글을 지웠습니다')])
      ]
    },
    {
      cat: '재미·이벤트', like: 'CommandSigns', title: '표지판 명령어 (누르면 명령 실행)',
      desc: '관리자가 표지판 첫 줄에 [명령], 둘째 줄에 명령어(예: spawn)를 쓰면 누가 눌러도 그 명령어가 실행됩니다.',
      blocks: [
        b('pm_on_sign', null, null, [b('pm_if', null, { COND: blk(b('pm_text_eq', null, { A: blk(b('pm_sign_line', { N: 1 })), B: T('[명령]') })) }, [
          b('pm_ifelse', null, { COND: isOp() }, [b('pm_sign_set', { N: 1 }, { MSG: T('&1&l[명령]') }), msg(P, '&a명령 표지판을 만들었습니다')], [b('pm_cancel'), msg(P, '&c명령 표지판은 관리자만 만들 수 있습니다')])
        ])]),
        b('pm_on_click_block', null, null, [b('pm_if', null, { COND: and(blk(b('pm_block_is_sign')), blk(b('pm_text_eq', null, { A: blk(b('pm_block_sign_line', { N: 1 })), B: T('[명령]') }))) }, [
          b('pm_player_cmd', null, { WHO: P, CMD: blk(b('pm_block_sign_line', { N: 2 })) })])])
      ]
    },
    {
      cat: '아이템·제작', like: 'CustomCrafting', title: '나만의 제작법 (안장 · 이름표 · 썩은 살 → 가죽)',
      desc: '제작대에서 가죽으로 안장, 종이로 이름표를 만들고, 화로에 썩은 살을 구우면 가죽이 나옵니다.',
      blocks: [
        b('pm_recipe', { RESULT: 'SADDLE', N: 1, A1: 'LEATHER', A2: 'LEATHER', A3: 'LEATHER', B1: 'LEATHER', B2: 'IRON_INGOT', B3: 'LEATHER', C1: 'AIR', C2: 'AIR', C3: 'AIR' }),
        b('pm_recipe', { RESULT: 'NAME_TAG', N: 1, A1: 'AIR', A2: 'AIR', A3: 'STRING', B1: 'AIR', B2: 'PAPER', B3: 'AIR', C1: 'PAPER', C2: 'AIR', C3: 'AIR' }),
        b('pm_furnace', { IN: 'ROTTEN_FLESH', OUT: 'LEATHER' })
      ]
    },
    {
      cat: '아이템·제작', like: 'ItemsAdder (간단 버전)', title: '제작 가능한 번개 지팡이',
      desc: '금괴와 블레이즈 막대로 제작대에서 번개 지팡이(그림 그린 커스텀 아이템)를 만들고, 우클릭하면 번개가 칩니다. 5초 쿨타임.',
      blocks: [
        b('pm_item_def', { NAME: '번개 지팡이' }, null, [
          b('pm_ip_base', { MAT: 'BLAZE_ROD' }), b('pm_ip_name', { TEXT: '&e&l번개 지팡이' }), b('pm_ip_lore', { TEXT: '&7우클릭하면 보는 곳에 번개가 칩니다' }), b('pm_ip_glow')
        ]),
        b('pm_recipe_custom', { ITEM: '번개 지팡이', A1: 'AIR', A2: 'AIR', A3: 'GOLD_INGOT', B1: 'AIR', B2: 'BLAZE_ROD', B3: 'AIR', C1: 'BLAZE_ROD', C2: 'AIR', C3: 'AIR' }),
        b('pm_on_rightclick', null, null, [b('pm_if', null, { COND: blk(b('pm_hand_custom', { ITEM: '번개 지팡이' }, { WHO: P })) }, [
          b('pm_ifelse', null, { COND: blk(b('pm_cool_ready', { NAME: '번개' }, { WHO: P })) },
            [b('pm_lightning_look', null, { WHO: P }), b('pm_cool_start', { NAME: '번개', SEC: 5 }, { WHO: P }), b('pm_item_cd', { MAT: 'BLAZE_ROD', SEC: 5 }, { WHO: P })],
            [b('pm_actionbar', null, { WHO: P, MSG: T('&c아직 충전 중입니다') })])
        ])])
      ]
    },
    {
      cat: '채굴·생존', like: 'AutoPickup', title: '자동 줍기 (부순 블록이 바로 가방으로)',
      desc: '블록을 부수면 아이템이 땅에 안 떨어지고 바로 가방에 들어갑니다. 가방이 꽉 차면 발밑에 떨어집니다. 크리에이티브는 뺍니다.',
      blocks: [
        b('pm_on_break', null, null, [b('pm_if', null, { COND: not(blk(b('pm_gamemode_is', { GM: 'CREATIVE' }, { WHO: P }))) }, [
          b('pm_auto_pickup', null, { WHO: P })
        ])])
      ]
    },
    {
      cat: '재미·이벤트', like: 'Elevators', title: '엘리베이터 (철 블록 위에서 점프 · 웅크리기)',
      desc: '철 블록 위에서 점프하면 위층 철 블록으로, 웅크리면 아래층 철 블록으로 순간이동합니다. 철 블록을 위아래로 여러 개 놓아 두면 됩니다.',
      blocks: [
        b('pm_on_jump', null, null, [b('pm_if', null, { COND: blk(b('pm_under_is', { MAT: 'IRON_BLOCK' }, { WHO: P })) }, [
          b('pm_elevator', { DIR: '1', MAT: 'IRON_BLOCK' }, { WHO: P })
        ])]),
        b('pm_on_sneak', null, null, [b('pm_if', null, { COND: blk(b('pm_under_is', { MAT: 'IRON_BLOCK' }, { WHO: P })) }, [
          b('pm_elevator', { DIR: '-1', MAT: 'IRON_BLOCK' }, { WHO: P })
        ])])
      ]
    },
    {
      cat: '채굴·생존', like: 'SilkSpawners', title: '스포너 캐기 (섬세한 손길)',
      desc: '섬세한 손길 곡괭이로 스포너를 부수면 그 몹이 나오는 스포너를 얻습니다. 다시 놓으면 같은 몹이 나옵니다.',
      blocks: [
        b('pm_on_break', null, null, [b('pm_if', null, { COND: and(blk(b('pm_block_is', { MAT: 'SPAWNER' })), blk(b('pm_has_ench', { ENCH: 'silk_touch' }, { WHO: P }))) }, [
          b('pm_spawner_drop'), msg(P, '&a스포너를 캤습니다!')
        ])]),
        b('pm_on_place', null, null, [b('pm_if', null, { COND: blk(b('pm_block_is', { MAT: 'SPAWNER' })) }, [
          b('pm_spawner_apply', null, { WHO: P })
        ])])
      ]
    },
    {
      cat: '서버 관리', like: 'OreAnnouncer', title: '다이아 채굴 알림 (관리자에게)',
      desc: '누가 다이아 광석을 캐면 관리자(OP)들에게 누가 어디서 캤는지 알려줍니다. 엑스레이 핵을 잡을 때 씁니다.',
      blocks: [
        b('pm_on_break', null, null, [b('pm_if', null, { COND: blk(b('pm_block_name_has', null, { NAME: T('DIAMOND_ORE') })) }, [
          b('pm_log', null, { MSG: join(nameOf(), T(' 님이 다이아 광석을 캤습니다')) }),
          b('pm_each_player', null, null, [b('pm_if', null, { COND: isOp() }, [
            msg(P, join(T('&b[알림] &f'), join(blk(b('pm_player_name', null, { WHO: ORIG() })), join(T(' 님이 다이아를 캤습니다 &7('), join(blk(b('pm_coord', { AXIS: 'X' }, { WHO: ORIG() })), join(T(', '), join(blk(b('pm_coord', { AXIS: 'Y' }, { WHO: ORIG() })), join(T(', '), join(blk(b('pm_coord', { AXIS: 'Z' }, { WHO: ORIG() })), T(')'))))))))))
          ])])
        ])])
      ]
    },
    {
      cat: '전투·PvP', like: 'CombatLogX', title: '전투 중 나가기 금지',
      desc: '사람끼리 싸우면 15초 동안 전투 상태가 됩니다. 그동안 서버를 나가면 그 자리에서 쓰러지고 모두에게 알려집니다.',
      blocks: [
        b('pm_on_hit', null, null, [b('pm_as_target', null, null, [
          b('pm_cool_start', { NAME: '전투', SEC: 15 }, { WHO: P }),
          b('pm_cool_start', { NAME: '전투', SEC: 15 }, { WHO: ORIG() }),
          b('pm_actionbar', null, { WHO: P, MSG: T('&c전투 중! 15초 동안 나가면 안 됩니다') }),
          b('pm_actionbar', null, { WHO: ORIG(), MSG: T('&c전투 중! 15초 동안 나가면 안 됩니다') })
        ])]),
        b('pm_on_quit', null, null, [b('pm_if', null, { COND: not(blk(b('pm_cool_ready', { NAME: '전투' }, { WHO: P }))) }, [
          b('pm_kill_p', null, { WHO: P }),
          b('pm_broadcast', null, { MSG: join(T('&c'), join(nameOf(), T(' 님이 싸우다 도망가서 쓰러졌습니다'))) })
        ])])
      ]
    },
    {
      cat: '채팅·메시지', like: 'CoordinatesHUD', title: '좌표 표시 (화면 아래)',
      desc: '모든 사람의 화면 아래(액션바)에 지금 좌표가 늘 보입니다.',
      blocks: [
        b('pm_on_timer', { SEC: 1 }, null, [b('pm_each_player', null, null, [
          b('pm_actionbar', null, { WHO: P, MSG: join(T('&7X &f'), join(blk(b('pm_coord', { AXIS: 'X' }, { WHO: P })), join(T('  &7Y &f'), join(blk(b('pm_coord', { AXIS: 'Y' }, { WHO: P })), join(T('  &7Z &f'), blk(b('pm_coord', { AXIS: 'Z' }, { WHO: P }))))))) })
        ])])
      ]
    },
    {
      cat: '채팅·메시지', like: 'StaffChat', title: '관리자 채팅 (/sc)',
      desc: '/sc 할 말 을 치면 관리자(OP)끼리만 보이는 채팅이 됩니다.',
      blocks: [
        cmd('sc', [onlyOp(), usage(1, '/sc 할 말'),
          b('pm_each_player', null, null, [b('pm_if', null, { COND: isOp() }, [
            msg(P, join(T('&d[관리자] &f'), join(blk(b('pm_player_name', null, { WHO: ORIG() })), join(T('&7: &f'), AREST(1)))))
          ])])
        ])
      ]
    },
    {
      cat: '서버 관리', like: 'Reports', title: '신고 (/report)',
      desc: '/report 이름 이유 를 치면 접속해 있는 관리자에게 바로 알려지고, 콘솔에도 남습니다.',
      blocks: [
        cmd('report', [usage(2, '/report 이름 이유'),
          b('pm_log', null, { MSG: join(T('[신고] '), join(nameOf(), join(T(' → '), join(A(1), join(T(': '), AREST(2)))))) }),
          b('pm_each_player', null, null, [b('pm_if', null, { COND: isOp() }, [
            msg(P, join(T('&c[신고] &f'), join(blk(b('pm_player_name', null, { WHO: ORIG() })), join(T(' &7→ &e'), join(A(1), join(T(' &7: &f'), AREST(2)))))))
          ])]),
          msg(P, '&a신고가 접수됐습니다. 고맙습니다')
        ])
      ]
    },
    {
      cat: '서버 관리', like: 'EssentialsX', title: '얼리기 (/freeze)',
      desc: '/freeze 이름 으로 그 사람을 못 움직이게 합니다. 한 번 더 치면 풀립니다.',
      blocks: [
        cmd('freeze', [onlyOp(), usage(1, '/freeze 이름'),
          b('pm_find_player', null, { NAME: A(1) }, [
            b('pm_pflag_toggle', null, { WHO: P, NAME: T('얼음') }),
            b('pm_ifelse', null, { COND: flagIs('얼음') }, [msg(P, '&b관리자가 얼렸습니다. 움직일 수 없습니다'), msg(ORIG(), '&a얼렸습니다')], [msg(P, '&a이제 움직일 수 있습니다'), msg(ORIG(), '&a풀어줬습니다')])
          ], [msg(P, '&c그 사람은 지금 없습니다')])
        ]),
        b('pm_on_move', null, null, [b('pm_if', null, { COND: flagIs('얼음') }, [b('pm_cancel')])])
      ]
    },
    {
      cat: '경제·보상', like: 'XPBottle', title: '경험치 병 만들기 (/xpbottle)',
      desc: '/xpbottle 을 치면 레벨 10을 내고 경험치 병 10개를 받습니다.',
      blocks: [
        cmd('xpbottle', [
          b('pm_ifelse', null, { COND: cmp(blk(b('pm_level_of', null, { WHO: P })), '>=', num(10)) }, [
            b('pm_set_level', { N: 0 }, { WHO: P }),
            b('pm_give', { MAT: 'EXPERIENCE_BOTTLE', N: 10 }, { WHO: P }),
            msg(P, '&a레벨을 경험치 병 10개로 바꿨습니다')
          ], [msg(P, '&c레벨이 10 이상이어야 합니다')])
        ])
      ]
    },
    {
      cat: '재미·이벤트', like: 'Fishing+', title: '낚시 보물',
      desc: '물고기를 낚으면 가끔 다이아·에메랄드·경험치 같은 보물이 같이 나옵니다.',
      blocks: [
        b('pm_on_fish', null, null, [b('pm_if', null, { COND: blk(b('pm_chance', { N: 20 })) }, [
          b('pm_random_pick', null, null, [
            b('pm_give', { MAT: 'DIAMOND', N: 1 }, { WHO: P }),
            b('pm_give', { MAT: 'EMERALD', N: 3 }, { WHO: P }),
            b('pm_level', { N: 3 }, { WHO: P })
          ]),
          b('pm_title', null, { WHO: P, TITLE: T('&b보물을 낚았습니다!'), SUB: T('') }),
          snd('ENTITY_PLAYER_LEVELUP')
        ])])
      ]
    },
    {
      cat: '재미·이벤트', like: 'FirstJoinFireworks', title: '첫 접속 축하 폭죽',
      desc: '처음 온 사람이 들어오면 폭죽이 터지고 모두의 화면에 환영 글이 뜹니다.',
      blocks: [
        b('pm_on_join', null, null, [b('pm_if', null, { COND: blk(b('pm_first_join', null, { WHO: P })) }, [
          b('pm_firework', { COLOR: 'YELLOW' }, { WHO: P }),
          b('pm_wait', { SEC: 1 }, null, [b('pm_firework', { COLOR: 'AQUA' }, { WHO: P })]),
          b('pm_title_all', null, { TITLE: T('&e환영합니다!'), SUB: join(nameOf(), T(' 님이 처음 왔습니다')) })
        ])])
      ]
    }

  ];
  MORE.forEach((t) => TEMPLATES.push(t));

  const FIRST_CATS = {
    '환영 인사 + 첫 선물': '채팅·메시지', '돈 시스템': '경제·보상', '상점 메뉴': '경제·보상', '번개 지팡이': '아이템·제작',
    '욕설 막기': '채팅·메시지', '다이아 보너스': '채굴·생존', '낙하 피해 없애기': '채굴·생존', '켜질 때 공지 + 5분마다 알림': '채팅·메시지',
    '루비 검 (그림 그린 아이템)': '아이템·제작', '대시 깃털 (쿨타임)': '아이템·제작', '/pay 송금': '경제·보상', '럭키 블록': '재미·이벤트',
    '보스바 이벤트 타이머': '재미·이벤트', 'PvP 금지 + 폭발 방지': '전투·PvP'
  };
  TEMPLATES.forEach((t) => { if (!t.cat) t.cat = FIRST_CATS[t.title] || '재미·이벤트'; });

  const chainOf = (first) => { const out = []; for (let x = first; x; x = x.next && x.next.block) out.push(x); return out; };
  const numOf = (inp) => { const s = inp && (inp.block || inp.shadow); return s && s.fields ? Number(s.fields.NUM) : NaN; };
  function toGui(t) {
    const f = t.fields || {};
    const L = { rows: Number(f.ROWS) || 3, title: f.TITLE || '', fill: null, slots: {}, bg: null };
    const extra = [];
    chainOf(t.inputs && t.inputs.DO && t.inputs.DO.block).forEach((bt) => {
      if (bt.type === 'pm_menu_fill') { L.fill = bt.fields.MAT; return; }
      if (bt.type !== 'pm_menu_button') return;
      const bf = bt.fields;
      const slot = { mat: bf.MAT, amount: 1, name: bf.LABEL || '', lore: bf.DESC ? [bf.DESC] : [], action: { type: 'none' } };
      const body = chainOf(bt.inputs && bt.inputs.DO && bt.inputs.DO.block);
      const ie = body[0];
      const yes = ie && ie.type === 'pm_ifelse' ? chainOf(ie.inputs.DO && ie.inputs.DO.block) : [];
      const give = yes.find((x) => x.type === 'pm_give');
      if (body.length === 1 && ie.type === 'pm_ifelse' && ie.inputs.COND && ie.inputs.COND.block.type === 'pm_compare' && yes.some((x) => x.type === 'pm_var_sub') && give) {
        slot.mat = give.fields.MAT;
        slot.amount = Number(give.fields.N) || 1;
        slot.action = { type: 'buy', price: numOf(ie.inputs.COND.block.inputs.B) || 0, var: '돈' };
      } else if (body.length === 1 && ie.type === 'pm_menu_close') {
        slot.action = { type: 'close' };
      } else if (body.length) {
        extra.push({ type: 'pm_gui_click', fields: { MENU: f.NAME, SLOT: bf.SLOT }, inputs: { DO: bt.inputs.DO } });
      }
      L.slots[bf.SLOT] = slot;
    });
    return [{ type: 'pm_gui', fields: { NAME: f.NAME }, extraState: { layout: L } }].concat(extra);
  }
  function toItem(t) {
    const D = { base: 'STICK', name: '', lore: [], glow: false, unbreakable: false, enchants: [], texture: null, model: null };
    chainOf(t.inputs && t.inputs.DO && t.inputs.DO.block).forEach((p) => {
      const f = p.fields || {};
      if (p.type === 'pm_ip_base') D.base = f.MAT;
      else if (p.type === 'pm_ip_name') D.name = f.TEXT;
      else if (p.type === 'pm_ip_lore') D.lore.push(f.TEXT);
      else if (p.type === 'pm_ip_glow') D.glow = true;
      else if (p.type === 'pm_ip_unbreak') D.unbreakable = true;
      else if (p.type === 'pm_ip_enchant') D.enchants.push({ e: f.ENCH, lv: Number(f.LV) || 1 });
      else if (p.type === 'pm_ip_texture') D.texture = f.IMG;
      else if (p.type === 'pm_ip_model') D.model = Number(f.N);
    });
    return [{ type: 'pm_citem', fields: { NAME: (t.fields || {}).NAME }, extraState: { data: D } }];
  }
  TEMPLATES.forEach((t) => {
    t.blocks = [].concat(...t.blocks.map((b0) => (b0.type === 'pm_menu_def' ? toGui(b0) : b0.type === 'pm_item_def' ? toItem(b0) : [b0])));
  });

  root.PM_TEMPLATES = TEMPLATES;
  if (typeof module !== 'undefined' && module.exports) module.exports = TEMPLATES;
})(typeof window !== 'undefined' ? window : globalThis);
