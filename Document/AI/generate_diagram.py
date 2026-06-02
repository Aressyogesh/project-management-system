"""Generate AI Architecture Diagram PNG for PMS AI Assistant."""

from PIL import Image, ImageDraw, ImageFont
import os, sys

# ── Canvas ────────────────────────────────────────────────────────────────────
W, H = 1800, 2200
img = Image.new("RGB", (W, H), "#0f172a")
d = ImageDraw.Draw(img)

# ── Colour palette ────────────────────────────────────────────────────────────
C = {
    "bg":        "#0f172a",
    "panel":     "#1e293b",
    "border":    "#334155",
    "user":      "#7c3aed",
    "frontend":  "#0284c7",
    "backend":   "#1d4ed8",
    "proj":      "#b45309",
    "loop":      "#0f766e",
    "tool":      "#15803d",
    "db":        "#92400e",
    "rag":       "#6d28d9",
    "resp":      "#166534",
    "arrow":     "#94a3b8",
    "white":     "#f8fafc",
    "muted":     "#94a3b8",
    "phase2":    "#475569",
}

# ── Font helpers ─────────────────────────────────────────────────────────────
def font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

F = {s: font(s) for s in [11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32]}

# ── Draw helpers ──────────────────────────────────────────────────────────────
def rect(x1, y1, x2, y2, fill, radius=10, border=None, bw=2):
    d.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill,
                        outline=border or fill, width=bw)

def label(x, y, text, fsize=13, color="#f8fafc", anchor="mm"):
    d.text((x, y), text, font=F[fsize], fill=color, anchor=anchor)

def mlabel(x, y, lines, fsize=12, color="#f8fafc", anchor="mm", gap=18):
    total = (len(lines) - 1) * gap
    sy = y - total / 2
    for ln in lines:
        d.text((x, sy), ln, font=F[fsize], fill=color, anchor=anchor)
        sy += gap

def arrow(x1, y1, x2, y2, color="#94a3b8", dashed=False, lbl=""):
    if dashed:
        steps = 20
        for i in range(0, steps, 2):
            t0, t1 = i / steps, min((i + 1) / steps, 1)
            px0, py0 = x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0
            px1, py1 = x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1
            d.line([px0, py0, px1, py1], fill=color, width=2)
    else:
        d.line([x1, y1, x2, y2], fill=color, width=2)
    # arrowhead
    import math
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    size = 10
    lx, ly = x2 - ux * size - uy * size * 0.5, y2 - uy * size + ux * size * 0.5
    rx, ry = x2 - ux * size + uy * size * 0.5, y2 - uy * size - ux * size * 0.5
    d.polygon([(x2, y2), (lx, ly), (rx, ry)], fill=color)
    if lbl:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        d.text((mx + 6, my - 8), lbl, font=F[11], fill=C["muted"], anchor="lm")

def section_header(x1, y1, x2, label_text, fill):
    d.rounded_rectangle([x1, y1, x2, y1 + 30], radius=6,
                        fill=fill, outline=fill, width=0)
    d.text((x1 + 12, y1 + 15), label_text, font=F[13], fill="#fff", anchor="lm")

# ══════════════════════════════════════════════════════════════════════════════
# TITLE
# ══════════════════════════════════════════════════════════════════════════════
label(W // 2, 36, "PMS AI Assistant — Architecture", fsize=28, anchor="mm")
label(W // 2, 66, "Structured Data (Phase 1 · SQL Agent)  +  Unstructured Data (Phase 2 · RAG · Planned)", fsize=14, color=C["muted"], anchor="mm")

# ══════════════════════════════════════════════════════════════════════════════
# ROW 1  — User  +  Frontend
# ══════════════════════════════════════════════════════════════════════════════
# User bubble
ux, uy = 140, 130
rect(ux - 80, uy - 30, ux + 80, uy + 30, C["user"], radius=20)
label(ux, uy, "👤  User", fsize=14, anchor="mm")
label(ux, uy + 16, "(PM · Dev · QA · Designer)", fsize=11, color="#ddd6fe", anchor="mm")

# Frontend panel
rect(280, 100, 820, 200, C["panel"], border=C["frontend"])
section_header(280, 100, 820, "  Frontend  ·  React 18 + Vite", C["frontend"])
fe_items = [
    (380, 155, "🟣 AIChatWidget", "floating bubble (all pages)"),
    (570, 155, "📄 AIAssistantPage", "/ai full-page route"),
    (750, 155, "⚙️ useAIChat hook", "history · loading · error"),
]
for fx, fy, t1, t2 in fe_items:
    rect(fx - 85, fy - 28, fx + 85, fy + 28, "#164e63", radius=8)
    label(fx, fy - 10, t1, fsize=12, anchor="mm")
    label(fx, fy + 9, t2, fsize=11, color=C["muted"], anchor="mm")

# Arrow user → frontend
arrow(ux + 80, uy, 280, 155, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# ROW 2  — API call
# ══════════════════════════════════════════════════════════════════════════════
rect(350, 230, 750, 280, "#0c4a6e", radius=8)
label(550, 255, "POST /api/v1/ai/chat  ·  Bearer JWT", fsize=13, anchor="mm")
arrow(550, 200, 550, 230, C["arrow"], lbl="sends")

# ══════════════════════════════════════════════════════════════════════════════
# ROW 3  — Backend panel  (Controller + AiService)
# ══════════════════════════════════════════════════════════════════════════════
rect(100, 310, 1680, 560, C["panel"], border=C["backend"])
section_header(100, 310, 1680, "  Backend  ·  NestJS 10", C["backend"])

# Controller
rect(130, 355, 420, 545, "#1e3a5f", radius=8)
label(275, 375, "🎮  AiController", fsize=14, anchor="mm")
mlabel(275, 440,
       ["POST /api/v1/ai/chat", "GET  /api/v1/ai/health", "─────────────────",
        "JwtAuthGuard (global)", "CurrentUser decorator"],
       fsize=12, color="#bfdbfe")

# AiService
rect(440, 355, 1650, 545, "#1e3a5f", radius=8)
label(1045, 375, "🧠  AiService", fsize=14, anchor="mm")
svc_steps = [
    (540, 430, ["1. resolveProjectContext()", "RBAC · project membership query"]),
    (780, 430, ["2. buildSystemPrompt()", "injects project name"]),
    (1010, 430, ["3. withTimeout(55 s)", "Ollama first call"]),
    (1240, 430, ["4. executeTool()", "Prisma RBAC query"]),
    (1460, 430, ["5. withTimeout(55 s)", "Ollama second call"]),
]
for sx, sy, lines in svc_steps:
    rect(sx - 110, sy - 38, sx + 110, sy + 38, "#0f172a", radius=6)
    mlabel(sx, sy, lines, fsize=11, color="#bfdbfe")

arrow(420, 450, 440, 450, C["arrow"])

# Arrow API → controller
arrow(550, 280, 275, 355, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# ROW 4  — Project Resolution
# ══════════════════════════════════════════════════════════════════════════════
rect(100, 590, 900, 760, C["panel"], border=C["proj"])
section_header(100, 590, 900, "  Project Resolution (RBAC)", C["proj"])

cases = [
    (180, 680, ["SUPER_USER / ADMIN", "→ no filter, sees all"], "#92400e"),
    (370, 680, ["0 projects", "→ clarify: not assigned"], "#7f1d1d"),
    (560, 680, ["1 project", "→ auto-scope ctx.projectId"], "#14532d"),
    (750, 680, ["N projects + name in msg", "→ resolve & proceed"], "#1e3a5f"),
    (890, 680, ["N projects, no name", "→ ask user to pick"], "#78350f"),
]
# reuse last item outside panel
rect(920, 590, 1160, 760, C["panel"], border=C["proj"])
section_header(920, 590, 1160, "  N-project ask", C["proj"])

for i, (cx, cy, lines, col) in enumerate(cases):
    bx = cx - 115
    ex = cx + 115
    if bx < 110: bx = 110
    if ex > 1155: ex = 1155
    rect(bx, cy - 40, ex, cy + 40, col, radius=8)
    mlabel(cx if i < 4 else 1040, cy, lines, fsize=12)

arrow(550, 560, 550, 590, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# ROW 5  — Ollama Tool Loop
# ══════════════════════════════════════════════════════════════════════════════
rect(100, 800, 900, 980, C["panel"], border=C["loop"])
section_header(100, 800, 900, "  Ollama  ·  llama3.2:3b  ·  Tool-Calling Loop", C["loop"])

loop_boxes = [
    (220, 895, ["Call 1", "Model reads tool definitions", "selects which tool(s) to invoke"]),
    (540, 895, ["Execute Tool(s)", "Prisma queries run", "RBAC filter applied"]),
    (790, 895, ["Call 2", "Model receives tool results", "generates final answer"]),
]
for lx, ly, lines in loop_boxes:
    rect(lx - 110, ly - 52, lx + 110, ly + 52, "#134e4a", radius=8)
    mlabel(lx, ly, lines, fsize=12)

arrow(330, 895, 430, 895, C["arrow"], lbl="tool calls")
arrow(650, 895, 680, 895, C["arrow"], lbl="results")

# Arrow from project resolution → loop
arrow(550, 760, 540, 800, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# ROW 6  — 10 SQL Agent Tools
# ══════════════════════════════════════════════════════════════════════════════
rect(100, 1010, 1680, 1160, C["panel"], border=C["tool"])
section_header(100, 1010, 1680, "  Phase 1 — 10 SQL Agent Tools  (Structured Data)", C["tool"])

tools = [
    "get_overdue_work_items", "get_sprint_summary", "get_blocked_items",
    "get_project_progress",   "get_team_workload",
    "get_bug_summary",        "get_weekly_summary",
    "get_milestone_status",   "get_sprint_velocity", "search_work_items",
]
cols = 5
tw = (1680 - 100 - 40) // cols
for i, t in enumerate(tools):
    col, row = i % cols, i // cols
    tx = 120 + col * tw + tw // 2
    ty = 1060 + row * 55
    rect(tx - tw // 2 + 5, ty - 20, tx + tw // 2 - 5, ty + 20, "#14532d", radius=6)
    label(tx, ty, t, fsize=11, anchor="mm")

# Arrow loop → tools
arrow(540, 980, 890, 1010, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# ROW 7  — Structured DB
# ══════════════════════════════════════════════════════════════════════════════
rect(100, 1190, 1020, 1400, C["panel"], border=C["db"])
section_header(100, 1190, 1020, "  Structured Data  ·  PostgreSQL  (via Prisma ORM)", C["db"])

dbs = [
    ("work_items", "39 cols · RBAC filtered"),
    ("projects",   "status · progress · dates"),
    ("sprints",    "active · start · end"),
    ("milestones", "delivery targets"),
    ("users /\nproject_members", "roles · assignments"),
    ("timesheet_entries", "hours logged"),
]
dcols = 3
dw = (1020 - 100 - 40) // dcols
for i, (dname, ddesc) in enumerate(dbs):
    dc, dr = i % dcols, i // dcols
    dx = 120 + dc * dw + dw // 2
    dy = 1265 + dr * 100
    rect(dx - dw // 2 + 8, dy - 38, dx + dw // 2 - 8, dy + 38, "#78350f", radius=8)
    label(dx, dy - 14, dname, fsize=13, color="#fef3c7", anchor="mm")
    label(dx, dy + 10, ddesc, fsize=11, color="#fde68a", anchor="mm")

# Arrow tools → DB
arrow(890, 1160, 560, 1190, C["arrow"])

# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 RAG  (right side, dashed)
# ══════════════════════════════════════════════════════════════════════════════
rect(1060, 1190, 1680, 1400, C["panel"], border=C["phase2"])
section_header(1060, 1190, 1680, "  Phase 2 — RAG Agent  (Planned F-031)", C["phase2"])

rag_items = [
    (1160, 1290, ["📥 Document Upload", "PDF · DOCX · BRD · SRS"]),
    (1370, 1290, ["🧬 Chunk + Embed", "voyage-3-lite 768-dim"]),
    (1580, 1290, ["🔍 Vector Search", "cosine similarity\nTop-5 chunks"]),
]
for rx, ry, lines in rag_items:
    rect(rx - 85, ry - 52, rx + 85, ry + 52, "#4c1d95", radius=8, border="#7c3aed", bw=2)
    mlabel(rx, ry, lines, fsize=12, color="#ddd6fe")

arrow(1245, 1290, 1285, 1290, C["phase2"], dashed=True)
arrow(1455, 1290, 1495, 1290, C["phase2"], dashed=True)

# pgvector note
rect(1100, 1360, 1640, 1392, "#3b0764", radius=6)
label(1370, 1376, "knowledge_documents  ·  pgvector HNSW index  ·  on existing PostgreSQL", fsize=12, color="#e9d5ff", anchor="mm")

# Dashed arrow from AiService to RAG
arrow(1300, 560, 1370, 1190, C["phase2"], dashed=True, lbl="document question (Phase 2)")

# ══════════════════════════════════════════════════════════════════════════════
# ROW 8  — Response
# ══════════════════════════════════════════════════════════════════════════════
rect(300, 1440, 1400, 1560, C["panel"], border=C["resp"])
section_header(300, 1440, 1400, "  Response", C["resp"])
rect(320, 1478, 1380, 1548, "#14532d", radius=8)
mlabel(850, 1513,
       ['ChatResponseDto  { answer: string  ·  sources: AiSource[]  ·  toolsUsed: string[]  ·  conversationId: uuid }'],
       fsize=13, color="#bbf7d0")

arrow(890, 1160, 850, 1440, C["arrow"])   # tools → resp (via tool exec)
arrow(790, 980,  850, 1440, C["arrow"])   # loop call2 → resp
arrow(850, 1560, 550, 1760, C["arrow"], lbl="answer + source chips")

# ══════════════════════════════════════════════════════════════════════════════
# ROW 9  — Frontend receives
# ══════════════════════════════════════════════════════════════════════════════
rect(280, 1780, 820, 1900, C["panel"], border=C["frontend"])
section_header(280, 1780, 820, "  Frontend renders", C["frontend"])
fe_render = [
    (380, 1848, ["💬 ChatMessageBubble", "assistant text"]),
    (570, 1848, ["🔗 Source chips", "clickable work items"]),
    (750, 1848, ["⏳ TypingIndicator", "while loading"]),
]
for frx, fry, lines in fe_render:
    rect(frx - 82, fry - 28, frx + 82, fry + 28, "#164e63", radius=8)
    mlabel(frx, fry, lines, fsize=11)

arrow(550, 1900, ux, 1940, C["arrow"])
rect(ux - 80, 1940, ux + 80, 1980, C["user"], radius=16)
label(ux, 1960, "👤  User reads answer", fsize=12, anchor="mm")

# ══════════════════════════════════════════════════════════════════════════════
# Legend
# ══════════════════════════════════════════════════════════════════════════════
rect(1100, 1620, 1680, 1980, C["panel"], border=C["border"])
label(1390, 1645, "Legend", fsize=16, anchor="mm")
legend = [
    (C["user"],     "User"),
    (C["frontend"], "Frontend (React)"),
    (C["backend"],  "Backend (NestJS)"),
    (C["proj"],     "Project Resolution / RBAC"),
    (C["loop"],     "Ollama Tool Loop"),
    (C["tool"],     "SQL Agent Tools"),
    (C["db"],       "Structured DB (PostgreSQL)"),
    (C["rag"],      "RAG / Unstructured (Phase 2)"),
    (C["resp"],     "Response"),
]
for i, (col, lbl_text) in enumerate(legend):
    ly = 1680 + i * 30
    rect(1120, ly - 10, 1148, ly + 10, col, radius=4)
    label(1160, ly, lbl_text, fsize=12, color=C["white"], anchor="lm")

# ── Footer ─────────────────────────────────────────────────────────────────
label(W // 2, H - 20, "PMS AI Assistant Architecture  ·  Generated 2026-06-02  ·  Phase 1 active  ·  Phase 2 planned",
      fsize=11, color=C["muted"], anchor="mm")

# ── Save ──────────────────────────────────────────────────────────────────────
out = os.path.join(os.path.dirname(__file__), "ai-architecture.png")
img.save(out, "PNG", dpi=(150, 150))
print(f"Saved: {out}  ({W}x{H}px)")
