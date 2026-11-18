/*
  读研模拟器 · 游戏主程序

  整体是一个立即执行函数，所有数据和函数共用同一个作用域。
  阅读顺序：数据（学生 / 导师 / 日常 / 事件 / 结局）→ 规则 → 操作（G.xxx）→ 界面（render）。
  数值与规则说明见 docs/玩法设计.md，事件清单见 docs/事件库.md。
*/

(function () {
  "use strict";
  const KEY = "yanmo_save_v10";
  const LBL = {
    health: "健康",
    mood: "心情",
    res: "心态",
    hair: "发量",
    rel: "人缘",
    scheme: "城府",
    luck: "人品",
    ability: "科研能力",
    progress: "科研进展",
    trust: "导师心腹",
    envy: "同辈忮忌",
    money: "金钱",
    wealth: "家境",
  };
  const ORDER = [
    "health",
    "mood",
    "res",
    "hair",
    "rel",
    "scheme",
    "luck",
    "ability",
    "progress",
    "trust",
    "envy",
  ];
  /* ================================================================
   * 学生类型：八种抽签结果，每种的属性高低项和描述
   * ================================================================ */
  const STUDENTS = [
    {
      tag: "学霸型",
      w: 1,
      hi: ["ability", "res"],
      lo: ["mood", "wealth"],
      desc: "本科成绩拔尖，上手比别人快，也坐得住。就是情绪容易起伏，兜里不宽裕。",
      a: {
        ability: 25,
        mood: 55,
        wealth: 30,
        rel: 40,
        health: 80,
        res: 60,
        hair: 75,
        scheme: 20,
        luck: 45,
      },
    },
    {
      tag: "社牛型",
      w: 1,
      hi: ["rel", "mood"],
      lo: ["ability", "res"],
      desc: "跟谁都聊得来，走到哪儿都有饭局，天塌下来也睡得着。科研底子薄了点。",
      a: {
        ability: 10,
        mood: 75,
        wealth: 35,
        rel: 70,
        health: 80,
        res: 40,
        hair: 75,
        scheme: 20,
        luck: 40,
      },
    },
    {
      tag: "家里有矿型",
      w: 1,
      hi: ["wealth", "hair"],
      lo: ["ability", "res"],
      desc: "生活费从来不是问题，气色也好。没吃过什么苦，科研和抗压都一般。",
      a: {
        ability: 8,
        mood: 70,
        wealth: 80,
        rel: 50,
        health: 80,
        res: 40,
        hair: 85,
        scheme: 15,
        luck: 40,
      },
    },
    {
      tag: "小镇做题家",
      w: 1,
      hi: ["res", "health", "ability"],
      lo: ["wealth", "scheme", "rel"],
      desc: "一路考上来的，能吃苦、身体好、坐得住。没钱，也不太会来事。",
      a: {
        ability: 20,
        mood: 55,
        wealth: 20,
        rel: 35,
        health: 90,
        res: 70,
        hair: 80,
        scheme: 10,
        luck: 45,
      },
    },
    {
      tag: "人精型",
      w: 1,
      hi: ["scheme", "rel"],
      lo: ["luck", "health"],
      desc: "察言观色是本能，导师一个眼神就知道该接什么话。运气和身体都一般。",
      a: {
        ability: 12,
        mood: 60,
        wealth: 45,
        rel: 60,
        health: 75,
        res: 55,
        hair: 70,
        scheme: 40,
        luck: 35,
      },
    },
    {
      tag: "欧皇型",
      w: 1,
      hi: ["luck", "mood"],
      lo: ["scheme", "ability"],
      desc: "抽卡必出金，考试总压线过。除了运气好，其他都平平。",
      a: {
        ability: 10,
        mood: 70,
        wealth: 40,
        rel: 50,
        health: 80,
        res: 45,
        hair: 75,
        scheme: 15,
        luck: 60,
      },
    },
    {
      tag: "天崩开局",
      w: 1,
      hi: [],
      lo: [],
      note: "各项全面偏低",
      noteCls: "down",
      desc: "跨专业调剂来的，什么都要从头学。没钱、没人脉，身体和心态也只在及格线上。",
      a: {
        ability: 5,
        mood: 50,
        wealth: 20,
        rel: 30,
        health: 70,
        res: 30,
        hair: 62,
        scheme: 10,
        luck: 30,
      },
    },
    {
      tag: "天选之子",
      w: 1,
      hi: [],
      lo: [],
      note: "各项全面偏高",
      noteCls: "up",
      desc: "本校保研，家境殷实，人缘好身体棒，连头发都比别人多。起点高出一截。",
      a: {
        ability: 22,
        mood: 75,
        wealth: 70,
        rel: 60,
        health: 90,
        res: 60,
        hair: 90,
        scheme: 30,
        luck: 55,
      },
    },
  ];
  function drawStudent(cur) {
    const pool = [];
    STUDENTS.forEach((t, i) => {
      if (i !== cur) for (let k = 0; k < t.w; k++) pool.push(i);
    });
    return pool[rnd(pool.length)];
  }
  /* ================================================================
   * 导师类型：四种导师的名字、毕业要求和描述
   * ================================================================ */
  const MENTORS = [
    {
      id: "big",
      req: "A",
      name: "头发灰白的大牛导师",
      desc: "学院里人人都听过这个名字。办公室的门常年关着，据说一年有大半时间在天上飞。",
      stipend: 500,
      mp: null,
      ma: 0,
      need: 5,
      gw: 1,
      bw: 1,
      rescue: 70,
      resMin: 70,
      letter: 3,
      tags: ["毕业要求：发一篇 CCF-A"],
    },
    {
      id: "young",
      req: "B",
      name: "刚入职的青年导师",
      desc: "比你大不了几岁，组里目前只有你一个学生。导师办公室的灯总是楼里最晚灭的。",
      stipend: 400,
      mp: 8,
      ma: 0.4,
      need: 9.9,
      gw: 1,
      bw: 1.3,
      rescue: 40,
      resMin: 70,
      letter: 1,
      tags: ["毕业要求：发一篇 CCF-B"],
    },
    {
      id: "nasty",
      req: "A",
      name: "项目很多的中年导师",
      desc: "手上同时跑着好几个项目，电话一个接一个。师兄师姐提起这位导师时，表情都有点复杂。",
      stipend: 800,
      mp: 2,
      ma: 0,
      need: 9.9,
      gw: 1,
      bw: 2,
      rescue: 70,
      resMin: 70,
      letter: 2,
      tags: ["毕业要求：发一篇 CCF-A"],
    },
    {
      id: "kind",
      req: "B",
      name: "话不多的中年导师",
      desc: "组不大，名气也不大。面试那天只问了你一个问题，然后说：“来吧。”",
      stipend: 400,
      mp: 5,
      ma: 0.2,
      need: 5,
      gw: 1.5,
      bw: 1,
      rescue: 60,
      resMin: 70,
      letter: 2,
      tags: ["毕业要求：发一篇 CCF-B"],
    },
  ];
  function sickOK(d) {
    return !d.sick || S.a.health < 50;
  }
  function dailyEff(d) {
    if (d.k !== "meet" || !S.mentor) return d.e;
    const e = Object.assign({}, d.e);
    e.progress = S.mentor.mp || 0;
    if (S.mentor.ma) e.ability = S.mentor.ma;
    else delete e.ability;
    return e;
  }
  /* ================================================================
   * 日常活动：每月四周里可以选的事，及其数值效果
   * ================================================================ */
  const DAILY = [
    {
      k: "meet",
      g: "科研",
      n: "找导师开小会",
      e: { ability: 0.2, progress: 5, trust: 1, envy: 1, mood: -1, hair: -0.5 },
    },
    {
      k: "read",
      g: "科研",
      n: "读论文",
      e: { res: 1, ability: 0.2, progress: 5, mood: -1, hair: -0.5 },
    },
    {
      k: "exp",
      g: "科研",
      n: "跑实验",
      e: { ability: 0.3, progress: 5, health: -1, mood: -1, hair: -0.5 },
    },
    { k: "hx", g: "科研", n: "帮导师做横向", e: { money: 200, health: -2 } },
    { k: "apply", g: "科研", n: "投简历", e: { mood: -1 }, y3: true },
    { k: "dinner", g: "社交", n: "聚餐", e: { money: -100, rel: 3, mood: 1 } },
    { k: "board", g: "社交", n: "桌游", e: { money: -60, rel: 1, mood: 3 } },
    { k: "ktv", g: "社交", n: "KTV", e: { money: -80, mood: 4, rel: 2, health: -1 } },
    { k: "treat", g: "社交", n: "请全组吃饭", e: { money: -200, envy: -2, rel: 2 } },
    { k: "kind", g: "社交", n: "日行一善", e: { luck: 2 }, rnd: true },
    { k: "sleep", g: "休养", n: "睡觉", e: { mood: 2, health: 2, hair: 1 } },
    { k: "gym", g: "休养", n: "健身", e: { money: -50, res: 2, health: 2, hair: 1 } },
    { k: "massage", g: "休养", n: "按摩", e: { money: -150, health: 4, mood: 1 } },
    { k: "shop", g: "休养", n: "购物", e: { money: -100, mood: 2, hair: 1 } },
    { k: "expo", g: "休养", n: "看展", e: { money: -80, res: 3, mood: 1 } },
    { k: "travel", g: "休养", n: "旅游", e: { money: -500, mood: 6, res: 2, health: 2 } },
    { k: "doctor", g: "休养", n: "看病", e: { money: -100, health: 6 }, sick: true },
    { k: "hospital", g: "休养", n: "住院", e: { money: -300, health: 15, mood: -2 }, sick: true },
  ];
  const LIVING = 400,
    LOVE = 200,
    END_M = 34;
  const T_M = [
    "深度强化学习",
    "图神经网络",
    "大语言模型",
    "扩散模型",
    "对比学习",
    "注意力机制",
    "知识蒸馏",
    "多智能体博弈",
    "因果推断",
    "小样本学习",
    "自监督学习", 
    "迁移学习",
    "同态加密",
    "联邦学习",
    "差分隐私",
    "区块链",
    "安全多方计算",
    "机器遗忘",
    "图像分割",
    "三维视觉",
    "世界模型",
    "异常检测",
    "具身智能",
  ];
  const T_T = [
    "食堂排队时长预测",
    "食堂插队行为识别",
    "导师情绪识别",
    "组会时长估计",
    "宿舍空调调度",
    "奶茶销量预测",
    "论文拒稿原因分析",
    "发际线后移建模",
    "外卖配送路径优化",
    "校园猫咪轨迹追踪",
    "实验室座位分配",
    "选课系统抢课策略",
    "快递驿站取件调度",
    "图书馆空座预测",
    "厕所排队时长预测",
    "学术不端检测",
    "食堂菜品推荐",
    "宿舍热水器调度",
    "快递到达时间预测",
    "Wi-Fi 信号优化",
    "外卖满减最优组合计算",
    "摸鱼行为识别",
    "今日午餐决策优化",
  ];
  const T_S = ["方法研究", "及其应用", "的再思考", "：一个新框架", "：理论与实践", "初探"];
  function genTitle() {
    return "基于" + T_M[rnd(T_M.length)] + "的" + T_T[rnd(T_T.length)] + T_S[rnd(T_S.length)];
  }
  const COMP = [
    "飞象科技",
    "蓝鲸智能",
    "星环数据",
    "北斗云图",
    "青柠互娱",
    "极光算力",
    "麦田机器人",
    "橘猫出行",
    "山海智驾",
    "云雀科技",
    "白鹭金融科技",
    "松果搜索",
  ];
  function startIntern(s, pre) {
    const c = COMP[rnd(COMP.length)];
    s.interns++;
    s.internLeft = 3;
    s.comps = (s.comps || []).concat([c]);
    return (
      (pre.indexOf("导师批了") === 0 ? "导师批了。" : "") +
      "你去了「" +
      c +
      "」实习，为期三个月，每月固定占掉一件活动、发 200 工资。简历多了一段实习"
    );
  }
  const FXNOTE = {
    "collabpaper:0": "一篇 A 类合作论文加进你的论文列表，你是共同一作；从「算法」阶段做起，每阶段消耗科研进展 30；可以当毕业论文；首投接收率 60%；同辈忮忌 50 以上时，第一次投稿前有四成概率被改成二作",
    "collabpaper:1": "一篇 A 类合作论文加进你的论文列表，你是二作；从「算法」阶段做起，每阶段消耗科研进展 20；不能当毕业论文；首投接收率 60%",
    "grabfirst:0": "这篇论文变成共同一作",
    "noopen:1": "一半概率作者回信，科研进展+3",
    "game:0": "",
    "nastycollab:0": "此后找导师开小会的科研进展从+2变成+6",
    "check:0": "本月科研进展超过 3 则导师心腹+1；否则心情-4、导师心腹-3",
    "hello:0": "在审论文本次接收概率+10%",
    "away:0": "下个月不开组会",
    "dup:0": "论文退回一个阶段（还在文献综述阶段则改为科研进展-5）",
    "dup:1": "40% 概率没找到差异点，论文退回一个阶段",
    "badtopic:1": "50% 概率推不通，论文退回一个阶段",
    "param:1": "40% 概率事后露馅，论文退回一个阶段",
    "doubt:2": "论文退回一个阶段",
    "steal:0": "这篇论文的一作署导师，求职和申博时效果打折",
    "refer:0": "去一家公司实习三个月",
    "gossip:0": "20% 概率传到导师耳朵里，导师心腹-5；没传过去的，一半概率之后走漏风声",
    "cat:1": "20% 概率被挠，健康-2",
    "crush:0": "获得对象",
    "award:0": "过去一年有接收的 CCF-A 论文拿一等（+1000），CCF-B 二等（+600），CCF-C 三等（+300）；二作降两档",
    "inherit:0": "按人缘分东西：80 以上健康+5、心情+3、科研进展+3；60–79 健康+3、心情+2、科研进展+2；40–59 健康+2、心情+1；40 以下健康+1",
    "predefense:0": "给出毕业论文的初评分，盲审 80 分及格",
    "blind:0": "盲审打分，80 分及以上通过；没过时导师心腹够高、初评够 70 分，导师会捞你；否则延毕半年，心情-10",
    "defense:0": "导师的论文要求已满足则答辩通过；没满足则导师不签字，延毕半年，心情-10",
    "farewell:0": "三年结束，进入毕业结算",
    "firsttalk:2": "一半概率讲得挺顺（导师心腹+2，心情+2），一半概率被问住（导师心腹-3，心情-3）",
    "plagcheck:0": "毕业论文盲审+2",
    "plagcheck:1": "15% 概率被打回降重，盲审-4",
    "plagcheck:2": "35% 概率被打回降重，盲审-6，心情-3",
    "card:0": "之后可能遇到失主约你吃饭",
    "junior:0": "之后师弟师妹会来帮你跑实验",
    "cardowner:0": "之后对方可能向你表白",
    "cardlove:0": "获得对象",
    "movie:0": "算一次约会",
    "movie:1": "算一次约会",
    "wisdom:0": "以后不会再遇到这个事件",
    "morexp:1": "在审论文本次接收概率-10%",
    "morexp:2": "一半概率审稿人被说服；另一半在审论文本次接收概率-15%",
    "gossipleak:0": "",
    "intern:0": "去一家公司实习三个月",
    "intern:1": "去一家公司实习三个月",
    "forcehx:0": "接下来三个月每月被派去做横向",
    "kindreview:0": "在审论文本次接收概率+10%",
    "rules:0": "接下来三个月，每月初心情-2、健康-1",
    "rules:1": "30% 概率被发现，导师心腹-6",
    "phdoffer:0": "去一家公司实习三个月；答应硕士毕业后留组读博，毕业时只能选留组读博",
  };
  /* ================================================================
   * 图片素材：结局、成就、事件配图（文件在 images/ 文件夹，路径写在这里）
   * ================================================================ */
  /* 图片分一套和两套：
   *   一套：  key: "images/xxx.webp"
   *   两套：  key: { b: "images/xxx_b.webp", g: "images/xxx_g.webp" }
   *   b＝主角是男孩的那一局（导师是女性），g＝主角是女孩的那一局（导师是男性）。
   *   只填了一版的，另一种主角也先用这一版。 */
  const I = (f) => "images/" + f + ".webp";
  const BG = (f) => ({ b: I(f + "_b"), g: I(f + "_g") });
  const ENDING_IMG = {
    job: BG("ending_job"),
    bigco: I("ending_bigco"),
    home: BG("ending_home"),
    phdab: I("ending_phdab"),
    dead: I("ending_dead"),
    phdcn: I("ending_phdcn"),
  };
  const ACH_IMG = {
    hair: { g: I("ach_hair_g") },
    stolen: I("ach_stolen"),
    rich: { g: I("ach_rich_g") },
    owl: I("ach_owl"),
    bald: { b: I("ach_bald_b") },
    social: I("ach_social"),
    travel: I("ach_travel"),
    gym: BG("ach_gym"),
    kind: I("ach_kind"),
    love: I("ach_love"),
    moon: BG("ach_moon"),
    free: BG("ach_free"),
    sleep: I("ach_sleep"),
  };
  const EV_IMG = {
    family: { g: I("event_family_g") },
    snitch: I("event_snitch"),
    disk: I("event_disk"),
    gpu: I("event_gpu"),
    dinner2: I("event_dinner2"),
    praise: I("event_praise"),
    award: { g: I("event_award_g") },
    peertreat: I("event_peertreat"),
    umbrella: I("event_umbrella"),
    gossip: I("event_gossip"),
    share: I("event_share"),
    milk: BG("event_milk"),
    hairloss: I("event_hairloss"),
    game: BG("event_game"),
    phone: BG("event_phone"),
    crush: { g: I("event_crush_g") },
    duck: I("event_duck"),
    cat: I("event_cat"),
  };
  /* 当前主角：b 或 g。旧存档没有记录时，用上次选的，再不行默认 g */
  function curSex() {
    return (S && S.sex) || (typeof M !== "undefined" && M.sex) || "g";
  }
  function pickImg(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    const x = curSex();
    return v[x] || v.b || v.g || "";
  }
  /* 主角头像：抽学生页可以换，玩家卡和地图上的小人也用它；外圈有一道纸边 */
  const AVATAR = { b: I("avatar_b"), g: I("avatar_g") };
  function avatar(cls) {
    return '<img class="ava ' + (cls || "") + '" alt="" src="' + AVATAR[curSex()] + '">';
  }
  function evImgs(id) {
    const u = pickImg(EV_IMG[id]);
    return u ? '<span class="evimgs"><img alt="" src="' + u + '"></span>' : "";
  }
  function achImgs(id, cls) {
    const u = pickImg(ACH_IMG[id]);
    return u ? '<img class="' + cls + '" alt="" src="' + u + '">' : "";
  }
  const NAMES = [
    "林深",
    "周末",
    "陈皮",
    "宋词",
    "江一苇",
    "顾北",
    "温如言",
    "沈默",
    "夏至",
    "安然",
    "白露",
    "许愿",
    "方圆",
    "苏打",
    "唐果",
    "乔木",
    "叶知秋",
    "路遥",
    "柯研",
    "麦冬",
    "时雨",
    "闻笛",
    "祝余",
    "阮棠",
  ];
  /* ================================================================
   * 论文规则与地图：论文档次与阶段、事件类别、36 格地图
   * ================================================================ */
  const PAPER = {
    C: { cost: 10, ps: [90], rev: 0, mix: [6, 3, 1], trust: 3, envy: 2 },
    B: { cost: 20, ps: [50], rev: 0, mix: [20, 18, 12], trust: 6, envy: 4 },
    A: { cost: 40, ps: [20], rev: 0, mix: [25, 30, 25], trust: 12, envy: 8 },
  };
  const DOWN = { A: 1, B: 2, C: 3 };
  const STAGES = ["定题", "文献综述", "算法", "实验", "写作"];
  const NS = STAGES.length;
  const CATS = { mentor: "导师", peer: "同门", research: "科研", life: "生活", fixed: "固定" };
  const SCHEME_REQ = 25,
    TRUST_REQ = 30;
  const BOARD = [
    "research",
    "life",
    "mentor",
    "peer",
    "research",
    "peer",
    "life",
    "mentor",
    "research",
    "peer",
    "mentor",
    "peer",
    "mentor",
    "peer",
    "life",
    "mentor",
    "life",
    "mentor",
    "peer",
    "life",
    "research",
    "mentor",
    "research",
    "peer",
    "research",
    "mentor",
    "research",
    "mentor",
    "peer",
    "mentor",
    "research",
    "mentor",
    "life",
    "mentor",
    "research",
    "mentor",
  ];
  const CAT_ORDER = ["mentor", "peer", "research", "life", "fixed"];
  function catTag(c) {
    return '<span class="tag cat-' + c + '">' + CATS[c] + "事件</span>";
  }
  function evOrder() {
    return CAT_ORDER.reduce((L, c) => L.concat(EVENTS.filter((e) => e.c === c)), []);
  }
  const TILE = { free: "安", mentor: "导", peer: "朋", research: "研", life: "活" };
  const needScheme = { req: (s) => s.a.scheme >= SCHEME_REQ, reqT: "需要城府 " + SCHEME_REQ };
  // 每局只出现一次的事件
  function once(id) {
    return (s) => !(s.evCount && s.evCount[id]);
  }
  function workPaper(s, lo, hi) {
    return s.papers
      .filter((p) => p.status === "doing" && p.stage >= lo && p.stage <= hi && p.stage < NS)
      .sort((a, b) => b.stage - a.stage)[0];
  }
  function regress(s, lo, hi) {
    const p = workPaper(s, lo, hi);
    if (!p) return "";
    if (p.stage <= 1) {
      s.a.progress = clamp(s.a.progress - 5);
      return "题目要重新定，科研进展-5";
    }
    p.stage--;
    return "论文 #" + p.id + " 退回到「" + STAGES[p.stage] + "」阶段";
  }
  /* ================================================================
   * 事件库：随机事件（导师 / 同门 / 科研 / 生活）及开学前的问题。事件清单见《事件库》文档
   * ================================================================ */
  const EVENTS = [
    {
      id: "collabpaper",
      c: "peer",
      tone: "good",
      n: "同门找你合作写论文",
      d: "组里一位师兄/师姐定了一个冲 CCF-A 的题，文献也看完了，算法还没想好：“来一起做？作者位置好商量。”",
      cond: (s) => s.a.rel >= 60 && !s.papers.some((p) => p.collab && p.status !== "accepted"),
      o: [
        {
          t: "全力投入，要共同一作",
          e: {},
          r: "你们约好了分工，算法和实验你出大头。",
          fn: (s) => {
            const p = addCollab(s, "cofirst");
            return (
              "《" + p.title + "》加进了你的论文列表，你是共同一作。从「算法」阶段做起，每个阶段消耗科研进展 " + collabCost(p)
            );
          },
        },
        {
          t: "帮忙做点实验，挂个二作",
          e: {},
          r: "举手之劳。",
          fn: (s) => {
            const p = addCollab(s, "second");
            return (
              "《" + p.title + "》加进了你的论文列表，你是二作。从「算法」阶段做起，每个阶段消耗科研进展 " + collabCost(p)
            );
          },
        },
        { t: "婉拒", e: {}, r: "你自己的活还干不完。" },
      ],
    },
    {
      id: "grabfirst",
      c: "peer",
      tone: "bad",
      n: "同门想要你论文的共同一作",
      d: "“这篇我也帮你跑过实验，咱俩共一不过分吧？”",
      cond: (s) =>
        s.a.envy >= 40 &&
        s.papers.some(
          (p) =>
            !p.collab &&
            !p.stolen &&
            (p.role || "first") === "first" &&
            p.stage >= 3 &&
            p.status !== "accepted",
        ),
      w: (s) => 1 + s.a.envy / 25,
      o: [
        {
          t: "给对方共同一作",
          e: { rel: 2, envy: -3 },
          r: "你在作者栏里加了一个星号。",
          fn: (s) => {
            const p = s.papers
              .filter(
                (x) =>
                  !x.collab &&
                  !x.stolen &&
                  (x.role || "first") === "first" &&
                  x.stage >= 3 &&
                  x.status !== "accepted",
              )
              .sort((a, b) => DOWN[a.lv] - DOWN[b.lv])[0];
            p.role = "cofirst";
            return "论文 #" + p.id + " 变成了共同一作";
          },
        },
        { t: "拒绝", e: { rel: -3, envy: 3 }, r: "对方当场没说什么，后来见面不打招呼了。" },
        Object.assign(
          { t: "把对方写进致谢", e: { rel: -1 }, r: "话说得客气，对方也不好再提。" },
          needScheme,
        ),
      ],
    },
    {
      id: "zotero",
      c: "peer",
      tone: "good",
      n: "同门分享了一个好用的文献工具",
      d: "几百篇 PDF 终于有地方安置了。",
      o: [{ t: "连夜整理", e: { progress: 2, res: 1, rel: 1 } }],
    },
    {
      id: "latiao",
      c: "peer",
      tone: "good",
      n: "同门分了你一包辣条",
      d: "实验室里弥漫着一股熟悉的味道。",
      o: [{ t: "一起吃", e: { mood: 2, rel: 1 } }],
    },
    {
      id: "noopen",
      c: "research",
      tone: "bad",
      n: "想复现的论文没有开源代码",
      d: "论文里写着“代码将在接收后公开”，那已经是三年前的事了。",
      o: [
        {
          t: "照着论文自己实现",
          e: { progress: -3, ability: 2 },
          r: "有两个超参数论文里压根没写，你试了一个星期。",
        },
        {
          t: "发邮件问作者",
          e: {},
          r: "你写了一封很客气的英文邮件。",
          fn: (s) => {
            if (Math.random() < 0.5) {
              s.a.progress = clamp(s.a.progress + 3);
              return "作者居然回了，还附上了代码。科研进展+3";
            }
            return "石沉大海";
          },
        },
        { t: "换一篇当 baseline", e: { progress: -2 }, r: "你默默把它从对比表里删掉了。" },
      ],
    },
    {
      id: "emptyrepo",
      c: "research",
      tone: "bad",
      n: "GitHub 仓库是空的",
      d: "README 里只有一行字：Code coming soon。这个 soon 已经持续了两年。",
      o: [{ t: "点个 star 表示抗议", e: { mood: -2, progress: -2 } }],
    },
    {
      id: "phone",
      c: "life",
      tone: "mid",
      n: "熬夜玩手机",
      d: "本来只想看十分钟，再抬头已经凌晨三点。",
      o: [{ t: "放下手机", e: { mood: 2, health: -2, hair: -1 } }],
    },
    {
      id: "game",
      c: "life",
      tone: "mid",
      n: "通宵打游戏",
      d: "室友喊你：“来不来？五排缺一个。”",
      o: [
        {
          t: "通宵上分",
          e: { mood: 4, health: -3, progress: -2 },
          r: "天亮的时候你们终于赢了一把。",
        },
        { t: "打两把就睡", e: { mood: 2 }, r: "适可而止。" },
        { t: "不打了，明天有组会", e: { res: 1 }, r: "你戴上了耳塞。" },
      ],
    },
    {
      id: "duck",
      c: "life",
      tone: "good",
      n: "今天食堂的烧鸭饭真好吃",
      d: "皮脆肉嫩，食堂师傅的手还没抖。",
      o: [{ t: "再来一份", e: { mood: 2, health: 1 } }],
    },
    {
      id: "nastycollab",
      c: "mentor",
      m: ["big","nasty"],
      tone: "good",
      n: "导师给你推荐了一个合作者",
      d: "“我没空管你，你去找隔壁组的张老师，做的就是这个方向。”",
      cond: (s) => !s.collab && s.month > 6,
      w: () => WCOL,
      o: [
        {
          t: "赶紧去联系张老师",
          e: { rel: 1 },
          fn: (s) => {
            s.mentor.mp = 6;
            s.mentor.ma = 0.2;
            s.collab = true;
            return "从此以后，找导师开小会（其实是找合作者讨论）的科研进展变成+6，自己摸索的效率也恢复正常";
          },
        },
      ],
    },
    {
      id: "check",
      c: "mentor",
      tone: "mid",
      n: "导师突击查进度",
      d: "导师突然出现在你身后：“你最近到底在干什么？”",
      o: [
        {
          t: "汇报",
          e: {},
          fn: (s) =>
            s.mprog > 3
              ? "你把这个月做的东西讲了一遍，导师点了点头。" + applyEff({ trust: 1 }, true)
              : "你支支吾吾讲不出东西。" + applyEff({ mood: -4, trust: -3 }, true),
        },
      ],
    },
    {
      id: "milk",
      c: "mentor",
      tone: "good",
      n: "导师请全组喝奶茶",
      d: "群里弹出一条消息：“下午茶我请，自己点。”",
      o: [{ t: "点最贵的", e: { mood: 2, rel: 1 } }],
    },
    {
      id: "forgot",
      c: "mentor",
      m: ["big", "nasty", "kind"],
      tone: "bad",
      n: "导师忘了你叫什么",
      d: "“那个……小王？”你不姓王。",
      o: [{ t: "尴尬地笑笑", e: { mood: -2 } }],
    },
    {
      id: "bro",
      c: "mentor",
      m: ["nasty"],
      tone: "good",
      n: "导师跟你推心置腹",
      d: "“来，今晚我请，咱俩喝一杯。”导师今天心情好得不像同一个人。",
      o: [{ t: "陪一杯", e: { trust: 3, mood: 2, health: -1 } }],
    },
    {
      id: "redpack",
      c: "mentor",
      m: ["nasty"],
      tone: "good",
      n: "导师突然发红包",
      d: "“上次那个项目结了，表现不错，拿去花。”",
      o: [{ t: "谢谢老师", e: { money: 300 } }],
    },
    {
      id: "praise",
      c: "mentor",
      m: ["nasty"],
      tone: "good",
      n: "导师当众夸你",
      d: "“你们都学学人家。”同门的目光齐刷刷扫过来。",
      o: [{ t: "低头装没听见", e: { trust: 2, envy: 3 } }],
    },
    {
      id: "oldscore",
      c: "mentor",
      m: ["nasty"],
      tone: "bad",
      n: "导师旧事重提",
      d: "三个月前的一件小事，又被拿出来讲了半个小时。",
      o: [{ t: "听着", e: { mood: -3 } }],
    },
    {
      id: "scold",
      c: "mentor",
      m: ["nasty"],
      tone: "bad",
      n: "组会上被导师严厉批评",
      d: "“这个结果你好意思拿出来讲？不要浪费大家的时间了。”会议室里安静了好几秒。",
      o: [
        { t: "低头听着", e: { mood: -5 }, r: "你盯着桌面上的一道划痕看了十分钟。" },
        { t: "当场解释", e: { trust: -5, res: 2 }, r: "导师皱了皱眉，没再说话。" },
        Object.assign(
          { t: "会后找导师单聊", e: { trust: 1 }, r: "导师语气缓和下来，说“下次注意”。" },
          needScheme,
        ),
      ],
    },
    {
      id: "weekend",
      c: "mentor",
      m: ["young"],
      tone: "bad",
      n: "导师拉你周末赶 deadline",
      d: "“论文不要再拖到下个月，这周末辛苦一下。”",
      o: [{ t: "通宵", e: { progress: 6, health: -3, mood: -2 } }],
    },
    {
      id: "handson",
      c: "mentor",
      m: ["young"],
      tone: "good",
      n: "导师手把手带你改代码",
      d: "导师把椅子拉到你旁边，一行一行看下去。",
      o: [{ t: "认真学", e: { ability: 2, progress: 5 } }],
    },
    {
      id: "meetboss",
      c: "mentor",
      m: ["young"],
      tone: "good",
      n: "导师带你去见自己的博士导师",
      d: "“这是我带的第一个学生。”",
      o: [{ t: "好好表现", e: { rel: 2, trust: 3 } }],
    },
    {
      id: "tenure",
      c: "mentor",
      m: ["young"],
      tone: "bad",
      n: "导师评职称压力大",
      d: "导师最近眼圈很重，看谁的进度都不满意。",
      o: [{ t: "躲着点", e: { mood: -2 } }],
    },
    {
      id: "nudge",
      c: "mentor",
      m: ["kind"],
      tone: "mid",
      n: "导师温和地催进度",
      d: "“不着急，但也别太不着急。”",
      o: [{ t: "明白", e: { mood: -1, progress: 2 } }],
    },
    {
      id: "care",
      c: "mentor",
      m: ["kind"],
      tone: "good",
      n: "导师问你生活上有没有困难",
      d: "“钱够不够花？家里都还好吧？”",
      o: [{ t: "心里一暖", e: { mood: 3 } }],
    },
    {
      id: "collab",
      c: "mentor",
      m: ["kind"],
      tone: "good",
      n: "导师帮你介绍了一个合作者",
      d: "隔壁组的博士后正好在做相关的东西。",
      o: [{ t: "互加好友", e: { progress: 5, rel: 1 } }],
    },
    {
      id: "away",
      c: "mentor",
      m: ["big"],
      tone: "good",
      n: "导师又出差了",
      d: "动态定位显示导师在另一个半球。",
      o: [
        {
          t: "安心干活",
          e: { mood: 2 },
          fn: (s) => {
            s.skipMeet = true;
            return "下个月不开组会";
          },
        },
      ],
    },
    {
      id: "queue",
      c: "mentor",
      m: ["big"],
      tone: "bad",
      n: "学生太多排不上号",
      d: "想找导师讨论，约了三周还没约上。",
      o: [{ t: "继续等", e: { progress: -2 } }],
    },
    {
      id: "dinner2",
      c: "mentor",
      m: ["big"],
      tone: "good",
      n: "导师在饭局上把你介绍给业内大佬",
      d: "“这是我的学生，做得不错。”",
      o: [{ t: "敬一杯", e: { rel: 3, trust: 2 } }],
    },
    {
      id: "hello",
      c: "mentor",
      m: ["big"],
      tone: "good",
      n: "导师帮你润色了 rebuttal",
      d: "你写的回复审稿意见被导师改得滴水不漏，语气不卑不亢。",
      cond: (s) => s.papers.some((p) => p.status === "submitted"),
      o: [
        {
          t: "认真学",
          e: {},
          fn: (s) => {
            const p = s.papers.find((x) => x.status === "submitted");
            p.bonus = (p.bonus || 0) + 10;
            return "论文 #" + p.id + " 这次的接收概率+10%";
          },
        },
      ],
    },
    {
      id: "senior",
      c: "mentor",
      m: ["big"],
      tone: "mid",
      n: "导师让大师兄/大师姐带你",
      d: "“以后具体的事，找你大师兄/大师姐。”",
      o: [
        { t: "抱紧师兄/师姐大腿", e: { rel: 2, progress: 3 }, r: "师兄/师姐把自己踩过的坑都告诉了你。" },
        { t: "自己摸索", e: { ability: 1 }, r: "慢是慢了点，但都是自己的。" },
      ],
    },
    {
      id: "dup",
      c: "research",
      tone: "bad",
      n: "发现题目已经有人做过了",
      d: "读文献读到一半，你翻到一篇去年的论文，标题和你的几乎一样。",
      cond: (s) => !!workPaper(s, 1, 2),
      w: () => 1.5,
      o: [
        { t: "换个题目重新来", e: { mood: -2 }, r: "长痛不如短痛。", fn: (s) => regress(s, 1, 2) },
        {
          t: "硬找差异点",
          e: { progress: -4 },
          r: "你把那篇论文逐字读了三遍。",
          fn: (s) => (Math.random() < 0.4 ? regress(s, 1, 2) : "总算找到了一个它没做的角度"),
        },
        Object.assign(
          { t: "请导师帮忙把关方向", e: { trust: 1 }, r: "导师三句话指出了还能做的口子。" },
          needScheme,
        ),
      ],
    },
    {
      id: "badtopic",
      c: "research",
      tone: "bad",
      n: "做着做着发现这个题目不对劲",
      d: "方法推到一半，你发现最初的假设根本不成立。",
      cond: (s) => !!workPaper(s, 2, 3),
      w: () => 1.5,
      o: [
        { t: "改换思路继续做", e: { progress: -5 }, r: "之前的推导有一半用不上了。" },
        {
          t: "硬着头皮往下推",
          e: { mood: -4 },
          r: "假装没看见那个漏洞。",
          fn: (s) => (Math.random() < 0.5 ? regress(s, 2, 3) : "居然推通了"),
        },
      ],
    },
    {
      id: "param",
      c: "research",
      tone: "bad",
      n: "发现实验有个参数设错了",
      d: "多写了一个零，之前三周的实验全是在这个设置下跑的。",
      cond: (s) => !!workPaper(s, 3, 3),
      w: () => 1.5,
      o: [
        { t: "全部重做", e: { progress: -6, luck: 1 }, r: "服务器又转了起来。" },
        {
          t: "只补几个关键实验",
          e: { progress: -2, luck: -2 },
          r: "你安慰自己影响不大。",
          fn: (s) => (Math.random() < 0.4 ? regress(s, 3, 3) : "结果趋势没变，蒙混过去了"),
        },
      ],
    },
    {
      id: "stuck",
      c: "research",
      tone: "bad",
      n: "论文写不下去了",
      d: "Introduction 的第一句话，你已经改了十一遍。",
      cond: (s) => !!workPaper(s, 4, 4),
      w: () => 1.5,
      o: [
        { t: "硬着头皮写", e: { mood: -5 }, r: "字是一个一个抠出来的。" },
        {
          t: "放一放，出去散散心",
          e: { mood: 2, progress: -4 },
          r: "回来的时候，文档还停在那一行。",
        },
      ],
    },
    {
      id: "doubt",
      c: "research",
      tone: "bad",
      n: "写着写着开始怀疑人生",
      d: "凌晨两点，你盯着屏幕想：我做的这个东西，到底有什么意义？",
      cond: (s) => !!workPaper(s, 3, 4),
      w: () => 1.5,
      o: [
        { t: "找同门聊聊", e: { rel: 1, mood: 1 }, r: "原来大家都这么想过。" },
        { t: "一个人扛着", e: { mood: -5, res: 1 }, r: "天亮了，你还是打开了文档。" },
        {
          t: "干脆推翻重写",
          e: { ability: 1 },
          r: "你删掉了整整一章。",
          fn: (s) => regress(s, 3, 4),
        },
      ],
    },
    {
      id: "forcehx",
      c: "mentor",
      m: ["nasty", "big"],
      tone: "bad",
      n: "导师派你去做横向",
      d: "“甲方下月要验收，你先把手上的事放一放。”",
      cond: (s) => !s.hxLeft,
      o: [
        {
          t: "好的老师",
          e: {},
          fn: (s) => {
            s.hxLeft = 3;
            return "接下来三个月，每月固定占掉一件活动去做横向，每月金钱+200、健康-2";
          },
        },
      ],
    },
    {
      id: "ppt",
      c: "mentor",
      m: ["big", "nasty"],
      tone: "mid",
      n: "导师让你帮忙做 PPT",
      d: "“下周有个汇报，你帮我把这二十页美化一下。”",
      o: [
        {
          t: "认真做，连动画都调了",
          e: { trust: 3, health: -2, progress: -2 },
          r: "导师在台上讲得很顺，一个字没提你。",
        },
        { t: "套个模板交差", e: { trust: -1 }, r: "导师看了一眼，说“行吧”。" },
      ],
    },
    {
      id: "pie",
      c: "mentor",
      m: ["nasty", "young"],
      tone: "mid",
      n: "导师画饼",
      d: "“好好干，明年送你出国交流。”",
      o: [
        {
          t: "信了，更卖力",
          e: { progress: 3, mood: 2, health: -2 },
          r: "你干劲十足地熬了几个夜。",
        },
        { t: "听听就好", e: { res: 1 }, r: "这话你去年也听过。" },
      ],
    },
    {
      id: "mentee",
      c: "mentor",
      tone: "mid",
      n: "导师让你带师弟师妹的课题",
      d: "“这几位师弟师妹刚进组，你多带带。”",
      cond: (s) => s.month > 12,
      o: [
        { t: "接下来", e: { trust: 3, rel: 2, progress: -3 }, r: "你的时间被切成了一小块一小块。" },
        Object.assign(
          { t: "委婉推掉", e: {}, r: "你说手上的论文正到关键阶段，导师没再坚持。" },
          needScheme,
        ),
        { t: "直接说没空", e: { trust: -3 }, r: "导师“哦”了一声。" },
      ],
    },
    {
      id: "pivot",
      c: "mentor",
      m: ["young", "nasty"],
      tone: "bad",
      n: "导师临时建议你改方向",
      d: "“我昨晚想了想，你这个方向没前途，换一个吧。”",
      o: [
        { t: "听导师的", e: { progress: -8, trust: 3 }, r: "之前的积累用不上了。" },
        { t: "坚持原方向", e: { trust: -4, res: 2 }, r: "你决定把这条路走到底。" },
      ],
    },
    {
      id: "recommend",
      c: "mentor",
      m: ["kind", "big"],
      tone: "good",
      n: "导师推荐你申奖学金",
      d: "名额只有一个，导师把你的名字报了上去。",
      cond: (s) => s.a.trust >= 40,
      o: [{ t: "谢谢老师", e: { money: 500, envy: 3 } }],
    },
    {
      id: "polish",
      c: "mentor",
      m: ["young", "kind"],
      tone: "good",
      n: "导师帮你逐句改论文",
      d: "返回的文档里全是红色批注。",
      cond: (s) => s.papers.length > 0,
      o: [{ t: "认真学", e: { ability: 2, progress: 5 } }],
    },
    {
      id: "lucky",
      c: "research",
      tone: "good",
      n: "意外跑出一个好结果",
      d: "调参调到凌晨，随手改了一个数，指标突然涨了三个点。",
      o: [{ t: "赶紧保存", e: { progress: 10, mood: 3 } }],
    },
    {
      id: "issue",
      c: "research",
      tone: "good",
      n: "开源社区有人回复了你的 issue",
      d: "卡了两周的报错，被一个陌生人三句话解决了。",
      o: [{ t: "感谢大佬", e: { progress: 4, ability: 1 } }],
    },
    {
      id: "kindreview",
      c: "research",
      tone: "good",
      n: "审稿意见很友善",
      d: "三个审稿人，没有一个是「Reviewer 2」。",
      cond: (s) => s.papers.some((p) => p.status === "submitted"),
      o: [
        {
          t: "松了口气",
          e: { mood: 3 },
          fn: (s) => {
            const p = s.papers.find((x) => x.status === "submitted");
            p.bonus = 10;
            return "论文 #" + p.id + " 这次的接收概率+10%";
          },
        },
      ],
    },
    {
      id: "server",
      c: "research",
      tone: "good",
      n: "组里买了新服务器",
      d: "八张卡，暂时还没人抢。",
      o: [{ t: "先占上", e: { progress: 5, mood: 2 } }],
    },
    {
      id: "dataset",
      c: "research",
      tone: "good",
      n: "发现一个现成的数据集",
      d: "正好是你需要的任务，还带标注。",
      o: [
        { t: "直接用", e: { progress: 6 }, r: "省了一个月的标注时间。" },
        {
          t: "自己再清洗一遍",
          e: { progress: 3, ability: 1 },
          r: "你发现了几处标注错误，心里踏实多了。",
        },
      ],
    },
    {
      id: "bug",
      c: "research",
      tone: "bad",
      n: "代码里发现一个隐藏很久的 bug",
      d: "之前所有的实验结果，可能都是错的。",
      o: [
        {
          t: "老实重跑所有实验",
          e: { progress: -6, ability: 2, luck: 2 },
          r: "结果掉了一点，但这回是真的。",
        },
        { t: "假装没看见", e: { res: -2, luck: -3 }, r: "你关掉了那个文件。" },
      ],
    },
    {
      id: "junior",
      c: "peer",
      tone: "good",
      n: "师弟师妹来问科研问题",
      d: "“师兄师姐，我这个 loss 怎么一直不降啊？”",
      cond: (s) => s.month > 12,
      o: [
        {
          t: "耐心讲清楚",
          e: { luck: 3, rel: 2, progress: -2 },
          r: "讲着讲着，你自己也想明白了一些东西。",
          fn: (s) => {
            s.juniorHelp = 1;
            return "";
          },
        },
        { t: "丢个链接让对方自己看", e: { luck: 1 }, r: "也算是帮了忙。" },
        { t: "说自己很忙", e: { luck: -2, rel: -1 }, r: "对方讪讪地走了。" },
      ],
    },
    {
      id: "card",
      c: "life",
      tone: "good",
      n: "捡到一张校园卡",
      d: "食堂门口的地上躺着一张饭卡，里面还有两百多块。",
      o: [
        {
          t: "送到失物招领",
          e: { luck: 3 },
          r: "失主后来在表白墙上感谢了你。",
          fn: (s) => {
            if (!s.cardOwner) s.cardOwner = 1;
            return "";
          },
        },
        { t: "假装没看见", e: {}, r: "你绕了过去。" },
        { t: "拿去食堂刷了几顿饭", e: { money: 250, luck: -5 }, r: "饭是香的，心里有点虚。" },
      ],
    },
    {
      id: "umbrella",
      c: "life",
      tone: "good",
      n: "下雨天",
      d: "教学楼门口，一个不认识的同学没带伞，正对着大雨发愁。",
      o: [
        { t: "顺路送一程", e: { luck: 2, rel: 1 }, r: "对方连说了三声谢谢。" },
        { t: "自己先走了", e: {}, r: "雨下得更大了。" },
        {
          t: "趁没人注意顺走门口一把伞给对方",
          e: { luck: -4, mood: 1, scheme: 3},
          r: "你倒是挺会做人的。",
        },
      ],
    },
    {
      id: "steal",
      c: "mentor",
      m: ["nasty"],
      tone: "bad",
      n: "导师想调整论文的作者顺序",
      d: "“这篇的思路我出了不少力，一作署我，你挂二作，对你以后也有好处。”",
      cond: (s) => s.papers.some((p) => !p.stolen && !p.collab && p.stage >= NS),
      o: [
        {
          t: "同意",
          e: { trust: 10, mood: -5 },
          r: "导师拍了拍你的肩膀。",
          fn: (s) => {
            const p = s.papers
              .filter((x) => !x.stolen && !x.collab && x.stage >= NS)
              .sort((a, b) => DOWN[a.lv] - DOWN[b.lv])[0];
            p.stolen = true;
            return "论文 #" + p.id + " 的一作署了导师，以后找工作和申博时这篇的效果打折";
          },
        },
        { t: "婉拒", e: { trust: -8, mood: 2 }, r: "导师有点不高兴，但论文还是你的。" },
        Object.assign(
          {
            t: "提议共同一作",
            e: { trust: 2, scheme: 3 },
            r: "你把话说得很漂亮，导师居然同意了。",
          },
          needScheme,
        ),
      ],
    },
    {
      id: "peertreat",
      c: "peer",
      tone: "good",
      n: "同门请客吃饭",
      d: "师兄/师姐发了顶会论文，请全组吃烧烤。",
      o: [{ t: "必须得去啊", e: { mood: 2, rel: 2 } }],
    },
    {
      id: "gossip",
      c: "peer",
      tone: "mid",
      n: "同门约你一起吐槽导师",
      d: "餐厅角落里，三个人压低了声音。",
      o: [
        {
          t: "一起吐槽个痛快",
          e: { mood: 4, rel: 2 },
          r: "心里话说完神清气爽。",
          fn: (s) => {
            if (Math.random() < 0.2) {
              s.a.trust = clamp(s.a.trust - 5);
              return "不知道怎么传到导师耳朵里，导师心腹-5";
            }
            if (Math.random() < 0.5) s.gossipLeak = 1;
            return "";
          },
        },
        { t: "默默听着", e: { rel: 1 }, r: "你负责点头和续杯。" },
        { t: "替导师找补两句好话", e: { rel: -2, scheme: 1 }, r: "气氛突然有点尴尬。" },
      ],
    },
    {
      id: "treat",
      c: "mentor",
      m: ["kind", "big", "nasty"],
      tone: "good",
      n: "导师请客吃饭",
      d: "导师心情不错，带全组下馆子。",
      o: [{ t: "敞开吃", e: { health: 2, mood: 2 } }],
    },
    {
      id: "trip",
      c: "mentor",
      tone: "good",
      n: "导师出差两周",
      d: "办公室的空气突然清新了许多。",
      o: [{ t: "这是好事啊", e: { mood: 3, health: 2 } }],
    },
    {
      id: "grant",
      c: "mentor",
      m: ["big", "nasty"],
      tone: "good",
      n: "导师拿到大项目",
      d: "钱包宽裕了起来，活儿也人人有份。",
      o: [{ t: "收下", e: { money: 200, health: -2 } }],
    },
    {
      id: "attack",
      c: "mentor",
      m: ["nasty", "young"],
      tone: "bad",
      n: "导师组会上连连追问",
      d: "“然后呢？所以呢？”全组安静。",
      o: [
        { t: "努力解释", e: { ability: 1, mood: 2, trust: -3 } },
        { t: "低头认错，回去改", e: { mood: -3, progress: 3 } },
        Object.assign({ t: "会后单独找导师沟通", e: { trust: 2 } }, needScheme),
      ],
    },
    {
      id: "midnight",
      c: "mentor",
      m: ["nasty", "young"],
      tone: "bad",
      n: "导师深夜发消息问进度",
      d: "手机亮了：“在吗？”",
      o: [
        { t: "秒回并汇报", e: { trust: 3, health: -2, mood: -2 } },
        { t: "装睡，明早再回", e: { mood: 1, trust: -1 } },
      ],
    },
    {
      id: "invoice",
      c: "mentor",
      tone: "mid",
      n: "导师让你帮忙贴发票报销",
      d: "一沓皱巴巴的出租车票。",
      o: [
        { t: "认真贴完", e: { trust: 2, mood: -2 } },
        { t: "推给师弟师妹", e: { rel: -2, scheme: 3, luck: -1 } },
      ],
    },
    {
      id: "undergrad",
      c: "mentor",
      tone: "mid",
      n: "导师让你带本科生毕设",
      d: "本科生问你：“师兄/师姐，Python 怎么装？”",
      o: [
        { t: "认真带", e: { rel: 2, progress: -3 } },
        { t: "放养", e: { trust: -1, luck: -2 } },
      ],
    },
    {
      id: "share",
      c: "peer",
      tone: "good",
      n: "师兄/师姐分享代码和数据",
      d: "省了你两周的重复劳动。",
      o: [{ t: "感恩", e: { progress: 5, rel: 1 } }],
    },
    {
      id: "refer",
      c: "peer",
      tone: "good",
      n: "同门给你推荐实习",
      d: "人缘好就是不一样，一位师兄/师姐直接内推了你。",
      cond: (s) => s.a.rel >= 60 && s.interns < 2 && !s.internLeft,
      o: [
        { t: "去实习", e: {}, fn: (s) => startIntern(s, "实习三个") },
        { t: "谢过，暂时不去", e: {} },
      ],
    },
    {
      id: "coauthor",
      c: "peer",
      tone: "mid",
      n: "同门想在你的论文上挂名",
      d: "“就挂个名，不影响你一作。”",
      cond: (s) => s.papers.length > 0,
      o: [
        { t: "同意", e: { rel: 3, envy: -3 } },
        { t: "拒绝", e: { rel: -2, envy: 2, luck: 5 } },
      ],
    },
    {
      id: "snitch",
      c: "peer",
      tone: "bad",
      n: "同门在导师面前告你的状",
      d: "说你天天摸鱼，在实验室打游戏。",
      w: (s) => 1 + s.a.envy / 25,
      o: [
        { t: "当面对质", e: { rel: -3, trust: -2 } },
        { t: "忍了", e: { mood: -3, trust: -2, scheme: 3 } },
        Object.assign(
          { t: "留好证据，反将一军", e: { trust: 1, envy: -2, scheme: 3 } },
          needScheme,
        ),
      ],
    },
    {
      id: "gpu",
      c: "peer",
      tone: "bad",
      n: "服务器 GPU 被其他人占满",
      d: "nvidia-smi 一片红。",
      o: [
        { t: "半夜爬起来抢", e: { progress: 3, health: -3 } },
        { t: "干等", e: { progress: -2 } },
        { t: "自费租云服务器", e: { money: -200, progress: 3 } },
        { t: "悄悄停掉别人的任务", e: { progress: 5, luck: -3, envy: 2 } },
      ],
    },
    {
      id: "idea",
      c: "research",
      tone: "good",
      n: "洗澡时想出了新 idea",
      d: "你一边洗澡一边唱歌，副歌还没唱完，卡了两周的思路突然通了。",
      o: [{ t: "赶紧记下来", e: { progress: 8 } }],
    },
    {
      id: "review",
      c: "research",
      tone: "mid",
      n: "导师发来了新的审稿任务",
      d: "署名是导师，干活是你。",
      o: [
        { t: "认真审完", e: { ability: 2, health: -1 }, r: "你写了整整两页意见。" },
        {
          t: "扫一眼摘要就给拒稿",
          e: { mood: 1, luck: -3 },
          r: "十分钟搞定。某个同行的三个月白等了。",
        },
      ],
    },
    {
      id: "repro",
      c: "research",
      tone: "bad",
      n: "实验结果突然复现不出来",
      d: "上周还好好的。",
      o: [{ t: "重新排查", e: { progress: -5, mood: -3 } }],
    },
    {
      id: "arxiv",
      c: "research",
      tone: "bad",
      n: "arXiv 上刚挂出一篇和你撞 idea 的论文",
      d: "连图都长得像。",
      o: [
        { t: "直接换方向", e: { progress: -8, ability: 2 } },
        { t: "硬着头皮做差异化", e: { mood: -3, ability: 1 } },
        { t: "当作没看见，也不引用它", e: { luck: -2, res: -1 } },
      ],
    },
    {
      id: "disk",
      c: "research",
      tone: "bad",
      n: "硬盘坏了，没备份",
      d: "咔哒，咔哒，咔哒。",
      o: [
        { t: "花钱恢复数据", e: { money: -200 } },
        { t: "重跑", e: { progress: -5, mood: -2 } },
      ],
    },
    {
      id: "cat",
      c: "life",
      tone: "good",
      n: "偶遇校园流浪猫",
      d: "一只橘猫蹲在图书馆门口看着你。",
      o: [
        { t: "花钱喂它一点猫粮", e: { money: -50, luck: 2, mood: 2 } },
        {
          t: "摸一下",
          e: { mood: 2 },
          fn: (s) => {
            if (Math.random() < 0.2) {
              s.a.health = clamp(s.a.health - 2);
              return "被挠了一爪子，健康-2";
            }
            return "";
          },
        },
        { t: "不管，直接走掉", e: {} },
      ],
    },
    {
      id: "crush",
      c: "life",
      tone: "good",
      n: "有人对你心动",
      d: "大概是因为你头发还挺多。有对象的话每个月心情都会好一点哦。",
      cond: (s) => s.a.hair > 70 && !s.partner && !s.ex,
      o: [
        {
          t: "在一起",
          e: {},
          fn: (s) => {
            s.partner = true;
            s.noDate = 0;
            return "你有对象了，日常页多了「对象」入口";
          },
        },
        { t: "婉拒", e: {} },
      ],
    },
    {
      id: "award",
      c: "fixed",
      when: "每年 10 月",
      tone: "good",
      fix: (s) => s.month % 12 === 2,
      n: "奖学金评定",
      d: "今年的奖学金评定开始了。评审只看过去一年发表的论文。",
      o: [
        {
          t: "看结果",
          e: {},
          fn: (s) => {
            // 过去 12 个月里接收的论文，取最好的一篇；二作降两档
            let best = 9;
            s.papers.forEach((p) => {
              if (p.status !== "accepted" || p.accAt == null || p.accAt <= s.month - 12) return;
              const t = DOWN[p.lv] + (p.role === "second" ? 2 : 0);
              if (t < best) best = t;
            });
            const P = { 1: ["一等", 1000], 2: ["二等", 600], 3: ["三等", 300] }[best];
            if (!P) return "过去一年没有发表的论文，与你无关";
            s.money += P[1];
            return "拿到" + P[0] + "奖学金，金钱+" + P[1];
          },
        },
      ],
    },
    {
      id: "conf",
      c: "life",
      tone: "good",
      n: "出差开学术会议",
      d: "公费旅游，顺便做个报告。",
      cond: (s) => s.papers.some((p) => p.status === "accepted"),
      o: [{ t: "出发", e: { mood: 5, rel: 2 } }],
    },
    {
      id: "intern",
      c: "life",
      tone: "mid",
      n: "大厂实习邀请",
      d: "HR 问你什么时候能到岗。实习一般是三个月。",
      cond: (s) => s.interns < 2 && !s.internLeft,
      o: [
        { t: "瞒着导师偷偷去", e: { trust: -5 }, fn: (s) => startIntern(s, "实习三个") },
        {
          t: "征求导师同意",
          e: {},
          req: (s) => s.a.trust >= TRUST_REQ,
          reqT: "需要导师心腹 " + TRUST_REQ,
          fn: (s) => startIntern(s, "导师批了"),
        },
        { t: "放弃", e: {} },
      ],
    },
    {
      id: "hairloss",
      c: "life",
      tone: "bad",
      n: "洗头时掉了一大把头发",
      d: "下水道又堵了。",
      o: [{ t: "默默清理", e: { hair: -3, mood: -2 } }],
    },
    {
      id: "cold",
      c: "life",
      tone: "bad",
      n: "换季感冒",
      d: "全实验室轮流咳嗽发烧。",
      o: [{ t: "多喝热水", e: { health: -3 } }],
    },
    {
      id: "family",
      c: "life",
      tone: "bad",
      n: "家里打来电话",
      d: "“什么时候毕业？有没有对象？”",
      o: [{ t: "嗯嗯好的", e: { mood: -3 } }],
    },
    {
      id: "offer",
      c: "life",
      tone: "bad",
      n: "本科同学晒大厂 offer",
      d: "动态里人人都在入职。",
      o: [{ t: "点个赞", e: { mood: -3 } }],
    },
    {
      id: "caught",
      c: "mentor",
      tone: "bad",
      n: "导师查岗，逮到你在实验室打游戏",
      d: "导师推门进来的时候，你屏幕上正放着团战。导师站在你身后看了足足十秒，脸色越来越黑。",
      w: (s) => (s.mentor.id === "nasty" ? 1.5 : 1),
      o: [
        { t: "老实认错", e: { trust: -4, mood: -3 }, r: "你当面关掉了游戏，导师摔门走了。" },
        Object.assign(
          { t: "说在等实验结果", e: { trust: -1 }, r: "你指了指另一块屏幕上的进度条，导师将信将疑地走了。" },
          needScheme,
        ),
        { t: "说这是休息时间", e: { trust: -8, res: 2 }, r: "“休息？你这三年都在休息吧！”整层楼都听见了。" },
      ],
    },
    {
      id: "rules",
      c: "mentor",
      tone: "bad",
      n: "导师发布实验室守则：以后每天来打卡",
      d: "群里发了一份《实验室管理规定》，第一条：工作日每天 9 点前到实验室打卡。",
      cond: (s) => !s.clockLeft,
      o: [
        {
          t: "每天准时打卡",
          e: { trust: 3 },
          r: "闹钟从九点提前到了八点。",
          fn: (s) => {
            s.clockLeft = 3;
            return "接下来三个月，每月初心情-2、健康-1";
          },
        },
        {
          t: "找同门帮忙代打卡",
          e: { luck: -3, rel: 1 },
          r: "你请同门喝了杯奶茶。",
          fn: (s) => {
            if (Math.random() < 0.3) {
              s.a.trust = clamp(s.a.trust - 6);
              return "监控拍到了两个人刷同一张卡，导师心腹-6";
            }
            return "";
          },
        },
        { t: "当没看见", e: { trust: -3 }, r: "导师在群里又@了你一次。" },
      ],
    },
    {
      id: "report",
      c: "mentor",
      tone: "bad",
      n: "导师要求写日报、周报、月报",
      d: "“从这周开始，每天下班前发日报，周五交周报，月底交月报。”",
      o: [
        { t: "事无巨细地写", e: { trust: 3, mood: -3, health: -1 }, r: "写日报的时间比干活的时间还长。" },
        { t: "复制粘贴上周的，换换日期", e: { trust: -1, luck: -1 }, r: "导师好像没发现，又好像发现了。" },
        { t: "顺手把明日计划理清楚", e: { progress: 3, mood: -2 }, r: "写着写着，你发现自己确实该干点正事了。" },
      ],
    },
    {
      id: "phdoffer",
      c: "mentor",
      tone: "mid",
      n: "导师给你一个令人羡慕的实习机会，条件是留下读博",
      d: "“这家公司的负责人是我的老同学，实习名额我可以帮你要。不过我希望你硕士毕业后留在组里读博。”",
      cond: (s) => s.month > 12 && s.interns < 2 && !s.internLeft && !s.phd,
      o: [
        {
          t: "答应",
          e: { trust: 15 },
          r: "导师笑得很开心：“好，以后就是自己人了。”",
          fn: (s) => {
            s.phd = "intern";
            return startIntern(s, "导师批了") + "；你答应了硕士毕业后留组读博";
          },
        },
        { t: "婉拒", e: { trust: -3 }, r: "导师说：“你好好考虑考虑。”" },
      ],
    },
    /* ---------- 2026-11-18 新增：同门 ---------- */
    {
      id: "peera",
      c: "peer",
      tone: "mid",
      n: "同门发了一篇 A 会",
      d: "群里刷屏的“恭喜恭喜”。你点开那篇论文，作者栏第一个就是坐你对面的那位。",
      cond: (s) => s.month > 4,
      o: [
        { t: "真心祝贺，顺便请教投稿经验", e: { rel: 2, ability: 1 }, r: "对方把审稿意见和 rebuttal 全发给了你。" },
        { t: "说声恭喜，回去默默加班", e: { progress: 4, health: -2 }, r: "那天晚上，实验室最后一盏灯是你关的。" },
        { t: "心里有点酸", e: { mood: -3, res: -1 }, r: "你刷了一晚上那篇论文，越看越睡不着。" },
        { t: "强啊姐妹/兄弟", e: { mood: +3, res: +1 }, r: "说明我们组有发顶会论文的实力，信心大增。" },
      ],
    },
    {
      id: "daifan",
      c: "peer",
      tone: "good",
      n: "同门问你要不要带饭",
      d: "“我去食堂，要不要帮你带一份？”",
      o: [
        { t: "要一份烧鸭饭", e: { money: -20, mood: 2, rel: 1 }, r: "饭到的时候还是热的。" },
        { t: "今天不用啦，下次我帮你带", e: { rel: 1 }, r: "从此你们约好轮流带饭。" },
      ],
    },
    {
      id: "teambuild",
      c: "peer",
      tone: "good",
      n: "实验室团建",
      d: "一位师兄/师姐在群里发起投票：这周末团建去哪？",
      o: [
        { t: "一起打桌游", e: { mood: 3, rel: 2, scheme: 1 }, r: "玩到第三局，你已经能看出谁在演了。" },
        {
          t: "去吃早茶，点豉汁排骨和虾饺",
          e: { money: -80, mood: 3, health: 1, rel: 2 },
          r: "一盘虾饺刚上桌就被抢光了。",
        },
        { t: "不去，留在实验室跑实验", e: { progress: 3, rel: -2 }, r: "整层楼只剩你和服务器。" },
      ],
    },
    {
      id: "delay",
      c: "peer",
      tone: "bad",
      n: "师兄/师姐要延毕了",
      d: "大师兄/大师姐的答辩申请没批下来，要延毕半年，在工位上坐了一下午，一句话也没说。",
      cond: (s) => s.month > 12,
      o: [
        { t: "请对方吃顿饭", e: { money: -60, rel: 2, luck: 1, mood: -1 }, r: "两瓶啤酒下肚，对方说“没事，再来半年”。" },
        { t: "问问卡在了哪里", e: { ability: 1, mood: -2 }, r: "你把对方踩过的坑一条条记了下来。" },
        { t: "默默加快自己的进度", e: { progress: 3, mood: -3, health: -1 }, r: "你突然觉得时间不太够用了。" },
      ],
    },
    /* ---------- 事件链的后续（前面的选择会解锁，出现概率 ×2） ---------- */
    {
      id: "juniorhelp",
      c: "peer",
      tone: "good",
      n: "师弟师妹来帮你跑实验",
      d: "“上次多亏师兄师姐讲明白了。你那组实验我帮你跑吧，反正我的卡空着。”",
      cond: (s) => s.juniorHelp === 1,
      w: () => 3,
      o: [
        {
          t: "那就麻烦你啦",
          e: { progress: 6, rel: 1 },
          fn: (s) => {
            s.juniorHelp = 2;
            return "";
          },
        },
      ],
    },
    {
      id: "gossipleak",
      c: "mentor",
      tone: "bad",
      n: "导师听说你在背后吐槽",
      d: "导师把你叫进办公室，没提别的，只说了一句：“听说你对我意见挺大？”",
      cond: (s) => s.gossipLeak === 1,
      w: () => 3,
      o: [
        {
          t: "老实认错",
          e: { trust: -2, mood: -2 },
          r: "导师摆摆手：“有意见当面提。”",
          fn: (s) => {
            s.gossipLeak = 2;
            return "";
          },
        },
        {
          t: "装作不知道",
          e: { trust: -5 },
          r: "导师盯着你看了几秒，没再说话。",
          fn: (s) => {
            s.gossipLeak = 2;
            return "";
          },
        },
        Object.assign(
          {
            t: "说是被断章取义了",
            e: { trust: -1, scheme: 1 },
            r: "你把那天的话圆了回来，导师将信将疑。",
            fn: (s) => {
              s.gossipLeak = 2;
              return "";
            },
          },
          needScheme,
        ),
      ],
    },
    {
      id: "cardowner",
      c: "life",
      tone: "good",
      n: "失主约你吃饭",
      d: "那张校园卡的主人在表白墙上找到了你：“上次多亏你了，请你吃顿饭吧？”",
      cond: (s) => s.cardOwner === 1 && !s.partner && !s.ex,
      w: () => 3,
      o: [
        {
          t: "好呀",
          e: { mood: 3, rel: 1 },
          r: "一顿饭吃了三个小时，你们居然是同一个地方出来的。",
          fn: (s) => {
            s.cardOwner = 2;
            return "";
          },
        },
        {
          t: "举手之劳，不用啦",
          e: { luck: 1 },
          r: "对方发来一个抱拳的表情。",
          fn: (s) => {
            s.cardOwner = 9;
            return "";
          },
        },
      ],
    },
    {
      id: "cardlove",
      c: "life",
      tone: "good",
      n: "饭搭子好像不只是饭搭子",
      d: "那次之后，你们又一起吃了好多顿饭。今晚散步回宿舍，对方突然停下来：“我们要不要试试在一起？”",
      cond: (s) => s.cardOwner === 2 && !s.partner && !s.ex,
      w: () => 3,
      o: [
        {
          t: "在一起",
          e: { mood: 5 },
          fn: (s) => {
            s.cardOwner = 9;
            s.partner = true;
            s.noDate = 0;
            return "你有对象了，日常页多了「对象」入口";
          },
        },
        {
          t: "还是做朋友吧",
          e: { rel: 1 },
          r: "之后你们还是经常一起吃饭。",
          fn: (s) => {
            s.cardOwner = 9;
            return "";
          },
        },
      ],
    },
    /* ---------- 按学年出现 ---------- */
    {
      id: "firsttalk",
      c: "fixed",
      when: "硕士一年级 9 月",
      tone: "mid",
      n: "第一次组会汇报",
      d: "这个月底是你进组后的第一次组会汇报。导师说：“讲讲你这个月看了什么。”",
      fix: (s) => s.month === 1,
      o: [
        { t: "提前一周准备，排练了三遍", e: { trust: 3, ability: 1, health: -2 }, r: "讲完导师点了点头：“思路挺清楚。”" },
        { t: "照着师兄师姐的模板讲", e: { trust: 1, rel: 1 }, r: "中规中矩，没出错也没出彩。" },
        {
          t: "前一晚通宵赶出来，临场发挥",
          e: { health: -2 },
          r: "你讲的时候手一直在抖。",
          fn: (s) => {
            if (Math.random() < 0.5) {
              s.a.trust = clamp(s.a.trust + 2);
              s.a.mood = clamp(s.a.mood + 2);
              return "居然讲得挺顺，导师心腹+2，心情+2";
            }
            s.a.trust = clamp(s.a.trust - 3);
            s.a.mood = clamp(s.a.mood - 3);
            return "被问住了三次，导师心腹-3，心情-3";
          },
        },
      ],
    },
    /* ---------- 毕业季固定事件（盲审、正式答辩、各奔东西的结算写在 monthStart 和 finalize 里） ---------- */
    {
      id: "predefense",
      c: "fixed",
      when: "硕士三年级 4 月（延毕则顺延半年）",
      tone: "mid",
      n: "预答辩",
      d: "答辩委员会的老师们翻着你的毕业论文初稿，提了一堆意见，最后给了个初评分。",
      fix: (s) => s.month === 32 + 6 * s.ext && !s.blindOK,
      o: [
        {
          t: "记下修改意见",
          e: {},
          fn: (s) => {
            const sc = blindScore(false);
            return (
              "初评 " +
              sc +
              " 分，" +
              (sc >= 80 ? "照这样送盲审问题不大" : "离盲审的 80 分还差 " + (80 - sc) + " 分，这个月抓紧推论文")
            );
          },
        },
      ],
    },
    {
      id: "blind",
      c: "fixed",
      when: "硕士三年级 5 月（延毕则顺延半年）",
      tone: "mid",
      n: "毕业论文盲审",
      d: "毕业论文送去盲审，两位匿名专家打分，80 分及以上才能参加正式答辩。",
      fix: () => false,
      o: [{ t: "等结果", e: {} }],
    },
    {
      id: "defense",
      c: "fixed",
      when: "硕士三年级 6 月（延毕则顺延半年）",
      tone: "mid",
      n: "正式答辩",
      d: "盲审过了，还差最后一步：导师在答辩申请上签字，然后上台答辩。",
      fix: () => false,
      o: [{ t: "上台", e: {} }],
    },
    {
      id: "gradtrip",
      c: "fixed",
      when: "硕士三年级 6 月，正式答辩通过后",
      tone: "good",
      n: "毕业旅行",
      d: "答辩结束，终于自由了。同门在群里提议：毕业旅行去粤港澳大湾区！",
      fix: (s) => s.month === 34 + 6 * s.ext && s.defended,
      o: [
        { t: "去香港澳门，看维港夜景", e: { money: -800, mood: 8, health: 1 }, r: "灯光秀亮起来的时候，你突然有点舍不得毕业。" },
        { t: "去广州深圳，从早茶吃到宵夜", e: { money: -400, mood: 5, rel: 2 }, r: "肠粉、烧鹅、牛腩煲、椰子鸡，你一天吃了五顿。" },
        { t: "在宿舍躺平，看大家发动态", e: { mood: 1 }, r: "你把每个人的照片都点了赞。" },
      ],
    },
    {
      id: "farewell",
      c: "fixed",
      when: "硕士三年级 7 月（延毕则顺延半年）",
      tone: "mid",
      n: "各奔东西",
      d: "7 月，宿舍楼下堆满了打包好的纸箱和麻袋。你和同学们在校门口拍了最后一张合影，挥挥手各奔东西。",
      fix: () => false,
      o: [{ t: "再见！", e: {} }],
    },
    {
      id: "plagcheck",
      c: "fixed",
      when: "硕士三年级 4 月，预答辩之后（延毕则顺延半年）",
      tone: "mid",
      n: "毕业论文查重",
      d: "预答辩过了，下个月就要送盲审。学校的查重只给一次机会，超标就要降重重审。网上自费查重一次几百块。",
      fix: (s) => s.month === 32 + 6 * s.ext && !s.blindOK && !(s.fixSeen && s.fixSeen.plagcheck),
      o: [
        {
          t: "花钱全文查一遍",
          e: { money: -300 },
          r: "报告里标红的几段你都改掉了。",
          fn: (s) => {
            s.blindAdj = (s.blindAdj || 0) + 2;
            return "论文更干净了，盲审分数+2";
          },
        },
        {
          t: "只查最没把握的那一章",
          e: { money: -100 },
          r: "相关工作那一章果然标红了一片。",
          fn: (s) => {
            if (Math.random() < 0.15) {
              s.blindAdj = (s.blindAdj || 0) - 4;
              return "没查的那几章也有问题，学校查重被打回降重，盲审分数-4";
            }
            return "学校查重顺利通过";
          },
        },
        {
          t: "都是自己写的，不查",
          e: {},
          r: "你对自己写的东西很有信心。",
          fn: (s) => {
            if (Math.random() < 0.35) {
              s.blindAdj = (s.blindAdj || 0) - 6;
              s.a.mood = clamp(s.a.mood - 3);
              return "引用的定义和公式撞了一大片，学校查重被打回降重，盲审分数-6，心情-3";
            }
            return "学校查重顺利通过，省下了几百块";
          },
        },
      ],
    },
    /* ---------- 青年导师专属 ---------- */
    {
      id: "firstgrant",
      c: "mentor",
      m: ["young"],
      tone: "good",
      n: "导师第一次拿到基金",
      d: "青年基金批下来了。导师在组里宣布的时候，声音都有点抖：“以后咱们组买卡不用省着了。”",
      cond: once("firstgrant"),
      o: [{ t: "替导师高兴", e: { money: 200, mood: 2, trust: 2 } }],
    },
    {
      id: "latenight",
      c: "mentor",
      m: ["young"],
      tone: "good",
      n: "导师陪你一起熬夜赶 deadline",
      d: "截稿前一晚，导师没有回家，搬了把椅子坐到你旁边一起改。凌晨三点，又点了两份夜宵。",
      o: [{ t: "边吃边改", e: { progress: 6, trust: 3, mood: 2, health: -2 } }],
    },
    /* ---------- 生活 ---------- */
    {
      id: "shopping",
      c: "fixed",
      when: "每年 11 月",
      tone: "mid",
      fix: (s) => s.month % 12 === 3,
      n: "购物节",
      d: "购物节到了。购物车里躺着二十件“早晚用得上”的东西，满减凑到了凌晨一点。",
      o: [
        { t: "全部下单", e: { money: -300, mood: 4 }, r: "接下来一周，快递站的人都认识你了。" },
        { t: "只买真正需要的", e: { money: -80, mood: 1 }, r: "理智地凑了个满减。" },
        { t: "清空购物车", e: { res: 1, mood: -1 }, r: "你关掉了 App，心在滴血。" },
      ],
    },
    {
      id: "roommate",
      c: "life",
      tone: "bad",
      n: "室友睡觉磨牙打呼",
      d: "凌晨两点，上铺的呼噜声和对床的磨牙声此起彼伏。",
      o: [
        { t: "买一副好耳塞，又套上降噪耳机", e: { money: -30, mood: -1 }, r: "世界终于安静了。" },
        { t: "硬扛着", e: { health: -2, mood: -2 }, r: "你数羊数到了第三千只。" },
        { t: "第二天委婉提醒一下", e: { rel: -1, mood: 1 }, r: "室友有点不好意思，说去买个止鼾贴。" },
      ],
    },
    {
      id: "firsttrip",
      c: "peer",
      tone: "good",
      n: "第一次跟同门一起出差",
      d: "跟着老板一起去外地开项目会。会上说的你一句没听懂，但是不用泡实验室，飞机上的盒饭都是香的。",
      cond: once("firsttrip"),
      o: [{ t: "出发", e: { envy: -3, rel: 2, mood: 3 } }],
    },
    {
      id: "grillfish",
      c: "peer",
      tone: "good",
      n: "学校门口新开了家烤鱼店",
      d: "开业打八折。同门在群里喊：“今晚谁去？”",
      o: [
        { t: "一起去", e: { money: -60, mood: 3, rel: 2 }, r: "一条鱼四个人抢，最后连豆芽都捞干净了。" },
        { t: "下次吧", e: {}, r: "群里发来一张烤鱼的照片，看起来皮很脆。" },
      ],
    },
    {
      id: "localfood",
      c: "peer",
      tone: "good",
      n: "同门大方分享了家里寄来的特产",
      d: "一个大纸箱摆在实验室中间：“家里寄的，大家随便拿。”",
      o: [{ t: "拿一份尝尝", e: { mood: 2, rel: 1 } }],
    },
    {
      id: "mango",
      c: "peer",
      tone: "good",
      n: "同门分享了家里寄来的芒果",
      d: "一整箱新鲜的芒果，一直放到全部熟透，实验室里全是甜味。",
      o: [{ t: "吃一个", e: { mood: 2, health: 1, rel: 1 } }],
    },
    {
      id: "pizza",
      c: "peer",
      tone: "good",
      n: "披萨店七五折",
      d: "一个人点根本吃不完，披萨还是得人多一起吃才爽。",
      o: [
        { t: "叫上同门一起", e: { money: -50, mood: 3, rel: 2 }, r: "三个大披萨十分钟就没了。" },
        { t: "算了，吃食堂", e: {}, r: "省钱也是一种快乐。" },
      ],
    },
    {
      id: "aquarium",
      c: "peer",
      tone: "good",
      n: "跟同门一起去海洋馆",
      d: "组会结束，同门买了团购票。",
      o: [
        { t: "去看北极熊和企鹅", e: { money: -100, mood: 4, rel: 2 }, r: "你在水底隧道站了半个小时，什么都没想。" },
        { t: "留下来赶进度", e: { progress: 2, rel: -1 }, r: "群里刷屏的全是企鹅。" },
      ],
    },
    {
      id: "movie",
      c: "life",
      tone: "good",
      n: "对象约你看电影",
      d: "“周末有部新片，一起去看吧？”",
      cond: (s) => s.partner,
      o: [
        {
          t: "看完再去吃顿好的",
          e: { money: -120, mood: 4 },
          r: "散场的时候，你们还在争论结局。",
          fn: (s) => {
            s.noDate = 0;
            s.dates = (s.dates || 0) + 1;
            return "算一次约会";
          },
        },
        {
          t: "就看个电影",
          e: { money: -60, mood: 3 },
          r: "爆米花吃到一半，你们都睡着了。",
          fn: (s) => {
            s.noDate = 0;
            s.dates = (s.dates || 0) + 1;
            return "算一次约会";
          },
        },
        { t: "这周要赶实验，下次吧", e: { mood: -2 }, r: "对方回了一个“哦”。" },
      ],
    },
    {
      id: "midge",
      c: "life",
      tone: "bad",
      n: "被蠓虫咬了",
      d: "去公园草地上坐了十分钟，第二天腿上起了一大片红包，又痒又疼。",
      o: [
        { t: "去校医院开支药膏", e: { money: -2, health: -2 }, r: "涂上凉凉的，好多了。" },
        { t: "忍忍就过去了", e: { health: -2, mood: -2 }, r: "奇痒难耐，根本忍不下去。" },
      ],
    },
    {
      id: "anniversary",
      c: "life",
      tone: "good",
      n: "学校百年校庆",
      d: "校庆当天，学校免费请全校师生吃饭。食堂排起了长队，食堂师傅的手一点也不抖。",
      cond: once("anniversary"),
      o: [{ t: "敞开吃", e: { mood: 3, health: 1 } }],
    },
    {
      id: "bubbletea",
      c: "life",
      tone: "good",
      n: "奶茶店出了新品，第二杯半价",
      d: "海报上的新品看起来很好喝。第二杯半价，一个人喝有点亏。",
      o: [
        { t: "叫上同门一人一杯", e: { money: -20, mood: 2, rel: 1 }, r: "你们在群里给新品打了八分。" },
        { t: "两杯都自己喝", e: { money: -20, mood: 3, health: -1 }, r: "喝到第二杯有点撑。" },
        { t: "忍住不喝", e: {}, r: "不买立省二十块。" },
      ],
    },
    {
      id: "standup",
      c: "life",
      tone: "good",
      n: "看脱口秀",
      d: "朋友推荐了一个脱口秀演员。演员讲读研的段子，台下笑得最大声的就是你。",
      o: [
        { t: "去看", e: { money: -180, mood: 4, res: 1 }, r: "原来大家都过得差不多。" },
        { t: "在宿舍看录播", e: { mood: 2 }, r: "笑得室友探头看了你一眼。" },
      ],
    },
    {
      id: "expat",
      c: "life",
      tone: "good",
      n: "在快递站帮外国同学寄快递",
      d: "一个外国同学对着中文寄件单发愁，快递站的工作人员也听不懂对方在说什么。",
      o: [
        { t: "上去帮忙", e: { luck: 2, mood: 2 }, r: "你连说带比划了十分钟，英语不好也不妨碍我热心肠。" },
        { t: "寄完自己的就走", e: {}, r: "相信手机翻译软件的能力。" },
      ],
    },
    {
      id: "kfc",
      c: "life",
      tone: "good",
      n: "周四炸鸡特价",
      d: "楼下炸鸡店周四全场特价。群里已经有人在发 V 我 50 了。",
      o: [
        { t: "去吃", e: { money: -50, mood: 2, health: -1 }, r: "炸鸡配可乐，永远的神。" },
        { t: "发段子，不去", e: { mood: 1 }, r: "你在群里发了一段自己现编的段子。" },
      ],
    },
    {
      id: "mcd",
      c: "life",
      tone: "good",
      n: "快餐店穷鬼套餐",
      d: "汉堡、薯条、可乐，十几块钱。月底了，这就是最好的一顿。",
      o: [{ t: "来一份", e: { money: -15, mood: 2 } , r: "怎么感觉汉堡越来越小了。"}],
    },
    {
      id: "wisdom",
      c: "life",
      tone: "bad",
      n: "智齿发炎了",
      d: "左下那颗智齿又肿了，半边脸鼓起来，连粥都喝不下去。",
      cond: (s) => !s.toothOut,
      o: [
        {
          t: "去医院拔掉",
          e: { money: -200, health: -2, mood: -2 },
          r: "麻药打了两针，医生撬了二十分钟。你捂着脸回了实验室。",
          fn: (s) => {
            s.toothOut = true;
            return "以后不会再因为这颗智齿发炎了";
          },
        },
        { t: "吃点消炎药先扛着", e: { money: -30, health: -2 }, r: "肿是消了，但你知道它还会回来的。" },
        { t: "不管它", e: { health: -4, mood: -3 }, r: "疼了整整一个星期。" },
      ],
    },
    {
      id: "rainstay",
      c: "research",
      tone: "good",
      n: "突然下了大暴雨",
      d: "本来准备回宿舍了，门口的雨大得看不见路。走不了，只好回到工位。",
      o: [{ t: "那就再学两个小时", e: { progress: 3, ability: 0.5 } }],
    },
    {
      id: "latelab",
      c: "research",
      tone: "mid",
      n: "一个人在实验室待到凌晨",
      d: "整间实验室空荡荡的。看着跑完的实验，你都有点佩服自己。",
      o: [{ t: "收工回宿舍", e: { progress: 4, res: 1, health: -2 } }],
    },
    /* ---------- 2026-11-18 第 74 次新增 ---------- */
    {
      id: "leftover",
      c: "peer",
      tone: "bad",
      n: "师兄/师姐毕业了，项目留给了你",
      d: "导师把对方做了一半的项目丢给你：“你接着做。”",
      cond: (s) => s.month > 6,
      o: [
        { t: "接下来，好好做完", e: { trust: 3, progress: -4, health: -2 }, r: "那份代码一个注释都没有。" },
        { t: "先问清楚做到哪了", e: { rel: 1, progress: -2, mood: -1 }, r: "对方走之前给你讲了一下午。" },
        Object.assign(
          { t: "跟导师说手上的论文正在关键期", e: { trust: -1 }, r: "导师想了想，把项目给了别人。" },
          needScheme,
        ),
      ],
    },
    {
      id: "noisy",
      c: "peer",
      tone: "bad",
      n: "同门在实验室大声打电话",
      d: "旁边工位的同门又在打电话，一打就是半个小时，整个实验室都听得见。",
      o: [
        { t: "提醒对方小声点", e: { rel: -2, mood: 1 }, r: "对方拿着手机出去打了，但之后见面有点尴尬。" },
        { t: "戴上耳机忍着", e: { mood: -2 }, r: "耳机里的白噪音盖不住那边的嗓门。" },
      ],
    },
    {
      id: "popsicle",
      c: "peer",
      tone: "bad",
      n: "冰箱里你的小蛋糕被人吃了",
      d: "你惦记了一下午的那块小蛋糕，冰箱里只剩一个空包装盒。",
      o: [
        { t: "在群里问是谁吃的", e: { rel: -1 }, r: "群里一片沉默，然后有人发了个“对不起”的表情。" },
        { t: "在冰箱上贴张纸条", e: { mood: -1, scheme: 1 }, r: "“本小蛋糕已舔过。”之后再也没丢过。" },
        { t: "算了，再去买一块", e: { money: -5, mood: -1 }, r: "还是你最爱的那个味道。" },
      ],
    },
    {
      id: "inherit",
      c: "fixed",
      when: "硕士一年级和二年级的 6 月",
      tone: "good",
      n: "师兄师姐毕业了",
      d: "师兄师姐在收拾工位，东西谁要谁拿。",
      fix: (s) => s.month === 10 || s.month === 22,
      o: [
        {
          t: "去帮忙收拾",
          e: {},
          fn: (s) => {
            const r = s.a.rel;
            const [x, e] =
              r >= 80
                ? ["大显示器、人体工学椅、机械键盘，连那盆养了三年的绿萝都留给了你", { health: 5, mood: 3, progress: 3 }]
                : r >= 60
                  ? ["大显示器和人体工学椅都留给了你", { health: 3, mood: 2, progress: 2 }]
                  : r >= 40
                    ? ["你分到了一把人体工学椅", { health: 2, mood: 1 }]
                    : ["好东西都被别人拿走了，你只捡到坐垫和靠枕", { health: 1 }];
            return x + "。" + applyEff(e, true);
          },
        },
      ],
    },
    {
      id: "teachersday",
      c: "fixed",
      when: "每年 9 月",
      tone: "mid",
      n: "教师节给导师送礼物",
      d: "一位师兄/师姐在群里说：“教师节到了，大家凑钱给导师买束花吧，一人五十。”",
      fix: (s) => s.month % 12 === 1,
      o: [
        { t: "参与凑份子", e: { money: -50, trust: 2, rel: 1 }, r: "卡片上签了一排名字，你的在中间。" },
        { t: "自己单独送一份", e: { money: -200, trust: 4, envy: 2 }, r: "导师收下了，同门看你的眼神有点微妙。" },
        { t: "不参与", e: { rel: -1, trust: -1 }, r: "卡片上没有你的名字。" },
      ],
    },
    {
      id: "scam",
      c: "life",
      tone: "bad",
      n: "同学发消息让你转账",
      d: "本科同学突然发来消息：“在吗？急事，先转我 500，明天就还你。”",
      o: [
        {
          t: "直接转过去",
          e: { money: -500, mood: -3 },
          r: "第二天同学在动态里说：我的账号被盗了，大家千万别转钱。",
        },
        { t: "先打个电话确认", e: { luck: 1 }, r: "同学说：“我没发啊！我号被盗了！”" },
      ],
    },
    {
      id: "cracked",
      c: "life",
      tone: "bad",
      n: "手机摔碎屏了",
      d: "啪。屏幕朝下。你捡起来的时候，裂纹像一张蜘蛛网。",
      o: [
        { t: "去换个屏", e: { money: -300 }, r: "又是崭新的一天。" },
        { t: "贴张膜凑合用", e: { money: -20, mood: -2 }, r: "每次划屏都有点扎手。" },
      ],
    },
    {
      id: "takeout",
      c: "life",
      tone: "bad",
      n: "外卖被人拿走了",
      d: "你下楼取外卖，架子上只剩别人的奶茶。",
      o: [
        { t: "再点一份", e: { money: -30, mood: -2 }, r: "等第二份的时候，你已经饿过头了。" },
        { t: "去食堂随便吃点", e: { mood: -2 }, r: "食堂只剩白菜了。" },
      ],
    },
    {
      id: "insomnia",
      c: "life",
      tone: "bad",
      n: "失眠了",
      d: "凌晨三点，你盯着天花板，脑子里一遍遍过实验结果。",
      o: [
        { t: "干脆起来干活", e: { progress: 3, health: -3, mood: -1 }, r: "天亮的时候，你多跑完了一组实验。" },
        { t: "躺着数羊", e: { health: -1, mood: -2 }, r: "数到一千多只的时候，闹钟响了。" },
        { t: "听点助眠音乐", e: { health: -1, mood: -1, res: 1 }, r: "迷迷糊糊睡着了两个小时。" },
      ],
    },
    {
      id: "checkup",
      c: "life",
      tone: "bad",
      n: "体检报告上一排箭头",
      d: "学校体检的报告出来了，好几项后面都标着向上的箭头。",
      o: [
        { t: "花钱去医院复查", e: { money: -150, mood: 1 }, r: "医生说问题不大，少熬夜就行。" },
        { t: "从今天开始锻炼", e: { health: 2, progress: -2 }, r: "你在操场跑了两圈就喘不上气。" },
        { t: "假装没看见", e: { mood: -2, health: -1 }, r: "报告被你塞进了抽屉最底层。" },
      ],
    },
    {
      id: "barber",
      c: "life",
      tone: "bad",
      n: "理发店办卡",
      d: "理发师一边剪一边说：“办张卡吧，充一千送三百，今天剪就免费。”",
      o: [
        { t: "被说动了，充了", e: { money: -300, mood: -1 }, r: "剪完一看，跟没剪差不多。" },
        { t: "坚决拒绝", e: { mood: -3 }, r: "理发师的剪刀好像突然没那么稳了。" },
      ],
    },
    {
      id: "morexp",
      c: "research",
      tone: "bad",
      n: "审稿人要求补十组实验",
      d: "Reviewer 2：“作者需要在更多数据集上验证方法的有效性。”后面列了十个数据集。",
      cond: (s) => s.papers.some((p) => p.status === "submitted"),
      o: [
        { t: "连夜补实验", e: { health: -3, mood: -2, ability: 1 }, r: "服务器和你一起熬了一个星期。" },
        {
          t: "只补最关键的几组",
          e: { progress: -2 },
          r: "你挑了三个最有把握的数据集。",
          fn: (s) => {
            const p = s.papers.find((x) => x.status === "submitted");
            p.bonus = (p.bonus || 0) - 10;
            return "论文 #" + p.id + " 这次的接收概率-10%";
          },
        },
        Object.assign(
          {
            t: "在 rebuttal 里据理力争",
            e: {},
            r: "你写了两页解释为什么不需要这些实验。",
            fn: (s) => {
              const p = s.papers.find((x) => x.status === "submitted");
              if (Math.random() < 0.5) return "审稿人被说服了";
              p.bonus = (p.bonus || 0) - 15;
              return "审稿人不买账，论文 #" + p.id + " 这次的接收概率-15%";
            },
          },
          needScheme,
        ),
      ],
    },
    {
      id: "noreply",
      c: "research",
      tone: "bad",
      n: "合作者一直不回邮件",
      d: "你上周发的邮件，到现在还是“已读”状态以外的任何状态都没有。",
      o: [
        { t: "再发一封催一下", e: { progress: -2, mood: -2 }, r: "这次你用了加粗和红字。" },
        { t: "请导师出面", e: { trust: -1 }, r: "导师一封邮件，对方十分钟就回了。" },
        { t: "对方那部分自己先做了", e: { progress: -4, ability: 1 }, r: "做完你发现，其实也没那么难。" },
      ],
    },
  ];
  /* ================================================================
   * 结局文案
   * ================================================================ */
  const ENDINGS = {
    dead: [
      "原地飞升",
      "健康归零。你在工位上眼前一白，原地飞升了。论文还停在第三章，身体才是革命的本钱。",
    ],
    quit: ["退学了", "你交了退学申请，走出校门的那一刻，天很蓝。"],
    rest: ["休学", "心情归零，你决定先休学一段时间，好好休息。"],
    fail: ["结业", "延毕了两次，还是没能同时过学校和导师的毕业要求，最终只拿到结业证。"],
    bigco: ["毕业，入职大厂", "简历上有实打实的好论文，你拿到了大厂 offer。"],
    job: ["毕业，找到工作", "凭着实习和项目经历，你找到了一份不错的工作。"],
    home: ["毕业即失业，回家啃老", "简历投了两百份，没有回音。先回家歇一歇吧。"],
    phdcn: ["毕业，国内读博", "新的四年开始了。"],
    phdab: ["毕业，海外读博", "你拖着三个行李箱，飞向了下一个实验室。"],
    stay: [
      "毕业，留组读博",
      "你没有离开这栋楼。工位还是那个工位，只是名牌上的「硕士研究生」换成了「博士研究生」。",
    ],
  };

  /* ================================================================
   * 基础工具函数与游戏状态（S 是当前这一局，存档在 localStorage）
   * ================================================================ */
  function clamp(v) {
    return Math.max(0, Math.min(100, v));
  }
  function rnd(n) {
    return Math.floor(Math.random() * n);
  }
  function sign(v) {
    return (v > 0 ? "+" : "") + v;
  }
  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  }
  function newState() {
    return {
      screen: "welcome",
      name: "",
      a: {},
      wealth: 0,
      money: 0,
      mentor: null,
      stu: -1,
      men: -1,
      month: 1,
      week: 1,
      step: "daily",
      pos: 0,
      dice: 0,
      ev: null,
      lastEv: null,
      evCount: {},
      result: "",
      papers: [],
      pid: 0,
      partner: false,
      noDate: 0,
      dates: 0,
      cnt: {},
      hx: 0,
      interns: 0,
      ext: 0,
      defended: false,
      blindOK: false,
      fixSeen: {},
      notices: [],
      crisis: null,
      warned: false,
      modal: null,
      log: [],
      ending: null,
      transfers: 0,
      qres: null,
      mprog: 0,
      plan: [],
      lastPlan: [],
      ask: null,
      applies: 0,
      tot: {},
      rejTotal: 0,
      broke: 0,
      nights: 0,
      blind: 0,
      pick: [],
      yearAcc: 0,
      ex: false,
      internLeft: 0,
      fixed: [],
      note: "",
    };
  }
  let S = newState();
  function load() {
    try {
      const t = localStorage.getItem(KEY);
      return t ? JSON.parse(t) : null;
    } catch (e) {
      return null;
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }
  function wipe() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* ================================================================
   * 规则：属性换算、科研进展折扣、效果结算
   * ================================================================ */
  function resFactor() {
    const r = S.a.res;
    return r < 30 ? 1.5 : r >= 70 ? 0.5 : 1;
  }
  const NASTY_F = 0.55,
    WCOL = 0.7,
    EXCL_W = 1.5; // 导师专属事件的权重倍数
  function lowF() {
    const n = (S.a.mood < 30 ? 1 : 0) + (S.a.health < 30 ? 1 : 0);
    return n === 2 ? 1 / 3 : n === 1 ? 0.5 : 1;
  }
  // 选项上显示的真实数值：科研进展按加成和折扣算，超过 70 的属性加分减半
  function realEff(e) {
    const r = {};
    for (const k in e) {
      let v = e[k];
      if (k === "progress" && v > 0) v = gainProg(v);
      else if (v > 0 && k !== "money" && k !== "envy" && k !== "progress" && S.a[k] > 70)
        v = Math.round(v * 5) / 10;
      r[k] = v;
    }
    return r;
  }
  function gainProg(v) {
    return Math.max(
      1,
      Math.round(
        (v + Math.floor(S.a.ability / 20)) *
          lowF() *
          (S.mentor && S.mentor.id === "nasty" && !S.collab ? NASTY_F : 1),
      ),
    );
  }
  function applyEff(e, isEvent) {
    const out = [];
    for (const k in e) {
      let v = e[k];
      if (k === "money") {
        S.money = v > 0 ? S.money + v : Math.max(Math.min(S.money, 0), S.money + v);
        out.push("金钱" + sign(v));
        continue;
      }
      if (k === "progress" && v > 0) {
        v = gainProg(v);
        S.mprog = (S.mprog || 0) + v;
      }
      if (k === "mood" && v < 0 && isEvent) v = Math.round(v * resFactor());
      if (v > 0 && k !== "progress" && k !== "envy" && S.a[k] > 70) v = v / 2;
      const old = S.a[k];
      S.a[k] = clamp(old + v);
      out.push(LBL[k] + sign(Math.round((S.a[k] - old) * 10) / 10));
    }
    return out.join("，");
  }
  function effText(e) {
    return Object.keys(e)
      .map((k) => LBL[k] + sign(e[k]))
      .join(" ");
  }
  function canPay(e) {
    return !(e.money < 0 && S.money < -e.money);
  }
  function yearNo(m) {
    return m <= 11 ? 1 : m <= 23 ? 2 : 3;
  }
  function yearSnap() {
    S.ys = {
      a: Object.assign({}, S.a),
      money: S.money,
      hx: S.hx,
      interns: S.interns,
      tot: Object.assign({}, S.tot),
      acc: S.papers.filter((p) => p.status === "accepted").length,
    };
  }
  function yearPage() {
    const b = S.ys || { a: S.a, money: S.money, hx: S.hx, interns: S.interns, tot: {}, acc: 0 };
    const row = (n, x, y) => {
      const d = Math.round(y) - Math.round(x);
      return (
        "<span>" +
        n +
        "</span><b>" +
        Math.round(x) +
        " → " +
        Math.round(y) +
        '</b><em class="' +
        (d > 0 ? "up" : d < 0 ? "dn" : "") +
        '">' +
        (d > 0 ? "+" + d : d < 0 ? "−" + -d : "持平") +
        "</em>"
      );
    };
    let h =
      '<div class="ygrid">' +
      ["health", "mood", "res", "hair", "rel", "scheme", "luck", "ability", "trust", "envy"]
        .map((k) => row(LBL[k], b.a[k] || 0, S.a[k]))
        .join("") +
      row("金钱", b.money, S.money) +
      "</div>";
    const own = S.papers.filter((p) => !p.collab),
      acc = S.papers.filter((p) => p.status === "accepted").length - b.acc;
    const st = (p) =>
      p.status === "accepted"
        ? "已接收"
        : p.status === "submitted"
          ? "在审"
          : p.status === "rejected"
            ? "被拒，待处理"
            : p.stage >= NS
              ? "写完待投"
              : p.stage > 0
                ? "做到「" + STAGES[p.stage - 1] + "」"
                : "刚立项";
    h +=
      "<p><b>论文</b>：这一年接收了 " +
      Math.max(0, acc) +
      " 篇。" +
      (S.papers.length
        ? S.papers.map((p) => "《" + esc(p.title) + "》CCF-" + p.lv + "，" + st(p)).join("；") +
          "。"
        : "手上还没有论文。") +
      "<br>导师的毕业要求是一篇 CCF-" +
      reqLv() +
      (reqOK() ? "，已经满足。" : "，还没有满足。") +
      "</p>";
    const top = DAILY.map((d) => [d.n, (S.tot[d.k] || 0) - (b.tot[d.k] || 0)])
      .filter((x) => x[1] > 0)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3);
    if (top.length)
      h +=
        "<p><b>做得最多的事</b>：" +
        top.map((x) => x[0] + " " + x[1] + " 次").join("，") +
        "。</p>";
    const hx = S.hx - b.hx,
      it = S.interns - b.interns;
    if (hx > 0 || it > 0)
      h +=
        "<p><b>经历</b>：" +
        [hx > 0 ? "横向 " + hx + " 次" : "", it > 0 ? "实习 " + it + " 段" : ""]
          .filter(Boolean)
          .join("，") +
        "。</p>";
    return h;
  }
  function dateStr(m) {
    const y = m > END_M ? 4 : yearNo(m);
    return ["硕士一年级", "硕士二年级", "硕士三年级", "延毕"][y - 1] + " " + (((m + 7) % 12) + 1) + " 月";
  }
  // 位置紧的地方（记录、地图中间、历史记录）用简称
  function dateShort(m) {
    const y = m > END_M ? 4 : yearNo(m);
    return ["研一", "研二", "研三", "延毕"][y - 1] + " " + (((m + 7) % 12) + 1) + " 月";
  }
  function log(t) {
    S.log.push(dateShort(S.month) + " · " + t);
    if (S.log.length > 40) S.log.shift();
  }
  // c、info：事件弹窗顶部那一栏（事件类型标签 + 掷骰 / 日期），普通提示不带
  function notice(t, x, c, info) {
    S.notices.push(c ? { t: t, x: x, c: c, info: info } : { t: t, x: x });
  }
  function evHead(c, info) {
    return (
      '<div class="top"><span class="tags">' + catTag(c) + '</span><span class="muted">' + info + "</span></div>"
    );
  }
  /* ================================================================
   * 跨局记录：结局、事件图鉴、成就、历史（存在 M，与单局存档分开）
   * ================================================================ */
  const MKEY = "yanmo_meta_v1";
  // endings / events / ach / runs 只记本机玩出来的；peers 是从别的浏览器导入的记录，按设备编号分开存，
  // 同一个文件导入两次只会覆盖、不会重复累加。显示时用下面的 endCount / evSeen / achGot / allRuns 合起来算。
  let M = { dev: "", endings: {}, events: {}, ach: {}, runs: [], peers: {}, noRank: false, rq: [], rmq: false };
  function loadMeta() {
    try {
      const t = localStorage.getItem(MKEY);
      if (t) {
        const m = JSON.parse(t);
        M = {
          dev: m.dev || "",
          endings: m.endings || {},
          events: m.events || {},
          ach: m.ach || {},
          runs: m.runs || [],
          peers: m.peers || {},
          sex: m.sex === "b" ? "b" : m.sex === "g" ? "g" : "",
          noRank: !!m.noRank,
          rq: Array.isArray(m.rq) ? m.rq.slice(-10) : [],
          rmq: !!m.rmq,
        };
      }
    } catch (e) {}
    if (!M.dev) {
      M.dev = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      saveMeta();
    }
  }
  function peerList() {
    return Object.keys(M.peers).map((k) => M.peers[k]);
  }
  function endCount(k) {
    return peerList().reduce((n, p) => n + ((p.endings && p.endings[k]) || 0), M.endings[k] || 0);
  }
  function evSeen(id) {
    return !!(M.events[id] || peerList().some((p) => p.events && p.events[id]));
  }
  function achGot(id) {
    return !!(M.ach[id] || peerList().some((p) => p.ach && p.ach[id]));
  }
  function allRuns() {
    const L = M.runs.slice();
    peerList().forEach((p) => (p.runs || []).forEach((r) => L.push(r)));
    return L.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 20);
  }
  function saveMeta() {
    try {
      localStorage.setItem(MKEY, JSON.stringify(M));
    } catch (e) {}
  }

  /* ================================================================
   * 排行榜：按毕业论文盲审分数排名，每个浏览器只留最高分、最低分各一条。
   * 数据存在 Cloudflare 的 D1 数据库，接口是同一网站下的 /api/（见 functions/api/[[route]].js）。
   * 走到盲审的局在结局时自动提交；没联网时先存在 M.rq，下次打开或打开排行榜时补交。
   * 小红书版不能联网，打包时这一段要去掉（rankOn 也会因为没有 fetch 直接返回 false）。
   * ================================================================ */
  // 接口地址：留空表示和游戏同一个网站。游戏放在别处（比如 GitHub Pages）时，填 Cloudflare 上的网址，例如 "https://grad-sim.pages.dev"
  const RANK_API = "";
  const RK = { st: "", data: null, tab: "hi" };
  function rankOn() {
    return (
      typeof fetch === "function" &&
      typeof location !== "undefined" &&
      /^https?:$/.test(location.protocol)
    );
  }
  function rankReq(path, opt) {
    return fetch(RANK_API + "/api/" + path, opt);
  }
  // 依次补交没传上去的成绩；退出排行榜时没删成功的，也在这里补删
  function rankFlush() {
    if (!rankOn()) return Promise.resolve();
    if (M.rmq)
      return rankReq("me?dev=" + encodeURIComponent(M.dev), { method: "DELETE" })
        .then((r) => {
          if (r.ok) {
            M.rmq = false;
            saveMeta();
            return rankFlush();
          }
        })
        .catch(() => {});
    if (M.noRank || !M.rq || !M.rq.length) return Promise.resolve();
    return rankReq("submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(M.rq[0]),
    })
      .then((r) => {
        // 400 是数据本身不合格，重试也没用，直接丢掉
        if (r.ok || r.status === 400) {
          M.rq.shift();
          saveMeta();
          return rankFlush();
        }
      })
      .catch(() => {});
  }
  function rankSubmit(k) {
    if (!S.bt || M.noRank) return;
    M.rq = (M.rq || [])
      .concat([
        {
          dev: M.dev,
          name: S.name,
          sex: curSex(),
          score: S.blind,
          mentor: S.mentor ? S.mentor.name : "",
          end: k,
        },
      ])
      .slice(-10);
    saveMeta();
    rankFlush();
  }
  function rankLoad() {
    if (!rankOn()) {
      RK.st = "off";
      return;
    }
    RK.st = "load";
    rankFlush()
      .then(() => rankReq("board?dev=" + encodeURIComponent(M.dev)))
      .then((r) => {
        if (r.status === 404) throw "off";
        if (!r.ok) throw "err";
        return r.json();
      })
      .then((d) => {
        RK.data = d;
        RK.st = "ok";
      })
      .catch((e) => {
        RK.st = e === "off" ? "off" : "err";
      })
      .then(() => {
        if (S.modal === "rank") render();
      });
  }
  function rankHtml() {
    if (!RK.st) rankLoad();
    const hi = RK.tab !== "lo";
    let h =
      '<div class="top"><h2>排行榜</h2><button class="mini" onclick="G.modal(null)">关闭</button></div>' +
      '<p class="muted">按毕业论文盲审分数排名。每个人只留自己的最高分和最低分各一条（同一个浏览器算一个人），走到盲审的局在结局时自动上榜。</p>' +
      '<div class="chips rk-tabs"><button class="chip' +
      (hi ? " on" : "") +
      '" onclick="G.rankTab(\'hi\')">高分榜</button><button class="chip' +
      (hi ? "" : " on") +
      '" onclick="G.rankTab(\'lo\')">低分榜</button></div>';
    if (RK.st === "off")
      return h + '<p class="result">这个网址没有排行榜服务，换到游戏的正式网址再打开就能看到。</p>';
    if (RK.st === "err")
      return (
        h +
        '<p class="result">排行榜暂时连不上，可能是网络不好。</p><button class="ghost" onclick="G.rank()">再试一次</button>'
      );
    if (RK.st !== "ok" || !RK.data) return h + '<p class="muted">正在加载……</p>';
    const L = RK.data[hi ? "hi" : "lo"] || [];
    let prev = null,
      no = 0;
    h += L.length
      ? '<ol class="rk">' +
        L.map((r, i) => {
          // 分数一样的并列同一名
          if (r.score !== prev) {
            no = i + 1;
            prev = r.score;
          }
          return (
            '<li class="' +
            (r.me ? "mine" : "") +
            '"><span class="rk-n">' +
            no +
            '</span><img class="ava rk-ava" alt="" src="' +
            AVATAR[r.sex === "b" ? "b" : "g"] +
            '"><span class="rk-who"><b>' +
            esc(r.name) +
            (r.me ? "<i>你</i>" : "") +
            "</b><small>" +
            (r.mentor ? "师从" + esc(r.mentor) : "") +
            (ENDINGS[r.end] ? " · " + ENDINGS[r.end][0] : "") +
            '</small></span><span class="rk-sc">' +
            r.score +
            "<small>分</small></span></li>"
          );
        }).join("") +
        "</ol>"
      : '<p class="muted">还没有人上榜，快来当第一个。</p>';
    const me = RK.data.me;
    const wait = !M.noRank && M.rq && M.rq.length;
    h +=
      '<p class="muted rk-me">' +
      (M.noRank
        ? "你现在不参加排行榜，可以在「存档」里重新打开。"
        : me
          ? (hi
              ? "你的最高分 " + me.hi + " 分，排第 " + me.hiRank
              : "你的最低分 " + me.lo + " 分，排第 " + me.loRank) +
            " 名，一共 " +
            RK.data.total +
            " 人上榜。"
          : "你还没有上榜。打到毕业论文盲审，结局时会自动上榜。") +
      (wait ? "还有 " + M.rq.length + " 局成绩没传上去，联网后会自动补交。" : "") +
      (M.noRank ? "" : "<br>上榜时会公开显示你起的名字和头像。") +
      "</p>";
    return h;
  }
  const ACH = [
    { id: "juan", n: "卷王", d: "找导师开小会 28 次以上", c: (s) => (s.tot.meet || 0) >= 28 },
    {
      id: "free",
      n: "自由的灵魂",
      d: "读到研三，一次小会都没开过",
      c: (s) => !s.tot.meet && s.month > 24,
    },
    { id: "sci", n: "科研新星", d: "两篇论文被接收", c: (s) => accN(s) >= 2 },
    {
      id: "top",
      n: "顶会选手",
      d: "有一篇 CCF-A 被接收",
      c: (s) => s.papers.some((p) => p.status === "accepted" && p.lv === "A"),
    },
    {
      id: "water",
      n: "水文大师",
      d: "三篇 CCF-C 被接收",
      c: (s) => s.papers.filter((p) => p.status === "accepted" && p.lv === "C").length >= 3,
    },
    { id: "unlucky", n: "倒霉蛋", d: "被拒稿 3 次以上", c: (s) => s.rejTotal >= 3 },
    { id: "moon", n: "月光族", d: "有 6 个月把钱花得一分不剩", c: (s) => s.broke >= 6 },
    { id: "rich", n: "小金库", d: "结束时存款超过 5000", c: (s) => s.money >= 5000 },
    { id: "worker", n: "打工人", d: "帮导师做横向 24 次以上", c: (s) => (s.tot.hx || 0) >= 24 },
    { id: "owl", n: "夜猫子", d: "组会前熬夜 6 次以上", c: (s) => s.nights >= 6 },
    { id: "walker", n: "走地鸡", d: "看展 12 次以上", c: (s) => (s.tot.expo || 0) >= 12 },
    { id: "travel", n: "旅行家", d: "旅游 6 次以上", c: (s) => (s.tot.travel || 0) >= 6 },
    { id: "gym", n: "健身达人", d: "健身 20 次以上", c: (s) => (s.tot.gym || 0) >= 20 },
    { id: "sleep", n: "睡神", d: "睡觉 24 次以上", c: (s) => (s.tot.sleep || 0) >= 24 },
    { id: "mic", n: "麦霸", d: "去 KTV 12 次以上", c: (s) => (s.tot.ktv || 0) >= 12 },
    {
      id: "social",
      n: "社交悍匪",
      d: "聚餐、桌游、KTV 加起来 40 次以上",
      c: (s) => (s.tot.dinner || 0) + (s.tot.board || 0) + (s.tot.ktv || 0) >= 40,
    },
    {
      id: "host",
      n: "组里的东道主",
      d: "请全组吃饭 10 次以上",
      c: (s) => (s.tot.treat || 0) >= 10,
    },
    { id: "kind", n: "活菩萨", d: "日行一善 20 次以上", c: (s) => (s.tot.kind || 0) >= 20 },
    { id: "hair", n: "发量王者", d: "结束时发量 95 以上", c: (s) => s.a.hair >= 95 },
    { id: "bald", n: "聪明绝顶", d: "结束时发量不到 30", c: (s) => s.a.hair < 30 },
    {
      id: "love",
      n: "爱情学业双丰收",
      d: "毕业时还有对象",
      c: (s, k) => s.partner && GRAD.indexOf(k) >= 0,
    },
    {
      id: "stolen",
      n: "为他人作嫁衣",
      d: "有论文的一作署了导师",
      c: (s) => s.papers.some((p) => p.stolen),
    },
    {
      id: "first",
      n: "开山大弟子",
      d: "在青年导师门下把导师心腹刷到 80 以上",
      c: (s) => s.mentor && s.mentor.id === "young" && s.a.trust >= 80,
    },
    { id: "move", n: "另起炉灶", d: "转组成功过", c: (s) => s.transfers >= 1 },
    { id: "blind", n: "盲审高分", d: "毕业论文盲审 95 分以上", c: (s) => s.blind >= 95 },
    {
      id: "late",
      n: "大器晚成",
      d: "延毕之后顺利毕业",
      c: (s, k) => s.ext >= 1 && GRAD.indexOf(k) >= 0,
    },
  ];
  const GRAD = ["bigco", "job", "home", "phdcn", "phdab", "stay"];
  function accN(s) {
    return s.papers.filter((p) => p.status === "accepted" && !p.collab).length;
  }
  function roleName(p) {
    return p.stolen
      ? "二作（一作署了导师）"
      : { first: "一作", cofirst: "共同一作", second: "二作" }[p.role || "first"];
  }
  function recordRun(k) {
    const got = ACH.filter((a) => {
      try {
        return a.c(S, k);
      } catch (e) {
        return false;
      }
    }).map((a) => a.id);
    S.runAch = got;
    S.newAch = got.filter((id) => !achGot(id));
    S.newEnd = !endCount(k);
    got.forEach((id) => {
      M.ach[id] = 1;
    });
    M.endings[k] = (M.endings[k] || 0) + 1;
    M.runs.unshift({
      t: Date.now(),
      name: S.name,
      end: k,
      mentor: S.mentor ? S.mentor.name : "",
      when: dateShort(Math.min(S.month, END_M + 6 * S.ext)),
      acc: S.papers
        .filter((p) => p.status === "accepted")
        .map((p) => p.lv)
        .join(""),
      blind: S.blind || 0,
      ach: got.length,
    });
    if (M.runs.length > 20) M.runs.length = 20;
    saveMeta();
  }
  // 毕业论文盲审：从 0 分加起。只算一作和共同一作的论文（二作不能当毕业论文），取最好的两篇。
  // 每完成一个阶段 8 分，两篇都写完正好 80 分；写完的论文再按投稿、接收、档次加分，最后加 0–3 分随机。
  function thesisOK(p) {
    return p.role !== "second";
  }
  function blindScore(rand) {
    const st = S.papers
      .filter(thesisOK)
      .map((p) => {
        const n = Math.min(p.stage, NS);
        let v = n * 8;
        if (n >= NS) {
          if (p.subs > 0) v += 2;
          if (p.status === "accepted") v += 3;
          v += { A: 2, B: 1, C: 0 }[p.lv];
        }
        return v;
      })
      .sort((a, b) => b - a);
    const v = (st[0] || 0) + (st[1] || 0) + (S.blindAdj || 0) + (rand ? rnd(4) : 0);
    return Math.round(Math.max(0, Math.min(100, v)));
  }
  function endImg(k) {
    const u = pickImg(ENDING_IMG[k]);
    return u ? '<span class="evimgs endimgs"><img alt="' + ENDINGS[k][0] + '" src="' + u + '"></span>' : "";
  }
  function endDetail(k) {
    return (
      '<div class="paper"><h3>' +
      ENDINGS[k][0] +
      "</h3>" +
      endImg(k) +
      "<p>" +
      ENDINGS[k][1] +
      '</p><p class="muted">已达成 ' +
      endCount(k) +
      " 次</p></div>"
    );
  }
  function evDetail(id) {
    const e = EVENTS.find((x) => x.id === id);
    if (!e) return "";
    const one = (o, i) => {
      const fx = [effText(o.e), FXNOTE[id + ":" + i]].filter(Boolean).join("；") || "没有变化";
      return fx;
    };
    let h =
      '<div class="paper"><div class="top"><h3>' +
      e.n +
      '</h3><span class="tags">' +
      catTag(e.c) +
      "</span></div>" +
      (e.when ? '<p class="muted">时间：' + e.when + "</p>" : "") +
      '<p class="story st-' +
      e.c +
      '">' +
      evImgs(id) +
      e.d +
      "</p>";
    if (e.o.length === 1) h += '<p class="muted">直接结算：' + one(e.o[0], 0) + "</p>";
    else
      h += e.o
        .map(
          (o, i) =>
            "<p><b>" +
            "甲乙丙丁"[i] +
            "　" +
            o.t +
            "</b>" +
            (o.reqT ? "（" + o.reqT + "）" : "") +
            '<br><span class="muted">' +
            (o.r ? o.r + " " : "") +
            one(o, i) +
            "</span></p>",
        )
        .join("");
    return h + "</div>";
  }
  function albumList(t) {
    if (t === "end") return Object.keys(ENDINGS).filter((k) => endCount(k));
    if (t === "ev") return evOrder().filter((e) => evSeen(e.id)).map((e) => e.id);
    return ACH.filter((a) => achGot(a.id)).map((a) => a.id);
  }
  function albumDetail() {
    const o = S.open,
      L = albumList(o.t);
    let i = L.indexOf(o.id);
    if (i < 0) {
      return "";
    }
    const name = { end: "结局", ev: "事件", ach: "成就" }[o.t];
    let body;
    if (o.t === "end") body = endDetail(o.id);
    else if (o.t === "ev") body = evDetail(o.id);
    else {
      const a = ACH.find((x) => x.id === o.id);
      body =
        '<div class="paper"><h3>' +
        a.n +
        "</h3>" +
        (ACH_IMG[a.id] ? '<div class="achimgs">' + achImgs(a.id, "achimg") + "</div>" : "") +
        '<p class="story">' +
        a.d +
        '</p><p class="muted">已解锁</p></div>';
    }
    return (
      '<div class="top"><h2>' +
      name +
      '图鉴</h2><button class="mini" onclick="G.open(null)">返回图鉴</button></div>' +
      '<div class="pager"><button class="mini" onclick="G.nav(-1)"' +
      (L.length < 2 ? " disabled" : "") +
      ' aria-label="上一个">‹ 上一个</button><span class="muted">' +
      (i + 1) +
      " / " +
      L.length +
      '</span><button class="mini" onclick="G.nav(1)"' +
      (L.length < 2 ? " disabled" : "") +
      ' aria-label="下一个">下一个 ›</button></div>' +
      body
    );
  }
  function albumHtml() {
    if (S.open && S.open.t) {
      const d = albumDetail();
      if (d) return d;
    }
    const evs = EVENTS.filter((e) => evSeen(e.id)).length,
      ach = ACH.filter((a) => achGot(a.id)).length,
      eds = Object.keys(ENDINGS).filter((k) => endCount(k)).length;
    let h =
      '<div class="top"><h2>图鉴</h2><button class="mini" onclick="G.modal(null)">关闭</button></div><p class="muted">跨局保留，存在这台设备的浏览器里。点已解锁的条目可以看详情，在详情里左右切换。</p>';
    h +=
      '<h3 class="sub">结局 ' +
      eds +
      "/" +
      Object.keys(ENDINGS).length +
      '</h3><div class="chips">' +
      Object.keys(ENDINGS)
        .map((k) =>
          endCount(k)
            ? "<button class=\"chip up\" onclick=\"G.open('end','" +
              k +
              "')\">" +
              ENDINGS[k][0] +
              " ×" +
              endCount(k) +
              "</button>"
            : '<span class="chip lock">？？？</span>',
        )
        .join("") +
      "</div>";
    h +=
      '<h3 class="sub">成就 ' +
      ach +
      "/" +
      ACH.length +
      '</h3><div class="grid2">' +
      ACH.map((a) =>
        achGot(a.id)
          ? "<button class=\"achb\" onclick=\"G.open('ach','" +
            a.id +
            "')\">" +
            a.n +
            "<small>" +
            a.d +
            "</small></button>"
          : '<div class="ach"><b>？？？</b><span class="muted">' + a.d + "</span></div>",
      ).join("") +
      "</div>";
    h +=
      '<h3 class="sub">遇到过的事件 ' +
      evs +
      "/" +
      EVENTS.length +
      '</h3><p class="muted">随机事件的颜色和地图格子一致；固定事件到了月份必然发生。</p>' +
      CAT_ORDER.map((c) => {
        const L = EVENTS.filter((e) => e.c === c);
        return (
          '<div class="evgrp"><div class="evhead">' +
          catTag(c) +
          '<span class="muted">' +
          L.filter((e) => evSeen(e.id)).length +
          "/" +
          L.length +
          '</span></div><div class="chips">' +
          L.map((e) =>
            evSeen(e.id)
              ? '<button class="chip cat-' + c + "\" onclick=\"G.open('ev','" + e.id + "')\">" + e.n + "</button>"
              : '<span class="chip lock">？？？</span>',
          ).join("") +
          "</div></div>"
        );
      }).join("");
    h +=
      '<h3 class="sub">历史记录</h3><div class="log">' +
      (allRuns()
        .map(
          (r) =>
            "<span><b>" +
            esc(r.name) +
            "</b> · " +
            (ENDINGS[r.end] ? ENDINGS[r.end][0] : "强制退学") +
            " · " +
            r.when +
            (r.acc ? " · 接收论文 " + r.acc : "") +
            (r.blind ? " · 毕业论文盲审 " + r.blind : "") +
            " · 成就 " +
            r.ach +
            "</span>",
        )
        .join("") || "<span>还没有玩完过一局。</span>") +
      "</div>";
    return h;
  }
  loadMeta();

  /* ================================================================
   * 论文投稿结果、盲审、毕业判定
   * ================================================================ */
  function paperProb(p) {
    const base = p.fix != null ? p.fix : (p.base != null ? p.base : PAPER[p.lv].ps[0]) + (p.acc || 0);
    return Math.min(100, base + (p.bonus || 0) + Math.floor(S.a.luck / 10));
  }
  function resolvePaper(p) {
    const pr = paperProb(p);
    p.fix = null;
    p.bonus = 0;
    if (Math.random() * 100 < pr) {
      p.status = "accepted";
      p.accAt = S.month;
      if (p.collab) {
        S.a.mood = clamp(S.a.mood + 3);
        return (
          "合作的论文《" +
          esc(p.title) +
          "》（CCF-" +
          p.lv +
          "，你是" +
          roleName(p) +
          "）被接收了！心情+3"
        );
      }
      S.yearAcc = (S.yearAcc || 0) + 1;
      const c = PAPER[p.lv];
      S.a.trust = clamp(S.a.trust + c.trust);
      S.a.envy = clamp(S.a.envy + c.envy);
      return (
        "论文 #" +
        p.id +
        "（CCF-" +
        p.lv +
        "）被接收了！导师心腹+" +
        c.trust +
        "，同辈忮忌+" +
        c.envy
      );
    }
    // 没中：按档次的比例分成小修、大修、拒稿
    const mx = PAPER[p.lv].mix,
      r = Math.random() * (mx[0] + mx[1] + mx[2]);
    p.rej++;
    if (r < mx[0]) {
      p.status = "doing";
      p.stage = NS - 1;
      p.acc = (p.acc || 0) + 30;
      S.a.res = clamp(S.a.res - 1);
      return (
        "论文 #" +
        p.id +
        "（CCF-" +
        p.lv +
        "）审稿意见：<b>小修</b>。退回「写作」阶段，改完再投，下次接收率+30%。心态-1"
      );
    }
    if (r < mx[0] + mx[1]) {
      p.status = "doing";
      p.stage = NS - 2;
      p.acc = (p.acc || 0) + 15;
      S.a.res = clamp(S.a.res - 3);
      return (
        "论文 #" +
        p.id +
        "（CCF-" +
        p.lv +
        "）审稿意见：<b>大修</b>。退回「实验」阶段，补完实验再投，下次接收率+15%。心态-3"
      );
    }
    p.status = "rejected";
    p.acc = (p.acc || 0) + 15;
    S.rejTotal++;
    S.a.res = clamp(S.a.res - 5);
    return (
      "论文 #" +
      p.id +
      "（CCF-" +
      p.lv +
      "）被<b>拒稿</b>，心态-5。可以退回「算法」阶段重做（下次接收率+15%）" +
      (p.lv === "C" ? "。" : "，也可以降档转投。")
    );
  }
  function addCollab(s, role) {
    // 同门已经做完定题和文献综述，你从「算法」做起
    s.papers.push({
      id: ++s.pid,
      lv: "A",
      title: genTitle(),
      stage: 2,
      status: "doing",
      role: role,
      collab: true,
      base: 60,
      rej: 0,
      subs: 0,
      due: 0,
    });
    return s.papers[s.papers.length - 1];
  }
  // 合作论文每个阶段的花费：共同一作 30，二作 20；自己的论文按档次
  function collabCost(p) {
    return p.role === "second" ? 20 : 30;
  }
  function stageCost(p) {
    return p.collab ? collabCost(p) : PAPER[p.lv].cost;
  }
  function end(k) {
    S.ending = { k: k, t: ENDINGS[k][0], x: ENDINGS[k][1] };
    S.screen = "end";
    S.crisis = null;
    S.modal = null;
    S.notices = [];
    S.ask = null;
    recordRun(k);
    rankSubmit(k);
  }
  function checks() {
    if (S.screen !== "main") return;
    if (S.a.health <= 0) {
      end("dead");
      return;
    }
    if (S.a.mood <= 0) {
      end("rest");
      return;
    }
    S.w = S.w || {};
    // 每局每条线只提醒一次：首次低于 50、首次低于 30。只是提醒，不强制做选择
    for (const k of ["health", "mood"]) {
      const v = S.a[k];
      const H = k === "health";
      if (v < 30 && !S.w[k + "30"]) {
        S.w[k + "30"] = true;
        S.w[k + "50"] = true;
        notice(
          H ? "身体亮红灯" : "情绪亮红灯",
          H
            ? "健康已经低于 30，做科研的效率只剩一半。该去医院看看了，先把身体养好最重要。<br><b>健康降到 0 会离开这个美丽的世界。</b><br>想换个环境，可以在日常里申请转组。"
            : "心情已经低于 30，做科研的效率只剩一半。出去玩一玩、见见朋友、好好睡一觉，怎么安排都由你。<br><b>心情降到 0 就要休学了。</b><br>想换个环境，可以在日常里申请转组。",
        );
      } else if (v < 50 && !S.w[k + "50"]) {
        S.w[k + "50"] = true;
        notice(
          H ? "身体在抗议" : "情绪有点低落",
          H
            ? "健康已经低于 50。最近熬得有点狠，多睡觉、多运动，身体是革命的本钱。<br><b>健康降到 0 会离开这个美丽的世界。</b><br>想换个环境，可以在日常里申请转组。"
            : "心情已经低于 50。别光顾着科研，找点让自己开心的事做。<br><b>心情降到 0 就要休学了。</b><br>想换个环境，可以在日常里申请转组。",
        );
      }
    }
  }
  function talk(kind) {
    const best = S.papers.filter(thesisOK).sort((a, b) => b.stage - a.stage)[0];
    const sc = blindScore(false);
    let v,
      x = "";
    if (kind === "开题") {
      v = best && best.stage >= 2 ? "稳过" : best ? "风险通过" : "勉强通过";
    } else {
      if (best && best.stage >= NS) v = "稳过";
      else if (S.a.trust >= 40) {
        v = "风险通过";
        x = "论文还没写完，是导师替你说了话。";
      } else {
        v = "勉强通过";
        S.a.mood = clamp(S.a.mood - 6);
        x = "论文还没写完，被评委问得下不来台。心情-6。";
      }
    }
    const prog = best
      ? "你手上有 " +
        S.papers.length +
        " 篇论文，最快的一篇" +
        (best.stage >= NS ? "已经写完" : "做到了「" + STAGES[best.stage - 1] + "」") +
        "。"
      : "你手上还没有任何论文。";
    const adv =
      sc >= 80
        ? "照这个节奏，毕业没问题。"
        : sc >= 56
          ? "离毕业还差一口气，别松劲。"
          : "照这个速度是毕不了业的，该抓紧了。";
    return (
      "<b>导师找你谈话 · " +
      kind +
      "</b>：" +
      prog +
      "<br>导师的毕业要求是至少发表一篇 CCF-" +
      reqLv() +
      (reqOK() ? "，你已经满足。" : "，你还没有满足。") +
      "<br>" +
      kind +
      '结果：<span class="hl">' +
      v +
      "</span>。" +
      x +
      "<br>按现在的进度，预计毕业论文盲审 " +
      sc +
      " 分（80 分及以上通过）。" +
      adv
    );
  }
  /* ================================================================
   * 每月流程：月初结算、组会、日常、随机事件、转组
   * ================================================================ */
  function monthStart(first) {
    if (!first) {
      if (S.partner) {
        if (S.dates === 0) S.noDate++;
        else S.noDate = 0;
      }
      S.cnt = {};
      S.dates = 0;
      S.loveDone = {};
      S.loveMsg = "";
    }
    if (S.month > END_M + 6 * S.ext) {
      finalize();
      return;
    }
    S.mprog = 0;
    S.mres = 0;
    const N = [],
      L = [];
    const cal = ((S.month + 7) % 12) + 1;
    if (!first && S.money <= 0) S.broke++;
    S.money = S.money + (S.payHold ? 0 : S.mentor.stipend) - LIVING;
    N.push((S.payHold ? "劳务费停发中" : "劳务费 +" + S.mentor.stipend) + "，吃住 -" + LIVING);
    if (S.partner) {
      S.a.mood = clamp(S.a.mood + 3);
      N.push("有对象陪着，心情+3");
    }
    if (!first && S.a.res >= 70) {
      S.a.mood = clamp(S.a.mood + 1);
      N.push("心态好，心情+1");
    }
    if (cal === 2) {
      S.money += 200;
      N.push("过年红包 +200，寒假没有组会");
    }
    S.papers.forEach((p) => {
      if (p.status === "submitted" && p.due <= S.month) L.push(resolvePaper(p));
    });
    S.fixed = [];
    if (hasClass(S.month)) {
      S.fixed.push("上课");
      S.a.ability = clamp(S.a.ability + 0.3);
    }
    if (S.internLeft > 0) {
      S.internLeft--;
      S.money += 200;
      S.fixed.push("实习");
      N.push(
        "实习工资 +200" + (S.internLeft ? "，还剩 " + S.internLeft + " 个月" : "，这是最后一个月"),
      );
    }
    if (S.hxLeft > 0) {
      S.hxLeft--;
      S.money += 200;
      S.a.health = clamp(S.a.health - 2);
      S.hx++;
      S.fixed.push("横向");
      N.push(
        "导师派的横向 +200，健康-2" +
          (S.hxLeft ? "，还剩 " + S.hxLeft + " 个月" : "，这是最后一个月"),
      );
    }
    if (S.clockLeft > 0) {
      S.clockLeft--;
      S.a.mood = clamp(S.a.mood - 2);
      S.a.health = clamp(S.a.health - 1);
      N.push(
        "每天到实验室打卡，心情-2、健康-1" +
          (S.clockLeft ? "，还剩 " + S.clockLeft + " 个月" : "，这是最后一个月"),
      );
    }
    S.week = 1 + S.fixed.length;
    if (S.month === 10) L.push(talk("开题"));
    if (S.month === 22) L.push(talk("中期"));
    if (first || !S.ys) yearSnap();
    let YP = null;
    if (S.month === 12 || S.month === 24) {
      const home = S.wealth * 10;
      S.money += home;
      let y = "家里又给你打了 " + home + " 元。";
      let ev = 0;
      if (S.a.trust >= 60) {
        ev += 5;
        y += "你成了导师最器重的学生，";
      } else if (S.a.trust >= 30) {
        ev += 2;
        y += "导师对你印象不错，";
      }
      if (S.yearAcc > 0) {
        ev += 3 * S.yearAcc;
        y += "这一年还发了 " + S.yearAcc + " 篇论文，";
      }
      if (ev > 0) {
        S.a.envy = clamp(S.a.envy + ev);
        y += "同门看你的眼神有点复杂。同辈忮忌+" + ev + "。";
      } else y += "你在组里不显山不露水，没人注意你。";
      S.yearAcc = 0;
      YP = [
        (S.month === 12 ? "硕士一年级" : "硕士二年级") + "学年结算",
        "7 月结束，这一学年过完了。" + y + "</p>" + yearPage() + "<p hidden>",
      ];
    }
    if (S.month === 25)
      L.push("<b>秋招开始</b>：找工作最看实习，其次是论文和横向。现在补还来得及。");
    if (S.month === 33 + 6 * S.ext && !S.blindOK) {
      const sc = blindScore(true);
      S.blind = sc;
      S.bt = 1;
      let t;
      if (sc >= 80) {
        S.blindOK = true;
        t = "盲审结果出来了：" + sc + " 分，通过。下个月正式答辩。";
      } else if (S.a.trust >= S.mentor.rescue && sc >= S.mentor.resMin) {
        S.blind = 80;
        S.blindOK = true;
        t = "盲审初评只有 " + sc + " 分。导师连夜帮你改论文，硬是捞到了 80 分，通过。下个月正式答辩。";
      } else if (S.ext < 2) {
        S.ext++;
        S.a.mood = clamp(S.a.mood - 10);
        t = "盲审结果出来了：" + sc + ' 分，没到 80 分。<br><span class="hl">延毕半年</span>，心情-10。';
      } else {
        end("fail");
        return;
      }
      fixNote("blind", t);
    }
    if (S.month === 34 + 6 * S.ext && S.blindOK && !S.defended) {
      let t;
      if (reqOK()) {
        S.defended = true;
        t = "导师在答辩申请上签了字。你讲完最后一页 PPT，台下的老师点了点头：答辩通过！";
      } else if (S.ext < 2) {
        S.ext++;
        S.a.mood = clamp(S.a.mood - 10);
        t =
          "导师的要求是至少发表一篇 CCF-" +
          reqLv() +
          "，你还没有满足。导师不肯在答辩申请上签字，正式答辩过不了。<br>" +
          '<span class="hl">延毕半年</span>，心情-10。盲审成绩保留，半年后只需要再过导师这一关。';
      } else {
        end("fail");
        return;
      }
      fixNote("defense", t);
    }
    if (S.money < 0) N.push("钱不够了，靠向同门借钱过活，现在欠 " + -S.money + " 元");
    S.note = "月初：" + N.join("；") + "。";
    log(S.note);
    if (L.length) notice(dateStr(S.month), L.join("<br>"));
    if (YP) {
      notice(YP[0], YP[1]);
      yearSnap();
    }
    S.pick = [];
    for (const k of S.lastPlan) {
      const d = DAILY.find((x) => x.k === k);
      if (S.pick.length >= slots()) break;
      if (d && avail(d) && S.pick.indexOf(k) < 0 && pickCost(S.pick.concat([k])) <= S.money)
        S.pick.push(k);
    }
    if (cal === 2 && S.month < 33) S.ask = { kind: "stay" };
    else if (S.month === 22 && !S.phd) S.ask = { kind: "phd" };
    else if (S.partner && S.noDate >= 2) S.ask = { kind: "breakup" };
    // 按月份必然发生的固定事件：只有一个选项的直接结算，多个选项的排队弹出
    S.fixQ = [];
    EVENTS.filter((e) => e.fix && e.fix(S)).forEach((e) => {
      if (!S.fixSeen) S.fixSeen = {};
      S.fixSeen[e.id] = (S.fixSeen[e.id] || 0) + 1;
      if (e.o.length === 1) fixSettle(e, e.o[0], true);
      else S.fixQ.push(e.id);
    });
    nextFix();
    if (slots() <= 0 && !S.ask) afterDailies();
    checks();
  }
  function nextFix() {
    if (!S.ask && S.fixQ && S.fixQ.length) S.ask = { kind: "fix", id: S.fixQ.shift() };
  }
  function seen(id) {
    if (!M.events[id]) {
      M.events[id] = 1;
      saveMeta();
    }
  }
  // 由规则代码结算的固定事件（盲审、正式答辩、各奔东西）：记进图鉴并弹出说明
  function fixNote(id, t) {
    const ev = EVENTS.find((e) => e.id === id);
    seen(id);
    log(ev.n + "：" + t.replace(/<[^>]+>/g, ""));
    notice(ev.n, evImgs(id) + t, "fixed", dateStr(S.month));
  }
  function fixSettle(ev, o, single) {
    if (!M.events[ev.id]) {
      M.events[ev.id] = 1;
      saveMeta();
    }
    let r = applyEff(o.e, true);
    if (o.fn) {
      const x = o.fn(S);
      if (x) r = r ? r + "；" + x : x;
    }
    r = r || "没有任何变化";
    log(ev.n + (single ? "" : " → " + o.t) + "：" + r);
    notice(
      ev.n,
      (single ? evImgs(ev.id) + ev.d + (o.r ? "<br>" + o.r : "") : "你选择了「" + o.t + "」。" + (o.r || "")) + "<br><b>" + r + "</b>",
      "fixed",
      dateStr(S.month),
    );
  }
  function isHoliday(m) {
    return ((m + 7) % 12) + 1 === 2;
  }
  function reqLv() {
    return (S.mentor && S.mentor.req) || "C";
  }
  function reqOK() {
    const n = DOWN[reqLv()];
    return S.papers.some((p) => p.status === "accepted" && p.role !== "second" && DOWN[p.lv] <= n);
  }
  function needN() {
    return S.mentor.id === "young" || S.mentor.id === "nasty" ? 2 : 1;
  }
  function afterDailies() {
    S.modal = null;
    if (isHoliday(S.month)) {
      S.step = "roll";
      return;
    }
    if (S.skipMeet) {
      S.skipMeet = false;
      S.step = "roll";
      S.result = "导师出差，这个月不开组会。";
      log(S.result);
      return;
    }
    S.step = "meet";
    if ((S.mres || 0) < needN()) S.ask = { kind: "meet" };
    else meeting();
  }
  function meeting() {
    const g = S.mres || 0,
      n = needN();
    let t, r;
    if (g <= 0) {
      t = "你站在投影前，翻来覆去只有一页「下月计划」。";
      r = applyEff({ trust: -3, mood: -4 }, true);
    } else if (g < n) {
      if (Math.random() < (S.mentor.id === "nasty" ? 0.95 : 0.6)) {
        t = "导师连问了三个「然后呢」，你一个也答不上来。";
        r = applyEff({ trust: -2, mood: S.mentor.id === "nasty" ? -4 : -2, res: -1 }, true);
      } else {
        t = "导师今天心不在焉，你三言两语混了过去。";
        r = "没有任何变化";
      }
    } else if (g < 3) {
      t = "进展讲得清清楚楚，导师点了点头。";
      const e = { trust: 1 };
      if (S.mentor.id !== "nasty" && Math.random() < 0.3) {
        t += "还当众夸了你一句。";
        e.mood = 2;
      }
      r = applyEff(e, true);
    } else {
      t = "你做了三十页 slides，从动机一路讲到消融实验，导师很满意。";
      if (Math.random() < 0.5) {
        t += "同门在底下交换了一个眼神：太卷了。";
        r = applyEff({ trust: 2, envy: 3 }, true);
      } else {
        t += "会后有师弟师妹来找你请教。";
        r = applyEff({ trust: 2, rel: 1 }, true);
      }
    }
    let extra = "";
    if (S.mentor.id === "nasty") {
      if (g >= n) {
        S.failStreak = 0;
        if (S.payHold) {
          if (S.month >= S.holdAt + 2) {
            S.payHold = false;
            extra = "<br>导师翻了翻你的 PPT：“行，劳务下个月恢复。”";
          } else extra = "<br>导师看了一眼：“有点样子了，劳务的事下个月再说。”";
        }
      } else {
        S.failStreak = (S.failStreak || 0) + 1;
        if (S.failStreak >= 2 && !S.payHold) {
          S.payHold = true;
          S.holdAt = S.month;
          extra =
            '<br><span class="hl">“连着两个月拿不出东西，劳务先停了，什么时候有进展什么时候再发。”</span>';
        }
      }
    }
    notice("月度组会", t + "<br><b>" + r + "</b>" + extra);
    log("组会：" + r + (extra ? "；" + (S.payHold ? "劳务停发" : "劳务恢复") : ""));
    S.step = "roll";
    checks();
  }
  function hasClass(m) {
    return m <= 10 && !isHoliday(m);
  }
  function slots() {
    return Math.max(0, 5 - S.week);
  }
  function pickCost(ks) {
    return ks.reduce((t, k) => {
      const m = DAILY.find((x) => x.k === k).e.money;
      return t + (m < 0 ? -m : 0);
    }, 0);
  }
  function avail(d) {
    if (d.k === "meet" && S.mentor && S.mentor.mp == null) return false;
    return !d.y3 || S.month > 23;
  }
  function blocked() {
    return S.step !== "daily" || S.screen !== "main" || S.crisis || S.notices.length || S.ask;
  }
  function doDaily(k) {
    const d = DAILY.find((x) => x.k === k);
    if (!d || !avail(d) || (S.cnt[k] || 0) >= 1 || !canPay(d.e)) return false;
    let r = applyEff(dailyEff(d), false);
    if (d.rnd) {
      const c = Math.max(0, Math.min(S.money, (rnd(10) + 1) * 10));
      S.money -= c;
      if (c) r += "，金钱-" + c;
    }
    S.cnt[k] = (S.cnt[k] || 0) + 1;
    if (k === "hx") S.hx++;
    if (k === "apply") S.applies++;
    if (k === "meet" || k === "read" || k === "exp") S.mres = (S.mres || 0) + 1;
    S.tot[k] = (S.tot[k] || 0) + 1;
    S.plan.push(k);
    const t = "第 " + S.week + " 周 · " + d.n + "：" + r;
    log(t);
    S.result = t;
    S.week++;
    if (S.week > 4) afterDailies();
    checks();
    return true;
  }
  function finalize() {
    const L = [];
    S.papers.forEach((p) => {
      if (p.status === "submitted") L.push(resolvePaper(p));
    });
    seen("farewell");
    L.unshift("<b>各奔东西</b>：" + EVENTS.find((e) => e.id === "farewell").d);
    S.finalNote = L.join("<br>");
    S.yearEnd = yearPage();
    S.screen = "resume";
    S.modal = null;
    S.crisis = null;
    S.notices = [];
  }
  function pickEvent(cat) {
    let c = EVENTS.filter(
      (e) => !e.fix && e.c === cat && (!e.m || e.m.indexOf(S.mentor.id) >= 0) && (!e.cond || e.cond(S)),
    );
    if (c.length > 1) c = c.filter((e) => e.id !== S.lastEv);
    const ws = c.map((e) => {
      let w = 1;
      if (e.tone === "good") w *= S.mentor.gw * (1 + S.a.luck / 100);
      if (e.tone === "bad") w *= S.mentor.bw;
      if (e.w) w *= e.w(S);
      if (e.m) w *= EXCL_W;
      w *= Math.pow(0.5, (S.evCount && S.evCount[e.id]) || 0);
      return w;
    });
    let r = Math.random() * ws.reduce((x, y) => x + y, 0);
    for (let i = 0; i < c.length; i++) {
      r -= ws[i];
      if (r <= 0) return c[i];
    }
    return c[c.length - 1];
  }
  function endWeek() {
    checks();
    if (S.screen !== "main") return;
    S.week = 1;
    S.rolls = 0;
    S.step = "daily";
    S.ev = null;
    S.ask = null;
    if (S.plan.length) S.lastPlan = S.plan;
    S.plan = [];
    S.month++;
    monthStart(false);
  }
  function transfer() {
    S.a.health = Math.max(1, S.a.health - 10);
    S.a.mood = Math.max(0, S.a.mood - 10);
    const ok = Math.random() < Math.min(0.9, 0.5 + S.a.luck / 500);
    if (ok) {
      {
        const o = MENTORS.filter((m) => m.id !== S.mentor.id);
        S.mentor = Object.assign({}, o[rnd(o.length)]);
      }
      S.a.progress = 0;
      S.a.trust = 0;
      S.a.envy = 0;
      S.papers = [];
      S.transfers++;
      S.collab = false;
      S.payHold = false;
      S.failStreak = 0;
      S.skipMeet = false;
      S.hxLeft = 0;
      S.clockLeft = 0;
      S.phd = null;
      if (S.a.mood < 30) S.a.mood = 30;
    }
    return ok;
  }
  function effLv(p) {
    return DOWN[p.lv] + (p.stolen ? 1 : 0) + (p.role === "second" ? 2 : 0);
  }
  function roleW(p) {
    return p.stolen ? 0.5 : p.role === "second" ? 0.3 : p.role === "cofirst" ? 0.7 : 1;
  }
  function resumeData() {
    const acc = S.papers.filter((p) => p.status === "accepted");
    const sub = S.papers.filter((p) => p.status !== "accepted" && p.subs > 0);
    const score =
      S.interns * 3 +
      acc.reduce((t, p) => t + { A: 3, B: 2, C: 1 }[p.lv] * roleW(p), 0) +
      Math.min(2, Math.floor(S.hx / 5)) +
      Math.min(2, Math.floor(S.applies / 3));
    return {
      acc: acc,
      sub: sub,
      score: score,
      hasB: acc.some((p) => effLv(p) <= 2),
      hasA: acc.some((p) => effLv(p) <= 1),
    };
  }

  /* ================================================================
   * 操作：所有按钮点击后调用的 G.xxx 函数（开局、选日常、掷骰子、选事件选项、论文操作等）
   * ================================================================ */
  const G = {};
  function act(fn) {
    return function () {
      fn.apply(null, arguments);
      save();
      render();
    };
  }
  G.start = act(() => {
    wipe();
    S = newState();
    S.screen = "drawStudent";
    S.name = NAMES[rnd(NAMES.length)];
    S.sex = M.sex || (rnd(2) ? "b" : "g");
  });
  /* 抽学生页：换头像（头像决定这一局主角是哪一版图，界面上不出现任何性别字眼） */
  G.sex = act(() => {
    S.sex = curSex() === "b" ? "g" : "b";
    M.sex = S.sex;
    saveMeta();
  });
  G.rename = act(() => {
    let n;
    do {
      n = NAMES[rnd(NAMES.length)];
    } while (n === S.name);
    S.name = n;
  });
  G.resume = act(() => {
    const s = load();
    if (s) {
      S = s;
      S.anim = false;
    }
  });
  /* ---------- 存档文件：导出成 .json，换浏览器后导入 ---------- */
  let PENDING = null; // 导入的文件里带着一局进度、本机也有进行中的一局时，先放在这里等玩家选
  function inProgress(s) {
    return !!(s && s.screen && s.screen !== "welcome" && s.screen !== "end");
  }
  function localRun() {
    return S.screen === "welcome" ? load() : S;
  }
  function runLabel(s) {
    return (
      esc(s.name || "无名") + " · " + dateStr(s.month || 1) + (s.mentor ? " · " + esc(s.mentor.name) : "")
    );
  }
  G.exportSave = function () {
    const run = localRun();
    const data = {
      app: "读研模拟器",
      v: 1,
      saveKey: KEY,
      at: Date.now(),
      dev: M.dev,
      meta: { endings: M.endings, events: M.events, ach: M.ach, runs: M.runs },
      peers: M.peers,
      run: inProgress(run) ? Object.assign({}, run, { modal: null, anim: false }) : null,
    };
    const d = new Date(),
      p = (n) => String(n).padStart(2, "0");
    const name =
      "读研模拟器存档-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + ".json";
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      S.impMsg = "已导出「" + name + "」。" + (data.run ? "里面有这一局的进度和" : "里面有") + "图鉴、成就、历史记录。";
    } catch (e) {
      S.impMsg = "这个环境不支持下载文件，导出失败。";
    }
    render();
  };
  G.pickFile = function () {
    const el = document.getElementById("impfile");
    if (el) el.click();
  };
  G.importFile = function (el) {
    const f = el && el.files && el.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      importText(String(rd.result));
      el.value = "";
      save();
      render();
    };
    rd.readAsText(f);
  };
  function mergePeer(id, m, at) {
    if (!id || id === M.dev || !m) return false;
    const old = M.peers[id];
    if (old && (old.at || 0) >= at) return false;
    M.peers[id] = {
      at: at,
      endings: m.endings || {},
      events: m.events || {},
      ach: m.ach || {},
      runs: (m.runs || []).slice(0, 20),
    };
    return true;
  }
  function importText(t) {
    let d;
    try {
      d = JSON.parse(t);
    } catch (e) {
      S.impMsg = "文件读不出来，请选择读研模拟器导出的 .json 存档。";
      return;
    }
    if (!d || d.app !== "读研模拟器" || !d.meta) {
      S.impMsg = "这不是读研模拟器的存档文件。";
      return;
    }
    const before = [Object.keys(ENDINGS).filter((k) => endCount(k)).length, ACH.filter((a) => achGot(a.id)).length, EVENTS.filter((e) => evSeen(e.id)).length, allRuns().length];
    // 累加记录：文件本身那台设备的记录，加上它之前从别的设备导入过的记录
    let n = 0;
    if (mergePeer(d.dev, d.meta, d.at || 0)) n++;
    Object.keys(d.peers || {}).forEach((id) => {
      if (mergePeer(id, d.peers[id], d.peers[id].at || 0)) n++;
    });
    saveMeta();
    const after = [Object.keys(ENDINGS).filter((k) => endCount(k)).length, ACH.filter((a) => achGot(a.id)).length, EVENTS.filter((e) => evSeen(e.id)).length, allRuns().length];
    let msg =
      d.dev === M.dev
        ? "这是本浏览器导出的文件，图鉴记录本来就有。"
        : n
          ? "图鉴记录已合并：结局 " + before[0] + " → " + after[0] + " 种，成就 " + before[1] + " → " + after[1] + " 个，事件 " + before[2] + " → " + after[2] + " 个。"
          : "图鉴记录没有变化（这个文件之前已经导入过了）。";
    if (d.run && inProgress(d.run)) {
      if (d.saveKey && d.saveKey !== KEY) msg += "文件里的进度来自旧版本，可能读不了，已跳过。";
      else if (inProgress(localRun())) {
        PENDING = d.run;
        msg += "文件里还有一局进度，见下方。";
      } else {
        useRun(d.run);
        msg += "文件里的进度已经接上，关掉设置就能继续玩。";
      }
    }
    S.impMsg = msg;
  }
  function useRun(r) {
    PENDING = null;
    const msg = S.impMsg;
    S = Object.assign(newState(), r);
    S.anim = false;
    S.modal = "settings";
    S.open = null;
    S.impMsg = msg;
    save();
  }
  G.usePending = function (yes) {
    if (!PENDING) return;
    if (yes) {
      useRun(PENDING);
      S.impMsg = "已换成文件里的进度，关掉设置就能继续玩。";
    } else {
      PENDING = null;
      S.impMsg = "保留了本机的进度。图鉴记录照样合并了。";
    }
    save();
    render();
  };
  G.restart = act(() => {
    wipe();
    S = newState();
  });
  G.drawStu = act(() => {
    const el = typeof document !== "undefined" && document.getElementById("nm");
    if (el) S.name = el.value;
    S.stu = drawStudent(S.stu);
  });
  G.okStu = act(() => {
    const el = typeof document !== "undefined" && document.getElementById("nm");
    if (el) S.name = el.value;
    S.name = (S.name || "").trim().slice(0, 12) || NAMES[rnd(NAMES.length)];
    const t = STUDENTS[S.stu];
    S.a = {
      health: t.a.health,
      mood: t.a.mood,
      res: t.a.res,
      hair: t.a.hair,
      rel: t.a.rel,
      scheme: t.a.scheme,
      luck: t.a.luck,
      ability: t.a.ability,
      progress: 0,
      trust: 0,
      envy: 0,
    };
    S.wealth = t.a.wealth;
    S.money = t.a.wealth * 20;
    S.screen = "drawMentor";
  });
  G.drawMen = act(() => {
    let n;
    do {
      n = rnd(MENTORS.length);
    } while (n === S.men);
    S.men = n;
  });
  G.okMen = act(() => {
    // 拷贝一份：「推荐合作者」事件会改这一局导师的小会数值，不能改到全局的 MENTORS
    S.mentor = Object.assign({}, MENTORS[S.men]);
    S.screen = "q1";
  });
  const QS = {
    q1: {
      t: "开学前的假期，你打算怎么过？",
      o: [
        { t: "提前进组", e: { ability: 5, progress: 5, trust: 5, health: -5, mood: -5 } },
        { t: "在家看论文", e: { ability: 5, health: -2, res: 5 } },
        { t: "跟好朋友一起快乐玩耍", e: { health: 5, mood: 5 } },
      ],
      next: "q2",
    },
    q2: {
      t: "第一次见导师，要不要带礼物？",
      o: [
        { t: "花 200 挑了点贵货", e: { money: -200, envy: 2 }, x: "导师当场拒收，钱也退不了。" },
        { t: "花 50 买了点好吃的", e: { money: -50, trust: 2 }, x: "导师笑着收下了。" },
        { t: "啥也不带", e: {}, x: "空手也挺好。" },
      ],
      next: "q3",
    },
    q3: {
      t: "要不要给同门带礼物？",
      o: [
        { t: "花 200 挑了点贵货", e: { money: -200, rel: 5 }, x: "师兄师姐都记住了你。" },
        { t: "花 50 买了点好吃的", e: { money: -50, rel: 2 }, x: "零食一会儿就分完了。" },
        { t: "啥也不带", e: {}, x: "大家都很忙，没人在意。" },
      ],
      next: "main",
    },
  };
  G.answer = act((q, i) => {
    if (S.qres) return;
    const o = QS[q].o[i];
    if (!canPay(o.e)) return;
    // 开学前的选择不受能力、心态加成影响
    for (const k in o.e) {
      if (k === "money") S.money = Math.max(0, S.money + o.e[k]);
      else S.a[k] = clamp(S.a[k] + o.e[k]);
    }
    S.qres = {
      t: o.t,
      x: (o.x ? o.x + "<br>" : "") + "<b>" + (effText(o.e) || "没有任何变化") + "</b>",
    };
  });
  G.qnext = act(() => {
    if (!S.qres) return;
    S.qres = null;
    S.screen = QS[S.screen].next;
    if (S.screen === "main") {
      S.month = 1;
      S.week = 1;
      S.step = "daily";
      monthStart(true);
    }
  });
  G.daily = act((k) => {
    if (blocked()) return;
    doDaily(k);
  });
  G.repeat = act(() => {
    if (blocked()) return;
    S.pick = [];
    for (const k of S.lastPlan) {
      const d = DAILY.find((x) => x.k === k);
      if (S.pick.length >= slots()) break;
      if (
        d &&
        avail(d) &&
        sickOK(d) &&
        !(S.cnt[k] >= 1) &&
        S.pick.indexOf(k) < 0 &&
        pickCost(S.pick.concat([k])) <= S.money
      )
        S.pick.push(k);
    }
  });
  G.pick = act((k) => {
    if (blocked()) return;
    const i = S.pick.indexOf(k);
    if (i >= 0) {
      S.pick.splice(i, 1);
      return;
    }
    const d = DAILY.find((x) => x.k === k);
    if (
      !d ||
      !avail(d) ||
      !sickOK(d) ||
      S.cnt[k] >= 1 ||
      S.pick.length >= slots() ||
      (d.e.money < 0 && pickCost(S.pick.concat([k])) > S.money)
    )
      return;
    S.pick.push(k);
  });
  G.go = act(() => {
    if (blocked() || S.pick.length !== slots() || pickCost(S.pick) > Math.max(0, S.money)) return;
    const ks = S.pick.slice();
    S.pick = [];
    // 先做赚钱的，免得顺序导致钱不够
    ks.sort(
      (a, b) =>
        (DAILY.find((x) => x.k === b).e.money || 0) - (DAILY.find((x) => x.k === a).e.money || 0),
    );
    for (const k of ks) {
      if (blocked()) break;
      doDaily(k);
    }
    S.result = "本月安排：" + ks.map((k) => DAILY.find((x) => x.k === k).n).join("、");
  });
  G.ask = act((i) => {
    if (!S.ask || S.crisis || S.notices.length) return;
    const a = S.ask;
    if (a.kind === "breakup") {
      if (i === 0) {
        if (S.money < 300) return;
        S.ask = null;
        S.money -= 300;
        S.noDate = 0;
        log("送礼物挽回对象：金钱-300");
        notice(
          "挽回",
          "你挑了很久的礼物，又道了歉。对方叹了口气，说再给你一次机会。<br><b>金钱-300</b>",
        );
      } else {
        S.ask = null;
        const r = applyEff({ mood: -10, res: 2 }, true);
        S.partner = false;
        S.ex = false;
        log("分手：" + r);
        notice("分手", "“你眼里只有论文。”<br><b>" + r + "</b>");
      }
      nextFix();
      if (slots() <= 0 && S.step === "daily" && !S.ask) afterDailies();
      checks();
      return;
    }
    if (a.kind === "fix") {
      const ev = EVENTS.find((e) => e.id === a.id);
      const o = ev && ev.o[i];
      if (!o || (o.req && !o.req(S)) || !canPay(o.e)) return;
      S.ask = null;
      fixSettle(ev, o, false);
      nextFix();
      if (slots() <= 0 && S.step === "daily" && !S.ask) afterDailies();
      checks();
      return;
    }
    S.ask = null;
    if (a.kind === "meet") {
      if (i === 0) {
        S.nights++;
        S.mres = (S.mres || 0) + 1;
        const r = applyEff({ health: -4, mood: -2, hair: -2, progress: 6 }, false);
        log("熬夜赶进度：" + r);
        notice("熬夜赶进度", "凌晨三点，你对着屏幕把图一张张贴进 PPT。<br><b>" + r + "</b>");
      }
      meeting();
      return;
    }
    if (a.kind === "phd") {
      if (i === 0) {
        S.phd = "mid";
        const r = applyEff({ trust: 10 }, false);
        log("答应硕转博，毕业后留组读博：" + r);
        notice(
          "留下来读博",
          "导师拍了拍你的肩膀：“好好干，博士四年我给你规划好。”<br>毕业论文盲审和导师的论文要求照样要过，毕业时的去向只能选留组读博。<br><b>" +
            r +
            "</b>",
        );
      } else log("中期后导师问要不要留下读博，你说再想想");
      nextFix();
      if (slots() <= 0 && S.step === "daily" && !S.ask) afterDailies();
      checks();
      return;
    }
    if (a.kind === "stay") {
      if (i === 0) {
        const r = applyEff({ trust: 3, mood: -3 }, false);
        log("寒假留校：" + r);
        notice(
          "寒假留校",
          "空荡荡的实验室里只剩你和服务器的风扇声。这个月照常安排四周。<br><b>" + r + "</b>",
        );
      } else {
        const r = applyEff({ mood: 8, health: 3 }, false);
        S.week = Math.min(5, S.week + 2);
        S.pick = S.pick.slice(0, slots());
        log("回家过年：" + r);
        notice(
          "回家过年",
          "家里的饭菜比食堂香一百倍。假期占掉两周，这个月只剩两周可以安排。<br><b>" + r + "</b>",
        );
      }
      nextFix();
      if (slots() <= 0 && S.step === "daily" && !S.ask) afterDailies();
      checks();
    }
  });
  function landed() {
    const cat = BOARD[S.pos];
    const ev = pickEvent(cat);
    S.ev = ev.id;
    S.lastEv = ev.id;
    if (!S.evCount) S.evCount = {};
    S.evCount[ev.id] = (S.evCount[ev.id] || 0) + 1;
    if (!M.events[ev.id]) {
      M.events[ev.id] = 1;
      saveMeta();
    }
    S.step = "event";
    if (ev.o.length === 1) settle(ev, ev.o[0], true);
  }
  G.roll = function () {
    if (S.step !== "roll" || S.screen !== "main" || S.crisis || S.notices.length || S.anim) return;
    const N = BOARD.length,
      d = rnd(6) + 1;
    S.dice = d;
    S.d1 = d;
    S.d2 = 0;
    const target = (S.pos + d) % N;
    const still =
      typeof document === "undefined" ||
      (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) {
      S.pos = target;
      landed();
      save();
      render();
      return;
    }
    S.anim = true;
    S.result = "掷出 " + d + "，前进 " + d + " 步";
    render();
    let n = d;
    const tick = () => {
      S.pos = (S.pos + 1) % N;
      n--;
      render();
      if (n > 0) setTimeout(tick, 80);
      else
        setTimeout(() => {
          S.anim = false;
          landed();
          save();
          render();
        }, 160);
    };
    setTimeout(tick, 120);
  };
  function settle(ev, o, single) {
    let r = applyEff(o.e, true);
    if (o.fn) {
      const x = o.fn(S);
      if (x) r = r ? r + "；" + x : x;
    }
    r = r || "没有任何变化";
    S.result = "掷出 " + S.d1 + " · " + ev.n + (single ? "" : " → " + o.t) + "：" + r;
    log(S.result);
    notice(
      ev.n,
      (single ? evImgs(ev.id) + ev.d + (o.r ? "<br>" + o.r : "") : "你选择了「" + o.t + "」。" + (o.r || "")) +
        "<br><b>" +
        r +
        "</b>",
      ev.c,
      "掷出 " + S.d1 + " · 走到「" + TILE[ev.c] + "」格",
    );
    S.rolls = (S.rolls || 0) + 1;
    if (S.rolls >= 2) endWeek();
    else {
      S.step = "roll";
      S.ev = null;
    }
  }
  G.opt = act((i) => {
    if (S.step !== "event") return;
    const ev = EVENTS.find((e) => e.id === S.ev);
    const o = ev.o[i];
    if ((o.req && !o.req(S)) || !canPay(o.e)) return;
    settle(ev, o, false);
  });
  G.closeNotice = act(() => {
    S.notices.shift();
  });
  G.modal = act((m) => {
    S.modal = m;
    S.open = null;
    S.impMsg = "";
  });
  G.rank = act(() => {
    S.modal = "rank";
    S.open = null;
    rankLoad();
  });
  G.rankTab = act((t) => {
    RK.tab = t === "lo" ? "lo" : "hi";
  });
  // on=false：退出排行榜，删掉已上榜的成绩，没传的也不再传；on=true：以后的局重新参加
  G.rankOpt = act((on) => {
    M.noRank = !on;
    M.rq = [];
    M.rmq = !on;
    saveMeta();
    RK.st = "";
    S.impMsg = on
      ? "已重新参加排行榜，之后打到盲审的局会自动上榜。"
      : "已退出排行榜，已经上榜的成绩会从榜上删掉。";
    rankFlush();
  });
  G.open = act((t, id) => {
    S.open = t ? { t: t, id: id } : null;
  });
  G.nav = act((d) => {
    const o = S.open;
    if (!o) return;
    const L = albumList(o.t);
    if (!L.length) return;
    const i = L.indexOf(o.id);
    o.id = L[(i + d + L.length) % L.length];
  });
  G.newPaper = act((lv) => {
    const c = PAPER[lv];
    if (
      S.papers.filter((p) => p.status !== "accepted" && !p.collab).length >= 2 ||
      S.a.progress < c.cost
    )
      return;
    S.draft = { lv: lv, title: genTitle() };
    S.modal = "title";
  });
  G.retitle = act(() => {
    if (S.draft) S.draft.title = genTitle();
  });
  G.okPaper = act(() => {
    const d = S.draft;
    if (!d) return;
    const c = PAPER[d.lv];
    if (
      S.papers.filter((p) => p.status !== "accepted" && !p.collab).length >= 2 ||
      S.a.progress < c.cost
    ) {
      S.draft = null;
      S.modal = "paper";
      return;
    }
    const el = typeof document !== "undefined" && document.getElementById("pt");
    const title = ((el ? el.value : d.title) || "").trim().slice(0, 40) || d.title;
    S.a.progress -= c.cost;
    S.papers.push({
      id: ++S.pid,
      lv: d.lv,
      title: title,
      stage: 1,
      status: "doing",
      rej: 0,
      subs: 0,
      due: 0,
    });
    log("论文 #" + S.pid + "《" + title + "》定题，目标 CCF-" + d.lv);
    S.draft = null;
    S.modal = "paper";
  });
  G.advance = act((id) => {
    const p = S.papers.find((x) => x.id === id);
    const cost = stageCost(p);
    if (p.stage >= NS || p.status !== "doing" || S.a.progress < cost) return;
    S.a.progress -= cost;
    p.stage++;
    log("论文 #" + id + " 完成「" + STAGES[p.stage - 1] + "」");
  });
  G.submit = act((id) => {
    const p = S.papers.find((x) => x.id === id);
    if (p.stage < NS || p.status !== "doing") return;
    if (p.collab && p.role === "cofirst" && p.subs === 0 && S.a.envy >= 50 && Math.random() < 0.4) {
      p.role = "second";
      log("论文 #" + id + " 投稿前被同门改成了二作");
      notice(
        "作者栏变了",
        "投稿前，同门悄悄把你从共同一作改成了二作。这篇论文不能再当毕业论文了。",
      );
    }
    p.status = "submitted";
    p.subs++;
    p.due = S.month + 1;
    log("论文 #" + id + " 已投稿，下月初出结果");
  });
  G.revise = act((id) => {
    const p = S.papers.find((x) => x.id === id);
    if (!p || p.status !== "rejected") return;
    p.status = "doing";
    p.stage = 2;
    log("论文 #" + id + " 被拒后退回「算法」阶段重做");
  });
  G.downgrade = act((id, lv) => {
    const p = S.papers.find((x) => x.id === id);
    if (p.status !== "rejected" || DOWN[lv] <= DOWN[p.lv]) return;
    log("论文 #" + id + " 从 CCF-" + p.lv + " 降档转投 CCF-" + lv);
    p.lv = lv;
    p.base = null;
    p.fix = lv === "B" ? 90 : 100;
    p.status = "submitted";
    p.subs++;
    p.due = S.month + 1;
  });
  G.love = act((k) => {
    const T = {
      date: [100, { mood: 4, res: 1 }, "约会"],
      gift: [200, { mood: 3, luck: 1 }, "送礼物"],
      trip: [600, { mood: 8, health: 2 }, "一起去旅游"],
    }[k];
    if (!T || !S.partner || S.dates >= 2 || S.money < T[0] || (S.loveDone && S.loveDone[k])) return;
    S.money -= T[0];
    const r = applyEff(T[1], false);
    S.dates++;
    S.noDate = 0;
    S.loveDone = S.loveDone || {};
    S.loveDone[k] = 1;
    log("和对象" + T[2] + "：金钱-" + T[0] + "，" + r);
    S.result = "和对象" + T[2] + "：金钱-" + T[0] + "，" + r;
    S.loveMsg = "已经" + T[2] + "：金钱-" + T[0] + "，" + r;
  });
  G.date = act(() => {
    G.love("date");
  });
  G.split = act((m) => {
    if (!S.partner) return;
    if (m === "nice") {
      if (S.money < 300) return;
      S.money -= 300;
      S.partner = false;
      S.ex = true;
      S.a.mood = clamp(S.a.mood - 3);
      S.loveMsg = "你们好聚好散了：金钱-300，心情-3";
      log("和对象好聚好散：金钱-300，心情-3");
    } else {
      S.partner = false;
      S.ex = false;
      S.a.mood = clamp(S.a.mood - 6);
      log("和对象直接分手：心情-6");
      notice("分手了", "你们没有再联系。<br><b>心情-6</b>");
    }
    checks();
  });
  G.back = act(() => {
    if (!S.ex || S.money < 300) return;
    S.money -= 300;
    S.ex = false;
    S.partner = true;
    S.noDate = 0;
    S.loveMsg = "你们重新在一起了：金钱-300";
    log("挽回了对象：金钱-300");
  });
  G.transfer = act(() => {
    if (S.step !== "daily") return;
    S.pick = [];
    const ok = transfer();
    S.modal = null;
    S.result = "日常 · 申请转组";
    S.week++;
    if (S.week > 4) afterDailies();
    if (ok) {
      log("转组成功");
      notice(
        "转组成功",
        "你换到了「" +
          S.mentor.name +
          "」门下。科研进展、导师心腹、同辈忮忌清零，手上的论文全部作废。",
      );
    } else {
      log("转组失败");
      notice("转组失败", "新导师没有名额。健康和心情白白消耗了，日子还得继续。");
    }
    checks();
  });
  G.crisis = act((a) => {
    const c = S.crisis;
    if (a === "quit") {
      end("quit");
      return;
    }
    if (a === "stay") {
      S.crisis = null;
      return;
    }
    const ok = transfer();
    S.crisis = null;
    if (ok) {
      log("转组成功");
      notice(
        "转组成功",
        "你换到了「" +
          S.mentor.name +
          "」门下，一切重新开始。科研进展、导师心腹、同辈忮忌清零，论文作废。",
      );
    } else {
      log("转组失败");
      notice("转组失败", "新导师没有名额，只能继续硬撑。");
      checks();
    }
  });
  G.path = act((k) => {
    const r = resumeData();
    let e;
    // 答应过留组读博的人只能选留组读博；没答应过的人导师心腹 ≥ 50 也可以选
    if (S.phd && k !== "stay") return;
    if (k === "stay" && !S.phd && S.a.trust < 50) return;
    if (k === "job") e = r.score >= 3 ? (r.hasB ? "bigco" : "job") : "home";
    else if (k === "stay") e = "stay";
    else if (k === "cn") e = r.hasB ? "phdcn" : "home";
    else e = r.hasA ? "phdab" : "home";
    end(e);
    if (e === "phdcn")
      S.ending.x =
        "导师" +
        (S.a.trust >= 60
          ? "全力推荐，你去了顶尖高校"
          : S.a.trust >= 30
            ? "帮忙打了招呼，你去了重点高校"
            : "没怎么出力，你去了一所普通高校") +
        "读博。" +
        S.ending.x;
    if (e === "phdab") {
      const L = Math.max(1, S.mentor.letter - (S.a.trust < 30 ? 1 : 0));
      S.ending.x =
        "导师推荐信的分量是 " +
        L +
        " 分（满分 3 分），你去了" +
        (L >= 3 ? "一所顶尖名校" : L === 2 ? "一所不错的学校" : "一所普通学校") +
        "。" +
        S.ending.x;
    }
    if (e === "stay" && S.phd === "mid")
      S.ending.x = "硕士二年级中期之后你就答应了导师，这一天终于到了。" + S.ending.x;
    else if (e === "stay" && S.phd === "intern")
      S.ending.x = "当初为了那份实习答应的事，现在兑现了。" + S.ending.x;
    if (e === "home" && k !== "job")
      S.ending.x = "论文没达到申博门槛，申请全部被拒，工作也错过了。先回家歇一歇吧。";
  });

  /* ================================================================
   * 界面：把当前状态画成 HTML（主页面、弹窗、图鉴、简历）
   * ================================================================ */
  function attrsHtml(keys, src, one) {
    const A = src || S.a;
    return (
      '<div class="attrs' +
      (one ? " one" : "") +
      '">' +
      (keys || ORDER)
        .map((k) => {
          const v = Math.floor(A[k]);
          const cls =
            (k === "envy" ? " bad" : "") +
            ((k === "health" || k === "mood") && v < 30 ? " low" : "") +
            (k === "ability" || k === "trust" || k === "progress" ? " sci" : "");
          return (
            '<div class="attr' +
            cls +
            '"><span>' +
            LBL[k] +
            '</span><i><u style="width:' +
            v +
            '%"></u></i><span>' +
            v +
            "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function optBtn(i, call, title, sub, dis, cost) {
    return (
      '<button class="opt" onclick="' +
      call +
      '"' +
      (dis ? " disabled" : "") +
      '><span class="badge">' +
      "甲乙丙丁"[i] +
      "</span><div>" +
      title +
      (cost ? '<small class="cost">' + cost + "</small>" : "") +
      (sub ? "<small>" + sub + "</small>" : "") +
      "</div></button>"
    );
  }
  function effParts(e) {
    const r = {};
    for (const k in e) if (k !== "money" || e[k] > 0) r[k] = e[k];
    return { cost: e.money < 0 ? "花费 " + -e.money + " 元" : "", eff: effText(r) };
  }
  function tilePos(i) {
    const N = 10;
    if (i < N) return [1, i + 1];
    if (i < 2 * N - 1) return [i - N + 2, N];
    if (i < 3 * N - 2) return [N, 3 * N - 2 - i];
    return [4 * N - 3 - i, 1];
  }
  function nextStone() {
    const L = [
      [10, "开题"],
      [22, "中期考核"],
      [25, "秋招"],
      [32 + 6 * S.ext, "预答辩"],
      [33 + 6 * S.ext, "盲审"],
      [34 + 6 * S.ext, "正式答辩"],
      [END_M + 1 + 6 * S.ext, "各奔东西"],
    ];
    for (const x of L) {
      if (x[0] > S.month) return "距" + x[1] + "还有 " + (x[0] - S.month) + " 个月";
    }
    return "";
  }
  function ssn() {
    const c = ((S.month + 7) % 12) + 1;
    return c >= 3 && c <= 5
      ? "spring"
      : c >= 6 && c <= 8
        ? "summer"
        : c >= 9 && c <= 11
          ? "fall"
          : "winter";
  }
  function boardHtml() {
    const m_ = S.month,
      w =
        m_ <= 11
          ? (m_ / 11) * 12
          : m_ <= 23
            ? m_ - 11
            : m_ <= END_M
              ? ((m_ - 23) / 11) * 12
              : (((m_ - END_M - 1) % 6) + 1) * 2;
    let h = '<div class="board s-' + ssn() + '">';
    BOARD.forEach((c, i) => {
      const p = tilePos(i);
      h +=
        '<div class="tile t-' +
        c +
        (i === S.pos ? " here" : "") +
        '" style="grid-row:' +
        p[0] +
        ";grid-column:" +
        p[1] +
        '">' +
        TILE[c] +
        (i === S.pos ? '<span class="pawn" aria-label="你的位置">' + avatar("ava-pawn") + '</span>' : "") +
        "</div>";
    });
    const canRoll = S.step === "roll",
      canDay = S.step === "daily";
    const tip = canDay
      ? "先排完日常"
      : canRoll
        ? "第 " + ((S.rolls || 0) + 1) + "/2 次"
        : S.step === "meet"
          ? "组会中"
          : "事件中";
    h +=
      '<div class="mid"><div class="mtop"><p class="mdate"><b>' +
      dateShort(S.month) +
      "</b> · " +
      nextStone() +
      '</p><div class="bar"><u style="width:' +
      Math.round((w / 12) * 100) +
      '%"></u></div></div>' +
      '<div class="mimg"></div>' +
      '<div class="mbot"><div class="mbtns"><button class="daybtn" onclick="G.modal(\'daily\')"' +
      (canDay ? "" : " disabled") +
      ">📅 日常<small>" +
      (canDay ? S.week - 1 + "/4 已排" : "本月已排") +
      "</small></button>" +
      '<button class="rollbtn" onclick="G.roll()"' +
      (canRoll ? "" : " disabled") +
      ' aria-label="掷骰子">🎲 随机<small>' +
      tip +
      "</small></button></div>" +
      '<p class="muted res">' +
      (S.result || "每月先安排四周的日常，月底开组会，再掷两次骰子。") +
      "</p></div></div></div>";
    return h;
  }
  function loveHtml() {
    if (!S.partner && !S.ex) return "";
    const D = S.loveDone || {};
    const b = (k, n, c, e) => {
      const done = D[k],
        full = !done && S.dates >= 2,
        poor = !done && !full && S.money < c;
      return (
        "<button onclick=\"G.love('" +
        k +
        "')\"" +
        (done || full || poor ? " disabled" : "") +
        ">" +
        n +
        (done ? " ✓" : "") +
        '<small class="cost">花费 ' +
        c +
        " 元</small><small>" +
        (done ? "这个月已经做过了" : full ? "这个月的两次互动用完了" : poor ? "钱不够" : e) +
        "</small></button>"
      );
    };
    const msg = S.loveMsg ? '<p class="result">' + S.loveMsg + "</p>" : "";
    return (
      '<h3 class="sub">💕 对象</h3>' +
      (S.partner
        ? '<p class="muted">有对象每月心情+3。下面的互动只花钱，不占这个月的活动次数，点了立刻生效，每月最多两次（本月 ' +
          S.dates +
          "/2）。连续两个月不互动，对方会提分手。</p>" +
          msg +
          '<div class="grid2">' +
          b("date", "约会", 100, effText(realEff({ mood: 4, res: 1 }))) +
          b("gift", "送礼物", 200, effText(realEff({ mood: 3, luck: 1 }))) +
          b("trip", "一起去旅游", 600, effText(realEff({ mood: 8, health: 2 }))) +
          "<button onclick=\"G.split('nice')\"" +
          (S.money >= 300 ? "" : " disabled") +
          '>好聚好散<small class="cost">花费 300 元</small><small>心情-3，以后还能挽回</small></button>' +
          "<button onclick=\"G.split('cold')\">直接分手<small>心情-6，对方从此消失</small></button></div>"
        : msg +
          '<p class="muted">你们已经好聚好散。想挽回的话，随时可以。</p><button onclick="G.back()"' +
          (S.money >= 300 ? "" : " disabled") +
          '>挽回<small class="cost">花费 300 元</small><small>重新在一起</small></button>')
    );
  }
  function resumeHtml() {
    const r = resumeData();
    const L = [];
    r.acc.forEach((p) =>
      L.push("CCF-" + p.lv + "《" + esc(p.title || "未命名") + "》（" + roleName(p) + "，已接收）"),
    );
    r.sub.forEach((p) =>
      L.push(
        "CCF-" +
          p.lv +
          "《" +
          esc(p.title || "未命名") +
          "》（" +
          roleName(p) +
          "，" +
          (p.status === "submitted" ? "在投" : "被拒 " + p.rej + " 次") +
          "）",
      ),
    );
    if (S.comps && S.comps.length) S.comps.forEach((c) => L.push("在「" + c + "」实习三个月"));
    else if (S.interns) L.push("实习 " + S.interns + " 段");
    if (S.hx) L.push("参与导师横向项目 " + S.hx + " 次");
    if (S.applies) L.push("投出简历 " + S.applies + " 轮");
    if (S.transfers) L.push("转组 " + S.transfers + " 次");
    if (!L.length) L.push("一片空白");
    return "<ul>" + L.map((x) => "<li>" + x + "</li>").join("") + "</ul>";
  }
  function paperHtml() {
    const active = S.papers.filter((p) => p.status !== "accepted" && !p.collab).length;
    const bs = blindScore(false);
    const T = (ok) =>
      ok ? '<span class="tag good">已满足</span>' : '<span class="tag bad">未满足</span>';
    let h =
      '<h2>论文</h2><p class="story">毕业要同时满足两个条件：<br>① 导师的要求：至少发表一篇 CCF-' +
      reqLv() +
      "。" +
      T(reqOK()) +
      "<br>② 毕业论文盲审 80 分及以上：按现在的进度预计 <b>" +
      bs +
      "</b> 分。两篇一作或共同一作的论文都写完就有 80 分，二作不算。" +
      T(bs >= 80) +
      '</p><p class="muted">可用科研进展 <b>' +
      S.a.progress +
      "</b>。CCF-C 主要用来给毕业论文凑分数，导师的要求得靠更高档的论文。</p>";
    S.papers.forEach((p) => {
      const cost = stageCost(p);
      const st =
        STAGES.map(
          (s, i) =>
            '<span class="' +
            (i < p.stage ? "on" : i === p.stage ? "now" : "") +
            '">' +
            s +
            "</span>",
        ).join("") +
        '<span class="' +
        (p.subs > 0 ? "on" : p.stage >= NS ? "now" : "") +
        '">投稿</span><span class="' +
        (p.status === "accepted" ? "on" : "") +
        '">接收</span>';
      let btn = "";
      if (p.status === "doing" && p.stage < NS)
        btn =
          '<button onclick="G.advance(' +
          p.id +
          ')"' +
          (S.a.progress < cost ? " disabled" : "") +
          ">完成「" +
          STAGES[p.stage] +
          "」<small>消耗科研进展 " +
          cost +
          "</small></button>";
      else if (p.status === "doing")
        btn =
          '<button onclick="G.submit(' +
          p.id +
          ')">' +
          (p.rej ? "重新投稿" : "投稿") +
          "<small>接收概率 " +
          paperProb(p) +
          "%，下月初出结果</small></button>";
      else if (p.status === "submitted")
        btn =
          '<p class="muted">' +
          "审稿中，下月初出结果。" +
          "</p>";
      else if (p.status === "rejected") {
        btn =
          '<button onclick="G.revise(' +
          p.id +
          ')">退回「算法」阶段重做<small>要重做算法、实验、写作；再投 CCF-' +
          p.lv +
          " 的接收概率 " +
          paperProb(p) +
          "%</small></button>";
        if (p.lv === "A")
          btn +=
            '<button onclick="G.downgrade(' +
            p.id +
            ",'B')\">降档转投 CCF-B<small>不用改，接收概率 90%</small></button>";
        if (p.lv !== "C")
          btn +=
            '<button onclick="G.downgrade(' +
            p.id +
            ",'C')\">降档转投 CCF-C<small>不用改，接收概率 100%</small></button>";
      } else btn = '<p class="muted">已接收，写进简历了。</p>';
      h +=
        '<div class="paper"><div class="chips"><span class="chip up">CCF-' +
        p.lv +
        '</span><span class="chip ' +
        (p.stolen || p.role === "second" ? "down" : "") +
        '">' +
        roleName(p) +
        "</span>" +
        (p.collab ? '<span class="chip">与同门合作</span>' : "") +
        '<span class="chip lock">#' +
        p.id +
        '</span></div><div class="top"><h3>《' +
        esc(p.title || "未命名") +
        "》</h3>" +
        (p.rej ? '<span class="tag bad">返修或被拒 ' + p.rej + " 次</span>" : "") +
        '</div><div class="stages">' +
        st +
        "</div>" +
        btn +
        "</div>";
    });
    if (active < 2) {
      h +=
        '<h3>开一篇新论文</h3><div class="col">' +
        ["C", "B", "A"]
          .map((lv) => {
            const c = PAPER[lv];
            return (
              "<button onclick=\"G.newPaper('" +
              lv +
              "')\"" +
              (S.a.progress < c.cost ? " disabled" : "") +
              ">CCF-" +
              lv +
              "<small>每阶段消耗 " +
              c.cost +
              "，首投接收率 " +
              c.ps[0] +
              "%</small></button>"
            );
          })
          .join("") +
        "</div>";
    } else h += '<p class="muted">最多同时做两篇。</p>';
    return h + '<button class="ghost" onclick="G.modal(null)">返回日常</button>';
  }
  function overlay(inner) {
    return '<div class="overlay"><div class="card">' + inner + "</div></div>";
  }
  function overlayC(inner, cls) {
    return (
      '<div class="overlay' +
      (cls ? " " + cls : "") +
      '" onclick="if(event.target===this)G.modal(null)"><div class="card">' +
      inner +
      "</div></div>"
    );
  }
  function mainHtml() {
    const tp = Math.round(Math.min(0.9, 0.5 + S.a.luck / 500) * 100);
    const stu = STUDENTS[S.stu] || { tag: "" };
    let h =
      '<div class="top strip"><b>' +
      dateStr(S.month) +
      '</b><span class="money">' +
      (S.money < 0 ? "欠债 " + -S.money : "¥ " + S.money) +
      "</span></div>";
    if (S.note) h += '<p class="muted strip clamp1">' + S.note + "</p>";
    h +=
      '<div class="card slim"><div class="top"><span><span class="muted">导师</span> <b class="nm">' +
      S.mentor.name +
      '</b></span><span class="tag mid">劳务费 ' +
      S.mentor.stipend +
      "/月</span></div></div>";
    h +=
      '<div class="card"><div class="top"><span class="who">' +
      avatar("ava-sm") +
      "<b>" +
      esc(S.name) +
      '</b> <span class="tag mid">' +
      stu.tag +
      "</span>" +
      (S.partner ? ' <span class="tag good">有对象</span>' : "") +
      (S.ext ? ' <span class="tag bad">延毕 ' + S.ext + " 次</span>" : "") +
      '</span><button class="mini" onclick="G.modal(\'me\')">详情</button></div>' +
      attrsHtml(["health", "mood"], null, true) +
      '<div class="chips">' +
      ["res", "hair", "rel", "scheme", "luck"]
        .map((k) => '<span class="chip">' + LBL[k] + " <b>" + Math.floor(S.a[k]) + "</b></span>")
        .join("") +
      "</div></div>";
    h +=
      '<div class="tiles3">' +
      ["ability", "trust", "envy"]
        .map(
          (k) =>
            '<div class="stat' +
            (k === "envy" ? " bad" : "") +
            '"><span>' +
            LBL[k] +
            "</span><b>" +
            Math.floor(S.a[k]) +
            '</b><i class="bar"><u style="width:' +
            S.a[k] +
            '%"></u></i></div>',
        )
        .join("") +
      "</div>";
    h += boardHtml();
    h +=
      '<div class="dock"><nav class="nav"><button' +
      (S.a.progress >= 100 ? ' class="go"' : "") +
      " onclick=\"G.modal('paper')\">📄 论文<small>" +
      (S.a.progress >= 100 ? "进展满了，快去用" : "进展 " + S.a.progress) +
      "</small></button>" +
      "<button onclick=\"G.modal('log')\">📜 记录<small>最近的事</small></button><button onclick=\"G.modal('album')\">🏆 图鉴<small>成就 结局</small></button><button onclick=\"G.modal('settings')\">⚙️ 设置<small>存档</small></button></nav></div>";
    if (S.crisis === "mood")
      h += overlay(
        '<h2>情绪亮红灯</h2><p class="story">心情已经低于 30。<span class="hl">降到 0 就要休学了。</span>关心一下自己的心理健康：是换个环境，还是先停一停？</p>' +
          optBtn(0, "G.crisis('stay')", "先调整一下", "多睡觉、多见朋友、少做点科研") +
          optBtn(1, "G.crisis('transfer')", "申请转组", "健康-10，心情-10，失败照常继续") +
          optBtn(2, "G.crisis('quit')", "退学", ""),
      );
    else if (S.crisis === "health")
      h += overlay(
        '<h2>身体亮红灯</h2><p class="story">健康已经低于 30。<span class="hl">降到 0 会被送进医院，只能休学养病。</span>关心一下自己的身体：是换个环境，还是先歇一歇？</p>' +
          optBtn(0, "G.crisis('stay')", "先养一养", "多睡觉、多健身") +
          optBtn(1, "G.crisis('transfer')", "申请转组", "健康-10，心情-10，失败照常继续") +
          optBtn(2, "G.crisis('quit')", "退学", ""),
      );
    else if (S.notices.length)
      h += overlay(
        (S.notices[0].c ? evHead(S.notices[0].c, S.notices[0].info) : "") +
          "<h2>" +
          S.notices[0].t +
          '</h2><p class="story' +
          (S.notices[0].c ? " st-" + S.notices[0].c : "") +
          '">' +
          S.notices[0].x +
          '</p><button class="primary" onclick="G.closeNotice()">知道了</button>',
      );
    else if (S.ask && S.ask.kind === "meet")
      h += overlay(
        '<h2>组会前夜</h2><p class="story">明天就是组会。本月的科研进展似乎不足，要不要熬夜赶一赶？</p>' +
          optBtn(0, "G.ask(0)", "熬夜赶进度", "") +
          optBtn(1, "G.ask(1)", "就这样去汇报", ""),
      );
    else if (S.ask && S.ask.kind === "stay")
      h += overlay(
        '<h2>寒假到了</h2><p class="story">寒假只有两周。导师在群里问：“过年有谁留校？”</p>' +
          optBtn(0, "G.ask(0)", "留校", "这个月照常安排四周") +
          optBtn(1, "G.ask(1)", "回家过年", "这个月只剩两周可以安排"),
      );
    else if (S.ask && S.ask.kind === "phd")
      h += overlay(
        '<h2>导师问你要不要留下来读博</h2><p class="story">中期考核刚结束，导师把你叫进办公室：“你考虑过读博吗？留在组里，硕转博，我们接着做。”</p><p class="muted">答应后毕业论文盲审和导师的论文要求照样要过，毕业时的去向只能选留组读博。</p>' +
          optBtn(0, "G.ask(0)", "留下来读博", "") +
          optBtn(1, "G.ask(1)", "再想想", ""),
      );
    else if (S.ask && S.ask.kind === "breakup")
      h += overlay(
        '<h2>对象提出分手</h2><p class="story">“你已经两个月没理我了。”</p>' +
          optBtn(
            0,
            "G.ask(0)",
            "送礼物挽回",
            "",
            S.money < 300,
            "花费 300 元" + (S.money < 300 ? "（钱不够）" : ""),
          ) +
          optBtn(1, "G.ask(1)", "那就分手吧", ""),
      );
    else if (S.ask && S.ask.kind === "fix") {
      const ev = EVENTS.find((e) => e.id === S.ask.id);
      h += overlay(
        '<div class="top"><span class="tags">' +
          catTag("fixed") +
          '</span><span class="muted">' +
          dateStr(S.month) +
          "</span></div>" +
          "<h2>" +
          ev.n +
          '</h2><p class="story st-' +
          ev.c +
          '">' +
          evImgs(ev.id) +
          ev.d +
          '</p><div class="col">' +
          ev.o
            .map((o, i) => {
              const lock = o.req && !o.req(S);
              const dis = lock || !canPay(o.e);
              const p = effParts(o.e);
              return optBtn(
                i,
                "G.ask(" + i + ")",
                o.t,
                o.reqT || "",
                dis,
                p.cost + (p.cost && !canPay(o.e) ? "（钱不够）" : ""),
              );
            })
            .join("") +
          "</div>",
      );
    } else if (S.step === "event") {
      const ev = EVENTS.find((e) => e.id === S.ev);
      h += overlay(
        '<div class="top"><span class="tags">' +
          catTag(ev.c) +
          '</span><span class="muted">掷出 ' +
          S.dice +
          " · 走到「" +
          TILE[ev.c] +
          "」格</span></div>" +
          "<h2>" +
          ev.n +
          '</h2><p class="story st-' +
          ev.c +
          '">' +
          evImgs(ev.id) +
          ev.d +
          '</p><div class="col">' +
          ev.o
            .map((o, i) => {
              const lock = o.req && !o.req(S);
              const dis = lock || !canPay(o.e);
              const p = effParts(o.e);
              return optBtn(
                i,
                "G.opt(" + i + ")",
                o.t,
                o.reqT || "",
                dis,
                p.cost + (p.cost && !canPay(o.e) ? "（钱不够）" : ""),
              );
            })
            .join("") +
          "</div>",
      );
    } else if (S.modal === "daily" && S.step === "daily") {
      const n = slots();
      const cost = pickCost(S.pick);
      h += overlayC(
        '<div class="top"><h2>' +
          dateShort(S.month) +
          '的活动</h2><button class="mini" onclick="G.modal(null)">关闭</button></div><p class="muted">这个月要排 ' +
          n +
          " 件事，每件事每月只能做一次。默认保留上个月的选择，点一下取消，再点别的换掉。</p>" +
          (S.month === 10 || S.month === 22
            ? '<p class="story">本月是' +
              (S.month === 10 ? "开题" : "中期考核") +
              "，导师已经找你谈过话，详情在「记录」里。</p>"
            : "") +
          loveHtml() +
          ["科研", "社交", "休养"]
            .map(
              (g) =>
                '<h3 class="sub">' +
                g +
                '</h3><div class="grid2">' +
                (g === "科研"
                  ? S.fixed
                      .map(
                        (f) =>
                          '<button class="sel" disabled>' +
                          f +
                          "<small>" +
                          (f === "上课"
                            ? "研一必修，科研能力+0.3"
                            : f === "横向"
                              ? "导师派的，金钱+200 健康-2"
                              : "实习期间，工资 200") +
                          "</small><small>固定占一件事</small></button>",
                      )
                      .join("")
                  : "") +
                DAILY.filter((d) => d.g === g && avail(d))
                  .map((d) => {
                    const on = S.pick.indexOf(d.k) >= 0;
                    const p = effParts(realEff(dailyEff(d)));
                    const dis =
                      !on &&
                      (!sickOK(d) ||
                        S.pick.length >= n ||
                        (S.cnt[d.k] || 0) >= 1 ||
                        (d.e.money < 0 && cost - d.e.money > S.money));
                    return (
                      '<button class="' +
                      (on ? "sel" : "") +
                      '" onclick="G.pick(\'' +
                      d.k +
                      "')\"" +
                      (dis ? " disabled" : "") +
                      ">" +
                      d.n +
                      (p.cost ? '<small class="cost">' + p.cost + "</small>" : "") +
                      (d.rnd ? '<small class="cost">随机花 10–100 元</small>' : "") +
                      "<small>" +
                      (sickOK(d) ? p.eff : "健康低于 50 才能去") +
                      "</small></button>"
                    );
                  })
                  .join("") +
                "</div>",
            )
            .join("") +
          '<h3 class="sub">其他</h3><button onclick="G.modal(\'transfer\')">申请转组<small>占掉一件事 · 健康-10 心情-10 · 成功率约 ' +
          tp +
          "%</small></button>" +
          '<div class="gobar"><span class="muted">已选 ' +
          S.pick.length +
          "/" +
          n +
          (cost ? " · 共花费 " + cost + " 元" : "") +
          '</span><button class="primary" onclick="G.go()"' +
          (S.pick.length === n && cost <= Math.max(0, S.money) ? "" : " disabled") +
          ">" +
          (cost > Math.max(0, S.money) ? "钱不够，先取消几项花钱的" : "就这么安排") +
          "</button></div>",
      );
    } else if (S.modal === "me")
      h += overlayC(
        '<div class="top"><h2>' +
          esc(S.name) +
          '</h2><button class="mini" onclick="G.modal(null)">关闭</button></div>' +
          attrsHtml(["health", "mood", "res", "hair", "rel", "scheme", "luck"], null, true) +
          '<h3 class="sub">科研与组内</h3>' +
          attrsHtml(["ability", "progress", "trust", "envy"], null, true) +
          '<ul class="muted"><li>记得多关心自己。心情或健康过低时，每次行动获得的科研进展减少。心情归零会休学回家，健康归零则原地飞升。</li><li>心态越差，遭遇坏事件会导致心情变差更多；心态好了，每个月心情自然上升。</li><li>科研能力提高后，科研进展也提升得更快。</li><li>人品好可以提高论文接收率和转组成功率，多做好事吧。</li><li>城府提高后可以更好地应对办公室政治；同辈忮忌越高越容易被同门坑。</li></ul>',
      );
    else if (S.modal === "paper") h += overlayC(paperHtml());
    else if (S.modal === "title" && S.draft)
      h += overlayC(
        '<h2>给论文起个标题</h2><p class="muted">目标 CCF-' +
          S.draft.lv +
          "，定题消耗科研进展 " +
          PAPER[S.draft.lv].cost +
          '。标题会写进简历和结局。</p><div class="namebar"><input type="text" id="pt" maxlength="40" aria-label="论文标题" value="' +
          esc(S.draft.title) +
          '"><button class="mini" onclick="G.retitle()">换一个</button></div><div class="actions"><button class="big" onclick="G.modal(\'paper\')">返回</button><button class="big roll" onclick="G.okPaper()">就叫这个</button></div>',
      );
    else if (S.modal === "album") h += overlayC(albumHtml(), S.open && S.open.t ? "pin" : "");
    else if (S.modal === "settings") h += overlayC(settingsHtml());
    else if (S.modal === "quit")
      h += overlayC(
        '<h2>确定重新入学？</h2><p class="story">这一局的进度会清空，不会记入历史记录。</p><div class="actions"><button class="big" onclick="G.modal(\'settings\')">再想想</button><button class="big roll" onclick="G.restart()">确定</button></div>',
      );
    else if (S.modal === "log")
      h += overlayC(
        '<div class="top"><h2>最近发生的事</h2><button class="mini" onclick="G.modal(null)">关闭</button></div><div class="log">' +
          (S.log
            .slice()
            .reverse()
            .map((x) => "<span>" + x + "</span>")
            .join("") || "<span>还什么都没发生。</span>") +
          "</div>",
      );
    else if (S.modal === "transfer" && S.step === "daily")
      h += overlayC(
        '<h2>申请转组</h2><p class="story">占用本月的一件日常，消耗健康 10、心情 10。成功后换导师，科研能力、人品、人缘、城府保留；<span class="hl">科研进展、导师心腹、同辈忮忌清零，手上的论文全部作废。</span>失败则白白消耗。</p><div class="actions"><button class="big" onclick="G.modal(\'daily\')">再想想</button><button class="big roll" onclick="G.transfer()">确定申请</button></div>',
      );
    return h;
  }
  function settingsHtml() {
    const run = localRun();
    const peers = peerList().length;
    const runs = M.runs.length;
    let h =
      '<div class="top"><h2>设置</h2><button class="mini" onclick="G.modal(null)">关闭</button></div>' +
      (S.impMsg ? '<p class="result">' + S.impMsg + "</p>" : "");
    if (PENDING)
      h +=
        '<div class="setbox"><h3 class="sub">用哪一局接着玩？</h3><p class="muted">文件里：' +
        runLabel(PENDING) +
        "<br>本机：" +
        runLabel(run) +
        '</p><div class="actions"><button class="big" onclick="G.usePending(false)">保留本机的</button><button class="big roll" onclick="G.usePending(true)">用文件里的</button></div></div>';
    h +=
      '<div class="setbox"><h3 class="sub">这一局</h3>' +
      (inProgress(run)
        ? '<p class="muted">' +
          runLabel(run) +
          "<br>每一步都自动保存在这个浏览器里，关掉页面下次打开可以接着玩。</p>" +
          (S.screen !== "welcome"
            ? '<button onclick="G.modal(\'quit\')">放弃这一局，重新入学<small>当前进度会丢失，图鉴和成就不受影响</small></button>'
            : "")
        : '<p class="muted">现在没有进行中的一局。</p>') +
      "</div>";
    h +=
      '<div class="setbox"><h3 class="sub">存档文件</h3><p class="muted">把进度和图鉴、成就、历史记录导出成一个 .json 文件。换浏览器或换手机后导入它，就能接着玩；多个浏览器的图鉴记录会累加在一起，同一个文件导入两次不会重复计算。</p>' +
      '<div class="actions"><button class="big" onclick="G.exportSave()">导出存档</button><button class="big" onclick="G.pickFile()">导入存档</button></div>' +
      '<input type="file" id="impfile" accept=".json,application/json" hidden onchange="G.importFile(this)"></div>';
    h +=
      '<div class="setbox"><h3 class="sub">排行榜</h3><p class="muted">' +
      (M.noRank
        ? "你现在不参加排行榜，打完的局不会上传。"
        : "走到盲审的局会把名字、头像、导师、结局和盲审分数传到排行榜，名字公开显示。") +
      '</p><button onclick="G.rankOpt(' +
      (M.noRank ? "true" : "false") +
      ')">' +
      (M.noRank ? "重新参加排行榜" : "不参加排行榜，并删掉我已上榜的成绩") +
      "</button></div>";
    h +=
      '<div class="setbox"><h3 class="sub">图鉴记录</h3><p class="muted">本浏览器玩完 ' +
      runs +
      (runs >= 20 ? "+" : "") +
      " 局" +
      (peers ? "，另外合并了 " + peers + " 个浏览器的记录" : "") +
      "。结局、成就、事件和历史记录都跨局保留，存在这个浏览器里；清除浏览器数据会一起清掉，记得先导出。</p></div>";
    return h;
  }
  function view() {
    let h = view0();
    if (S.screen !== "main" && S.modal === "album")
      h += overlayC(albumHtml(), S.open && S.open.t ? "pin" : "");
    if (S.screen !== "main" && S.modal === "settings") h += overlayC(settingsHtml());
    if (S.screen !== "main" && S.modal === "rank") h += overlayC(rankHtml(), "pin");
    return h;
  }
  function view0() {
    if (S.screen === "welcome") {
      const s = load();
      const has = s && s.screen !== "welcome" && s.screen !== "end";
      return (
        '<div class="card welcome"><h1>读研<span class="hl">模拟器</span></h1><img class="hero" alt="开学啦" src="images/welcome_hero.png"><p>🎉恭喜你成为一名硕士研究生。从硕士一年级 9 月到硕士三年级 6 月，一共 34 个月，7 月各奔东西。能不能顺利毕业全看你怎么安排。</p><ul><li>每个月四周，每周安排一件事；月底开组会；每月可掷两次骰子，在地图上前进，走到哪格就遇到哪类事。</li><li>攒够「科研进展」记得兑换论文进度，论文有 CCF-A、B、C 三档。</li><li>毕业有两关：学校要求毕业论文盲审 80 分及以上，导师要求发表一篇论文，档次因人而异。</li></ul>' +
        '<div class="wbtns">' +
        (has
          ? '<button class="primary" onclick="G.resume()">继续上次的进度</button><button class="ghost" onclick="G.start()">重新入学</button>'
          : '<button class="primary" onclick="G.start()">报到入学</button>') +
        '<button class="ghost" onclick="G.rank()">排行榜：盲审最高分和最低分</button><button class="ghost" onclick="G.modal(\'album\')">图鉴：结局、成就、历史</button><button class="ghost" onclick="G.modal(\'settings\')">存档：导入、导出</button></div></div>'
      );
    }
    if (S.screen === "drawStudent") {
      const t = S.stu >= 0 ? STUDENTS[S.stu] : null;
      let h =
        '<div class="top strip"><b>一 · 抽签问出身</b><span class="muted">八种学生，全凭手气</span></div><div class="namebar"><button class="mini avatar" onclick="G.sex()" aria-label="换头像" title="换头像">' + avatar("ava-lg") + '<i class="swap" aria-hidden="true">⇄</i></button><input type="text" id="nm" maxlength="12" placeholder="给自己起个名字" aria-label="名字" value="' +
        esc(S.name) +
        '"><button class="mini" onclick="G.rename()">换一个</button></div>';
      if (!t)
        return (
          h +
          '<div class="card"><p>签筒摇一摇，看看你是哪种硕士研究生。</p><button class="primary" onclick="G.drawStu()">抽签</button></div>'
        );
      return (
        h +
        '<div class="card"><div class="top"><h2>' +
        t.tag +
        '</h2><span class="tag mid">准备金 ¥ ' +
        t.a.wealth * 20 +
        '</span></div><p class="story">' +
        t.desc +
        '</p><div class="chips">' +
        (t.note ? '<span class="chip ' + t.noteCls + '">' + t.note + "</span>" : "") +
        t.hi.map((k) => '<span class="chip up">' + LBL[k] + "高</span>").join("") +
        t.lo.map((k) => '<span class="chip down">' + LBL[k] + "低</span>").join("") +
        "</div>" +
        attrsHtml(
          ["health", "mood", "res", "hair", "rel", "scheme", "luck", "ability", "wealth"],
          t.a,
          true,
        ) +
        "</div>" +
        '<div class="actions"><button class="big" onclick="G.drawStu()">不满意，重抽</button><button class="big roll" onclick="G.okStu()">就是我了</button></div>'
      );
    }
    if (S.screen === "drawMentor") {
      const m = S.men >= 0 ? MENTORS[S.men] : null;
      let h =
        '<div class="top strip"><b>二 · 抽签拜师门</b><span class="muted">' +
        esc(S.name) +
        " · 准备金 ¥ " +
        S.money +
        "</span></div>";
      if (!m)
        return (
          h +
          '<div class="card"><p>四种导师，脾气、经费和毕业要求都不一样。抽到不满意的可以重抽。</p><button class="primary" onclick="G.drawMen()">抽签</button></div>'
        );
      return (
        h +
        '<div class="card"><h2>' +
        m.name +
        '</h2><p class="story">' +
        m.desc +
        '</p><div class="chips"><span class="chip">劳务费 ' +
        m.stipend +
        "/月</span>" +
        m.tags.map((x) => '<span class="chip">' + x + "</span>").join("") +
        "</div></div>" +
        '<div class="actions"><button class="big" onclick="G.drawMen()">不满意，重抽</button><button class="big roll" onclick="G.okMen()">拜入门下</button></div>'
      );
    }
    if (QS[S.screen] && S.qres)
      return (
        '<div class="top strip"><b>三 · 开学之前</b><span class="muted">现有 ¥ ' +
        S.money +
        '</span></div><div class="card"><h2>' +
        S.qres.t +
        '</h2><p class="story">' +
        S.qres.x +
        '</p><button class="primary" onclick="G.qnext()">继续</button></div>'
      );
    if (QS[S.screen]) {
      const q = QS[S.screen];
      const n = { q1: "第一问", q2: "第二问", q3: "第三问" }[S.screen];
      return (
        '<div class="top strip"><b>三 · 开学之前</b><span class="muted">' +
        n +
        " · 现有 ¥ " +
        S.money +
        '</span></div><div class="card"><h2>' +
        q.t +
        '</h2><div class="col">' +
        q.o
          .map((o, i) => {
            const p = effParts(o.e);
            return optBtn(
              i,
              "G.answer('" + S.screen + "'," + i + ")",
              o.t,
              "",
              !canPay(o.e),
              p.cost,
            );
          })
          .join("") +
        "</div></div>"
      );
    }
    if (S.screen === "main") return mainHtml();
    if (S.screen === "resume") {
      const r = resumeData();
      return (
        '<div class="card"><p class="muted">三年结束 · ' +
        (S.ext ? "延毕 " + S.ext + " 次后" : "按时") +
        "通过毕业论文盲审（" +
        S.blind +
        " 分）</p><h2>" +
        esc(S.name) +
        "的简历</h2>" +
        (S.yearEnd
          ? '<h3 class="sub">' +
            (S.ext ? "最后这段时间" : "硕士三年级这一年") +
            "的结算</h3>" +
            S.yearEnd +
            '<h3 class="sub">简历</h3>'
          : "") +
        (S.finalNote ? '<p class="result">' + S.finalNote + "</p>" : "") +
        resumeHtml() +
        '<p class="muted">导师心腹 ' +
        S.a.trust +
        " · 求职得分 " +
        r.score +
        "</p></div>" +
        (S.phd
          ? '<div class="card"><h2>毕业去向</h2><p class="story">' +
            (S.phd === "mid" ? "硕士二年级中期之后" : "为了那份实习") +
            '，你答应过导师留下来读博。</p><button onclick="G.path(\'stay\')">留组读博<small>留在组里，继续读博士</small></button></div>'
          : '<div class="card"><h2>毕业去向，选一个</h2><button onclick="G.path(\'job\')">找工作<small>求职得分满 3 分能找到工作；有 B 类以上论文接收可去大厂</small></button><button onclick="G.path(\'cn\')">国内申博<small>至少一篇 B 类以上论文接收；导师心腹决定学校档次</small></button><button onclick="G.path(\'ab\')">海外 PhD<small>至少一篇 A 类论文接收；导师心腹决定推荐信数量</small></button><button onclick="G.path(\'stay\')"' +
            (S.a.trust >= 50 ? "" : " disabled") +
            ">留组读博<small>" +
            (S.a.trust >= 50 ? "导师心腹 50 以上，导师愿意留你" : "导师心腹 50 以上才行") +
            "</small></button></div>")
      );
    }
    if (S.screen === "end") {
      return (
        '<div class="card end"><p class="muted">结局 · ' +
        dateStr(Math.min(S.month, END_M + 6 * S.ext)) +
        '</p><h2><span class="hl">' +
        S.ending.t +
        "</span></h2>" +
        endImg(S.ending.k) +
        "<p>" +
        S.ending.x +
        "</p></div>" +
        '<div class="card"><h3>' +
        esc(S.name) +
        '的简历</h3><p class="muted">师从' +
        S.mentor.name +
        "</p>" +
        resumeHtml() +
        (S.blind ? '<p class="muted">毕业论文盲审 ' + S.blind + " 分</p>" : "") +
        attrsHtml() +
        "</div>" +
        '<div class="card"><h3>本局成就 ' +
        (S.runAch || []).length +
        " 个" +
        (S.newEnd ? " · 新结局" : "") +
        '</h3><div class="chips">' +
        ((S.runAch || [])
          .map((id) => {
            const a = ACH.find((x) => x.id === id);
            return (
              '<span class="chip ' +
              ((S.newAch || []).indexOf(id) >= 0 ? "up" : "") +
              '" title="' +
              a.d +
              '">' +
              a.n +
              ((S.newAch || []).indexOf(id) >= 0 ? " · 新" : "") +
              "</span>"
            );
          })
          .join("") || '<span class="muted">这一局没有解锁成就。</span>') +
        '</div><button class="ghost" onclick="G.modal(\'album\')">查看图鉴</button>' +
        (S.bt ? '<button class="ghost" onclick="G.rank()">看看排行榜</button>' : "") +
        '</div><button class="primary" onclick="G.restart()">再读一次研</button>'
      );
    }
    return "";
  }
  let lastKey = "";
  function render() {
    if (typeof document === "undefined") return;
    const app = document.getElementById("app");
    const oc = app.querySelector(".overlay .card");
    const st = oc ? oc.scrollTop : 0;
    const key =
      S.screen +
      "|" +
      (S.modal || "") +
      "|" +
      (S.crisis || "") +
      "|" +
      S.notices.length +
      "|" +
      (S.ask ? S.ask.kind : "") +
      "|" +
      S.step;
    app.innerHTML = view();
    if (key === lastKey) {
      const nc = app.querySelector(".overlay .card");
      if (nc) nc.scrollTop = st;
    }
    lastKey = key;
  }
  G._ = {
    get S() {
      return S;
    },
    get M() {
      return M;
    },
    ACH: ACH,
    blindScore: blindScore,
    NS: NS,
    BOARD: BOARD,
    resumeData: resumeData,
    EVENTS: EVENTS,
    DAILY: DAILY,
    PAPER: PAPER,
    canPay: canPay,
    view: view,
  };
  (typeof window !== "undefined" ? window : globalThis).G = G;
  render();
  rankFlush();
})();
