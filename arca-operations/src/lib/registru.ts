/**
 * Transforma record-urile brute salvate de Flask in randuri gata de afisat,
 * calculand aceleasi valori derivate ca pagina `/management` din arca-app.
 */
import {
  calculeazaIncarcareFaze,
  calculeazaKpi,
  calculeazaParetoCauze,
  deltaMarja,
  progresDinJurnal,
  zileIntarziere,
  type AnalizaCauza,
  type EvenimentCauza,
  type IncarcareFaza,
  type Kpi,
  type ProiectRecord,
} from "./management";

export type RandRegistru = {
  id: string;
  cod_proiect: string;
  client: string;
  denumire: string;
  data_comanda: string;
  termen_promis: string;
  termen_realizat: string | null;
  valoare_fara_tva: number;
  marja_ofertata: number;
  marja_realizata: number | null;
  delta_marja: number | null;
  zile_intarziere: number | null;
  faza_curenta: string;
  progres: number;
  activ: boolean;
  /** Verdictul calculatorului de termen realist, daca a fost rulat pentru proiect. */
  verdict_termen: string | null;
};

export type DateDashboard = {
  registru: RandRegistru[];
  kpi: Kpi;
  incarcare: IncarcareFaza[];
  top3Cauze: (AnalizaCauza | null)[];
  totalZilePierdute: number;
  valoareActivaTotal: number;
  /** Calea din care s-au citit datele — afisata cand nu exista inca nimic salvat. */
  sursaDate: string;
  /**
   * Ziua curenta (`YYYY-MM-DD`), calculata pe server.
   *
   * O citim o singura data si o transmitem mai departe: daca interfata ar apela
   * `Date.now()` in timpul randarii, rezultatul ar diferi intre server si client
   * si ar produce hydration mismatch la proiectele aflate exact pe termen.
   */
  azi: string;
};

export function construiesteRegistru(proiecte: ProiectRecord[]): RandRegistru[] {
  return proiecte.map((rec) => {
    const p = rec.input;
    return {
      id: rec.id,
      cod_proiect: p.cod_proiect,
      client: p.client,
      denumire: p.denumire,
      data_comanda: p.data_comanda,
      termen_promis: p.termen_promis,
      termen_realizat: p.termen_realizat ?? null,
      valoare_fara_tva: p.valoare_fara_tva ?? 0,
      marja_ofertata: p.marja_ofertata ?? 0,
      marja_realizata: p.marja_realizata ?? null,
      delta_marja: deltaMarja(p),
      zile_intarziere: zileIntarziere(p),
      faza_curenta: p.faza_curenta ?? "",
      progres: progresDinJurnal(rec.jurnal_flux ?? {}),
      activ: !p.termen_realizat,
      verdict_termen: rec.termen_realist?.verdict ?? null,
    };
  });
}

export function construiesteDate(
  proiecte: ProiectRecord[],
  evenimente: EvenimentCauza[],
  sursaDate: string,
  azi: string,
): DateDashboard {
  const inputuri = proiecte.map((p) => p.input);
  const pareto = calculeazaParetoCauze(evenimente);
  const registru = construiesteRegistru(proiecte);

  return {
    registru,
    kpi: calculeazaKpi(inputuri, evenimente),
    incarcare: calculeazaIncarcareFaze(proiecte),
    top3Cauze: pareto.top3,
    totalZilePierdute: pareto.total_zile_pierdute,
    valoareActivaTotal: registru.filter((r) => r.activ).reduce((t, r) => t + r.valoare_fara_tva, 0),
    sursaDate,
    azi,
  };
}
