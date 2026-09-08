# Adapted from the MIT-licensed Vehicle Lab procedural score, copyright 2026 Vehicle Lab contributors.
#!/usr/bin/env python3
"""Render Vehicle Lab's original, sample-free 30-second hero score.

Run with: .venv/bin/python tools/hero_score.py
All instruments are synthesized from elementary oscillators and seeded noise.
No recordings, samples, soundfonts, third-party melody, or generative music
service are used. Source and rendered score: MIT, Vehicle Lab contributors.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt


ROOT = Path(__file__).resolve().parents[1]
RATE = 48_000
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 16
DURATION = BARS * BAR
SEED = 20260908

PHRASES = [(i * 8, "chapter_" + str(i + 1), "Source-linked inspection chapter") for i in range(8)]


def freq(midi: int) -> float:
    return 440 * 2 ** ((midi - 69) / 12)


def axis(seconds: float) -> np.ndarray:
    return np.arange(round(seconds * RATE), dtype=np.float64) / RATE


def filtered(signal: np.ndarray, cutoff, kind="lowpass", order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=RATE, output="sos"), signal)


def taper(signal: np.ndarray, fade_in=.002, fade_out=.020) -> np.ndarray:
    signal = signal.copy()
    for seconds, end in [(fade_in, False), (fade_out, True)]:
        size = min(len(signal), round(seconds * RATE))
        if size:
            ramp = np.sin(np.linspace(0, np.pi / 2, size)) ** 2
            if end:
                signal[-size:] *= ramp[::-1]
            else:
                signal[:size] *= ramp
    return signal


def kick():
    t = axis(.40)
    f = 49 + 134 * np.exp(-t / .021)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    body = np.sin(phase) * np.exp(-t / .12)
    attack = .13 * np.sin(2 * np.pi * 1640 * t) * np.exp(-t / .005)
    return taper(np.tanh((body + attack) * 1.35) * .84, .0005, .02)


def clap(rng):
    t = axis(.24)
    n = filtered(rng.normal(0, 1, len(t)), [950, 8700], "bandpass")
    envelope = .40 * np.exp(-t / .070)
    for start in [0, .008, .018]:
        envelope += np.where(t >= start, np.exp(-np.maximum(t - start, 0) / .003), 0)
    return taper(n * envelope * .24, .0005, .03)


def hat(rng, opened=False):
    t = axis(.20 if opened else .075)
    n = filtered(rng.normal(0, 1, len(t)), 6600, "highpass")
    metallic = sum(np.sin(2 * np.pi * hz * t) for hz in [7421, 8993, 10831]) / 3
    envelope = np.exp(-t / (.065 if opened else .015))
    return taper((n * .75 + metallic * .20) * envelope * .145, .0005, .015)


def bass(midi, length):
    t = axis(length)
    f = freq(midi)
    # Harmonic synthesis stays far from Nyquist and avoids alias-heavy saws.
    body = np.sin(2 * np.pi * f * t)
    body += sum(np.sin(2 * np.pi * f * h * t) / h ** 1.45 for h in range(2, 10)) * .52
    envelope = (1 - np.exp(-t / .007)) * np.exp(-t / .18)
    return taper(np.tanh(body * 1.15) * envelope * .44, .002, .025)


def pluck(midi, strength=1.0):
    t = axis(.70)
    f = freq(midi)
    main = np.sin(2 * np.pi * f * t + .50 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .09))
    main += .28 * np.sin(2 * np.pi * f * 2.002 * t)
    main += .13 * np.sin(2 * np.pi * f * 3 * t)
    envelope = (1 - np.exp(-t / .0015)) * np.exp(-t / .155)
    return taper(main * envelope * .18 * strength, .001, .08)


def pad(notes, seconds):
    t = axis(seconds)
    out = np.zeros((len(t), 2))
    for note in notes:
        f = freq(note)
        for side in [0, 1]:
            voice = np.zeros(len(t))
            for detune, level in [(-.0031, .3), (0, .5), (.0031, .3)]:
                hz = f * (1 + detune * (1 if side else -1))
                voice += level * (np.sin(2 * np.pi * hz * t + .2 * side) + .22 * np.sin(4 * np.pi * hz * t))
            out[:, side] += voice * .025
    env = (1 - np.exp(-t / .06)) * np.minimum(1, np.maximum(0, seconds - t) / .35)
    return out * env[:, None]


def sweep(rng, seconds, upward=True):
    t = axis(seconds)
    n = filtered(rng.normal(0, 1, len(t)), [1800, 10500], "bandpass")
    u = t / seconds
    envelope = u ** 2 if upward else np.exp(-t / .18)
    tone_freq = 240 * (1 + 11 * u ** 3) if upward else 400 * np.exp(-t / .12)
    tone = np.sin(2 * np.pi * np.cumsum(tone_freq) / RATE)
    return taper((n * .06 + tone * .018) * envelope, .03, .04)


def render():
    rng = np.random.default_rng(SEED)
    count = round(DURATION * RATE)
    drums = np.zeros((count, 2), dtype=np.float64)
    low = np.zeros_like(drums)
    melody = np.zeros_like(drums)
    atmosphere = np.zeros_like(drums)

    def add(bus, sound, at, gain=1., pan=0.):
        begin = round(at * RATE)
        if begin >= count:
            return
        available = min(len(sound), count - begin)
        if available <= 0:
            return
        if sound.ndim == 1:
            stereo = sound[:available, None] * np.array([math.cos((pan + 1) * np.pi / 4), math.sin((pan + 1) * np.pi / 4)])[None, :]
        else:
            stereo = sound[:available]
        bus[begin:begin + available] += stereo * gain

    # E minor / C / G / D; a new 16-bar media arrangement.
    chords = [[52, 55, 59, 66], [48, 52, 55, 62], [43, 50, 55, 59], [50, 54, 57, 64]]
    roots = [28, 24, 31, 26]
    motif = [[71, 76, 79, 83, 78, 76, 79, 74],
             [76, 79, 74, 72, 76, 79, 83, 79],
             [74, 71, 79, 78, 74, 83, 79, 74],
             [74, 78, 81, 78, 76, 74, 69, 71]]
    kick_sound = kick()
    for bar in range(BARS):
        start = bar * BAR
        chord_index = (bar // 2) % 4 if bar < BARS - 2 else 0
        add(atmosphere, pad(chords[chord_index], BAR + .38), start)
        soft = bar in [8, 9]  # let the inspection details breathe
        ending = bar == BARS - 1
        for beat in range(4):
            if ending and beat > 0:
                continue
            add(drums, kick_sound, start + beat * BEAT, .83 if soft else 1.)
            if beat in [1, 3]:
                add(drums, clap(rng), start + beat * BEAT, .60 if soft else .90)
            add(drums, hat(rng, True), start + (beat + .5) * BEAT, .48 if soft else .93, .25)
            if not soft:
                add(drums, hat(rng), start + (beat + .25) * BEAT, .55, -.25)
                add(drums, hat(rng), start + (beat + .75) * BEAT, .43, -.40)
        if not ending:
            for step, interval in [(0, 0), (1.5, 0), (2.5, 12), (3.5, 0), (4, 0), (5.5, 0), (6.5, 7), (7.5, 12)]:
                add(low, bass(roots[chord_index] + interval, BEAT * .55), start + step * BEAT / 2, .76 if soft else 1)
        notes = motif[chord_index]
        if ending:
            notes = [76]
        for i, note in enumerate(notes):
            if soft and i % 2:
                continue
            at = start + i * BEAT / 2
            sound = pluck(note, .60 if soft else 1)
            pan = -.26 if i % 2 else .26
            add(melody, sound, at, 1, pan)
            add(melody, sound, at + BEAT * .75, .28, -pan)
            add(melody, sound, at + BEAT * 1.5, .11, pan)
        if bar % 2 == 1 and bar < BARS - 1:
            add(atmosphere, sweep(rng, BEAT), start + 3 * BEAT, .70)
        if bar % 2 == 0:
            add(atmosphere, sweep(rng, .75, False), start, .90)
        if bar in [3, 6, 8, 12, 16]:
            for j in range(4):
                add(drums, clap(rng), start + (3 + j / 4) * BEAT, .10 + j * .06, -.1 + j * .06)

    t = np.arange(count) / RATE
    phase = np.mod(t, BEAT)
    duck = .28 + .72 * (1 - np.exp(-phase / .08))
    mix = drums + low * duck[:, None] + melody * (.55 + .45 * duck[:, None]) + atmosphere * duck[:, None]
    mix = filtered(mix.T, 24, "highpass").T
    # Gentle bus saturation catches coincidences before loudness normalization.
    mix = np.tanh(mix * 1.20) / 1.20
    for side in [0, 1]:
        mix[:, side] = taper(mix[:, side], .001, .070)
    peak = float(np.max(np.abs(mix)))
    return mix * (.84 / max(peak, 1e-9))


def write_wav(path, signal):
    pcm = np.clip(np.rint(signal * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "media/score.wav")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    signal = render()
    # ffmpeg's two-pass loudness process supplies predictable web-film levels.
    with tempfile.TemporaryDirectory(prefix="vehicle-lab-score-") as scratch:
        raw = Path(scratch) / "raw.wav"
        write_wav(raw, signal)
        common = ["ffmpeg", "-hide_banner", "-nostdin", "-i", str(raw)]
        first = subprocess.run(common + ["-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"], check=True, capture_output=True, text=True)
        measure, _ = json.JSONDecoder().raw_decode(first.stderr[first.stderr.rfind("{"):])
        normalize = "loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:" + ":".join(
            f"{setting}={measure[key]}" for setting, key in [
                ("measured_I", "input_i"), ("measured_TP", "input_tp"),
                ("measured_LRA", "input_lra"), ("measured_thresh", "input_thresh"),
                ("offset", "target_offset")])
        subprocess.run(common + ["-af", normalize, "-ar", str(RATE), "-c:a", "pcm_s16le", "-t", str(DURATION), "-metadata", "title=Inside the Work - Pixel Paths", "-metadata", "artist=Vehicle Lab contributors", "-metadata", "comment=Original procedural score; no external samples; MIT License", "-y", str(args.output)], check=True, capture_output=True, text=True)
    with wave.open(str(args.output), "rb") as f:
        assert f.getframerate() == RATE and f.getnchannels() == 2
        assert f.getnframes() == round(DURATION * RATE)
        rendered = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").astype(float) / 32768
    verify = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(args.output), "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"], check=True, capture_output=True, text=True)
    actual, _ = json.JSONDecoder().raw_decode(verify.stderr[verify.stderr.rfind("{"):])
    receipt = {
        "title": "Pixel Paths", "kind": "ORIGINAL_PROCEDURAL_MUSIC",
        "license": "MIT", "copyright": "2026 Vehicle Lab contributors",
        "provenance": "Synthesized using original oscillators, seeded noise and an authored note sequence; no imported recordings, samples, soundfonts or external music service.",
        "sampleRate": RATE, "channels": 2, "bitsPerSample": 16,
        "durationSeconds": DURATION, "bpm": BPM, "beats": BARS * 4,
        "seed": SEED, "generator": str(Path(__file__).relative_to(ROOT)),
        "generatorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "outputSha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "samplePeakDbfs": round(20 * math.log10(np.max(np.abs(rendered))), 3),
        "integratedLufs": float(actual["input_i"]),
        "truePeakDbtp": float(actual["input_tp"]),
        "loudnessRangeLu": float(actual["input_lra"]),
        "clippedSamples": int(np.count_nonzero(np.abs(rendered) >= 1)),
        "beatsSeconds": [round(i * BEAT, 6) for i in range(BARS * 4 + 1)],
        "cutGridSeconds": [round(i * BAR, 6) for i in range(BARS + 1)],
        "phrases": [{"beat": b, "seconds": b * BEAT, "id": key, "cue": cue} for b, key, cue in PHRASES],
        "listeningReview": "Not established by waveform or loudness checks; final film needs a human listening review.",
    }
    args.output.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({k: receipt[k] for k in ["durationSeconds", "bpm", "sampleRate", "channels", "integratedLufs", "truePeakDbtp", "clippedSamples", "outputSha256"]}, indent=2))


if __name__ == "__main__":
    main()
