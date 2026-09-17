import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Bot, Clock3, Mail, MessageSquareText, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function relativeTime(value: string | Date) {
  const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function ChatHistory() {
  const { user, loading: authLoading } = useAuth();
  const { data: sessions, isLoading } = trpc.growth.sessions.useQuery(undefined, { enabled: !!user });

  if (authLoading || isLoading) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center text-slate-500">Loading sessions…</div>;
  if (!user) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-5"><div className="w-full max-w-md rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-8 text-center shadow-sm"><Sparkles className="mx-auto h-8 w-8 text-[#789c52]" /><h1 className="mt-4 text-2xl font-semibold">Sign in required</h1><p className="mt-3 text-sm text-[#718073]">Sign in to view chat sessions.</p><Button onClick={() => startLogin()} className="mt-6 w-full bg-[#173b2d] text-[#eff7de]">Sign in</Button></div></div>;

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-5 py-8 text-[#172018]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-4 w-4" /></span> CoachFlow
          </Link>
        </header>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a9468]">Concierge sessions</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Chat history</h1>
          <p className="mt-2 text-sm text-[#718073]">All AI concierge conversations captured from your lead intake flow.</p>
        </div>

        <div className="mt-8 space-y-4">
          {(sessions ?? []).map((session) => (
            <div key={session.id} className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6eee1] text-xs font-semibold text-[#577252]">
                  {session.name ? initials(session.name) : <MessageSquareText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-medium text-[#29382d]">{session.name || "Anonymous visitor"}</p>
                    {session.email && <span className="flex items-center gap-1 text-xs text-[#849085]"><Mail className="h-3 w-3" /> {session.email}</span>}
                    {session.leadId && <Badge variant="secondary" className="text-[10px]">Lead #{session.leadId}</Badge>}
                  </div>
                  {session.company && <p className="mt-1 text-xs text-[#849085] flex items-center gap-1"><UserRound className="h-3 w-3" /> {session.company}</p>}
                  {session.goal && <p className="mt-2 text-sm text-[#718073] line-clamp-2">{session.goal}</p>}
                  <p className="mt-2 text-[10px] text-[#b0b8b0] flex items-center gap-1"><Clock3 className="h-3 w-3" /> {relativeTime(session.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
          {(sessions ?? []).length === 0 && (
            <div className="rounded-2xl border border-[#e0e6dc] bg-[#fbfcf9] p-12 text-center">
              <Bot className="mx-auto h-8 w-8 text-[#b2bab2]" />
              <p className="mt-4 text-sm text-[#849085]">No chat sessions yet. They will appear here when a visitor uses the concierge.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
