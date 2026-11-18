(() => {
  const storageKey = "campus-stores.shift.v2";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
      collector: "Kabir Sen",
      auth: "Isha Rao asked for the kit to be issued to Kabir Sen · Desk book, Fri 3:20 pm",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
      collector: "Tara Shah",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
      collector: "Dev Menon",
    },
  ];
  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];
  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];
  // Desk clock and due times as minutes from Friday 00:00, so "overdue" can be derived.
  const shifts = [
    {
      time: "Friday · 3:45 pm",
      now: 945,
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      now: 1170,
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      now: 1980,
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];
  const T = { "Fri 8 pm": 1200, "Sat 9 am": 1980, "Sat 10 am": 2040, "Sat noon": 2160 };
  const pages = [
    ["Kits", "clipboard-list"],
    ["Inventory", "package"],
    ["Register", "book-open"],
    ["Desk book", "messages-square"],
    ["Evaluation", "flask-conical"],
  ];
  const original = () => ({
    version: 2,
    tab: "Kits",
    phase: 0,
    filter: "All items",
    onlyOpen: true,
    form: null,
    err: "",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        holder: "Tara Shah",
        due: "Sat 10 am",
        promise: "",
        back: false,
      },
    ],
    notes: [],
    notice: "Sample shift · All records are fictional.",
  });
  let s = original();
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const norm = (x) => String(x).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const esc = (x) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const btn = (label, act, val = "", style = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '">' +
    esc(label) +
    "</button>";
  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    esc(title) +
    "</h2><small>" +
    esc(sub) +
    "</small></div>" +
    control +
    "</div>";
  const row = (labelHtml, sub, right) =>
    '<div class="row"><div class="rowmain">' +
    labelHtml +
    "<small>" +
    esc(sub) +
    "</small></div><div class=\"rowside\">" +
    right +
    "</div></div>";
  const badge = (t, kind = "") =>
    '<span class="st ' + kind + '">' + esc(t) + "</span>";
  // Decorative barcode derived from the tag, echoing the label on the physical unit.
  const bars = (id) => {
    let x = 0,
      r = "";
    for (const c of id + id) {
      const n = c.charCodeAt(0);
      for (let b = 0; b < 3; b++) {
        const w = 1 + ((n >> b) & 1) + ((n >> (b + 3)) & 1);
        r += '<rect x="' + x + '" width="' + w + '" height="10"/>';
        x += w + 1 + ((n >> (b + 1)) & 1);
      }
    }
    return (
      '<svg class="bars" viewBox="0 0 ' +
      x +
      ' 10" preserveAspectRatio="none" aria-hidden="true">' +
      r +
      "</svg>"
    );
  };
  const tag = (id, big = false) =>
    '<span class="atag' +
    (big ? " big" : "") +
    '"><b>' +
    esc(id) +
    "</b>" +
    (big ? bars(id) : "") +
    "</span>";
  function status(l) {
    if (l.back) return ["Returned", "ok"];
    const by = l.promise || l.due;
    if (shifts[s.phase].now > T[by]) return ["Overdue · due " + by, "bad"];
    if (l.promise) return ["Promised " + l.promise, "warn"];
    return ["Due " + l.due, ""];
  }
  const select = (label, name, options, value = "", cls = "") =>
    '<label class="' +
    cls +
    '"><span>' +
    esc(label) +
    '</span><select name="' +
    esc(name) +
    '" required><option value="">Select…</option>' +
    options
      .map(
        ([v, t, off]) =>
          '<option value="' +
          esc(v) +
          '"' +
          (v === value ? " selected" : "") +
          (off ? " disabled" : "") +
          ">" +
          esc(t) +
          "</option>",
      )
      .join("") +
    "</select></label>";
  const errLine = () =>
    s.err ? '<p class="formerr" role="alert">' + esc(s.err) + "</p>" : "";

  function carry() {
    const open = s.loans.filter((l) => !l.back);
    if (!open.length) return "";
    const title =
      s.phase === 2 ? "Carried over from last shift" : "Out of the desk right now";
    return (
      '<div class="carryhead"><b>' +
      esc(title) +
      "</b><small>" +
      open.length +
      (open.length === 1 ? " unit" : " units") +
      " not back</small>" +
      (s.phase === 1 ? btn("Draft handover", "draft", "", "primary") : "") +
      "</div><ul>" +
      open
        .map((l) => {
          const a = getAsset(l.asset);
          const [t, k] = status(l);
          return (
            "<li>" +
            tag(l.asset) +
            "<span><strong>" +
            esc(a.type) +
            "</strong><small>" +
            esc(a.model + " · " + l.req + " · with " + l.holder) +
            "</small></span>" +
            badge(t, k) +
            btn("Check in", "checkin", l.req) +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  let fresh = ""; // kit that was completed by the last action, so its stamp lands once
  function kitCard(r) {
    const loans = s.loans.filter((l) => l.req === r.id);
    const open = loans.filter((l) => !l.back);
    const lineFor = (type) =>
      loans.filter((l) => getAsset(l.asset).type === type).pop();
    const unissued = r.items.filter((t) => !lineFor(t));
    const complete =
      loans.length && r.items.every((t) => lineFor(t) && lineFor(t).back);
    const form = s.form && s.form.req === r.id ? s.form.kind : "";
    let html =
      '<article class="kit' +
      (complete ? " done" : "") +
      '"><header><div><small>' +
      esc(r.id + " · Approved · Filed by " + r.owner) +
      "</small><h3>" +
      esc(r.club) +
      " <span>" +
      esc(r.event) +
      "</span></h3></div><div class=\"kitdue\"><small>Return by</small><b>" +
      esc(r.due) +
      "</b></div>" +
      (complete
        ? '<span class="stamp' + (fresh === r.id ? " fresh" : "") + '" aria-label="Kit complete">Complete</span>'
        : "") +
      "</header>";
    if (r.auth && !loans.length)
      html += '<p class="auth">' + esc(r.auth) + "</p>";
    html +=
      '<ul class="lines">' +
      r.items
        .map((type) => {
          const l = lineFor(type);
          if (!l)
            return (
              '<li><span class="atag empty"><b>— —</b></span><span><strong>' +
              esc(type) +
              "</strong><small>" +
              esc(r.note) +
              "</small></span>" +
              badge("Not issued") +
              "</li>"
            );
          const a = getAsset(l.asset);
          const [t, k] = status(l);
          return (
            "<li>" +
            tag(l.asset, true) +
            "<span><strong>" +
            esc(type) +
            "</strong><small>" +
            esc(
              a.model +
                " · bin " +
                a.bin +
                (l.back
                  ? ""
                  : " · with " +
                    l.holder +
                    (l.holder !== l.who ? " (collected by " + l.who + ")" : "")),
            ) +
            "</small></span>" +
            badge(t, k) +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
    if (form === "issue") html += issueForm(r, unissued);
    else if (form === "checkin") html += checkinForm(r, open);
    else if (unissued.length || open.length)
      html +=
        '<div class="kitactions">' +
        (unissued.length ? btn("Issue kit", "issue", r.id, "primary") : "") +
        (open.length ? btn("Check in", "checkin", r.id, "primary") : "") +
        "</div>";
    return html + "</article>";
  }

  function issueForm(r, types) {
    return (
      '<form class="kitform" data-issue data-req="' +
      esc(r.id) +
      '"><div class="form">' +
      select("Collected by", "who", people.map((p) => [p, p]), r.collector) +
      select("Return by", "due", Object.keys(T).map((d) => [d, d]), r.due) +
      types
        .map((type, i) =>
          select(
            type,
            "unit" + i,
            assets
              .filter((a) => a.type === type)
              .map((a) => [
                a.id,
                a.id +
                  " · " +
                  a.model +
                  (a.repair
                    ? " · in repair"
                    : out(a.id)
                      ? " · on loan"
                      : " · bin " + a.bin),
                a.repair || out(a.id),
              ]),
            "",
            "full",
          ),
        )
        .join("") +
      "</div>" +
      errLine() +
      '<div class="kitactions"><button type="submit" class="primary">Issue ' +
      types.length +
      (types.length === 1 ? " unit" : " units") +
      "</button>" +
      btn("Cancel", "cancel") +
      "</div></form>"
    );
  }

  // --- Message reader (extract.js): borrower's words -> proposed check-in, with evidence ---
  let lastRead = null;
  const kabirMsg =
    "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.";
  function readCtx(open) {
    return {
      day: s.phase < 2 ? "Fri" : "Sat",
      hour: shifts[s.phase].now / 60 - (s.phase < 2 ? 0 : 24),
      people,
      slots: Object.keys(T),
      open: open.map((l) => ({ tag: l.asset, type: getAsset(l.asset).type, holder: l.holder })),
    };
  }
  function readingHtml(msg, open) {
    lastRead = null;
    if (!msg.trim())
      return '<p class="hint">Type what the borrower said. The reader marks what came back, who has the rest, and when.</p>';
    const res = Extract.read(msg, readCtx(open));
    lastRead = res;
    const name = (t) => t + " " + getAsset(t).type;
    let h = '<p class="evmsg">' + Extract.highlight(msg, res.spans, esc) + "</p>";
    h +=
      '<p class="legend"><mark class="ev returned">came back</mark><mark class="ev out">still out</mark><mark class="ev holder">who has it</mark><mark class="ev time">when</mark></p><ul class="proposal">';
    if (res.returned.length)
      h += "<li><b>Came back</b> " + esc(res.returned.map(name).join(", ")) + " <small>· type their tags from the labels</small></li>";
    for (const o of res.out)
      h +=
        "<li><b>Still out</b> " +
        esc(name(o.tag) + " · with " + (o.holder || "?") + " · " + (o.promise ? "promised " + o.promise : "no time")) +
        "</li>";
    h += "</ul>";
    if (res.questions.length)
      h += '<ul class="checks">' + res.questions.map((x) => '<li class="check warn">Ask: ' + esc(x) + "</li>").join("") + "</ul>";
    else h += '<p class="check ok">Every unit on this kit is accounted for in the message.</p>';
    if (res.out.length) h += btn("Fill in who has it and when", "apply");
    return h;
  }

  function checkinForm(r, open) {
    const holders = open.map((l) => l.holder);
    const msg = r.id === "RQ-214" && s.phase === 1 ? kabirMsg : "";
    return (
      '<form class="kitform" data-checkin data-req="' +
      esc(r.id) +
      '"><div class="assist"><div class="assisthead"><b>Read the borrower’s message</b><small>Runs in your browser · no AI key · it never fills the tag box: the label check stays with you</small></div>' +
      '<textarea data-msg rows="2" aria-label="Borrower message">' +
      esc(msg) +
      '</textarea><div data-reading aria-live="polite">' +
      readingHtml(msg, open) +
      '</div></div><div class="form"><label class="full"><span>Tags on the units in your hand</span><input name="tags" autocomplete="off" spellcheck="false" placeholder="Read the label on each unit, e.g. ' +
      esc(open[0].asset) +
      '" /></label><p class="hint full">Still out on ' +
      esc(r.id) +
      ": " +
      open
        .map((l) => {
          const a = getAsset(l.asset);
          return esc(l.asset + " " + a.model);
        })
        .join(" · ") +
      '</p><fieldset class="full"><legend>Anything not handed back?</legend><div class="form">' +
      '<label><span>Who has it now</span><select name="holder"><option value="">Stays with ' +
      esc(holders[0]) +
      "</option>" +
      people
        .filter((p) => !holders.includes(p))
        .map((p) => '<option value="' + esc(p) + '">' + esc(p) + "</option>")
        .join("") +
      '</select></label><label><span>Promised back</span><select name="promise"><option value="">Not promised</option>' +
      Object.keys(T)
        .filter((d) => T[d] > shifts[s.phase].now - 1)
        .map((d) => '<option value="' + esc(d) + '">' + esc(d) + "</option>")
        .join("") +
      "</select></label></div></fieldset></div>" +
      errLine() +
      '<div class="kitactions"><button type="submit" class="primary">Record check-in</button>' +
      btn("Cancel", "cancel") +
      "</div></form>"
    );
  }

  function kits() {
    return (
      head("Kits", "Approved requests · one card per club booking") +
      requests.map(kitCard).join("")
    );
  }
  function inventory() {
    let html = head("Inventory", "Physical units · home shelf and current availability");
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      ["All items", "On shelf", "On loan", "In repair"]
        .map((f) => '<option value="' + f + '">' + f + "</option>")
        .join("") +
      "</select></label></div>";
    for (const a of assets) {
      const l = out(a.id);
      const st = a.repair ? "In repair" : l ? "On loan" : "On shelf";
      if (s.filter !== "All items" && s.filter !== st) continue;
      html += row(
        tag(a.id) + "<strong>" + esc(a.type) + "</strong>",
        a.model + " · bin " + a.bin + (l ? " · with " + l.holder : ""),
        badge(st, st === "On shelf" ? "ok" : st === "In repair" ? "bad" : ""),
      );
    }
    return html;
  }
  function register() {
    let html = head("Register", "One slip per physical unit · returns are checked in from Kits");
    html +=
      '<div class="buttons">' +
      ["Outstanding", "All slips"]
        .map(
          (v, i) =>
            '<button type="button" data-action="scope" data-val="' +
            i +
            '" aria-pressed="' +
            (s.onlyOpen === (i === 0)) +
            '">' +
            v +
            "</button>",
        )
        .join("") +
      "</div>";
    const shown = s.loans.filter((l) => !s.onlyOpen || !l.back).slice().reverse();
    if (!shown.length) html += "<p>No outstanding slips.</p>";
    for (const l of shown) {
      const a = getAsset(l.asset);
      const [t, k] = status(l);
      html += row(
        tag(l.asset) + "<strong>" + esc(a.type) + "</strong>",
        "L-" +
          l.num +
          " · " +
          l.req +
          " · " +
          getReq(l.req).club +
          " · collected by " +
          l.who +
          (l.holder !== l.who && !l.back ? " · now with " + l.holder : ""),
        badge(t, k),
      );
    }
    return html;
  }
  // --- AI-drafted shift handover (see handover.js) ---
  const keyStore = "campus-stores.anthropic-key";
  const getKey = () => {
    try {
      return localStorage.getItem(keyStore) || "";
    } catch {
      return "";
    }
  };
  let ho = null; // current draft: {text, by} or {busy: true}; not persisted
  function facts() {
    const now = shifts[s.phase].now;
    const unit = (l) => {
      const a = getAsset(l.asset);
      return {
        tag: l.asset,
        type: a.type,
        model: a.model,
        req: l.req,
        club: getReq(l.req).club,
        holder: l.holder,
        collected_by: l.who,
        due: l.due,
        promise: l.promise || "",
        overdue: !l.back && now > T[l.promise || l.due],
      };
    };
    return {
      now: shifts[s.phase].time,
      open: s.loans.filter((l) => !l.back).map(unit),
      returned: s.loans.filter((l) => l.back && l.backAt === s.phase).map(unit),
      assets,
    };
  }
  const issues = () => (ho && ho.text ? Handover.check(ho.text, facts()) : []);
  function checksHtml() {
    const list = issues();
    if (!list.length)
      return '<p class="check ok">Checked against the records: every unit still out is listed with its holder and time.</p>';
    return (
      '<ul class="checks">' +
      list
        .map((i) => '<li class="check ' + i.level + '">' + (i.level === "error" ? "Fix: " : "Check: ") + esc(i.msg) + "</li>")
        .join("") +
      "</ul>"
    );
  }
  function handoverPanel() {
    const key = getKey();
    let h =
      '<section class="handover"><div class="sectionhead"><div><h3>Shift handover</h3><small>' +
      "Drafted from the desk records for you to check, then saved to the desk book.</small></div>" +
      (ho ? "" : btn("Draft handover", "draft", "", "primary")) +
      "</div>";
    if (ho && ho.busy) return h + '<p class="hint">Drafting with Claude…</p></section>';
    if (ho)
      return (
        h +
        '<form data-handover><p class="hint">Drafted by ' +
        esc(ho.by) +
        '</p><textarea name="handtext" rows="6" aria-label="Handover draft">' +
        esc(ho.text) +
        '</textarea><div data-checks aria-live="polite">' +
        checksHtml() +
        '</div><div class="kitactions"><button type="submit" class="primary"' +
        (issues().some((i) => i.level === "error") ? " disabled" : "") +
        ">Save handover</button>" +
        btn("Discard", "discard") +
        "</div></form></section>"
      );
    return (
      h +
      '<details class="aikey"><summary>' +
      (key ? "Drafting with Claude (your key)" : "Draft with Claude (optional, your own API key)") +
      "</summary>" +
      (key
        ? "<p>Your Anthropic key is stored in this browser only. " + btn("Forget key", "forgetkey") + "</p>"
        : '<p>Without a key, a built-in template drafts the handover. A key is kept in this browser only, never in the repository.</p><div class="buttons"><input type="password" data-key placeholder="sk-ant-…" autocomplete="off" aria-label="Anthropic API key" />' +
          btn("Use key", "setkey") +
          "</div>") +
      "</details></section>"
    );
  }
  async function draftHandover() {
    const f = facts();
    const local = () => Handover.toText(Handover.ruleDraft(f));
    const key = getKey();
    if (!key) ho = { text: local(), by: "the built-in template (no AI key set)" };
    else {
      ho = { busy: true };
      paint();
      try {
        const r = await Handover.claudeDraft(f, key);
        ho = {
          text: Handover.toText(r.draft),
          by: "Claude (" + r.model + ") · " + (r.ms / 1000).toFixed(1) + " s · $" + r.cost.toFixed(4),
        };
      } catch (err) {
        ho = { text: local(), by: "the built-in template. Claude failed: " + err.message };
      }
    }
    paint();
  }

  function deskbook() {
    let html = head("Desk book", "Messages from clubs and notes for the next shift");
    html += handoverPanel();
    const entries = [
      [
        "Friday · 3:20 pm",
        "Isha Rao · Film Society",
        "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
      ],
      [
        "Friday · 3:30 pm",
        "Tara Shah · Debate Union",
        "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
      ],
    ];
    if (s.phase >= 1)
      entries.push([
        "Friday · 7:30 pm",
        "Kabir Sen · Film Society",
        "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
      ]);
    for (const n of s.notes)
      entries.push([
        shifts[n.phase].time,
        n.auto
          ? "Desk record · " + n.req + " check-in"
          : n.kind === "handover"
            ? "Shift handover · checked against records"
            : "Counter handover",
        n.text,
        n.auto,
      ]);
    for (const [t, author, body, auto] of entries.slice().reverse())
      html +=
        '<article class="record' +
        (auto ? " auto" : "") +
        '"><small>' +
        esc(t) +
        "</small><h3>" +
        esc(author) +
        "</h3><p>" +
        esc(body) +
        "</p></article>";
    return (
      html +
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required></textarea></label></div><button type="submit">Add handover note</button></form>'
    );
  }
  // --- Ask the desk (ask.js): grounded answers from the records, with sources ---
  let askQ = "";
  const askChips = ["Where is the adapter?", "What's overdue?", "What does Leela have?", "Is a projector free?", "Film Society?"];
  function askData() {
    const now = shifts[s.phase].now;
    return {
      now: shifts[s.phase].time,
      people,
      requests,
      assets,
      loans: s.loans.map((l) => {
        const a = getAsset(l.asset);
        return {
          ...l,
          tag: l.asset,
          type: a.type,
          model: a.model,
          club: getReq(l.req).club,
          dueAt: T[l.promise || l.due],
          overdue: !l.back && now > T[l.promise || l.due],
        };
      }),
    };
  }
  function answerHtml() {
    const a = Ask.answer(askQ, askData());
    if (!a) return "";
    return (
      '<div class="answer' +
      (a.unsure ? " unsure" : "") +
      '"><small>' +
      esc("“" + askQ + "”") +
      "</small>" +
      a.lines.map((l) => "<p>" + esc(l) + "</p>").join("") +
      (a.sources.length
        ? '<div class="sources"><small>From the records:</small>' +
          a.sources.map((x) => btn(x.label, "tab", x.tab, "src")).join("") +
          "</div>"
        : "") +
      btn("Close", "askclose", "", "askx") +
      "</div>"
    );
  }

  // --- Guided tour: drives the real app through the moments that matter ---
  let tourAt = -1;
  const film = () => s.loans.filter((l) => l.req === "RQ-214");
  function ensureIssued() {
    if (film().length) return;
    let num = Math.max(400, ...s.loans.map((l) => l.num));
    for (const asset of ["PR-04", "SP-02", "AD-12"])
      s.loans.push({ num: ++num, req: "RQ-214", asset, who: "Kabir Sen", holder: "Kabir Sen", due: "Fri 8 pm", promise: "", back: false });
  }
  function ensureCheckedIn() {
    ensureIssued();
    const ad = film().find((l) => l.asset === "AD-12");
    if (ad.holder !== "Kabir Sen" || ad.back) return;
    for (const l of film()) if (l.asset !== "AD-12") Object.assign(l, { back: true, backAt: 1 });
    Object.assign(ad, { holder: "Leela Das", promise: "Sat 9 am" });
    s.notes.push({ phase: 1, auto: true, req: "RQ-214", text: "Returned: PR-04, SP-02. Still out: AD-12 USB-C → HDMI adapter (Belkin AVC002) with Leela Das, promised Sat 9 am." });
  }
  const tour = [
    {
      title: "Campus Stores, redesigned",
      text: "Six stops through one shift, about two minutes. Each stop uses the real app, so you can stop and try it at any point.",
      target: ".mast",
      run() {
        s = original();
        askQ = "";
        ho = null;
      },
    },
    {
      title: "3:45 pm · Issue the whole kit at once",
      text: "One form instead of three slips. The collector comes from Isha’s desk-book message, the return time from the request, and the broken PR-06 is shown but can’t be picked.",
      target: "article.kit",
      run() {
        s.phase = 0;
        s.tab = "Kits";
        s.form = { kind: "issue", req: "RQ-214" };
      },
    },
    {
      title: "7:30 pm · AI reads Kabir’s message",
      text: "The reader highlights what came back, who has the rest and when, and asks when it isn’t sure. Try editing the message. It never fills the tag box: the label in your hand is checked by you.",
      target: ".assist",
      run() {
        ensureIssued();
        s.phase = 1;
        s.tab = "Kits";
        s.form = { kind: "checkin", req: "RQ-214" };
      },
    },
    {
      title: "Handover, drafted and checked",
      text: "The check-in is recorded (AD-12 now with Leela, promised Sat 9 am). The handover is drafted from the records and checked against them, so a missing unit or the wrong holder blocks saving.",
      target: ".handover",
      run() {
        s.phase = 1;
        s.tab = "Kits";
        s.form = { kind: "checkin", req: "RQ-214" };
      },
      after() {
        const f = q("form[data-checkin]");
        if (f && film().find((l) => l.asset === "AD-12").holder === "Kabir Sen") {
          q('[data-action="apply"]').click();
          f.elements.tags.value = "PR-04 SP-02";
          f.requestSubmit();
        }
        s.tab = "Desk book";
        draftHandover();
      },
    },
    {
      title: "9 am · Ask the desk",
      text: "The morning shift sees what carried over before anything else, and can ask in plain words. Answers come only from the records, cite them, and warn that AD-12 and AD-15 look alike.",
      target: ".answer",
      run() {
        ensureCheckedIn();
        s.phase = 2;
        s.tab = "Kits";
        s.form = null;
        ho = null;
        askQ = "Where is the adapter?";
      },
    },
    {
      title: "The wrong adapter is stopped",
      text: "Leela hands over an adapter and its label reads AD-15. The check-in refuses it and names the right unit, AD-12 (Belkin). In the old app one click closed the slip anyway.",
      target: ".formerr",
      run() {
        ensureCheckedIn();
        s.phase = 2;
        askQ = "";
        s.tab = "Kits";
        s.form = { kind: "checkin", req: "RQ-214" };
      },
      after() {
        const f = q("form[data-checkin]");
        if (f) {
          f.elements.tags.value = "AD-15";
          f.requestSubmit();
        }
      },
    },
    {
      title: "Every AI feature is measured",
      text: "This tab re-runs the evaluations each time it opens. One silent error is left in on purpose and explained in the README. Restart the sample shift to try the job yourself.",
      target: ".stats",
      run() {
        s.form = null;
        s.tab = "Evaluation";
      },
    },
  ];
  function tourGo(i) {
    tourAt = i;
    for (const e of root.querySelectorAll(".spot")) e.classList.remove("spot");
    if (i < 0) return paint();
    s.err = "";
    tour[i].run();
    commit();
    if (tour[i].after) tour[i].after(); // after() paints through the app's own actions
    const t = q(tour[i].target);
    if (t) {
      t.classList.add("spot");
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      t.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
  }
  function tourPaint() {
    const el = q("[data-tour]");
    el.hidden = tourAt < 0;
    if (tourAt < 0) return;
    const st = tour[tourAt];
    el.innerHTML =
      "<small>Tour · " +
      (tourAt + 1) +
      " of " +
      tour.length +
      "</small><h3>" +
      esc(st.title) +
      "</h3><p>" +
      esc(st.text) +
      '</p><div class="kitactions">' +
      (tourAt ? btn("Back", "tourprev") : "") +
      btn(tourAt === tour.length - 1 ? "Finish" : "Next", "tournext", "", "primary") +
      btn("Exit", "tourend") +
      "</div>";
  }

  function evaluation() {
    const r = EvalCases.runReader(Extract);
    const c = EvalCases.runChecker(Handover);
    const stat = (n, label, kind) =>
      '<div class="stat ' + kind + '"><b>' + esc(n) + "</b><small>" + esc(label) + "</small></div>";
    let h = head("Evaluation", "Runs live in your browser every time this page opens · same cases as node eval/run.js");
    h +=
      '<section class="evalcard"><h3>Message reader</h3><p class="hint">' +
      r.total +
      " labelled borrower messages for the Film Society kit → proposed check-in. Asking the clerk is safe. <b>Wrong without asking</b> is the number that matters: that's an error that reaches the records unless someone notices.</p>" +
      '<div class="stats">' +
      stat(r.correct + "/" + r.total, "correct", "ok") +
      stat(r.asked, "asked the clerk", "warn") +
      stat(r.wrong, "wrong without asking", r.wrong ? "bad" : "ok") +
      '</div><ul class="evalrows">' +
      r.rows
        .map(
          (x) =>
            '<li><span class="st ' +
            (x.result === "correct" ? "ok" : x.result === "asked" ? "warn" : "bad") +
            '">' +
            esc(x.result) +
            "</span><span><q>" +
            esc(x.msg) +
            "</q>" +
            (x.result === "correct"
              ? x.askedOk
                ? "<small>Rightly asked instead of guessing: " + esc(x.got.replace(/^asked: /, "")) + "</small>"
                : ""
              : "<small>Expected" + esc(x.expected) + "</small><small>Got " + esc(x.got) + "</small>") +
            "</span></li>",
        )
        .join("") +
      "</ul></section>";
    const a = EvalCases.runAsk(Ask);
    h +=
      '<section class="evalcard"><h3>Ask the desk</h3><p class="hint">' +
      a.total +
      " questions at Sat 9 am. A pass needs the right facts, a cited record, and no wrong unit. Off-topic questions and requests to change records must be declined.</p>" +
      '<div class="stats">' +
      stat(a.ok + "/" + a.total, "answered correctly", a.ok === a.total ? "ok" : "bad") +
      '</div><ul class="evalrows">' +
      a.rows
        .map(
          (x) =>
            '<li><span class="st ' + (x.ok ? "ok" : "bad") + '">' + (x.ok ? "pass" : "fail") + "</span><span><q>" + esc(x.q) + "</q><small>" + esc(x.text) + "</small></span></li>",
        )
        .join("") +
      "</ul></section>";
    const kinds = [...new Set(c.rows.map((x) => x.mistake))];
    h +=
      '<section class="evalcard"><h3>Handover checker</h3><p class="hint">Typical drafting mistakes, by a person or a model, planted into correct handovers for ' +
      c.scenarios +
      " shift scenarios. A caught mistake blocks saving.</p>" +
      '<div class="stats">' +
      stat(c.caught + "/" + c.total, "mistakes caught", c.caught === c.total ? "ok" : "bad") +
      stat(c.falseAlarms + "/" + c.scenarios, "false alarms on correct drafts", c.falseAlarms ? "bad" : "ok") +
      '</div><ul class="evalrows">' +
      kinds
        .map((k) => {
          const rows = c.rows.filter((x) => x.mistake === k);
          const n = rows.filter((x) => x.caught).length;
          return (
            '<li><span class="st ' + (n === rows.length ? "ok" : "bad") + '">' + n + "/" + rows.length + "</span><span>" + esc(k) + "</span></li>"
          );
        })
        .join("") +
      "</ul></section>";
    return h;
  }
  const screens = {
    Kits: kits,
    Inventory: inventory,
    Register: register,
    "Desk book": deskbook,
    Evaluation: evaluation,
  };
  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;
    const advance = q('[data-action="advance"]');
    advance.hidden = !phase.next;
    advance.textContent = phase.next || "";
    const c = carry();
    q("[data-carry]").hidden = !c;
    q("[data-carry]").classList.toggle("handover", s.phase === 2);
    q("[data-carry]").innerHTML = c;
    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");
    q("[data-page]").innerHTML = screens[s.tab]();
    fresh = "";
    q("[data-askchips]").innerHTML = askQ ? "" : askChips.map((c) => btn(c, "ask", c, "chip")).join("");
    q("[data-answer]").innerHTML = answerHtml(); // re-answered on every change, so it never goes stale
    tourPaint();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    q("[data-status]").textContent = s.notice;
  }
  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }
  // Theme is a viewer preference, kept apart from the shift so Restart doesn't reset it.
  const themeKey = "campus-stores.theme";
  function setTheme(t) {
    const html = document.documentElement;
    if (t === "light" || t === "dark") html.dataset.theme = t;
    else delete html.dataset.theme;
    for (const b of root.querySelectorAll('[data-action="theme"]'))
      b.setAttribute("aria-pressed", String(b.dataset.val === (html.dataset.theme || "auto")));
  }
  setTheme(document.documentElement.dataset.theme);
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    const act = b.dataset.action;
    if (act.startsWith("tour")) {
      const next = { tour: 0, tournext: tourAt + 1, tourprev: tourAt - 1, tourend: -1 }[act];
      tourGo(next >= tour.length ? -1 : next);
      if (next >= tour.length) commit("Tour finished. Restart sample shift to try the job yourself.");
      return;
    }
    if (act === "ask" || act === "askclose") {
      askQ = act === "ask" ? v : "";
      q("#askq").value = askQ;
      paint();
      return;
    }
    if (act === "apply") {
      const f = q("form[data-checkin]");
      const o = lastRead && lastRead.out[0];
      if (!f || !o) return;
      f.elements.holder.value = o.holder || "";
      f.elements.promise.value = o.promise || "";
      f.elements.tags.focus();
      q("[data-status]").textContent =
        "Filled in " + (o.holder || "the holder") + (o.promise ? ", " + o.promise : "") + ". Now type the tags from the labels on the units in your hand.";
      return;
    }
    if (act === "draft") {
      s.tab = "Desk book";
      s.form = null;
      draftHandover();
      return;
    }
    if (act === "discard" || act === "setkey" || act === "forgetkey") {
      try {
        if (act === "setkey") {
          const k = q("[data-key]").value.trim();
          if (k) localStorage.setItem(keyStore, k);
        }
        if (act === "forgetkey") localStorage.removeItem(keyStore);
      } catch {
        s.notice = "Browser storage is unavailable, so the key can't be kept.";
      }
      if (act === "discard") ho = null;
      paint();
      return;
    }
    if (act === "restart" || act === "advance") ho = null;
    if (b.dataset.action === "theme") {
      setTheme(v);
      try {
        if (v === "auto") localStorage.removeItem(themeKey);
        else localStorage.setItem(themeKey, v);
      } catch {
        // Theme still applies for this visit.
      }
      return;
    }
    s.err = "";
    switch (b.dataset.action) {
      case "restart":
        s = original();
        break;
      case "advance":
        if (s.phase < 2) s.phase++;
        s.form = null;
        s.notice = "Shift time updated.";
        break;
      case "tab":
        s.tab = v;
        s.form = null;
        break;
      case "issue":
      case "checkin":
        s.tab = "Kits";
        s.form = { kind: b.dataset.action, req: v };
        break;
      case "cancel":
        s.form = null;
        break;
      case "scope":
        s.onlyOpen = v === "0";
        break;
    }
    commit();
    const field = q(".kitform select, .kitform input");
    if (s.form && field) {
      field.closest(".kit").scrollIntoView({ block: "nearest" });
      if (s.form.kind === "checkin") field.focus();
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.matches("[data-msg]")) {
      const f = e.target.closest("form");
      const open = s.loans.filter((l) => l.req === f.dataset.req && !l.back);
      q("[data-reading]").innerHTML = readingHtml(e.target.value, open);
      return;
    }
    if (!e.target.matches('[name="handtext"]') || !ho) return;
    ho.text = e.target.value;
    q("[data-checks]").innerHTML = checksHtml();
    q("form[data-handover] [type=submit]").disabled = issues().some((i) => i.level === "error");
  });
  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      commit();
    }
  });
  const fail = (msg) => {
    s.err = msg;
    commit();
    const field = q(".kitform input, .kitform select");
    field?.focus();
    field?.classList.add("shake");
  };
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);
    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({ phase: s.phase, text });
      commit("Handover note saved.");
      return;
    }
    if (f.matches("[data-askform]")) {
      askQ = String(form.get("q") || "").trim();
      paint();
      return;
    }
    if (f.matches("[data-handover]")) {
      if (!ho || !ho.text || issues().some((i) => i.level === "error")) return;
      s.notes.push({ phase: s.phase, text: ho.text.trim(), kind: "handover" });
      ho = null;
      commit("Shift handover saved to the desk book.");
      return;
    }
    const r = getReq(f.dataset.req);
    if (!r) return;
    if (f.matches("[data-issue]")) {
      const who = form.get("who"),
        due = form.get("due");
      if (!people.includes(who) || !T[due])
        return fail("Choose who is collecting and when the kit is due back.");
      const picks = [...form].filter(([k]) => k.startsWith("unit")).map(([, v]) => v);
      const types = new Set(
        s.loans.filter((l) => l.req === r.id).map((l) => getAsset(l.asset).type),
      );
      for (const id of picks) {
        const a = getAsset(id);
        if (!a || a.repair || out(id)) return fail("Pick an available unit for every item.");
        if (!r.items.includes(a.type))
          return fail(a.type + " is outside the approved request.");
        if (types.has(a.type))
          return fail("The approved quantity of " + a.type + " is already on loan.");
        types.add(a.type);
      }
      let num = Math.max(400, ...s.loans.map((l) => l.num));
      for (const asset of picks)
        s.loans.push({ num: ++num, req: r.id, asset, who, holder: who, due, promise: "", back: false });
      s.form = null;
      commit("Issued " + picks.join(", ") + " to " + who + " on " + r.id + ". Due " + due + ".");
      return;
    }
    if (!f.matches("[data-checkin]")) return;
    const open = s.loans.filter((l) => l.req === r.id && !l.back);
    const expected =
      "Still out on " +
      r.id +
      ": " +
      open.map((l) => l.asset + " (" + getAsset(l.asset).model + ")").join(", ") +
      ". Check the label on the unit.";
    const hits = [];
    for (const t of String(form.get("tags") || "").split(/[\s,]+/).filter(Boolean)) {
      const a = assets.find((x) => norm(x.id) === norm(t));
      const l = a && open.find((x) => x.asset === a.id);
      if (!l)
        return fail(
          (a ? a.id + " isn’t out on this kit. " : "“" + t + "” isn’t a desk tag. ") + expected,
        );
      if (!hits.includes(l)) hits.push(l);
    }
    const holder = form.get("holder"),
      promise = form.get("promise");
    const left = open.filter((l) => !hits.includes(l));
    if (!hits.length && !holder)
      return fail("Type the tag on each unit handed back, or record who has the missing items.");
    if (holder && !left.length)
      return fail("Everything on this kit is being handed back, so nobody else holds it.");
    if (holder && !promise) return fail("When has " + holder + " promised to bring it back?");
    for (const l of hits) {
      l.back = true;
      l.backAt = s.phase;
    }
    for (const l of left)
      if (holder) {
        l.holder = holder;
        l.promise = promise;
      }
    const parts = [];
    if (hits.length) parts.push("Returned: " + hits.map((l) => l.asset).join(", ") + ".");
    if (left.length)
      parts.push(
        "Still out: " +
          left
            .map(
              (l) =>
                l.asset +
                " " +
                getAsset(l.asset).type +
                " (" +
                getAsset(l.asset).model +
                ") with " +
                l.holder +
                (l.promise ? ", promised " + l.promise : ", due " + l.due),
            )
            .join("; ") +
          ".",
      );
    else {
      parts.push("Kit complete.");
      fresh = r.id;
    }
    s.notes.push({ phase: s.phase, auto: true, req: r.id, text: parts.join(" ") });
    s.form = null;
    commit(r.id + " · " + parts.join(" ") + " Logged in the desk book.");
  });
  function restore(d) {
    if (
      !d ||
      d.version !== 2 ||
      !Object.hasOwn(screens, d.tab) ||
      !shifts[d.phase] ||
      !Array.isArray(d.notes) ||
      !d.notes.every((n) => n && shifts[n.phase] && typeof n.text === "string") ||
      !Array.isArray(d.loans) ||
      !d.loans.length ||
      !d.loans.every(
        (l) =>
          l &&
          getReq(l.req) &&
          getAsset(l.asset) &&
          Number.isInteger(l.num) &&
          people.includes(l.holder) &&
          T[l.due],
      )
    )
      return;
    s = {
      ...original(),
      ...d,
      form: null,
      err: "",
      loans: d.loans.map((l) => ({ ...l })),
      notes: d.notes.map((n) => ({ ...n })),
    };
    paint();
  }
  paint();
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
})();
