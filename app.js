/* ChoreChart — single-file friendly, no dependencies.
   The Pro build sets window.CHORCHART_PRO = true before this file runs. */
(function () {
  "use strict";

  // ---- Replace this with your own Gumroad URL before publishing ----
  var GUMROAD_URL = "https://gumroad.com/l/chorechart-pro";

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
      coupons: DEFAULT_COUPONS.map(function (text) { return { id: uid(), text: text, on: true }; }),
      reward: { name: "", points: 10 },
      activeKid: 0,
      printAll: false,
      kids: [{ id: uid(), name: "My Champs", stars: 0, rate: null, chores: defaultChores() }]
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
      coupons: Array.isArray(raw.coupons)
        ? raw.coupons.slice(0, 12).map(function (c) {
            return { id: uid(), text: typeof c.text === "string" ? c.text : "Reward", on: c.on !== false };
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
          points: Math.max(1, Math.min(99, Number(c.points) || 1)),
          icon: typeof c.icon === "string" ? c.icon.slice(0, 8) : "",
          days: days.map(Boolean)
        };
      });
      if (!IS_PRO) chores = chores.slice(0, FREE_CHORE_LIMIT);
      var rate = k && k.rate !== null && k.rate !== undefined && k.rate !== ""
        ? Math.max(0, Number(k.rate) || 0)
        : null;
      out.kids.push({
        id: uid(),
        name: k && typeof k.name === "string" ? k.name : "My Champs",
        stars: Math.max(0, Number(k && k.stars) || 0),
        rate: rate,
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
    if (!state.kids.length) state.kids.push({ id: uid(), name: "My Champs", stars: 0, rate: null, chores: [] });
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
    if (IS_PRO) {
      var couponBtn = button("🎟️ Print reward coupons", "btn-block", function () {
        document.body.classList.add("coupons-only");
        window.print();
        setTimeout(function () { document.body.classList.remove("coupons-only"); }, 1200);
      });
      couponBtn.style.marginTop = "8px";
      actions.append(couponBtn);
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
        state.kids.push({ id: uid(), name: "Child " + (state.kids.length + 1), stars: 0, rate: null, chores: [] });
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
    ptsInput.max = "99";
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
        points: Math.max(1, Math.min(99, Number(ptsInput.value) || 1)),
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
    head.append(el("h2", "chart-title", possessive(kid.name) + " Chore Chart"));
    head.append(el("div", "chart-week", "Week of " + prettyDate(state.weekStart)));
    chart.append(head);

    var table = el("table", "chart-table");
    var thead = el("thead");
    var headRow = el("tr");
    headRow.append(el("th", "col-chore", "Chore"));
    if (state.usePoints) headRow.append(el("th", "col-points", "Points"));
    DAYS.forEach(function (d) { headRow.append(el("th", "col-day", d)); });
    thead.append(headRow);
    table.append(thead);

    var tbody = el("tbody");
    kid.chores.forEach(function (c) {
      var row = el("tr");
      row.append(el("td", "chore-cell", (IS_PRO && c.icon ? c.icon + " " : "") + c.name));
      if (state.usePoints) row.append(el("td", "pts-cell", String(c.points)));
      for (var i = 0; i < 7; i++) {
        var cell = el("td");
        if (c.days[i]) cell.append(el("span", "tick"));
        row.append(cell);
      }
      tbody.append(row);
    });
    table.append(tbody);
    chart.append(table);

    if (state.usePoints && rateFor(kid) > 0) {
      var rate = rateFor(kid);
      var possible = possiblePoints(kid);
      var allowance = el("div", "chart-allowance");
      allowance.append(el("span", null, "💵 If all done: " + possible + " pts = " + money(possible * rate)));
      if (IS_PRO) {
        allowance.append(el("span", "allowance-detail",
          money(rate) + "/pt · 4-week estimate " + money(possible * rate * 4)));
      }
      allowance.append(el("span", "allowance-earned", "Earned: ______ pts = $ ______"));
      chart.append(allowance);
    }

    if (state.usePoints && state.reward.name) {
      var reward = el("div", "chart-reward");
      reward.append(el("span", null, "⭐ Working toward: " + state.reward.name + " (" + state.reward.points + " pts)"));

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

    chart.append(el("div", "chart-sign", "Signed: ________________________________"));
    return chart;
  }

  function renderPreview() {
    var root = document.getElementById("preview");
    root.replaceChildren();
    var kids = (IS_PRO && state.printAll) ? state.kids : [activeKid()];
    kids.forEach(function (kid) { root.append(buildChart(kid)); });
  }

  function renderAll() {
    renderControls();
    renderPreview();
    renderCoupons();
  }

  // ---------- Wire up ----------
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
  renderAll();
})();
