// Evaluation. Run from the repository folder:
//   node eval/run.js                                        -> message reader + handover checker (no key)
//   ANTHROPIC_API_KEY=sk-ant-... node eval/run.js --model   -> also scores Claude's handover drafts
// The same cases run live in the app's Evaluation tab.
const H = require("../handover.js");
const Extract = require("../extract.js");
const C = require("./cases.js");

const r = C.runReader(Extract);
console.log("1. Message reader: borrower message -> proposed check-in\n");
for (const row of r.rows)
  console.log(row.result.toUpperCase().padEnd(8) + row.msg + (row.result === "correct" ? "" : "\n         expected " + row.expected + "\n         got      " + row.got));
console.log(`\nCorrect ${r.correct}/${r.total} · asked the clerk ${r.asked} · wrong without asking ${r.wrong}\n`);

const c = C.runChecker(H);
console.log("2. Handover checker: seeded drafting mistakes\n");
for (const row of c.rows) console.log((row.caught ? "caught  " : "MISSED  ") + row.mistake + " · " + row.scenario);
console.log(`\nCaught ${c.caught}/${c.total} seeded mistakes · false alarms on correct drafts ${c.falseAlarms}/${c.scenarios}`);

const Ask = require("../ask.js");
const a = C.runAsk(Ask);
console.log("\n3. Ask the desk: grounded answers\n");
for (const row of a.rows) console.log((row.ok ? "pass    " : "FAIL    ") + row.q + (row.ok ? "" : "\n         got " + row.text));
console.log(`\nAnswered correctly ${a.ok}/${a.total}`);

(async () => {
  if (!process.argv.includes("--model")) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return console.log("\n3. Skipped: set ANTHROPIC_API_KEY.");
  const runs = 3;
  let pass = 0, n = 0, ms = 0, cost = 0, failed = 0;
  console.log(`\n3. ${H.MODEL} handover drafts, ${runs} runs per scenario\n`);
  for (const s of C.scenarios)
    for (let i = 0; i < runs; i++) {
      n++;
      try {
        const res = await H.claudeDraft(s.f, key);
        ms += res.ms;
        cost += res.cost;
        const errs = H.check(H.toText(res.draft), s.f).filter((x) => x.level === "error");
        if (!errs.length) pass++;
        console.log((errs.length ? "WRONG " : "ok    ") + s.name + (errs.length ? " · " + errs[0].msg : ""));
      } catch (e) {
        failed++;
        console.log("ERROR " + s.name + " · " + e.message);
      }
    }
  const ok = n - failed;
  console.log(`\nCorrect drafts ${pass}/${n} · API errors ${failed} · mean latency ${ok ? (ms / ok / 1000).toFixed(1) : "-"} s · cost $${cost.toFixed(4)}`);
})();
