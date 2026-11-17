"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, setSetting } from "@/lib/db";
import { checkPassword, endSession, requireLogin, startSession } from "@/lib/auth";
import { logVisit, normalizePhone, today } from "@/lib/reminders";

const str = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  if (!checkPassword(str(formData.get("password"), 200))) return "Şifre yanlış.";
  await startSession();
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function addClient(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireLogin();
  const name = str(formData.get("name"), 80);
  const phone = normalizePhone(str(formData.get("phone"), 30));
  if (!name) return "İsim gerekli.";
  if (!phone) return "Telefon numarası geçerli değil (örn. 0532 123 45 67).";
  const consent = formData.get("consent") === "on" ? 1 : 0;
  const r = db.prepare("INSERT INTO clients (name, phone, consent) VALUES (?, ?, ?)").run(name, phone, consent);
  revalidatePath("/clients");
  redirect(`/clients/${Number(r.lastInsertRowid)}`);
}

export async function setConsent(formData: FormData) {
  await requireLogin();
  const id = Number(formData.get("id"));
  const consent = formData.get("consent") === "1" ? 1 : 0;
  db.prepare("UPDATE clients SET consent = ? WHERE id = ?").run(consent, id);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
}

export async function deleteClient(formData: FormData) {
  await requireLogin();
  db.prepare("DELETE FROM clients WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/clients");
  redirect("/clients");
}

export async function addVisit(formData: FormData) {
  await requireLogin();
  const clientId = Number(formData.get("client_id"));
  const service = str(formData.get("service_name"), 80);
  const doneOn = str(formData.get("done_on"), 10) || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doneOn) || !service) return;
  logVisit(clientId, service, str(formData.get("notes"), 300), doneOn);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

export async function markSent(formData: FormData) {
  await requireLogin();
  db.prepare("UPDATE reminders SET sent_at = datetime('now') WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/");
}

export async function skipReminder(formData: FormData) {
  await requireLogin();
  db.prepare("DELETE FROM reminders WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/");
}

export async function saveRule(formData: FormData) {
  await requireLogin();
  const days = Math.max(1, Math.min(730, Number(formData.get("follow_up_days")) || 0));
  db.prepare("UPDATE rules SET follow_up_days = ?, suggestion = ? WHERE id = ?").run(
    days,
    str(formData.get("suggestion"), 200),
    Number(formData.get("id")),
  );
  revalidatePath("/rules");
}

export async function addRule(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireLogin();
  const name = str(formData.get("service_name"), 80);
  const days = Math.max(1, Math.min(730, Number(formData.get("follow_up_days")) || 0));
  if (!name) return "Hizmet adı gerekli.";
  try {
    db.prepare("INSERT INTO rules (service_name, follow_up_days, suggestion) VALUES (?, ?, ?)").run(name, days, str(formData.get("suggestion"), 200));
  } catch {
    return "Bu hizmet zaten var.";
  }
  revalidatePath("/rules");
  return null;
}

export async function deleteRule(formData: FormData) {
  await requireLogin();
  db.prepare("DELETE FROM rules WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/rules");
}

export async function saveSalonName(formData: FormData) {
  await requireLogin();
  const name = str(formData.get("salon_name"), 60);
  if (name) setSetting("salon_name", name);
  revalidatePath("/rules");
  revalidatePath("/");
}

export async function handleRequest(formData: FormData) {
  await requireLogin();
  db.prepare("UPDATE booking_requests SET handled = 1 WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/");
}

// Public: the client taps the link in WhatsApp and leaves a preferred time. No login, token-checked.
export async function submitBooking(_prev: string | null, formData: FormData): Promise<string | null> {
  const token = str(formData.get("token"), 40);
  const reminder = db.prepare("SELECT id FROM reminders WHERE token = ?").get(token) as { id: number } | undefined;
  if (!reminder) return "Bu bağlantı geçerli değil.";
  const preferred = str(formData.get("preferred"), 200);
  if (!preferred) return "Lütfen uygun olduğunuz gün ve saati yazın.";
  const open = db.prepare("SELECT COUNT(*) AS n FROM booking_requests WHERE reminder_id = ? AND handled = 0").get(reminder.id) as { n: number };
  if (open.n >= 3) return "Talebiniz zaten bize ulaştı, en kısa sürede dönüş yapacağız.";
  db.prepare("INSERT INTO booking_requests (reminder_id, preferred, note) VALUES (?, ?, ?)").run(reminder.id, preferred, str(formData.get("note"), 300));
  redirect(`/book/${token}?ok=1`);
}
