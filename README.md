# [ ANTIGRAVITY MANAGER : MUSKZ COMMAND EDITION ]

A highly customized, minimalist, and hardware-focused fork of the original Antigravity Manager. Redesigned from the ground up for absolute efficiency and precision.

---

### [ SYSTEM OVERVIEW ]

**Antigravity Manager** is a high-performance LLM / API Quota Management system and local proxy gateway. It is designed to effortlessly manage pools of Google Gemini and Anthropic Claude accounts, routing your development traffic intelligently.

The core purpose of this system is to provide a seamless, type-safe API proxy layer (running locally) that balances requests across multiple LLM accounts to avoid rate limits, maximize throughput, and automatically fall back to alternative nodes when quotas are exhausted.

---

### [ CORE PROTOCOLS ]

#### AUTONOMOUS ROUTING (AUTO-SWITCH)
The system is equipped with an autonomous routing engine. When `AUTO-SWITCH` is active, the network operation console continuously monitors the quota status of all connected account nodes. If a primary node hits a rate limit or exhausts its capacity, the system automatically redirects incoming traffic to the next healthiest node in the pool. No manual intervention required. 

#### INTELLIGENT MODEL MAPPING
Seamlessly translate requests. Map `Claude Code` calls to `Gemini 3.1 Pro` or `Flash` endpoints on the fly. The proxy handles protocol translation natively, allowing tools like Cursor, Windsurf, or NextChat to utilize your managed account pool without friction.

---

### [ DESIGN PHILOSOPHY ]

#### MINIMALIST BRUTALISM
This fork abandons the traditional "Industrial Cyberpunk" neon-glow aesthetics in favor of a **Clean Engineering** approach. 

- **Pure Monochromatic Contrast**: Deep, absolute black backgrounds paired with high-contrast matte white elements. 
- **Typography-First**: Uppercase, tracked-out font structures that mimic hardware diagnostic screens and terminal interfaces.
- **Zero Distractions**: No gradients. No unnecessary borders. No neon shadows. Every pixel serves a functional purpose.

It is an interface designed not just to look professional, but to feel like mission-critical control software.

---

### [ TECH STACK ]

- **Core**: Electron (Main/Renderer Architecture)
- **Frontend Engine**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (Flat, glow-free architecture)
- **State & Routing**: TanStack Query + TanStack Router
- **Backend Services**: NestJS Proxy Layer + Better-SQLite3
- **Type Safety**: Zod + ORPC (End-to-End safe)

---

### [ DEPLOYMENT & OPERATION ]

To initialize the command console on your local hardware:

#### 1. INSTALL DEPENDENCIES
Ensure you are running Node.js 20+.
```bash
npm install
```

#### 2. INITIATE SYSTEM
Boot the Electron development environment.
```bash
npm start
```

#### 3. BUILD FOR PRODUCTION
Package the binary for your specific architecture.
```bash
npm run make
```

---

*“Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.”*
