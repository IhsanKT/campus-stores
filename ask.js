// "Ask the desk": answers questions only from the desk's records, cites the records it used,
// and says so when the records don't hold the answer. Offline, no model, no key.
(function (api) {
  const KINDS = [
    ["HDMI projector", /projector/],
    ["Portable speaker", /speaker/],
    ["USB-C → HDMI adapter", /adapter|adaptor|dongle|usb/],
    ["Wireless microphone", /\bmics?\b|microphone/],
    ["Digital camera", /camera/],
  ];
  const list = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
  const slip = (l) => ({ label: "Slip L-" + l.num, tab: "Register" });
  const back = (l) => (l.promise ? "promised " + l.promise : "due " + l.due) + (l.overdue ? " (overdue)" : "");
  const where = (l) =>
    l.tag + " " + l.type + " is with " + l.holder + (l.holder !== l.who ? " (collected by " + l.who + ")" : "") + ", " + back(l) + ".";

  // d: { now, loans: [{num, req, club, tag, type, model, who, holder, due, promise, back, overdue}],
  //      assets: [{id, type, model, bin, repair}], people: [...], requests: [{id, club, event}] }
  function answer(question, d) {
    const q = String(question || "").toLowerCase().trim();
    if (!q) return null;
    const open = d.loans.filter((l) => !l.back);
    const out = (lines, sources) => ({ lines, sources: dedupe(sources) });
    if (/^(please\s+)?(delete|remove|cancel|close|clear|change|update|edit|issue|return|mark|reset)\b/.test(q))
      return {
        lines: ["I only answer questions. Records change through the check-in and issue forms, where every change is checked."],
        sources: [],
        unsure: true,
      };

    if (/overdue|late|missing/.test(q)) {
      const late = open.filter((l) => l.overdue);
      return late.length
        ? out(late.map(where), late.map(slip))
        : out(["Nothing is overdue at " + d.now + "." + (open.length ? " " + open.length + " units are out and all are within their time." : "")], open.map(slip));
    }

    const req = d.requests.find((r) => q.includes(r.id.toLowerCase()) || q.includes(r.club.toLowerCase()) || q.includes(r.club.split(" ")[0].toLowerCase()));
    if (req) {
      const ls = d.loans.filter((l) => l.req === req.id);
      if (!ls.length) return out([req.club + " (" + req.id + ", " + req.event + ") hasn't collected anything yet."], [{ label: req.id, tab: "Kits" }]);
      const gone = ls.filter((l) => !l.back);
      const lines = [req.club + " · " + req.event + " (" + req.id + "): " + ls.length + " units issued to " + ls[0].who + "."];
      if (ls.some((l) => l.back)) lines.push("Returned: " + list(ls.filter((l) => l.back).map((l) => l.tag + " " + l.type)) + ".");
      lines.push(...(gone.length ? gone.map(where) : ["The kit is complete."]));
      return out(lines, [{ label: req.id, tab: "Kits" }, ...ls.map(slip)]);
    }

    const person = d.people.find((p) => new RegExp("\\b" + p.split(" ")[0].toLowerCase() + "\\b").test(q));
    if (person) {
      const has = open.filter((l) => l.holder === person);
      const took = d.loans.filter((l) => l.who === person && l.holder !== person && !l.back);
      const lines = has.length ? has.map(where) : [person + " has nothing out right now."];
      if (took.length) lines.push(person + " collected " + list(took.map((l) => l.tag)) + ", now with " + list([...new Set(took.map((l) => l.holder))]) + ".");
      return out(lines, has.length || took.length ? [...has, ...took].map(slip) : [{ label: "Register · open slips", tab: "Register" }]);
    }

    const tagM = /\b([a-z]{2})-?(\d{2})\b/.exec(q);
    const tag = tagM && d.assets.find((a) => a.id === tagM[1].toUpperCase() + "-" + tagM[2]);
    const kind = KINDS.find(([, re]) => re.test(q));
    const units = tag ? [tag] : kind ? d.assets.filter((a) => a.type === kind[0]) : [];
    if (units.length) {
      const free = units.filter((a) => !a.repair && !open.some((l) => l.tag === a.id));
      if (/free|available|spare|shelf|stock|can i|is there|any\b/.test(q)) {
        const lines = free.length
          ? [list(free.map((a) => a.id + " " + a.model + " (bin " + a.bin + ")")) + (free.length > 1 ? " are" : " is") + " on the shelf."]
          : ["No " + units[0].type + " is on the shelf right now."];
        const rep = units.filter((a) => a.repair);
        if (rep.length) lines.push(list(rep.map((a) => a.id)) + " is in repair and can't be issued.");
        return out(lines, units.map((a) => ({ label: a.id + " · Inventory", tab: "Inventory" })));
      }
      const lines = units.map((a) => {
        const l = open.find((x) => x.tag === a.id);
        if (l) return where(l);
        return a.id + " " + a.model + (a.repair ? " is in repair (" + a.bin + ")." : " is on the shelf, bin " + a.bin + ".");
      });
      if (units.length > 1 && new Set(units.map((a) => a.bin)).size === 1)
        lines.push("They look alike and share bin " + units[0].bin + ". Check the label before closing a slip.");
      return out(lines, [
        ...units.map((a) => open.find((l) => l.tag === a.id)).filter(Boolean).map(slip),
        ...units.map((a) => ({ label: a.id + " · Inventory", tab: "Inventory" })),
      ]);
    }

    if (/out|outstanding|on loan|not back|loan|due|who has|handover|carried/.test(q)) {
      if (!open.length) return out(["Everything is back at the desk."], []);
      const sorted = open.slice().sort((a, b) => a.dueAt - b.dueAt);
      return out([open.length + " units are out at " + d.now + ":", ...sorted.map(where)], sorted.map(slip));
    }

    return {
      lines: ["I only answer from the desk's records, and I can't find that there. Try a unit, a person, a club, or “what's overdue?”."],
      sources: [],
      unsure: true,
    };
  }
  function dedupe(sources) {
    const seen = new Set();
    return sources.filter((s) => !seen.has(s.label) && seen.add(s.label));
  }

  Object.assign(api, { answer });
})(typeof module !== "undefined" && module.exports ? module.exports : (window.Ask = {}));
