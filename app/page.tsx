import { headers } from "next/headers";
import Link from "next/link";
import { requireLogin } from "@/lib/auth";
import { db, getSetting } from "@/lib/db";
import { buildMessage, daysBetween, formatDateTR, listReminders, today, waLink } from "@/lib/reminders";
import { handleRequest, markSent, skipReminder } from "./actions";
import { Avatar, Icon } from "./ui";

type Req = { id: number; preferred: string; note: string; created_at: string; client_name: string; client_id: number; phone: string; service_name: string };

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="card empty">
      <span className="empty-ico"><Icon name="calendar" size={22} /></span>
      <strong>{title}</strong>
      {text}
    </div>
  );
}

export default async function Dashboard() {
  await requireLogin();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const salonName = getSetting("salon_name", "Salonumuz");

  const due = listReminders("due");
  const upcoming = listReminders("upcoming");
  const sent = listReminders("sent");
  const requests = db
    .prepare(
      `SELECT b.id, b.preferred, b.note, b.created_at, c.name AS client_name, c.id AS client_id, c.phone, v.service_name
       FROM booking_requests b
       JOIN reminders r ON r.id = b.reminder_id
       JOIN clients c ON c.id = r.client_id
       JOIN visits v ON v.id = r.visit_id
       WHERE b.handled = 0 ORDER BY b.created_at DESC`,
    )
    .all() as Req[];

  const clientCount = (db.prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;
  const dateLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const t = today();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{dateLabel}</div>
          <h1>Bugün kimi geri çağırıyoruz?</h1>
          <p className="sub">Zamanı gelen müşteriler, hazır mesajlarıyla burada.</p>
        </div>
      </div>

      {clientCount === 0 && (
        <div className="card onboard">
          <h2>Başlayalım</h2>
          <div className="muted">Üç adımda ilk hatırlatmanızı hazırlayın.</div>
          <ol>
            <li><span><Link href="/rules">Hizmet sürelerini</Link> salonunuza göre ayarlayın</span></li>
            <li><span><Link href="/clients">İlk müşterinizi ekleyin</Link> ve mesaj onayını işaretleyin</span></li>
            <li><span>Yapılan işlemi kaydedin, hatırlatma zamanı gelince burada görünür</span></li>
          </ol>
        </div>
      )}

      <div className="stats">
        <div className="stat hot"><span className="stat-ico"><Icon name="chat" size={22} /></span><div className="n">{due.length}</div><div className="l">Şimdi hatırlatılacak</div></div>
        <div className="stat"><span className="stat-ico"><Icon name="calendar" size={22} /></span><div className="n">{requests.length}</div><div className="l">Yeni randevu talebi</div></div>
        <div className="stat"><span className="stat-ico"><Icon name="today" size={22} /></span><div className="n">{upcoming.length}</div><div className="l">Yaklaşan hatırlatma</div></div>
        <div className="stat"><span className="stat-ico"><Icon name="check" size={22} /></span><div className="n">{sent.length}</div><div className="l">Son gönderilen</div></div>
      </div>

      {requests.length > 0 && (
        <>
          <div className="section-title"><h2>Randevu talepleri</h2><span className="count">{requests.length}</span></div>
          {requests.map((r) => (
            <div className="card" key={r.id}>
              <div className="reminder-top">
                <div className="who">
                  <Avatar name={r.client_name} />
                  <div>
                    <Link href={`/clients/${r.client_id}`} className="who-name">{r.client_name}</Link>
                    <div className="muted">{r.service_name} sonrası talep</div>
                  </div>
                </div>
                <span className="tag accent"><Icon name="calendar" size={13} /> {r.preferred}</span>
              </div>
              {r.note && <p className="muted" style={{ margin: "10px 0 0" }}>“{r.note}”</p>}
              <div className="actions" style={{ marginTop: 14 }}>
                <a className="btn wa" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer"><Icon name="chat" size={16} /> WhatsApp</a>
                <form action={handleRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="primary"><Icon name="check" size={16} /> Randevu verildi</button>
                </form>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="section-title"><h2>Şimdi hatırlatılacaklar</h2><span className="count">{due.length}</span></div>
      {due.length === 0 && <Empty title="Bugün için kimse yok" text="Bir müşterinin işlemini kaydedince hatırlatma zamanı gelince burada görünür." />}
      {due.map((d) => {
        const link = `${process.env.PUBLIC_URL?.replace(/\/$/, "") ?? `${proto}://${host}`}/book/${d.token}`;
        const msg = buildMessage(d, salonName, link);
        const late = daysBetween(d.due_on, t);
        return (
          <div className="card" key={d.reminder_id}>
            <div className="reminder-top">
              <div className="who">
                <Avatar name={d.client_name} />
                <div>
                  <Link href={`/clients/${d.client_id}`} className="who-name">{d.client_name}</Link>
                  <div className="muted">{d.service_name} · {formatDateTR(d.done_on)}</div>
                </div>
              </div>
              <div className="actions">
                {!d.consent && <span className="tag warn">onay yok</span>}
                {late > 0 ? <span className="tag bad">{late} gün gecikti</span> : <span className="tag ok">bugün</span>}
              </div>
            </div>
            <div className="bubble-label">Hazır mesaj</div>
            <div className="bubble">{msg}</div>
            <div className="actions">
              {d.consent ? (
                <a className="btn wa" href={waLink(d.phone, msg)} target="_blank" rel="noreferrer"><Icon name="chat" size={16} /> WhatsApp’ta aç</a>
              ) : (
                <span className="muted">Göndermeden önce müşteriden onay alıp müşteri sayfasından işaretleyin.</span>
              )}
              <form action={markSent}>
                <input type="hidden" name="id" value={d.reminder_id} />
                <button><Icon name="check" size={16} /> Gönderildi</button>
              </form>
              <form action={skipReminder}>
                <input type="hidden" name="id" value={d.reminder_id} />
                <button className="ghost danger">Atla</button>
              </form>
            </div>
          </div>
        );
      })}

      <div className="section-title"><h2>Yaklaşanlar</h2></div>
      {upcoming.length === 0 ? (
        <Empty title="Planlanmış hatırlatma yok" text="İşlem kaydedildikçe sıradaki hatırlatmalar burada listelenir." />
      ) : (
        <div className="list">
          {upcoming.map((d) => (
            <Link href={`/clients/${d.client_id}`} className="item" key={d.reminder_id}>
              <div className="who">
                <Avatar name={d.client_name} />
                <div>
                  <div className="who-name">{d.client_name}</div>
                  <div className="muted">{d.service_name}</div>
                </div>
              </div>
              <span className="tag">{formatDateTR(d.due_on)} · {daysBetween(t, d.due_on)} gün sonra</span>
            </Link>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <>
          <div className="section-title"><h2>Son gönderilenler</h2></div>
          <div className="list">
            {sent.map((d) => (
              <Link href={`/clients/${d.client_id}`} className="item" key={d.reminder_id}>
                <div className="who">
                  <Avatar name={d.client_name} />
                  <div>
                    <div className="who-name">{d.client_name}</div>
                    <div className="muted">{d.service_name}</div>
                  </div>
                </div>
                <span className="tag ok"><Icon name="check" size={13} /> gönderildi</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
