'use client';

import { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/* ── BiharSe ambient engine ───────────────────────────────────────────────
 * A soft, devotional ghat-side ambience synthesised live with WebAudio —
 * warm drone (Sa–Pa), breathing pad and wandering pentatonic plucks with a
 * gentle echo. No audio files, zero licensing, seamless and lightweight. */

const NOTE = {
  D2: 73.42, A2: 110.0, D3: 146.83, F3: 185.0,
  D4: 293.66, E4: 329.63, 'F#4': 369.99, A4: 440.0, B4: 493.88, D5: 587.33,
} as const;

const SCALE: number[] = [NOTE.D4, NOTE.E4, NOTE['F#4'], NOTE.A4, NOTE.B4, NOTE.D5];

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private scheduler: number | null = null;
  private step = 2;
  private playing = false;

  get isPlaying() { return this.playing; }

  async start(): Promise<void> {
    if (this.playing) return;
    if (!this.ctx) this.buildGraph();
    const ctx = this.ctx!;
    await ctx.resume();
    this.playing = true;
    const now = ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(Math.max(this.master!.gain.value, 0.0001), now);
    this.master!.gain.exponentialRampToValueAtTime(0.42, now + 1.6);
    this.scheduleNext(0);
  }

  stop(): void {
    if (!this.playing || !this.ctx || !this.master) return;
    this.playing = false;
    if (this.scheduler !== null) { clearTimeout(this.scheduler); this.scheduler = null; }
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    window.setTimeout(() => { if (!this.playing) this.ctx?.suspend().catch(() => {}); }, 800);
  }

  /** Soft duck when the tab is hidden — resume when visible again. */
  setSuspended(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden && this.playing) this.ctx.suspend().catch(() => {});
    else if (!hidden && this.playing) this.ctx.resume().catch(() => {});
  }

  private buildGraph(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.master = master;

    // gentle tape-echo for the plucks
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const wet = ctx.createGain(); wet.gain.value = 0.4;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    const send = ctx.createGain(); send.gain.value = 1; send.connect(delay);
    this.delaySend = send;

    // ── drone: Sa (D2) + Pa (A2), softly detuned ──
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 4; // ±4 cents
    lfo.connect(lfoGain); lfo.start();

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 420; droneFilter.Q.value = 0.4;
    droneFilter.connect(master);

    const mkDrone = (freq: number, type: OscillatorType, vol: number) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
      lfoGain.connect(o.detune);
      const g = ctx.createGain(); g.gain.value = vol;
      o.connect(g); g.connect(droneFilter); o.start();
    };
    mkDrone(NOTE.D2, 'sine', 0.34);
    mkDrone(NOTE.A2, 'triangle', 0.16);

    // ── breathing pad (D3 + F3) ──
    const breathe = ctx.createOscillator(); breathe.frequency.value = 0.07;
    const breatheGain = ctx.createGain(); breatheGain.gain.value = 0.018;
    breathe.connect(breatheGain); breathe.start();
    const pad = ctx.createGain(); pad.gain.value = 0.05; pad.connect(master);
    breatheGain.connect(pad.gain);
    ([[NOTE.D3, 'sine'], [NOTE.F3, 'sine']] as [number, OscillatorType][]).forEach(([f, t]) => {
      const o = ctx.createOscillator(); o.type = t; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5;
      o.connect(g); g.connect(pad); o.start();
    });
  }

  /** Wander the pentatonic scale like a relaxed swarmandal. */
  private scheduleNext(delaySec: number): void {
    if (!this.ctx) return;
    const wait = (0.9 + Math.random() * 1.4) * 1000;
    this.scheduler = window.setTimeout(() => {
      if (!this.playing) return;
      this.pluck();
      this.scheduleNext(0);
    }, delaySec > 0 ? delaySec : wait);
  }

  private pluck(): void {
    const ctx = this.ctx; if (!ctx || !this.master || !this.delaySend) return;
    // random walk — drift up/down the scale, occasional octave sparkle
    this.step = Math.min(SCALE.length - 1, Math.max(0, this.step + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.round(Math.random()))));
    const freq = SCALE[this.step] * (Math.random() < 0.14 ? 2 : 1);
    const t = ctx.currentTime + 0.03;

    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = freq * 2; // soft octave shimmer
    const g = ctx.createGain(); const g2 = ctx.createGain();
    const vol = 0.11 * (0.75 + Math.random() * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(vol * 0.18, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(this.master); g.connect(this.delaySend);
    o2.connect(g2); g2.connect(this.master); g2.connect(this.delaySend);
    o.start(t); o.stop(t + 2.6); o2.start(t); o2.stop(t + 1.3);
  }
}

const PREF_KEY = 'biharse-music';

/** Bottom-left ambient music toggle — orbiting marigold dot traces the
 *  button's perimeter while the music plays (like the original site). */
export function MusicToggle() {
  const [playing, setPlaying] = useState(false);
  const [armed, setArmed] = useState(false); // pref=on, waiting for first gesture
  const engineRef = useRef<AmbientEngine | null>(null);

  const getEngine = () => (engineRef.current ??= new AmbientEngine());

  useEffect(() => {
    // respect a previously saved preference — start on the first user gesture
    // (browsers require a gesture before audio may begin)
    if (localStorage.getItem(PREF_KEY) === 'on') {
      setArmed(true);
      const kick = () => { void toggleOn(); };
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
      return () => {
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('keydown', kick);
      };
    }
  }, []);

  useEffect(() => {
    const onVis = () => engineRef.current?.setSuspended(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const toggleOn = () => {
    setPlaying(true);
    setArmed(false);
    localStorage.setItem(PREF_KEY, 'on');
    toast({ title: 'Ambient music on', description: 'A soft ghat-side drone, छठी मइया के स्वागत के साथ', duration: 2600 });
    getEngine().start().catch(() => {
      setPlaying(false);
      toast({ title: 'Audio blocked', description: 'Tap the button once more to start the music', variant: 'destructive', duration: 3200 });
    });
  };

  const toggle = () => {
    if (playing) {
      engineRef.current?.stop();
      setPlaying(false);
      localStorage.setItem(PREF_KEY, 'off');
    } else {
      toggleOn();
    }
  };

  return (
    <button
      onClick={() => void toggle()}
      aria-pressed={playing}
      aria-label={playing ? 'Pause ambient music' : 'Play ambient music'}
      title={playing ? 'Pause ambient music' : 'Play ambient music'}
      className={`group grid h-12 w-12 place-items-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
        playing
          ? 'bg-brand text-cream shadow-[0_10px_28px_-10px_rgba(216,0,24,0.65)]'
          : 'glass text-ink/70'
      } fixed bottom-[76px] left-3 z-40 lg:bottom-5 lg:left-5`}
    >
      <Music className="h-[19px] w-[19px]" aria-hidden />
      {!playing && (
        <span aria-hidden className="absolute h-[1.5px] w-[22px] rotate-45 rounded-full bg-current opacity-40 transition-opacity group-hover:opacity-60" />
      )}
      {/* the little follower rolls around the perimeter while music plays */}
      {playing && (
        <span aria-hidden className="animate-orbit pointer-events-none absolute -inset-[3px] rounded-full">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-turmeric shadow-[0_0_8px_2px_rgba(240,168,28,0.55)]" />
        </span>
      )}
      {armed && !playing && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-turmeric ring-2 ring-cream" />
      )}
    </button>
  );
}
