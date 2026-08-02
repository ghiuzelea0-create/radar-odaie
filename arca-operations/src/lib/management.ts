/**
 * Port TypeScript al formulelor din `arca-app/management_engine.py`.
 *
 * Functiile de aici sunt pure si trebuie sa dea aceleasi cifre ca motorul Python
 * (care la randul lui replica `arcaflux.xlsx`). Orice modificare aici trebuie
 * facuta si in `management_engine.py`, altfel dashboard-ul si aplicatia Flask
 * ar arata numere diferite pentru aceleasi date.
 */

/** Cele 9 faze de flux, in ordine — identic cu FAZE_FLUX din management_engine.py. */
export const FAZE_FLUX = [
  "Proiectare tehnica",
  "Debitare",
  "Aplicare cant",
  "Gaurire / CNC",
  "Asamblare",
  "Vopsire",
  "Finisare",
  "Ambalare",
  "Montaj",
] as const;

export type FazaFlux = (typeof FAZE_FLUX)[number];

/** Nomenclatorul fix de cauze de intarziere — identic cu NOMENCLATOR_CAUZE. */
export const NOMENCLATOR_CAUZE = [
  { cod: "C01", denumire: "Asteptare aprobare client (decor, finisaj)", categorie: "Client" },
  { cod: "C02", denumire: "Asteptare masuratori / santier nepregatit", categorie: "Client" },
  { cod: "C03", denumire: "Material intarziat de furnizor", categorie: "Aprovizionare" },
  { cod: "C04", denumire: "Material comandat prea tarziu", categorie: "Intern - planificare" },
  { cod: "C05", denumire: "Modificare ceruta de client dupa lansare", categorie: "Client" },
  { cod: "C06", denumire: "Eroare de proiectare (cote gresite)", categorie: "Intern - proiectare" },
  { cod: "C07", denumire: "Eroare de debitare / piesa retaiata", categorie: "Intern - productie" },
  { cod: "C08", denumire: "Defect de material (delaminare, decor neasortat)", categorie: "Furnizor" },
  { cod: "C09", denumire: "Timp de uscare subestimat", categorie: "Intern - planificare" },
  { cod: "C10", denumire: "Operator indisponibil (concediu, boala)", categorie: "Resurse" },
  { cod: "C11", denumire: "Defectiune utilaj", categorie: "Resurse" },
  { cod: "C12", denumire: "Feronerie lipsa sau gresita", categorie: "Aprovizionare" },
  { cod: "C13", denumire: "Montaj amanat de client", categorie: "Client" },
  { cod: "C14", denumire: "Suprapunere cu alt proiect prioritar", categorie: "Intern - planificare" },
] as const;

/** Datele unui proiect, exact cum sunt salvate de Flask in `input`. */
export type ProiectInput = {
  cod_proiect: string;
  client: string;
  denumire: string;
  /** ISO `YYYY-MM-DD` */
  data_comanda: string;
  /** ISO `YYYY-MM-DD` */
  termen_promis: string;
  /** ISO `YYYY-MM-DD`, null cat timp proiectul nu e livrat. */
  termen_realizat: string | null;
  valoare_fara_tva: number;
  /** Fractie, nu procent: 0,32 inseamna 32%. */
  marja_ofertata: number;
  marja_realizata: number | null;
  faza_curenta: string;
  observatii: string;
};

export type FazaTermenRealist = {
  faza: string;
  ore_manopera: number;
  operatori_alocati: number;
  zile_lucru: number;
};

export type TermenRealist = {
  faze: FazaTermenRealist[];
  total_ore: number;
  total_zile_lucru: number;
  total_asteptare: number;
  total_zile_necesare: number;
  data_livrare_realista: string | null;
  marja_fata_de_cerere: number | null;
  pondere_asteptare: number;
  verdict: string;
};

/** Un record complet de proiect, asa cum il scrie `storage.salveaza_proiect_management`. */
export type ProiectRecord = {
  id: string;
  creat_la?: string;
  actualizat_la?: string;
  input: ProiectInput;
  /** Data intrarii in fiecare faza: `{ "Debitare": "2026-07-14", ... }` */
  jurnal_flux: Record<string, string | null>;
  termen_realist: TermenRealist | null;
};

export type EvenimentCauza = {
  /** ISO `YYYY-MM-DD` */
  data: string;
  cod_proiect: string;
  faza_afectata: string;
  cod_cauza: string;
  zile_pierdute: number;
  nota?: string;
};

const MS_PE_ZI = 24 * 60 * 60 * 1000;

/**
 * Diferenta in zile intre doua date ISO.
 *
 * Parsam explicit la miezul noptii UTC: `new Date("2026-07-14")` e deja UTC, dar
 * a construi datele din componente locale ar introduce erori de +/-1 zi la
 * trecerea la ora de vara — exact genul de eroare care strica "zile intarziere".
 */
export function diferentaZile(dinISO: string, panaLaISO: string): number {
  const din = Date.parse(`${dinISO}T00:00:00Z`);
  const panaLa = Date.parse(`${panaLaISO}T00:00:00Z`);
  return Math.round((panaLa - din) / MS_PE_ZI);
}

/** `zile_intarziere` din Python: pozitiv = intarziere, negativ/0 = livrat la termen. */
export function zileIntarziere(p: ProiectInput): number | null {
  if (!p.termen_realizat) return null;
  return diferentaZile(p.termen_promis, p.termen_realizat);
}

/** `delta_marja` din Python: negativ = am pierdut marja fata de oferta. */
export function deltaMarja(p: ProiectInput): number | null {
  if (p.marja_realizata === null || p.marja_realizata === undefined) return null;
  return p.marja_realizata - p.marja_ofertata;
}

/** `calculeaza_durate_flux`: durata reala pe faza, din datele de intrare in faze. */
export function calculeazaDurateFlux(jurnalFlux: Record<string, string | null>) {
  const durate = [];
  for (let i = 0; i < FAZE_FLUX.length - 1; i += 1) {
    const faza = FAZE_FLUX[i];
    const fazaUrmatoare = FAZE_FLUX[i + 1];
    const d1 = jurnalFlux[faza];
    const d2 = jurnalFlux[fazaUrmatoare];
    durate.push({
      faza,
      faza_urmatoare: fazaUrmatoare,
      durata_zile: d1 && d2 ? diferentaZile(d1, d2) : null,
    });
  }
  return durate;
}

/**
 * Replica `RANK(...) + COUNTIF(...) - 1` din foaia CAUZE INTARZIERE:
 * rang descrescator, unic la egalitate (a doua aparitie a aceleiasi valori
 * primeste rangul urmator, nu acelasi rang).
 */
function rangCuEgalitati(valori: number[]): (number | null)[] {
  return valori.map((v, i) => {
    if (v === 0) return null;
    const rangBaza = 1 + valori.filter((alt) => alt > v).length;
    const aparitiiPanaAcum = valori.slice(0, i + 1).filter((alt) => alt === v).length;
    return rangBaza + aparitiiPanaAcum - 1;
  });
}

export type AnalizaCauza = {
  cod: string;
  denumire: string;
  categorie: string;
  zile_pierdute: number;
  procent: number;
  rang: number | null;
};

/** `calculeaza_pareto_cauze`: unde pierzi cele mai multe zile. */
export function calculeazaParetoCauze(evenimente: EvenimentCauza[]) {
  const zilePeCod = new Map<string, number>(NOMENCLATOR_CAUZE.map((c) => [c.cod, 0]));
  for (const ev of evenimente) {
    zilePeCod.set(ev.cod_cauza, (zilePeCod.get(ev.cod_cauza) ?? 0) + ev.zile_pierdute);
  }

  const valori = NOMENCLATOR_CAUZE.map((c) => zilePeCod.get(c.cod) ?? 0);
  const totalZile = valori.reduce((a, b) => a + b, 0);
  const ranguri = rangCuEgalitati(valori);

  const analiza: AnalizaCauza[] = NOMENCLATOR_CAUZE.map((c, i) => ({
    cod: c.cod,
    denumire: c.denumire,
    categorie: c.categorie,
    zile_pierdute: valori[i],
    procent: totalZile ? valori[i] / totalZile : 0,
    rang: ranguri[i],
  }));

  const top3 = [1, 2, 3].map((loc) => analiza.find((a) => a.rang === loc) ?? null);

  return { analiza, total_zile_pierdute: totalZile, top3 };
}

export type Kpi = ReturnType<typeof calculeazaKpi>;

/** `calculeaza_kpi`: cei 7 indicatori din foaia KPI. */
export function calculeazaKpi(proiecte: ProiectInput[], evenimente: EvenimentCauza[]) {
  const livrate = proiecte.filter((p) => p.termen_realizat);
  const intarzieri = livrate.map((p) => zileIntarziere(p)).filter((z): z is number => z !== null);
  const laTermen = intarzieri.filter((z) => z <= 0);

  const marjeOfertate = proiecte.map((p) => p.marja_ofertata).filter((m) => m !== null && m !== undefined);
  const marjeRealizate = proiecte
    .map((p) => p.marja_realizata)
    .filter((m): m is number => m !== null && m !== undefined);
  const delteMarja = proiecte.map(deltaMarja).filter((d): d is number => d !== null);
  const leadTime = livrate.map((p) => diferentaZile(p.data_comanda, p.termen_realizat as string));

  const pareto = calculeazaParetoCauze(evenimente);
  const medie = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

  return {
    proiecte_livrate: livrate.length,
    livrate_la_termen: laTermen.length,
    procent_livrate_la_termen: livrate.length ? laTermen.length / livrate.length : 0,
    intarziere_medie_zile: medie(intarzieri),
    lead_time_mediu_zile: medie(leadTime),
    marja_ofertata_medie: medie(marjeOfertate),
    marja_realizata_medie: medie(marjeRealizate),
    erodare_marja_medie: medie(delteMarja),
    zile_pierdute_cumulat: pareto.total_zile_pierdute,
    cauza_principala: pareto.top3[0]?.denumire ?? "- insuficiente date -",
  };
}

/** Un proiect e "activ" cat timp nu are termen realizat. */
export function esteActiv(p: ProiectInput): boolean {
  return !p.termen_realizat;
}

/**
 * Progresul unui proiect = cate faze din flux au fost deja atinse, din cele 9.
 * Se bazeaza pe jurnalul de flux real, nu pe o estimare subiectiva.
 */
export function progresDinJurnal(jurnalFlux: Record<string, string | null>): number {
  const atinse = FAZE_FLUX.filter((f) => Boolean(jurnalFlux[f])).length;
  return Math.round((atinse / FAZE_FLUX.length) * 100);
}

export type IncarcareFaza = {
  faza: string;
  /** Ore de manopera planificate pe faza, insumate din calculatoarele de termen realist. */
  ore: number;
  /** Cate proiecte active se afla chiar acum in aceasta faza. */
  proiecte_in_faza: number;
  /** Ponderea fata de faza cea mai incarcata (doar pentru bara vizuala). */
  pondere: number;
};

/**
 * Incarcarea pe faze de productie, calculata DOAR din date reale:
 * - orele vin din `termen_realist.faze` (completate de utilizator in aplicatia Flask);
 * - "proiecte in faza" vine din `input.faza_curenta`.
 *
 * Nu inventam un procent de capacitate: nu cunoastem capacitatea reala a halei.
 * Bara arata ponderea relativa fata de faza cea mai incarcata.
 */
export function calculeazaIncarcareFaze(proiecte: ProiectRecord[]): IncarcareFaza[] {
  const active = proiecte.filter((p) => esteActiv(p.input));

  const orePeFaza = new Map<string, number>(FAZE_FLUX.map((f) => [f, 0]));
  const proiectePeFaza = new Map<string, number>(FAZE_FLUX.map((f) => [f, 0]));

  for (const rec of active) {
    for (const f of rec.termen_realist?.faze ?? []) {
      if (orePeFaza.has(f.faza)) {
        orePeFaza.set(f.faza, (orePeFaza.get(f.faza) ?? 0) + f.ore_manopera);
      }
    }
    const curenta = rec.input.faza_curenta;
    if (curenta && proiectePeFaza.has(curenta)) {
      proiectePeFaza.set(curenta, (proiectePeFaza.get(curenta) ?? 0) + 1);
    }
  }

  const maxOre = Math.max(0, ...FAZE_FLUX.map((f) => orePeFaza.get(f) ?? 0));

  return FAZE_FLUX.map((faza) => {
    const ore = orePeFaza.get(faza) ?? 0;
    return {
      faza,
      ore,
      proiecte_in_faza: proiectePeFaza.get(faza) ?? 0,
      pondere: maxOre > 0 ? Math.round((ore / maxOre) * 100) : 0,
    };
  });
}

/** Totalul valoric al proiectelor active (fara TVA), pentru indicatorul de venit contractat. */
export function valoareActiva(proiecte: ProiectInput[]): number {
  return proiecte.filter(esteActiv).reduce((total, p) => total + (p.valoare_fara_tva || 0), 0);
}
