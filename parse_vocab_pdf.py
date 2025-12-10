# -*- coding: utf-8 -*-
"""
大考中心詞彙表 Level 1-6 自動解析
輸出 vocab.json （A1 + POS0 + SRC0 + MIN0）
"""

import pdfplumber
import json
import re

PDF_FILE = "大考中心詞彙表 Level 1-6.pdf"
OUTPUT_FILE = "vocab.json"

# ------------------------------
# 1. 正則表達式（抓英文 + 中文 + Level）
# ------------------------------
WORD_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9\/\-]*")
LEVEL_PATTERN = re.compile(r"Level\s*(\d+)", re.I)

def clean_definition(text: str) -> str:
    """清理中文解釋"""
    text = text.strip()
    # 去掉奇怪編號 (1)(2)(3)
    text = re.sub(r"\(\d+\)", "", text)
    # 去除多餘空格
    text = re.sub(r"\s+", "", text)
    return text

def extract_vocab_from_pdf(pdf_path):
    vocab_list = []
    current_level = None

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            raw_text = page.extract_text()
            if not raw_text:
                continue

            for line in raw_text.split("\n"):
                line = line.strip()
                if not line:
                    continue

                # -----------------------
                # 偵測 Level 標題
                # -----------------------
                lv = LEVEL_PATTERN.search(line)
                if lv:
                    current_level = f"Level {lv.group(1)}"
                    continue

                # -----------------------
                # 抓英文單字
                # -----------------------
                m = WORD_PATTERN.match(line)
                if not m:
                    continue

                word = m.group().strip()

                # 移除假詞（如果 line 開頭不是單字）
                if len(word) < 1:
                    continue

                # -----------------------
                # 抓中文定義
                # -----------------------
                # 中文通常在英文後面，取中文段落
                parts = re.split(r"[A-Za-z\/\.\s]+", line)
                if len(parts) < 2:
                    continue  # 沒中文

                definition = clean_definition(parts[-1])

                if not definition:
                    continue

                vocab_list.append({
                    "word": word,
                    "definition": definition,
                    "level": current_level
                })

    return vocab_list


# ------------------------------
# 2. 執行解析 + 排序 + 輸出 JSON
# ------------------------------

print("📘 正在解析 PDF…")

vocab = extract_vocab_from_pdf(PDF_FILE)

# 排序（依 level 再依單字）
vocab_sorted = sorted(vocab, key=lambda x: (x["level"], x["word"]))

print(f"✅ 完成！共解析到 {len(vocab_sorted)} 筆單字")

# 輸出 JSON（MIN0）
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(vocab_sorted, f, ensure_ascii=False, indent=2)

print(f"📦 已輸出：{OUTPUT_FILE}")
