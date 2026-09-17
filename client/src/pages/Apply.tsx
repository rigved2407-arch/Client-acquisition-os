import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Apply() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", goal: "" });
  const [result, setResult] = useState<Awaited<ReturnType<typeof trpc.growth.createLead.useMutation>>["data"]>(undefined);
  const mutation = trpc.growth.createLead.useMutation({ onSuccess: setResult });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  if (result?.qualification) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#172018] sm:py-16">
        <div className="mx-auto max-w-xl">
          <Link href="/" className="mb-12 flex items-center gap-2 text-sm font-semibold text-[#173b2d]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-4 w-4" /></span> CoachFlow</Link>
          <section className="rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-7 shadow-[0_12px_40px_rgba(45,65,42,0.08)] sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3d8] text-[#6d9646]"><CheckCircle2 className="h-6 w-6" /></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a9468]">Application received</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Thanks, {form.name.split(" ")[0]}.</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#718073]">Your answers were reviewed and routed to the right next step. A member of the team will follow up shortly.</p>
            <div className="mt-7 rounded-2xl bg-[#f1f7e8] p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#719052]">Initial fit score</p><p className="text-2xl font-semibold text-[#416d3b]">{result.qualification.score}<span className="text-xs font-normal text-[#78906a]"> / 100</span></p></div><p className="mt-3 text-sm font-medium text-[#3e533f]">{result.qualification.summary}</p><p className="mt-2 text-xs leading-relaxed text-[#718272]"><strong>Next step:</strong> {result.qualification.nextStep}</p></div>
            <Link href="/" className="mt-7 inline-flex items-center text-sm font-semibold text-[#52703d]">Back to workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#172018] sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="pt-3"><Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b2d] text-[#d8f27f]"><Sparkles className="h-4 w-4" /></span> CoachFlow</Link><p className="mt-16 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a9468]">Growth strategy application</p><h1 className="mt-3 max-w-md text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Build a pipeline that does not depend on luck.</h1><p className="mt-5 max-w-md text-base leading-relaxed text-[#718073]">Share a little context about your coaching business. We will review your goals and recommend the most useful next step.</p><div className="mt-9 space-y-3 text-sm text-[#5f7062]"><p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#83ad4e]" /> Takes less than two minutes</p><p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#83ad4e]" /> No obligation or hard sell</p><p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#83ad4e]" /> Your answers stay private</p></div></section>
        <section className="rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-7 shadow-[0_12px_40px_rgba(45,65,42,0.08)] sm:p-9"><div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9aa49b]">Step 1 of 1</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Tell us about your next chapter.</h2><p className="mt-2 text-sm text-[#849085]">The more specific you are, the more useful our recommendation will be.</p></div><form onSubmit={(event) => { event.preventDefault(); mutation.mutate({ ...form, phone: form.phone || undefined, source: "Website application" }); }} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="name" className="text-xs">Full name</Label><Input id="name" required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Taylor Reed" className="mt-2 h-11 rounded-xl bg-white" /></div><div><Label htmlFor="email" className="text-xs">Work email</Label><Input id="email" required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="taylor@example.com" className="mt-2 h-11 rounded-xl bg-white" /></div></div><div><Label htmlFor="company" className="text-xs">Business or brand</Label><Input id="company" value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="Reed Coaching" className="mt-2 h-11 rounded-xl bg-white" /></div><div><Label htmlFor="phone" className="text-xs">Phone (optional)</Label><Input id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 (555) 123-4567" className="mt-2 h-11 rounded-xl bg-white" /></div><div><Label htmlFor="goal" className="text-xs">What would you most like to improve?</Label><Textarea id="goal" required minLength={10} value={form.goal} onChange={(event) => update("goal", event.target.value)} placeholder="For example: I want to go from inconsistent referrals to 10 qualified calls per month…" className="mt-2 min-h-32 rounded-xl bg-white" /></div>{mutation.error && <p className="flex items-start gap-2 text-xs text-[#a34f49]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> We could not save your application. Please check your details and try again.</p>}<Button disabled={mutation.isPending} type="submit" className="h-11 w-full rounded-xl bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">{mutation.isPending ? "Reviewing your application…" : "Submit application"}<ArrowRight className="ml-2 h-4 w-4" /></Button><p className="text-center text-[11px] leading-relaxed text-[#9aa49b]">By submitting, you agree to be contacted about your application. You can opt out at any time.</p></form></section>
      </div>
    </main>
  );
}
