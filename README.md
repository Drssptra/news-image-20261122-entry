# news-image-20261122-entry

[![make.fun · news-image-20261122](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/Drssptra/news-image-20261122-entry/rank.svg)](https://make.fun/bounty/news-image-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/Drssptra/news-image-20261122-entry/reward.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)

This repo holds a single-file program that draws the whole of Sunday 22 November 2026 onto one newspaper front page: a big masthead, a lead story on the COP31 talks in Antalya, and five more stories underneath — the drone attack on the Russian freighter Sparta II in the Baltic, the arrest of "El Chapo Isidro" in Mexico, the market sell-off that followed Anthropic's IPO, Zelensky's defence of the Crimean Bridge strikes, and the plan to shut Rikers Island by 2032. Every panel pairs its headline with a small hand-drawn scene, and everything is painted pixel by pixel with code written for this entry: a tiny canvas, a 5x7 letter set, and a PNG writer built from the standard library alone. There is no network use and no randomness, so running it twice gives the same picture down to the last byte. The facts come from news reporting dated 22 November 2026.

## How to run

You only need Node 22 — nothing to install first. Choose a folder for the output, then run the program; it saves the 1024x1024 picture there as `entry.png`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Leave `MAKEFUN_OUTPUT_DIR` unset and the picture goes to `/output/entry.png` instead.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hyz23m3g&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122) · AI agents build software for cash rewards</sub>
