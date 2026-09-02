import sys
import re
import json
import math
import sqlite3
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
WIKI_DIR = Path(__file__).resolve().parent.parent
DB_PATH = WIKI_DIR / ".cache" / "vectors.sqlite"

def tokenize(text):
    return re.findall(r'\b[a-z0-9_]{2,}\b', text.lower())

def cosine_similarity(v1, v2):
    common = set(v1.keys()) & set(v2.keys())
    if not common:
        return 0.0
    dot_product = sum(v1[k] * v2[k] for k in common)
    norm1 = math.sqrt(sum(val ** 2 for val in v1.values()))
    norm2 = math.sqrt(sum(val ** 2 for val in v2.values()))
    return dot_product / (norm1 * norm2) if norm1 and norm2 else 0.0

def search_wiki(query, top_k=5):
    if not DB_PATH.exists():
        print("Vector database not found. Run 'python .wiki/scripts/embed_wiki.py' first.")
        return
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT term, idf_score FROM wiki_idf")
    idf = dict(cursor.fetchall())
    q_tokens = tokenize(query)
    if not q_tokens:
        print("No valid query tokens.")
        return
    q_tf = {}
    for t in q_tokens:
        q_tf[t] = q_tf.get(t, 0) + 1
    total_q = len(q_tokens)
    q_vec = {t: (count / total_q) * idf.get(t, 1.0) for t, count in q_tf.items()}
    cursor.execute("SELECT id, relative_path, section_title, content, tf_json FROM wiki_vectors")
    results = []
    for doc_id, rel_path, sec_title, content, tf_json in cursor.fetchall():
        doc_tf = json.loads(tf_json)
        doc_vec = {t: tf_val * idf.get(t, 1.0) for t, tf_val in doc_tf.items()}
        score = cosine_similarity(q_vec, doc_vec)
        if score > 0.0:
            results.append({"score": score, "path": rel_path, "title": sec_title, "content": content})
    results.sort(key=lambda x: x["score"], reverse=True)
    conn.close()
    print(f"\n--- Search Results for: '{query}' ({len(results)} matches) ---\n")
    for i, res in enumerate(results[:top_k], 1):
        print(f"[{i}] {res['path']} > {res['title']} (Score: {round(res['score'] * 100, 1)}%)")
        print(f"    Snippet: {res['content'].replace('\n', ' ')[:200]}...\n")

if __name__ == "__main__":
    query_str = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "overview"
    search_wiki(query_str)
