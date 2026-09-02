# AI Agent Protocol for In-Repo LLM Wiki

1. **Check Index & Entities**: Read `.wiki/index.md` and relevant `.wiki/entities/*.md` pages before complex coding tasks.
2. **Ingest Raw Input**: Synthesize `.wiki/raw/` files into `.wiki/entities/`, update `.wiki/index.md`, append `.wiki/logs/log.md`.
3. **Update Vectors**: Run `python .wiki/scripts/embed_wiki.py` after modifying wiki pages.
