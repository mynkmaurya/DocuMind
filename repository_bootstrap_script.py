#!/usr/bin/env python3
"""
DocuMind Repository Unpacker & Bootstrapper
-------------------------------------------
Run this script in the root of your repository containing:
  - documind_backend.py
  - DocuMindFrontend.tsx

It automatically splits those consolidated files into the multi-file directory
tree (`backend/app/...` and `frontend/src/...`) and generates all entrypoints
(`main.tsx`, `index.html`, `index.css`) so your repo is immediately ready for
`git push` and `docker compose up --build`.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def split_backend(source_file: Path) -> None:
    if not source_file.exists():
        print(f"[skip] {source_file.name} not found.")
        return

    content = source_file.read_text(encoding="utf-8")
    pattern = re.compile(
        r"# ============================================================================\n"
        r"# FILE: ([^\n]+)\n"
        r"# ============================================================================\n"
    )
    matches = list(pattern.finditer(content))
    for i, match in enumerate(matches):
        rel_path = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        body = content[start:end].strip() + "\n"

        # Uncomment SQL lines if target is schema.sql
        if rel_path.endswith(".sql"):
            uncommented = []
            for line in body.splitlines():
                if line.startswith("# "):
                    uncommented.append(line[2:])
                elif line == "#":
                    uncommented.append("")
                else:
                    uncommented.append(line)
            body = "\n".join(uncommented) + "\n"

        out_path = ROOT / rel_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(body, encoding="utf-8")
        print(f"[created] {rel_path}")

    init_file = ROOT / "backend" / "app" / "__init__.py"
    init_file.parent.mkdir(parents=True, exist_ok=True)
    init_file.write_text('"""DocuMind FastAPI Backend Package."""\n', encoding="utf-8")
    print("[created] backend/app/__init__.py")


def create_frontend_scaffold() -> None:
    frontend_src = ROOT / "frontend" / "src"
    frontend_src.mkdir(parents=True, exist_ok=True)

    tsx_source = ROOT / "DocuMindFrontend.tsx"
    if tsx_source.exists():
        app_target = frontend_src / "App.tsx"
        app_target.write_text(tsx_source.read_text(encoding="utf-8"), encoding="utf-8")
        print("[created] frontend/src/App.tsx")

    main_tsx = frontend_src / "main.tsx"
    main_tsx.write_text(
        'import React from "react";\n'
        'import ReactDOM from "react-dom/client";\n'
        'import App from "./App";\n'
        'import "./index.css";\n\n'
        'ReactDOM.createRoot(document.getElementById("root")!).render(\n'
        "  <React.StrictMode>\n"
        "    <App />\n"
        "  </React.StrictMode>\n"
        ");\n",
        encoding="utf-8",
    )
    print("[created] frontend/src/main.tsx")

    index_css = frontend_src / "index.css"
    index_css.write_text(
        "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
        encoding="utf-8",
    )
    print("[created] frontend/src/index.css")

    index_html = ROOT / "frontend" / "index.html"
    index_html.write_text(
        "<!doctype html>\n"
        '<html lang="en">\n'
        "  <head>\n"
        '    <meta charset="UTF-8" />\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        "    <title>DocuMind — Grounded PDF Q&A with Page Citations</title>\n"
        "  </head>\n"
        '  <body class="bg-slate-50 text-slate-900 antialiased">\n'
        '    <div id="root"></div>\n'
        '    <script type="module" src="/src/main.tsx"></script>\n'
        "  </body>\n"
        "</html>\n",
        encoding="utf-8",
    )
    print("[created] frontend/index.html")


if __name__ == "__main__":
    split_backend(ROOT / "documind_backend.py")
    create_frontend_scaffold()
    print("\nRepository structure is ready! Run `docker compose up --build` to self-host.")