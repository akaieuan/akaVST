import Link from "next/link";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { DEMO_NAV } from "./_components/sections";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 py-10 md:grid-cols-[10rem_1fr] md:gap-14">
          <nav className="md:sticky md:top-20 md:self-start">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col md:gap-2">
              {DEMO_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
