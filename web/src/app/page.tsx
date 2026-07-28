import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/home/Hero";
import { CollectionGrid } from "@/components/home/CollectionGrid";
import { Thesis } from "@/components/home/Thesis";

/* The landing is a composition of atomic server sections: no client JavaScript
   at this level. The interactive islands (theme, the canvas marks) live inside
   the sections that need them. */

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <Hero />
        <CollectionGrid />
        <Thesis />
      </main>
      <Footer />
    </>
  );
}
