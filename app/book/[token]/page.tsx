import { db, getSetting } from "@/lib/db";
import { BookingForm } from "../../forms";
import { BrandMark, Icon } from "../../ui";

export const metadata = { robots: { index: false, follow: false } };

export default async function BookPage({ params, searchParams }: PageProps<"/book/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const row = db
    .prepare(
      `SELECT c.name, v.service_name FROM reminders r
       JOIN clients c ON c.id = r.client_id JOIN visits v ON v.id = r.visit_id WHERE r.token = ?`,
    )
    .get(token) as { name: string; service_name: string } | undefined;
  const salon = getSetting("salon_name", "Salonumuz");

  if (!row) {
    return (
      <div className="card empty">
        <strong>Bu bağlantı geçerli değil</strong>
        Lütfen salonla doğrudan iletişime geçin.
      </div>
    );
  }
  if (sp.ok) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 28 }}>
        <div className="hero" style={{ marginBottom: 8 }}>
          <span className="brand-mark" style={{ background: "var(--ok)" }}><Icon name="check" size={26} /></span>
          <h1>Teşekkürler!</h1>
        </div>
        <p className="ok-msg">Talebiniz {salon} ekibine ulaştı. En kısa sürede size WhatsApp’tan dönüş yapacağız.</p>
      </div>
    );
  }
  return (
    <>
      <div className="hero">
        <BrandMark size={26} />
        <h1>{salon}</h1>
        <p>Merhaba {row.name.split(" ")[0]}, {row.service_name} sonrası için size uygun bir zaman bırakın.</p>
      </div>
      <BookingForm token={token} />
    </>
  );
}
