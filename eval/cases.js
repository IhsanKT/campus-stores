// Evaluation cases and scoring, shared by the in-app Evaluation tab and `node eval/run.js`.
(function (api) {
  const assets = [
    ["PR-04", "HDMI projector", "BenQ MH550"],
    ["PR-06", "HDMI projector", "Epson EB-X49"],
    ["SP-02", "Portable speaker", "JBL Eon One"],
    ["SP-05", "Portable speaker", "Bose S1"],
    ["AD-12", "USB-C → HDMI adapter", "Belkin AVC002"],
    ["AD-15", "USB-C → HDMI adapter", "Anker A8312"],
    ["MI-09", "Wireless microphone", "Shure BLX"],
    ["CA-03", "Digital camera", "Sony A6400"],
  ].map(([id, type, model]) => ({ id, type, model }));
  const people = ["Isha Rao", "Kabir Sen", "Leela Das", "Tara Shah", "Dev Menon"];
  const slots = ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"];
  const unit = (tag, holder = "Kabir Sen") => {
    const a = assets.find((x) => x.id === tag);
    return { tag, type: a.type, model: a.model, holder };
  };

  // ---- 1. Message reader: labelled borrower messages for the Film Society kit at Fri 7:30 pm ----
  // expect: exact check-in, or {ask: true} when the right behaviour is to ask the clerk.
  const kit = () => ({ day: "Fri", hour: 19.5, people, slots, open: ["PR-04", "SP-02", "AD-12"].map((t) => unit(t)) });
  const R = (returned, out) => ({ returned, out });
  const messages = [
    ["I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
      R(["PR-04", "SP-02"], [["AD-12", "Leela Das", "Sat 9 am"]])],
    ["All three are back, thanks!", R(["PR-04", "SP-02", "AD-12"], [])],
    ["Returning the projector and the speaker. The adapter is with Leela Das till tomorrow noon.",
      R(["PR-04", "SP-02"], [["AD-12", "Leela Das", "Sat noon"]])],
    ["Here’s the projector. Speaker and adapter are still with Isha, she’ll bring them Sat 10 am.",
      R(["PR-04"], [["SP-02", "Isha Rao", "Sat 10 am"], ["AD-12", "Isha Rao", "Sat 10 am"]])],
    ["I brought everything except the dongle. Dev took it, back by 9am tomorrow.",
      R(["PR-04", "SP-02"], [["AD-12", "Dev Menon", "Sat 9 am"]])],
    ["Brought back the speaker. Projector and adapter tomorrow 9 am, Leela has them.",
      R(["SP-02"], [["PR-04", "Leela Das", "Sat 9 am"], ["AD-12", "Leela Das", "Sat 9 am"]])],
    ["Projector’s back. Lila has the adapter, 9 tomorrow.", { ask: true }],
    ["The speaker didn’t come back yet, Kabir still has it. Projector and adapter returned.", { ask: true }],
    ["Dropped off the projector and speaker. Leela’s keeping the adapter until Saturday 10 am.",
      R(["PR-04", "SP-02"], [["AD-12", "Leela Das", "Sat 10 am"]])],
    ["Projector and speaker returned. Adapter is with Leela, she will drop it off at 9:30 am tomorrow.", { ask: true }],
    ["Tara has the adapter now.", { ask: true }],
    ["Everything’s back.", R(["PR-04", "SP-02", "AD-12"], [])],
    ["Here is the projector, the speaker and AD-12.", R(["PR-04", "SP-02", "AD-12"], [])],
    ["I returned the speaker but not the projector; Dev has it until noon tomorrow. Adapter’s back too.",
      R(["SP-02", "AD-12"], [["PR-04", "Dev Menon", "Sat noon"]])],
    ["Kabir has brought back the projector and speaker, Leela will return the adapter at 9 am tomorrow.",
      R(["PR-04", "SP-02"], [["AD-12", "Leela Das", "Sat 9 am"]])],
    ["The projector stays with Kabir overnight. Speaker and adapter are back.", { ask: true }],
  ];

  function runReader(Extract) {
    const rows = messages.map(([msg, expect]) => {
      const got = Extract.read(msg, kit());
      const asked = got.questions.length > 0;
      const same =
        !expect.ask &&
        !asked &&
        [...got.returned].sort().join() === [...expect.returned].sort().join() &&
        got.out.length === expect.out.length &&
        expect.out.every(([tag, holder, promise]) =>
          got.out.some((o) => o.tag === tag && o.holder === holder && o.promise === promise));
      const result = expect.ask ? (asked ? "correct" : "wrong") : same ? "correct" : asked ? "asked" : "wrong";
      const expected = expect.ask
        ? "should ask the clerk"
        : "back: " + (expect.returned.join(", ") || "none") +
          (expect.out.length ? " · out: " + expect.out.map((o) => o.join(" / ")).join("; ") : "");
      const gotText = asked
        ? "asked: " + got.questions[0]
        : "back: " + (got.returned.join(", ") || "none") +
          (got.out.length ? " · out: " + got.out.map((o) => [o.tag, o.holder, o.promise].join(" / ")).join("; ") : "");
      return { msg, result, expected, got: gotText, askedOk: !!expect.ask && asked };
    });
    const count = (r) => rows.filter((x) => x.result === r).length;
    return { rows, total: rows.length, correct: count("correct"), asked: count("asked"), wrong: count("wrong") };
  }

  // ---- 2. Handover checker: seeded drafting mistakes on five shift scenarios ----
  const u = (tag, req, club, holder, who, due, promise = "", overdue = false) => ({
    ...unit(tag, holder), req, club, collected_by: who, due, promise, overdue,
  });
  const film = (tag, holder, due, promise, overdue) =>
    u(tag, "RQ-214", "Film Society", holder, "Kabir Sen", due, promise, overdue);
  const mic = u("MI-09", "RQ-209", "Debate Union", "Tara Shah", "Tara Shah", "Sat 10 am");
  const scenarios = [
    ["Fri 7:30 pm: adapter passed to Leela, promised 9 am",
      { now: "Friday · 7:30 pm", open: [film("AD-12", "Leela Das", "Fri 8 pm", "Sat 9 am"), mic],
        returned: [film("PR-04", "Kabir Sen", "Fri 8 pm"), film("SP-02", "Kabir Sen", "Fri 8 pm")] }],
    ["Sat 9 am: nobody recorded the promise, adapter overdue",
      { now: "Saturday · 9:00 am", open: [film("AD-12", "Kabir Sen", "Fri 8 pm", "", true), mic], returned: [] }],
    ["Look-alike out: AD-15 with Dev, AD-12 on the shelf",
      { now: "Friday · 7:30 pm", open: [u("AD-15", "RQ-217", "Photo Circle", "Dev Menon", "Dev Menon", "Sat noon")], returned: [] }],
    ["Two kits out, one unit each",
      { now: "Friday · 7:30 pm", open: [mic, u("CA-03", "RQ-217", "Photo Circle", "Dev Menon", "Dev Menon", "Sat noon")], returned: [] }],
    ["Everything back", { now: "Friday · 7:30 pm", open: [], returned: [film("PR-04", "Kabir Sen", "Fri 8 pm")] }],
  ].map(([name, f]) => ({ name, f: { ...f, assets } }));
  const twinOf = (t) => {
    const a = assets.find((x) => x.id === t);
    return assets.find((x) => x.type === a.type && x.id !== t);
  };
  const first = (fn) => (d) => ({ ...d, lines: d.lines.map((l, i) => (i ? l : fn(l))) });
  const mistakes = [
    ["drops a unit that is still out", "error", (d) => ({ ...d, lines: d.lines.slice(1) }), (f) => f.open.length],
    ["swaps in the look-alike tag", "error", first((l) => ({ ...l, tag: twinOf(l.tag).id, action: "" })),
      (f) => f.open.length && twinOf(f.open[0].tag)],
    ["names the wrong person as holder", "error", first((l) => ({ ...l, holder: "Isha Rao", action: "" })), (f) => f.open.length],
    ["leaves out when it's due back", "warn", first((l) => ({ ...l, back_by: "soon" })), (f) => f.open.length],
    ["invents a unit that was never issued", "error",
      (d) => ({ ...d, lines: [...d.lines, { tag: "PR-06", item: "HDMI projector", kit: "RQ-214", holder: "Kabir Sen", back_by: "due Fri 8 pm", action: "" }] }),
      () => true],
  ];

  function runChecker(H) {
    const rows = [];
    let falseAlarms = 0;
    for (const s of scenarios) {
      const good = H.ruleDraft(s.f);
      if (H.check(H.toText(good), s.f).length) falseAlarms++;
      for (const [label, level, mutate, applies] of mistakes) {
        if (!applies(s.f)) continue;
        const caught = H.check(H.toText(mutate(good)), s.f).some((i) => i.level === level);
        rows.push({ scenario: s.name, mistake: label, caught });
      }
    }
    return { rows, total: rows.length, caught: rows.filter((r) => r.caught).length, falseAlarms, scenarios: scenarios.length };
  }

  // ---- 3. Ask the desk: questions at Sat 9 am, after the work sample's shift ----
  // Each answer must contain every `has` string, none of the `not` strings; `unsure` = must decline.
  const loan = (num, req, club, tag, who, holder, due, promise, back, dueAt, overdue = false) => ({
    ...unit(tag, holder), num, req, club, who, due, promise, back, dueAt, overdue,
  });
  const desk = {
    now: "Saturday · 9:00 am",
    people,
    assets: assets.map((a) => ({ ...a, bin: { "PR-06": "Workshop", "AD-12": "C4", "AD-15": "C4" }[a.id] || "A1", repair: a.id === "PR-06" })),
    requests: [
      { id: "RQ-214", club: "Film Society", event: "Courtyard screening" },
      { id: "RQ-209", club: "Debate Union", event: "Finals rehearsal" },
      { id: "RQ-217", club: "Photo Circle", event: "Street portrait walk" },
    ],
    loans: [
      loan(401, "RQ-209", "Debate Union", "MI-09", "Tara Shah", "Tara Shah", "Sat 10 am", "", false, 2040),
      loan(402, "RQ-214", "Film Society", "PR-04", "Kabir Sen", "Kabir Sen", "Fri 8 pm", "", true, 1200),
      loan(403, "RQ-214", "Film Society", "SP-02", "Kabir Sen", "Kabir Sen", "Fri 8 pm", "", true, 1200),
      loan(404, "RQ-214", "Film Society", "AD-12", "Kabir Sen", "Leela Das", "Fri 8 pm", "Sat 9 am", false, 1980),
    ],
  };
  const questions = [
    ["Where is the adapter?", { has: ["AD-12", "Leela Das", "Sat 9 am", "AD-15", "shelf", "look alike"] }],
    ["Who has AD-12?", { has: ["Leela Das", "collected by Kabir Sen"] }],
    ["Which adapter did Kabir take?", { has: ["AD-12", "Leela Das"], not: ["AD-15"] }],
    ["What's overdue?", { has: ["Nothing is overdue"] }],
    ["Is a projector free?", { has: ["PR-04", "PR-06 is in repair"] }],
    ["What's still out?", { has: ["2 units", "MI-09", "AD-12"], not: ["PR-04", "SP-02"] }],
    ["Film Society?", { has: ["Returned", "PR-04", "AD-12", "Leela Das"] }],
    ["What does Dev have?", { has: ["nothing out"] }],
    ["Is there a camera?", { has: ["CA-03", "on the shelf"] }],
    ["What's the weather tomorrow?", { unsure: true }],
    ["Delete all the loans", { unsure: true }],
  ];
  function runAsk(Ask) {
    const rows = questions.map(([q, e]) => {
      const a = Ask.answer(q, desk);
      const text = a.lines.join(" ");
      const ok = e.unsure
        ? !!a.unsure
        : !a.unsure && e.has.every((h) => text.includes(h)) && !(e.not || []).some((n) => text.includes(n)) && a.sources.length > 0;
      return { q, ok, text, cited: a.sources.length };
    });
    return { rows, total: rows.length, ok: rows.filter((r) => r.ok).length };
  }

  Object.assign(api, { runReader, runChecker, runAsk, scenarios, kit });
})(typeof module !== "undefined" && module.exports ? module.exports : (window.EvalCases = {}));
