# VibeSafe 🛡️

> **You built it. Can you prove it's yours?**

VibeSafe is a privacy-first AI code auditor that analyzes your project and generates a **Proof of Authorship certificate** — identifying your human architectural decisions versus AI-assisted patterns. Powered by **Gemma 4 31B** running via OpenRouter's free tier.

---

## 🧠 What It Does

Drop your project files into VibeSafe and get a structured report across four dimensions:

| Report Section | What You Get |
|---|---|
| 🔑 **Proof of Authorship** | Your human design decisions vs AI-generated patterns, with an originality score |
| 🔐 **Security Audit** | Vulnerabilities, exposed secrets, injection risks with specific fixes |
| 🧠 **Logic Analysis** | Edge cases, dead code, race conditions, code quality score |
| 📖 **Plain English** | What your code actually does, explained simply |

At the end, download a **signed Proof of Authorship certificate** — a plain-text document listing every architectural decision that proves the project is genuinely yours.

---

## 🎯 Why This Exists

The software industry has shifted. AI-assisted development is now standard practice — but that creates a real problem: **how do you prove what you actually built?**

When submitting to a hackathon, applying for a job, or open-sourcing a project, reviewers increasingly ask: *"Did you write this, or did an AI?"*

VibeSafe answers that question — not by detecting AI, but by **surfacing your human decisions**: the architecture choices, the product instincts, the specific tradeoffs only you would have made.

---

## ⚙️ How It Works

```
User uploads code files
        ↓
VibeSafe reads all files and concatenates them
        ↓
Entire codebase sent as single prompt to Gemma 4 31B
(262K context window — no chunking needed for most projects)
        ↓
Gemma 4 returns structured JSON analysis
        ↓
4-section report rendered in the dashboard
        ↓
User downloads Proof of Authorship certificate (.txt)
```

### Why Gemma 4 31B?

- **262K context window** — your entire codebase fits in one prompt. No chunking, no lost context, no missed connections between files.
- **Real Gemma 4** — not a distilled or quantized version. Full model capability for nuanced authorship reasoning.
- **Free via OpenRouter** — zero cost, no credit card, just an API key from openrouter.ai
- **Strong code understanding** — Gemma 4 31B ranks highly on coding and reasoning benchmarks, making it well-suited for security analysis and architectural pattern recognition.

---

## 🚀 Getting Started

### Prerequisites

- A free OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)
- No installation required — VibeSafe runs entirely in the browser

### Usage

1. Go to the VibeSafe web app
2. Paste your OpenRouter API key into the key input field
3. Upload your project files (drag and drop, multiple files supported) — or paste code directly
4. Click **ANALYZE WITH GEMMA 4**
5. Wait 30–90 seconds while Gemma 4 reasons through your codebase
6. View your full report across all four sections
7. Click **DOWNLOAD PROOF OF AUTHORSHIP CERTIFICATE** to save your `.txt` certificate

### Supported File Types

`.py` `.js` `.jsx` `.ts` `.tsx` `.html` `.css` `.json` `.yaml` `.yml` `.sh` `.go` `.rs` `.java` `.php` `.rb` `.sql` `.vue` `.svelte` `.prisma` `.toml` `.env` `.graphql`

---

## 🔐 Privacy

**Your code never leaves your browser session in any persistent way.**

- VibeSafe makes a direct API call from your browser to OpenRouter
- No backend server stores your files
- No database logs your code
- Your API key is stored in React state only — never in localStorage, never sent anywhere except OpenRouter
- Each session is stateless — closing the tab clears everything

---

## 📋 Proof of Authorship Certificate

The exported certificate looks like this:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         VIBESAFE — PROOF OF AUTHORSHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: 2026-05-16T10:32:11.000Z
Analyzed by: Gemma 4 31B via OpenRouter
Files: app.py, utils.py, config.py

HUMAN CONTRIBUTION SCORE: 78/100

WHAT THIS PROJECT DOES
A REST API for managing todo items with user authentication,
SQLite persistence, and a search endpoint.

HUMAN ARCHITECTURAL DECISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Decision to separate database connection into get_db()
   Evidence: Explicit factory function pattern in app.py line 12

2. Choice to use MD5 → SHA256 migration path in auth
   Evidence: dual-hash verification in login() function

3. Stateless token design using user ID
   Evidence: /login returns raw user ID as token, deliberate tradeoff

AI-ASSISTED PATTERNS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Boilerplate Flask route scaffolding
   Location: All @app.route decorators follow identical pattern

2. Generic error handling structure
   Location: try/except blocks in upload handlers

SECURITY STATUS: HIGH
CODE QUALITY: 72/100
VIBE SCORE: 68/100

VERDICT: Solid architecture with critical SQL injection issues
that need fixing before any production deployment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This certificate was generated by VibeSafe
Powered by Gemma 4 · Built for the vibe coding era
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🗂️ Project Structure

```
vibesafe/
├── src/
│   ├── App.jsx                  ← Main app with view state management
│   ├── index.css                ← Global styles, scanline animation
│   └── components/
│       ├── Header.jsx           ← Top bar with branding
│       ├── CodeUploader.jsx     ← File drag-drop + paste tabs + API key input
│       ├── LoadingAnalysis.jsx  ← Animated terminal loading screen
│       ├── ReportDashboard.jsx  ← 4-card report layout
│       ├── AuthorshipCard.jsx   ← Hero card + certificate export
│       ├── SecurityCard.jsx     ← Expandable vulnerability list
│       ├── LogicCard.jsx        ← Quality score + logic issues
│       └── PlainEnglishCard.jsx ← Plain language explanation
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + custom CSS |
| Animations | Framer Motion |
| File handling | react-dropzone |
| AI Model | Gemma 4 31B (`google/gemma-4-31b-it:free`) |
| AI Provider | OpenRouter (free tier) |
| Context window | 262,144 tokens |
| Deployment | Lovable / Vercel / Netlify |

---

## 🔬 Model Selection Rationale

VibeSafe specifically uses **Gemma 4 31B** for these reasons:

**Why not a smaller Gemma 4 model (4B, 2B)?**
Too small for nuanced security pattern recognition and multi-file architectural reasoning. Small models miss cross-file dependencies that are critical for authorship analysis.

**Why not a different provider or model?**
Gemma 4 31B offers 262K context — the entire project in one shot. Competing models with similar context windows either require payment or don't perform as well on structured JSON output for code analysis tasks.

**Why the full 31B dense model over the 26B MoE?**
For security analysis, consistent reasoning quality matters more than inference speed. The 31B dense model activates all parameters for every token, producing more reliable and thorough vulnerability detection.

---


## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙌 Contributing

Pull requests welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📬 Contact

Built by **Simran Shaikh** — [@SimranShaikh20](https://github.com/SimranShaikh20)

---

*VibeSafe · Built for the vibe coding era · Powered by Gemma 4*