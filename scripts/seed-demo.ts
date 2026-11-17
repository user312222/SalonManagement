// Fills a SEPARATE demo database with clearly fictional sample data (for screenshots / demos).
// Usage: SALON_DATA_DIR=./data-demo node --experimental-strip-types scripts/seed-demo.ts
import crypto from "node:crypto";
import { db, setSetting } from "../lib/db.ts";

if (!process.env.SALON_DATA_DIR) {
  console.error("Refusing to seed: set SALON_DATA_DIR so the real database is never touched.");
  process.exit(1);
}

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const rule = (name: string) => db.prepare("SELECT follow_up_days FROM rules WHERE service_name = ?").get(name) as { follow_up_days: number };

// [name, phone, consent, service, daysAgo, notes, state]
const DEMO: [string, string, number, string, number, string, "pending" | "sent"][] = [
  ["Ayşe Yılmaz", "905320000001", 1, "Saç boyası", 38, "Bal sarısı, 8.3", "pending"],
  ["Elif Demir", "905320000002", 1, "Röfle / Balyaj", 36, "Sıcak karamel tonlar", "pending"],
  ["Zeynep Kaya", "905320000003", 1, "Manikür / Kalıcı oje", 21, "Nude pembe", "pending"],
  ["Gamze Şahin", "905320000004", 0, "Saç boyası", 30, "Kızıl bakır", "pending"],
  ["Selin Aydın", "905320000005", 1, "Kaş laminasyonu", 10, "", "pending"],
  ["Merve Çelik", "905320000006", 1, "Saç kesimi", 20, "Omuz hizası katlı kesim", "pending"],
  ["Buse Arslan", "905320000007", 1, "Keratin / Düzleştirme", 60, "", "pending"],
  ["Deniz Koç", "905320000008", 1, "Kirpik lifting", 52, "", "sent"],
];

setSetting("salon_name", "Salon Gül");

const insClient = db.prepare("INSERT INTO clients (name, phone, consent) VALUES (?, ?, ?)");
const insVisit = db.prepare("INSERT INTO visits (client_id, service_name, notes, done_on) VALUES (?, ?, ?, ?)");
const insRem = db.prepare("INSERT INTO reminders (visit_id, client_id, due_on, sent_at, token) VALUES (?, ?, ?, ?, ?)");

let denizReminder = 0;
for (const [name, phone, consent, service, daysAgo, notes, state] of DEMO) {
  const clientId = Number(insClient.run(name, phone, consent).lastInsertRowid);
  const doneOn = iso(-daysAgo);
  const visitId = Number(insVisit.run(clientId, service, notes, doneOn).lastInsertRowid);
  const due = iso(-daysAgo + rule(service).follow_up_days);
  const rid = Number(insRem.run(visitId, clientId, due, state === "sent" ? new Date().toISOString() : null, crypto.randomBytes(12).toString("base64url")).lastInsertRowid);
  if (name === "Deniz Koç") denizReminder = rid;
}

// A little history for the first client so her page shows a timeline.
const ayse = db.prepare("SELECT id FROM clients WHERE name = 'Ayşe Yılmaz'").get() as { id: number };
insVisit.run(ayse.id, "Saç bakımı / Maske", "Yoğun onarım", iso(-75));
insVisit.run(ayse.id, "Saç boyası", "Kumral, 6.0", iso(-110));

db.prepare("INSERT INTO booking_requests (reminder_id, preferred, note) VALUES (?, ?, ?)").run(
  denizReminder,
  "Cumartesi öğleden sonra",
  "Mümkünse 14:00’ten sonra olsun.",
);

console.log("Demo data written to", process.env.SALON_DATA_DIR);
