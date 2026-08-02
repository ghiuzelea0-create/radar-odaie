import { Dashboard } from "@/components/dashboard";
import {
  citesteDevize,
  citesteEvenimenteCauze,
  citesteParametri,
  citesteProiecte,
  directorDate,
} from "@/lib/arca-data";
import { construiesteOfertare } from "@/lib/ofertare";
import { construiesteDate } from "@/lib/registru";

/**
 * Datele vin din fisierele scrise de aplicatia Flask din `arca-app/`, care se
 * schimba la fiecare salvare din interfata ei. Redam pagina la fiecare cerere,
 * altfel dashboard-ul ar ramane blocat pe cifrele de la momentul build-ului.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [proiecte, evenimente, devize, parametri] = await Promise.all([
    citesteProiecte(),
    citesteEvenimenteCauze(),
    citesteDevize(),
    citesteParametri(),
  ]);

  const azi = new Date().toISOString().slice(0, 10);
  const date = construiesteDate(proiecte, evenimente, directorDate(), azi);
  const ofertare = construiesteOfertare(
    devize,
    proiecte.map((p) => p.input.cod_proiect),
    parametri,
  );

  return <Dashboard date={date} ofertare={ofertare} />;
}
