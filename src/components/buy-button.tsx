"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  price: string;
  available: boolean;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function BuyButton({ slug, price, available, className, size = "lg" }: Props) {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setLoading(false);
    }
  }

  if (!available) {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        className={cn("rounded-full", className)}
      >
        Coming soon
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={checkout}
      disabled={loading}
      className={cn(
        "rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Buy · {price}
    </Button>
  );
}
