"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Icon } from "../ui";

export type ClientRow = { id: number; name: string; phone: string; consent: number; last_visit: string | null };

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const shown = needle ? clients.filter((c) => c.name.toLocaleLowerCase("tr-TR").includes(needle) || c.phone.includes(needle)) : clients;

  if (clients.length === 0) {
    return (
      <div className="card empty">
        <strong>Henüz müşteri yok</strong>
        Yukarıdan ilk müşterinizi ekleyin.
      </div>
    );
  }
  return (
    <>
      <div className="search">
        <Icon name="search" size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim veya telefon ara…" aria-label="Müşteri ara" />
      </div>
      {shown.length === 0 ? (
        <div className="card empty">“{q}” için sonuç yok.</div>
      ) : (
        <div className="list">
          {shown.map((c) => (
            <Link href={`/clients/${c.id}`} className="item" key={c.id}>
              <div className="who">
                <Avatar name={c.name} />
                <div>
                  <div className="who-name">{c.name}</div>
                  <div className="muted">
                    +{c.phone} · Son işlem: {c.last_visit ? c.last_visit.split("-").reverse().join(".") : "—"}
                  </div>
                </div>
              </div>
              <span className={c.consent ? "tag ok" : "tag warn"}>{c.consent ? "onaylı" : "onay yok"}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
