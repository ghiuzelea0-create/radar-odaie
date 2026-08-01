/**
 * Citirea datelor reale scrise de aplicatia Flask din `arca-app/`.
 *
 * Cele doua aplicatii impart acelasi director de date: Flask scrie (formulare,
 * calculatoare), dashboard-ul acesta doar citeste. Nu duplicam datele si nu
 * inventam valori — daca directorul lipseste sau e gol, returnam liste goale si
 * interfata arata explicit ca nu exista inca proiecte inregistrate.
 *
 * Calea implicita e `../arca-app/data` (fratele acestui folder in repo). Pentru
 * o instalare in care cele doua aplicatii stau in locuri diferite, seteaza
 * variabila de mediu `ARCA_DATA_DIR` cu calea absoluta catre directorul `data`.
 */
import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { EvenimentCauza, ProiectRecord } from "./management";

export type Parametru = {
  parametru: string;
  valoare: number;
  observatii: string;
};

/**
 * Segmentele caii implicite, tinute intr-o variabila si nu scrise direct in
 * `path.join(...)`: o cale literala care iese din proiect (`..`) il face pe
 * Turbopack sa traseze tot repo-ul in bundle-ul de deploy. Directorul e citit
 * oricum abia la runtime, deci nu trebuie analizat la build.
 */
const SEGMENTE_IMPLICITE = ["..", "arca-app", "data"].join("/");

/** Directorul de date al aplicatiei Flask. */
export function directorDate(): string {
  return process.env.ARCA_DATA_DIR ?? path.resolve(process.cwd(), SEGMENTE_IMPLICITE);
}

/**
 * Citeste toate fisierele `.json` dintr-o colectie (un subdirector din `data/`).
 *
 * Oglindeste `storage._listeaza` din Python, inclusiv sortarea descrescatoare
 * dupa `creat_la`, ca ordinea din dashboard sa fie aceeasi cu cea din Flask.
 * Un director inexistent inseamna "nimic salvat inca", nu o eroare.
 */
async function citesteColectie<T>(colectie: string): Promise<T[]> {
  const director = path.join(directorDate(), colectie);

  let fisiere: string[];
  try {
    fisiere = await readdir(director);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const inregistrari = await Promise.all(
    fisiere
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(path.join(director, f), "utf8")) as T),
  );

  return inregistrari.sort((a, b) => {
    const creatA = (a as { creat_la?: string }).creat_la ?? "";
    const creatB = (b as { creat_la?: string }).creat_la ?? "";
    return creatB.localeCompare(creatA);
  });
}

/** Registrul de proiecte din modulul Management (`data/proiecte_management/`). */
export function citesteProiecte(): Promise<ProiectRecord[]> {
  return citesteColectie<ProiectRecord>("proiecte_management");
}

/** Jurnalul de cauze de intarziere (`data/evenimente_cauze/`). */
export function citesteEvenimenteCauze(): Promise<EvenimentCauza[]> {
  return citesteColectie<EvenimentCauza>("evenimente_cauze");
}

/**
 * Parametrii de calcul reali (TVA, pierderi tehnologice, adaos, praguri).
 * Spre deosebire de proiecte, acest fisier e versionat in repo si exista mereu.
 */
export async function citesteParametri(): Promise<Record<string, Parametru>> {
  try {
    const continut = await readFile(path.join(directorDate(), "parametri.json"), "utf8");
    return JSON.parse(continut) as Record<string, Parametru>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}
