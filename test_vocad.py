# -*- coding: utf-8 -*-
# Vocabulary Trainer —— 英→中四選一 + 題數選擇 + Level 數字輸入 + 錯題複習 + PDF 快取加速

import tkinter as tk
from tkinter import messagebox, simpledialog
import pdfplumber
import random
import re
import json
import pyttsx3
import os

# ==============================
# 基本設定
# ==============================
APP_TITLE = "Vocabulary Trainer"
WINDOW_W = 1200
WINDOW_H = 800
WRONG_FILE = "wrong_words.json"
PDF_FILE = "大考中心詞彙表 Level 1-6.pdf"
VOCAB_CACHE = "vocab_cache.json"   # ★ 單字快取檔，加速啟動

# ==============================
# TTS 語音
# ==============================
tts = pyttsx3.init()
tts.setProperty("rate", 175)

def speak(text: str):
    """播放英文單字發音（失敗時忽略錯誤避免當掉）"""
    try:
        tts.say(text)
        tts.runAndWait()
    except Exception:
        pass

# ==============================
# 從 PDF 讀單字
# ==============================
def extract_vocab_from_pdf(pdf_path):
    """解析大考中心詞彙表 Level 1-6，回傳 vocab list"""
    vocab_list = []
    current_level = None

    pattern = re.compile(
        r"([A-Za-z/]+)\s*(?:\(\d+\))?\s*"          # 單字 (可能有編號)
        r"\[[^\]]+\]\s*"                           # 音標
        r"[A-Za-z\. /]*\s*"                        # 詞性
        r"([^\[\]\n]+?)(?="                        # 中文解釋
        r"(?:\s+[A-Za-z/]+(?:\(\d+\))?\s*\[[^\]]+\])|$)"
    )

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            for line in text.split("\n"):
                line = line.strip()

                # 偵測 Level 標題
                lv = re.search(r"Level\s*(\d+)", line, re.I)
                if lv:
                    current_level = f"Level {lv.group(1)}"
                    continue

                # 抽單字
                for m in pattern.finditer(line):
                    word = m.group(1).strip()
                    definition = m.group(2).strip()
                    if word and definition:
                        vocab_list.append({
                            "word": word,
                            "definition": definition,
                            "level": current_level
                        })

                # 特例：a/an
                if line.startswith("a/an"):
                    vocab_list.append({
                        "word": "a/an",
                            "definition": "一；任一",
                            "level": current_level
                    })

    return vocab_list

# ==============================
# 單字快取：優先讀 JSON，沒有才解析 PDF
# ==============================
def load_or_build_vocab(pdf_path):
    """若有快取檔 vocab_cache.json，直接讀；否則解析 PDF 並建立快取"""
    if os.path.exists(VOCAB_CACHE):
        try:
            with open(VOCAB_CACHE, "r", encoding="utf-8") as f:
                print("⚡ 使用 Vocabulary 快取，加速啟動！")
                return json.load(f)
        except Exception:
            print("⚠️ 快取讀取失敗，重新解析 PDF...")

    print("📖 正在解析 PDF（第一次會比較慢）...")
    vocab = extract_vocab_from_pdf(pdf_path)

    try:
        with open(VOCAB_CACHE, "w", encoding="utf-8") as f:
            json.dump(vocab, f, ensure_ascii=False, indent=2)
        print("✅ 解析完成，已建立快取 vocab_cache.json")
    except Exception:
        print("⚠️ 無法寫入快取檔，但不影響使用")

    return vocab

# ==============================
# 錯題管理
# ==============================
def load_wrong_words():
    try:
        with open(WRONG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_wrong_words(wrong_list):
    with open(WRONG_FILE, "w", encoding="utf-8") as f:
        json.dump(wrong_list, f, ensure_ascii=False, indent=2)

# ==============================
# 例句（簡單自動產）
# ==============================
def make_sentence(word: str) -> str:
    return f"I often use the word '{word}' in my daily life."

# ==============================
# 題目生成（英→中 四選一）
# ==============================
def generate_quiz_en_to_zh(vocab, num_questions):
    """從 vocab 產生英→中選擇題，含錯題加權"""
    wrong = load_wrong_words()
    pool = vocab + wrong * 2   # 錯題加權

    if not pool:
        return []

    selected = random.sample(pool, min(num_questions, len(pool)))
    questions = []

    for item in selected:
        correct = item["definition"]

        # 從原始 vocab 抽干擾選項
        distractors_source = [v["definition"] for v in vocab if v["definition"] != correct]
        if len(distractors_source) >= 3:
            distractors = random.sample(distractors_source, 3)
        else:
            distractors = distractors_source

        options = distractors + [correct]
        random.shuffle(options)

        questions.append({
            "word": item["word"],
            "definition": item["definition"],
            "options": options,
            "answer": correct,
            "example": make_sentence(item["word"]),
            "level": item.get("level", None)   # ★ 把 Level 帶進題目
        })

    return questions

# ==============================
# Level 選擇（用數字 123456 / ALL 輸入）
# ==============================
class LevelSelectWindow:
    """
    使用者輸入數字 1-6 來選擇 Level，例如：
    輸入 135 → Level 1, 3, 5
    輸入 ALL → Level 1~6 全部
    """
    def __init__(self, root, vocab, callback):
        self.root = root
        self.vocab = vocab
        self.callback = callback

        self.ask_levels()

    def ask_levels(self):
        user_input = simpledialog.askstring(
            "選擇 Level",
            "請輸入想要練習的 Level：\n"
            "例如：1、135、456、123456\n"
            "或輸入 ALL 代表全部 Level"
        )

        if user_input is None:
            return  # 使用者按取消

        user_input = user_input.strip().upper()

        # 全部 Level
        if user_input == "ALL":
            levels = [f"Level {i}" for i in range(1, 7)]
        else:
            # 過濾非法字元，只保留 1~6
            digits = [c for c in user_input if c in "123456"]
            if not digits:
                messagebox.showwarning("錯誤", "請輸入 1~6 的任意組合，例如 1、23、456")
                return
            # 去重保持輸入順序
            seen = set()
            digits_unique = []
            for d in digits:
                if d not in seen:
                    seen.add(d)
                    digits_unique.append(d)

            levels = [f"Level {d}" for d in digits_unique]

        # 依照 level 篩選單字
        filtered = [v for v in self.vocab if v["level"] in levels]

        if not filtered:
            messagebox.showwarning("沒有單字", "該 Level 中沒有單字，請重新輸入")
            return

        self.callback(filtered)

# ==============================
# 英→中 測驗視窗（答案揭露版本）
# ==============================
class QuizWindow_EnToZh:
    def __init__(self, root, questions):
        self.root = root
        self.questions = questions
        self.index = 0
        self.score = 0
        self.selected = tk.StringVar()
        self.showing_answer = False  # 是否正在顯示答案狀態

        self.win = tk.Toplevel(root)
        self.win.title("英 → 中 測驗")
        self.win.geometry(f"{WINDOW_W}x{WINDOW_H}")
        self.win.configure(bg="white")

        self.build_ui()
        self.load_question()

    # UI 排版
    def build_ui(self):
        # 顯示 Level + 題號
        self.info_label = tk.Label(
            self.win,
            font=("Helvetica", 24),
            bg="white",
            fg="gray"
        )
        self.info_label.pack(pady=10)

        self.word_label = tk.Label(
            self.win,
            font=("Helvetica", 42),
            bg="white",
            fg="black",
            pady=20
        )
        self.word_label.pack()

        self.option_buttons = []
        for _ in range(4):
            b = tk.Radiobutton(
                self.win,
                text="",
                font=("Helvetica", 26),
                variable=self.selected,
                value="",
                indicatoron=False,
                width=40,
                pady=12,
                bg="white",
                fg="black",
                activebackground="#EAEAEA",
                activeforeground="black",
                selectcolor="#DDDDDD"
            )
            b.pack(pady=12)
            self.option_buttons.append(b)

        self.example_label = tk.Label(
            self.win,
            font=("Helvetica", 20),
            fg="gray",
            bg="white"
        )
        self.example_label.pack(pady=25)

        self.tts_btn = tk.Button(
            self.win,
            text="🔊 發音",
            font=("Helvetica", 24),
            relief="flat",
            bg="white",
            activebackground="#EAEAEA",
            command=self.speak_word
        )
        self.tts_btn.pack(pady=15)

        # 看答案 / 下一題 共用按鈕
        self.next_btn = tk.Button(
            self.win,
            text="看答案",
            font=("Helvetica", 30),
            relief="flat",
            bg="#FFF5CC",
            activebackground="#FFEFA3",
            command=self.reveal_or_next
        )
        self.next_btn.pack(pady=40)

    # 播放發音
    def speak_word(self):
        speak(self.questions[self.index]["word"])

    # 載入題目
    def load_question(self):
        q = self.questions[self.index]

        # 顯示 Level + 題號
        level_text = q.get("level", "")
        if level_text is None:
            level_text = ""
        info = f"{level_text}   第 {self.index + 1} / {len(self.questions)} 題"
        self.info_label.config(text=info)

        self.word_label.config(text=q["word"])
        self.example_label.config(text=f"例句：{q['example']}")
        self.selected.set("")
        self.showing_answer = False  # 每題剛開始不是答案模式

        # 恢復按鈕原色
        for btn in self.option_buttons:
            btn.config(bg="white")

        # 設定選項
        for i, opt in enumerate(q["options"]):
            self.option_buttons[i].config(text=opt, value=opt)

        # 恢復按鈕文字
        self.next_btn.config(text="看答案", bg="#FFF5CC")

    # 看答案 OR 下一題（雙用途按鈕）
    def reveal_or_next(self):
        if not self.showing_answer:
            self.reveal_answer()
        else:
            self.goto_next_question()

    # 顯示答案（高亮顯示）
    def reveal_answer(self):
        q = self.questions[self.index]

        chosen = self.selected.get()
        correct = q["answer"]

        # 若尚未作答，不能看答案
        if chosen == "":
            messagebox.showwarning("提醒", "請先選擇一個答案")
            return

        # 記錄是否答對
        if chosen == correct:
            self.score += 1
        else:
            wrong = load_wrong_words()
            wrong.append(q)
            save_wrong_words(wrong)

        # 高亮答案：綠色 = 正確，紅色 = 誤選
        for btn in self.option_buttons:
            val = btn.cget("text")
            if val == correct:
                btn.config(bg="#CCFFCC")   # 正確：淡綠
            elif val == chosen:
                btn.config(bg="#FFCCCC")   # 選錯：淡紅

        # 切換到「下一題」模式
        self.showing_answer = True
        self.next_btn.config(text="下一題", bg="#D0E7FF")

    # 換題
    def goto_next_question(self):
        self.index += 1

        if self.index >= len(self.questions):
            messagebox.showinfo(
                "完成測驗",
                f"你答對 {self.score} 題，共 {len(self.questions)} 題"
            )
            self.win.destroy()
            return

        self.load_question()

# ==============================
# 主 App
# ==============================
class VocabApp:
    def __init__(self, root):
        self.root = root
        self.root.title(APP_TITLE)
        self.root.geometry(f"{WINDOW_W}x{WINDOW_H}")
        self.root.configure(bg="white")

        # 讀取單字（優先快取）
        self.vocab = load_or_build_vocab(PDF_FILE)

        self.build_main_menu()

    def make_button(self, parent, text, cmd):
        return tk.Button(
            parent,
            text=text,
            font=("Helvetica", 28),
            fg="black",
            bg="white",
            relief="flat",
            bd=0,
            highlightthickness=0,
            activebackground="#EAEAEA",
            activeforeground="black",
            command=cmd
        )

    def build_main_menu(self):
        frame = tk.Frame(self.root, bg="white")
        frame.pack(fill=tk.BOTH, expand=True)

        title = tk.Label(
            frame,
            text="Vocabulary Trainer",
            font=("Helvetica", 48, "bold"),
            bg="white",
            fg="black"
        )
        title.pack(pady=70)

        # 英 → 中：先題數再選 Level
        self.make_button(
            frame,
            "開始測驗（英 → 中）",
            self.start_en_to_zh_flow
        ).pack(pady=25)

        # 複習錯題
        self.make_button(
            frame,
            "複習錯題",
            self.review_wrong_words
        ).pack(pady=30)

        # 離開
        self.make_button(
            frame,
            "離開",
            self.root.quit
        ).pack(pady=40)

    # 開始測驗流程
    def start_en_to_zh_flow(self):
        num = simpledialog.askinteger(
            "題數設定",
            "請輸入要練習的題數（1～500）：",
            minvalue=1,
            maxvalue=500
        )
        if num is None:
            return

        LevelSelectWindow(
            self.root,
            self.vocab,
            lambda filtered_vocab: self.start_quiz_en_to_zh(filtered_vocab, num)
        )

    def start_quiz_en_to_zh(self, vocab, num_questions):
        qs = generate_quiz_en_to_zh(vocab, num_questions)
        if not qs:
            messagebox.showwarning("沒有題目", "目前題庫是空的！")
            return
        QuizWindow_EnToZh(self.root, qs)

    # 複習錯題
    def review_wrong_words(self):
        wrong = load_wrong_words()
        if not wrong:
            messagebox.showinfo("提示", "你目前沒有錯題！")
            return

        num = min(10, len(wrong))
        qs = generate_quiz_en_to_zh(wrong, num)
        if not qs:
            messagebox.showwarning("沒有題目", "錯題清單有問題，無法產生題目")
            return
        QuizWindow_EnToZh(self.root, qs)

# ==============================
# 程式入口
# ==============================
if __name__ == "__main__":
    root = tk.Tk()
    app = VocabApp(root)
    root.mainloop()

