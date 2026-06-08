import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 2026">
      <p>
        These placeholder terms govern your purchase and use of software sold on
        this site. Replace this text with your finalised terms before launch.
      </p>
      <h2>1. Purchases</h2>
      <p>
        All purchases are one-time payments for a license to use the software.
        Prices are shown at checkout and may include tax depending on your
        location.
      </p>
      <h2>2. License</h2>
      <p>
        Your purchase grants a non-exclusive, non-transferable license to install
        and use the software. The full end-user license agreement is available on
        the License page.
      </p>
      <h2>3. Delivery</h2>
      <p>
        Software is delivered digitally via an immediate download link after
        purchase, and a backup link sent by email.
      </p>
      <h2>4. Liability</h2>
      <p>
        The software is provided &quot;as is&quot; without warranty of any kind to
        the extent permitted by law.
      </p>
    </LegalPage>
  );
}
