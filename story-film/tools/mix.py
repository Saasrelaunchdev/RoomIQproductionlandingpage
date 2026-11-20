#!/usr/bin/env python3
"""The film's sound: the narration, a quiet music bed that follows the story's moods, and effects on beats the picture
shows. All synthesised here (nothing to license); swap in licensed music by writing it to out/music.wav (see --music).
The music ducks under the voice; the mix is normalised (two-pass EBU R128) to film.config.json "loudness".

    .venv/bin/python tools/mix.py            audio/mix.wav (48 kHz stereo, not committed) and a measurement report
    .venv/bin/python tools/mix.py --music path/to/licensed.wav   use a licensed bed instead of the synthesised one

script.json:
  "music": { "key": "C", "tempo": 84, "gain": 0.13,
             "sections": [ { "at": "start", "mood": "warm" }, { "at": "C1", "mood": "tense" }, { "at": "E1", "mood": "lift" },
                           { "at": "G1", "mood": "resolve" } ] }
  "sfx":   [ { "at": "A2:customer", "kind": "pop" }, { "at": "C5:calls+0.45", "kind": "ringback", "dur": 1.3 },
             { "at": 70.5, "kind": "chime", "notes": ["C5", "E5", "G5", "C6"] } ],
  "sfxGain": 0.8
Cues ("at"): seconds; "start"; a line id (its start); "ID.end"; "ID:word" (when the word starts); each with an optional
+/- offset ("D2-0.25", "C5:calls+0.45").
Moods: warm, wistful, tense, sparse, lift, resolve.  Effects: pop, whoosh, whoosh-down, chime (notes), ding,
success, ring (dur), ringback (dur), drip, tick, swell (dur).

Targets the report checks (measured on the stems, since you cannot listen): music 15 to 20 dB under the voice while it
speaks and 12 to 15 dB under in the pauses; effects peaks about 10 dB under the voice's peaks.
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
rng = np.random.default_rng(7)
config = json.load(open(os.path.join(ROOT, "film.config.json")))
script = json.load(open(os.path.join(ROOT, "script.json")))
tm = json.load(open(os.path.join(ROOT, "audio", "timings.json")))
DUR = tm["duration"]
N = int(DUR * SR) + SR
L = {l["id"]: l for l in tm["lines"]}
norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())


def cue(at):
    """seconds | "start" | "ID" | "ID.end" | "ID:word", each with an optional +/- offset"""
    if isinstance(at, (int, float)):
        return float(at)
    m = re.match(r"^([^+\-]+?)([+\-][\d.]+)?$", str(at).strip())
    base, off = m.group(1), float(m.group(2) or 0)
    if base == "start":
        return off
    if ":" in base:
        lid, word = base.split(":", 1)
        l = L[lid]
        for x in l.get("words", []):
            if norm(x["w"]) == norm(word):
                return x["t"] + off
        i = l["text"].lower().find(word.lower())
        if i < 0:
            raise SystemExit(f"cue {at}: '{word}' is not in line {lid}")
        return l["start"] + (l["end"] - l["start"]) * i / len(l["text"]) + off
    if base.endswith(".end"):
        return L[base[:-4]]["end"] + off
    return L[base]["start"] + off


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    m = re.match(r"([A-G][#b]?)(-?\d)", note)
    return 440.0 * 2 ** ((names[m.group(1)] + 12 * (int(m.group(2)) + 1) - 69) / 12)


def lp(x, cut, order=2): return sosfilt(butter(order, cut, "low", fs=SR, output="sos"), x)
def hp(x, cut, order=2): return sosfilt(butter(order, cut, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def put(bus, t, sig, gain=1.0, pan=0.0):
    a = int(t * SR)
    if a >= N or a + 1 < 0:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    b = min(N, a + len(sig))
    bus[a:b] += sig[: b - a] * gain


def env(n, a, sustain=1.0, release=None):
    e = np.ones(n) * sustain
    ai = max(1, int(a * SR))
    e[:ai] = np.linspace(0, 1, ai) ** 1.5 * sustain
    if release:
        ri = max(1, int(release * SR))
        e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e


# ---------------------------------------------------------------------------------------------------------- music
music = script.get("music", {})
TEMPO = float(music.get("tempo", 84))
BEAT = 60.0 / TEMPO
BAR = BEAT * 4
SHIFT = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": -5, "Ab": -4, "A": -3, "Bb": -2, "B": -1}[music.get("key", "C")]
# chords written in C (major) and its relative minor, moved to the film's key
CH = {"C": ["C3", "E3", "G3"], "Am": ["A2", "C3", "E3"], "F": ["F2", "A2", "C3"], "G": ["G2", "B2", "D3"], "Dm": ["D3", "F3", "A3"],
      "Em": ["E2", "G2", "B2"], "E": ["E2", "G#2", "B2"], "Gsus": ["G2", "C3", "D3"], "Fmaj7": ["F2", "A2", "C3", "E3"], "Cadd9": ["C3", "D3", "G3"]}
ROOT_OF = {"C": "C2", "Am": "A1", "F": "F1", "G": "G1", "Dm": "D2", "Em": "E2", "E": "E2", "Gsus": "G1", "Fmaj7": "F1", "Cadd9": "C2"}
MOODS = {
    "warm":    dict(chords=["C", "Am", "F", "G"], pad=0.045, arp=0.05, step=0.5, oct=1, bass=0.07),
    "wistful": dict(chords=["Am", "F", "C", "Gsus"], pad=0.042, arp=0.035, step=1.0, oct=1, bass=0.07),
    "tense":   dict(chords=["Am", "F", "Dm", "E"], pad=0.05, arp=0.028, step=1.0, oct=0, bass=0.08, pulse=0.05),
    "sparse":  dict(chords=["Am", "F", "C", "G"], pad=0.04, arp=0.0, bass=0.06),
    "lift":    dict(chords=["C", "G", "Am", "F"], pad=0.045, arp=0.05, step=0.5, oct=1, bass=0.075, shaker=0.012),
    "resolve": dict(chords=["Fmaj7", "G"], pad=0.05, arp=0.045, step=0.5, oct=1, bass=0.08, hold="C"),
}


def f_of(note):
    return hz(note) * 2 ** (SHIFT / 12)


def pad_note(f, dur, gain):
    n = int((dur + 1.6) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch, det in enumerate((-0.0035, 0.0035)):
        x = np.zeros(n)
        for k in (1, 3, 5, 7):
            x += np.sin(2 * np.pi * f * (1 + det) * k * t + rng.random() * 6.28) / (k * k)
        x += 0.5 * np.sin(2 * np.pi * f * 2.001 * t)
        out[:, ch] = x
    e = env(n, 0.9, 1.0, release=1.6) * (1 + 0.06 * np.sin(2 * np.pi * 0.23 * t))
    return out * e[:, None] * gain


def pluck(f, gain, decay=0.55):
    n = int(decay * 5 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / (decay * 0.35))
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / (decay * 0.18)))
    return x * np.exp(-t / decay) * np.minimum(1, t / 0.004) * gain


def bass(f, dur, gain):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return x * env(n, 0.06, 1.0, release=0.5) * np.exp(-t / (dur * 1.6)) * gain


def section(bus, start, end, m):
    t, i = start, 0
    while t < end - 0.2:
        ch = m["chords"][i % len(m["chords"])]
        dur = min(BAR, end - t)
        for nm in CH[ch]:
            put(bus, t, pad_note(f_of(nm) * 2, dur, m["pad"]), pan=rng.uniform(-0.3, 0.3))
        put(bus, t, bass(f_of(ROOT_OF[ch]), dur, m.get("bass", 0.07)))
        if m.get("arp", 0) > 0:
            notes = [f_of(n) * 2 ** m.get("oct", 1) for n in CH[ch]]
            seq = [notes[0], notes[1], notes[2], notes[1] * 2 if len(notes) < 4 else notes[3], notes[2], notes[1], notes[0] * 2, notes[2]]
            k = 0
            while k * m["step"] * BEAT < dur - 0.05:
                put(bus, t + k * m["step"] * BEAT, pluck(seq[k % len(seq)], m["arp"] * (1.0 if k % 2 == 0 else 0.72)), pan=0.35 * np.sin(k * 1.3))
                k += 1
        for b in range(4):
            if m.get("pulse") and b * BEAT < dur:
                n = int(0.35 * SR); tt = np.arange(n) / SR
                put(bus, t + b * BEAT, np.sin(2 * np.pi * 52 * tt) * np.exp(-tt / 0.09), m["pulse"] * (1.0 if b % 2 == 0 else 0.55))
        for b in range(8):
            if m.get("shaker") and b * BEAT / 2 < dur:
                n = int(0.06 * SR)
                put(bus, t + b * BEAT / 2, hp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR / 0.018), m["shaker"] * (1.0 if b % 2 else 0.6), pan=0.3)
        t += BAR
        i += 1
    return min(t, end)


def synth_music():
    bus = np.zeros((N, 2))
    secs = music.get("sections") or [{"at": "start", "mood": "warm"}]
    starts = [cue(s["at"]) for s in secs] + [DUR]
    for k, s in enumerate(secs):
        m = MOODS[s["mood"]]
        a, b = starts[k], starts[k + 1]
        if m.get("hold"):   # the close: the cadence (at most half the section), then the tonic held to the end
            end = section(bus, a, a + min(BAR * len(m["chords"]), max(0.0, (b - a) * 0.5)), m) if b - a > 2.5 else a
            hold = max(0.5, DUR - end)
            for nm in CH[m["hold"]] + ["C4"]:
                put(bus, end, pad_note(f_of(nm) * 2, hold + 0.5, 0.05))
            put(bus, end, bass(f_of("C2"), hold, 0.08))
            for j, nm in enumerate(["C5", "E5", "G5", "C6"]):
                put(bus, end + j * 0.18, pluck(f_of(nm), 0.05, decay=1.2), pan=-0.3 + j * 0.2)
        else:
            section(bus, a, b, m)
    return bus


# ---------------------------------------------------------------------------------------------------------- effects
def pop(g=0.045):
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = 620 + 380 * np.minimum(1, t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.003) * g


def whoosh(dur=0.7, g=0.04, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    noise, out, steps = rng.standard_normal(n), np.zeros(n), 12
    for i in range(steps):
        a, b = i * n // steps, (i + 1) * n // steps
        k = i / (steps - 1) if up else 1 - i / (steps - 1)
        lo = 300 + 2400 * k
        out[a:b] = bp(noise, lo, lo * 2.2)[a:b]
    return lp(out * np.sin(np.pi * np.minimum(1, t / dur)) ** 2, 7000) * g


def chime(notes, g=0.04, step=0.11, decay=0.9):
    total = int((len(notes) * step + decay * 4) * SR)
    out = np.zeros(total)
    for i, nm in enumerate(notes):
        f = f_of(nm); n = int(decay * 4 * SR); t = np.arange(n) / SR
        x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (decay * 0.25))
             + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / (decay * 0.1)))
        a = int(i * step * SR)
        out[a:a + n] += x * np.exp(-t / decay) * np.minimum(1, t / 0.003)
    return out * g


def ring(dur, g=0.045):
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1046 * t) + 0.7 * np.sin(2 * np.pi * 1318 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 16 * t)))
    gate = ((t % 1.2) < 0.38) | (((t % 1.2) > 0.5) & ((t % 1.2) < 0.88))
    return lp(x * lp(gate.astype(float), 60), 5000) * g


def ringback(dur, g=0.02):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)
    return lp(x * lp(((t % 3.0) < 2.0).astype(float), 40), 3000) * g


def drip(g=0.03):
    n = int(0.25 * SR); t = np.arange(n) / SR
    f = 1900 * np.exp(-t / 0.05) + 700
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04) * g


def tick(g=0.025):
    n = int(0.03 * SR)
    return hp(rng.standard_normal(n), 2500) * np.exp(-np.arange(n) / SR / 0.006) * g


def swell(dur=1.5, g=0.03):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f_of(nm) * 2 * t) for nm in ("C3", "G3", "E3"))
    return x * (t / dur) ** 2 * np.exp(-np.maximum(0, t - dur * 0.85) / 0.1) * g


def effect(e):
    k, g = e["kind"], e.get("gain")
    kw = {} if g is None else {"g": g}
    if k == "pop": return pop(**kw)
    if k == "whoosh": return whoosh(e.get("dur", 0.7), **kw)
    if k == "whoosh-down": return whoosh(e.get("dur", 0.7), up=False, **kw)
    if k == "chime": return chime(e.get("notes", ["C5", "E5", "G5", "C6"]), **kw)
    if k == "ding": return chime(["E6", "A6"], step=0.12, decay=0.35, **kw)
    if k == "success": return chime(["G5", "C6"], step=0.1, decay=0.6, **kw)
    if k == "ring": return ring(e.get("dur", 1.0), **kw)
    if k == "ringback": return ringback(e.get("dur", 1.3), **kw)
    if k == "drip": return drip(**kw)
    if k == "tick": return tick(**kw)
    if k == "swell": return swell(e.get("dur", 1.5), **kw)
    raise SystemExit(f"unknown effect kind {k}")


def effects():
    bus = np.zeros((N, 2))
    for e in script.get("sfx", []):
        put(bus, cue(e["at"]), effect(e), pan=e.get("pan", 0.0))
    return bus


def reverb(x, secs=2.0, wet=0.22):
    n = int(secs * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.standard_normal(n) * np.exp(-t / (secs / 6.9)), 5000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - wet) + out * wet * 1.6


def ffmpeg(args):
    return subprocess.run(["ffmpeg", "-y", "-hide_banner", "-nostats", *args], capture_output=True, text=True, check=True)


def compress_voice(v):
    """Even out the voice so the mix reaches web loudness without clipping its peaks."""
    tmp = os.path.join(ROOT, "out", "voice-pre.wav")
    sf.write(tmp, v.astype(np.float32), SR, subtype="FLOAT")
    ffmpeg(["-i", tmp, "-af", "acompressor=threshold=0.08:ratio=3:attack=4:release=140:knee=3:makeup=1.6", os.path.join(ROOT, "out", "voice-comp.wav")])
    out, _ = sf.read(os.path.join(ROOT, "out", "voice-comp.wav"), dtype="float64")
    return out[: len(v)]


def loudness(src, dst):
    L_ = {"I": -16.5, "TP": -1.5, "LRA": 7, **config.get("loudness", {})}
    target = f"I={L_['I']}:TP={L_['TP']}:LRA={L_['LRA']}"
    r = ffmpeg(["-i", src, "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"])
    j = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    ffmpeg(["-i", src, "-af", f"loudnorm={target}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
            f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true", "-ar", str(SR), "-c:a", "pcm_s16le", dst])
    r = ffmpeg(["-i", dst, "-af", "ebur128=peak=true", "-f", "null", "-"])
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1]
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)[-1]
    return float(i), float(p)


def db(x):
    return 10 * np.log10(np.mean(x ** 2) + 1e-12)


def main():
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    voice, vsr = sf.read(os.path.join(ROOT, "audio", "narration.flac"), dtype="float64")
    if voice.ndim > 1:
        voice = voice.mean(1)
    voice = hp(resample_poly(voice, SR, vsr), 75)
    voice = voice + 0.18 * bp(voice, 2500, 5500)          # a touch of presence
    v = np.zeros(N)
    v[: min(N, len(voice))] = voice[:N]
    v = compress_voice(v)
    # the music steps back while the voice speaks
    duck = np.clip(lp((np.sqrt(np.maximum(lp(v ** 2, 8), 0) + 1e-12) > 0.02).astype(float), 3), 0, 1)
    if "--music" in sys.argv:
        bed, bsr = sf.read(sys.argv[sys.argv.index("--music") + 1], dtype="float64", always_2d=True)
        bed = resample_poly(bed, SR, bsr, axis=0)[:N]
        m = np.zeros((N, 2)); m[: len(bed), :] = bed[:, :2] if bed.shape[1] > 1 else np.repeat(bed, 2, 1)
        m *= 0.3 / max(1e-9, np.sqrt(np.mean(m ** 2)) * 10)
    else:
        m = reverb(synth_music(), 2.4, 0.3)
    m = m * (1.0 - 0.55 * duck)[:, None] * float(music.get("gain", 0.13))
    fx = reverb(effects(), 1.4, 0.15) * float(script.get("sfxGain", 0.8))
    vv = np.stack([v, v], 1) * 0.9
    mix = vv + m + fx
    end = int(DUR * SR)
    mix = mix[:end]
    fi, fo = int(0.4 * SR), int(1.6 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    mix *= 0.7 / np.max(np.abs(mix))
    pre = os.path.join(ROOT, "out", "mix-pre.wav")
    sf.write(pre, mix.astype(np.float32), SR, subtype="FLOAT")
    i, p = loudness(pre, os.path.join(ROOT, "audio", "mix.wav"))
    # the report: what you cannot hear, measured
    sp = [(int(l["start"] * SR), int(l["end"] * SR)) for l in tm["lines"]]
    gaps = [(int(a["end"] * SR), int(b["start"] * SR)) for a, b in zip(tm["lines"], tm["lines"][1:]) if b["start"] - a["end"] > 0.4]
    under = np.mean([db(vv[a:b, 0]) - db(m[a:b, 0]) for a, b in sp])
    pause = np.mean([db(vv[a1:b1, 0]) for a1, b1 in sp]) - np.mean([db(m[a:b, 0]) for a, b in gaps]) if gaps else float("nan")
    fxp = 20 * np.log10(np.max(np.abs(fx)) + 1e-9) - 20 * np.log10(np.max(np.abs(vv)) + 1e-9)
    print(f"mix: {end / SR:.2f}s, {i:.1f} LUFS, peak {p:.1f} dBFS")
    print(f"music under the voice: {under:.1f} dB while speaking (target 15-20), {pause:.1f} dB in the pauses (target 12-15)")
    print(f"effects peaks: {fxp:.1f} dB from the voice's peaks (target about -10)")


if __name__ == "__main__":
    main()
