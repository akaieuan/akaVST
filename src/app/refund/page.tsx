import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy" updated="June 2026">
      <p>
        Because these products are digital goods delivered instantly and
        downloadable immediately after purchase, all sales are generally final.
        This is placeholder copy, so confirm the wording with your own policy and
        local consumer law before launch.
      </p>
      <h2>Exceptions</h2>
      <p>
        If a plugin is faulty, fails to install, or isn&apos;t as described, get in
        touch and we&apos;ll make it right with a fix or a refund.
      </p>
      <h2>How to request</h2>
      <p>
        Email your order confirmation and a short description of the issue, and
        we&apos;ll respond within a few business days.
      </p>
    </LegalPage>
  );
}
