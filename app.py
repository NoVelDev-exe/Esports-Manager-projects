import argparse
import datetime as dt
import math
import os
import re
import secrets
import sqlite3
import threading
import time
import sys
import traceback
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("ESM_DB", BASE / "esports_manager.db"))
# ===== เปลี่ยนรหัสผ่านผู้ดูแลที่นี่ =====
DEFAULT_ADMIN_PASSWORD = "admin1234"
# ถ้าตั้งตัวแปร ESM_ADMIN_PASSWORD ไว้ จะใช้ค่านั้นแทน (ตัดช่องว่างและเครื่องหมายคำพูดหัวท้ายออกให้)
_env_pw = os.environ.get("ESM_ADMIN_PASSWORD", "").strip().strip('"').strip("'")
ADMIN_PASSWORD = _env_pw or DEFAULT_ADMIN_PASSWORD
PASSWORD_SOURCE = "ตัวแปร ESM_ADMIN_PASSWORD" if _env_pw else "DEFAULT_ADMIN_PASSWORD ใน app.py"
MAX_BODY = 8 * 1024 * 1024          # รวมรูปภาพที่ย่อแล้ว
MAX_IMG = 2 * 1024 * 1024
TOKEN_TTL = 12 * 3600

app = Flask(__name__, static_folder="templates/static", static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY
app.json.ensure_ascii = False
app.json.sort_keys = False


# =====================================================================
# ข้อมูลตั้งต้น
# =====================================================================
def norm(s):
    return re.sub(r"[^a-z0-9\u0e00-\u0e7f+]", "", str(s or "").lower())


def parse_agents(s):
    out = []
    for part in str(s or "").split(";"):
        a = part.strip().split()
        if len(a) >= 5:
            def n(x):
                try:
                    return int(x)
                except ValueError:
                    return 0
            out.append({"n": a[0], "g": n(a[1]), "w": n(a[2]), "k": n(a[3]), "d": n(a[4])})
    return out


VCT = [
    ["Paper Rex", "Pacific", "สิงคโปร์ (SEA)", "alecks"],
    ["Rex Regum Qeon", "Pacific", "อินโดนีเซีย (SEA)", "Jovi"],
    ["Team Secret", "Pacific", "ฟิลิปปินส์ (SEA)", "Spin"],
    ["FULL SENSE", "Pacific", "ไทย (SEA)", "THEELOVEFAMILY"],
    ["Global Esports", "Pacific", "อินเดีย", "FrosT"],
    ["Gen.G Esports", "Pacific", "เกาหลีใต้"],
    ["Nongshim RedForce", "Pacific", "เกาหลีใต้"],
    ["T1", "Pacific", "เกาหลีใต้"],
    ["KIWOOM DRX", "Pacific", "เกาหลีใต้"],
    ["DetonatioN FocusMe", "Pacific", "ญี่ปุ่น"],
    ["ZETA DIVISION", "Pacific", "ญี่ปุ่น"],
    ["VARREL", "Pacific", "ญี่ปุ่น"],
    *[[n, "Americas", ""] for n in ["100 Thieves", "Cloud9", "Evil Geniuses", "FURIA", "KRÜ Esports", "Leviatán", "LOUD", "MIBR", "NRG", "Sentinels", "G2 Esports", "ENVY"]],
    *[[n, "EMEA", ""] for n in ["BBL Esports", "Fnatic", "FUT Esports", "Karmine Corp", "Natus Vincere", "Team Heretics", "Team Liquid", "Team Vitality", "GIANTX", "Gentle Mates", "ULF Esports", "PCIFIC Esports"]],
    *[[n, "China", ""] for n in ["All Gamers", "Bilibili Gaming", "EDward Gaming", "FunPlus Phoenix", "JD Gaming", "Nova Esports", "Titan Esports Club", "Trace Esports", "TYLOO", "Wolves Esports", "XLG Esports", "Dragon Ranger Gaming"]],
]
VCT_IDS = {t[0]: f"v{i}" for i, t in enumerate(VCT)}

REAL_PLAYERS = [
    ["Paper Rex", [["invy", "Adrian Jiggs Reyes"], ["Jinggg", "Wang Jing Jie"], ["f0rsakeN", "Jason Susanto"], ["d4v41", "Khalish Rusyaidee"], ["something", "Ilya Petrov"]]],
    ["Rex Regum Qeon", [["Monyet", "Cahya Nugraha"], ["xffero", "David Monangin"], ["Jemkin", "Maksim Batorov"], ["Kushy", "Bryan Carlos Setiawan"], ["crazyguy", "Ngô Công Anh"], ["Xan", "Xan Ng"]]],
    ["Team Secret", [["kellyS", "Kelly Sedillo"], ["natz", "Jonathan Adiputra"], ["STYRON", "Tidus Goh"], ["Zeus", "Jhian Vega"], ["Sylvan", "Go Young-sup"]]],
    ["FULL SENSE", [["Killua", "Tanate Teerasawad"], ["primmie", "Papaphat Sriprapha"], ["JitBoyS", "Jittana Nokngam"], ["seph1roth", "Chinnakrit Phoojaroen"], ["thyy", "Anupong Preamsak"]]],
    ["Global Esports", [["PatMen", "Patrick Mendoza"], ["Kr1stal", "Savva Fedorov"], ["xavi8k", "Xavier Juan"], ["Autumn", "Kale Dunne"], ["Deryeon", "Derrick Yee"]]],
    ["Gen.G Esports", [["Xiesta", "Jung Si-hwan"], ["Karon", "Kim Won-tae"], ["t3xture", "Kim Na-ra"], ["Raxcal", "Kim Min-seok"], ["Dambi", "Lee Hyuk-kyu"], ["MaKo", "Kim Myeong-gwan"]]],
    ["Nongshim RedForce", [["WoohyuN", "Moon Woo-hyun"], ["Xross", "Jeonghwan"], ["UdoTan", "Go Kyung-won"], ["Rb", "Goo Sang-min"], ["Francis", "Kim Mu-bin"], ["Ivy", "Park Sung-hyeon"]]],
    ["DetonatioN FocusMe", [["Meiy", "Ibuki Seki"], ["SSeeS", "Tomonori Okimura"], ["yatsuka", "Kazuya Ikeda"], ["Caedye", "Amon Mateus Okakura"], ["Akame", "Yu Gwang-hui"]]],
    ["T1", [["stax", "Kim Gu-taek"], ["BuZz", "Yu Byeong-cheol"], ["iZu", "Ham Woo-ju"]]],
    ["KIWOOM DRX", [["Flicker", "Kim Tae-hee"]]],
    ["ZETA DIVISION", [["SugarZ3ro", "Shota Watanabe"]]],
]

REAL_STAFF = [
    ["Paper Rex", [["alecks", "Alexandre Sallé", "หัวหน้าโค้ช"], ["Wendler", "Ashton Wendler", "ผู้ช่วยโค้ช"], ["Panda", "Laijhun Cheng", "โค้ชสมรรถภาพ"], ["Tommy", "Kumaresan Ramani", "ผู้จัดการทีม"]]],
    ["Rex Regum Qeon", [["Jovi", "Jovanni Vera", "หัวหน้าโค้ช"], ["Warbirds", "Evan Olzem", "ผู้ช่วยโค้ช"], ["Rebecca", "Rebecca Wong", "โค้ชสมรรถภาพ"], ["dave", "David Hunter", "นักวิเคราะห์"], ["Jomengz", "Jonathan Hoo", "สตาฟฟ์"], ["SeasoNz", "Joe Lai", "ผู้จัดการทีม"]]],
    ["Team Secret", [["Spin", "Peter Bradford", "หัวหน้าโค้ช"]]],
    ["FULL SENSE", [["THEELOVEFAMILY", "Thanaphat Limpaphan", "หัวหน้าโค้ช"], ["Sushiboys", "Panyawat Subsiriroj", "ผู้ช่วยโค้ช"], ["Crws", "Thanamethk Mahatthananuyut", "โค้ช"]]],
    ["Global Esports", [["FrosT", "Hector Rosario", "หัวหน้าโค้ช"], ["balax", "Thong Chern Kwi", "โค้ช"], ["vladk0r", "Vladimir Kornev", "ผู้ช่วยโค้ช"], ["Platoon", "Daniel Zhou", "นักวิเคราะห์"], ["Vatsal", "Vatsal Uniyal", "ผู้จัดการทีม"], ["taeri", "Hose Son", "สตาฟฟ์"], ["UnknowN", "Minseong Kim", "สตาฟฟ์"]]],
]


def build_seed():
    teams = [{"id": f"t{i}", "name": n, "game": "Valorant", "region": "ไทย", "coach": c}
             for i, (n, c) in enumerate([("Bangkok Titans", "โค้ชบอส"), ("Siam Phoenix", "โค้ชนิว"), ("Chiang Mai Wolves", "โค้ชเฟิร์ส")])]
    teams += [{"id": f"v{i}", "name": t[0], "game": "Valorant",
               "region": "VCT " + t[1] + (" / " + t[2] if t[2] else ""),
               "coach": t[3] if len(t) > 3 else ""} for i, t in enumerate(VCT)]

    local_players = [
        ["Nova", "สมชาย ใจดี", "t0", "Duelist", 215, "Jett 28 18 520 390; Raze 16 9 290 240; Neon 8 4 130 120; Yoru 4 2 60 70"],
        ["Rex", "ธนกร แสงทอง", "t0", "IGL", 190, "Omen 24 15 330 310; Astra 14 8 190 180; Viper 10 6 130 120"],
        ["Mint", "ปวีณา รักเกม", "t1", "Controller", 192, "Viper 22 13 300 270; Clove 15 8 210 200; Brimstone 9 5 120 115"],
        ["Zen", "กิตติ มั่นคง", "t1", "Sentinel", 180, "Cypher 20 12 260 230; Killjoy 17 9 240 210; Chamber 9 5 160 130"],
        ["Fang", "ภูมิ พิทักษ์", "t2", "Initiator", 210, "Sova 26 17 380 330; Fade 14 8 210 190; Skye 8 5 110 100; Breach 6 3 80 85"],
        ["Ally", "ณัฐ วงศ์ไทย", "t2", "Duelist", 213, "Reyna 22 14 450 340; Jett 18 10 340 290; Phoenix 6 3 100 95"],
    ]
    players = [{"id": f"p{i}", "name": p[0], "real": p[1], "team": p[2], "role": p[3], "price": p[4], "agents": parse_agents(p[5])}
               for i, p in enumerate(local_players)]
    real = []
    for team, ps in REAL_PLAYERS:
        for n, r in ps:
            real.append({"id": f"vp{len(real)}", "name": n, "real": r, "team": VCT_IDS[team], "role": "", "price": 0, "agents": []})
    players += real

    staff = []
    for team, ps in REAL_STAFF:
        for n, r, ro in ps:
            staff.append({"id": f"vs{len(staff)}", "name": n, "real": r, "team": VCT_IDS[team], "role": ro})

    gear = [{"id": f"g{i}", "name": g[0], "brand": "", "type": g[1], "owner": g[2], "status": g[3],
             "cost": 0, "bought": "", "serial": "", "note": "", "img": ""}
            for i, g in enumerate([["Logitech G Pro X Superlight", "เมาส์", "p0", "พร้อมใช้"], ["Wooting 60HE", "คีย์บอร์ด", "p1", "พร้อมใช้"],
                                   ["HyperX Cloud III", "หูฟัง", "p2", "ส่งซ่อม"], ["ZOWIE XL2566K 360Hz", "จอภาพ", "", "พร้อมใช้"]])]
    pid = lambda n: next((p["id"] for p in real if p["name"] == n), "")
    Z = ["ZOWIE XL2566K", "BenQ ZOWIE", "จอภาพ"]; W = ["Wooting 60HE", "Wooting", "คีย์บอร์ด"]
    S2 = ["Logitech G Pro X Superlight 2", "Logitech G", "เมาส์"]; H = ["HyperX Cloud III", "HyperX", "หูฟัง"]
    A = ["Artisan Ninja FX Zero Soft", "Artisan", "เมาส์แพด"]
    real_gear = [
        ["f0rsakeN", [Z, ["Logitech G Pro X Superlight", "Logitech G", "เมาส์"], W, H, A], "prosettings.net / Sportskeeda ปี 2024"],
        ["d4v41", [Z, S2, W, ["Razer Hammerhead Pro V2", "Razer", "หูฟัง"], ["SteelSeries Dex", "SteelSeries", "เมาส์แพด"]], "prosettings.net / Sportskeeda ปี 2024"],
        ["something", [["ZOWIE XL2566X+", "BenQ ZOWIE", "จอภาพ"], S2, ["Yuki Aim 65% Keyboard", "Yuki Aim", "คีย์บอร์ด"], H, ["SteelSeries QcK Heavy", "SteelSeries", "เมาส์แพด"]], "Sportskeeda ปี 2024 / ZOWIE ปี 2025"],
        ["Jinggg", [["ZOWIE XL2546K", "BenQ ZOWIE", "จอภาพ"], ["FinalMouse Starlight-12", "FinalMouse", "เมาส์"], ["Logitech G Pro X Headset", "Logitech G", "หูฟัง"], A], "ข้อมูลปี 2022 อาจเปลี่ยนแล้ว"],
    ]
    n = 0
    for owner, items, src in real_gear:
        for g in items:
            gear.append({"id": f"vg{n}", "name": g[0], "brand": g[1], "type": g[2], "owner": pid(owner), "status": "พร้อมใช้",
                         "cost": 0, "bought": "", "serial": "", "note": "แหล่งข้อมูล: " + src, "img": ""})
            n += 1

    lib, seen = [], set()
    for g in gear:
        k = norm(g["name"])
        if k not in seen:
            seen.add(k)
            lib.append({"id": f"l{len(lib)}", "name": g["name"], "brand": g["brand"], "type": g["type"], "img": ""})

    tours = [
        {"id": "r0", "name": "SEA Valorant Open 2026", "game": "Valorant", "start": "2026-09-12", "place": "สิงคโปร์", "prize": 500000},
        {"id": "r1", "name": "SEA Qualifier to World Tour 2027", "game": "Valorant", "start": "2026-12-05", "place": "ออนไลน์", "prize": 200000},
    ]
    results = [{"id": f"m{i}", "tour": m[0], "date": m[1], "a": m[2], "b": m[3], "sa": m[4], "sb": m[5]}
               for i, m in enumerate([["r0", "2026-09-12", "t0", "t1", 2, 1], ["r0", "2026-09-13", "t1", "t2", 2, 2], ["r0", "2026-09-14", "t0", "t2", 0, 2]])]

    # ลำดับนี้สำคัญ: ตารางที่ถูกอ้างอิงต้องมาก่อน
    return {"teams": teams, "tours": tours, "players": players, "staff": staff, "lib": lib, "gear": gear, "results": results}


# =====================================================================
# ฐานข้อมูล
# =====================================================================
GEAR_TYPES = "เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เก้าอี้|คอมพิวเตอร์|เมาส์แพด|อื่น ๆ"
STAFF_ROLES = "หัวหน้าโค้ช|โค้ช|ผู้ช่วยโค้ช|โค้ชสมรรถภาพ|ผู้จัดการทีม|นักวิเคราะห์|สตาฟฟ์"

# ฟิลด์ของแต่ละตาราง (ตรงกับตัวแปร E ในฝั่งเว็บ)
FIELDS = {
    "teams":   [("name", "text"), ("game", "text"), ("region", "text"), ("coach", "text")],
    "players": [("name", "text"), ("real", "text"), ("team", "ref:teams"), ("role", "text"), ("price", "num"), ("agents", "agents")],
    "staff":   [("name", "text"), ("real", "text"), ("team", "ref:teams"), ("role", "sel:" + STAFF_ROLES)],
    "gear":    [("name", "text"), ("brand", "text"), ("type", "sel:" + GEAR_TYPES), ("owner", "ref:players"),
                ("status", "sel:พร้อมใช้|ส่งซ่อม|สูญหาย"), ("cost", "num"), ("bought", "date"),
                ("serial", "text"), ("note", "longtext"), ("img", "img")],
    "lib":     [("name", "text"), ("brand", "text"), ("type", "sel:" + GEAR_TYPES), ("img", "img")],
    "tours":   [("name", "text"), ("game", "text"), ("start", "date"), ("place", "text"), ("prize", "num")],
    "results": [("tour", "ref:tours"), ("date", "date"), ("a", "ref:teams"), ("b", "ref:teams"), ("sa", "int"), ("sb", "int")],
}
STATE_ORDER = ["teams", "players", "staff", "gear", "lib", "tours", "results"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS teams(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '', coach TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS tours(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT NOT NULL DEFAULT '',
  "start" TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', prize REAL NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS players(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, "real" TEXT NOT NULL DEFAULT '',
  team TEXT REFERENCES teams(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT '', price REAL NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS player_agents(
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pos INTEGER NOT NULL, agent TEXT NOT NULL,
  games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0, deaths INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(player_id, pos));

CREATE TABLE IF NOT EXISTS staff(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, "real" TEXT NOT NULL DEFAULT '',
  team TEXT REFERENCES teams(id) ON DELETE SET NULL, role TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS lib(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '', img TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS gear(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '',
  owner TEXT REFERENCES players(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'พร้อมใช้', cost REAL NOT NULL DEFAULT 0, bought TEXT NOT NULL DEFAULT '',
  serial TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', img TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS results(
  id TEXT PRIMARY KEY,
  tour TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  a TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  b TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sa INTEGER NOT NULL DEFAULT 0, sb INTEGER NOT NULL DEFAULT 0,
  CHECK(a <> b));

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_staff_team ON staff(team);
CREATE INDEX IF NOT EXISTS idx_gear_owner ON gear(owner);
CREATE INDEX IF NOT EXISTS idx_results_tour ON results(tour);
CREATE INDEX IF NOT EXISTS idx_results_a ON results(a);
CREATE INDEX IF NOT EXISTS idx_results_b ON results(b);
"""

write_lock = threading.Lock()
tokens = {}          # token -> เวลาหมดอายุ
tokens_lock = threading.Lock()


class BadRequest(Exception):
    pass


def q(name):
    return '"' + name + '"'


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def new_id():
    return secrets.token_hex(6)


def as_number(v):
    return int(v) if isinstance(v, float) and v.is_integer() else v


# ---------- อ่านข้อมูล ----------
def load_state(conn):
    state = {}
    for ent in STATE_ORDER:
        cols = ["id"] + [f for f, k in FIELDS[ent] if k != "agents"]
        rows = []
        for r in conn.execute(f"SELECT {','.join(q(c) for c in cols)} FROM {ent} ORDER BY rowid"):
            d = dict(zip(cols, r))
            for f, kind in FIELDS[ent]:
                if kind.startswith("ref:") and d.get(f) is None:
                    d[f] = ""
                elif kind in ("num", "int"):
                    d[f] = as_number(d[f])
            rows.append(d)
        state[ent] = rows
    agents = {}
    for pid, agent, g, w, k, d in conn.execute(
            "SELECT player_id, agent, games, wins, kills, deaths FROM player_agents ORDER BY player_id, pos"):
        agents.setdefault(pid, []).append({"n": agent, "g": g, "w": w, "k": k, "d": d})
    for p in state["players"]:
        p["agents"] = agents.get(p["id"], [])
    return state


# ---------- ตรวจสอบข้อมูลที่ส่งเข้ามา ----------
def clean_agents(v):
    if not isinstance(v, list):
        raise BadRequest("รูปแบบสถิติตัวละครไม่ถูกต้อง")
    out = []
    for a in v[:50]:
        if not isinstance(a, dict) or not str(a.get("n", "")).strip():
            raise BadRequest("รูปแบบสถิติตัวละครไม่ถูกต้อง")
        nums = {}
        for key in "gwkd":
            x = a.get(key, 0)
            if isinstance(x, bool) or not isinstance(x, int) or x < 0:
                raise BadRequest("สถิติตัวละครต้องเป็นจำนวนเต็มตั้งแต่ 0")
            nums[key] = x
        if nums["w"] > nums["g"]:
            raise BadRequest("จำนวนชนะต้องไม่เกินจำนวนเกม")
        out.append({"n": str(a["n"]).strip()[:40], **nums})
    return out


def clean(ent, obj):
    if not isinstance(obj, dict):
        raise BadRequest("ข้อมูลไม่ถูกต้อง")
    rec = {"id": str(obj.get("id") or "").strip()[:64] or new_id()}
    for f, kind in FIELDS[ent]:
        v = obj.get(f)
        if kind == "agents":
            rec[f] = clean_agents(v if v is not None else [])
        elif kind in ("num", "int"):
            try:
                x = float(v if v not in (None, "") else 0)
            except (TypeError, ValueError):
                raise BadRequest(f"ช่อง {f} ต้องเป็นตัวเลข")
            if not math.isfinite(x) or x < 0:
                raise BadRequest(f"ช่อง {f} ต้องเป็นตัวเลขตั้งแต่ 0")
            if kind == "int":
                if not x.is_integer():
                    raise BadRequest("คะแนนต้องเป็นจำนวนเต็ม")
                x = int(x)
            rec[f] = x
        elif kind.startswith("ref:"):
            rec[f] = str(v or "").strip() or None
        elif kind.startswith("sel:"):
            opts = kind[4:].split("|")
            s = str(v or "").strip() or opts[0]
            if s not in opts:
                raise BadRequest(f"ค่าของช่อง {f} ไม่อยู่ในตัวเลือก")
            rec[f] = s
        elif kind == "date":
            s = str(v or "").strip()
            if s:
                try:
                    dt.date.fromisoformat(s)
                except ValueError:
                    raise BadRequest("รูปแบบวันที่ไม่ถูกต้อง")
            rec[f] = s
        elif kind == "img":
            s = str(v or "").strip()
            if s and not (s.startswith("data:image/") or s.startswith("https://") or s.startswith("http://")):
                raise BadRequest("รูปภาพไม่ถูกต้อง")
            if len(s) > MAX_IMG:
                raise BadRequest("รูปภาพมีขนาดใหญ่เกินไป")
            rec[f] = s
        else:
            rec[f] = str(v if v is not None else "").strip()[:2000 if kind == "longtext" else 300]

    if ent == "results":
        if not rec["tour"] or not rec["a"] or not rec["b"]:
            raise BadRequest("กรุณาเลือกรายการแข่งและทีมทั้งสองฝั่ง")
        if rec["a"] == rec["b"]:
            raise BadRequest("ทีม A และทีม B ต้องไม่ใช่ทีมเดียวกัน")
        if not rec["date"]:
            raise BadRequest("กรุณาเลือกวันที่แข่ง")
    elif not rec["name"]:
        raise BadRequest("กรุณากรอกชื่อ")
    return rec


# ---------- เขียนข้อมูล ----------
def upsert(conn, ent, rec):
    cols = [c for c in rec if c != "agents"]
    sets = ",".join(f"{q(c)}=excluded.{q(c)}" for c in cols if c != "id")
    conn.execute(
        f"INSERT INTO {ent}({','.join(q(c) for c in cols)}) VALUES({','.join('?' * len(cols))}) "
        f"ON CONFLICT(id) DO UPDATE SET {sets}",
        [rec[c] for c in cols])
    if ent == "players":
        conn.execute("DELETE FROM player_agents WHERE player_id=?", (rec["id"],))
        conn.executemany(
            "INSERT INTO player_agents(player_id,pos,agent,games,wins,kills,deaths) VALUES(?,?,?,?,?,?,?)",
            [(rec["id"], i, a["n"], a["g"], a["w"], a["k"], a["d"]) for i, a in enumerate(rec["agents"])])
    if ent == "gear":
        ensure_lib(conn, rec)


def ensure_lib(conn, g):
    """อุปกรณ์รุ่นใหม่จะถูกเพิ่มเข้าคลังอุปกรณ์อัตโนมัติ (เหมือน ensureLib เดิม)"""
    key = norm(g["name"])
    if not key:
        return
    for lid, name, img in conn.execute("SELECT id, name, img FROM lib"):
        if norm(name) == key:
            if not img and g["img"]:
                conn.execute("UPDATE lib SET img=? WHERE id=?", (g["img"], lid))
            return
    conn.execute("INSERT INTO lib(id,name,brand,type,img) VALUES(?,?,?,?,?)",
                 (new_id(), g["name"], g["brand"], g["type"], g["img"]))


def delete(conn, ent, ids):
    if not isinstance(ids, list) or not ids or not all(isinstance(i, str) for i in ids):
        raise BadRequest("ไม่ได้เลือกรายการที่จะลบ")
    ids = ids[:1000]
    # foreign key จัดการต่อเอง: ลบทีม -> ผลแข่งถูกลบ และนักแข่ง/สตาฟฟ์ไม่มีทีม,
    # ลบนักแข่ง -> อุปกรณ์ไม่มีผู้ใช้, ลบรายการแข่ง -> ผลแข่งถูกลบ
    conn.execute(f"DELETE FROM {ent} WHERE id IN ({','.join('?' * len(ids))})", ids)


def init_db(reset=False):
    if reset and DB_PATH.exists():
        DB_PATH.unlink()
    conn = connect()
    try:
        with conn:
            conn.executescript(SCHEMA)
            if conn.execute("SELECT 1 FROM meta WHERE key='seeded'").fetchone():
                return
            for ent, rows in build_seed().items():
                for r in rows:
                    upsert(conn, ent, clean(ent, r))
            conn.execute("INSERT INTO meta(key,value) VALUES('seeded',?)", (dt.datetime.now().isoformat(timespec="seconds"),))
    finally:
        conn.close()


# ---------- โทเค็นผู้ดูแล ----------
def issue_token():
    t = secrets.token_urlsafe(32)
    with tokens_lock:
        now = time.time()
        for k in [k for k, exp in tokens.items() if exp < now]:
            del tokens[k]
        tokens[t] = now + TOKEN_TTL
    return t


def valid_token(t):
    if not t:
        return False
    with tokens_lock:
        exp = tokens.get(t)
        return bool(exp and exp > time.time())


# =====================================================================
# หน้าเว็บ (templates/*.html)
# =====================================================================
PAGES = ["home", "teams", "players", "player", "staff", "gear", "lib", "tours", "results", "bracket", "compare"]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/<page>")
def page(page):
    if page.endswith(".html"):           # รองรับลิงก์แบบเดิม เช่น /teams.html
        page = page[:-5]
    if page == "index":
        return render_template("index.html")
    if page not in PAGES:
        abort(404)
    return render_template(page + ".html")


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# =====================================================================
# API (JSON)
# =====================================================================
def err(status, message):
    return jsonify({"error": message}), status


def body_json():
    if not request.is_json:
        raise BadRequest("ต้องส่งข้อมูลเป็น JSON")
    data = request.get_json(silent=True)
    if data is None:
        raise BadRequest("JSON ไม่ถูกต้อง")
    return data


@app.errorhandler(BadRequest)
def bad_request(e):
    return err(400, str(e))


@app.errorhandler(sqlite3.IntegrityError)
def integrity(e):
    return err(400, "ข้อมูลอ้างอิงไม่ถูกต้อง (ทีม/นักแข่ง/รายการที่เลือกอาจถูกลบไปแล้ว) กรุณาโหลดหน้าใหม่")


@app.errorhandler(413)
def too_large(e):
    return err(413, "ข้อมูลมีขนาดใหญ่เกินไป")


@app.get("/api/state")
def api_state():
    conn = connect()
    try:
        return jsonify(load_state(conn))
    finally:
        conn.close()


@app.post("/api/login")
def api_login():
    data = body_json()
    pw = str(data.get("password", "")) if isinstance(data, dict) else ""
    if not secrets.compare_digest(pw.encode(), ADMIN_PASSWORD.encode()):
        time.sleep(0.5)
        return err(401, "รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง")
    return jsonify({"token": issue_token()})


@app.get("/api/session")
def api_session():
    """ให้หน้าเว็บตรวจว่าการล็อกอินผู้ดูแลยังใช้ได้อยู่ไหม (เช่น หลังรีสตาร์ตหรือเปลี่ยนรหัส)"""
    return jsonify({"admin": valid_token(request.headers.get("X-Admin-Token"))})


@app.post("/api/logout")
def api_logout():
    with tokens_lock:
        tokens.pop(request.headers.get("X-Admin-Token", ""), None)
    return jsonify({"ok": True})


def admin_write(ent, action):
    if ent not in FIELDS:
        return err(404, "ไม่พบ API นี้")
    if not valid_token(request.headers.get("X-Admin-Token")):
        return err(401, "เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่")
    data = body_json()
    with write_lock:
        conn = connect()
        try:
            with conn:
                action(conn, data)
            state = load_state(conn)
        finally:
            conn.close()
    return jsonify({"state": state})


@app.post("/api/<ent>")
def api_save(ent):
    """เพิ่ม/แก้ไข 1 รายการ (ส่ง id เดิมมาเพื่อแก้ไข)"""
    return admin_write(ent, lambda conn, data: upsert(conn, ent, clean(ent, data)))


@app.post("/api/<ent>/delete")
def api_delete(ent):
    """ลบหลายรายการ: {"ids": [...]}"""
    return admin_write(ent, lambda conn, data: delete(conn, ent, data.get("ids") if isinstance(data, dict) else None))


# =====================================================================

def main():
    ap = argparse.ArgumentParser(description="E-Sports Team Manager (Flask)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5000)
    ap.add_argument("--init-db", action="store_true")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    if args.init_db:
        init_db(reset=True)
        print(f"สร้างฐานข้อมูลใหม่แล้ว: {DB_PATH}")
        return

    # ตรวจพอร์ตเฉพาะกระบวนการหลัก
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        import socket
        host = "127.0.0.1" if args.host in ("0.0.0.0", "") else args.host

        with socket.socket() as sk:
            sk.settimeout(0.5)
            if sk.connect_ex((host, args.port)) == 0:
                print(f"!! พอร์ต {args.port} ถูกใช้งานอยู่แล้ว")
                pause_on_error()
                return

    app.run(host=args.host, port=args.port, debug=True)


def pause_on_error():
    if sys.stdin is not None and sys.stdin.isatty():
        try:
            input("\nกด Enter เพื่อปิดหน้าต่างนี้...")
        except (EOFError, KeyboardInterrupt, OSError):
            pass


if __name__ == "__main__":
    try:
        init_db()
        main()
    except KeyboardInterrupt:
        print("\nปิดเซิร์ฟเวอร์แล้ว")
    except Exception:
        print("\nเกิดข้อผิดพลาดขณะเริ่มโปรแกรม:", file=sys.stderr)
        traceback.print_exc()
        pause_on_error()
else:
    init_db()