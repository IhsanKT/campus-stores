// Shift handover: draft from the desk's records, then check the draft against those records.
// Shared by the browser app (window.Handover) and the evaluation script (require).
(function (api) {
  const MODEL = "claude-opus-5-5";
  const PRICE = { input: 4 / 1e6, output: 20 / 1e6 }; // USD per token, Claude Opus 5.5

  // Records -> one line per unit still out, plus what came back this shift.
  function ruleDraft(f) {
    return {
      lines: f.open.map((u) => ({
        tag: u.tag,
        item: u.type + " (" + u.model + ")",
        kit: u.req + " " + u.club,
        holder: u.holder,
        back_by: u.promise ? "promised " + u.promise : "due " + u.due,
        action:
          (u.overdue ? "OVERDUE. Call " + u.holder + ". " : "") +
          "Check the label reads " + u.tag + " before closing the slip.",
      })),
      returned: f.returned.map((u) => u.tag),
      summary: f.open.length
        ? f.open.length + (f.open.length === 1 ? " unit" : " units") + " still out at " + f.now + "."
        : "Nothing out at " + f.now + ".",
    };
  }

  function toText(d) {
    const out = [d.summary];
    for (const l of d.lines)
      out.push(l.tag + " " + l.item + ", " + l.kit + ": with " + l.holder + ", " + l.back_by + ". " + l.action);
    if (d.returned && d.returned.length) out.push("Returned this shift: " + d.returned.join(", ") + ".");
    return out.join("\n");
  }

  const tagRe = /\b([A-Z]{2})-?(\d{2})\b/gi;
  const tagsIn = (line) => [...line.matchAll(tagRe)].map((m) => m[1].toUpperCase() + "-" + m[2]);
  // "Sat 9 am" -> matches "9 am", "9am", "9:00 am"; "Sat noon" -> "noon" / "12 pm".
  const timeRe = (when) => {
    const m = /(\d+)\s*(am|pm)/i.exec(when);
    if (!m) return /noon|12\s*(:00)?\s*pm/i;
    return new RegExp("\\b" + m[1] + "\\s*(:00)?\\s*" + m[2] + "\\b", "i");
  };

  // Returns [{level: "error"|"warn", msg}]. Errors block saving; warnings are shown.
  function check(text, f) {
    const issues = [];
    const lines = String(text).split(/\n+/);
    for (const u of f.open) {
      const mine = lines.filter((l) => tagsIn(l).includes(u.tag));
      if (!mine.length) {
        issues.push({ level: "error", msg: u.tag + " (" + u.type + ") is still out with " + u.holder + " but isn't in the handover." });
        continue;
      }
      const first = u.holder.split(" ")[0].toLowerCase();
      if (!mine.some((l) => l.toLowerCase().includes(first)))
        issues.push({ level: "error", msg: u.tag + ": the records say it's with " + u.holder + "." });
      const when = u.promise || u.due;
      if (!mine.some((l) => timeRe(when).test(l)))
        issues.push({ level: "warn", msg: u.tag + ": say when it's back (" + (u.promise ? "promised " : "due ") + when + ")." });
    }
    const known = new Set([...f.open, ...f.returned].map((u) => u.tag));
    for (const t of new Set(lines.flatMap(tagsIn))) {
      if (known.has(t)) continue;
      const a = f.assets.find((x) => x.id === t);
      const twin = a && f.open.find((u) => u.type === a.type);
      issues.push({
        level: "error",
        msg:
          t +
          (a ? " isn't out on any slip." : " isn't a desk tag.") +
          (twin ? " Look-alike of " + twin.tag + " (" + twin.model + "), which is out." : ""),
      });
    }
    return issues;
  }

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tag: { type: "string" },
            item: { type: "string" },
            kit: { type: "string" },
            holder: { type: "string" },
            back_by: { type: "string" },
            action: { type: "string" },
          },
          required: ["tag", "item", "kit", "holder", "back_by", "action"],
          additionalProperties: false,
        },
      },
      returned: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "lines", "returned"],
    additionalProperties: false,
  };
  const system =
    "You write the end-of-shift handover for a campus equipment desk. The next shift reads it before anyone walks in. " +
    "Use only the records provided; never guess a tag, person or time. Give one line per unit still out: its exact tag, " +
    "item and model, kit (request id and club), who holds it now, and when it is promised or due back (copy the time exactly). " +
    "In action, tell the next shift what to do, including checking the physical label against the tag because look-alike units share bins. " +
    "Flag overdue units. List tags returned this shift in returned. Keep the summary to one sentence.";

  // Calls Claude with the viewer's own key. Throws on any failure so the caller can fall back.
  async function claudeDraft(f, key, fetchImpl = fetch) {
    const t0 = Date.now();
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2026-10-21",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema } },
        system,
        messages: [
          {
            role: "user",
            content:
              "Desk time: " + f.now + "\nUnits still out:\n" + JSON.stringify(f.open, null, 1) +
              "\nReturned this shift:\n" + JSON.stringify(f.returned, null, 1),
          },
        ],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body.error && body.error.message) || "HTTP " + res.status);
    if (body.stop_reason === "refusal") throw new Error("The model declined this request.");
    if (body.stop_reason === "max_tokens") throw new Error("The draft was cut off.");
    const text = (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    let draft;
    try {
      draft = JSON.parse(text);
    } catch {
      throw new Error("The model returned malformed JSON.");
    }
    const u = body.usage || {};
    return {
      draft,
      ms: Date.now() - t0,
      tokens: { input: u.input_tokens || 0, output: u.output_tokens || 0 },
      cost: (u.input_tokens || 0) * PRICE.input + (u.output_tokens || 0) * PRICE.output,
      model: body.model || MODEL,
    };
  }

  Object.assign(api, { ruleDraft, toText, check, claudeDraft, MODEL });
})(typeof module !== "undefined" && module.exports ? module.exports : (window.Handover = {}));
