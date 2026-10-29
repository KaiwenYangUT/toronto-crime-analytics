"""Compare the JSC370 R re-run with the published table (Final_Project/model.html, 7 decimals).
Standard library only. Run from the repo root: python3 -I parity/r/compare_jsc370_published.py"""
import csv
import json

PUBLISHED = {  # parity/inventory/jsc370.md, "Published performance table"
    "GLM": (0.8382214, 0.8324639, 0.6756757, 0.0294811, 0.0564972),
    "Classification Tree": (0.8417477, 0.8342697, 0.5916667, 0.0837264, 0.1466942),
    "Bagging": (0.9980218, 0.8733949, 0.6817420, 0.4799528, 0.5633218),
    "Random Forest": (0.9973338, 0.8836276, 0.7723577, 0.4481132, 0.5671642),
    "Boosting": (0.8395975, 0.8338684, 0.7631579, 0.0341981, 0.0654628),
    "XGBoosting": (0.8879333, 0.8430979, 0.5993976, 0.2346698, 0.3372881),
}
COLS = ("Train_Accuracy", "Test_Accuracy", "Precision", "Recall", "F1_Score")
PUBLISHED_MATRICES = {  # TN, FP, FN, TP (test); GBM and XGB were not printed in the original
    "glm_test": (4124, 12, 823, 25), "tree_test": (4087, 49, 777, 71),
    "bag_test": (3946, 190, 441, 407), "rf_test": (4024, 112, 468, 380)}
base = "parity/r_outputs/jsc370/"
rows = list(csv.DictReader(open(base + "summary_table.csv")))
out, worst = [], 0.0
for r in rows:
    for col, pub in zip(COLS, PUBLISHED[r["Model"]]):
        rerun = float(r[col])
        diff = round(rerun, 7) - pub
        worst = max(worst, abs(diff))
        out.append({"model": r["Model"], "metric": col, "published": f"{pub:.7f}",
                    "rerun": f"{rerun:.17g}", "rerun_rounded_7dp": f"{round(rerun, 7):.7f}",
                    "diff_at_7dp": f"{diff:.7f}"})
cms = json.load(open(base + "confusion_matrices.json"))
mat = {}
for k, pub in PUBLISHED_MATRICES.items():
    c = cms[k]["counts"]  # column-major: [TN, FN, FP, TP] for Actual rows x Predicted cols
    got = (c[0], c[2], c[1], c[3])
    mat[k] = {"published": pub, "rerun": got, "equal": got == pub}
with open(base + "published_vs_rerun.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0]))
    w.writeheader()
    w.writerows(out)
json.dump({"max_abs_diff_at_7dp": worst, "matrices": mat}, open(base + "published_vs_rerun.json", "w"), indent=1)
print("max |diff| at 7 dp:", worst)
for k, v in mat.items():
    print(k, "equal" if v["equal"] else "DIFFERENT", v["rerun"])
