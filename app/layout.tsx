import type { Metadata } from "next";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { logout } from "./actions";
import { Tabs } from "./nav";
import { BrandMark, Icon } from "./ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon Dönüş",
  description: "Müşterilerinizi doğru zamanda geri getiren hatırlatma asistanı",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const loggedIn = await isLoggedIn();
  return (
    <html lang="tr">
      <body>
        {loggedIn ? (
          <>
            <header className="topbar">
              <div className="topbar-inner">
                <Link href="/" className="brand">
                  <BrandMark />
                  <span className="brand-name">{getSetting("salon_name", "Salon Dönüş")}</span>
                </Link>
                <Tabs />
                <form action={logout}>
                  <button type="submit" className="ghost logout" title="Çıkış" aria-label="Çıkış">
                    <Icon name="logout" />
                  </button>
                </form>
              </div>
            </header>
            <main className="page">{children}</main>
          </>
        ) : (
          <main className="public">
            <div className="public-card">{children}</div>
          </main>
        )}
      </body>
    </html>
  );
}
