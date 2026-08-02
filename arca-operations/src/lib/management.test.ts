/**
 * Verifica portul TypeScript fata de aceleasi cifre reale ca testele Python
 * (`arca-app/tests/test_management_engine.py`), care la randul lor reproduc
 * exemplele din `arcaflux.xlsx`. Daca aceste doua suite diverg, dashboard-ul si
 * aplicatia Flask ar arata numere diferite pentru aceleasi date.
 */
import { describe, expect, it } from "vitest";

import {
  calculeazaDurateFlux,
  calculeazaIncarcareFaze,
  calculeazaKpi,
  calculeazaParetoCauze,
  deltaMarja,
  diferentaZile,
  progresDinJurnal,
  valoareActiva,
  zileIntarziere,
  type EvenimentCauza,
  type ProiectInput,
  type ProiectRecord,
} from "./management";

/** Cele 3 proiecte din foaia REGISTRU PROIECTE (045, 046 livrate; 047 in curs). */
function proiecteExemplu(): ProiectInput[] {
  return [
    {
      cod_proiect: "ARC-2026-045",
      client: "Client A",
      denumire: "Bucatarie + dressing",
      data_comanda: "2026-06-15",
      termen_promis: "2026-07-10",
      termen_realizat: "2026-07-17",
      valoare_fara_tva: 28500,
      marja_ofertata: 0.34,
      marja_realizata: 0.27,
      faza_curenta: "",
      observatii: "",
    },
    {
      cod_proiect: "ARC-2026-046",
      client: "Client B",
      denumire: "Mobilier birou",
      data_comanda: "2026-06-29",
      termen_promis: "2026-07-24",
      termen_realizat: "2026-07-23",
      valoare_fara_tva: 16200,
      marja_ofertata: 0.31,
      marja_realizata: 0.3,
      faza_curenta: "",
      observatii: "",
    },
    {
      cod_proiect: "ARC-2026-047",
      client: "Exemplu client",
      denumire: "Bucatarie in L",
      data_comanda: "2026-07-27",
      termen_promis: "2026-08-21",
      termen_realizat: null,
      valoare_fara_tva: 21400,
      marja_ofertata: 0.33,
      marja_realizata: null,
      faza_curenta: "Debitare",
      observatii: "",
    },
  ];
}

/** Cele 5 evenimente din jurnalul CAUZE INTARZIERE. */
function evenimenteExemplu(): EvenimentCauza[] {
  return [
    { data: "2026-06-22", cod_proiect: "ARC-2026-045", faza_afectata: "Aprovizionare", cod_cauza: "C03", zile_pierdute: 4 },
    { data: "2026-06-30", cod_proiect: "ARC-2026-045", faza_afectata: "Debitare", cod_cauza: "C07", zile_pierdute: 1 },
    { data: "2026-07-06", cod_proiect: "ARC-2026-045", faza_afectata: "Montaj", cod_cauza: "C13", zile_pierdute: 2 },
    { data: "2026-07-02", cod_proiect: "ARC-2026-046", faza_afectata: "Proiectare tehnica", cod_cauza: "C01", zile_pierdute: 2 },
    { data: "2026-07-14", cod_proiect: "ARC-2026-046", faza_afectata: "Asamblare", cod_cauza: "C12", zile_pierdute: 1 },
  ];
}

describe("diferentaZile", () => {
  it("numara zilele calendaristice intre doua date ISO", () => {
    expect(diferentaZile("2026-07-10", "2026-07-17")).toBe(7);
    expect(diferentaZile("2026-07-24", "2026-07-23")).toBe(-1);
  });

  it("nu pierde o zi la trecerea la ora de vara", () => {
    // In Europa/Bucuresti ceasul se muta in noaptea de 28-29 martie 2026.
    expect(diferentaZile("2026-03-28", "2026-03-29")).toBe(1);
    expect(diferentaZile("2026-10-24", "2026-10-25")).toBe(1);
  });
});

describe("zileIntarziere / deltaMarja", () => {
  it("da aceleasi valori ca REGISTRU PROIECTE", () => {
    const [p045, p046, p047] = proiecteExemplu();

    expect(zileIntarziere(p045)).toBe(7);
    expect(zileIntarziere(p046)).toBe(-1);
    expect(zileIntarziere(p047)).toBeNull();

    expect(deltaMarja(p045)).toBeCloseTo(-0.07, 10);
    expect(deltaMarja(p046)).toBeCloseTo(-0.01, 10);
    expect(deltaMarja(p047)).toBeNull();
  });
});

describe("calculeazaParetoCauze", () => {
  it("reproduce analiza Pareto din workbook", () => {
    const pareto = calculeazaParetoCauze(evenimenteExemplu());
    const analiza = Object.fromEntries(pareto.analiza.map((a) => [a.cod, a]));

    expect(analiza.C01.zile_pierdute).toBe(2);
    expect(analiza.C01.procent).toBeCloseTo(0.2, 10);
    expect(analiza.C01.rang).toBe(2);

    expect(analiza.C03.zile_pierdute).toBe(4);
    expect(analiza.C03.procent).toBeCloseTo(0.4, 10);
    expect(analiza.C03.rang).toBe(1);

    // C07 si C12 au ambele 1 zi: rangul e unic la egalitate, ca in Excel.
    expect(analiza.C07.rang).toBe(4);
    expect(analiza.C12.rang).toBe(5);
    expect(analiza.C13.zile_pierdute).toBe(2);
    expect(analiza.C13.rang).toBe(3);

    // O cauza fara zile pierdute nu primeste rang.
    expect(analiza.C02.rang).toBeNull();

    expect(pareto.total_zile_pierdute).toBe(10);
    expect(pareto.top3[0]?.denumire).toBe("Material intarziat de furnizor");
    expect(pareto.top3[1]?.denumire).toBe("Asteptare aprobare client (decor, finisaj)");
    expect(pareto.top3[2]?.denumire).toBe("Montaj amanat de client");
  });

  it("nu acorda niciun rang cand nu exista evenimente", () => {
    const pareto = calculeazaParetoCauze([]);
    expect(pareto.total_zile_pierdute).toBe(0);
    expect(pareto.top3).toEqual([null, null, null]);
    expect(pareto.analiza.every((a) => a.rang === null && a.procent === 0)).toBe(true);
  });
});

describe("calculeazaKpi", () => {
  it("reproduce cei 7 KPI din workbook", () => {
    const kpi = calculeazaKpi(proiecteExemplu(), evenimenteExemplu());

    expect(kpi.proiecte_livrate).toBe(2);
    expect(kpi.livrate_la_termen).toBe(1);
    expect(kpi.procent_livrate_la_termen).toBeCloseTo(0.5, 10);
    expect(kpi.intarziere_medie_zile).toBeCloseTo(3, 10);
    expect(kpi.lead_time_mediu_zile).toBeCloseTo(28, 10);
    expect(kpi.marja_ofertata_medie).toBeCloseTo(0.326666666666667, 10);
    expect(kpi.marja_realizata_medie).toBeCloseTo(0.285, 10);
    expect(kpi.erodare_marja_medie).toBeCloseTo(-0.04, 10);
    expect(kpi.zile_pierdute_cumulat).toBe(10);
    expect(kpi.cauza_principala).toBe("Material intarziat de furnizor");
  });

  it("nu imparte la zero cand registrul e gol", () => {
    const kpi = calculeazaKpi([], []);
    expect(kpi.proiecte_livrate).toBe(0);
    expect(kpi.procent_livrate_la_termen).toBe(0);
    expect(kpi.lead_time_mediu_zile).toBe(0);
    expect(kpi.cauza_principala).toBe("- insuficiente date -");
  });
});

describe("calculeazaDurateFlux", () => {
  it("calculeaza durata pe faza din datele de intrare si lasa null unde lipsesc", () => {
    const durate = calculeazaDurateFlux({
      "Proiectare tehnica": "2026-07-27",
      Debitare: "2026-08-03",
      "Aplicare cant": "2026-08-05",
    });

    expect(durate[0]).toMatchObject({ faza: "Proiectare tehnica", durata_zile: 7 });
    expect(durate[1]).toMatchObject({ faza: "Debitare", durata_zile: 2 });
    // "Aplicare cant" -> "Gaurire / CNC": faza urmatoare nu a fost inca atinsa.
    expect(durate[2].durata_zile).toBeNull();
  });
});

describe("progresDinJurnal", () => {
  it("masoara progresul ca fractie din cele 9 faze atinse", () => {
    expect(progresDinJurnal({})).toBe(0);
    expect(progresDinJurnal({ "Proiectare tehnica": "2026-07-27", Debitare: "2026-08-03" })).toBe(22);
  });
});

describe("calculeazaIncarcareFaze", () => {
  const record = (
    cod: string,
    fazaCurenta: string,
    termenRealizat: string | null,
    ore: Record<string, number>,
  ): ProiectRecord => ({
    id: cod,
    input: {
      ...proiecteExemplu()[2],
      cod_proiect: cod,
      faza_curenta: fazaCurenta,
      termen_realizat: termenRealizat,
    },
    jurnal_flux: {},
    termen_realist: {
      faze: Object.entries(ore).map(([faza, ore_manopera]) => ({
        faza,
        ore_manopera,
        operatori_alocati: 1,
        zile_lucru: 0,
      })),
      total_ore: 0,
      total_zile_lucru: 0,
      total_asteptare: 0,
      total_zile_necesare: 0,
      data_livrare_realista: null,
      marja_fata_de_cerere: null,
      pondere_asteptare: 0,
      verdict: "",
    },
  });

  it("insumeaza orele pe faza doar pentru proiectele active", () => {
    const incarcare = calculeazaIncarcareFaze([
      record("ARC-1", "Debitare", null, { Debitare: 6, Vopsire: 10 }),
      record("ARC-2", "Vopsire", null, { Debitare: 4, Vopsire: 30 }),
      // Livrat: nu mai incarca atelierul, deci nu intra in calcul.
      record("ARC-3", "Montaj", "2026-07-30", { Debitare: 100, Vopsire: 100 }),
    ]);

    const peFaza = Object.fromEntries(incarcare.map((f) => [f.faza, f]));
    expect(peFaza.Debitare.ore).toBe(10);
    expect(peFaza.Vopsire.ore).toBe(40);
    expect(peFaza.Debitare.proiecte_in_faza).toBe(1);
    expect(peFaza.Vopsire.proiecte_in_faza).toBe(1);
    expect(peFaza.Montaj.proiecte_in_faza).toBe(0);

    // Ponderea e relativa la faza cea mai incarcata, nu la o capacitate inventata.
    expect(peFaza.Vopsire.pondere).toBe(100);
    expect(peFaza.Debitare.pondere).toBe(25);
    expect(peFaza.Asamblare.pondere).toBe(0);
  });

  it("returneaza toate fazele pe zero cand nu exista proiecte", () => {
    const incarcare = calculeazaIncarcareFaze([]);
    expect(incarcare).toHaveLength(9);
    expect(incarcare.every((f) => f.ore === 0 && f.pondere === 0)).toBe(true);
  });
});

describe("valoareActiva", () => {
  it("insumeaza doar valoarea proiectelor nelivrate", () => {
    expect(valoareActiva(proiecteExemplu())).toBe(21400);
  });
});
