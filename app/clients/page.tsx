import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddClientForm } from "../forms";
import { Icon } from "../ui";
import { ClientList, type ClientRow } from "./client-list";

export default async function ClientsPage() {
  await requireLogin();
  const clients = db
    .prepare(
      `SELECT c.id, c.name, c.phone, c.consent, (SELECT MAX(done_on) FROM visits v WHERE v.client_id = c.id) AS last_visit
       FROM clients c ORDER BY c.name COLLATE NOCASE`,
    )
    .all() as ClientRow[];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Rehber</div>
          <h1>Müşteriler</h1>
          <p className="sub">{clients.length} kayıtlı müşteri</p>
        </div>
      </div>
      <details className="disclosure" open={clients.length === 0}>
        <summary>
          <span className="btn primary"><Icon name="plus" size={16} /> Yeni müşteri</span>
        </summary>
        <AddClientForm />
      </details>
      <ClientList clients={clients} />
    </>
  );
}
