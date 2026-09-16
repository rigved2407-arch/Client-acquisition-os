import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, ArrowUpRight, Bot, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3, Filter, LayoutDashboard, MessageSquareText, Plus, Send, Sparkles, Target, UserRound, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";

const stages = [
  { key: "new", label: "New", color: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  { key: "qualified", label: "Qualified", color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { key: "booked", label: "Booked", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { key: "won", label: "Won", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { key: "nurture", label: "Nurture", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function relativeTime(value: string | Date) {
  const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, refetch } = trpc.growth.overview.useQuery(undefined, { enabled: !!user });
  const qualify = trpc.growth.qualifyLead.useMutation();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [transcript, setTranscript] = useState("They want to grow from 3 to 10 clients per month, have a clear niche, and can invest this quarter. They asked how quickly we can help them build a repeatable pipeline.");
  const [qualification, setQualification] = useState<{ score: number; stage: string; summary: string; nextStep: string } | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", company: "", goal: "" });
  const createLead = trpc.growth.createLead.useMutation({ onSuccess: () => { toast.success("Lead added to your pipeline"); setShowAdd(false); setNewLead({ name: "", email: "", company: "", goal: "" }); refetch(); } });

  const filteredLeads = useMemo(() => (data?.leads ?? []).filter((lead) => `${lead.name} ${lead.email} ${lead.company ?? ""}`.toLowerCase().includes(query.toLowerCase())), [data?.leads, query]);
  const stats = data?.stats;

  if (authLoading || (user && isLoading)) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center text-slate-500">Loading workspace…</div>;

  if (!user) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-5"><div className="w-full max-w-md rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-8 text-center shadow-[0_12px_40px_rgba(45,65,42,0.08)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-semibold tracking-tight">CoachFlow workspace</h1><p className="mt-2 text-sm leading-relaxed text-[#718073]">Sign in to view your pipeline, lead activity, and qualification results.</p><Button onClick={() => startLogin()} className="mt-6 w-full rounded-xl bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">Sign in to continue</Button></div></div>;

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#172018]">
      <aside className="fixed inset-y-0 left-0 hidden w-[238px] flex-col border-r border-[#e2e7df] bg-[#fbfcf9] px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-3 mb-9">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-5 w-5" /></div>
          <div><p className="font-semibold tracking-tight">CoachFlow</p><p className="text-[10px] uppercase tracking-[0.18em] text-[#8a978b]">Acquisition OS</p></div>
        </div>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa49b]">Workspace</p>
        <nav className="space-y-1">
          <a className="flex items-center gap-3 rounded-xl bg-[#e8f3d8] px-3 py-2.5 text-sm font-medium text-[#173b2d]"><LayoutDashboard className="h-4 w-4" /> Overview</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6d786e] hover:bg-[#f0f3ed]"><Users className="h-4 w-4" /> Leads <span className="ml-auto rounded-full bg-[#eef1ea] px-2 py-0.5 text-[10px]">{stats?.totalLeads ?? 0}</span></a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6d786e] hover:bg-[#f0f3ed]"><Zap className="h-4 w-4" /> Automations <span className="ml-auto h-2 w-2 rounded-full bg-[#9fca4d]" /></a>
          <a href="/calendar" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6d786e] hover:bg-[#f0f3ed]"><CalendarDays className="h-4 w-4" /> Calendar</a>
        </nav>
        <p className="px-3 mb-2 mt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa49b]">Insights</p>
        <nav className="space-y-1">
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6d786e] hover:bg-[#f0f3ed]"><Activity className="h-4 w-4" /> Activity</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6d786e] hover:bg-[#f0f3ed]"><Target className="h-4 w-4" /> Playbooks</a>
        </nav>
        <div className="mt-auto rounded-2xl bg-[#173b2d] p-4 text-white">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d8f27f] text-[#173b2d]"><Bot className="h-4 w-4" /></div>
          <p className="text-sm font-medium">AI concierge is live</p><p className="mt-1 text-xs leading-relaxed text-[#c3d0c5]">Your qualification and follow-up sequences are running.</p>
          <button onClick={() => setShowAi(true)} className="mt-3 text-xs font-semibold text-[#d8f27f]">Test the assistant <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e2d3] text-xs font-semibold text-[#3b5743]">AM</div><div className="min-w-0"><p className="truncate text-xs font-medium">Alex Morgan</p><p className="truncate text-[10px] text-[#8a978b]">Owner workspace</p></div><ChevronDown className="ml-auto h-3.5 w-3.5 text-[#9aa49b]" /></div>
      </aside>

      <main className="lg:pl-[238px]">
        <header className="flex items-center justify-between border-b border-[#e2e7df] bg-[#fbfcf9]/80 px-5 py-4 backdrop-blur md:px-9">
          <div><p className="text-xs font-medium text-[#8a978b]">Wednesday, September 17, 2026</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Good morning, Alex <span className="text-[#9fca4d]">✦</span></h1></div>
          <div className="flex items-center gap-2"><button className="hidden rounded-lg border border-[#dfe5dc] px-3 py-2 text-xs font-medium text-[#5e6a60] md:block">Last 30 days <ChevronDown className="ml-1 inline h-3 w-3" /></button><Button onClick={() => setShowAdd(true)} className="rounded-lg bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]"><Plus className="mr-1.5 h-4 w-4" /> Add lead</Button></div>
        </header>

        <div className="px-5 py-7 md:px-9">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-medium text-[#708075]">Acquisition overview</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Your pipeline, at a glance.</h2></div><div className="flex items-center gap-2 text-xs text-[#718073]"><span className="h-2 w-2 rounded-full bg-[#9fca4d]" /> All systems operational <span className="ml-2 rounded-full bg-[#eef4e6] px-2 py-1 text-[#54713d]">{data?.usingDemo ? "Demo workspace" : "Live data"}</span></div></div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[{ label: "Total leads", value: stats?.totalLeads ?? 0, detail: "+18% vs last period", icon: Users, tone: "bg-[#e7f0f9] text-[#52799d]" }, { label: "Qualified", value: stats?.qualified ?? 0, detail: `${stats?.qualificationRate ?? 0}% qualification rate`, icon: Target, tone: "bg-[#eee8fb] text-[#8066aa]" }, { label: "Calls booked", value: stats?.booked ?? 0, detail: `${stats?.bookingRate ?? 0}% of qualified`, icon: CalendarDays, tone: "bg-[#fff1d9] text-[#ad7c30]" }, { label: "Pipeline value", value: `$${((stats?.pipelineValue ?? 0) / 1000).toFixed(1)}k`, detail: "+$4.5k this week", icon: CircleDollarSign, tone: "bg-[#e5f3dc] text-[#609048]" }].map((item) => <div key={item.label} className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-5 shadow-[0_3px_12px_rgba(45,65,42,0.03)]"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-[#7b887d]">{item.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p></div><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></div></div><p className="mt-4 text-[11px] font-medium text-[#6b9860]"><ArrowUpRight className="mr-1 inline h-3 w-3" />{item.detail}</p></div>)}
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-5 shadow-[0_3px_12px_rgba(45,65,42,0.03)]"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Pipeline flow</h3><p className="mt-1 text-xs text-[#849085]">How leads are moving through your funnel</p></div><button className="rounded-lg border border-[#e1e7df] p-2 text-[#7c897d]"><Filter className="h-3.5 w-3.5" /></button></div><div className="mt-6 space-y-4">{stages.slice(0, 4).map((stage) => { const count = data?.leads.filter((lead) => lead.stage === stage.key).length ?? 0; const percent = Math.max(10, Math.round((count / Math.max(data?.leads.length ?? 1, 1)) * 100)); return <div key={stage.key}><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><span className={`h-2 w-2 rounded-full ${stage.dot}`} />{stage.label}</span><span className="text-[#8a978b]">{count} leads <span className="ml-2 text-[#b2bab2]">{percent}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0ea]"><div className={`h-full rounded-full ${stage.dot} transition-all`} style={{ width: `${percent}%` }} /></div></div> })}</div><div className="mt-6 flex items-center gap-3 rounded-xl bg-[#f1f6eb] px-4 py-3 text-xs text-[#58714e]"><Sparkles className="h-4 w-4 text-[#90b848]" /><span><strong className="font-semibold">Small win:</strong> You are converting qualified leads to booked calls 12% better than last month.</span></div></div>
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#173b2d] p-5 text-white shadow-[0_3px_12px_rgba(23,59,45,0.12)]"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#bdcdbf]">Conversion pulse</p><h3 className="mt-1 text-lg font-semibold">Healthy momentum</h3></div><div className="rounded-lg bg-white/10 p-2 text-[#d8f27f]"><Activity className="h-4 w-4" /></div></div><div className="mt-8 flex items-end gap-1.5">{[30, 42, 34, 58, 45, 66, 72, 82, 68, 88, 80, 94].map((height, index) => <div key={index} className="flex-1 rounded-t bg-[#b3d65e]/70" style={{ height: `${height}px` }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-[#a7b9aa]"><span>Aug 21</span><span>Today</span></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-2xl font-semibold">4.8d</p><p className="mt-1 text-[10px] text-[#a7b9aa]">Avg. time to book</p></div><div><p className="text-2xl font-semibold">31%</p><p className="mt-1 text-[10px] text-[#a7b9aa]">Show-up rate lift</p></div></div></div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] shadow-[0_3px_12px_rgba(45,65,42,0.03)]"><div className="flex flex-col gap-3 border-b border-[#e8ece6] p-5 md:flex-row md:items-center md:justify-between"><div><h3 className="font-semibold">Recent leads</h3><p className="mt-1 text-xs text-[#849085]">Your highest-priority conversations</p></div><div className="flex items-center gap-2"><div className="relative"><MessageSquareText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#a1aba0]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads…" className="h-8 w-44 rounded-lg border-[#e1e7df] bg-white pl-8 text-xs" /></div><button className="rounded-lg border border-[#e1e7df] p-2 text-[#7c897d]"><Filter className="h-3.5 w-3.5" /></button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f7f9f5] text-[10px] uppercase tracking-[0.12em] text-[#9aa49b]"><tr><th className="px-5 py-3 font-medium">Lead</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Stage</th><th className="px-5 py-3 font-medium">Score</th><th className="px-5 py-3 font-medium">Activity</th></tr></thead><tbody>{filteredLeads.map((lead) => { const stage = stages.find((item) => item.key === lead.stage) ?? stages[0]; return <tr key={lead.id} className="border-t border-[#edf0eb] hover:bg-[#f8faf6]"><td className="whitespace-nowrap px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6eee1] text-[10px] font-semibold text-[#577252]">{initials(lead.name)}</div><div><p className="font-medium text-[#29382d]">{lead.name}</p><p className="mt-0.5 text-[10px] text-[#9aa49b]">{lead.company ?? lead.email}</p></div></div></td><td className="px-5 py-3.5 text-[#728073]">{lead.source}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${stage.color}`}>{stage.label}</span></td><td className="px-5 py-3.5"><span className={`font-semibold ${lead.score >= 85 ? "text-[#6c984d]" : "text-[#9b8454]"}`}>{lead.score}</span><span className="text-[#b0b8b0">/100</span></td><td className="whitespace-nowrap px-5 py-3.5 text-[#8b968c]">{relativeTime(lead.lastActivityAt)}</td></tr> })}</tbody></table></div></div>
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-5 shadow-[0_3px_12px_rgba(45,65,42,0.03)]"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Activity</h3><p className="mt-1 text-xs text-[#849085]">Latest system signals</p></div><button className="text-[11px] font-medium text-[#6d8e4e]">View all</button></div><div className="mt-5 space-y-5">{(data?.activities ?? []).slice(0, 4).map((item) => <div key={item.id} className="flex gap-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4e8] text-[#73955c]"><Check className="h-3.5 w-3.5" /></div><div><p className="text-xs font-medium leading-snug text-[#405043]">{item.title}</p><p className="mt-1 text-[10px] leading-relaxed text-[#89948a]">{item.description}</p><p className="mt-1.5 text-[10px] text-[#b0b8b0]">{relativeTime(item.createdAt)}</p></div></div>)}</div><div className="mt-6 border-t border-[#edf0eb] pt-4"><button onClick={() => setShowAi(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef5e2] py-2.5 text-xs font-semibold text-[#52703d] hover:bg-[#e5f0d6]"><Bot className="h-4 w-4" /> Run a qualification check</button></div></div>
          </section>
        </div>
      </main>

      <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent className="rounded-2xl border-[#dfe7da] bg-[#fbfcf9]"><DialogHeader><DialogTitle>Add a lead</DialogTitle><DialogDescription>Capture the context your AI concierge needs to follow up well.</DialogDescription></DialogHeader><div className="space-y-4 pt-2"><div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Name</Label><Input value={newLead.name} onChange={(event) => setNewLead({ ...newLead, name: event.target.value })} className="mt-1.5" placeholder="Taylor Reed" /></div><div><Label className="text-xs">Email</Label><Input value={newLead.email} onChange={(event) => setNewLead({ ...newLead, email: event.target.value })} className="mt-1.5" placeholder="taylor@example.com" /></div></div><div><Label className="text-xs">Company</Label><Input value={newLead.company} onChange={(event) => setNewLead({ ...newLead, company: event.target.value })} className="mt-1.5" placeholder="Reed Coaching" /></div><div><Label className="text-xs">Primary goal</Label><Textarea value={newLead.goal} onChange={(event) => setNewLead({ ...newLead, goal: event.target.value })} className="mt-1.5" placeholder="What are they trying to accomplish?" /></div><Button disabled={createLead.isPending} onClick={() => createLead.mutate(newLead)} className="w-full bg-[#173b2d] hover:bg-[#24533e]">{createLead.isPending ? "Adding…" : "Add to pipeline"}</Button></div></DialogContent></Dialog>
      <Dialog open={showAi} onOpenChange={setShowAi}><DialogContent className="rounded-2xl border-[#dfe7da] bg-[#fbfcf9]"><DialogHeader><DialogTitle className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf4d8] text-[#6d9646]"><Bot className="h-4 w-4" /></div> AI qualification check</DialogTitle><DialogDescription>Paste a conversation snippet or intake answer. The assistant returns a suggested stage and next step for review.</DialogDescription></DialogHeader><Textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className="min-h-32" /><Button disabled={qualify.isPending} onClick={() => qualify.mutate({ transcript }, { onSuccess: (result) => setQualification(result), onError: () => toast.error("Could not run qualification") })} className="bg-[#173b2d] hover:bg-[#24533e]"><Send className="mr-2 h-4 w-4" />{qualify.isPending ? "Analyzing…" : "Analyze lead"}</Button>{qualification && <div className="rounded-xl border border-[#dfe8d5] bg-[#f1f7e8] p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#719052]">Suggested qualification</p><span className="text-2xl font-semibold text-[#416d3b]">{qualification.score}<span className="text-xs font-normal text-[#78906a]"> / 100</span></span></div><p className="mt-3 text-sm font-medium text-[#3e533f]">{qualification.summary}</p><p className="mt-2 text-xs leading-relaxed text-[#718272]"><strong>Next step:</strong> {qualification.nextStep}</p></div>}</DialogContent></Dialog>
    </div>
  );
}
