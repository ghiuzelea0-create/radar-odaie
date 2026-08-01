"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
};

type Project = {
  id: string;
  client: string;
  project: string;
  value: string;
  deadline: string;
  status: "Ofertare" | "Proiectare" | "Producție" | "Montaj";
  progress: number;
};

const navigation: NavigationItem[] = [
  { label: "Prezentare", icon: LayoutDashboard },
  { label: "Proiecte", icon: FolderKanban },
  { label: "Ofertare", icon: FileText },
  { label: "Producție", icon: Wrench },
  { label: "Aprovizionare", icon: PackageSearch },
  { label: "Calitate", icon: ClipboardCheck },
  { label: "Echipă", icon: Users },
  { label: "Rapoarte", icon: BarChart3 },
];

const projects: Project[] = [
  {
    id: "ARC-0261",
    client: "Residence Sibiu",
    project: "Mobilier 37 apartamente",
    value: "286.400 lei",
    deadline: "18 aug.",
    status: "Producție",
    progress: 68,
  },
  {
    id: "ARC-0268",
    client: "Familia Dumitru",
    project: "Vila Murighiol — mobilier complet",
    value: "74.800 lei",
    deadline: "24 aug.",
    status: "Proiectare",
    progress: 34,
  },
  {
    id: "ARC-0272",
    client: "Hotel Danube",
    project: "Recepție, bar și placări",
    value: "96.200 lei",
    deadline: "2 sept.",
    status: "Ofertare",
    progress: 12,
  },
  {
    id: "ARC-0254",
    client: "Studio Nord",
    project: "Apartament premium Constanța",
    value: "51.200 lei",
    deadline: "12 aug.",
    status: "Montaj",
    progress: 91,
  },
];

const statusStyles: Record<Project["status"], string> = {
  Ofertare: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  Proiectare: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  Producție: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  Montaj: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

type ProductionStage = {
  label: string;
  value: number;
  hours: string;
};

const productionLoad: ProductionStage[] = [
  { label: "Debitare & CNC", value: 86, hours: "34 h" },
  { label: "Căntuire", value: 72, hours: "28 h" },
  { label: "Vopsitorie MDF", value: 94, hours: "41 h" },
  { label: "Metal", value: 61, hours: "22 h" },
  { label: "Montaj preliminar", value: 74, hours: "30 h" },
];

const projectTypeLabels: Record<string, string> = {
  kitchen: "Bucătărie",
  "full-home": "Mobilier casă completă",
  commercial: "Spațiu comercial",
  custom: "Piesă personalizată",
};

const sectionDescriptions: Record<string, string> = {
  Proiecte: "Vezi toate proiectele active, arhivate și registrul complet de comenzi.",
  Producție: "Încărcarea utilajelor și echipelor, faze de flux și blocaje curente.",
  Aprovizionare: "Comenzi de materiale și feronerie, termene de livrare furnizori.",
  Calitate: "Control de calitate pe fază și jurnalul de neconformități.",
  Echipă: "Alocarea operatorilor pe proiecte și capacitatea disponibilă.",
  Rapoarte: "Rapoarte financiare și operaționale, exportabile pentru contabilitate.",
  Setări: "Parametrii aplicației: pierdere tehnologică, regie, adaos comercial, rezervă de risc.",
};

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
}: {
  active: string;
  onNavigate: (label: string) => void;
}) {
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
              {item.label === "Ofertare" ? (
                <span className="ml-auto rounded-full bg-wood/15 px-1.5 py-0.5 text-[10px] font-medium text-wood">4</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3">
        <Alert className="mb-3 border-wood/15 bg-wood/5 p-3">
          <Sparkles className="size-4 text-wood" />
          <AlertTitle className="text-xs">Asistent Arca AI</AlertTitle>
          <AlertDescription className="mt-1 text-[11px] leading-4">
            Poate pregăti devizul și verifica marja proiectului.
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
  trend,
  direction,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  trend: string;
  direction: "up" | "down";
  detail: string;
  icon: LucideIcon;
}) {
  const TrendIcon = direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="group border-border/70 bg-card/80 shadow-none transition-colors hover:border-wood/30">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div className="grid size-9 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground group-hover:text-wood">
            <Icon className="size-4" />
          </div>
          <Badge
            variant="outline"
            className={
              direction === "up"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-300"
            }
          >
            <TrendIcon className="mr-1 size-3" />
            {trend}
          </Badge>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QuoteDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: Project) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-wood text-stone-950 hover:bg-wood-bright">
          <Plus className="size-4" />
          Ofertă nouă
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-popover sm:max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const client = String(data.get("client") ?? "").trim();
            const projectType = String(data.get("project") ?? "");
            const budget = String(data.get("budget") ?? "").trim();

            if (!client || !projectType) {
              return;
            }

            onCreate({
              id: `ARC-${Math.floor(1000 + Math.random() * 9000)}`,
              client,
              project: projectTypeLabels[projectType] ?? projectType,
              value: budget || "De estimat",
              deadline: "De stabilit",
              status: "Ofertare",
              progress: 0,
            });
            event.currentTarget.reset();
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Deschide o ofertă nouă</DialogTitle>
            <DialogDescription>
              Introdu datele de bază. Materialele, consumurile și manopera vor fi detaliate în pasul următor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="client">Client</Label>
              <Input id="client" name="client" placeholder="Nume client sau companie" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project">Tip proiect</Label>
                <Select name="project" required>
                  <SelectTrigger id="project" className="w-full">
                    <SelectValue placeholder="Alege tipul" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(projectTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="budget">Buget estimat</Label>
                <Input id="budget" name="budget" placeholder="ex. 45.000 lei" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Cerințe principale</Label>
              <Textarea id="notes" name="notes" placeholder="Materiale, dimensiuni, termen dorit..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anulează
            </Button>
            <Button type="submit" className="bg-wood text-stone-950 hover:bg-wood-bright">
              Creează oferta
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [activeSection, setActiveSection] = useState("Prezentare");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Toate");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [lastCreatedClient, setLastCreatedClient] = useState<string | null>(null);

  const handleCreateProject = (project: Project) => {
    setProjectList((current) => [project, ...current]);
    setLastCreatedClient(project.client);
    setActiveSection("Prezentare");
    setStatusFilter("Toate");
  };

  const visibleProjects = projectList.filter((project) => {
    const matchesSearch = `${project.client} ${project.project} ${project.id}`
      .toLocaleLowerCase("ro")
      .includes(search.toLocaleLowerCase("ro"));
    const matchesStatus = statusFilter === "Toate" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarNavigation active={activeSection} onNavigate={setActiveSection} />
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden" aria-label="Deschide meniul">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Meniu principal</SheetTitle>
              <SidebarNavigation active={activeSection} onNavigate={setActiveSection} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden w-full max-w-md sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 border-border bg-muted/35 pl-9 pr-16 text-sm"
              placeholder="Caută proiect, client sau cod..."
              aria-label="Caută proiect"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘ K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.1)]" />
              Fabrica online
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notificări">
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-wood" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3 notificări noi</TooltipContent>
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Contul meu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Preferințe</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Deconectare</DropdownMenuItem>
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
                Ai {projectList.length} proiecte active. Trei sunt în producție, iar două necesită o decizie astăzi.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setActiveSection("Producție")}>
                <Gauge className="size-4" />
                Vezi producția
              </Button>
              <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} onCreate={handleCreateProject} />
            </div>
          </section>

          {lastCreatedClient ? (
            <Alert className="mb-6 border-emerald-400/20 bg-emerald-400/10">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <AlertTitle className="text-sm">Ofertă creată</AlertTitle>
              <AlertDescription className="text-xs">
                Oferta pentru {lastCreatedClient} a fost adăugată în „Proiecte în lucru”, stadiul Ofertare.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setLastCreatedClient(null)}
                >
                  Ascunde
                </button>
              </AlertDescription>
            </Alert>
          ) : null}

          {activeSection !== "Prezentare" ? (
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
          ) : (
            <>
          <section aria-label="Indicatori principali" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Venit contractat"
              value="482.600 lei"
              trend="12,4%"
              direction="up"
              detail="față de luna trecută"
              icon={CircleDollarSign}
            />
            <MetricCard
              title="Marjă brută"
              value="34,8%"
              trend="2,8 pp"
              direction="up"
              detail="țintă setată: 32%"
              icon={BarChart3}
            />
            <MetricCard
              title="Proiecte active"
              value={String(projectList.length)}
              trend="2 noi"
              direction="up"
              detail="3 aflate în producție"
              icon={FolderKanban}
            />
            <MetricCard
              title="Capacitate fabrică"
              value="78%"
              trend="6%"
              direction="down"
              detail="22% disponibil săptămâna viitoare"
              icon={Boxes}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
            <Card className="min-w-0 self-start border-border/70 bg-card/80 shadow-none">
              <CardHeader className="gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Proiecte în lucru</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Actualizate astăzi, 13:42</p>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className="h-8 bg-muted/50">
                    <TabsTrigger value="Toate" className="px-3 text-xs">Toate</TabsTrigger>
                    <TabsTrigger value="Producție" className="px-3 text-xs">Producție</TabsTrigger>
                    <TabsTrigger value="Montaj" className="px-3 text-xs">Montaj</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/70 hover:bg-transparent">
                        <TableHead className="h-11 pl-5 text-[11px] uppercase tracking-wider">Proiect</TableHead>
                        <TableHead className="h-11 text-[11px] uppercase tracking-wider">Stadiu</TableHead>
                        <TableHead className="hidden h-11 text-[11px] uppercase tracking-wider md:table-cell">Valoare</TableHead>
                        <TableHead className="hidden h-11 text-[11px] uppercase tracking-wider md:table-cell">Termen</TableHead>
                        <TableHead className="hidden h-11 pr-5 text-right sm:table-cell"><span className="sr-only">Acțiuni</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleProjects.map((project) => (
                        <TableRow key={project.id} className="group border-border/60">
                          <TableCell className="min-w-44 py-4 pl-5 sm:min-w-64">
                            <div className="font-medium text-foreground">{project.project}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono text-[10px] text-wood">{project.id}</span>
                              <span>·</span>
                              <span>{project.client}</span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-28 pr-4 sm:min-w-36">
                            <Badge variant="outline" className={statusStyles[project.status]}>{project.status}</Badge>
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={project.progress} className="h-1 w-20 bg-muted [&>div]:bg-wood" />
                              <span className="font-mono text-[10px] text-muted-foreground">{project.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm font-medium md:table-cell">{project.value}</TableCell>
                          <TableCell className="hidden whitespace-nowrap md:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <CalendarDays className="size-3.5" />
                              {project.deadline}
                            </div>
                          </TableCell>
                          <TableCell className="hidden pr-5 text-right sm:table-cell">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" aria-label={`Acțiuni pentru ${project.project}`}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Deschide proiectul</DropdownMenuItem>
                                <DropdownMenuItem>Vezi devizul</DropdownMenuItem>
                                <DropdownMenuItem>Actualizează stadiul</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                            Nu am găsit proiecte pentru filtrul selectat.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="flex items-center justify-between border-t border-border/70 px-5 py-3">
                  <span className="text-xs text-muted-foreground">
                    {visibleProjects.length} din {projectList.length} proiecte active
                  </span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-wood" onClick={() => setActiveSection("Proiecte")}>
                    Vezi toate proiectele
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid content-start gap-6">
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardHeader className="flex-row items-center justify-between p-5 pb-3">
                  <div>
                    <CardTitle className="text-base">Încărcare producție</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Săptămâna 32</p>
                  </div>
                  <Badge variant="outline" className="border-wood/20 bg-wood/10 text-wood">78%</Badge>
                </CardHeader>
                <CardContent className="space-y-4 p-5 pt-2">
                  {productionLoad.map((stage) => (
                    <div key={stage.label}>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-foreground">{stage.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{stage.hours}</span>
                      </div>
                      <Progress
                        value={stage.value}
                        className={`h-1.5 bg-muted ${stage.value >= 90 ? "[&>div]:bg-amber-400" : "[&>div]:bg-wood"}`}
                      />
                    </div>
                  ))}
                  <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-3">
                    <div className="flex gap-2">
                      <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-300" />
                      <div>
                        <p className="text-xs font-medium text-amber-200">Vopsitoria este aproape de limită</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Redistribuie 12 ore până miercuri pentru a proteja termenul Sibiu.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardHeader className="flex-row items-center justify-between p-5 pb-3">
                  <CardTitle className="text-base">Controlul zilei</CardTitle>
                  <BadgeCheck className="size-4 text-emerald-400" />
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-4">
                    <div className="grid size-8 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Comanda PAL Sibiu confirmată</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Recepție planificată · 4 aug.</p>
                    </div>
                    <div className="grid size-8 place-items-center rounded-full bg-wood/10 text-wood">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">2 devize așteaptă aprobarea</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Valoare totală · 147.400 lei</p>
                    </div>
                    <div className="grid size-8 place-items-center rounded-full bg-violet-400/10 text-violet-300">
                      <Users className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Ședință producție</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Astăzi · 15:30 · sala proiectare</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
