import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeWithLovable } from "@/lib/analyze.functions";

export const Route = createFileRoute("/")({
  component: VibeSafeApp,
});

const ACCEPTED_EXT = [
  ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json",
  ".yaml", ".yml", ".sh", ".go", ".rs", ".java", ".php", ".rb",
  ".sql", ".vue", ".svelte", ".prisma", ".toml", ".env", ".graphql",
];

const LOADING_STEPS = [
  "› Connecting to OpenRouter API...",
  "› Reading codebase structure...",
  "› Running security vulnerability scan...",
  "› Checking for exposed API keys and secrets...",
  "› Analyzing logic and edge cases...",
  "› Identifying human architectural decisions...",
  "› Detecting AI-generated patterns...",
  "› Generating Proof of Authorship certificate...",
];

type View = "upload" | "loading" | "report";

interface SecurityIssue {
  severity: string;
  type: string;
  description: string;
  location: string;
  fix: string;
}
interface LogicIssue {
  type: string;
  description: string;
  location: string;
  impact: string;
}
interface Report {
  security: { risk_level: string; issues: SecurityIssue[]; summary: string };
  logic: { issues: LogicIssue[]; code_quality_score: number; summary: string };
  plain_english: { what_it_does: string; architecture: string; main_flows: string[] };
  authorship: {
    human_decisions: { decision: string; evidence: string }[];
    ai_patterns: { pattern: string; location: string }[];
    originality_score: number;
    authorship_summary: string;
  };
  overall: { vibe_score: number; one_liner: string; top_priority_fix: string };
}

const readFiles = async (files: File[]): Promise<{ name: string; content: string }[]> => {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ name: string; content: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ name: file.name, content: String(e.target?.result ?? "") });
          reader.readAsText(file);
        }),
    ),
  );
};

const analyzeCode = async (code: string, apiKey: string): Promise<Report> => {
  const trimmedKey = apiKey.trim();

  if (!trimmedKey || trimmedKey.length < 10) {
    throw new Error("API key is empty. Please enter your OpenRouter key.");
  }

  const prompt = `You are VibeSafe, an expert at analyzing vibe-coded projects. Identify what the human developer intentionally designed versus AI-generated or boilerplate code.

Analyze this code and return ONLY raw JSON starting with {
No markdown. No backticks. No explanation before or after the JSON.

CODE TO ANALYZE:
${code}

Return exactly this JSON structure:
{
  "security": {
    "risk_level": "LOW",
    "issues": [
      { "severity": "HIGH", "type": "Issue category", "description": "what the vulnerability is", "location": "filename and location", "fix": "specific fix" }
    ],
    "summary": "2 sentence security overview"
  },
  "logic": {
    "issues": [
      { "type": "Issue category", "description": "logic problem explanation", "location": "filename and location", "impact": "MEDIUM" }
    ],
    "code_quality_score": 70,
    "summary": "2 sentence quality overview"
  },
  "plain_english": {
    "what_it_does": "explain in 3 simple sentences",
    "architecture": "technical architecture in 2 sentences",
    "main_flows": ["flow 1", "flow 2", "flow 3"]
  },
  "authorship": {
    "human_decisions": [
      {"decision": "specific design choice only a human would make intentionally", "evidence": "where in code"},
      {"decision": "another human architectural decision", "evidence": "where in code"},
      {"decision": "third human decision showing original thinking", "evidence": "where in code"}
    ],
    "ai_patterns": [
      {"pattern": "boilerplate or AI-generated pattern", "location": "where"},
      {"pattern": "another templated section", "location": "where"}
    ],
    "originality_score": 72,
    "authorship_summary": "2 honest sentences about human vs AI contribution"
  },
  "overall": {
    "vibe_score": 65,
    "one_liner": "one punchy verdict sentence",
    "top_priority_fix": "single most important fix"
  }
}`;

  const MODEL_CHAIN = [
    "google/gemma-4-31b-it:free",
    "google/gemma-3-27b-it:free",
    "google/gemma-3-12b-it:free",
    "google/gemma-2-9b-it:free",
  ];

  let response: Response | null = null;
  let lastErr = "";
  let usedModel = "";

  for (const model of MODEL_CHAIN) {
    console.log("Trying model:", model);
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + trimmedKey,
        "HTTP-Referer": "https://vibesafe.app",
        "X-Title": "VibeSafe",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    console.log("Response status for", model, ":", r.status);

    if (r.ok) {
      response = r;
      usedModel = model;
      break;
    }

    const errText = await r.text();
    lastErr = "OpenRouter " + r.status + " on " + model + ": " + errText.substring(0, 200);
    console.log("Error:", lastErr);

    // Only fall through on rate limit / upstream errors; abort on auth errors
    if (r.status === 401 || r.status === 403) {
      throw new Error(lastErr);
    }
  }

  let raw = "";

  if (response) {
    console.log("Succeeded with model:", usedModel);
    const data = await response.json();
    console.log("Full response:", JSON.stringify(data).substring(0, 500));
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("No choices in response: " + JSON.stringify(data).substring(0, 300));
    }
    raw = data.choices[0].message.content;
  } else {
    console.warn("All OpenRouter free Gemma models failed. Falling back to Lovable AI...");
    try {
      const fallback = await analyzeWithLovable({ data: { prompt } });
      console.log("Lovable AI fallback succeeded with model:", fallback.model);
      raw = fallback.content;
    } catch (fbErr) {
      const fbMsg = fbErr instanceof Error ? fbErr.message : String(fbErr);
      throw new Error(
        "All free Gemma models rate-limited AND Lovable AI fallback failed. " +
          "OpenRouter: " + lastErr + " · Lovable: " + fbMsg,
      );
    }
  }

  console.log("Raw content:", raw.substring(0, 300));

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1) {
    throw new Error("No JSON found. Model said: " + raw.substring(0, 300));
  }

  const clean = raw.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(clean) as Report;
  } catch {
    throw new Error("JSON parse failed: " + clean.substring(0, 200));
  }
};

const exportCertificate = (report: Report, filesAnalyzed: string[]) => {
  const now = new Date().toISOString();
  const { security, logic, plain_english, authorship, overall } = report;

  const content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              VIBESAFE — PROOF OF AUTHORSHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${now}
Analyzed by: google/gemma-4-31b-it via OpenRouter
Files: ${filesAnalyzed?.join(", ") || "pasted code"}

HUMAN CONTRIBUTION SCORE: ${authorship.originality_score}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THIS PROJECT DOES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${plain_english.what_it_does}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUMAN ARCHITECTURAL DECISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${authorship.human_decisions.map((d, i) => `${i + 1}. ${d.decision}\n   Evidence: ${d.evidence}`).join("\n\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI-ASSISTED PATTERNS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${authorship.ai_patterns.map((p, i) => `${i + 1}. ${p.pattern}\n   Location: ${p.location}`).join("\n\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${authorship.authorship_summary}

SECURITY STATUS: ${security.risk_level}
CODE QUALITY: ${logic.code_quality_score}/100
VIBE SCORE: ${overall.vibe_score}/100

VERDICT: ${overall.one_liner}
PRIORITY FIX: ${overall.top_priority_fix}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This certificate was generated by VibeSafe
Powered by Gemma 4 31B via OpenRouter · Built for the vibe coding era
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vibesafe-authorship-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function scoreColor(score: number): string {
  if (score >= 75) return "#00ff88";
  if (score >= 50) return "#ffb347";
  return "#ff4444";
}

function severityColors(sev: string) {
  const s = sev.toUpperCase();
  if (s === "CRITICAL") return { bg: "rgba(255,68,68,0.12)", border: "#ff4444", text: "#ff4444" };
  if (s === "HIGH") return { bg: "rgba(255,68,68,0.08)", border: "#ff444480", text: "#ff444499" };
  if (s === "MEDIUM") return { bg: "rgba(255,179,71,0.12)", border: "#ffb347", text: "#ffb347" };
  return { bg: "rgba(68,136,255,0.12)", border: "#4488ff", text: "#4488ff" };
}

function impactColor(impact: string): string {
  const i = impact.toUpperCase();
  if (i === "HIGH") return "#ff4444";
  if (i === "MEDIUM") return "#ffb347";
  return "#4488ff";
}

function VibeSafeApp() {
  const [view, setView] = useState<View>("upload");
  const [apiKey, setApiKey] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedCode, setPastedCode] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [report, setReport] = useState<Report | null>(null);
  const [meta, setMeta] = useState<{ files: string[]; tokens: number } | null>(null);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => {
      const lower = f.name.toLowerCase();
      return ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
    });
    setFiles((prev) => [...prev, ...arr]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const onFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const resetAll = () => {
    setView("upload");
    setReport(null);
    setMeta(null);
    setError("");
    setLoadingStep(0);
  };

  const handleAnalyze = async () => {
    setError("");
    if (!apiKey || apiKey.length < 20) {
      setError("⚠ Please enter your OpenRouter API key above first.");
      return;
    }
    if (activeTab === "upload" && files.length === 0) {
      setError("⚠ Please upload at least one code file.");
      return;
    }
    if (activeTab === "paste" && !pastedCode.trim()) {
      setError("⚠ Please paste some code first.");
      return;
    }

    setView("loading");
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(stepInterval);
          return LOADING_STEPS.length - 1;
        }
        return prev + 1;
      });
    }, 1200);

    try {
      let code = "";
      let fileNames: string[] = [];

      if (activeTab === "upload" && files.length > 0) {
        const contents = await readFiles(files);
        code = contents.map((f) => `\n\n=== FILE: ${f.name} ===\n${f.content}`).join("");
        fileNames = files.map((f) => f.name);
      } else {
        code = pastedCode;
        fileNames = ["pasted_code.txt"];
      }

      const result = await analyzeCode(code, apiKey);
      clearInterval(stepInterval);
      setReport(result);
      setMeta({ files: fileNames, tokens: Math.floor(code.length / 4) });
      setView("report");
    } catch (err) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : String(err);
      console.error("VibeSafe analysis failed:", msg);
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f", color: "#e0e0f0" }}>
      <div className="vs-scanline" />

      {/* HEADER */}
      <header
        className="w-full flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid #1e1e2e" }}
      >
        <div className="font-display font-bold text-xl">
          <span style={{ color: "#00ff88" }}>VIBE</span>
          <span style={{ color: "#e0e0f0" }}>SAFE</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#4a4a6a" }}>
          <span
            className="vs-pulse inline-block w-2 h-2 rounded-full"
            style={{ background: "#00ff88" }}
          />
          <span>Privacy-first · Powered by Gemma 4 31B</span>
        </div>
      </header>

      <main className="flex-1 px-6 pb-16">
        <AnimatePresence mode="wait">
          {view === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <UploadView
                apiKey={apiKey}
                setApiKey={setApiKey}
                files={files}
                setFiles={setFiles}
                pastedCode={pastedCode}
                setPastedCode={setPastedCode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                error={error}
                dragging={dragging}
                setDragging={setDragging}
                onDrop={onDrop}
                onFilePick={onFilePick}
                onAnalyze={handleAnalyze}
                removeFile={removeFile}
                fileInputRef={fileInputRef}
              />
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[70vh]"
            >
              <LoadingView step={loadingStep} error={error} onRetry={resetAll} />
            </motion.div>
          )}

          {view === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto pt-8"
            >
              <ReportView report={report} meta={meta} onReset={resetAll} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer
        className="w-full py-3 text-center text-xs"
        style={{
          borderTop: "1px solid #1e1e2e",
          background: "#0a0a0f",
          color: "#4a4a6a",
        }}
      >
        VibeSafe · Gemma 4 31B · OpenRouter Free · 262K context
      </footer>
    </div>
  );
}

/* ───────────────────── UPLOAD VIEW ───────────────────── */
interface UploadViewProps {
  apiKey: string;
  setApiKey: (s: string) => void;
  files: File[];
  setFiles: (f: File[]) => void;
  pastedCode: string;
  setPastedCode: (s: string) => void;
  activeTab: "upload" | "paste";
  setActiveTab: (t: "upload" | "paste") => void;
  error: string;
  dragging: boolean;
  setDragging: (b: boolean) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFilePick: (e: ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  removeFile: (i: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function UploadView(p: UploadViewProps) {
  const keyOk = p.apiKey.length > 20;

  return (
    <div className="max-w-4xl mx-auto pt-12 pb-8">
      <h1 className="font-display font-bold text-4xl md:text-5xl text-center leading-tight">
        <span style={{ color: "#e0e0f0" }}>You vibe coded it.</span>
        <br />
        <span style={{ color: "#00ff88" }}>Can you prove it's yours?</span>
      </h1>
      <p
        className="text-sm text-center max-w-lg mx-auto mt-4 leading-relaxed"
        style={{ color: "#4a4a6a" }}
      >
        Drop your project files. Get a signed Proof of Authorship report showing exactly what
        YOU designed vs what AI generated. Built for the vibe coding era.
      </p>

      {/* API KEY */}
      <div className="max-w-2xl mx-auto mt-8">
        <label className="block text-xs mb-1" style={{ color: "#00ff88" }}>
          OPENROUTER API KEY
        </label>
        <input
          type="password"
          value={p.apiKey}
          onChange={(e) => p.setApiKey(e.target.value)}
          placeholder="Paste your key from openrouter.ai/keys"
          className="w-full p-3 text-sm outline-none transition-colors"
          style={{
            background: "#111118",
            border: `1px solid ${p.apiKey ? (keyOk ? "#00ff88" : "#1e1e2e") : "#1e1e2e"}`,
            color: "#e0e0f0",
            fontFamily: "JetBrains Mono, monospace",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#00ff88")}
          onBlur={(e) => (e.currentTarget.style.borderColor = keyOk ? "#00ff88" : "#1e1e2e")}
        />
        <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
          Free tier available · No credit card needed · {p.apiKey.length} characters
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: keyOk ? "#00ff88" : "#ff4444" }}
          />
          <span style={{ color: "#4a4a6a" }}>{keyOk ? "API Ready" : "Key required"}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-2xl mx-auto mt-6">
        <div className="flex">
          {(["upload", "paste"] as const).map((tab) => {
            const active = p.activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => p.setActiveTab(tab)}
                className="px-5 py-2 text-xs font-mono transition-colors"
                style={{
                  background: active ? "#111118" : "transparent",
                  border: `1px solid ${active ? "#00ff88" : "#1e1e2e"}`,
                  borderBottom: active ? "1px solid #111118" : "1px solid #1e1e2e",
                  color: active ? "#00ff88" : "#4a4a6a",
                  marginBottom: active ? "-1px" : "0",
                  position: "relative",
                  zIndex: active ? 2 : 1,
                }}
              >
                {tab === "upload" ? "📁 Upload Files" : "📋 Paste Code"}
              </button>
            );
          })}
        </div>

        <div style={{ border: "1px solid #1e1e2e", borderTop: "none", background: "transparent" }}>
          {p.activeTab === "upload" ? (
            <div className="p-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  p.setDragging(true);
                }}
                onDragLeave={() => p.setDragging(false)}
                onDrop={p.onDrop}
                onClick={() => p.fileInputRef.current?.click()}
                className="text-center cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${p.dragging ? "#00ff88" : "#1e1e2e"}`,
                  background: p.dragging ? "rgba(0,255,136,0.05)" : "#111118",
                  padding: "4rem 1rem",
                  boxShadow: p.dragging ? "0 0 20px rgba(0,255,136,0.3)" : "none",
                }}
              >
                <div className="text-5xl mb-3">{p.dragging ? "🟢" : "📂"}</div>
                <div className="text-sm" style={{ color: "#e0e0f0" }}>
                  Drag & drop your project files
                </div>
                <div className="text-xs mt-2" style={{ color: "#4a4a6a" }}>
                  .py .js .jsx .ts .tsx .html .css .json .go .rs .php .yaml .sql
                </div>
                <input
                  ref={p.fileInputRef}
                  type="file"
                  multiple
                  onChange={p.onFilePick}
                  accept={ACCEPTED_EXT.join(",")}
                  style={{ display: "none" }}
                />
              </div>

              {p.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1 text-xs"
                      style={{
                        background: "#0a0a0f",
                        border: "1px solid #1e1e2e",
                        color: "#e0e0f0",
                      }}
                    >
                      <span>{f.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          p.removeFile(i);
                        }}
                        className="transition-colors"
                        style={{ color: "#4a4a6a" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ff4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#4a4a6a")}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <textarea
                value={p.pastedCode}
                onChange={(e) => p.setPastedCode(e.target.value)}
                placeholder="// Paste your entire codebase here..."
                className="w-full h-64 p-4 text-xs outline-none resize-none"
                style={{
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  color: "#e0e0f0",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#00ff88")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
              />
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-8">
        <button
          onClick={p.onAnalyze}
          className="font-display font-bold px-12 py-4 text-sm transition-all"
          style={{
            background: "#00ff88",
            color: "#0a0a0f",
            boxShadow: "0 0 30px rgba(0,255,136,0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#00cc6a";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#00ff88";
            e.currentTarget.style.transform = "scale(1)";
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        >
          ANALYZE WITH GEMMA 4 →
        </button>
        <div className="text-xs mt-3" style={{ color: "#4a4a6a" }}>
          google/gemma-4-31b-it:free · 262K context · real Gemma 4
        </div>
        {p.error && (
          <div className="text-xs mt-3" style={{ color: "#ff4444" }}>
            {p.error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────── LOADING VIEW ───────────────────── */
function LoadingView({ step, error, onRetry }: { step: number; error: string; onRetry: () => void }) {
  if (error) {
    return (
      <div
        className="max-w-lg mx-auto text-center p-6"
        style={{
          background: "rgba(255,68,68,0.1)",
          border: "1px solid #ff4444",
        }}
      >
        <div className="font-display font-bold mb-2" style={{ color: "#ff4444" }}>
          ⚠ ANALYSIS FAILED
        </div>
        <div className="text-xs mb-4" style={{ color: "#e0e0f0" }}>
          {error}
        </div>
        <button
          onClick={onRetry}
          className="px-6 py-2 text-xs transition-colors"
          style={{ border: "1px solid #ff4444", color: "#ff4444", background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#ff4444";
            e.currentTarget.style.color = "#0a0a0f";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#ff4444";
          }}
        >
          TRY AGAIN →
        </button>
      </div>
    );
  }

  const visible = LOADING_STEPS.slice(0, step + 1);

  return (
    <div className="max-w-lg w-full mx-auto">
      <div style={{ background: "#1e1e2e" }} className="px-4 py-2 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: "#ff4444" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#ffb347" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#00ff88" }} />
        <span className="text-xs ml-2" style={{ color: "#4a4a6a" }}>
          vibesafe — analyzing...
        </span>
      </div>
      <div
        className="p-6 min-h-52"
        style={{ background: "#111118", border: "1px solid #1e1e2e", borderTop: "none" }}
      >
        {visible.map((s, i) => {
          const isLast = i === visible.length - 1;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 mb-2"
            >
              <span style={{ color: "#00ff88" }}>›</span>
              <span className="text-sm flex-1" style={{ color: "#e0e0f0" }}>
                {s.replace(/^› /, "")}
              </span>
              {isLast ? <span className="vs-cursor" /> : <span style={{ color: "#00ff88" }}>✓</span>}
            </motion.div>
          );
        })}
      </div>
      <div className="text-xs text-center mt-4" style={{ color: "#4a4a6a" }}>
        Gemma 3 27B is reasoning via OpenRouter · 30-90 seconds
      </div>
    </div>
  );
}

/* ───────────────────── REPORT VIEW ───────────────────── */
function ReportView({
  report,
  meta,
  onReset,
}: {
  report: Report;
  meta: { files: string[]; tokens: number } | null;
  onReset: () => void;
}) {
  const vs = report.overall.vibe_score;

  return (
    <div>
      {/* SCORE BAR */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between p-6 mb-6"
        style={{ background: "#111118", border: "1px solid #1e1e2e" }}
      >
        <div>
          <div className="text-xs" style={{ color: "#4a4a6a" }}>
            VIBE SCORE
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-display font-bold text-5xl"
              style={{ color: scoreColor(vs) }}
            >
              {vs}
            </span>
            <span className="text-sm" style={{ color: "#4a4a6a" }}>
              /100
            </span>
          </div>
          <div className="text-sm mt-2" style={{ color: "#e0e0f0" }}>
            {report.overall.one_liner}
          </div>
          <div className="text-xs mt-1" style={{ color: "#ffb347" }}>
            ⚡ Priority: {report.overall.top_priority_fix}
          </div>
        </div>
        <div className="text-right mt-4 md:mt-0 text-xs" style={{ color: "#4a4a6a" }}>
          {meta && (
            <>
              <div>Files: {meta.files.join(", ")}</div>
              <div>~{meta.tokens.toLocaleString()} tokens</div>
            </>
          )}
        </div>
      </motion.div>

      {/* AUTHORSHIP CARD - FULL WIDTH HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative p-6 mb-4"
        style={{ background: "#111118", border: "1px solid #00ff88" }}
      >
        <div
          className="absolute top-0 left-0"
          style={{ width: "60px", height: "3px", background: "#00ff88" }}
        />
        <div className="font-display font-bold text-sm" style={{ color: "#e0e0f0" }}>
          🔑 PROOF OF AUTHORSHIP
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
          <div className="p-4" style={{ background: "#0a0a0f", border: "1px solid #00ff8844" }}>
            <div className="text-xs mb-1" style={{ color: "#4a4a6a" }}>
              HUMAN CONTRIBUTION
            </div>
            <div className="font-display font-bold text-4xl" style={{ color: "#00ff88" }}>
              {report.authorship.originality_score}%
            </div>
            <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
              of this project is yours
            </div>
          </div>
          <div className="p-4" style={{ background: "#0a0a0f", border: "1px solid #ffb34744" }}>
            <div className="text-xs mb-1" style={{ color: "#4a4a6a" }}>
              AI PATTERNS FOUND
            </div>
            <div className="font-display font-bold text-4xl" style={{ color: "#ffb347" }}>
              {report.authorship.ai_patterns.length}
            </div>
            <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
              AI-assisted sections
            </div>
          </div>
        </div>

        <div className="text-xs leading-relaxed mb-6" style={{ color: "#4a4a6a" }}>
          {report.authorship.authorship_summary}
        </div>

        <div className="text-xs mb-3" style={{ color: "#00ff88" }}>
          ✓ YOUR HUMAN DECISIONS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.authorship.human_decisions.map((d, i) => (
            <div
              key={i}
              className="p-3"
              style={{
                background: "#0a0a0f",
                border: "1px solid #1e1e2e",
                borderLeft: "2px solid #00ff88",
              }}
            >
              <span
                className="text-xs px-2 py-0.5"
                style={{ background: "rgba(0,255,136,0.12)", color: "#00ff88" }}
              >
                HUMAN
              </span>
              <div className="text-xs mt-2 leading-relaxed" style={{ color: "#e0e0f0" }}>
                {d.decision}
              </div>
              <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
                ↳ {d.evidence}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs mb-3 mt-6" style={{ color: "#ffb347" }}>
          ⚡ AI-ASSISTED PATTERNS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.authorship.ai_patterns.map((pat, i) => (
            <div
              key={i}
              className="p-3"
              style={{
                background: "#0a0a0f",
                border: "1px solid #1e1e2e",
                borderLeft: "2px solid #ffb347",
              }}
            >
              <span
                className="text-xs px-2 py-0.5"
                style={{ background: "rgba(255,179,71,0.12)", color: "#ffb347" }}
              >
                AI ASSISTED
              </span>
              <div className="text-xs mt-2 leading-relaxed" style={{ color: "#e0e0f0" }}>
                {pat.pattern}
              </div>
              <div className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
                ↳ {pat.location}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => exportCertificate(report, meta?.files ?? [])}
          className="w-full py-4 mt-6 font-display font-bold text-sm transition-all"
          style={{
            background: "#00ff88",
            color: "#0a0a0f",
            boxShadow: "0 0 20px rgba(0,255,136,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#00cc6a";
            e.currentTarget.style.transform = "scaleY(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#00ff88";
            e.currentTarget.style.transform = "scaleY(1)";
          }}
        >
          ⬇ DOWNLOAD PROOF OF AUTHORSHIP CERTIFICATE
        </button>
      </motion.div>

      {/* THREE COLUMN: Security, Logic, Plain English */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SecurityCard security={report.security} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <LogicCard logic={report.logic} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <PlainEnglishCard pe={report.plain_english} />
        </motion.div>
      </div>

      <div className="text-center mt-10">
        <button
          onClick={onReset}
          className="px-8 py-2 text-xs transition-colors"
          style={{ border: "1px solid #1e1e2e", color: "#4a4a6a", background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#00ff88";
            e.currentTarget.style.color = "#00ff88";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1e1e2e";
            e.currentTarget.style.color = "#4a4a6a";
          }}
        >
          ← ANALYZE ANOTHER PROJECT
        </button>
      </div>
    </div>
  );
}

function SecurityCard({ security }: { security: Report["security"] }) {
  const [open, setOpen] = useState<number | null>(null);
  const sevPalette = severityColors(security.risk_level);

  return (
    <div className="p-5 h-full" style={{ background: "#111118", border: "1px solid #1e1e2e" }}>
      <div className="flex items-center justify-between">
        <div className="font-display font-bold text-sm">🔐 SECURITY AUDIT</div>
        <span
          className="text-xs px-2 py-0.5"
          style={{
            background: sevPalette.bg,
            border: `1px solid ${sevPalette.border}`,
            color: sevPalette.text,
          }}
        >
          {security.risk_level}
        </span>
      </div>
      <div className="text-xs mt-3 mb-4 leading-relaxed" style={{ color: "#4a4a6a" }}>
        {security.summary}
      </div>
      {security.issues.map((iss, i) => {
        const c = severityColors(iss.severity);
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="p-3 mb-2 cursor-pointer"
            style={{ border: `1px solid ${c.border}` }}
            onClick={() => setOpen(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="text-xs px-2 py-0.5 shrink-0"
                  style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {iss.severity}
                </span>
                <span className="text-xs truncate" style={{ color: "#e0e0f0" }}>
                  {iss.type}
                </span>
              </div>
              <span className="text-xs" style={{ color: "#4a4a6a" }}>
                {isOpen ? "▼" : "▶"}
              </span>
            </div>
            {isOpen && (
              <div className="mt-3 text-xs space-y-1">
                <div>
                  <span style={{ color: "#4a4a6a" }}>WHERE:</span>{" "}
                  <span style={{ color: "#e0e0f0" }}>{iss.location}</span>
                </div>
                <div>
                  <span style={{ color: "#4a4a6a" }}>ISSUE:</span>{" "}
                  <span style={{ color: "#e0e0f0" }}>{iss.description}</span>
                </div>
                <div>
                  <span style={{ color: "#4a4a6a" }}>FIX:</span>{" "}
                  <span style={{ color: "#00ff88" }}>{iss.fix}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogicCard({ logic }: { logic: Report["logic"] }) {
  const [open, setOpen] = useState<number | null>(null);
  const score = logic.code_quality_score;
  const color = scoreColor(score);

  return (
    <div className="p-5 h-full" style={{ background: "#111118", border: "1px solid #1e1e2e" }}>
      <div className="flex items-center justify-between">
        <div className="font-display font-bold text-sm">🧠 LOGIC ANALYSIS</div>
        <div className="font-display font-bold text-2xl" style={{ color }}>
          {score}
          <span className="text-xs" style={{ color: "#4a4a6a" }}>
            /100
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 mb-4 mt-2" style={{ background: "#1e1e2e" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color }} />
      </div>
      <div className="text-xs mb-4 leading-relaxed" style={{ color: "#4a4a6a" }}>
        {logic.summary}
      </div>
      {logic.issues.map((iss, i) => {
        const c = impactColor(iss.impact);
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="p-3 mb-2 cursor-pointer"
            style={{ border: `1px solid ${c}` }}
            onClick={() => setOpen(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="text-xs px-2 py-0.5 shrink-0"
                  style={{ color: c, border: `1px solid ${c}` }}
                >
                  {iss.impact}
                </span>
                <span className="text-xs truncate" style={{ color: "#e0e0f0" }}>
                  {iss.type}
                </span>
              </div>
              <span className="text-xs" style={{ color: "#4a4a6a" }}>
                {isOpen ? "▼" : "▶"}
              </span>
            </div>
            {isOpen && (
              <div className="mt-3 text-xs space-y-1">
                <div>
                  <span style={{ color: "#4a4a6a" }}>WHERE:</span>{" "}
                  <span style={{ color: "#e0e0f0" }}>{iss.location}</span>
                </div>
                <div>
                  <span style={{ color: "#4a4a6a" }}>ISSUE:</span>{" "}
                  <span style={{ color: "#e0e0f0" }}>{iss.description}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlainEnglishCard({ pe }: { pe: Report["plain_english"] }) {
  return (
    <div className="p-5 h-full" style={{ background: "#111118", border: "1px solid #1e1e2e" }}>
      <div className="font-display font-bold text-sm mb-4">📖 PLAIN ENGLISH</div>

      <div className="text-xs mb-1" style={{ color: "#00ff88" }}>
        WHAT IT DOES
      </div>
      <div className="text-xs mb-4 leading-relaxed" style={{ color: "#4a4a6a" }}>
        {pe.what_it_does}
      </div>

      <div className="text-xs mb-1" style={{ color: "#00ff88" }}>
        ARCHITECTURE
      </div>
      <div className="text-xs mb-4 leading-relaxed" style={{ color: "#4a4a6a" }}>
        {pe.architecture}
      </div>

      <div className="text-xs mb-2" style={{ color: "#00ff88" }}>
        MAIN FLOWS
      </div>
      <div className="space-y-2">
        {pe.main_flows.map((flow, i) => (
          <div key={i} className="flex gap-3">
            <span
              className="text-xs shrink-0"
              style={{ color: "#00ff88", fontFamily: "JetBrains Mono, monospace" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "#4a4a6a" }}>
              {flow}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

