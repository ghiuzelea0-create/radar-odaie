/**
 * Devizele din modulul Costing & Ofertare, pregatite pentru afisare.
 *
 * Formulele de calcul raman in `arca-app/costing_engine.py` — aici doar citim
 * rezultatul deja calculat si il agregam. Singurul calcul propriu e relatia
 * dintre adaos si marja (vezi `analizaAdaosMarja`), care nu e stocata nicaieri
 * dar explica de ce toate devizele ies cu aceeasi marja.
 */

/** Un deviz salvat, exact cum il scrie `app.deviz_nou` prin `storage.salveaza_deviz`. */
export type DevizRecord = {
  id: string;
  creat_la?: string;
  /** Text liber in formular — poate sau nu sa coincida cu un `cod_proiect` din registru. */
  proiect: string;
  client: string;
  /** ISO `YYYY-MM-DD` */
  data: string;
  rezultat: {
    sinteza: {
      subtotal_materiale: number;
      subtotal_manopera: number;
      valoare_proiectare: number;
      subtotal_logistica: number;
      cost_total_productie: number;
      pret_vanzare_fara_tva: number;
      pret_total_cu_tva: number;
    };
    verificare_marja: {
      cost_total_productie: number;
      pret_vanzare_fara_tva: number;
      marja_bruta_ron: number;
      marja_bruta_pct: number;
      prag_marja_minima: number;
      pondere_materiale: number;
      pondere_manopera: number;
      stare_marja: string;
    };
  };
};

export type RandDeviz = {
  id: string;
  proiect: string;
  client: string;
  data: string;
  pret_fara_tva: number;
  pret_cu_tva: number;
  cost_total: number;
  marja_ron: number;
  marja_pct: number;
  stare_marja: string;
  pondere_materiale: number;
  /** Adevarat cand `proiect` coincide cu un cod din registrul de proiecte. */
  legat_de_proiect: boolean;
};

export type AnalizaAdaos = {
  adaos: number;
  rezerva: number;
  /** Marja bruta care rezulta efectiv din adaosul si rezerva de mai sus. */
  marja_rezultata: number;
  tinta: number;
  /** Adaosul necesar ca sa atingi tinta, la aceeasi rezerva. */
  adaos_necesar: number;
  /** Cate puncte procentuale lipsesc pana la tinta. */
  diferenta: number;
};

export type DateOfertare = {
  devize: RandDeviz[];
  total_ofertat_fara_tva: number;
  marja_totala_ron: number;
  /** Devize al caror `proiect` nu se regaseste in registru. */
  nelegate: number;
  /** null cand lipsesc parametrii sau nu exista devize. */
  analiza: AnalizaAdaos | null;
};

/**
 * Marja bruta care rezulta dintr-un adaos dat.
 *
 * Motorul calculeaza pret = cost x (1 + adaos + rezerva), deci
 * marja = (pret - cost) / pret = (adaos + rezerva) / (1 + adaos + rezerva).
 *
 * De aici vine si observatia ca marja e aceeasi pe toate devizele: nu depinde
 * de marimea sau structura devizului, ci doar de parametri.
 */
export function marjaDinAdaos(adaos: number, rezerva: number): number {
  const suma = adaos + rezerva;
  return suma / (1 + suma);
}

/**
 * Adaosul necesar pentru o marja tinta, la o rezerva data.
 *
 * Inversa functiei de mai sus: din marja = (a+r)/(1+a+r) rezulta
 * a + r = marja / (1 - marja).
 */
export function adaosPentruMarja(marjaTinta: number, rezerva: number): number {
  if (marjaTinta >= 1) return Number.POSITIVE_INFINITY;
  return marjaTinta / (1 - marjaTinta) - rezerva;
}

/**
 * Compara adaosul configurat cu marja tinta.
 *
 * Confuzia adaos/marja costa bani: un adaos de 30% NU da o marja de 30%.
 * Regulile proiectului cer explicit separarea celor doua notiuni, iar
 * `parametri.json` marcheaza marja tinta drept „prag-tinta; nu intra in calcul" —
 * adica nimic nu verifica automat daca adaosul o atinge. Aici o verificam.
 */
export function analizaAdaosMarja(parametri: Record<string, { valoare: number }>): AnalizaAdaos | null {
  const adaos = parametri.adaos_comercial?.valoare;
  const rezerva = parametri.rezerva_risc?.valoare;
  const tinta = parametri.marja_bruta_tinta?.valoare;
  if (adaos === undefined || rezerva === undefined || tinta === undefined) return null;

  const marjaRezultata = marjaDinAdaos(adaos, rezerva);
  return {
    adaos,
    rezerva,
    marja_rezultata: marjaRezultata,
    tinta,
    adaos_necesar: adaosPentruMarja(tinta, rezerva),
    diferenta: tinta - marjaRezultata,
  };
}

/**
 * Aceeasi normalizare ca `legaturi.normalizeaza_cod` din arca-app.
 *
 * Campul `proiect` din deviz e text liber, iar Flask leaga devizul de proiect
 * ignorand spatiile si diferenta de litere mari/mici. Daca aici am compara
 * exact, un deviz legat corect in aplicatie ar aparea aici drept orfan.
 */
export function normalizeazaCod(valoare: string | null | undefined): string {
  return (valoare ?? "").trim().toLocaleLowerCase("ro");
}

export function construiesteOfertare(
  devize: DevizRecord[],
  coduriProiecte: string[],
  parametri: Record<string, { valoare: number }>,
): DateOfertare {
  const coduri = new Set(coduriProiecte.map(normalizeazaCod).filter(Boolean));

  const randuri: RandDeviz[] = devize.map((d) => {
    const v = d.rezultat.verificare_marja;
    return {
      id: d.id,
      proiect: d.proiect,
      client: d.client,
      data: d.data,
      pret_fara_tva: v.pret_vanzare_fara_tva,
      pret_cu_tva: d.rezultat.sinteza.pret_total_cu_tva,
      cost_total: v.cost_total_productie,
      marja_ron: v.marja_bruta_ron,
      marja_pct: v.marja_bruta_pct,
      stare_marja: v.stare_marja,
      pondere_materiale: v.pondere_materiale,
      legat_de_proiect: coduri.has(normalizeazaCod(d.proiect)),
    };
  });

  return {
    devize: randuri,
    total_ofertat_fara_tva: randuri.reduce((t, r) => t + r.pret_fara_tva, 0),
    marja_totala_ron: randuri.reduce((t, r) => t + r.marja_ron, 0),
    nelegate: randuri.filter((r) => !r.legat_de_proiect).length,
    analiza: randuri.length ? analizaAdaosMarja(parametri) : null,
  };
}
