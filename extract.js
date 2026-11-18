// Message reader: turns a borrower's free-text message into a proposed check-in, with the
// evidence (highlighted words) for every field, and questions instead of guesses.
// Runs in the browser, offline, with no model or key. Shared with the evaluation (eval/cases.js).
(function (api) {
  const KINDS = [
    ["HDMI projector", /\bprojectors?\b/gi],
    ["Portable speaker", /\bspeakers?\b/gi],
    ["USB-C → HDMI adapter", /\b(adapters?|adaptors?|dongles?)\b/gi],
    ["Wireless microphone", /\b(mics?|microphones?)\b/gi],
    ["Digital camera", /\bcameras?\b/gi],
  ];
  const TAG = /\b([A-Z]{2})-?(\d{2})\b/g;
  const BACK = /\b(brought|returned|returning|dropped off|handed (in|back)|here's|here is|here are|back)\b/i;
  const NEG = /\b(not|didn't|hasn't|haven't|isn't|aren't|yet)\b|n't\b/i;
  const OUT = /\b(has|have|had|still|kept|keeps|keeping|took|taken|holding|with)\b/i;
  const ALL = /\b(everything|all)\b/i;
  const EXCEPT = /\b(except|but not|apart from|other than)\b/i;
  const TIME = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(noon|midday)\b/gi;
  const DAY = /\b(tomorrow|today|tonight|fri(?:day)?|sat(?:urday)?)\b/i;
  const NEXT = { Fri: "Sat", Sat: "Sun" };

  function read(msg, ctx) {
    const text = String(msg || "").replace(/[‘’]/g, "'"); // phone keyboards type curly quotes; same length keeps offsets
    const spans = [];
    const returned = [];
    const out = []; // {tag, holder, promise, raw}
    const questions = [];
    const used = new Set();
    const loanFor = (type) => ctx.open.find((u) => u.type === type && !used.has(u.tag));
    const pick = (u) => (u && !used.has(u.tag) ? (used.add(u.tag), u) : null);
    const people = ctx.people.map((p) => ({ name: p, re: new RegExp("\\b" + p.split(" ")[0] + "\\b", "i") }));

    // Items mentioned in a stretch of text, as loans in this kit.
    function items(seg, base) {
      const found = [];
      for (const [type, re] of KINDS)
        for (const m of seg.matchAll(re)) found.push({ type, i: base + m.index, n: m[0].length });
      for (const m of seg.matchAll(TAG)) {
        const tag = m[1].toUpperCase() + "-" + m[2];
        const u = ctx.open.find((x) => x.tag === tag);
        if (u) found.push({ type: u.type, tag, i: base + m.index, n: m[0].length });
      }
      return found;
    }
    function person(seg, base) {
      for (const p of people) {
        const m = p.re.exec(seg);
        if (m) {
          const full = new RegExp(p.name, "i").exec(seg);
          const hit = full || m;
          spans.push({ i: base + hit.index, n: hit[0].length, kind: "holder" });
          return p.name;
        }
      }
      return "";
    }
    function when(seg, base) {
      const m = [...seg.matchAll(TIME)][0];
      if (!m) return null;
      spans.push({ i: base + m.index, n: m[0].length, kind: "time" });
      const d = DAY.exec(seg);
      if (d) spans.push({ i: base + d.index, n: d[0].length, kind: "time" });
      let day = ctx.day;
      if (d) {
        const w = d[1].toLowerCase();
        day = w === "tomorrow" ? NEXT[ctx.day] : w.startsWith("fri") ? "Fri" : w.startsWith("sat") ? "Sat" : ctx.day;
      } else if (m[3] && m[3].toLowerCase() === "am" && ctx.hour >= 12) day = NEXT[ctx.day];
      const label = m[4]
        ? day + " noon"
        : day + " " + m[1] + (m[2] && m[2] !== "00" ? ":" + m[2] : "") + " " + m[3].toLowerCase();
      return { label, ok: ctx.slots.includes(label) };
    }
    const mark = (list, kind) => list.forEach((x) => spans.push({ i: x.i, n: x.n, kind }));
    const take = (list) => list.map((x) => pick(x.tag ? ctx.open.find((u) => u.tag === x.tag) : loanFor(x.type))).filter(Boolean);

    let lastOut = [];
    for (const m of text.matchAll(/[^.!?;]+[.!?;]*/g)) {
      const seg = m[0];
      const base = m.index;
      let moved = [];
      let here = "";
      const ex = EXCEPT.exec(seg);
      if (ex) {
        const before = seg.slice(0, ex.index);
        const after = seg.slice(ex.index);
        const outItems = items(after, base + ex.index);
        mark(outItems, "out");
        const outLoans = take(outItems);
        if (ALL.test(before)) {
          const a = ALL.exec(before);
          spans.push({ i: base + a.index, n: a[0].length, kind: "returned" });
          for (const u of ctx.open) if (pick(u)) returned.push(u.tag);
        } else if (BACK.test(before)) {
          const b = items(before, base);
          mark(b, "returned");
          returned.push(...take(b).map((u) => u.tag));
        }
        const holder = person(after, base + ex.index);
        here = holder;
        moved = outLoans.map((u) => ({ tag: u.tag, holder, promise: "" }));
      } else {
        const found = items(seg, base);
        const holder = OUT.test(seg) ? person(seg, base) : "";
        here = holder;
        if (found.length && holder) {
          mark(found, "out");
          moved = take(found).map((u) => ({ tag: u.tag, holder, promise: "" }));
        } else if (BACK.test(seg) && !NEG.test(seg)) {
          if (ALL.test(seg) && !found.length) {
            const a = ALL.exec(seg);
            spans.push({ i: base + a.index, n: a[0].length, kind: "returned" });
            for (const u of ctx.open) if (pick(u)) returned.push(u.tag);
          } else {
            mark(found, "returned");
            returned.push(...take(found).map((u) => u.tag));
          }
        } else if (found.length && (OUT.test(seg) || NEG.test(seg))) {
          mark(found, "out");
          moved = take(found).map((u) => ({ tag: u.tag, holder: "", promise: "" }));
        }
      }
      out.push(...moved);
      // "Dev took it": a person named after the item, with no item of their own, holds the last unnamed unit.
      if (!moved.length && here) for (const o of lastOut) if (!o.holder) o.holder = here;
      const t = when(seg, base);
      const target = moved.length ? moved : lastOut; // "She'll be here at 9 am" refers back
      if (t) for (const o of target) if (!o.promise) (o.promise = t.ok ? t.label : ""), (o.raw = t.label);
      if (moved.length) lastOut = moved;
    }

    const name = (tag) => {
      const u = ctx.open.find((x) => x.tag === tag);
      return u.tag + " (" + u.type.toLowerCase() + ")";
    };
    for (const o of out) {
      if (!o.holder) questions.push("Who has " + name(o.tag) + " now? The message doesn't name anyone I know.");
      if (o.raw && !o.promise) questions.push("“" + o.raw + "” isn't a return time on the form. Agree one with the borrower.");
      else if (!o.promise) questions.push("When will " + name(o.tag) + " come back? No time in the message.");
    }
    if (new Set(out.map((o) => o.holder)).size > 1)
      questions.push("Two different people hold units. Record them as separate check-ins.");
    for (const u of ctx.open)
      if (!used.has(u.tag)) questions.push("The message doesn't mention " + name(u.tag) + ". Ask before recording it.");
    return { returned, out, spans: spans.sort((a, b) => a.i - b.i), questions };
  }

  // Message with highlighted evidence. esc() is passed in so this file has no DOM dependency.
  function highlight(msg, spans, esc) {
    let html = "",
      at = 0;
    for (const s of spans) {
      if (s.i < at) continue;
      html += esc(msg.slice(at, s.i)) + '<mark class="ev ' + s.kind + '">' + esc(msg.slice(s.i, s.i + s.n)) + "</mark>";
      at = s.i + s.n;
    }
    return html + esc(msg.slice(at));
  }

  Object.assign(api, { read, highlight });
})(typeof module !== "undefined" && module.exports ? module.exports : (window.Extract = {}));
