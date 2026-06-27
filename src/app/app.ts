import { Component, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Constants ─────────────────────────────────────────────────────────────
const GW        = 960;
const LANE_H    = 290;   // each player lane height
const GROUND_Y  = 205;   // y of ground surface within a lane
const CAR_X     = 190;   // fixed screen x of car in lane
const FRICTION  = 0.982; // per-frame speed decay
const GRAVITY   = 0.40;  // jump gravity per frame²
const TURBO_BOOST    = 2.8;
const TURBO_DURATION = 90;   // frames
const TURBO_COOLDOWN = 480;  // frames

// ── Car Definitions ───────────────────────────────────────────────────────
export interface CarDef {
  id: string; name: string; desc: string;
  color: string; dark: string;
  topSpeed: number;   // px/frame cap
  accel: number;      // speed added per keypress
  spring: number;     // jump height multiplier
  grip: number;       // 0-1  (1 = not affected by oil/mud)
  boulder: number;    // 0-1  (1 = immune to boulders)
}

export const CARS: CarDef[] = [
  { id:'sports',  name:'Sports Car',    desc:'Fastest top speed · Slides on oil · Poor on boulders',
    color:'#ff3333', dark:'#990000',    topSpeed:9,   accel:0.55, spring:0.7,  grip:0.2,  boulder:0.2 },
  { id:'suv',     name:'4×4 SUV',       desc:'All-round reliable · Handles most terrain well',
    color:'#3399ff', dark:'#115599',    topSpeed:7,   accel:0.45, spring:0.95, grip:0.7,  boulder:0.7 },
  { id:'monster', name:'Monster Truck', desc:'Crushes boulders · Epic jumps · But slow top speed',
    color:'#ff8800', dark:'#994400',    topSpeed:5.5, accel:0.38, spring:1.35, grip:0.65, boulder:1.0 },
  { id:'buggy',   name:'Buggy',         desc:'Nimble & bouncy · Great jumper · Fast mashing',
    color:'#44dd44', dark:'#228822',    topSpeed:7.5, accel:0.60, spring:1.20, grip:0.55, boulder:0.45 },
  { id:'van',     name:'Van',           desc:'Slow but steady · Surprising grip',
    color:'#cc88ff', dark:'#7733cc',    topSpeed:5,   accel:0.32, spring:0.60, grip:0.55, boulder:0.40 },
];

// ── Track Definitions ─────────────────────────────────────────────────────
export interface Obstacle {
  type: 'oil' | 'jump' | 'boulders' | 'mud';
  x: number; width: number;
  _cleared?: boolean; // runtime flag per racer copy
}

export interface TrackDef {
  id: string; name: string; desc: string;
  length: number;
  obstacles: Obstacle[];
  skyA: string; skyB: string;
  ground: string; dirt: string;
  accent: string; // scenery color
}

export const TRACKS: TrackDef[] = [
  {
    id:'desert', name:'Desert Dash', desc:'Oil slick → Jump → Boulders · Fast & furious',
    length: 5500,
    obstacles: [
      { type:'oil',     x:850,  width:180 },
      { type:'jump',    x:1550, width:80  },
      { type:'boulders',x:1630, width:320 },
      { type:'mud',     x:2700, width:200 },
      { type:'oil',     x:3500, width:150 },
      { type:'jump',    x:4150, width:80  },
      { type:'boulders',x:4230, width:280 },
    ],
    skyA:'#87CEEB', skyB:'#f0c060', ground:'#c8a05a', dirt:'#a07840', accent:'#e8c88a',
  },
  {
    id:'mountain', name:'Mountain Mayhem', desc:'Mud · Big jumps · Heavy boulders · Longer race',
    length: 7000,
    obstacles: [
      { type:'mud',     x:650,  width:260 },
      { type:'jump',    x:1450, width:90  },
      { type:'boulders',x:1540, width:420 },
      { type:'oil',     x:2700, width:170 },
      { type:'mud',     x:3500, width:310 },
      { type:'jump',    x:4550, width:90  },
      { type:'boulders',x:4640, width:360 },
      { type:'oil',     x:5800, width:150 },
      { type:'jump',    x:6350, width:90  },
      { type:'boulders',x:6440, width:220 },
    ],
    skyA:'#3a5a8a', skyB:'#7a9aba', ground:'#6a7a5a', dirt:'#4a5a3a', accent:'#aabbaa',
  },
  {
    id:'jungle', name:'Jungle Fever', desc:'Dense hazards all the way · The ultimate challenge',
    length: 8000,
    obstacles: [
      { type:'oil',     x:550,  width:200 },
      { type:'mud',     x:1200, width:280 },
      { type:'jump',    x:1950, width:85  },
      { type:'boulders',x:2035, width:350 },
      { type:'oil',     x:2950, width:190 },
      { type:'mud',     x:3600, width:260 },
      { type:'jump',    x:4450, width:85  },
      { type:'boulders',x:4535, width:310 },
      { type:'oil',     x:5400, width:170 },
      { type:'mud',     x:6100, width:290 },
      { type:'jump',    x:6950, width:85  },
      { type:'boulders',x:7035, width:260 },
    ],
    skyA:'#0a2a0a', skyB:'#1a5a1a', ground:'#3a6a1a', dirt:'#2a4a0a', accent:'#4a8a2a',
  },
];

// ── Racer State ───────────────────────────────────────────────────────────
export interface Racer {
  name: string;
  car: CarDef;
  trackX: number;
  speed: number;
  jumpH: number;   // height above ground (0 = on ground)
  jumpVY: number;  // positive = going up
  inAir: boolean;
  turboActive: boolean;
  turboCooldown: number;
  turboTimer: number;
  spinning: boolean;
  spinTimer: number;
  spinAngle: number;
  finished: boolean;
  finishTime: number | null;
  startTime: number;
  wheelRot: number;
  obstacles: Obstacle[];
}

interface LeaderEntry { name: string; trackId: string; timeMs: number; }
type Phase = 'title' | 'name-p1' | 'name-p2' | 'car-p1' | 'car-p2' | 'track' | 'countdown' | 'race' | 'results';

// ── Component ─────────────────────────────────────────────────────────────
@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  readonly GW = GW; readonly LANE_H = LANE_H; readonly GROUND_Y = GROUND_Y; readonly CAR_X = CAR_X;
  readonly CARS = CARS; readonly TRACKS = TRACKS;

  phase          = signal<Phase>('title');
  countdownVal   = signal(3);
  winnerMsg      = signal('');
  flashMsg       = signal('');

  playerCount    = 1;
  nameInput      = '';
  p1Name         = 'Player 1';
  p2Name         = 'Player 2';

  selCarP1: CarDef | null   = null;
  selCarP2: CarDef | null   = null;
  selTrack: TrackDef | null = null;

  p1!: Racer;
  p2!: Racer;

  private gameLoop: number | null = null;
  private lastTime  = 0;
  private cdTimer   = 0;
  private flashTimer = 0;

  private p1Presses = 0;
  private p2Presses = 0;
  keys: Record<string, boolean> = {};

  leaderboard: LeaderEntry[] = [];

  ngOnInit()    {}
  ngOnDestroy() { this.stopLoop(); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    this.keys[e.key] = true;

    // Acceleration presses
    if (e.key === 'ArrowRight') this.p1Presses++;
    if (e.key === 'd' || e.key === 'D') this.p2Presses++;

    // Name entry
    const ph = this.phase();
    if (ph === 'name-p1' || ph === 'name-p2') {
      if (e.key === 'Backspace')  this.nameInput = this.nameInput.slice(0, -1);
      else if (e.key === 'Enter') this.confirmName();
      else if (e.key.length === 1 && this.nameInput.length < 18) this.nameInput += e.key;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) { delete this.keys[e.key]; }

  // ── Flow ──────────────────────────────────────────────────────────────
  pick1P() { this.playerCount = 1; this.nameInput = ''; this.phase.set('name-p1'); }
  pick2P() { this.playerCount = 2; this.nameInput = ''; this.phase.set('name-p1'); }

  confirmName() {
    const val = this.nameInput.trim();
    if (this.phase() === 'name-p1') {
      this.p1Name = val || 'Player 1';
      this.nameInput = '';
      if (this.playerCount === 2) this.phase.set('name-p2');
      else this.phase.set('car-p1');
    } else {
      this.p2Name = val || 'Player 2';
      this.nameInput = '';
      this.phase.set('car-p1');
    }
  }

  pickCar(car: CarDef) {
    if (this.phase() === 'car-p1') {
      this.selCarP1 = car;
      if (this.playerCount === 2) this.phase.set('car-p2');
      else this.phase.set('track');
    } else {
      this.selCarP2 = car;
      this.phase.set('track');
    }
  }

  pickTrack(track: TrackDef) {
    this.selTrack = track;
    this.beginCountdown();
  }

  beginCountdown() {
    this.phase.set('countdown');
    this.countdownVal.set(3);
    this.cdTimer = 0;
    if (!this.gameLoop) this.startLoop();
  }

  launchRace() {
    this.p1 = this.makeRacer(this.p1Name, this.selCarP1!);
    if (this.playerCount === 2) this.p2 = this.makeRacer(this.p2Name, this.selCarP2!);
    this.p1Presses = 0; this.p2Presses = 0;
    this.phase.set('race');
  }

  makeRacer(name: string, car: CarDef): Racer {
    return {
      name, car,
      trackX: 0, speed: 0,
      jumpH: 0, jumpVY: 0, inAir: false,
      turboActive: false, turboCooldown: 0, turboTimer: 0,
      spinning: false, spinTimer: 0, spinAngle: 0,
      finished: false, finishTime: null,
      startTime: performance.now(),
      wheelRot: 0,
      obstacles: this.selTrack!.obstacles.map(o => ({ ...o, _cleared: false })),
    };
  }

  // ── Game Loop ──────────────────────────────────────────────────────────
  startLoop() {
    this.lastTime = 0;
    const tick = (ts: number) => {
      if (this.lastTime === 0) this.lastTime = ts;
      const dt   = Math.min(ts - this.lastTime, 50);
      this.lastTime = ts;
      const f = dt / (1000 / 60);
      this.update(f);
      this.gameLoop = requestAnimationFrame(tick);
    };
    this.gameLoop = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; }
  }

  update(f: number) {
    if (this.flashTimer > 0) { this.flashTimer -= f; if (this.flashTimer <= 0) this.flashMsg.set(''); }

    if (this.phase() === 'countdown') {
      this.cdTimer += f;
      if (this.cdTimer >= 60) {
        this.cdTimer = 0;
        const v = this.countdownVal();
        if (v > 1) this.countdownVal.set(v - 1);
        else { this.countdownVal.set(0); setTimeout(() => this.launchRace(), 200); }
      }
      return;
    }

    if (this.phase() !== 'race') return;

    this.updateRacer(this.p1, true, f);
    if (this.playerCount === 2) this.updateRacer(this.p2, false, f);

    this.p1Presses = 0;
    this.p2Presses = 0;

    const p1done = this.p1.finished;
    const p2done = this.playerCount === 1 || this.p2.finished;
    if (p1done && p2done) this.endRace();
  }

  updateRacer(r: Racer, isP1: boolean, f: number) {
    if (r.finished) return;

    // Acceleration (key press counts)
    let presses = isP1 ? this.p1Presses : this.p2Presses;
    if (this.playerCount === 1) presses = this.p1Presses + this.p2Presses; // both keys in 1P
    if (!r.spinning && presses > 0)
      r.speed = Math.min(r.speed + r.car.accel * presses, r.car.topSpeed);

    // Turbo
    const wantsTurbo = isP1
      ? (this.keys['l'] || this.keys['L'] || (this.playerCount === 1 && this.keys[' ']))
      : !!this.keys[' '];
    if (wantsTurbo && !r.turboActive && r.turboCooldown <= 0) {
      r.turboActive   = true;
      r.turboTimer    = TURBO_DURATION;
      r.turboCooldown = TURBO_COOLDOWN;
    }
    if (r.turboActive) {
      r.speed = Math.min(r.speed + TURBO_BOOST * f / 30, r.car.topSpeed * 1.6);
      r.turboTimer -= f;
      if (r.turboTimer <= 0) r.turboActive = false;
    }
    if (r.turboCooldown > 0) r.turboCooldown -= f;

    // Friction
    r.speed = Math.max(0, r.speed * Math.pow(FRICTION, f));

    // Spin (oil/mud hit)
    if (r.spinning) {
      r.spinTimer -= f;
      r.spinAngle  = (r.spinAngle + 8 * f) % 360;
      r.speed     *= Math.pow(0.93, f);
      if (r.spinTimer <= 0) { r.spinning = false; r.spinAngle = 0; }
    }

    // Jump physics
    if (r.inAir) {
      r.jumpH  += r.jumpVY * f;
      r.jumpVY -= GRAVITY * f;
      if (r.jumpH <= 0) { r.jumpH = 0; r.jumpVY = 0; r.inAir = false; }
    }

    // Move
    r.trackX   += r.speed * f;
    r.wheelRot  = (r.wheelRot + r.speed * 5 * f) % 360;

    // Obstacle collisions
    for (const obs of r.obstacles) {
      if (obs._cleared) continue;
      const carFront = r.trackX + 30;
      const carBack  = r.trackX - 30;
      const inZone   = carFront > obs.x && carBack < obs.x + obs.width;
      if (!inZone) continue;

      if (obs.type === 'jump' && !r.inAir) {
        r.jumpVY = Math.max(r.speed, 2) * 1.15 * r.car.spring;
        r.inAir  = true;
        obs._cleared = true;
      } else if (obs.type === 'boulders') {
        if (r.inAir) {
          // flying over — clear once past
          if (r.trackX > obs.x + obs.width) obs._cleared = true;
        } else {
          r.speed     *= (0.15 + 0.65 * r.car.boulder);
          obs._cleared = true;
        }
      } else if ((obs.type === 'oil' || obs.type === 'mud') && !r.spinning) {
        const resist = obs.type === 'oil' ? r.car.grip : (r.car.grip * 0.7 + 0.3);
        r.speed     *= (0.15 + 0.55 * resist);
        r.spinning   = true;
        r.spinTimer  = obs.type === 'oil' ? 55 : 35;
        obs._cleared = true;
      }
    }

    // Finish line
    if (r.trackX >= this.selTrack!.length) {
      r.trackX    = this.selTrack!.length;
      r.finished  = true;
      r.finishTime = performance.now() - r.startTime;
    }
  }

  endRace() {
    this.stopLoop();
    const t = this.selTrack!;

    // Leaderboard
    const record = (r: Racer) => {
      if (r.finishTime !== null)
        this.leaderboard.push({ name: r.name, trackId: t.id, timeMs: r.finishTime });
    };
    record(this.p1);
    if (this.playerCount === 2) record(this.p2);
    this.leaderboard.sort((a, b) => a.timeMs - b.timeMs);

    // Winner message
    if (this.playerCount === 1) {
      this.winnerMsg.set(`${this.p1.name} finished in ${this.fmtTime(this.p1.finishTime!)}`);
    } else {
      const p1t = this.p1.finishTime ?? Infinity;
      const p2t = this.p2.finishTime ?? Infinity;
      const winner = p1t <= p2t ? this.p1.name : this.p2.name;
      this.winnerMsg.set(`🏆 ${winner} WINS!`);
    }

    this.phase.set('results');
  }

  raceAgain() {
    this.stopLoop();
    this.gameLoop = null;
    this.phase.set('track');
  }

  backToTitle() {
    this.stopLoop();
    this.gameLoop   = null;
    this.selCarP1   = null;
    this.selCarP2   = null;
    this.selTrack   = null;
    this.phase.set('title');
  }

  // ── Template Helpers ───────────────────────────────────────────────────
  cameraX(r: Racer): number {
    return Math.max(0, Math.min(r.trackX - CAR_X, this.selTrack!.length - GW + 50));
  }

  carTransform(r: Racer): string {
    const angle = r.spinning ? `rotate(${r.spinAngle.toFixed(1)})` : '';
    return `translate(${CAR_X} ${GROUND_Y - r.jumpH}) ${angle}`;
  }

  obsInView(r: Racer): Obstacle[] {
    const cx = this.cameraX(r);
    return r.obstacles.filter(o => o.x + o.width > cx - 50 && o.x < cx + GW + 50);
  }

  obsX(obs: Obstacle, r: Racer): number { return obs.x - this.cameraX(r); }

  finishX(r: Racer): number { return this.selTrack!.length - this.cameraX(r); }

  progressPct(r: Racer): number {
    return Math.min(100, (r.trackX / this.selTrack!.length) * 100);
  }

  turboPct(r: Racer): number {
    if (r.turboActive) return 100;
    if (r.turboCooldown <= 0) return 100;
    return Math.max(0, 100 - (r.turboCooldown / TURBO_COOLDOWN) * 100);
  }

  turboReady(r: Racer): boolean { return r.turboCooldown <= 0 && !r.turboActive; }

  fmtTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor((ms % 1000) / 100);
    return `${s}.${h}s`;
  }

  bestForTrack(trackId: string): LeaderEntry[] {
    return this.leaderboard.filter(e => e.trackId === trackId).slice(0, 8);
  }

  statDots(val: number): boolean[] {
    const filled = Math.round(val * 5);
    return Array(5).fill(false).map((_, i) => i < filled);
  }

  nameLabel(): string { return this.phase() === 'name-p1' ? this.p1Name : this.p2Name; }
  carPickerTitle(): string { return this.phase() === 'car-p1' ? `${this.p1Name}, pick your car!` : `${this.p2Name}, pick your car!`; }
  isSelectedCar(car: CarDef): boolean {
    return this.phase() === 'car-p1' ? this.selCarP1?.id === car.id : this.selCarP2?.id === car.id;
  }

  // Scenery helpers – tree/cactus positions per track
  sceneryX(): number[] {
    const t = this.selTrack;
    if (!t) return [];
    return Array.from({ length: Math.floor(t.length / 200) }, (_, i) => i * 200 + 100);
  }
}
