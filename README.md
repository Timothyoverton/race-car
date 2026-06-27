# Race Car 🏎

Mica's Racing Championship — a neon retro side-view racing game built with Angular 20.

## Play Now

🏁 **Play the game:** https://timothyoverton.github.io/race-car/

## How to Play

### Controls

| | Player 1 | Player 2 |
|---|---|---|
| **Accelerate** | → Right Arrow | D |
| **Turbo Boost** | L | Spacebar |

In **1 Player** mode, both sets of controls work for the single player.

### Game Flow

1. **Title screen** — choose 1 or 2 players
2. **Enter your name** — type it in, press Enter
3. **Pick a car** — 5 cars with different stats
4. **Pick a track** — 3 tracks with increasing difficulty
5. **Race!** — mash your key to go faster, hit Turbo for a burst of speed

### The Tracks

| Track | Hazards | Length |
|---|---|---|
| Desert Dash | Oil slick, Jump, Boulders, Mud | Short |
| Mountain Mayhem | Mud, Big jumps, Heavy boulders | Medium |
| Jungle Fever | Dense hazards all the way | Long |

### Hazards

- **Oil Slick** 🛢 — Spins your car and cuts speed. High-grip cars handle it better.
- **Jump Ramp** 🟨 — Launches you into the air! Hit it with speed to fly over the boulders.
- **Boulder Field** ⚫ — Massive slowdown. Monster Truck is completely immune. Jump over them!
- **Mud** 🟫 — Slows you down. Worse than oil if you have poor grip.

### The Cars

| Car | Speed | Jump | Grip | Boulder |
|---|---|---|---|---|
| 🔴 Sports Car | ⭐⭐⭐⭐⭐ | ★★★ | ★ | ★ |
| 🔵 4×4 SUV | ⭐⭐⭐ | ★★★★ | ★★★★ | ★★★★ |
| 🟠 Monster Truck | ⭐⭐ | ⭐⭐⭐⭐⭐ | ★★★★ | ⭐⭐⭐⭐⭐ |
| 🟢 Buggy | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ★★★ | ★★ |
| 🟣 Van | ⭐ | ★★ | ★★★ | ★★ |

### Tips

- Mash your acceleration key as fast as you can — speed builds with each press!
- Save Turbo boost for after a hazard to recover lost speed
- Hit the jump ramp with maximum speed to fly clear over the boulder field
- Monster Truck is slow but nothing stops it — great for beginners

## Local Development

```bash
npm install
npm start
```

Visit http://localhost:4200/

## Build and Deploy

```bash
npm run deploy
```

---

Designed by Mica · Built with Angular 20 · Deployed via GitHub Pages
