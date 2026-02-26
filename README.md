# 🧠 ReasonTrace

**Chain-of-Thought Reasoning Visualizer**

> Paste an AI's reasoning trace → get an interactive thinking tree.

## 🌳 [Visualize Reasoning →](https://mrunreal.github.io/ReasonTrace/)

![Models](https://img.shields.io/badge/Works%20With-o3%20·%20R1%20·%20Claude-purple?style=for-the-badge)
![D3.js](https://img.shields.io/badge/Built%20with-D3.js-orange?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-Interactive%20Viz-blue?style=for-the-badge)

---

## What Is This?

Reasoning models like o3, DeepSeek R1, and Claude produce long "thinking" traces — but they're just walls of text. ReasonTrace parses these into an **interactive tree visualization**, revealing:

- **Reasoning steps** — The logical flow of thought
- **Backtracks** — "Wait, that doesn't work..."
- **Self-corrections** — "Actually, I was wrong about..."
- **Explorations** — Branching into different approaches
- **Conclusions** — Final answers and results
- **Verifications** — "Let me check this..."

## Features

- **Smart Parser** — Detects reasoning patterns, backtracks, corrections, conclusions
- **Interactive D3.js Tree** — Zoom, pan, click nodes for full text
- **Color-Coded Nodes** — Instantly see reasoning type at a glance
- **Pre-loaded Examples** — o3 math, Claude debugging, R1 logic puzzles
- **Stats Dashboard** — Step count, depth, backtrack count, corrections
- **Zero Backend** — Everything runs in your browser

## Node Types

| Color | Type | Detected By |
|---|---|---|
| 🟣 Indigo | Reasoning | Default thinking steps |
| 🔵 Blue | Exploration | "Let me consider...", "Option 1:" |
| 🟡 Amber | Backtrack | "Wait...", "Hmm...", contradictions |
| 🔴 Red | Correction | "Actually...", "I was wrong..." |
| 🟢 Green | Conclusion | "Therefore...", "The answer is..." |
| 🔷 Cyan | Verification | "Let me verify...", "Checking..." |

## Example Traces Included

- **o3 — Mathematical Reasoning** — Factoring a cubic with verification
- **Claude — Code Debugging** — Finding a bug with self-correction
- **R1 — Logic Puzzle** — Hat color puzzle with case analysis
- **o3 — Ethical Dilemma** — Trolley problem with multiple frameworks
- **Claude — System Design** — URL shortener with iterative refinement

## Tech Stack

- **Vanilla JavaScript** + **D3.js** — Interactive tree rendering
- **Smart text parser** — Pattern-based reasoning detection
- **GitHub Pages** — Free hosting, zero backend
- **Inter + JetBrains Mono** — Clean typography

## License

MIT — Use it, fork it, trace your reasoning.

---

*Part of a portfolio of AI ecosystem tools:*
*[ModelForest](https://github.com/MrUnreal/ModelForest) · [LLMTracker](https://github.com/MrUnreal/LLMTracker) · [AIGraveyard](https://github.com/MrUnreal/AIGraveyard) · [ContextScale](https://github.com/MrUnreal/ContextScale) · ReasonTrace*