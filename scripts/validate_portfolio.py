"""Check curated export structure, links, scene geometry and common leak signatures.

This bounded scan supplements manual review. It cannot prove absence of private data.
Only Git-selected files are scanned; ignored local preparation records stay private.
"""
from __future__ import annotations

import json
import re
import struct
import subprocess
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = ["script-factory", "onboarding", "context-os", "crm-integration",
            "reconciliation", "lead-research", "campaign-infrastructure", "call-intelligence"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def files_to_check():
    result = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
                            cwd=ROOT, check=True, capture_output=True)
    return sorted({ROOT / name.decode() for name in result.stdout.split(b"\0") if name})


def check_scene(slug):
    path = ROOT / "diagrams" / (slug + ".excalidraw")
    scene = json.loads(path.read_text())
    require(scene["type"] == "excalidraw" and scene["version"] == 2, f"Invalid scene: {slug}")
    require(not scene["files"], f"Unexpected embedded files: {slug}")
    by_id = {element["id"]: element for element in scene["elements"]}
    require(len(by_id) == len(scene["elements"]), f"Duplicate scene IDs: {slug}")
    for item in by_id.values():
        x, y, w, h = (item[k] for k in ("x", "y", "width", "height"))
        if item["type"] != "arrow":
            require(0 <= x <= x + w <= 1900 and 0 <= y <= y + h <= 980,
                    f"Element outside preview: {slug}/{item['id']}")
        if item["type"] == "text" and item["containerId"]:
            box = by_id[item["containerId"]]
            require(box["x"] <= x and x + w <= box["x"] + box["width"] and
                    box["y"] <= y and y + h <= box["y"] + box["height"],
                    f"Text exceeds container: {slug}/{item['id']}")
        for binding in item.get("boundElements", []):
            require(binding["id"] in by_id, f"Missing bound element: {slug}")
        if item["type"] == "arrow":
            for key in ("startBinding", "endBinding"):
                target = item[key]["elementId"]
                require(target in by_id, f"Missing arrow target: {slug}")
                require(any(b["id"] == item["id"] for b in by_id[target]["boundElements"]),
                        f"Non-reciprocal binding: {slug}/{item['id']}")
            require(all(0 <= x + p[0] <= 1900 and 0 <= y + p[1] <= 980 for p in item["points"]),
                    f"Arrow outside preview: {slug}")
    png = (path.with_suffix(".png")).read_bytes()
    require(png[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", png[16:24]) == (1900, 980),
            f"Invalid PNG dimensions: {slug}")


def check_links(path, text):
    for target in re.findall(r"\]\(([^\s)]+)\)", text):
        if target.startswith(("https://", "http://", "mailto:")):
            continue
        filename, _, anchor = unquote(target).partition("#")
        resolved = (path.parent / filename).resolve() if filename else path
        require(resolved.is_relative_to(ROOT), f"Link escapes export: {path.relative_to(ROOT)}")
        require(resolved.exists(), f"Missing link: {path.relative_to(ROOT)} -> {target}")
        if anchor and resolved.suffix == ".md":
            headings = re.findall(r"^#+\s+(.+)$", resolved.read_text(), flags=re.M)
            ids = [re.sub(r"[^\w\- ]", "", h.lower()).replace(" ", "-") for h in headings]
            require(anchor in ids, f"Missing anchor: {path.relative_to(ROOT)} -> {target}")


def main():
    paths = files_to_check()
    signatures = [r"gh[pousr]_[A-Za-z0-9]{30,}", r"github_pat_[A-Za-z0-9_]{40,}",
                  r"sk-[A-Za-z0-9_-]{24,}", r"AKIA[A-Z0-9]{16}",
                  r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}",
                  r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"]
    private_markers = ["oa-brain" + "-config", "n8n-outbound" + "acceleration.tech",
                       "/Users/" + "danielgreenberg/", "op:" + "//"]
    for path in paths:
        require(not path.is_symlink(), f"Symlink in export: {path.relative_to(ROOT)}")
        require(path.exists(), f"Selected file missing: {path.relative_to(ROOT)}")
        if path.suffix == ".png":
            continue
        content = path.read_text()
        require("\u2014" not in content, f"Em dash: {path.relative_to(ROOT)}")
        require(not any(re.search(p, content) for p in signatures),
                f"Credential-like material: {path.relative_to(ROOT)}")
        require(not any(p in content for p in private_markers),
                f"Private source marker: {path.relative_to(ROOT)}")
        if path.suffix == ".md":
            check_links(path, content)
    for chapter in CHAPTERS:
        document = ROOT / "systems" / chapter / "README.md"
        require(document.exists(), f"Missing chapter: {chapter}")
        require("## Worked example" in document.read_text(), f"Missing example: {chapter}")
    for slug in ["overview", *CHAPTERS]:
        check_scene(slug)
    print(f"Validated {len(paths)} selected files, 8 chapters, 9 editable scenes and 9 PNG previews.")


if __name__ == "__main__":
    main()
