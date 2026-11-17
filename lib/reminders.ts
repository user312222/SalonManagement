import crypto from "node:crypto";
import { db, type Client, type Rule } from "./db";

export const today = (): string => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) / 86400000);
}

export function formatDateTR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Turkish mobile numbers -> international digits for wa.me (e.g. 0532 123 45 67 -> 905321234567)
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "90" + d.slice(1);
  else if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return /^\d{11,15}$/.test(d) ? d : null;
}

export function logVisit(clientId: number, serviceName: string, notes: string, doneOn: string) {
  const visit = db
    .prepare("INSERT INTO visits (client_id, service_name, notes, done_on) VALUES (?, ?, ?, ?)")
    .run(clientId, serviceName, notes, doneOn);
  const visitId = Number(visit.lastInsertRowid);
  const rule = db.prepare("SELECT * FROM rules WHERE service_name = ?").get(serviceName) as Rule | undefined;
  if (rule) {
    db.prepare("INSERT INTO reminders (visit_id, client_id, due_on, token) VALUES (?, ?, ?, ?)").run(
      visitId,
      clientId,
      addDays(doneOn, rule.follow_up_days),
      crypto.randomBytes(12).toString("base64url"),
    );
  }
  return visitId;
}

export type DueItem = {
  reminder_id: number;
  token: string;
  due_on: string;
  sent_at: string | null;
  client_id: number;
  client_name: string;
  phone: string;
  consent: number;
  service_name: string;
  done_on: string;
  suggestion: string;
};

export function listReminders(mode: "due" | "upcoming" | "sent"): DueItem[] {
  const base = `
    SELECT r.id AS reminder_id, r.token, r.due_on, r.sent_at, c.id AS client_id, c.name AS client_name,
           c.phone, c.consent, v.service_name, v.done_on, COALESCE(ru.suggestion, '') AS suggestion
    FROM reminders r
    JOIN clients c ON c.id = r.client_id
    JOIN visits v ON v.id = r.visit_id
    LEFT JOIN rules ru ON ru.service_name = v.service_name`;
  if (mode === "due") return db.prepare(base + " WHERE r.sent_at IS NULL AND r.due_on <= ? ORDER BY r.due_on").all(today()) as DueItem[];
  if (mode === "upcoming") return db.prepare(base + " WHERE r.sent_at IS NULL AND r.due_on > ? ORDER BY r.due_on LIMIT 30").all(today()) as DueItem[];
  return db.prepare(base + " WHERE r.sent_at IS NOT NULL ORDER BY r.sent_at DESC LIMIT 20").all() as DueItem[];
}

export function buildMessage(item: DueItem, salonName: string, link: string): string {
  const first = item.client_name.split(" ")[0];
  const days = daysBetween(item.done_on, today());
  const tip = item.suggestion ? ` Önerimiz: ${item.suggestion.replace(/[.\s]+$/, "")}.` : "";
  return `Merhaba ${first}, ${salonName} olarak yazıyoruz. ${item.service_name} işleminizin üzerinden ${days} gün geçti.${tip} Size uygun bir gün için buradan talep bırakabilirsiniz: ${link}`;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone) ?? phone}?text=${encodeURIComponent(message)}`;
}

export type { Client };
