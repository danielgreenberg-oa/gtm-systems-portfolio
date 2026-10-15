"""Build editable Excalidraw scenes and matching PNGs from public diagram specs.

New portfolio tooling, not production code. Requires Pillow only for PNG rendering.
The PNG renderer uses the same element geometry and text as the saved scene.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "diagrams"
WIDTH, HEIGHT = 1900, 980
INK = "#1c2f43"
COLORS = {
    "trigger": ("#edf8f2", "#367454"),
    "process": ("#eaf2fb", "#436d9a"),
    "decision": ("#fff5d8", "#9b7726"),
    "human": ("#f2ecfb", "#795ca2"),
    "store": ("#edf0f4", "#62758a"),
    "output": ("#e5f5ed", "#367454"),
    "recovery": ("#fff0e8", "#b56639"),
}


def font(size: int):
    for name in ("/System/Library/Fonts/Supplemental/Arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    raise RuntimeError("Install Arial or DejaVu Sans to render the diagrams")


def base(identifier, kind, x, y, w, h):
    seed = int(hashlib.sha256(identifier.encode()).hexdigest()[:7], 16)
    return dict(id=identifier, type=kind, x=x, y=y, width=w, height=h, angle=0,
                strokeColor=INK, backgroundColor="transparent", fillStyle="solid",
                strokeWidth=2, strokeStyle="solid", roughness=0, opacity=100,
                groupIds=[], frameId=None, roundness=None, seed=seed, version=1,
                versionNonce=seed, isDeleted=False, boundElements=[], updated=1,
                link=None, locked=False)


def build(spec):
    elements, boxes = [], {}

    def text(identifier, value, x, y, size=24, color=INK, center=False, container=None):
        face = font(size)
        lines = value.splitlines()
        width = max(face.getlength(line) for line in lines) + 4
        height = len(lines) * size * 1.25
        item = base(identifier, "text", x - width / 2 if center else x, y, width, height)
        item.update(text=value, originalText=value, fontSize=size, fontFamily=2,
                    textAlign="center" if center else "left", verticalAlign="middle",
                    containerId=container, autoResize=True, lineHeight=1.25,
                    strokeColor=color)
        elements.append(item)
        return item

    text("title", spec["title"], 60, 48, 44)
    text("subtitle", spec["subtitle"], 60, 112, 24, "#4e6277")
    text("flow-label", spec.get("flow_label", "MAIN FLOW  /  left to right"), 60, 195, 18, "#4e6277")

    for node in spec["nodes"]:
        x = 60 + node["column"] * 370
        y = 250 if node.get("row", 0) == 0 else 650
        shape = base(node["id"], "rectangle", x, y, 300, 160)
        fill, stroke = COLORS[node["kind"]]
        shape.update(backgroundColor=fill, strokeColor=stroke,
                     roundness={"type": 3}, link=node.get("link"))
        elements.append(shape)
        label = node["kind"].upper() + "\n" + node["text"]
        label_height = len(label.splitlines()) * 22 * 1.25
        t = text(node["id"] + "-text", label, x + 150, y + (160 - label_height) / 2,
                 22, center=True, container=node["id"])
        if t["width"] > 274:
            raise ValueError(f"Text too wide: {spec['slug']}/{node['id']}")
        shape["boundElements"].append({"id": t["id"], "type": "text"})
        boxes[node["id"]] = shape

    for i, edge in enumerate(spec["edges"]):
        a, b = boxes[edge["from"]], boxes[edge["to"]]
        if "points" in edge:
            points = edge["points"]
        elif a["y"] == b["y"]:
            points = [[a["x"] + 312, a["y"] + 80], [b["x"] - 12, b["y"] + 80]]
        elif a["y"] < b["y"]:
            lane = edge.get("lane", 505)
            points = [[a["x"] + 150, a["y"] + 172], [a["x"] + 150, lane],
                      [b["x"] + 150, lane], [b["x"] + 150, b["y"] - 12]]
        else:
            lane = edge.get("lane", 555)
            points = [[a["x"] + 150, a["y"] - 12], [a["x"] + 150, lane],
                      [b["x"] + 150, lane], [b["x"] + 150, b["y"] + 172]]
        # Remove adjacent duplicate vertices without changing the route.
        points = [p for j, p in enumerate(points) if j == 0 or p != points[j - 1]]
        x, y = points[0]
        arrow = base("edge-" + str(i), "arrow", x, y,
                     max(p[0] for p in points) - min(p[0] for p in points),
                     max(p[1] for p in points) - min(p[1] for p in points))
        arrow.update(points=[[p[0] - x, p[1] - y] for p in points],
                     startBinding={"elementId": a["id"], "focus": 0, "gap": 12},
                     endBinding={"elementId": b["id"], "focus": 0, "gap": 12},
                     startArrowhead=None, endArrowhead="arrow", elbowed=False,
                     strokeColor="#56718c", strokeStyle="dashed" if edge.get("dashed") else "solid")
        elements.append(arrow)
        for shape in (a, b):
            shape["boundElements"].append({"id": arrow["id"], "type": "arrow"})
        if "label" in edge:
            lx, ly = edge["label_at"]
            text("edge-label-" + str(i), edge["label"], lx, ly, 19, "#4e6277")

    text("example", spec["example"], 60, 860, 23)
    text("scope", spec["scope"], 60, 912, 19, "#4e6277")
    scene = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
             "elements": elements, "appState": {"viewBackgroundColor": "#ffffff",
             "gridSize": None}, "files": {}}
    (OUT / (spec["slug"] + ".excalidraw")).write_text(json.dumps(scene, indent=2) + "\n")
    render(scene, OUT / (spec["slug"] + ".png"))


def render(scene, destination):
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(canvas)
    for item in scene["elements"]:
        x, y, w, h = (item[k] for k in ("x", "y", "width", "height"))
        color = item["strokeColor"]
        if item["type"] == "rectangle":
            draw.rounded_rectangle((x, y, x + w, y + h), radius=14,
                                   fill=item["backgroundColor"], outline=color, width=2)
        elif item["type"] == "text":
            face = font(item["fontSize"])
            for row, line in enumerate(item["text"].splitlines()):
                tx = x + (w - face.getlength(line)) / 2 if item["textAlign"] == "center" else x
                draw.text((tx, y + row * item["fontSize"] * 1.25), line, font=face,
                          fill=color, anchor="lt")
        elif item["type"] == "arrow":
            points = [(x + p[0], y + p[1]) for p in item["points"]]
            for start, end in zip(points, points[1:]):
                if item["strokeStyle"] == "dashed":
                    length = math.dist(start, end)
                    for offset in range(0, int(length), 14):
                        lo, hi = offset / length, min(offset + 8, length) / length
                        draw.line([(start[0] + (end[0] - start[0]) * t,
                                    start[1] + (end[1] - start[1]) * t) for t in (lo, hi)],
                                  fill=color, width=2)
                else:
                    draw.line((start, end), fill=color, width=2)
            end, prior = points[-1], points[-2]
            angle = math.atan2(end[1] - prior[1], end[0] - prior[0])
            for side in (-0.45, 0.45):
                tip = (end[0] - 14 * math.cos(angle + side), end[1] - 14 * math.sin(angle + side))
                draw.line((end, tip), fill=color, width=2)
    canvas.save(destination, optimize=True)


if __name__ == "__main__":
    for board in json.loads((OUT / "specs.json").read_text()):
        build(board)
        print("Built " + board["slug"])
