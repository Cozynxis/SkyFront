<div align="center">

# ☁️ SKYFRONT
### Drop in. Explore. Be the last one standing.

**An original, browser-based 3D battle royale game — currently in alpha development.**

[🎮 Play SKYFRONT](https://cozynxis.github.io/SkyFront/) · [🐛 Report an Issue](https://github.com/Cozynxis/SkyFront/issues) · [⚙️ Builds](https://github.com/Cozynxis/SkyFront/actions)

</div>

---

## 🌍 Welcome to SKYFRONT

**SKYFRONT** is an original, Fortnite-inspired multiplayer battle royale project designed to run directly in your browser. The goal is to build a colorful, expansive world where players can hang out in the lobby, customize their character, team up with friends, jump into the Battle Bus and fight to be the last player standing.

The game is being developed in public and is **still in alpha**. Features, maps, gameplay mechanics and visuals are actively changing; not everything described as a goal is playable yet.

## ✨ Features & development progress

| Area | What's in the project | Status |
| --- | --- | --- |
| 🏠 **Lobby** | Game mode selection, animated interface and character previews | 🧪 Alpha |
| 👕 **Locker** | Character cosmetics and 3D skin previews | 🧪 Alpha |
| 🤝 **Social** | Accounts, friends, party management and invitations | 🧪 Alpha |
| 🏝️ **Spawn Island** | 3D environment with imported scenery, movement and jumping | 🧪 Alpha |
| 🚌 **Battle Bus** | Pre-match transition and Battle Bus flight sequence | 🧪 Alpha |
| 🗺️ **Battle Royale World** | Larger explorable island, terrain and points of interest | 🚧 In development |
| 🎒 **Gameplay UI** | HUD, inventory, minimap and player controls | 🧪 Alpha |
| 📰 **Community** | News, announcements and polls | 🧪 Alpha |
| 🎫 **Support Portal** | Player tickets, attachments, replies and admin management | 🧪 Alpha |
| 🛡️ **Admin Panel** | News management, support dashboard, ticket filters and priorities | 🧪 Alpha |
| 🏆 **Complete Battle Royale** | Full matches, large player counts, polished combat and win conditions | 📋 Planned / in development |

> **Note:** The current gameplay and matchmaking are experimental. Do not assume that full 40-player matchmaking or production-ready online Battle Royale matches are available yet.

## 🎮 Controls

These are the main controls used in the current gameplay prototype:

| Key | Action |
| --- | --- |
| **W / A / S / D** | Move |
| **Mouse** | Look around (click the game to lock the pointer) |
| **Space** | Jump |
| **Shift** | Sprint |
| **Ctrl** | Crouch |
| **M** | Toggle the map |

Other controls and interactions may change as development continues.

## 🛠️ Built with

- **JavaScript, HTML & CSS** — UI and gameplay logic
- **Three.js** — real-time 3D rendering
- **Vite** — development server and production builds
- **Supabase** — authentication and community/social data
- **GitHub Actions & GitHub Pages** — automated web deployment

## 🚀 Run locally

**Requirements:** A recent version of Node.js and npm.

```bash
git clone https://github.com/Cozynxis/SkyFront.git
cd SkyFront
npm install
npm run dev
```

Open the local URL printed by Vite.

To build and preview a production version:

```bash
npm run build
npm run preview
```

The Vite build output is generated in `dist/`.

## 📁 Project overview

```text
SkyFront/
├── public/                 # Public images, audio and 3D model assets
├── src/
│   ├── main.js             # App entry point and lobby navigation
│   ├── gameplay.js         # Gameplay prototype and match flow
│   ├── spawn-scenery.js    # Spawn Island environment assets
│   ├── battle-royale-world.js
│   ├── battle-bus.js
│   ├── game-hud.js
│   ├── inventory.js
│   ├── community.js        # Community and Supabase integration
│   ├── support.js          # Support tickets and admin support tools
│   └── ...
├── .github/workflows/      # CI / deployment
├── package.json
└── vite.config.js
```

## 🧭 Roadmap

- [ ] Expand and polish the Battle Royale island with distinctive locations
- [ ] Improve the Battle Bus, drop and landing experience
- [ ] Develop reliable multiplayer matchmaking and synchronized matches
- [ ] Expand combat, loot, inventory and building/gameplay systems
- [ ] Improve performance and mobile/browser compatibility
- [ ] Refine the Locker, cosmetics, animations and game audio
- [ ] Keep improving the Support Portal and moderation/admin tools

The roadmap is aspirational, not a promise of release dates.

## 🐛 Bugs, feedback & support

Found a problem or have an idea? Use the **Support** option in the in-game lobby menu to submit a ticket, or open a [GitHub issue](https://github.com/Cozynxis/SkyFront/issues) for repository-related bugs.

Please do not share passwords, authentication tokens or other private account details in issues or support attachments.

## 📜 Project notice

SKYFRONT is an **independent, original fan-inspired game project**. It is not affiliated with, sponsored by or endorsed by Epic Games or Fortnite. Names, artwork and assets belonging to their respective owners remain their property.

---

<div align="center">

**☁️ SKYFRONT — THE SKY IS JUST THE BEGINNING.**

*Made with creativity, code and a lot of iteration.*

</div>
