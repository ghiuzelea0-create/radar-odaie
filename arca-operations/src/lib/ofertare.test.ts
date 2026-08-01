/**
 * Cifrele de referinta vin din devize calculate efectiv de `costing_engine.py`
 * cu parametrii impliciti din `data/parametri.json` (adaos 30%, rezerva 5%).
 */
import { describe, expect, it } from "vitest";

import {
  adaosPentruMarja,
  analizaAdaosMarja,
  construiesteOfertare,
  marjaDinAdaos,
  type DevizRecord,
} from "./ofertare";

const PARAMETRI = {
  adaos_comercial: { valoare: 0.3 },
  rezerva_risc: { valoare: 0.05 },
  marja_bruta_tinta: { valoare: 0.35 },
  prag_alerta_marja: { valoare: 0.25 },
};

function deviz(id: string, proiect: string, pret: number, cost: number): DevizRecord {
  return {
    id,
    proiect,
    client: `Client ${id}`,
    data: "2026-07-21",
    rezultat: {
      sinteza: {
        subtotal_materiale: 0,
        subtotal_manopera: 0,
        valoare_proiectare: 0,
        subtotal_logistica: 0,
        cost_total_productie: cost,
        pret_vanzare_fara_tva: pret,
        pret_total_cu_tva: pret * 1.21,
      },
      verificare_marja: {
        cost_total_productie: cost,
        pret_vanzare_fara_tva: pret,
        marja_bruta_ron: pret - cost,
        marja_bruta_pct: (pret - cost) / pret,
        prag_marja_minima: 0.25,
        pondere_materiale: 0.5,
        pondere_manopera: 0.18,
        stare_marja: "ATENTIE - aproape de prag",
      },
    },
  };
}

describe("marjaDinAdaos", () => {
  it("da exact marja pe care o produce motorul Python la parametrii impliciti", () => {
    // Deviz real: cost 10824,008 -> pret 14612,411, marja 25,9259%.
    expect(marjaDinAdaos(0.3, 0.05)).toBeCloseTo(0.25925925925925924, 12);
  });

  it("nu confunda adaosul cu marja — un adaos de 30% nu da o marja de 30%", () => {
    expect(marjaDinAdaos(0.3, 0)).toBeCloseTo(0.23076923076923078, 12);
    expect(marjaDinAdaos(0.3, 0)).toBeLessThan(0.3);
  });

  it("fara adaos si fara rezerva marja e zero", () => {
    expect(marjaDinAdaos(0, 0)).toBe(0);
  });
});

describe("adaosPentruMarja", () => {
  it("este inversa lui marjaDinAdaos", () => {
    for (const [marja, rezerva] of [
      [0.35, 0.05],
      [0.25, 0],
      [0.4, 0.1],
    ]) {
      expect(marjaDinAdaos(adaosPentruMarja(marja, rezerva), rezerva)).toBeCloseTo(marja, 12);
    }
  });

  it("spune ce adaos cere o marja de 35% la rezerva de 5%", () => {
    expect(adaosPentruMarja(0.35, 0.05)).toBeCloseTo(0.4884615384615385, 12);
  });
});

describe("analizaAdaosMarja", () => {
  it("arata cat lipseste pana la tinta", () => {
    const a = analizaAdaosMarja(PARAMETRI);
    expect(a).not.toBeNull();
    expect(a!.marja_rezultata).toBeCloseTo(0.2592592592592592, 12);
    expect(a!.tinta).toBe(0.35);
    expect(a!.diferenta).toBeCloseTo(0.0907407407407408, 12);
    expect(a!.adaos_necesar).toBeCloseTo(0.4884615384615385, 12);
  });

  it("returneaza null daca lipsesc parametrii", () => {
    expect(analizaAdaosMarja({})).toBeNull();
    expect(analizaAdaosMarja({ adaos_comercial: { valoare: 0.3 } })).toBeNull();
  });
});

describe("construiesteOfertare", () => {
  it("insumeaza valorile si marcheaza devizele fara proiect in registru", () => {
    const date = construiesteOfertare(
      [
        deviz("d1", "EXEMPLU-03", 14612.41, 10824.01),
        deviz("d2", "EXEMPLU-04", 28309.56, 20969.31),
        deviz("d3", "FARA-PROIECT", 5675.47, 4204.05),
      ],
      ["EXEMPLU-03", "EXEMPLU-04"],
      PARAMETRI,
    );

    expect(date.devize).toHaveLength(3);
    expect(date.total_ofertat_fara_tva).toBeCloseTo(48597.44, 2);
    expect(date.marja_totala_ron).toBeCloseTo(12600.07, 2);

    expect(date.nelegate).toBe(1);
    expect(date.devize.find((d) => d.proiect === "FARA-PROIECT")!.legat_de_proiect).toBe(false);
    expect(date.devize.find((d) => d.proiect === "EXEMPLU-03")!.legat_de_proiect).toBe(true);
  });

  it("marja e aceeasi pe toate devizele, indiferent de marime", () => {
    const date = construiesteOfertare(
      [deviz("d1", "A", 14612.41, 10824.01), deviz("d2", "B", 28309.56, 20969.31)],
      ["A", "B"],
      PARAMETRI,
    );
    const marje = date.devize.map((d) => Math.round(d.marja_pct * 10000) / 10000);
    expect(new Set(marje).size).toBe(1);
    expect(marje[0]).toBeCloseTo(0.2593, 4);
  });

  it("nu produce analiza cand nu exista devize", () => {
    const date = construiesteOfertare([], [], PARAMETRI);
    expect(date.analiza).toBeNull();
    expect(date.total_ofertat_fara_tva).toBe(0);
  });
});
