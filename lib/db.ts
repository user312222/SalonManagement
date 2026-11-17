import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DIR = process.env.SALON_DATA_DIR ? path.resolve(process.env.SALON_DATA_DIR) : path.join(process.cwd(), "data");
fs.mkdirSync(DIR, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __salonDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  const db = new DatabaseSync(path.join(DIR, "salon.db"));
  db.exec("PRAGMA busy_timeout = 10000"); // several build workers may open the file at once
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      consent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL UNIQUE,
      follow_up_days INTEGER NOT NULL,
      suggestion TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      done_on TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      due_on TEXT NOT NULL,
      sent_at TEXT,
      token TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS booking_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
      preferred TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      handled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  seedDefaults(db);
  return db;
}

// Starting points only. The salon owner must adjust these intervals to how
// their own work behaves; they are not validated numbers.
const DEFAULT_RULES: [string, number, string][] = [
  ["Saç boyası", 28, "Renk canlılığını korumak için cila / toner bakımı"],
  ["Röfle / Balyaj", 35, "Ton dengeleme (toner) ve onarıcı bakım"],
  ["Keratin / Düzleştirme", 90, "Keratin bakım ve onarım seansı"],
  ["Saç kesimi", 42, "Form kesimi ve uç bakımı"],
  ["Manikür / Kalıcı oje", 21, "Kalıcı oje yenileme"],
];

// Added once to existing databases too (guarded by a settings flag, so deleted rules stay deleted).
const MORE_RULES: [string, number, string][] = [
  ["Saç açma / Dekolorasyon", 35, "Dip boyası ve onarıcı bakım"],
  ["Perma / Dalga", 120, "Dalga bakım ve nem seansı"],
  ["Saç bakımı / Maske", 21, "Yoğun nem ve onarım bakımı"],
  ["Kaş laminasyonu", 45, "Kaş laminasyonu yenileme"],
  ["Kaş alımı / Şekillendirme", 28, "Kaş şekillendirme bakımı"],
  ["Kirpik lifting", 50, "Kirpik lifting yenileme"],
  ["Protez tırnak dolgu", 21, "Protez tırnak dolgu ve bakım"],
  ["Ağda", 28, "Ağda randevusu"],
  ["Cilt bakımı", 30, "Aylık cilt bakım seansı"],
];

function seedDefaults(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM rules").get() as { n: number };
  const ins = db.prepare("INSERT OR IGNORE INTO rules (service_name, follow_up_days, suggestion) VALUES (?, ?, ?)");
  if (count.n === 0) for (const [n, d, s] of DEFAULT_RULES) ins.run(n, d, s);
  const done = db.prepare("SELECT 1 AS x FROM settings WHERE key = 'rules_v2'").get();
  if (!done) {
    for (const [n, d, s] of MORE_RULES) ins.run(n, d, s);
    db.prepare("INSERT INTO settings (key, value) VALUES ('rules_v2', '1')").run();
  }
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('salon_name', 'Salonumuz')").run();
}

function getDb(): DatabaseSync {
  return globalThis.__salonDb ?? (globalThis.__salonDb = open());
}

// Opened lazily on first query, so importing this module (e.g. during `next build`) never touches the file.
export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export type Client = { id: number; name: string; phone: string; consent: number; created_at: string };
export type Rule = { id: number; service_name: string; follow_up_days: number; suggestion: string };
export type Visit = { id: number; client_id: number; service_name: string; notes: string; done_on: string };

export function getSetting(key: string, fallback = ""): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}
export function setSetting(key: string, value: string) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
