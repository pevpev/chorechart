/* ChoreChart — single-file friendly, no dependencies.
   The Pro build sets window.CHORCHART_PRO = true before this file runs. */
(function () {
  "use strict";

  // ---- Replace this with your own Gumroad URL before publishing ----
  var GUMROAD_URL = "https://hubacher.gumroad.com/l/udnmne";

  var IS_PRO = window.CHORCHART_PRO === true;
  var FREE_CHORE_LIMIT = 8;
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var STORAGE_KEY = IS_PRO ? "chorechart.pro.v1" : "chorechart.free.v1";

  var ICONS = ["🛏️", "🪥", "🧸", "🧹", "🍽️", "🐶", "📚", "🗑️", "👕", "🪴", "🛁", "⭐", "🚿", "🥣", "🐱", "✏️"];

  var PRESETS = {
    Toddlers: [
      { name: "Make the bed", points: 2, icon: "🛏️" },
      { name: "Brush teeth", points: 1, icon: "🪥" },
      { name: "Put toys away", points: 2, icon: "🧸" },
      { name: "Wash hands", points: 1, icon: "🧼" },
      { name: "Feed the pet", points: 1, icon: "🐶" },
      { name: "Pick up clothes", points: 2, icon: "👕" }
    ],
    Kids: [
      { name: "Make the bed", points: 2, icon: "🛏️" },
      { name: "Brush teeth", points: 1, icon: "🪥" },
      { name: "Clean my room", points: 3, icon: "🧹" },
      { name: "Take out trash", points: 2, icon: "🗑️" },
      { name: "Feed the pet", points: 1, icon: "🐶" },
      { name: "Set the table", points: 2, icon: "🍽️" },
      { name: "Homework", points: 3, icon: "📚" },
      { name: "Water plants", points: 1, icon: "🪴" }
    ],
    Teens: [
      { name: "Do laundry", points: 3, icon: "👕" },
      { name: "Wash dishes", points: 3, icon: "🍽️" },
      { name: "Take out trash", points: 2, icon: "🗑️" },
      { name: "Clean bathroom", points: 4, icon: "🛁" },
      { name: "Mow the lawn", points: 5, icon: "🌱" },
      { name: "Help with groceries", points: 3, icon: "🛒" },
      { name: "Walk the dog", points: 2, icon: "🐕" },
      { name: "Study", points: 3, icon: "✏️" }
    ]
  };

  var DEFAULT_COUPONS = [
    "Movie night", "Pick dinner", "Stay up 30 min late", "Extra story",
    "Choose a game", "No chores tomorrow", "Sleepover", "Ice cream"
  ];

  var ES = {
    "Chore": "Tarea", "Points": "Puntos", "Week of": "Semana del", "Chore Chart": "Tabla de tareas",
    "Signed:": "Firmado:", "If all done:": "Si todo está hecho:",
    "Earned:": "Ganado:", "Working toward:": "Meta:", "done": "hecho",
    "Mon": "Lun", "Tue": "Mar", "Wed": "Mié", "Thu": "Jue", "Fri": "Vie", "Sat": "Sáb", "Sun": "Dom"
  };

  var DEFAULT_ROUTINES = {
    morning: ["Wake up", "Make the bed", "Brush teeth", "Get dressed", "Eat breakfast", "Pack bag"],
    bedtime: ["Brush teeth", "Put toys away", "Bath time", "Story", "Lights out"]
  };

  var BADGES = [
    { id: "first", emoji: "🌟", name: "First Step", hint: "Complete your first chore" },
    { id: "ten", emoji: "🔟", name: "Ten Done", hint: "Complete 10 chores" },
    { id: "streak3", emoji: "🔥", name: "On Fire", hint: "3-day perfect streak" },
    { id: "streak7", emoji: "💪", name: "Unstoppable", hint: "7-day perfect streak" },
    { id: "points100", emoji: "💰", name: "100 Points", hint: "Earn 100 points" },
    { id: "chick", emoji: "🐤", name: "Chick", hint: "Hatch your creature" },
    { id: "dragon", emoji: "🐲", name: "Legend", hint: "Reach the dragon stage" }
  ];

  var STAGES = [
    { min: 0, name: "Egg", emoji: "🥚", hint: "Finish every chore on one day to hatch." },
    { min: 1, name: "Hatchling", emoji: "🐣", hint: "Nice! 3 perfect days in a row to evolve." },
    { min: 3, name: "Chick", emoji: "🐤", hint: "Growing fast. 7 perfect days in a row to evolve." },
    { min: 7, name: "Fox Friend", emoji: "🦊", hint: "Halfway there. 14 perfect days in a row to evolve." },
    { min: 14, name: "Owl Guardian", emoji: "🦉", hint: "Almost legendary. 30 perfect days to evolve." },
    { min: 30, name: "Dragon", emoji: "🐲", hint: "Fully evolved. Your creature is legendary!" }
  ];

  // ---------- Small helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function toISO(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function mondayISO() {
    var d = new Date();
    var offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return toISO(d);
  }

  function prettyDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    return new Date(parts[0], parts[1] - 1, parts[2])
      .toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function possessive(name) {
    var n = String(name || "My").trim() || "My";
    return /s$/i.test(n) ? n + "'" : n + "'s";
  }

  function money(n) {
    return "$" + (Math.round(Number(n) * 100) / 100).toFixed(2);
  }

  function t(text) {
    return state.language === "es" && ES[text] ? ES[text] : text;
  }

  function earnedPoints(kid) {
    var total = 0;
    kid.chores.forEach(function (c) {
      for (var i = 0; i < 7; i++) {
        if (kid.completed && kid.completed[c.id + "|" + dateForDay(i)]) total += c.points;
      }
    });
    return total;
  }

  function pointsBalance(kid) {
    return Math.max(0, earnedPoints(kid) - (kid.spentPoints || 0));
  }

  function dayBefore(date) {
    var parts = date.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2] - 1);
    return toISO(d);
  }

  function choreStreak(kid, chore) {
    var now = new Date();
    var cursor = toISO(now);
    if (!kid.completed || !kid.completed[chore.id + "|" + cursor]) cursor = dayBefore(cursor);
    var count = 0;
    while (kid.completed && kid.completed[chore.id + "|" + cursor]) {
      count++;
      cursor = dayBefore(cursor);
    }
    return count;
  }

  function badgesFor(kid) {
    var streak = streakFor(kid);
    var earned = earnedPoints(kid);
    var stageIndex = 0;
    STAGES.forEach(function (s, i) { if (streak >= s.min) stageIndex = i; });
    var doneCount = Object.keys(kid.completed || {}).length;
    var unlocked = {
      first: doneCount >= 1,
      ten: doneCount >= 10,
      streak3: streak >= 3,
      streak7: streak >= 7,
      points100: earned >= 100,
      chick: stageIndex >= 2,
      dragon: stageIndex >= STAGES.length - 1
    };
    return BADGES.map(function (b) { return Object.assign({}, b, { on: !!unlocked[b.id] }); });
  }

  function rateFor(kid) {
    var rate = IS_PRO && kid && typeof kid.rate === "number" ? kid.rate : state.allowanceRate;
    return Math.max(0, Number(rate) || 0);
  }

  function possiblePoints(kid) {
    return kid.chores.reduce(function (sum, c) {
      var scheduled = c.days.filter(Boolean).length;
      return sum + c.points * scheduled;
    }, 0);
  }

  function dateForDay(index) {
    var parts = String(state.weekStart || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      var fallback = new Date();
      parts = [fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate()];
    }
    var d = new Date(parts[0], parts[1] - 1, parts[2] + index);
    return toISO(d);
  }

  function doneKey(choreId, dayIndex) {
    return choreId + "|" + dateForDay(dayIndex);
  }

  function weekProgress(kid) {
    var total = 0;
    var done = 0;
    kid.chores.forEach(function (c) {
      for (var i = 0; i < 7; i++) {
        if (!c.days[i]) continue;
        total++;
        if (kid.completed && kid.completed[doneKey(c.id, i)]) done++;
      }
    });
    return { total: total, done: done };
  }

  function recomputePerfectDays(kid) {
    if (!kid.perfectDays) kid.perfectDays = {};
    for (var i = 0; i < 7; i++) {
      var date = dateForDay(i);
      var required = 0;
      var done = 0;
      kid.chores.forEach(function (c) {
        if (!c.days[i]) return;
        required++;
        if (kid.completed && kid.completed[c.id + "|" + date]) done++;
      });
      if (required > 0 && done === required) kid.perfectDays[date] = true;
      else delete kid.perfectDays[date];
    }
  }

  function streakFor(kid) {
    if (!kid.perfectDays) return 0;
    var now = new Date();
    var cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!kid.perfectDays[toISO(cursor)]) cursor.setDate(cursor.getDate() - 1);
    var count = 0;
    while (kid.perfectDays[toISO(cursor)]) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function creatureFor(kid) {
    var streak = streakFor(kid);
    var earned = earnedPoints(kid);
    var boost = Math.floor(earned / 100);
    var power = streak + boost;
    var xp = earned * 2;
    var level = Math.floor(xp / 50) + 1;
    var xpInto = xp % 50;
    var stageIndex = 0;
    STAGES.forEach(function (s, i) { if (power >= s.min) stageIndex = i; });
    var stage = STAGES[stageIndex];
    var next = STAGES[stageIndex + 1];
    return {
      stage: stage,
      level: level,
      xp: xp,
      xpInto: xpInto,
      streak: streak,
      earned: earned,
      boost: boost,
      power: power,
      toNext: next ? next.min - power : 0,
      next: next
    };
  }

  function defaultChores() {
    return [
      { id: uid(), name: "Make the bed", points: 2, icon: "🛏️", days: [true, true, true, true, true, false, false] },
      { id: uid(), name: "Brush teeth", points: 1, icon: "🪥", days: [true, true, true, true, true, true, true] },
      { id: uid(), name: "Tidy up toys", points: 3, icon: "🧸", days: [true, false, true, false, true, false, false] },
      { id: uid(), name: "Take out trash", points: 2, icon: "🗑️", days: [false, false, true, false, false, false, false] }
    ];
  }

  function defaultState() {
    return {
      weekStart: mondayISO(),
      theme: "sunshine",
      usePoints: true,
      allowanceRate: 0.25,
      presetGroup: "Kids",
      language: "en",
      printSize: "letter",
      orientation: "portrait",
      routines: { morning: DEFAULT_ROUTINES.morning.slice(), bedtime: DEFAULT_ROUTINES.bedtime.slice() },
      template: null,
      coupons: DEFAULT_COUPONS.map(function (text, i) {
        return { id: uid(), text: text, on: true, cost: [10, 15, 20, 10, 10, 30, 40, 15][i] || 10 };
      }),
      reward: { name: "", points: 10 },
      activeKid: 0,
      printAll: false,
      kids: [{ id: uid(), name: "My Champs", stars: 0, rate: null, completed: {}, perfectDays: {}, spentPoints: 0, claimed: {}, creatureName: "Chore Pal", chores: defaultChores() }]
    };
  }

  function normalize(raw) {
    var base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    var out = {
      weekStart: typeof raw.weekStart === "string" ? raw.weekStart : base.weekStart,
      theme: ["sunshine", "ocean", "forest", "candy"].indexOf(raw.theme) >= 0 ? raw.theme : "sunshine",
      usePoints: raw.usePoints !== false,
      allowanceRate: raw.allowanceRate === undefined ? 0.25 : Math.max(0, Number(raw.allowanceRate) || 0),
      presetGroup: PRESETS[raw.presetGroup] ? raw.presetGroup : "Kids",
      language: raw.language === "es" ? "es" : "en",
      printSize: raw.printSize === "a4" ? "a4" : "letter",
      orientation: raw.orientation === "landscape" ? "landscape" : "portrait",
      routines: {
        morning: raw.routines && Array.isArray(raw.routines.morning) ? raw.routines.morning.slice(0, 20) : base.routines.morning,
        bedtime: raw.routines && Array.isArray(raw.routines.bedtime) ? raw.routines.bedtime.slice(0, 20) : base.routines.bedtime
      },
      template: raw.template && Array.isArray(raw.template.chores) ? raw.template : null,
      coupons: Array.isArray(raw.coupons)
        ? raw.coupons.slice(0, 12).map(function (c) {
            return {
              id: uid(),
              text: typeof c.text === "string" ? c.text : "Reward",
              on: c.on !== false,
              cost: Math.max(1, Number(c.cost) || 10)
            };
          })
        : base.coupons,
      reward: {
        name: raw.reward && typeof raw.reward.name === "string" ? raw.reward.name : "",
        points: Number(raw.reward && raw.reward.points) || 10
      },
      activeKid: 0,
      printAll: !!raw.printAll,
      kids: []
    };

    var source = Array.isArray(raw.kids) ? raw.kids : [];
    if (!IS_PRO) source = source.slice(0, 1);
    if (!source.length) source = base.kids;

    source.forEach(function (k) {
      var chores = (k && Array.isArray(k.chores) ? k.chores : []).map(function (c) {
        var days = Array.isArray(c.days) ? c.days.slice(0, 7) : [];
        while (days.length < 7) days.push(false);
        return {
          id: uid(),
          name: typeof c.name === "string" ? c.name : "Chore",
          points: Math.max(1, Math.min(999, Number(c.points) || 1)),
          icon: typeof c.icon === "string" ? c.icon.slice(0, 8) : "",
          days: days.map(Boolean)
        };
      });
      if (!IS_PRO) chores = chores.slice(0, FREE_CHORE_LIMIT);
      var rate = k && k.rate !== null && k.rate !== undefined && k.rate !== ""
        ? Math.max(0, Number(k.rate) || 0)
        : null;
      var completed = {};
      if (k && k.completed && typeof k.completed === "object") {
        Object.keys(k.completed).forEach(function (key) {
          if (k.completed[key]) completed[key] = true;
        });
      }
      var perfectDays = {};
      if (k && k.perfectDays && typeof k.perfectDays === "object") {
        Object.keys(k.perfectDays).forEach(function (key) {
          if (k.perfectDays[key]) perfectDays[key] = true;
        });
      }
      out.kids.push({
        id: uid(),
        name: k && typeof k.name === "string" ? k.name : "My Champs",
        stars: Math.max(0, Number(k && k.stars) || 0),
        rate: rate,
        completed: completed,
        perfectDays: perfectDays,
        spentPoints: Math.max(0, Number(k && k.spentPoints) || 0),
        claimed: k && k.claimed && typeof k.claimed === "object" ? k.claimed : {},
        creatureName: k && typeof k.creatureName === "string" ? k.creatureName.slice(0, 24) : "Chore Pal",
        chores: chores
      });
    });

    return out;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  var state = load();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode / disabled storage — app still works */ }
  }

  function activeKid() {
    if (!state.kids.length) state.kids.push({ id: uid(), name: "My Champs", stars: 0, rate: null, completed: {}, perfectDays: {}, spentPoints: 0, claimed: {}, creatureName: "Chore Pal", chores: [] });
    if (state.activeKid >= state.kids.length) state.activeKid = state.kids.length - 1;
    return state.kids[state.activeKid];
  }

  // ---------- Reusable UI pieces ----------
  function card(title) {
    var section = el("section", "card");
    section.append(el("h2", null, title));
    for (var i = 1; i < arguments.length; i++) section.append(arguments[i]);
    return section;
  }

  function textField(labelText, value, onInput, type) {
    var wrap = el("div", "field");
    var label = el("label", null, labelText);
    var input = el("input");
    input.type = type || "text";
    input.value = value;
    label.append(input);
    wrap.append(label);
    input.addEventListener("input", function () { onInput(input.value); });
    return wrap;
  }

  function selectField(labelText, options, value, onChange) {
    var wrap = el("div", "field");
    var label = el("label", null, labelText);
    var select = el("select");
    options.forEach(function (pair) {
      var opt = el("option", null, pair[1]);
      opt.value = pair[0];
      select.append(opt);
    });
    select.value = value;
    select.addEventListener("change", function () { onChange(select.value); });
    label.append(select);
    wrap.append(label);
    return wrap;
  }

  function button(label, cls, onClick) {
    var b = el("button", "btn " + (cls || ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- Controls ----------
  function renderControls() {
    var root = document.getElementById("controls");
    root.replaceChildren();

    if (IS_PRO) {
      root.append(el("div", "pro-badge", "✨ Pro version — unlimited kids, themes, rewards, and works offline."));
    } else {
      var banner = el("div", "banner");
      var strong = el("strong", null, "Free version: ");
      banner.append(strong, document.createTextNode("1 child, up to " + FREE_CHORE_LIMIT + " chores. "));
      var link = el("a", null, "Get Pro →");
      link.href = GUMROAD_URL;
      link.target = "_blank";
      link.rel = "noopener";
      banner.append(link);
      root.append(banner);
    }

    root.append(card("Who is this for?", kidControls()));
    root.append(card("Week of", weekControls()));
    root.append(card("Chores", choreControls()));
    root.append(card("Reward", rewardControls()));
    if (IS_PRO) root.append(card("Options & data", optionControls()));

    var actions = el("div", "card");
    actions.append(button("🖨️ Print chart", "btn-primary btn-block", function () { window.print(); }));
    var clear = button("↺ Clear this week's ticks", "btn-block", function () {
      if (!window.confirm("Clear all the done marks for this week?")) return;
      activeKid().completed = {};
      save();
      renderAll();
    });
    clear.style.marginTop = "8px";
    actions.append(clear);
    if (IS_PRO) {
      var couponBtn = button("🎟️ Print reward coupons", "btn-block", function () {
        document.body.classList.add("coupons-only");
        window.print();
        setTimeout(function () { document.body.classList.remove("coupons-only"); }, 1200);
      });
      couponBtn.style.marginTop = "8px";
      actions.append(couponBtn);
      var routineBtn = button("🌅 Print routines", "btn-block", function () {
        document.body.classList.add("routines-only");
        window.print();
        setTimeout(function () { document.body.classList.remove("routines-only"); }, 1200);
      });
      routineBtn.style.marginTop = "8px";
      actions.append(routineBtn);
    }
    var reset = button("Reset to example chart", "btn-danger btn-block", function () {
      if (window.confirm("Replace everything with the example chart?")) {
        state = defaultState();
        save();
        renderAll();
      }
    });
    reset.style.marginTop = "8px";
    actions.append(reset);
    actions.append(el("div", "saved-note", "Changes save automatically in this browser."));
    root.append(actions);
  }

  function kidControls() {
    var wrap = el("div");
    var kid = activeKid();

    if (IS_PRO) {
      var tabs = el("div", "kid-tabs");
      state.kids.forEach(function (k, i) {
        var tab = el("button", "kid-tab" + (i === state.activeKid ? " active" : ""), k.name || "Child " + (i + 1));
        tab.type = "button";
        tab.addEventListener("click", function () {
          state.activeKid = i;
          save();
          renderAll();
        });
        tabs.append(tab);
      });
      var add = button("+ Add child", "btn-small", function () {
        if (state.kids.length >= 6) { window.alert("Pro supports up to 6 children per chart set."); return; }
        state.kids.push({ id: uid(), name: "Child " + (state.kids.length + 1), stars: 0, rate: null, completed: {}, perfectDays: {}, spentPoints: 0, claimed: {}, creatureName: "Chore Pal", chores: [] });
        state.activeKid = state.kids.length - 1;
        save();
        renderAll();
      });
      tabs.append(add);
      wrap.append(tabs);
    }

    wrap.append(textField("Name", kid.name, function (v) {
      kid.name = v;
      save();
      renderPreview();
      if (IS_PRO) renderControls();
    }));

    wrap.append(textField("Creature's name", kid.creatureName || "Chore Pal", function (v) {
      kid.creatureName = v;
      save();
      renderPreview();
    }));

    if (IS_PRO && state.kids.length > 1) {
      var remove = button("Remove this child", "btn-small btn-danger", function () {
        if (!window.confirm("Remove " + (kid.name || "this child") + " and their chart?")) return;
        state.kids.splice(state.activeKid, 1);
        state.activeKid = Math.max(0, state.activeKid - 1);
        save();
        renderAll();
      });
      remove.style.marginTop = "4px";
      wrap.append(remove);
    }

    return wrap;
  }

  function weekControls() {
    var wrap = el("div");
    wrap.append(textField("Start of week", state.weekStart, function (v) {
      state.weekStart = v;
      save();
      renderPreview();
    }, "date"));
    return wrap;
  }

  function choreControls() {
    var wrap = el("div");
    var kid = activeKid();

    var form = el("form");
    var row = el("div", "row");
    var nameWrap = el("div", "field");
    var nameInput = el("input");
    nameInput.type = "text";
    nameInput.placeholder = "e.g. Feed the dog";
    nameInput.required = true;
    nameInput.setAttribute("aria-label", "Chore name");
    nameWrap.append(nameInput);
    row.append(nameWrap);

    var ptsWrap = el("div", "field");
    var ptsInput = el("input");
    ptsInput.type = "number";
    ptsInput.min = "1";
    ptsInput.max = "999";
    ptsInput.value = "2";
    ptsInput.setAttribute("aria-label", "Points");
    ptsWrap.append(ptsInput);
    if (state.usePoints) row.append(ptsWrap);
    form.append(row);

    var dayWrap = el("div", "day-grid");
    var boxes = [];
    DAYS.forEach(function (label, i) {
      var pick = el("label", "day-pick");
      var box = el("input");
      box.type = "checkbox";
      boxes.push(box);
      pick.append(box, document.createTextNode(label));
      dayWrap.append(pick);
    });
    form.append(dayWrap);

    var chosenIcon = "";
    if (IS_PRO) {
      var iconWrap = el("div", "icon-grid");
      ICONS.forEach(function (ico) {
        var pick = el("button", "icon-pick", ico);
        pick.type = "button";
        pick.title = "Use " + ico;
        pick.addEventListener("click", function () {
          chosenIcon = chosenIcon === ico ? "" : ico;
          Array.prototype.forEach.call(iconWrap.children, function (x) { x.classList.remove("active"); });
          if (chosenIcon) pick.classList.add("active");
        });
        iconWrap.append(pick);
      });
      form.append(iconWrap);
    }

    var addBtn = button("+ Add chore", "btn-primary btn-block", function () {});
    addBtn.type = "submit";
    addBtn.style.marginTop = "10px";
    form.append(addBtn);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      if (!name) return;
      if (!IS_PRO && kid.chores.length >= FREE_CHORE_LIMIT) {
        window.alert("Free charts allow " + FREE_CHORE_LIMIT + " chores. Upgrade to Pro for unlimited chores.");
        return;
      }
      kid.chores.push({
        id: uid(),
        name: name,
        points: Math.max(1, Math.min(999, Number(ptsInput.value) || 1)),
        icon: chosenIcon,
        days: boxes.map(function (b) { return b.checked; })
      });
      save();
      renderAll();
      var fresh = document.querySelector('input[aria-label="Chore name"]');
      if (fresh) fresh.focus();
    });
    wrap.append(form);

    var list = el("ul", "chore-list");
    kid.chores.forEach(function (c) {
      var item = el("li", "chore-item");
      if (IS_PRO && c.icon) item.append(el("span", "chore-icon", c.icon));
      item.append(el("span", "chore-name", c.name));
      if (state.usePoints) item.append(el("span", "chore-pts", c.points + " pts"));
      if (IS_PRO) {
        var cs = choreStreak(kid, c);
        if (cs > 0) item.append(el("span", "chore-streak", "🔥" + cs));
      }

      var mini = el("div", "day-mini");
      c.days.forEach(function (on, i) {
        var dot = el("button", "day-dot" + (on ? " on" : ""), on ? "✓" : "");
        dot.type = "button";
        dot.title = DAYS[i];
        dot.setAttribute("aria-label", DAYS[i] + (on ? " (on)" : " (off)"));
        dot.addEventListener("click", function () {
          c.days[i] = !c.days[i];
          save();
          renderControls();
          renderPreview();
        });
        mini.append(dot);
      });
      item.append(mini);

      var del = button("✕", "btn-small btn-danger", function () {
        kid.chores = kid.chores.filter(function (x) { return x.id !== c.id; });
        save();
        renderAll();
      });
      del.setAttribute("aria-label", "Delete " + c.name);
      item.append(del);
      list.append(item);
    });
    wrap.append(list);

    var ideas = el("div", "preset-box");
    ideas.append(el("div", "preset-title", "💡 Need chore ideas? Tap to add."));
    var presetTabs = el("div", "kid-tabs");
    Object.keys(PRESETS).forEach(function (group) {
      presetTabs.append(button(group,
        "kid-tab" + (state.presetGroup === group ? " active" : ""), function () {
          state.presetGroup = group;
          save();
          renderControls();
        }));
    });
    ideas.append(presetTabs);
    var chips = el("div", "preset-chips");
    PRESETS[state.presetGroup].forEach(function (p) {
      chips.append(button("+ " + p.icon + " " + p.name + " (" + p.points + ")", "preset-chip", function () {
        if (!IS_PRO && kid.chores.length >= FREE_CHORE_LIMIT) {
          window.alert("Free charts allow " + FREE_CHORE_LIMIT + " chores. Upgrade to Pro for unlimited chores.");
          return;
        }
        kid.chores.push({
          id: uid(), name: p.name, points: p.points, icon: p.icon,
          days: [true, true, true, true, true, false, false]
        });
        save();
        renderAll();
      }));
    });
    ideas.append(chips);
    var templateRow = el("div", "row");
    templateRow.style.marginTop = "8px";
    templateRow.append(button("💾 Save as template", "btn-small", function () {
      state.template = { chores: JSON.parse(JSON.stringify(kid.chores)) };
      save();
      renderAll();
    }));
    templateRow.append(button("📋 Apply template", "btn-small", function () {
      if (!state.template) { window.alert("Save a template first."); return; }
      kid.chores = state.template.chores.map(function (c) {
        return { id: uid(), name: c.name, points: c.points, icon: c.icon, days: c.days.slice(0, 7) };
      });
      if (!IS_PRO) kid.chores = kid.chores.slice(0, FREE_CHORE_LIMIT);
      save();
      renderAll();
    }));
    ideas.append(templateRow);
    wrap.append(ideas);

    if (!IS_PRO) {
      var counter = el("div", "counter", kid.chores.length + " / " + FREE_CHORE_LIMIT + " chores used");
      wrap.append(counter);
      if (kid.chores.length >= FREE_CHORE_LIMIT) {
        var more = el("a", "counter", "Need more? Unlock unlimited with Pro →");
        more.href = GUMROAD_URL;
        more.target = "_blank";
        more.rel = "noopener";
        wrap.append(more);
      }
    } else {
      wrap.append(el("div", "counter", kid.chores.length + " chores — no limit in Pro."));
    }

    return wrap;
  }

  function rewardControls() {
    var wrap = el("div");

    var toggleWrap = el("div", "field");
    var toggleLabel = el("label");
    var toggle = el("input");
    toggle.type = "checkbox";
    toggle.checked = state.usePoints;
    toggle.style.width = "auto";
    toggle.style.marginRight = "8px";
    toggle.addEventListener("change", function () {
      state.usePoints = toggle.checked;
      save();
      renderAll();
    });
    toggleLabel.append(toggle, document.createTextNode("Use a points system"));
    toggleWrap.append(toggleLabel);
    wrap.append(toggleWrap);

    if (!state.usePoints) {
      wrap.append(el("div", "counter", "Points, allowance and rewards are hidden — families just tick off chores."));
      return wrap;
    }

    wrap.append(textField("Reward name (optional)", state.reward.name, function (v) {
      state.reward.name = v;
      save();
      renderPreview();
    }));
    wrap.append(textField("Points needed", String(state.reward.points), function (v) {
      state.reward.points = Math.max(1, Number(v) || 1);
      save();
      renderPreview();
    }, "number"));

    var rateField = textField("Allowance per point ($)", String(state.allowanceRate), function (v) {
      state.allowanceRate = Math.max(0, Number(v) || 0);
      save();
      renderPreview();
    }, "number");
    rateField.querySelector("input").step = "0.01";
    wrap.append(rateField);

    if (IS_PRO) {
      var kidRate = textField("This child's rate ($ — blank = default)",
        activeKid().rate === null ? "" : String(activeKid().rate), function (v) {
          activeKid().rate = v.trim() === "" ? null : Math.max(0, Number(v) || 0);
          save();
          renderPreview();
        }, "number");
      kidRate.querySelector("input").step = "0.01";
      wrap.append(kidRate);

      wrap.append(textField("Stars earned so far", String(activeKid().stars), function (v) {
        activeKid().stars = Math.max(0, Number(v) || 0);
        save();
        renderPreview();
      }, "number"));
    }
    return wrap;
  }

  function optionControls() {
    var wrap = el("div");

    var themeWrap = el("div", "field");
    var label = el("label", null, "Colour theme");
    var select = el("select");
    [["sunshine", "Sunshine"], ["ocean", "Ocean"], ["forest", "Forest"], ["candy", "Candy"]].forEach(function (pair) {
      var opt = el("option", null, pair[1]);
      opt.value = pair[0];
      select.append(opt);
    });
    select.value = state.theme;
    select.addEventListener("change", function () {
      state.theme = select.value;
      save();
      renderPreview();
    });
    label.append(select);
    themeWrap.append(label);
    wrap.append(themeWrap);

    var printAllWrap = el("div", "field");
    var checkLabel = el("label");
    var check = el("input");
    check.type = "checkbox";
    check.checked = state.printAll;
    check.style.width = "auto";
    check.style.marginRight = "8px";
    check.addEventListener("change", function () {
      state.printAll = check.checked;
      save();
      renderPreview();
    });
    checkLabel.append(check, document.createTextNode("Print a chart for every child"));
    printAllWrap.append(checkLabel);
    wrap.append(printAllWrap);

    var couponWrap = el("div", "field");
    couponWrap.append(el("label", null, "Reward coupons to print"));
    var couponList = el("div", "coupon-list");
    state.coupons.forEach(function (c) {
      var line = el("label");
      var cb = el("input");
      cb.type = "checkbox";
      cb.checked = c.on;
      cb.style.width = "auto";
      cb.style.marginRight = "8px";
      cb.addEventListener("change", function () {
        c.on = cb.checked;
        save();
        renderCoupons();
      });
      line.append(cb, document.createTextNode(c.text));
      couponList.append(line);
    });
    couponWrap.append(couponList);
    var couponRow = el("div", "row");
    var couponInput = el("input");
    couponInput.type = "text";
    couponInput.placeholder = "Add a reward...";
    couponRow.append(couponInput);
    couponRow.append(button("Add", "btn-small", function () {
      var text = couponInput.value.trim();
      if (!text || state.coupons.length >= 12) return;
      state.coupons.push({ id: uid(), text: text, on: true });
      save();
      renderAll();
    }));
    couponWrap.append(couponRow);
    wrap.append(couponWrap);

    wrap.append(selectField("Language / Idioma", [["en", "English"], ["es", "Español"]], state.language, function (v) {
      state.language = v;
      save();
      renderAll();
    }));
    wrap.append(selectField("Paper size", [["letter", "US Letter"], ["a4", "A4"]], state.printSize, function (v) {
      state.printSize = v;
      save();
      updatePrintStyle();
    }));
    wrap.append(selectField("Orientation", [["portrait", "Portrait"], ["landscape", "Landscape"]], state.orientation, function (v) {
      state.orientation = v;
      save();
      updatePrintStyle();
    }));

    var priceWrap = el("div", "field");
    priceWrap.append(el("label", null, "Reward shop prices (points)"));
    state.coupons.forEach(function (c) {
      var line = el("div", "row");
      line.append(el("span", "coupon-price-name", c.text));
      var cost = el("input");
      cost.type = "number";
      cost.min = "1";
      cost.value = String(c.cost);
      cost.addEventListener("input", function () { c.cost = Math.max(1, Number(cost.value) || 1); save(); renderShop(); });
      line.append(cost);
      priceWrap.append(line);
    });
    wrap.append(priceWrap);

    var routineWrap = el("div", "field");
    routineWrap.append(el("label", null, "Morning & bedtime routines"));
    ["morning", "bedtime"].forEach(function (key) {
      var sub = el("div", "routine-block");
      sub.append(el("div", "preset-title", key === "morning" ? "☀️ Morning" : "🌙 Bedtime"));
      var list = el("div", "routine-list");
      state.routines[key].forEach(function (item, idx) {
        var line = el("div", "row");
        var inp = el("input");
        inp.type = "text";
        inp.value = item;
        inp.addEventListener("input", function () {
          state.routines[key][idx] = inp.value;
          save();
          renderRoutines();
        });
        line.append(inp);
        line.append(button("✕", "btn-small btn-danger", function () {
          state.routines[key].splice(idx, 1);
          save();
          renderAll();
        }));
        list.append(line);
      });
      sub.append(list);
      var addRow = el("div", "row");
      var newInp = el("input");
      newInp.type = "text";
      newInp.placeholder = "Add a step...";
      addRow.append(newInp);
      addRow.append(button("+", "btn-small", function () {
        var v = newInp.value.trim();
        if (!v || state.routines[key].length >= 20) return;
        state.routines[key].push(v);
        save();
        renderAll();
      }));
      sub.append(addRow);
      routineWrap.append(sub);
    });
    wrap.append(routineWrap);

    var dataRow = el("div", "row");
    dataRow.append(button("⬇ Export data", "btn-small", function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = "chorechart-data.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }));
    var fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          state = normalize(JSON.parse(String(reader.result)));
          save();
          renderAll();
          window.alert("Chart data imported.");
        } catch (e) {
          window.alert("That file could not be read as ChoreChart data.");
        }
      };
      reader.readAsText(file);
      fileInput.value = "";
    });
    dataRow.append(fileInput);
    dataRow.append(button("⬆ Import data", "btn-small", function () { fileInput.click(); }));
    wrap.append(dataRow);

    return wrap;
  }

  // ---------- Extra printable sheets and panels (Pro) ----------
  function updatePrintStyle() {
    var style = document.getElementById("printStyle");
    if (style) {
      style.textContent = "@media print { @page { size: " + state.printSize + " " + state.orientation + "; margin: 0.5in; } }";
    }
  }

  function renderRoutines() {
    var root = document.getElementById("routineSheet");
    if (!root || !IS_PRO) return;
    root.replaceChildren();
    var head = el("div", "coupon-head");
    head.append(el("h2", null, "Daily Routines"));
    head.append(el("div", "coupon-sub", "Tick each step as it happens."));
    root.append(head);

    [["morning", "☀️ Morning"], ["bedtime", "🌙 Bedtime"]].forEach(function (pair) {
      var block = el("div", "routine-sheet");
      block.append(el("h3", null, pair[1]));
      var table = el("table", "chart-table routine-table");
      state.routines[pair[0]].forEach(function (item) {
        var row = el("tr");
        row.append(el("td", "chore-cell", item));
        row.append(el("td", "routine-box", "☐"));
        row.append(el("td", "routine-box", "☐"));
        row.append(el("td", "routine-box", "☐"));
        row.append(el("td", "routine-box", "☐"));
        row.append(el("td", "routine-box", "☐"));
        table.append(row);
      });
      block.append(table);
      root.append(block);
    });
  }

  function renderShop() {
    var root = document.getElementById("rewardShop");
    if (!root || !IS_PRO) return;
    root.replaceChildren();
    var kid = activeKid();
    var head = el("div", "shop-head");
    head.append(el("span", "shop-title", "🎁 Reward Shop"));
    head.append(el("span", "shop-balance", "💎 " + pointsBalance(kid) + " points"));
    root.append(head);

    var grid = el("div", "shop-grid");
    state.coupons.filter(function (c) { return c.on; }).forEach(function (c) {
      var item = el("div", "shop-item");
      item.append(el("div", "shop-name", c.text));
      item.append(el("div", "shop-cost", c.cost + " pts"));
      var owned = (kid.claimed && kid.claimed[c.id]) > 0;
      var buy = button(owned ? "✅ Owned" : "Buy", "btn-small", function () {
        if (pointsBalance(kid) < c.cost) {
          window.alert("You need " + (c.cost - pointsBalance(kid)) + " more points for " + c.text + ".");
          return;
        }
        if (!kid.claimed) kid.claimed = {};
        kid.spentPoints = (kid.spentPoints || 0) + c.cost;
        kid.claimed[c.id] = (kid.claimed[c.id] || 0) + 1;
        save();
        renderAll();
      });
      if (owned) buy.disabled = true;
      item.append(buy);
      grid.append(item);
    });
    root.append(grid);
  }

  function renderBadges() {
    var root = document.getElementById("badgeShelf");
    if (!root || !IS_PRO) return;
    root.replaceChildren();
    root.append(el("div", "badge-head", "🏆 Badge shelf"));
    var grid = el("div", "badge-grid");
    badgesFor(activeKid()).forEach(function (b) {
      var item = el("div", "badge" + (b.on ? " on" : ""));
      item.title = b.hint;
      item.append(el("span", "badge-emoji", b.on ? b.emoji : "🔒"));
      item.append(el("span", "badge-name", b.name));
      grid.append(item);
    });
    root.append(grid);
  }

  // ---------- Printable reward coupon sheet (Pro) ----------
  function renderCoupons() {
    var root = document.getElementById("couponSheet");
    if (!root || !IS_PRO) return;
    root.replaceChildren();

    var head = el("div", "coupon-head");
    head.append(el("h2", null, "Reward Coupons"));
    head.append(el("div", "coupon-sub", "Cut out and hand out when earned."));
    root.append(head);

    var grid = el("div", "coupon-grid");
    state.coupons.filter(function (c) { return c.on; }).forEach(function (c) {
      var ticket = el("div", "coupon");
      ticket.append(el("div", "coupon-text", c.text));
      ticket.append(el("div", "coupon-foot", "✂  redeemed: ____________"));
      grid.append(ticket);
    });
    if (!grid.children.length) {
      grid.append(el("div", "counter", "No coupons selected — choose some in Options & data."));
    }
    root.append(grid);

    var stars = el("div", "sticker-sheet");
    stars.append(el("h2", null, "⭐ Star Chart"));
    var starGrid = el("div", "star-grid");
    for (var i = 0; i < 30; i++) starGrid.append(el("span", "star", "☆"));
    stars.append(starGrid);
    stars.append(el("div", "coupon-foot", "Goal: ____________________   Reward: ____________________"));
    root.append(stars);
  }

  // ---------- Preview ----------
  function buildChart(kid) {
    var chart = el("div", "chart");
    chart.dataset.theme = state.theme;

    var head = el("div", "chart-head");
    head.append(el("h2", "chart-title", possessive(kid.name) + " " + t("Chore Chart")));
    head.append(el("div", "chart-week", t("Week of") + " " + prettyDate(state.weekStart)));
    chart.append(head);

    var table = el("table", "chart-table");
    var thead = el("thead");
    var headRow = el("tr");
    headRow.append(el("th", "col-chore", t("Chore")));
    if (state.usePoints) headRow.append(el("th", "col-points", t("Points")));
    DAYS.forEach(function (d) { headRow.append(el("th", "col-day", t(d))); });
    thead.append(headRow);
    table.append(thead);

    var tbody = el("tbody");
    kid.chores.forEach(function (c) {
      var row = el("tr");
      row.append(el("td", "chore-cell", (IS_PRO && c.icon ? c.icon + " " : "") + c.name));
      if (state.usePoints) row.append(el("td", "pts-cell", String(c.points)));
      for (var i = 0; i < 7; i++) {
        var cell = el("td");
        if (c.days[i]) {
          let key = doneKey(c.id, i);
          let isDone = !!(kid.completed && kid.completed[key]);
          let box = el("button", "check-box" + (isDone ? " done" : ""), isDone ? "✓" : "");
          box.type = "button";
          box.title = DAYS[i] + (isDone ? " — done, click to undo" : " — click to mark done");
          box.setAttribute("aria-label", c.name + " " + DAYS[i] + (isDone ? " done" : " not done"));
          box.setAttribute("aria-pressed", isDone ? "true" : "false");
          box.addEventListener("click", function () {
            if (!kid.completed) kid.completed = {};
            if (kid.completed[key]) delete kid.completed[key];
            else kid.completed[key] = true;
            recomputePerfectDays(kid);
            save();
            renderAll();
          });
          cell.append(box);
        }
        row.append(cell);
      }
      tbody.append(row);
    });
    table.append(tbody);
    chart.append(table);

    var progress = weekProgress(kid);
    var bar = el("div", "chart-progress");
    bar.append(el("span", null, progress.done + " / " + progress.total + " done"));
    var track = el("div", "progress-track");
    var fill = el("div", "progress-fill");
    fill.style.width = (progress.total ? Math.round((progress.done / progress.total) * 100) : 0) + "%";
    track.append(fill);
    bar.append(track);
    chart.append(bar);

    if (state.usePoints && rateFor(kid) > 0) {
      var rate = rateFor(kid);
      var possible = possiblePoints(kid);
      var allowance = el("div", "chart-allowance");
      allowance.append(el("span", null, "💵 " + t("If all done") + ": " + possible + " pts = " + money(possible * rate)));
      if (IS_PRO) {
        allowance.append(el("span", "allowance-detail",
          money(rate) + "/pt · 4-week estimate " + money(possible * rate * 4)));
      }
      allowance.append(el("span", "allowance-earned", t("Earned") + ": ______ pts = $ ______"));
      chart.append(allowance);
    }

    if (state.usePoints && state.reward.name) {
      var reward = el("div", "chart-reward");
      reward.append(el("span", null, "⭐ " + t("Working toward") + ": " + state.reward.name + " (" + state.reward.points + " pts)"));

      if (IS_PRO) {
        var track = el("div", "progress-track");
        var fill = el("div", "progress-fill");
        var pct = Math.min(100, Math.round((kid.stars / state.reward.points) * 100));
        fill.style.width = pct + "%";
        track.append(fill);
        reward.append(track);
        reward.append(el("span", null, kid.stars + " / " + state.reward.points));
      }
      chart.append(reward);
    }

    chart.append(el("div", "chart-sign", t("Signed:") + " ________________________________"));
    return chart;
  }

  function buildCreatureCard(kid) {
    var c = creatureFor(kid);
    var card = el("div", "creature-card");
    card.dataset.stage = c.stage.name.toLowerCase().replace(/\s+/g, "-");

    card.append(el("div", "creature-art", c.stage.emoji));
    var info = el("div", "creature-info");

    var title = el("div", "creature-title", (kid.creatureName || "Chore Pal") + " · " + c.stage.name);
    title.append(el("span", "creature-level", "Lv " + c.level));
    info.append(title);
    info.append(el("div", "creature-hint", c.stage.hint));

    var xpTrack = el("div", "xp-track");
    var xpFill = el("div", "xp-fill");
    xpFill.style.width = c.xpInto + "%";
    xpTrack.append(xpFill);
    info.append(xpTrack);

    var meta = "🔥 " + c.streak + " day streak · 💎 " + c.earned + " points · " + c.xp + " XP";
    if (c.boost) meta += " · +" + c.boost + " evolution days from points";
    if (c.next) meta += " · evolves in " + c.toNext + " perfect day" + (c.toNext === 1 ? "" : "s");
    info.append(el("div", "creature-meta", meta));

    card.append(info);
    return card;
  }

  function renderPreview() {
    var root = document.getElementById("preview");
    root.replaceChildren();
    var kids = (IS_PRO && state.printAll) ? state.kids : [activeKid()];
    kids.forEach(function (kid) {
      recomputePerfectDays(kid);
      root.append(buildCreatureCard(kid));
      root.append(buildChart(kid));
    });
  }

  function renderAll() {
    updatePrintStyle();
    renderControls();
    renderPreview();
    renderCoupons();
    renderRoutines();
    renderShop();
    renderBadges();
  }

  // ---------- Wire up ----------
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
  renderAll();
})();
