import path from "node:path";

import type { NextConfig } from "next";

const radacina = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Repo-ul are doua package-lock.json (site-ul Lut & Lemn si aplicatia asta),
  // asa ca Turbopack nu poate deduce singur radacina proiectului.
  turbopack: { root: radacina },

  // Pagina citeste la runtime datele din `../arca-app/data`. Fara o radacina
  // fixa, tracer-ul urmareste calea in afara proiectului si ar impacheta tot
  // repo-ul in output-ul de build.
  //
  // Turbopack avertizeaza oricum ("unexpected file in NFT list") pentru ca vede
  // o operatie de fisier pe o cale calculata la rulare — exact ce vrem aici.
  // Avertismentul e o euristica, nu o problema reala: cu radacina fixata, zero
  // fisiere din afara acestui folder ajung in `page.js.nft.json`. Nu incerca sa
  // il stingi cu `outputFileTracingExcludes: ["../**/*"]` — Turbopack respinge
  // glob-urile care ies din radacina si build-ul crapa.
  outputFileTracingRoot: radacina,
};

export default nextConfig;
