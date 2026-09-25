import { Link } from "wouter";

export default function Legal() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#172018]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#e0e6dc] bg-white p-8 shadow-sm md:p-12">
        <Link href="/" className="text-sm font-semibold text-[#52703d]">← Back to CoachFlow</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">CoachFlow policies and support</h1>
        <p className="mt-3 text-sm leading-6 text-[#718073]">This page is the launch-ready location for your customer terms, privacy notice, cancellation policy, and support contact. Replace the marked business details with reviewed legal copy before accepting paid customers.</p>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">Privacy</h2>
          <p className="text-sm leading-6 text-[#5f6f62]">CoachFlow processes account, lead, conversation, booking, and delivery data to provide client-acquisition workflows. State which data is collected, the lawful basis for processing, retention periods, subprocessors, international transfers, and how customers can request access or deletion.</p>
        </section>
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Terms of service</h2>
          <p className="text-sm leading-6 text-[#5f6f62]">Define account responsibilities, acceptable use, ownership of customer data, provider dependencies, availability commitments, AI-output limitations, payment terms, suspension, termination, and governing law. Have counsel review this text for your selling jurisdiction.</p>
        </section>
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Billing and cancellation</h2>
          <p className="text-sm leading-6 text-[#5f6f62]">Publish the active plan prices, billing interval, trial terms, taxes, renewal behavior, cancellation timing, refunds, and what happens to stored data after cancellation. Stripe checkout and portal flows are available once the matching products and prices are configured.</p>
        </section>
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Support</h2>
          <p className="text-sm leading-6 text-[#5f6f62]">Add your monitored support email, expected response time, incident status process, and escalation path here before inviting customers. Do not publish a placeholder address.</p>
        </section>
        <p className="mt-10 border-t border-[#edf0eb] pt-5 text-xs text-[#8a978b]">Last reviewed: September 2026 · Business owner: configure before launch.</p>
      </div>
    </main>
  );
}
