import { AIChatBox, Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const welcomeMessage: Message = { role: "assistant", content: "Hi — I’m the CoachFlow concierge. I can learn a little about your fitness goals and help point you toward the most useful next step. What are you looking to achieve?" };

export default function Chat() {
  const [sessionId] = useState(() => `chat_${crypto.randomUUID().replaceAll("-", "")}`);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [leadCreated, setLeadCreated] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<number | null>(null);
  const chat = trpc.growth.chat.useMutation();
  const [phone, setPhone] = useState("");

  const handleSend = (content: string) => {
    setMessages((current) => [...current, { role: "user", content }]);
    chat.mutate({ sessionId, message: content }, {
      onSuccess: (result) => {
        setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
        if (result.leadCreated) {
          setLeadCreated(true);
          if (result.lead?.id) setCreatedLeadId(result.lead.id);
        }
      },
      onError: () => setMessages((current) => [...current, { role: "assistant", content: "I’m sorry — I couldn’t save that message. Please try again or use the application form instead." }]),
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-8 text-[#172018] sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-4 w-4" /></span> CoachFlow</Link><Link href="/apply" className="text-xs font-semibold text-[#6a8a50] hover:text-[#416d3b]">Prefer a form? <ArrowRight className="ml-1 inline h-3 w-3" /></Link></header>
        <div className="mt-10 grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <section className="pt-4 lg:pt-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a9468]">Instant response concierge</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Start with a conversation.</h1><p className="mt-5 max-w-md text-base leading-relaxed text-[#718073]">Tell us what is changing in your business. Our AI concierge will ask a few focused questions, capture your context, and route a useful next step to the team.</p><div className="mt-9 space-y-4"><div className="flex gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e8f3d8] text-[#6d9646]"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold">A focused conversation</p><p className="mt-1 text-xs leading-relaxed text-[#849085]">One question at a time — no long forms or generic sales script.</p></div></div><div className="flex gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e7f0f9] text-[#52799d]"><ShieldCheck className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Human-reviewed handoff</p><p className="mt-1 text-xs leading-relaxed text-[#849085]">Once there is enough context, a coach can review the conversation.</p></div></div></div></section>
          <section><AIChatBox messages={messages} onSendMessage={handleSend} isLoading={chat.isPending} height={"min(680px, calc(100vh - 150px))"} className="rounded-3xl border-[#dfe8d6] shadow-[0_12px_40px_rgba(45,65,42,0.08)] [&_form]:rounded-b-3xl [&_form]:border-[#e7ece3] [&_textarea]:rounded-xl [&_textarea]:border-[#dfe8d6] [&_button]:rounded-xl [&_button]:bg-[#173b2d] [&_button]:text-[#eff7de]" placeholder="Type your answer…" emptyStateMessage="Your concierge is ready" /><div className="mt-4 flex items-center justify-between rounded-2xl border border-[#dfe8d6] bg-[#fbfcf9] px-4 py-3 text-xs text-[#718073]"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#83ad4e]" /> Your answers stay private.</span><span>Session saved automatically</span></div>
{!leadCreated && <div className="mt-4"><Label className="text-xs">Phone (optional — for SMS follow-ups)</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="mt-2 border-[#dfe8d6]" /></div>}</section>
        </div>
        {leadCreated && <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#cfe0bd] bg-[#eff7de] px-4 py-3 text-[#416d3b] shadow-xl"><CheckCircle2 className="h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Your context is with the team</p><p className="mt-0.5 text-[11px]">A coach will review your answers and follow up.</p></div>{createdLeadId && <Link href={`/book?leadId=${createdLeadId}`}><Button size="sm" className="bg-[#173b2d] text-[#eff7de]">Book now</Button></Link>}<Button variant="ghost" size="sm" onClick={() => setLeadCreated(false)} className="text-[#416d3b]">Dismiss</Button></div>}
      </div>
    </main>
  );
}
