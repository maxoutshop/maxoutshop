import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useCatalog } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, Flame, Trophy, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAXOUT — Built for More" },
      { name: "description", content: "Premium athletic clothing, workout tracking, meal logging, and community challenges. Built for more." },
      { property: "og:title", content: "MAXOUT — Built for More" },
      { property: "og:description", content: "Premium athletic clothing and a full fitness platform. Built for more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { products } = useCatalog();
  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 6);
  const newArrivals = products.filter((p) => p.newArrival).slice(0, 6);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative -mt-2 overflow-hidden">
        <div className="relative aspect-[4/5] w-full">
          <img
            src="https://static.wixstatic.com/media/8255de_06d4a17a72a54f378299eefd86b5f5ff~mv2.png/v1/fill/w_1200,h_1500,al_c,q_95,enc_auto/hero.png"
            alt="MAXOUT America Drop"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">Limited Stock</p>
            <h1 className="mt-2 text-4xl font-semibold text-balance leading-[1.05]">America Drop<br/>is here.</h1>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">Built for More. Clothing built to last. Essential pieces, worn on repeat.</p>
            <div className="mt-5 flex gap-2">
              <Link to="/shop" search={{ collection: "MAXOUT America" } as never} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Shop the Drop <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium">
                Shop All
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category shortcuts */}
      <section className="mt-6 px-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Men", cat: "men", img: "https://static.wixstatic.com/media/8255de_9fda9e347bb34bdfbb55f12cd8e88524~mv2.png/v1/fill/w_600,h_800,al_c,q_90,enc_auto/men.png" },
            { label: "Women", cat: "women", img: "https://static.wixstatic.com/media/8255de_9a7428c19f2742929555264654e94f9e~mv2.png/v1/fill/w_600,h_800,al_c,q_90,enc_auto/women.png" },
            { label: "Access.", cat: "accessories", img: "https://static.wixstatic.com/media/8255de_3dbcce34635c408dbaa7f4f48f3852f1~mv2.png/v1/fill/w_600,h_800,al_c,q_90,enc_auto/acc.png" },
          ].map((c) => (
            <Link key={c.cat} to="/shop" search={{ category: c.cat } as never} className="group relative overflow-hidden rounded-2xl">
              <img src={c.img} alt={c.label} className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
              <span className="absolute bottom-2 left-3 text-sm font-semibold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <Section title="Best Sellers" href="/shop">
        <HScroll>
          {bestSellers.map((p) => (
            <div key={p.slug} className="w-[62%] shrink-0 snap-start"><ProductCard product={p} /></div>
          ))}
        </HScroll>
      </Section>

      {/* Member stats teaser */}
      <section className="mt-8 px-4">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">Today</p>
              <h3 className="mt-1 text-xl font-semibold">Your MAXOUT</h3>
            </div>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat icon={<Flame className="h-4 w-4" />} value="12" label="Day streak" />
            <Stat icon={<Trophy className="h-4 w-4" />} value="3" label="New PRs" />
            <Stat icon={<Users className="h-4 w-4" />} value="482" label="In challenge" />
          </div>
          <div className="mt-4 rounded-2xl bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Daily protein</span>
              <span className="font-medium">128g / 180g</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[71%] rounded-full bg-foreground" />
            </div>
          </div>
          <Link to="/track" className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
            Open dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Current challenge */}
      <section className="mt-6 px-4">
        <Link to="/community" className="block overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-background p-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">Live challenge</p>
          <h3 className="mt-2 text-2xl font-semibold text-balance">30-Day Consistency</h3>
          <p className="mt-1 text-sm text-muted-foreground">Log 20 workouts in November. Earn the MAXOUT badge and 15% off your next drop.</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">482 members joined</span>
            <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground font-semibold">Join</span>
          </div>
        </Link>
      </section>

      {/* New arrivals */}
      <Section title="New Arrivals" href="/shop">
        <div className="grid grid-cols-2 gap-3 px-4">
          {newArrivals.slice(0, 4).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </Section>

      {/* Early access */}
      <section className="mt-8 px-4">
        <div className="relative overflow-hidden rounded-3xl border border-border p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-accent uppercase">Early Access</p>
            <h3 className="mt-2 text-2xl font-semibold">Get the drop first.</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">Members unlock new products 48 hours before public release, private previews, and exclusive discounts.</p>
            <Link to="/profile" className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background">
              Unlock Early Access <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Email signup */}
      <section className="mt-8 px-4">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h3 className="text-lg font-semibold">Built for More.</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get drop alerts, restock notifications, and MAXOUT updates.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
              if (input?.value) {
                (e.currentTarget as HTMLFormElement).reset();
                alert("You're on the list. We'll email you when the next drop lands.");
              }
            }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="you@maxout.com"
              className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground/50"
            />
            <button className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Join</button>
          </form>
        </div>
      </section>

      <p className="mt-8 px-4 text-center text-xs text-muted-foreground">
        Products, images, and pricing from{" "}
        <a href="https://www.maxoutshop.com" className="underline underline-offset-2">maxoutshop.com</a>.
      </p>
    </AppShell>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link to={href} className="text-xs font-medium text-muted-foreground">See all</Link>
      </div>
      {children}
    </section>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
      {children}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3">
      <div className="text-muted-foreground">{icon}</div>
      <div className="mt-1.5 text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
