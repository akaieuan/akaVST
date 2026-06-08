import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "License (EULA)" };

export default function LicensePage() {
  return (
    <LegalPage title="End-User License Agreement" updated="June 2026">
      <p>
        This placeholder EULA covers your use of the compiled plugins. Replace it
        with your finalised agreement (you already maintain an EULA in your plugin
        repos, so paste the canonical version here).
      </p>
      <h2>Grant of license</h2>
      <p>
        You are granted a personal, non-exclusive, non-transferable license to
        install and use the software on machines you own or control.
      </p>
      <h2>Restrictions</h2>
      <p>
        You may not redistribute, resell, sublicense, or reverse-engineer the
        software. The source code remains proprietary.
      </p>
      <h2>Ownership</h2>
      <p>© 2026 akaieuan. All rights reserved.</p>
    </LegalPage>
  );
}
