import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Bot, CalendarCheck2, Check, CheckCircle2, Clock3, Mail, MessageSquareText, Phone, Plus, Sparkles, Star, UserRound, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";

const stages = [
  { key: "new", label: "New", color: "bg-sky-100 text-sky-700" },
  { key: "qualified", label: "Qualified", color: "bg-violet-100 text-violet-700" },
  { key: "booked", label: "Booked", color: "bg-amber-100 text-amber-700" },
  { key: "won", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { key: "nurture", label: "Nurture", color: "bg-slate-100 text-slate-600" },
];

function relativeTime(value: string | Date) {
  const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function LeadDetail() {
  const params = useParams();
  const leadId = Number(params.id);
  const { user, loading: authLoading } = useAuth();
  const { data: lead, isLoading, refetch } = trpc.growth.lead.useQuery({ leadId }, { enabled: !!user && !!leadId });
  const updateStage = trpc.growth.updateStage.useMutation({ onSuccess: () => { toast.success("Stage updated"); refetch(); } });
  const addNote = trpc.growth.addNote.useMutation({ onSuccess: () => { toast.success("Note added"); setNoteContent(""); refetch(); } });
  const markWon = trpc.growth.markWon.useMutation({ onSuccess: () => { toast.success("Lead marked as won"); refetch(); } });
  const markNoShow = trpc.calendar.markNoShow.useMutation({ onSuccess: () => { toast.success("No-show recorded"); refetch(); } });
  const [noteContent, setNoteContent] = useState("");

  if (authLoading || isLoading) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center text-slate-500">Loading lead…</div>;
  if (!user) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-5"><div className="w-full max-w-md rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-8 text-center shadow-sm"><Sparkles className="mx-auto h-8 w-8 text-[#789c52]" /><h1 className="mt-4 text-2xl font-semibold">Sign in required</h1><p className="mt-3 text-sm text-[#718073]">Sign in to view lead details.</p><Button onClick={() => startLogin()} className="mt-6 w-full bg-[#173b2d] text-[#eff7de]">Sign in</Button></div></div>;
  if (!lead) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center text-[#718073]">Lead not found.</div>;

  const stage = stages.find((s) => s.key === lead.stage) ?? stages[0];

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-5 py-8 text-[#172018]">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-4 w-4" /></span> CoachFlow
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e6eee1] text-lg font-semibold text-[#577252]">{initials(lead.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stage.color}`}>{stage.label}</span>
                    {lead.automationPaused && <Badge variant="secondary" className="text-[10px]"><Zap className="mr-1 h-3 w-3" /> Automation paused</Badge>}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-[#718073]">
                    <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
                    {lead.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>}
                    {lead.company && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {lead.company}</span>}
                  </div>
                  {lead.goal && <p className="mt-3 text-sm leading-relaxed text-[#718073]">{lead.goal}</p>}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-[#f7f9f5] p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa49b]">Source</p>
                  <p className="mt-1 text-sm font-medium">{lead.source}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa49b]">Score</p>
                  <p className="mt-1 text-sm font-medium">{lead.score}/100</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa49b]">Created</p>
                  <p className="mt-1 text-sm font-medium">{relativeTime(lead.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#83ad4e]" /> Activity timeline</h2>
              <div className="mt-5 space-y-5">
                {lead.activities.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4e8] text-[#73955c]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug text-[#405043]">{item.title}</p>
                      {item.description && <p className="mt-1 text-[11px] leading-relaxed text-[#89948a]">{item.description}</p>}
                      <p className="mt-1.5 text-[10px] text-[#b0b8b0]">{relativeTime(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {lead.activities.length === 0 && <p className="text-sm text-[#849085]">No activity yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-[#83ad4e]" /> Add note</h2>
              <div className="mt-4">
                <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Add a note about this lead…" className="min-h-20 border-[#e1e7df]" />
                <Button disabled={addNote.isPending || !noteContent.trim()} onClick={() => addNote.mutate({ leadId, content: noteContent })} className="mt-3 bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
                  {addNote.isPending ? "Saving…" : "Save note"}
                </Button>
              </div>
            </div>

            {lead.appointments.length > 0 && (
              <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
                <h2 className="font-semibold flex items-center gap-2"><CalendarCheck2 className="h-4 w-4 text-[#83ad4e]" /> Appointments</h2>
                <div className="mt-4 space-y-3">
                  {lead.appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between rounded-xl bg-[#f7f9f5] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{new Date(appt.startsAt).toLocaleString()}</p>
                        <p className="mt-0.5 text-xs text-[#849085]">{appt.provider} · {appt.status}</p>
                      </div>
                      <Badge variant={appt.status === "confirmed" ? "default" : "secondary"}>{appt.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-[#83ad4e]" /> Stage</h2>
              <div className="mt-4 space-y-2">
                {stages.map((s) => (
                  <button key={s.key} disabled={updateStage.isPending} onClick={() => updateStage.mutate({ leadId, stage: s.key as "new" | "qualified" | "booked" | "won" | "nurture" })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${lead.stage === s.key ? "bg-[#e8f3d8] text-[#173b2d]" : "hover:bg-[#f0f3ed] text-[#6d786e]"}`}>
                    <span className={`h-2 w-2 rounded-full ${lead.stage === s.key ? "bg-[#5f8d43]" : "bg-[#c5cec0]"}`} />
                    {s.label}
                  </button>
                ))}
              </div>
              {lead.stage !== "won" && (
                <Button disabled={markWon.isPending} onClick={() => markWon.mutate({ leadId })} className="mt-4 w-full bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as won
                </Button>
              )}
              {lead.stage === "booked" && (
                <Button disabled={markNoShow.isPending} onClick={() => markNoShow.mutate({ leadId })} variant="outline" className="mt-2 w-full border-red-200 text-red-600 hover:bg-red-50">
                  Mark as no-show
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-[#83ad4e]" /> Quick actions</h2>
              <div className="mt-4 space-y-2">
                <Link href={`/book?leadId=${leadId}`} className="flex w-full items-center gap-3 rounded-xl bg-[#f1f6eb] px-3 py-3 text-sm font-medium text-[#52703d] hover:bg-[#e5f0d6]">
                  <CalendarCheck2 className="h-4 w-4" /> Book strategy call
                </Link>
                <a href={`mailto:${lead.email}`} className="flex w-full items-center gap-3 rounded-xl bg-[#f1f6eb] px-3 py-3 text-sm font-medium text-[#52703d] hover:bg-[#e5f0d6]">
                  <Mail className="h-4 w-4" /> Send email
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-6 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-[#83ad4e]" /> AI notes</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-[#f1f7e8] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#719052]">Score</p>
                  <p className="mt-1 text-2xl font-semibold text-[#416d3b]">{lead.score}<span className="text-xs font-normal text-[#78906a]"> / 100</span></p>
                </div>
                {lead.replyAt && (
                  <div className="rounded-xl bg-[#f7f9f5] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa49b]">Last reply</p>
                    <p className="mt-1 text-sm font-medium">{relativeTime(lead.replyAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
