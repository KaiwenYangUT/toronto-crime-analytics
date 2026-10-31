# Comprehension test, P10 (R4)

Method (plan section 8a): for each page a fresh subagent playing "a curious Toronto resident with no statistics training" saw only two screenshots (1280x800 and 375x812 fold, light mode; `reviews/shots/r4/*-fold.png`) and answered: main finding, what to click next, does anything suggest where crime is dangerous, what is confusing. A page passes when the finding matches the H1's meaning and the answer to the third question is no. The testers are model stand-ins, not people.

| Page | Finding matches H1 | "Dangerous areas?" | Result |
|---|---|---|---|
| Overview | yes (the kind of place tells far more than time; 0.197 to 0.531) | no | pass |
| Explore | yes (clusters downtown, evening peak) at 1280; at 375 only the map shows, the evening half has no visual | "Mostly no": the "not risk" note is small grey text, the big yellow downtown clusters could still read as "the bad part", and no map legend is visible on the phone | **pass with a fix needed** |
| Explain | yes (after 2019 much less likely to be a robbery) | no ("an association, not a measure of risk" helped) | pass |
| Predict | yes (premises, not time) at both widths | no | pass |
| Paper | yes (time effects clear, time alone predicts little) | no | pass |
| Methods | yes (one cleaned dataset feeds everything); reads as data preparation | no | pass |
| About | yes (three course projects rebuilt as one analysis); no crime finding, as expected | no | pass |

## What to fix (feeds the R4 fix round)
1. **Jargon, every page except About/Methods:** PR-AUC, ROC-AUC, odds ratio ("0.55 times the odds"), CI, "grouped cross-validation", "95% intervals that exclude no effect", "held-out neighbourhoods", "log scale", "cluster-robust". One plain gloss on first use.
2. **Explore:** make "reported incidents, not risk" more visible than small grey text; show a map legend/colour key on the phone first screen; "records" vs "distinct event IDs" (two close numbers) needs a one-line gloss.
3. **Phone folds:** Predict chart starts at the bottom edge and has no visible legend for filled vs hollow dots; Explain chart is cut off at the bottom and its left axis label is clipped; Explain's 0.55 card is not visible on the phone first screen; Overview "Guessing: 16.1%" label sits against the "Time only" row label.
4. **Paper:** the PDF preview shows as a big empty grey box in headless Chromium (no PDF viewer there); it could look broken to a reader whose browser blocks embedded PDFs, so give the frame a visible fallback text/link.
5. **Methods:** the "On this page" list squeezes "Explore counts" beside "Models and evaluation" on the phone; "unified table" and "checksums" are jargon.
6. **About:** course codes (JSC370, STA303, STA313) mean nothing to a general reader; "checked analysis" is vague.
