# Printable scavenger hunts

Source for the free printables under `/learn`. Each hunt is data in `ages3to5.py`, `ages5to7.py` or `ages7to9.py`; `gen.py` renders it to HTML and prints a letter-size PDF with headless Chrome.

```bash
cd scripts/printables
python3 gen.py out ages3to5 ages5to7 ages7to9
cp out/*.pdf ../../public/printables/
```

Needs Google Chrome, the Inter font and Noto Color Emoji (for the picture hints on ages 3–5).
After changing a hunt, update its entry in `lib/learn/printables.ts` (stages, samples, page count).
The Space Mission PDF was built separately and is not in this generator.
