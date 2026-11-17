"use client";

import { useActionState } from "react";
import { addClient, addRule, login, submitBooking } from "./actions";

type Act = (prev: string | null, fd: FormData) => Promise<string | null>;

function useForm(action: Act) {
  return useActionState(action, null as string | null);
}

export function LoginForm() {
  const [err, act, pending] = useForm(login);
  return (
    <form action={act} className="stack card">
      <label>
        Şifre
        <input name="password" type="password" autoFocus required />
      </label>
      {err && <div className="err">{err}</div>}
      <button className="primary block" disabled={pending}>Giriş yap</button>
    </form>
  );
}

export function AddClientForm() {
  const [err, act, pending] = useForm(addClient);
  return (
    <form action={act} className="stack card">
      <div className="grid2">
        <label>
          Ad Soyad
          <input name="name" required maxLength={80} />
        </label>
        <label>
          Telefon (WhatsApp)
          <input name="phone" required placeholder="0532 123 45 67" inputMode="tel" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="consent" />
        Müşteri hatırlatma mesajı almayı onayladı
      </label>
      {err && <div className="err">{err}</div>}
      <button className="primary" disabled={pending}>Müşteri ekle</button>
    </form>
  );
}

export function AddRuleForm() {
  const [err, act, pending] = useForm(addRule);
  return (
    <form action={act} className="stack card">
      <div className="grid2">
        <label>
          Hizmet adı
          <input name="service_name" required maxLength={80} />
        </label>
        <label>
          Kaç gün sonra hatırlat
          <input name="follow_up_days" type="number" min={1} max={730} required />
        </label>
      </div>
      <label>
        Öneri (mesaja eklenir)
        <input name="suggestion" maxLength={200} placeholder="Örn. Renk canlılığı için cila bakımı" />
      </label>
      {err && <div className="err">{err}</div>}
      <button className="primary" disabled={pending}>Kural ekle</button>
    </form>
  );
}

export function BookingForm({ token }: { token: string }) {
  const [err, act, pending] = useForm(submitBooking);
  return (
    <form action={act} className="stack card">
      <input type="hidden" name="token" value={token} />
      <label>
        Hangi gün ve saat size uygun?
        <input name="preferred" required maxLength={200} placeholder="Örn. Cumartesi öğleden sonra" />
      </label>
      <label>
        Notunuz (isteğe bağlı)
        <textarea name="note" rows={3} maxLength={300} />
      </label>
      {err && <div className="err">{err}</div>}
      <button className="primary block" disabled={pending}>Talebi gönder</button>
    </form>
  );
}
