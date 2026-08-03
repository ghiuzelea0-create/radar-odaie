"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingDown,
  Users,
  Wrench,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DateOfertare } from "@/lib/ofertare";
import type { DateDashboard, RandRegistru } from "@/lib/registru";

/** Aplicatia Flask care SCRIE datele; dashboard-ul acesta doar le citeste. */
const ARCA_APP_URL_CONFIGURAT = process.env.NEXT_PUBLIC_ARCA_APP_URL;
const ARCA_APP_PORT = process.env.NEXT_PUBLIC_ARCA_APP_PORT ?? "5000";

/**
 * Adresa aplicatiei Flask, din perspectiva dispozitivului care se uita la pagina.
 *
 * Nu putem folosi `localhost`: cand deschizi dashboardul de pe telefon,
 * `localhost` inseamna telefonul, nu calculatorul din hala, si toate link-urile
 * catre aplicatia Arca ar fi rupte. Asa ca refolosim gazda din bara de adrese
 * (acelasi calculator, alt port).
 *
 * Serverul nu are `window`, deci randeaza varianta `localhost`, iar browserul
 * o inlocuieste cu gazda reala. `useSyncExternalStore` e mecanismul React
 * pentru exact acest caz si trateaza corect hidratarea.
 */
// Adresa nu se schimba cat timp pagina e deschisa, deci nu avem la ce ne abona.
const faraAbonare = () => () => {};

// O adresa setata explicit la instalare are prioritate peste gazda din browser.
const urlInBrowser = () =>
  ARCA_APP_URL_CONFIGURAT ??
  `${window.location.protocol}//${window.location.hostname}:${ARCA_APP_PORT}`;

const urlPeServer = () => ARCA_APP_URL_CONFIGURAT ?? `http://localhost:${ARCA_APP_PORT}`;

function useArcaAppUrl(): string {
  return useSyncExternalStore(faraAbonare, urlInBrowser, urlPeServer);
}

const navigation: { label: string; icon: LucideIcon }[] = [
  { label: "Prezentare", icon: LayoutDashboard },
  { label: "Proiecte", icon: FolderKanban },
  { label: "Producție", icon: Wrench },
  { label: "Ofertare", icon: FileText },
  { label: "Aprovizionare", icon: PackageSearch },
  { label: "Calitate", icon: ClipboardCheck },
  { label: "Echipă", icon: Users },
  { label: "Rapoarte", icon: BarChart3 },
];

const sectionDescriptions: Record<string, string> = {
  Aprovizionare: "Comenzi de materiale si feronerie, termene de livrare furnizori.",
  Calitate: "Control de calitate pe faza si jurnalul de neconformitati.",
  Echipă: "Alocarea operatorilor pe proiecte si capacitatea disponibila.",
  Rapoarte: "Rapoarte financiare si operationale, exportabile pentru contabilitate.",
  Setări: "Parametrii de calcul (TVA, pierdere tehnologica, regie, adaos) se editeaza in pagina Parametri din aplicatia Arca.",
};

const lei = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 });
const procent = new Intl.NumberFormat("ro-RO", { style: "percent", maximumFractionDigits: 1 });
const zecimal = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });
/** Puncte procentuale — diferenta dintre doua procente, nu un procent in sine. */
const procentPp = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });

function dataScurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 place-items-center rounded-lg border border-wood/35 bg-wood/10">
        <div className="size-4 rotate-45 border-2 border-wood" />
      </div>
      <div>
        <div className="text-[15px] font-semibold tracking-[0.24em] text-foreground">ARCA</div>
        <div className="text-[9px] tracking-[0.26em] text-muted-foreground">INTERIORS</div>
      </div>
    </div>
  );
}

function SidebarNavigation({
  active,
  onNavigate,
  activeCount,
  devizeCount,
}: {
  active: string;
  onNavigate: (label: string) => void;
  activeCount: number;
  devizeCount: number;
}) {
  const insigne: Record<string, number> = { Proiecte: activeCount, Ofertare: devizeCount };
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-8 pt-6">
        <BrandMark />
      </div>
      <nav aria-label="Navigație principală" className="space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.label)}
              className={`group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--wood)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className={`size-4 ${isActive ? "text-wood" : "group-hover:text-wood"}`} />
              <span>{item.label}</span>
              {insigne[item.label] > 0 ? (
                <span className="ml-auto rounded-full bg-wood/15 px-1.5 py-0.5 text-[10px] font-medium text-wood">
                  {insigne[item.label]}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3">
        <Alert className="mb-3 border-wood/15 bg-wood/5 p-3">
          <Database className="size-4 text-wood" />
          <AlertTitle className="text-xs">Date din aplicația Arca</AlertTitle>
          <AlertDescription className="mt-1 text-[11px] leading-4">
            Registrul, fluxul și cauzele de întârziere sunt citite din modulul Management.
          </AlertDescription>
        </Alert>
        <button
          type="button"
          onClick={() => onNavigate("Setări")}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Settings className="size-4" />
          Setări
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent?: "bun" | "atentie";
}) {
  return (
    <Card className="group border-border/70 bg-card/80 shadow-none transition-colors hover:border-wood/30">
      {/* Pe telefon stau cate doua pe rand, deci sunt mai stranse: altfel cele
          patru casete umplu un ecran intreg si ascund registrul sub ele. */}
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between sm:mb-5">
          <div className="grid size-9 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground group-hover:text-wood">
            <Icon className="size-4" />
          </div>
          {accent ? (
            <Badge
              variant="outline"
              className={
                accent === "bun"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-300"
              }
            >
              {accent === "bun" ? <ArrowUpRight className="mr-1 size-3" /> : <TrendingDown className="mr-1 size-3" />}
              {accent === "bun" ? "în țintă" : "de urmărit"}
            </Badge>
          ) : null}
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-muted-foreground sm:text-xs">
          {title}
        </p>
        <p className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
}

/** Ce vede utilizatorul cand nu exista inca niciun proiect salvat. */
function StareGoala({ sursaDate, arcaAppUrl }: { sursaDate: string; arcaAppUrl: string }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-none">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div className="grid size-10 place-items-center rounded-lg border border-wood/25 bg-wood/10 text-wood">
          <Database className="size-5" />
        </div>
        <div>
          <CardTitle className="text-base">Nu există încă proiecte înregistrate</CardTitle>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Dashboard-ul citește registrul de proiecte direct din aplicația Arca. Adaugă primul proiect în modulul
            Management, apoi reîncarcă pagina — indicatorii, încărcarea pe faze și analiza cauzelor se calculează
            automat din datele reale.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="bg-wood text-stone-950 hover:bg-wood-bright">
            <a href={`${arcaAppUrl}/management/proiect/nou`} target="_blank" rel="noreferrer">
              <Plus className="size-4" />
              Adaugă un proiect
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`${arcaAppUrl}/management`} target="_blank" rel="noreferrer">
              Deschide modulul Management
            </a>
          </Button>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">Sursă date: {sursaDate}</p>
      </CardContent>
    </Card>
  );
}

function BadgeStadiu({ rand }: { rand: RandRegistru }) {
  if (!rand.activ) {
    const intarziat = (rand.zile_intarziere ?? 0) > 0;
    return (
      <Badge
        variant="outline"
        className={
          intarziat
            ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
        }
      >
        {intarziat ? `Livrat +${rand.zile_intarziere} z` : "Livrat la termen"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">
      {rand.faza_curenta || "În lucru"}
    </Badge>
  );
}

function TabelRegistru({ randuri, compact }: { randuri: RandRegistru[]; compact?: boolean }) {
  return (
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="h-11 pl-5 text-[11px] uppercase tracking-wider">Proiect</TableHead>
            <TableHead className="h-11 text-[11px] uppercase tracking-wider">Stadiu</TableHead>
            <TableHead className="hidden h-11 text-[11px] uppercase tracking-wider md:table-cell">Valoare</TableHead>
            <TableHead className="hidden h-11 text-[11px] uppercase tracking-wider md:table-cell">Termen</TableHead>
            {compact ? null : (
              <TableHead className="hidden h-11 pr-5 text-right text-[11px] uppercase tracking-wider lg:table-cell">
                Marjă (of. → real)
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {randuri.map((rand) => (
            <TableRow key={rand.id} className="group border-border/60">
              <TableCell className="min-w-44 py-4 pl-5 sm:min-w-64">
                <div className="font-medium text-foreground">{rand.denumire || "— fără denumire —"}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-[10px] text-wood">{rand.cod_proiect}</span>
                  <span>·</span>
                  <span>{rand.client}</span>
                </div>
              </TableCell>
              <TableCell className="min-w-28 pr-4 sm:min-w-36">
                <BadgeStadiu rand={rand} />
                {/* Progresul are sens doar cat proiectul e in lucru: la unul livrat,
                    un jurnal de flux necompletat ar arata 0% langa "Livrat". */}
                {rand.activ ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={rand.progres} className="h-1 w-20 bg-muted [&>div]:bg-wood" />
                    <span className="font-mono text-[10px] text-muted-foreground">{rand.progres}%</span>
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-sm font-medium md:table-cell">
                {lei.format(rand.valoare_fara_tva)}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap md:table-cell">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {dataScurta(rand.termen_realizat ?? rand.termen_promis)}
                </div>
              </TableCell>
              {compact ? null : (
                <TableCell className="hidden whitespace-nowrap pr-5 text-right text-sm lg:table-cell">
                  <span className="text-muted-foreground">{procent.format(rand.marja_ofertata)}</span>
                  {rand.marja_realizata !== null ? (
                    <>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className={rand.delta_marja !== null && rand.delta_marja < 0 ? "text-amber-300" : "text-emerald-300"}>
                        {procent.format(rand.marja_realizata)}
                      </span>
                    </>
                  ) : (
                    <span className="ml-1 text-[11px] text-muted-foreground">· în curs</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {randuri.length === 0 ? (
            <TableRow>
              <TableCell colSpan={compact ? 4 : 5} className="h-32 text-center text-sm text-muted-foreground">
                Nu am găsit proiecte pentru filtrul selectat.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function CardIncarcare({ date }: { date: DateDashboard }) {
  const totalOre = date.incarcare.reduce((t, f) => t + f.ore, 0);
  const areOre = totalOre > 0;

  return (
    <Card className="border-border/70 bg-card/80 shadow-none">
      <CardHeader className="flex-row items-center justify-between p-5 pb-3">
        <div>
          <CardTitle className="text-base">Încărcare pe faze</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Proiecte active, ore de manoperă planificate</p>
        </div>
        {areOre ? (
          <Badge variant="outline" className="border-wood/20 bg-wood/10 text-wood">
            {zecimal.format(totalOre)} h
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-2">
        {areOre ? (
          date.incarcare.map((faza) => (
            <div key={faza.faza}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-foreground">{faza.faza}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {zecimal.format(faza.ore)} h
                  {faza.proiecte_in_faza > 0 ? ` · ${faza.proiecte_in_faza} proiecte` : ""}
                </span>
              </div>
              <Progress value={faza.pondere} className="h-1.5 bg-muted [&>div]:bg-wood" />
            </div>
          ))
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Orele pe faze apar după ce rulezi calculatorul de termen realist pentru un proiect activ, în modulul
            Management. Fără ele nu putem estima încărcarea fără să inventăm cifre.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CardCauze({ date }: { date: DateDashboard }) {
  const areCauze = date.totalZilePierdute > 0;

  return (
    <Card className="border-border/70 bg-card/80 shadow-none">
      <CardHeader className="flex-row items-center justify-between p-5 pb-3">
        <div>
          <CardTitle className="text-base">Unde pierzi zile</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Analiză Pareto, toate proiectele</p>
        </div>
        {areCauze ? (
          <Badge variant="outline" className="border-amber-400/20 bg-amber-400/10 text-amber-300">
            {zecimal.format(date.totalZilePierdute)} zile
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-2">
        {areCauze ? (
          date.top3Cauze.map((cauza, i) =>
            cauza ? (
              <div key={cauza.cod} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-wood/10 font-mono text-[10px] text-wood">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-4">{cauza.denumire}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {zecimal.format(cauza.zile_pierdute)} zile · {procent.format(cauza.procent)} din total ·{" "}
                    {cauza.categorie}
                  </p>
                </div>
              </div>
            ) : null,
          )
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Nu sunt înregistrate cauze de întârziere. Jurnalul se completează pe pagina fiecărui proiect din modulul
            Management.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SectiuneaOfertare({ ofertare, arcaAppUrl }: { ofertare: DateOfertare; arcaAppUrl: string }) {
  if (ofertare.devize.length === 0) {
    return (
      <Card className="border-border/70 bg-card/80 shadow-none">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div className="grid size-10 place-items-center rounded-lg border border-wood/25 bg-wood/10 text-wood">
            <FileText className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Niciun deviz calculat încă</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Devizele se calculează în modulul Costing &amp; Ofertare din aplicația Arca. După primul deviz salvat,
              aici apar valoarea ofertată, costul și marja fiecăruia.
            </p>
          </div>
          <Button asChild className="bg-wood text-stone-950 hover:bg-wood-bright">
            <a href={`${arcaAppUrl}/deviz/nou`} target="_blank" rel="noreferrer">
              <Plus className="size-4" />
              Deviz nou
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const a = ofertare.analiza;

  return (
    <div className="grid gap-6">
      <section aria-label="Indicatori ofertare" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          title="Total ofertat"
          value={lei.format(ofertare.total_ofertat_fara_tva)}
          detail={`${ofertare.devize.length} ${ofertare.devize.length === 1 ? "deviz" : "devize"}, fără TVA`}
          icon={CircleDollarSign}
        />
        <MetricCard
          title="Marjă brută totală"
          value={lei.format(ofertare.marja_totala_ron)}
          detail={a ? `${procent.format(a.marja_rezultata)} din valoare` : "—"}
          icon={BarChart3}
          accent={a && !a.atinge_tinta ? "atentie" : undefined}
        />
        <MetricCard
          title="Adaos configurat"
          value={a ? procent.format(a.adaos) : "—"}
          detail={a ? `dă o marjă de ${procent.format(a.marja_rezultata)}` : "—"}
          icon={Gauge}
        />
        <MetricCard
          title="Devize fără proiect"
          value={String(ofertare.nelegate)}
          detail={ofertare.nelegate > 0 ? "codul nu e în registru" : "toate legate de registru"}
          icon={FolderKanban}
          accent={ofertare.nelegate > 0 ? "atentie" : undefined}
        />
      </section>

      {a && !a.atinge_tinta ? (
        <Alert className="border-amber-400/20 bg-amber-400/10">
          <AlertTriangle className="size-4 text-amber-400" />
          <AlertTitle className="text-sm">Adaosul nu îți atinge marja țintă</AlertTitle>
          <AlertDescription className="text-xs leading-5">
            Un adaos de {procent.format(a.adaos)} aplicat pe cost nu dă o marjă de {procent.format(a.adaos)}. Cu
            rezerva de risc de {procent.format(a.rezerva)}, marja care rezultă este{" "}
            <strong className="text-foreground">{procent.format(a.marja_rezultata)}</strong> — cu{" "}
            {procentPp.format(a.diferenta * 100)} pp sub ținta setată de {procent.format(a.tinta)}. Pentru a atinge
            ținta, adaosul ar trebui să fie{" "}
            <strong className="text-foreground">{procent.format(a.adaos_necesar)}</strong>.
            <br />
            Se aplică tuturor devizelor deodată: marja nu depinde de mărimea devizului, ci doar de acești parametri.
            Se modifică în{" "}
            <a
              href={`${arcaAppUrl}/parametri`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              pagina Parametri
            </a>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="min-w-0 border-border/70 bg-card/80 shadow-none">
        <CardHeader className="gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Devize calculate</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Din modulul Costing &amp; Ofertare</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`${arcaAppUrl}/deviz/nou`} target="_blank" rel="noreferrer">
              <Plus className="size-3.5" />
              Deviz nou
            </a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className="h-11 pl-5 text-[11px] uppercase tracking-wider">Deviz</TableHead>
                  <TableHead className="h-11 text-right text-[11px] uppercase tracking-wider">Preț fără TVA</TableHead>
                  <TableHead className="hidden h-11 text-right text-[11px] uppercase tracking-wider md:table-cell">
                    Cost
                  </TableHead>
                  <TableHead className="h-11 pr-5 text-right text-[11px] uppercase tracking-wider">Marjă</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ofertare.devize.map((d) => (
                  <TableRow key={d.id} className="border-border/60">
                    <TableCell className="min-w-44 py-4 pl-5 sm:min-w-64">
                      <div className="font-medium text-foreground">{d.client}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[10px] text-wood">{d.proiect || "— fără cod —"}</span>
                        <span>·</span>
                        <span>{dataScurta(d.data)}</span>
                        {!d.legat_de_proiect ? (
                          <Badge
                            variant="outline"
                            className="border-amber-400/20 bg-amber-400/10 text-[10px] text-amber-300"
                          >
                            fără proiect în registru
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      {lei.format(d.pret_fara_tva)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right text-sm text-muted-foreground md:table-cell">
                      {lei.format(d.cost_total)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap pr-5 text-right">
                      <div className="text-sm font-medium">{procent.format(d.marja_pct)}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{lei.format(d.marja_ron)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {ofertare.nelegate > 0 ? (
            <div className="border-t border-border/70 px-5 py-3 text-xs leading-5 text-muted-foreground">
              {ofertare.nelegate}{" "}
              {ofertare.nelegate === 1 ? "deviz are un cod de proiect care nu apare" : "devize au coduri care nu apar"}{" "}
              în registrul de proiecte. Câmpul „proiect” din deviz e text liber — scrie acolo exact codul din registru
              ca să le poți urmări împreună.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard({ date, ofertare }: { date: DateDashboard; ofertare: DateOfertare }) {
  const [activeSection, setActiveSection] = useState("Prezentare");
  const [search, setSearch] = useState("");
  const [filtru, setFiltru] = useState("Toate");
  const [meniuDeschis, setMeniuDeschis] = useState(false);
  const arcaAppUrl = useArcaAppUrl();

  const active = useMemo(() => date.registru.filter((r) => r.activ), [date.registru]);
  const areDate = date.registru.length > 0;

  const vizibile = useMemo(() => {
    return date.registru.filter((rand) => {
      const text = `${rand.client} ${rand.denumire} ${rand.cod_proiect}`.toLocaleLowerCase("ro");
      const potrivireText = text.includes(search.toLocaleLowerCase("ro"));
      const potrivireFiltru =
        filtru === "Toate" || (filtru === "Active" ? rand.activ : !rand.activ);
      return potrivireText && potrivireFiltru;
    });
  }, [date.registru, filtru, search]);

  // Datele sunt `YYYY-MM-DD`, deci comparatia lexicografica e si cronologica.
  const inIntarziere = active.filter((r) => r.termen_promis < date.azi);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarNavigation active={activeSection} onNavigate={setActiveSection} activeCount={active.length} devizeCount={ofertare.devize.length} />
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          {/* Pe telefon meniul e un sertar peste toata pagina, deci trebuie sa se
              inchida singur dupa ce alegi o sectiune — altfel acopera exact
              continutul pe care tocmai l-ai cerut. */}
          <Sheet open={meniuDeschis} onOpenChange={setMeniuDeschis}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden" aria-label="Deschide meniul">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Meniu principal</SheetTitle>
              <SidebarNavigation
                active={activeSection}
                onNavigate={(sectiune) => {
                  setActiveSection(sectiune);
                  setMeniuDeschis(false);
                }}
                activeCount={active.length}
                devizeCount={ofertare.devize.length}
              />
            </SheetContent>
          </Sheet>

          <div className="relative hidden w-full max-w-md sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 border-border bg-muted/35 pl-9 text-sm"
              placeholder="Caută proiect, client sau cod..."
              aria-label="Caută proiect"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.1)]" />
              Date live din Arca
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Proiecte peste termen">
                  <Bell className="size-4" />
                  {inIntarziere.length > 0 ? (
                    <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-400" />
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {inIntarziere.length > 0
                  ? `${inIntarziere.length} proiecte active au depășit termenul promis`
                  : "Niciun proiect activ peste termen"}
              </TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2">
                  <Avatar className="size-7 border border-wood/30">
                    <AvatarFallback className="bg-wood/15 text-xs font-semibold text-wood">VG</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-medium leading-none">Valentin</span>
                    <span className="mt-1 block text-[10px] leading-none text-muted-foreground">Administrator</span>
                  </span>
                  <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Contul meu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={`${arcaAppUrl}/parametri`} target="_blank" rel="noreferrer">
                    Parametri de calcul
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`${arcaAppUrl}/management/proceduri`} target="_blank" rel="noreferrer">
                    Procedura de flux
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <section className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-wood">
                <span className="h-px w-5 bg-wood" />
                {activeSection}
              </div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Bună ziua, Valentin.</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {areDate
                  ? `Ai ${active.length} ${active.length === 1 ? "proiect activ" : "proiecte active"} din ${date.registru.length} în registru.`
                  : "Registrul de proiecte este gol. Adaugă primul proiect în aplicația Arca."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setActiveSection("Producție")}>
                <Gauge className="size-4" />
                Vezi producția
              </Button>
              <Button asChild className="bg-wood text-stone-950 hover:bg-wood-bright">
                <a href={`${arcaAppUrl}/management/proiect/nou`} target="_blank" rel="noreferrer">
                  <Plus className="size-4" />
                  Proiect nou
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </section>

          {/* Devizele se calculeaza independent de registrul de proiecte, asa ca
              Ofertare ramane accesibila chiar daca registrul e inca gol. */}
          {!areDate && activeSection !== "Ofertare" ? (
            <StareGoala sursaDate={date.sursaDate} arcaAppUrl={arcaAppUrl} />
          ) : activeSection === "Prezentare" ? (
            <>
              <section aria-label="Indicatori principali" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  title="Valoare în lucru"
                  value={lei.format(date.valoareActivaTotal)}
                  detail={`${active.length} ${active.length === 1 ? "proiect activ" : "proiecte active"}, fără TVA`}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  title="Marjă ofertată medie"
                  value={procent.format(date.kpi.marja_ofertata_medie)}
                  detail={
                    date.kpi.marja_realizata_medie > 0
                      ? `realizat: ${procent.format(date.kpi.marja_realizata_medie)}`
                      : "fără proiecte închise încă"
                  }
                  icon={BarChart3}
                  accent={date.kpi.erodare_marja_medie < 0 ? "atentie" : undefined}
                />
                <MetricCard
                  title="Livrate la termen"
                  value={
                    date.kpi.proiecte_livrate > 0 ? procent.format(date.kpi.procent_livrate_la_termen) : "—"
                  }
                  detail={
                    date.kpi.proiecte_livrate > 0
                      ? `${date.kpi.livrate_la_termen} din ${date.kpi.proiecte_livrate} livrate`
                      : "niciun proiect livrat încă"
                  }
                  icon={FolderKanban}
                  accent={date.kpi.proiecte_livrate > 0 && date.kpi.procent_livrate_la_termen >= 0.8 ? "bun" : undefined}
                />
                <MetricCard
                  title="Lead time mediu"
                  value={
                    date.kpi.proiecte_livrate > 0 ? `${zecimal.format(date.kpi.lead_time_mediu_zile)} zile` : "—"
                  }
                  detail={
                    date.kpi.zile_pierdute_cumulat > 0
                      ? `${zecimal.format(date.kpi.zile_pierdute_cumulat)} zile pierdute cumulat`
                      : "de la comandă la livrare"
                  }
                  icon={Boxes}
                />
              </section>

              {date.kpi.erodare_marja_medie < 0 ? (
                <Alert className="mt-6 border-amber-400/20 bg-amber-400/10">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <AlertTitle className="text-sm">Erodare de marjă</AlertTitle>
                  <AlertDescription className="text-xs">
                    Marja realizată este în medie cu {procent.format(Math.abs(date.kpi.erodare_marja_medie))} sub cea
                    ofertată. Fie modelul de cost e prea optimist, fie se pierd bani în execuție.
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
                <Card className="min-w-0 self-start border-border/70 bg-card/80 shadow-none">
                  <CardHeader className="gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">Registru de proiecte</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Din modulul Management</p>
                    </div>
                    <Tabs value={filtru} onValueChange={setFiltru}>
                      <TabsList className="h-8 bg-muted/50">
                        <TabsTrigger value="Toate" className="px-3 text-xs">Toate</TabsTrigger>
                        <TabsTrigger value="Active" className="px-3 text-xs">Active</TabsTrigger>
                        <TabsTrigger value="Livrate" className="px-3 text-xs">Livrate</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent className="p-0">
                    <TabelRegistru randuri={vizibile} compact />
                    <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
                      <span className="text-xs text-muted-foreground">
                        {vizibile.length} din {date.registru.length} proiecte
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-wood"
                        onClick={() => setActiveSection("Proiecte")}
                      >
                        Vezi registrul complet
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid content-start gap-6">
                  <CardIncarcare date={date} />
                  <CardCauze date={date} />
                </div>
              </section>
            </>
          ) : activeSection === "Proiecte" ? (
            <Card className="border-border/70 bg-card/80 shadow-none">
              <CardHeader className="gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Registru de proiecte</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Termen, valoare și marjă ofertată față de cea realizată
                  </p>
                </div>
                <Tabs value={filtru} onValueChange={setFiltru}>
                  <TabsList className="h-8 bg-muted/50">
                    <TabsTrigger value="Toate" className="px-3 text-xs">Toate</TabsTrigger>
                    <TabsTrigger value="Active" className="px-3 text-xs">Active</TabsTrigger>
                    <TabsTrigger value="Livrate" className="px-3 text-xs">Livrate</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <TabelRegistru randuri={vizibile} />
                <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
                  <span className="text-xs text-muted-foreground">
                    {vizibile.length} din {date.registru.length} proiecte
                  </span>
                  {date.kpi.proiecte_livrate > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Întârziere medie: {zecimal.format(date.kpi.intarziere_medie_zile)} zile
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : activeSection === "Producție" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="grid content-start gap-6">
                <CardIncarcare date={date} />
                <Card className="border-border/70 bg-card/80 shadow-none">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-base">Proiecte active pe faze</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Faza curentă declarată în registru</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/70 hover:bg-transparent">
                          <TableHead className="h-11 pl-5 text-[11px] uppercase tracking-wider">Proiect</TableHead>
                          <TableHead className="h-11 text-[11px] uppercase tracking-wider">Fază curentă</TableHead>
                          <TableHead className="hidden h-11 pr-5 text-right text-[11px] uppercase tracking-wider sm:table-cell">
                            Termen promis
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {active.map((rand) => {
                          const depasit = rand.termen_promis < date.azi;
                          return (
                            <TableRow key={rand.id} className="border-border/60">
                              <TableCell className="py-4 pl-5">
                                <div className="text-sm font-medium">{rand.denumire || "— fără denumire —"}</div>
                                <div className="mt-1 font-mono text-[10px] text-wood">{rand.cod_proiect}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">
                                  {rand.faza_curenta || "nedeclarată"}
                                </Badge>
                                {rand.verdict_termen ? (
                                  <div className="mt-1.5 text-[11px] text-muted-foreground">{rand.verdict_termen}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="hidden pr-5 text-right sm:table-cell">
                                <span className={`text-sm ${depasit ? "text-amber-300" : "text-muted-foreground"}`}>
                                  {dataScurta(rand.termen_promis)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {active.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                              Niciun proiect activ — totul e livrat.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="grid content-start gap-6">
                <CardCauze date={date} />
                {inIntarziere.length > 0 ? (
                  <Card className="border-amber-400/20 bg-amber-400/5 shadow-none">
                    <CardHeader className="flex-row items-center gap-2 p-5 pb-3">
                      <Clock3 className="size-4 text-amber-300" />
                      <CardTitle className="text-base text-amber-200">Peste termenul promis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-2">
                      {inIntarziere.map((rand) => (
                        <div key={rand.id} className="text-xs">
                          <p className="font-medium">{rand.denumire || rand.cod_proiect}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {rand.client} · termen promis {dataScurta(rand.termen_promis)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : activeSection === "Ofertare" ? (
            <SectiuneaOfertare ofertare={ofertare} arcaAppUrl={arcaAppUrl} />
          ) : (
            <Card className="border-border/70 bg-card/80 shadow-none">
              <CardContent className="flex flex-col items-start gap-3 p-8">
                <div className="grid size-10 place-items-center rounded-lg border border-wood/25 bg-wood/10 text-wood">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle className="text-base">Secțiunea „{activeSection}” este în pregătire</CardTitle>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {sectionDescriptions[activeSection] ?? "Acest modul urmează să fie conectat la datele reale."}
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveSection("Prezentare")}>
                  Înapoi la Prezentare
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
