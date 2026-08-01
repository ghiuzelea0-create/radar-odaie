import { Dashboard } from "@/components/dashboard";
import { citesteEvenimenteCauze, citesteProiecte, directorDate } from "@/lib/arca-data";
import { construiesteDate } from "@/lib/registru";

/**
 * Datele vin din fisierele scrise de aplicatia Flask din `arca-app/`, care se
 * schimba la fiecare salvare din interfata ei. Redam pagina la fiecare cerere,
 * altfel dashboard-ul ar ramane blocat pe cifrele de la momentul build-ului.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [proiecte, evenimente] = await Promise.all([citesteProiecte(), citesteEvenimenteCauze()]);
  const azi = new Date().toISOString().slice(0, 10);
  const date = construiesteDate(proiecte, evenimente, directorDate(), azi);

  return <Dashboard date={date} />;
}
