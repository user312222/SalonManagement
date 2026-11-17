import { notFound } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { db, type Client, type Rule, type Visit } from "@/lib/db";
import { formatDateTR, today } from "@/lib/reminders";
import { addVisit, deleteClient, setConsent } from "../../actions";
import { Avatar, Icon } from "../../ui";

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  await requireLogin();
  const { id } = await params;
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(Number(id)) as Client | undefined;
  if (!client) notFound();
  const rules = db.prepare("SELECT * FROM rules ORDER BY service_name").all() as Rule[];
  const visits = db.prepare("SELECT * FROM visits WHERE client_id = ? ORDER BY done_on DESC, id DESC").all(client.id) as Visit[];

  return (
    <>
      <div className="page-head">
        <div className="who" style={{ gap: 16 }}>
          <Avatar name={client.name} large />
          <div>
            <div className="eyebrow">Müşteri</div>
            <h1>{client.name}</h1>
            <p className="sub"><Icon name="phone" size={14} /> +{client.phone}</p>
          </div>
        </div>
        <span className={client.consent ? "tag ok" : "tag warn"}>{client.consent ? "mesaj onayı var" : "mesaj onayı yok"}</span>
      </div>

      <div className="section-title" style={{ marginTop: 8 }}><h2>İşlem kaydet</h2></div>
      <form action={addVisit} className="stack card">
        <input type="hidden" name="client_id" value={client.id} />
        <div className="grid2">
          <label>
            Hizmet
            <select name="service_name" required>
              {rules.map((r) => (
                <option key={r.id} value={r.service_name}>
                  {r.service_name} ({r.follow_up_days} gün sonra)
                </option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input type="date" name="done_on" defaultValue={today()} required />
          </label>
        </div>
        <label>
          Not (kullanılan ürün, renk vb.)
          <input name="notes" maxLength={300} />
        </label>
        <div><button className="primary"><Icon name="check" size={16} /> Kaydet ve hatırlatmayı planla</button></div>
      </form>

      <div className="section-title"><h2>Geçmiş</h2><span className="count">{visits.length}</span></div>
      {visits.length === 0 ? (
        <div className="card empty"><strong>Henüz işlem yok</strong>Yukarıdan ilk işlemi kaydedin.</div>
      ) : (
        <div className="timeline">
          {visits.map((v) => (
            <div className="tl" key={v.id}>
              <div className="when">{formatDateTR(v.done_on)}</div>
              <strong>{v.service_name}</strong>
              {v.notes && <div className="muted">{v.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="section-title"><h2>Ayarlar</h2></div>
      <div className="card flat">
        <div className="actions">
          <form action={setConsent}>
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="consent" value={client.consent ? "0" : "1"} />
            <button>{client.consent ? "Onayı kaldır" : "Müşteri onayladı olarak işaretle"}</button>
          </form>
          <form action={deleteClient}>
            <input type="hidden" name="id" value={client.id} />
            <button className="danger">Müşteriyi sil</button>
          </form>
        </div>
      </div>
    </>
  );
}
