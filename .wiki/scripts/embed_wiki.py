import os
import re
import json
import math
import sqlite3
from pathlib import Path

WIKI_DIR = Path(__file__).resolve().parent.parent
ENTITIES_DIR = WIKI_DIR / "entities"
CACHE_DIR = WIKI_DIR / ".cache"
DB_PATH = CACHE_DIR / "vectors.sqlite"

def tokenize(text):
    return re.findall(r'\b[a-z0-9_]{2,}\b', text.lower())

def compute_tf(tokens):
    tf = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
    total = len(tokens) or 1
    return {t: count / total for t, count in tf.items()}

def parse_markdown_sections(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    lines = content.splitlines()
    sections = []
    current_title = "Overview"
    current_lines = []
    for line in lines:
        if line.startswith("#"):
            if current_lines:
                sec_text = "\n".join(current_lines).strip()
                if sec_text:
                    sections.append((current_title, sec_text))
                current_lines = []
            current_title = line.lstrip("#").strip()
        else:
            current_lines.append(line)
    if current_lines:
        sec_text = "\n".join(current_lines).strip()
        if sec_text:
            sections.append((current_title, sec_text))
    return sections

def init_db(conn):
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS wiki_vectors (id TEXT PRIMARY KEY, file_path TEXT NOT NULL, relative_path TEXT NOT NULL, section_title TEXT NOT NULL, content TEXT NOT NULL, tf_json TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    cursor.execute("CREATE TABLE IF NOT EXISTS wiki_idf (term TEXT PRIMARY KEY, idf_score REAL NOT NULL);")
    conn.commit()

def build_embeddings():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cursor = conn.cursor()
    if not ENTITIES_DIR.exists():
        return
    all_sections = []
    doc_freq = {}
    total_docs = 0
    for md_file in ENTITIES_DIR.glob("*.md"):
        rel_path = md_file.relative_to(WIKI_DIR).as_posix()
        sections = parse_markdown_sections(md_file)
        for sec_title, sec_content in sections:
            doc_id = f"{rel_path}#{sec_title.lower().replace(' ', '-')}"
            tokens = tokenize(f"{sec_title} {sec_content}")
            tf = compute_tf(tokens)
            for term in set(tokens):
                doc_freq[term] = doc_freq.get(term, 0) + 1
            total_docs += 1
            all_sections.append({"id": doc_id, "file_path": str(md_file), "relative_path": rel_path, "section_title": sec_title, "content": sec_content, "tf": tf})
    idf = {term: math.log((1 + total_docs) / (1 + df)) + 1.0 for term, df in doc_freq.items()}
    cursor.execute("DELETE FROM wiki_vectors")
    cursor.execute("DELETE FROM wiki_idf")
    for term, score in idf.items():
        cursor.execute("INSERT INTO wiki_idf (term, idf_score) VALUES (?, ?)", (term, score))
    for sec in all_sections:
        cursor.execute("INSERT INTO wiki_vectors (id, file_path, relative_path, section_title, content, tf_json) VALUES (?, ?, ?, ?, ?, ?)", (sec["id"], sec["file_path"], sec["relative_path"], sec["section_title"], sec["content"], json.dumps(sec["tf"])))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    build_embeddings()
