"""Record the toolchain used by this machine without regenerating model results."""

import importlib.metadata
import json
import platform
import subprocess
from pathlib import Path


def output(*args: str) -> str:
    try:
        return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).splitlines()[0]
    except (OSError, subprocess.CalledProcessError) as exc:
        return f"unavailable: {exc}"


record = {
    "recorded": "2026-10-29",
    "hostname": platform.node(),
    "platform": platform.platform(),
    "python": platform.python_version(),
    "r": output("R", "--version"),
    "node": output("node", "--version"),
    "npm": output("npm", "--version"),
    "tectonic": output("tectonic", "--version"),
    "git": output("git", "--version"),
    "python_packages": {
        name: importlib.metadata.version(name)
        for name in (
            "pandas",
            "pyarrow",
            "pandera",
            "statsmodels",
            "scikit-learn",
            "xgboost",
            "scipy",
            "altair",
            "vl-convert-python",
            "pytest",
            "ruff",
            "openpyxl",
        )
    },
}
target = Path("build/tool-versions.json")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record, indent=2))
