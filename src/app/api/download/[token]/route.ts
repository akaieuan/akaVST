import { NextResponse } from "next/server";
import { verifyDownloadToken } from "@/lib/download";
import { getPlugin } from "@/lib/plugins";
import { getSignedDownloadUrl } from "@/lib/r2";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const slug = verifyDownloadToken(token);
  if (!slug) {
    return NextResponse.json(
      { error: "This download link is invalid or has expired." },
      { status: 403 },
    );
  }

  const plugin = getPlugin(slug);
  if (!plugin) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(plugin.downloadKey);
  if (!url) {
    return NextResponse.json(
      { error: "Downloads aren't configured yet. Add your R2 credentials." },
      { status: 503 },
    );
  }

  // hand off to the short-lived presigned R2 URL
  return NextResponse.redirect(url, 302);
}
