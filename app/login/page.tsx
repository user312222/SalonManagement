import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { LoginForm } from "../forms";
import { BrandMark } from "../ui";

export default async function LoginPage() {
  if (await isLoggedIn()) redirect("/");
  return (
    <>
      <div className="hero">
        <BrandMark size={26} />
        <h1>Salon Dönüş</h1>
        <p>Müşterileriniz doğru zamanda geri dönsün.</p>
      </div>
      <LoginForm />
    </>
  );
}
