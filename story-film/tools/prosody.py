#!/usr/bin/env python3
"""Expressive delivery for an open-source voice that reads every line the same way.

Kokoro (like most small TTS models) has no emotion control: an excited line and a serious one come out at the same
pitch, with the same narrow movement, which is what makes a narration sound robotic. This module reshapes each line's
pitch the way a voice actor would, with Praat's pitch-synchronous overlap-add (PSOLA, through parselmouth):

  - shift:  the line's register in semitones (up for excitement and the turn, down for bad news)
  - range:  how far the pitch moves around the line's median (x1.3 is livelier, x0.9 flatter)
  - stress: words the line leans on get a pitch rise (semitones) and a little more level (dB)
  - lift:   a gentle rise or fall across the line (an excited line climbs, a heavy one settles)

Pace and pauses come from the voice itself (per-line speed) and from the punctuation of the line's "speak" text.
Everything is deterministic. The words are not changed, so the speech-recognition read-back still applies.

script.json:
  "voice": { ..., "emotions": { "excited": { "speed": 0.96, "shift": 1.4, "range": 1.35, "lift": 0.8 }, ... } }
  line:    { "emotion": "excited", "stress": ["next"], "speak": "Now you've found the next one! ..." }
"""
import math
import numpy as np

DEFAULT = {"speed": None, "shift": 0.0, "range": 1.0, "lift": 0.0, "stress_st": 2.0, "stress_db": 1.5}


def params(voice, line):
    e = dict(DEFAULT)
    e.update((voice.get("emotions") or {}).get(line.get("emotion", ""), {}))
    for k in ("speed", "shift", "range", "lift"):
        if k in line:
            e[k] = line[k]
    return e


def stress_spans(line, words, dur):
    """[(start, end)] in seconds within the clip for each stressed word, from the clip's own word timings."""
    want = [w.lower() for w in line.get("stress", [])]
    norm = lambda s: "".join(c for c in s.lower() if c.isalnum() or c == "'")
    out = []
    for i, (w, t) in enumerate(words):
        if norm(w) in [norm(x) for x in want]:
            end = words[i + 1][1] if i + 1 < len(words) else dur
            out.append((t, max(t + 0.12, end)))
    return out


def shape(audio, sr, e, spans):
    """Reshape the pitch of one line (mono float array) and return the new audio, same length."""
    import parselmouth
    from parselmouth.praat import call
    snd = parselmouth.Sound(audio.astype(np.float64), sampling_frequency=sr)
    dur = snd.get_total_duration()
    manip = call(snd, "To Manipulation", 0.01, 60, 320)
    tier = call(manip, "Extract pitch tier")
    n = call(tier, "Get number of points")
    if n < 3:
        return audio
    pts = [(call(tier, "Get time from index", i), call(tier, "Get value at index", i)) for i in range(1, n + 1)]
    ref = float(np.median([f for _, f in pts]))
    new = call("Create PitchTier", "shaped", 0, dur)
    for t, f in pts:
        st = 12 * math.log2(f / ref)
        st = st * e["range"] + e["shift"] + e["lift"] * (t / dur - 0.5)
        for a, b in spans:   # a raised-cosine rise over the stressed word, peaking a third of the way in
            if a <= t <= b:
                k = (t - a) / (b - a)
                st += e["stress_st"] * (math.sin(math.pi * min(1.0, k * 1.5)) if k < 0.66 else math.cos(math.pi * (k - 0.66) / 0.68) * 0.5 + 0.5) * (1 if k < 0.66 else 0.6)
        call(new, "Add point", t, ref * 2 ** (st / 12))
    call([manip, new], "Replace pitch tier")
    out = call(manip, "Get resynthesis (overlap-add)").values[0]
    out = np.asarray(out[: len(audio)], dtype=np.float32)
    if len(out) < len(audio):
        out = np.pad(out, (0, len(audio) - len(out)))
    # a little more level on the stressed words, with soft edges
    if spans and e["stress_db"]:
        g = np.ones(len(out), dtype=np.float32)
        for a, b in spans:
            i0, i1 = int(a * sr), min(len(out), int(b * sr))
            if i1 <= i0:
                continue
            w = np.hanning(i1 - i0).astype(np.float32)
            g[i0:i1] *= 1 + (10 ** (e["stress_db"] / 20) - 1) * w
        out = out * g
    return out


def spread(audio, sr):
    """Pitch statistics of a clip: median Hz, standard deviation in semitones, p10 to p90 range in semitones."""
    import parselmouth
    snd = parselmouth.Sound(audio.astype(np.float64), sampling_frequency=sr)
    f = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=320).selected_array["frequency"]
    f = f[f > 0]
    if len(f) < 5:
        return 0.0, 0.0, 0.0
    st = 12 * np.log2(f / np.median(f))
    return float(np.median(f)), float(np.std(st)), float(np.percentile(st, 90) - np.percentile(st, 10))
