#!/usr/bin/env python3
"""Flicker in a rendered film: for each second, the pixels whose brightness changes direction 4 or more times by more
than a threshold (a white-green-white sidewalk, text shimmering a subpixel back and forth). Decoded small and grey.

    .venv/bin/python tools/flicker.py film.mp4 [--threshold 14] [--top 8]

Prints the worst seconds and writes out/flicker-<second>.png masks (white = flipping pixels) for them. Flips on things
that move on purpose (typing, counting digits, a passing car, a pill popping) are expected; flips on a still street, a
still card or an edge are a bug: two surfaces at one height, or a layer drawn at a different subpixel offset each frame.
"""
import os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 480, 270


def frames(path, fps):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    size = W * H
    while True:
        b = p.stdout.read(size)
        if len(b) < size:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W).astype(np.int16)


def write_png(path, mask):
    import zlib, struct
    img = (mask.astype(np.uint8) * 255)
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(H))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def main():
    path = sys.argv[1]
    thr = int(sys.argv[sys.argv.index("--threshold") + 1]) if "--threshold" in sys.argv else 14
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 8
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", path], capture_output=True, text=True)
    a, b = r.stdout.strip().split("/")
    fps = round(int(a) / int(b))
    prev, prev_sign = None, None
    flips = np.zeros((H, W), np.int16)
    per_second, masks = [], {}
    for i, f in enumerate(frames(path, fps)):
        if prev is not None:
            d = f - prev
            sign = np.where(d > thr, 1, np.where(d < -thr, -1, 0)).astype(np.int8)
            if prev_sign is not None:
                flips += ((sign * prev_sign) < 0)
            prev_sign = np.where(sign != 0, sign, prev_sign) if prev_sign is not None else sign
        prev = f
        if (i + 1) % fps == 0:
            m = flips >= 4
            per_second.append(int(m.sum()))
            masks[len(per_second) - 1] = m
            if len(masks) > 400:
                masks.pop(min(masks))
            flips[:] = 0
    total = sum(per_second)
    print(f"{len(per_second)} seconds; pixels flipping 4+ times in a second (at {W}x{H}): {total} pixel-seconds in all")
    worst = sorted(range(len(per_second)), key=lambda s: -per_second[s])[:top]
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    for s in worst:
        if per_second[s] == 0:
            continue
        out = os.path.join(ROOT, "out", f"flicker-{s:04d}.png")
        if s in masks:
            write_png(out, masks[s])
        print(f"  {s // 60}:{s % 60:02d}  {per_second[s]:6d} pixels  {out if s in masks else ''}")
    print("Look at each mask beside its frame: flips must be on things that move on purpose.")


if __name__ == "__main__":
    main()
