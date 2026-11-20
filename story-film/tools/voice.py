#!/usr/bin/env python3
"""The film's voiceover: one clip per line of script.json, then the whole narration on one track, with the time each
line and word starts.

Two engines, chosen by script.json "voice.engine":
  kokoro      Kokoro-82M (Apache 2.0) through kokoro-onnx, run locally: no account, no key. The model files are downloaded
              once from the kokoro-onnx GitHub release into .cache/kokoro/ (Hugging Face is often blocked in sandboxes;
              GitHub releases usually are not).
  elevenlabs  ElevenLabs text-to-speech. Needs a key: ELEVENLABS_API_KEY, or in a Claude cloud session a credential saved
              for api.elevenlabs.io (header xi-api-key), which the proxy injects (any placeholder key then works here).
              script.json voice: { "engine": "elevenlabs", "voice_id": "...", "model": "eleven_multilingual_v2",
              "stability": 0.45, "similarity": 0.8, "style": 0.1 }

    python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile numpy scipy librosa sherpa-onnx
    .venv/bin/python tools/voice.py            audio/narration.flac, audio/timings.json (audio/lines/*.wav, not committed)
    .venv/bin/python tools/voice.py --check    also reads every clip back with speech recognition (Parakeet TDT 0.6B v2
                                               through sherpa-onnx, GitHub release, in .cache/asr/), fails if a word
                                               differs from the script, and stores when each word starts
    .venv/bin/python tools/voice.py --phonemes "Brand name"   how Kokoro will say a word (to fix it with voice.say)

The scenes, the captions and the music cues are timed from audio/timings.json: render again after this.
"""
import json, os, re, sys, urllib.request
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache")
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
PARAKEET = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2"
SR = 24000
HEARD = {}   # script.json voice.heard: how the recogniser may write a word (a brand, a hyphenated word)


def fetch(url, path):
    if os.path.exists(path):
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print(f"downloading {url}")
    urllib.request.urlretrieve(url, path + ".part")
    os.replace(path + ".part", path)
    return path


def trim(audio, sr, floor_db=-45.0, pad=0.03):
    """Cut the silence at both ends, keeping a short pad so no consonant is clipped."""
    frame = int(sr * 0.01)
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    loud = np.where(20 * np.log10(rms) > floor_db)[0]
    if not len(loud):
        return audio
    a = max(0, loud[0] * frame - int(pad * sr))
    b = min(len(audio), (loud[-1] + 1) * frame + int(pad * sr))
    out = audio[a:b].copy()
    fade = int(sr * 0.012)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spell(n):
    """An integer as the words a narrator says: 783 -> seven hundred eighty three (no "and")."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + spell(n % 100))
    for size, name in ((10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")):
        if n >= size:
            return spell(n // size) + " " + name + ("" if n % size == 0 else " " + spell(n % size))
    return str(n)


def numbers_as_words(s):
    """$4,698 -> four thousand six hundred ninety eight dollars; 1.6 -> one point six; 75% -> seventy five percent."""
    def money(m):
        return numbers_as_words(m.group(1)) + " dollars"
    s = re.sub(r"\$\s?([\d,]+(?:\.\d+)?)", money, s)
    s = s.replace("%", " percent")
    def num(m):
        whole, _, frac = m.group(0).replace(",", "").partition(".")
        out = spell(int(whole))
        if frac:
            out += " point " + " ".join(ONES[int(d)] for d in frac)
        return " " + out + " "
    return re.sub(r"\d[\d,]*(?:\.\d+)?", num, s)


def words(s, heard=None):
    """Words for comparing the script with what the recogniser heard: lower case, numbers as words, "and" inside a
    number dropped, and the script's "heard" aliases applied (a brand heard as two words, a hyphenated word heard
    joined), so digits and number words count as equal."""
    s = numbers_as_words(s.lower().replace("’", "'"))
    ws = re.findall(r"[a-z0-9']+", s)
    numeric = set(ONES + TENS[2:] + ["hundred", "thousand", "million", "billion"])
    ws = [w for i, w in enumerate(ws) if not (w == "and" and 0 < i < len(ws) - 1 and ws[i - 1] in numeric and ws[i + 1] in numeric)]
    return collapse(ws, heard)


def collapse(ws, heard=None, times=None):
    """Replace each alias (a run of words) with its single word; with times, keep the first word's time."""
    rules = sorted(((re.findall(r"[a-z0-9']+", k.lower()), v) for k, v in (heard or {}).items()), key=lambda r: -len(r[0]))
    out, ts, i = [], [], 0
    while i < len(ws):
        for pat, rep in rules:
            if pat and ws[i:i + len(pat)] == pat:
                out.append(rep); ts.append(times[i] if times else None); i += len(pat)
                break
        else:
            out.append(ws[i]); ts.append(times[i] if times else None); i += 1
    return (out, ts) if times else out


def respell(text, say):
    for word, sp in (say or {}).items():
        text = re.sub(rf"\b{re.escape(word)}\b", sp, text)
    return text


class KokoroVoice:
    def __init__(self, v):
        from kokoro_onnx import Kokoro
        self.k = Kokoro(fetch(KOKORO + "kokoro-v1.0.onnx", os.path.join(CACHE, "kokoro", "kokoro-v1.0.onnx")),
                        fetch(KOKORO + "voices-v1.0.bin", os.path.join(CACHE, "kokoro", "voices-v1.0.bin")))
        self.v = v
        voice = v.get("voice", "am_michael")
        if isinstance(voice, dict):   # a blend: {"am_michael": 0.7, "am_fenrir": 0.3}
            voice = sum(w * self.k.get_voice_style(n) for n, w in voice.items())
        self.voice = voice

    def say(self, text, prev=None, nxt=None):
        audio, sr = self.k.create(text, voice=self.voice, speed=self.v.get("speed", 0.9), lang=self.v.get("lang", "en-us"),
                                  sentence_pause=self.v.get("sentencePause", 0.3), clause_pause=self.v.get("clausePause", 0.14))
        return np.asarray(audio, dtype=np.float32), sr

    def phonemes(self, text):
        return self.k.tokenizer.phonemize(text, self.v.get("lang", "en-us"))


class ElevenVoice:
    def __init__(self, v):
        self.v = v
        self.key = os.environ.get("ELEVENLABS_API_KEY", "injected-by-proxy")
        if not v.get("voice_id"):
            raise SystemExit("script.json voice.voice_id is required for ElevenLabs")

    def say(self, text, prev=None, nxt=None):
        body = {"text": text, "model_id": self.v.get("model", "eleven_multilingual_v2"),
                "voice_settings": {"stability": self.v.get("stability", 0.45), "similarity_boost": self.v.get("similarity", 0.8),
                                   "style": self.v.get("style", 0.1), "use_speaker_boost": True}}
        if prev: body["previous_text"] = prev
        if nxt: body["next_text"] = nxt
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.v['voice_id']}?output_format=pcm_24000",
            data=json.dumps(body).encode(), method="POST",
            headers={"xi-api-key": self.key, "content-type": "application/json", "accept": "audio/pcm"})
        with urllib.request.urlopen(req, timeout=120) as r:
            pcm = np.frombuffer(r.read(), dtype="<i2").astype(np.float32) / 32768.0
        return pcm, 24000

    def phonemes(self, text):
        return "(ElevenLabs: use voice.say respellings or a pronunciation dictionary)"


def recogniser():
    import tarfile, sherpa_onnx
    d = os.path.join(CACHE, "asr", "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8")
    if not os.path.isdir(d):
        tb = fetch(PARAKEET, os.path.join(CACHE, "asr", "parakeet.tar.bz2"))
        with tarfile.open(tb) as t:
            t.extractall(os.path.join(CACHE, "asr"))
        os.remove(tb)
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx", joiner=f"{d}/joiner.int8.onnx",
        tokens=f"{d}/tokens.txt", model_type="nemo_transducer", num_threads=4)


def check(lines, clips, timings):
    """Read every clip back. Flags lines whose words differ from the script, and stores when each word starts (tokens
    that begin with a space start a word; a hyphenated word starts where its first piece does)."""
    import librosa
    rec = recogniser()
    bad = 0
    for line, (audio, sr), tm in zip(lines, clips, timings):
        y = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        s = rec.create_stream()
        s.accept_waveform(16000, y)
        rec.decode_stream(s)
        heard = s.result.text.strip()
        # what was heard, word by word with start times; each heard word normalised ("75%" -> seventy five percent)
        hw = []
        for tok, t in zip(s.result.tokens, s.result.timestamps):
            if tok.startswith(" ") or not hw:
                hw.append([tok, t])
            else:
                hw[-1][0] += tok
        pieces, times = [], []
        for w, t in hw:
            for p in words(w):
                pieces.append(p); times.append(t)
        pieces, times = collapse(pieces, HEARD, times)
        # the script, word by word, normalised the same way; a word may be several pieces ("seventy-five")
        said = line["text"].split()
        per = [words(w, HEARD) for w in said]
        want = [p for ps in per for p in ps]
        ok = pieces == want
        bad += not ok
        print(f"{'ok ' if ok else 'DIFF'} {line['id']}: {heard}")
        if not ok:
            print(f"     expected: {' '.join(want)}\n     heard:    {' '.join(pieces)}")
            continue
        # each script word starts where its first piece was heard
        firsts, i = [], 0
        for ps in per:
            firsts.append(times[i] if ps else (firsts[-1] if firsts else 0.0))
            i += len(ps)
        tm["words"] = [{"w": w, "t": round(tm["start"] + t, 3)} for w, t in zip(said, firsts)]
    return bad


def main():
    script = json.load(open(os.path.join(ROOT, "script.json")))
    v = script["voice"]
    global HEARD
    HEARD = v.get("heard", {})
    engine = ElevenVoice(v) if v.get("engine") == "elevenlabs" else KokoroVoice(v)
    if "--phonemes" in sys.argv:
        text = sys.argv[sys.argv.index("--phonemes") + 1]
        print(text, "->", engine.phonemes(respell(text, v.get("say"))))
        return
    out = os.path.join(ROOT, "audio")
    os.makedirs(os.path.join(out, "lines"), exist_ok=True)
    lines = script["lines"]
    clips, timings = [], []
    t = script.get("leadIn", 1.5)
    for i, line in enumerate(lines):
        said = respell(line["text"], v.get("say"))
        prev = respell(lines[i - 1]["text"], v.get("say")) if i else None
        nxt = respell(lines[i + 1]["text"], v.get("say")) if i + 1 < len(lines) else None
        audio, sr = engine.say(said, prev, nxt)
        audio = trim(audio, sr)
        sf.write(os.path.join(out, "lines", line["id"] + ".wav"), audio, sr, subtype="PCM_16")
        dur = len(audio) / sr
        timings.append({"id": line["id"], "scene": line.get("scene", ""), "start": round(t, 3), "end": round(t + dur, 3), "text": line["text"]})
        clips.append((audio, sr))
        print(f"{line['id']}: {dur:5.2f}s at {t:6.2f}s  {line['text']}")
        t += dur + line.get("pause", 0.5)
    total = t + script.get("tail", 2.5)
    sr = clips[0][1]
    track = np.zeros(int(total * sr) + 1, dtype=np.float32)
    for (audio, _), tm in zip(clips, timings):
        a = int(tm["start"] * sr)
        track[a:a + len(audio)] += audio
    track *= 0.89 / max(1e-6, float(np.max(np.abs(track))))   # peak at -1 dBFS; the mix sets the loudness
    sf.write(os.path.join(out, "narration.flac"), track, sr, subtype="PCM_16")
    nwords = sum(len(l["text"].split()) for l in lines)
    speech = sum(tm["end"] - tm["start"] for tm in timings)
    print(f"narration: {total:.2f}s, {nwords} words, {60 * nwords / speech:.0f} words a minute while speaking")
    bad = 0
    if "--check" in sys.argv:
        bad = check(lines, clips, timings)
        print("speech check:", "every line reads back as written" if not bad else f"{bad} line(s) differ: fix with voice.say or rewrite")
    json.dump({"voice": {k: v[k] for k in v if k not in ("key", "heard")}, "sampleRate": sr, "duration": round(total, 3), "lines": timings},
              open(os.path.join(out, "timings.json"), "w"), indent=1)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
