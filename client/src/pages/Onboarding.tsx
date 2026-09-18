import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, CreditCard, Mail, MessageSquareText, Sparkles, Webhook, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const steps = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "profile", label: "Your Practice", icon: Zap },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "delivery", label: "Messaging", icon: MessageSquareText },
  { id: "webhook", label: "Lead Capture", icon: Webhook },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({ niche: "", avgDealSize: "200", startHour: "9", endHour: "17" });
  const [deliveryProvider, setDeliveryProvider] = useState<"none" | "resend" | "twilio">("none");
  const [fromEmail, setFromEmail] = useState("");

  const saveSettings = trpc.automation.saveCoachSettings.useMutation({ onSuccess: () => toast.success("Settings saved") });
  const saveDelivery = trpc.automation.saveDelivery.useMutation({ onSuccess: () => toast.success("Delivery configured") });
  const createSource = trpc.automation.createSource.useMutation({ onSuccess: (data) => { toast.success("Webhook created"); setWebhookUrl(data.path); } });
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  if (authLoading) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <div className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-5"><div className="w-full max-w-md rounded-3xl border border-[#dfe8d6] bg-[#fbfcf9] p-8 text-center shadow-sm"><Sparkles className="mx-auto h-8 w-8 text-[#789c52]" /><h1 className="mt-4 text-2xl font-semibold">Sign in required</h1><p className="mt-3 text-sm text-[#718073]">Sign in to set up your coaching practice.</p><Button onClick={() => startLogin()} className="mt-6 w-full bg-[#173b2d] text-[#eff7de]">Sign in</Button></div></div>;

  const step = steps[currentStep];

  function goNext() {
    if (currentStep === 1) {
      saveSettings.mutate({ averageDealSize: Number(profile.avgDealSize), calendarStartHour: Number(profile.startHour), calendarEndHour: Number(profile.endHour) });
    }
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  function finishOnboarding() {
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-5 py-8 text-[#172018]">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#173b2d]">
            <ArrowLeft className="h-4 w-4" /> Skip for now
          </Link>
          <span className="text-xs text-[#849085]">Step {currentStep + 1} of {steps.length}</span>
        </header>

        <div className="mt-6 flex gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= currentStep ? "bg-[#83ad4e]" : "bg-[#e0e6dc]"}`} />
          ))}
        </div>

        <section className="mt-8 rounded-3xl border border-[#e0e6dc] bg-[#fbfcf9] p-8 shadow-sm">
          {currentStep === 0 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3d8]">
                <Sparkles className="h-8 w-8 text-[#5f8d43]" />
              </div>
              <h1 className="mt-6 text-2xl font-semibold">Welcome to CoachFlow</h1>
              <p className="mt-3 text-sm text-[#718073]">Let's set up your fitness coaching practice in a few quick steps. This takes about 2 minutes.</p>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold">Tell us about your practice</h2>
              <p className="mt-2 text-sm text-[#718073]">This helps us customize your experience.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#52703d]">Your coaching niche</label>
                  <Input value={profile.niche} onChange={(e) => setProfile({ ...profile, niche: e.target.value })} placeholder="e.g., Weight loss for busy professionals" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#52703d]">Average deal size ($)</label>
                  <Input type="number" value={profile.avgDealSize} onChange={(e) => setProfile({ ...profile, avgDealSize: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[#52703d]">Calendar start hour (UTC)</label>
                    <Input type="number" min={0} max={23} value={profile.startHour} onChange={(e) => setProfile({ ...profile, startHour: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#52703d]">Calendar end hour (UTC)</label>
                    <Input type="number" min={1} max={24} value={profile.endHour} onChange={(e) => setProfile({ ...profile, endHour: e.target.value })} className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3d8]">
                <Calendar className="h-8 w-8 text-[#5f8d43]" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Connect your calendar</h2>
              <p className="mt-3 text-sm text-[#718073]">Connect Google Calendar so prospects can book strategy calls during your available hours.</p>
              <Button onClick={() => navigate("/settings")} className="mt-6 bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
                <Calendar className="mr-2 h-4 w-4" /> Connect Calendar
              </Button>
              <p className="mt-3 text-xs text-[#849085]">You can also do this later in Settings.</p>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold">Set up messaging</h2>
              <p className="mt-2 text-sm text-[#718073]">Configure how you'll send follow-up emails and SMS to prospects.</p>
              <div className="mt-6 space-y-3">
                {(["none", "resend", "twilio"] as const).map((provider) => (
                  <button key={provider} onClick={() => setDeliveryProvider(provider)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${deliveryProvider === provider ? "bg-[#e8f3d8] text-[#173b2d]" : "hover:bg-[#f0f3ed] text-[#6d786e]"}`}>
                    <span className={`h-2 w-2 rounded-full ${deliveryProvider === provider ? "bg-[#5f8d43]" : "bg-[#c5cec0]"}`} />
                    {provider === "none" && <><Mail className="h-4 w-4" /> Not configured yet</>}
                    {provider === "resend" && <><Mail className="h-4 w-4" /> Resend (email)</>}
                    {provider === "twilio" && <><MessageSquareText className="h-4 w-4" /> Twilio (SMS)</>}
                  </button>
                ))}
              </div>
              {deliveryProvider === "resend" && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-[#52703d]">From email</label>
                  <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="coach@yourdomain.com" className="mt-1" />
                </div>
              )}
              <Button disabled={saveDelivery.isPending} onClick={() => { saveDelivery.mutate({ provider: deliveryProvider, fromEmail: fromEmail || undefined, enabled: deliveryProvider !== "none" }); goNext(); }} className="mt-6 w-full bg-[#173b2d] text-[#eff7de]">
                Save & Continue
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3d8]">
                <Webhook className="h-8 w-8 text-[#5f8d43]" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Capture leads from anywhere</h2>
              <p className="mt-3 text-sm text-[#718073]">Create a webhook to capture leads from your website forms, landing pages, or ads.</p>
              {!webhookUrl ? (
                <Button disabled={createSource.isPending} onClick={() => createSource.mutate({ name: "My first webhook", source: "Website form" })} className="mt-6 bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
                  <Zap className="mr-2 h-4 w-4" /> Create first webhook
                </Button>
              ) : (
                <div className="mt-6 rounded-xl bg-[#f1f7e8] p-4">
                  <p className="text-xs font-semibold text-[#52703d]">Your webhook URL</p>
                  <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-[#173b2d]">{window.location.origin}{webhookUrl}</code>
                  <p className="mt-2 text-xs text-[#718073]">Send POST requests with name, email, and goal fields.</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3d8]">
                <CreditCard className="h-8 w-8 text-[#5f8d43]" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Choose your plan</h2>
              <p className="mt-3 text-sm text-[#718073]">Start with a free trial. Upgrade when you're ready.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#e0e6dc] p-4 text-left">
                  <p className="font-semibold">Starter</p>
                  <p className="mt-1 text-2xl font-bold">$49<span className="text-xs font-normal text-[#849085]">/mo</span></p>
                  <ul className="mt-3 space-y-1 text-xs text-[#718073]">
                    <li>Up to 100 leads</li>
                    <li>Email follow-ups</li>
                    <li>Calendar booking</li>
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-[#83ad4e] p-4 text-left">
                  <p className="font-semibold text-[#52703d]">Pro</p>
                  <p className="mt-1 text-2xl font-bold">$99<span className="text-xs font-normal text-[#849085]">/mo</span></p>
                  <ul className="mt-3 space-y-1 text-xs text-[#718073]">
                    <li>Unlimited leads</li>
                    <li>SMS + Email</li>
                    <li>Priority support</li>
                  </ul>
                </div>
              </div>
              <Button onClick={finishOnboarding} className="mt-6 bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Start free trial
              </Button>
            </div>
          )}
        </section>

        {currentStep !== 3 && currentStep !== 5 && (
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={goBack} disabled={currentStep === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext} className="bg-[#173b2d] text-[#eff7de] hover:bg-[#24533e]">
              {currentStep === steps.length - 1 ? "Finish" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
