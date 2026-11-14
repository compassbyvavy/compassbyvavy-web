"""Render Compass by Vavy scavenger-hunt printables (HTML -> PDF) from hunt data.

Each hunt: dict(slug, title, ages, mode, minutes, lede, stages=[(name, first_chit)],
cert_title, cert_text, chits=[dict(fact, clue, spot, pic?, challenge?, puzzle?)])
mode: "readaloud" (3-5), "rhyme" (5-7), "puzzle" (7-9).
Chit k's clue leads to chit k's `spot`, where chit k+1 is hidden. The last spot holds the prize.
puzzle=(kind, WORD, hint) builds the clue: kind in code|scramble|backwards|missing.
"""
import html, random, subprocess, sys, json, pathlib

e = html.escape
VOWELS = set("AEIOU")


def code(word):
    return "   ".join(" - ".join(str(ord(c) - 64) for c in w) for w in word.split())


def scramble(word, seed):
    rnd = random.Random(seed)
    letters = list(word.replace(" ", ""))
    for _ in range(50):
        rnd.shuffle(letters)
        if "".join(letters) != word.replace(" ", ""):
            break
    return " - ".join(letters)


def backwards(word):
    return "   ".join(" ".join(w) for w in word[::-1].split())


def missing(word):
    out = []
    for w in word.split():
        out.append(" ".join(c if (i == 0 or c not in VOWELS) else "_" for i, c in enumerate(w)))
    return "     ".join(out)


LABEL = {
    "code": "Secret code",
    "scramble": "Unscramble",
    "backwards": "Read it backwards",
    "missing": "Fill in the missing letters",
}


def build_clue(chit, idx, slug):
    if "puzzle" not in chit:
        return chit["clue"], None
    kind, word, hint = chit["puzzle"]
    fn = {"code": code, "backwards": backwards, "missing": missing}.get(kind)
    p = scramble(word, f"{slug}-{idx}") if kind == "scramble" else fn(word)
    return f"{LABEL[kind]}: {p}. {hint}".strip(), word


CSS = """
:root{--ink:#26241f;--muted:#6e7568;--cream:#faf8f3;--surface:#efeae0;--line:#e3dccb;--pine:#33503e;--amber:#a8763a;--terra:#b16b42;--sage:#e7ede6;
--display:"Inter Display",Inter,system-ui,sans-serif;--body:Inter,system-ui,sans-serif;--emoji:"Noto Color Emoji";}
@page{size:letter;margin:0.4in}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--ink);font-family:var(--body);line-height:1.45}
h1,h2{font-family:var(--display);margin:0;text-wrap:balance}
.kicker{color:var(--pine);font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:.72rem}
h1{font-size:2.3rem;line-height:1.05;margin:4px 0 6px;font-weight:800}
.lede{color:var(--muted);margin:0 0 10px;max-width:68ch}
.how{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0;margin:10px 0;list-style:none;counter-reset:s}
.how li{border:1px solid var(--line);border-radius:12px;padding:10px 12px;counter-increment:s;font-size:.82rem;background:var(--cream)}
.how li::before{content:"Step " counter(s);display:block;font-family:var(--display);color:var(--terra);font-weight:800}
.learn{border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:10px 0;background:var(--sage)}
.learn b{color:var(--pine)}
.learn ul{margin:4px 0 0;padding-left:18px;columns:2;font-size:.85rem}
.decoder{border:2px dashed #c9bfa8;padding:10px 12px;display:grid;gap:6px;break-inside:avoid;margin-top:10px}
.dgrid{display:grid;grid-template-columns:repeat(13,1fr);gap:4px}
.dgrid span{display:grid;text-align:center;border:1px solid var(--line);border-radius:6px;padding:3px 0;font-size:.8rem}
.dgrid b{font-family:var(--display);font-size:1rem;color:var(--pine)}
.stage{margin-top:14px}
.stage.newpage{break-before:page}
.stage h2{font-size:1.3rem;display:flex;align-items:baseline;gap:10px;margin-bottom:10px;border-bottom:2px solid var(--line);padding-bottom:6px;break-after:avoid}
.stage-no{background:var(--terra);color:#fff;border-radius:999px;padding:0 10px;font-size:.85rem}
.range{color:var(--muted);font-family:var(--body);font-size:.8rem;font-weight:600;margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(var(--cols),1fr)}
.card{border:2px dashed #c9bfa8;padding:10px 12px 8px;display:flex;flex-direction:column;gap:6px;break-inside:avoid;min-height:150px}
.card header{display:flex;justify-content:space-between;align-items:center}
.mc{font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--pine)}
.num{font-family:var(--display);font-weight:800;font-size:1.3rem;line-height:1;color:var(--terra)}
.fact{margin:0;font-size:.8rem;line-height:1.35}
.fact b{color:var(--pine)}
.clue{font-family:var(--display);font-weight:700;font-size:.98rem;line-height:1.28;margin:0;border-top:1px dashed var(--line);padding-top:6px}
.plabel{display:block;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--terra)}
.puz{display:block;font-size:1.12rem;letter-spacing:.04em;margin:2px 0 4px;font-variant-numeric:tabular-nums}
.phint{display:block;font-weight:600;font-size:.85rem;color:var(--muted)}
.pic{font-family:var(--emoji);font-size:2.4rem;line-height:1;text-align:center;margin:2px 0}
.challenge{margin:0;background:#f5ebdd;border-left:4px solid var(--amber);padding:3px 8px;border-radius:5px;font-size:.78rem}
.card footer{margin-top:auto;font-size:.62rem;color:#8a8576;border-top:1px solid var(--line);padding-top:5px;font-style:italic}
.ra .clue{font-size:1.1rem}
.key{break-before:page}
.key h2{font-size:1.4rem;margin-bottom:4px}
.key p{color:var(--muted);margin:0 0 10px;font-size:.9rem}
table{width:100%;border-collapse:collapse;font-size:.82rem}
th,td{text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}
th{color:var(--pine);font-family:var(--display)}
tr.prize td{color:var(--terra);font-weight:700}
.cert{break-before:page;border:6px double var(--terra);border-radius:18px;padding:40px 28px;text-align:center;display:grid;gap:12px;margin-top:20px}
.cert h2{font-size:2.1rem;color:var(--pine)}
.cert .name{border-bottom:2px solid var(--ink);width:70%;margin:22px auto 4px;height:34px}
.cert small{color:var(--muted)}
.footer-note{color:var(--muted);font-size:.8rem;margin-top:8px}
"""

STEPS = {
    "readaloud": [
        "Print the chits and cut along the dashed lines. Fold each one in half.",
        "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
        "Read chit 1 aloud. Do the action together, then let your little one use the picture to find the next chit.",
        "Each chit is a mini lesson: read the fact, talk about it, then go hunting. Plan on 30 to 45 minutes.",
    ],
    "rhyme": [
        "Print the chits and cut along the dashed lines. Fold each one in half.",
        "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
        "Hand chit 1 to your explorer. Read the fact together, then solve the rhyming clue to find the next chit.",
        "Plan on 40 to 60 minutes. Early readers may want help with the fact; let them try the clue first.",
    ],
    "puzzle": [
        "Print the chits and cut along the dashed lines. Fold each one in half.",
        "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
        "Cut out the Decoder Card and hand it over with chit 1. Each puzzle names the next hiding spot.",
        "Plan on 60 to 90 minutes, or play one or two stages a day.",
    ],
}
HEADER = {"readaloud": "Grown-up reads aloud", "rhyme": "Explorer clue", "puzzle": "Mission card"}
COLS = {"readaloud": 2, "rhyme": 3, "puzzle": 3}


def render(h):
    slug, chits, mode = h["slug"], h["chits"], h["mode"]
    n = len(chits)
    spots = [c["spot"] for c in chits]
    assert len(set(s.lower() for s in spots)) == n, (slug, "duplicate spots", [s for s in spots if spots.count(s) > 1])
    clues = []
    for i, c in enumerate(chits):
        text, word = build_clue(c, i + 1, slug)
        clues.append((text, word))
    stages = h["stages"]
    body = ""
    for si, (name, start) in enumerate(stages):
        end = stages[si + 1][1] - 1 if si + 1 < len(stages) else n
        brk = 'newpage' if (si == 0 or mode == 'readaloud') else ''
        body += f'<section class="stage {brk}"><h2><span class="stage-no">Part {si+1}</span> {e(name)} <span class="range">Chits {start}–{end}</span></h2><div class="grid" style="--cols:{COLS[mode]}">'
        for k in range(start, end + 1):
            c = chits[k - 1]
            clue = clues[k - 1][0]
            if "puzzle" in c:
                kind, word, hint = c["puzzle"]
                label, puzzle = clue.split(": ", 1)
                puzzle = puzzle[: len(puzzle) - len(hint)].rstrip().rstrip(".")
                clue_html = f'<p class="clue"><span class="plabel">{e(label)}</span><span class="puz">{e(puzzle)}</span><span class="phint">{e(hint)}</span></p>'
            else:
                clue_html = f'<p class="clue">{e(clue)}</p>'
            hide = "Give to your explorer to start" if k == 1 else f"Hide in: {e(spots[k-2])}"
            pic = f'<div class="pic" aria-hidden="true">{c["pic"]}</div>' if c.get("pic") else ""
            act_label = "Do it!" if mode == "readaloud" else "Before you search:"
            chal = f'<p class="challenge"><b>{act_label}</b> {e(c["challenge"])}</p>' if c.get("challenge") else ""
            body += (f'<article class="card {"ra" if mode=="readaloud" else ""}"><header><span class="mc">{HEADER[mode]}</span>'
                     f'<span class="num">#{k}</span></header><p class="fact"><b>Did you know?</b> {e(c["fact"])}</p>'
                     f'{chal}{clue_html}{pic}<footer>{hide}</footer></article>')
        body += "</div></section>"
    rows = "".join(
        f"<tr><td>{k}</td><td>{'Hand to child' if k==1 else e(spots[k-2])}</td><td>{e(spots[k-1])}</td></tr>"
        for k in range(1, n + 1))
    rows += f'<tr class="prize"><td>Prize</td><td>{e(spots[-1])}</td><td>Hunt complete!</td></tr>'
    words = [w for _, w in clues if w]
    decoder = ""
    if mode == "puzzle":
        decoder = ('<section class="decoder"><div class="mc">Decoder Card · cut me out</div><div class="dgrid">'
                   + "".join(f"<span><b>{chr(65+i)}</b>{i+1}</span>" for i in range(26)) + "</div></section>")
    learn_items = "".join(f"<li>{e(x)}</li>" for x in h["learns"])
    page = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{e(h['title'])}</title><style>{CSS}</style></head><body>
<div class="kicker">Compass by Vavy · Free printable · Ages {e(h['ages'])} · {n} chits</div>
<h1>{e(h['title'])}</h1><p class="lede">{e(h['lede'])}</p>
<div class="learn"><b>What your child learns</b><ul>{learn_items}</ul></div>
<ol class="how">{''.join(f'<li>{e(s)}</li>' for s in STEPS[mode])}</ol>
<p class="footer-note">Missing one of the hiding spots at home? Swap it: rewrite that chit's clue and the hiding note on the chit before it. More family activities at <b>compassbyvavy.ca</b></p>
{decoder}{body}
<section class="key"><h2>Grown-up answer key</h2><p>Use this list to set up. Keep it away from your explorer.</p>
<table><thead><tr><th>Chit</th><th>Hide it in</th><th>The clue leads to</th></tr></thead><tbody>{rows}</tbody></table></section>
<section class="cert"><div class="mc">Compass by Vavy</div><h2>{e(h['cert_title'])}</h2><p>This certifies that</p><div class="name"></div>
<p>{e(h['cert_text'])}</p><small>Date: ______________ &nbsp;&nbsp; Signed: ______________</small><small>More family activities at compassbyvavy.ca</small></section>
</body></html>"""
    return page, words


def main(out_dir, modules):
    out = pathlib.Path(out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    meta = []
    for mod in modules:
        m = __import__(mod)
        for h in m.HUNTS:
            page, words = render(h)
            hp = out / f"{h['slug']}.html"
            hp.write_text(page)
            pdf = out / f"{h['slug']}.pdf"
            subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                            "--virtual-time-budget=4000", f"--print-to-pdf={pdf}", hp.as_uri()],
                           check=True, capture_output=True, timeout=120)
            meta.append(dict(slug=h["slug"], title=h["title"], ages=h["ages"], chits=len(h["chits"]), words=words))
            print("ok", h["slug"], len(h["chits"]))
    (out / "meta.json").write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
