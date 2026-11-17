import { requireLogin } from "@/lib/auth";
import { db, getSetting, type Rule } from "@/lib/db";
import { deleteRule, saveRule, saveSalonName } from "../actions";
import { AddRuleForm } from "../forms";

export default async function RulesPage() {
  await requireLogin();
  const rules = db.prepare("SELECT * FROM rules ORDER BY service_name").all() as Rule[];
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Ayarlar</div>
          <h1>Hizmet kuralları</h1>
          <p className="sub">Süreler başlangıç önerisidir. Müşterinin gerçekte ne zaman döndüğüne göre değiştirin.</p>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 8 }}><h2>Salon adı</h2></div>
      <form action={saveSalonName} className="card row">
        <input name="salon_name" defaultValue={getSetting("salon_name", "Salonumuz")} maxLength={60} style={{ flex: 1, minWidth: 200 }} aria-label="Salon adı" />
        <button className="primary">Kaydet</button>
      </form>
      <p className="muted" style={{ margin: "-4px 0 0" }}>Mesajlarda “… olarak yazıyoruz” kısmında görünür.</p>

      <div className="section-title"><h2>Kurallar</h2><span className="count">{rules.length}</span></div>
      <div className="rule-grid">
        {rules.map((r) => (
          <form action={saveRule} className="card stack" key={r.id} style={{ margin: 0 }}>
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <strong>{r.service_name}</strong>
              <span className="days-pill"><b>{r.follow_up_days}</b> gün</span>
            </div>
            <div className="grid2">
              <label>
                Kaç gün sonra
                <input name="follow_up_days" type="number" min={1} max={730} defaultValue={r.follow_up_days} required />
              </label>
              <label>
                Öneri
                <input name="suggestion" defaultValue={r.suggestion} maxLength={200} />
              </label>
            </div>
            <div className="actions">
              <button className="primary">Kaydet</button>
              <button className="danger" formAction={deleteRule}>Sil</button>
            </div>
          </form>
        ))}
      </div>

      <div className="section-title"><h2>Yeni kural</h2></div>
      <AddRuleForm />
    </>
  );
}
