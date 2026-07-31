import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useCatalog } from "@/lib/catalog";
import { useSession } from "@/lib/auth";
import { useChallenges, usePRs, useProfile, useTodayMeals, useWorkouts } from "@/lib/db";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog-meta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAXOUT — Built for More" },
      { name: "description", content: "Premium athletic clothing, workout tracking, meal logging, and community challenges. Built for more." },
      { property: "og:title", content: "MAXOUT — Built for More" },
      { property: "og:description", content: "Premium athletic clothing, workout tracking, meal logging, and community challenges. Built for more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const HERO_FALLBACK =
  "https://static.wixstatic.com/media/8255de_06d4a17a72a54f378299eefd86b5f5ff~mv2.png/v1/fill/w_1200,h_1500,al_c,q_95,enc_auto/hero.png";

function Home() {
  const { products } = useCatalog();
  const { user } = useSession();
  const uid = user?.id;

  const profile = useProfile(uid);
  const meals = useTodayMeals(uid);
  const workouts = useWorkouts(uid);
  const prs = usePRs(uid);
  const challenges = useChallenges();

  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 6);
  const latestDrops = products
    .filter((p) => p.newArrival || p.dropDate)
    .sort((a, b) => {
      const da = a.dropDate ? new Date(a.dropDate).getTime() : 0;
      const db = b.dropDate ? new Date(b.dropDate).getTime() : 0;
      return db - da || Number(!!b.newArrival) - Number(!!a.newArrival);
    })
    .slice(0, 4);

  const hero = latestDrops[0] ?? bestSellers[0];
  const heroImage = hero?.images?.[0] ?? HERO_FALLBACK;
  const heroCollection = hero?.collection ?? "MAXOUT America";
  const heroWords = heroCollection.replace(/^MAXOUT\s+/i, "").split(" ").slice(0, 2);

  const streak = useMemo(() => {
    const days = new Set((workouts.data ?? []).map((w) => new Date(w.performed_at).toDateString()));
    let n = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [workouts.data]);

  const protein = uid
    ? Math.round((meals.data ?? []).reduce((s, m) => s + (m.protein ?? 0), 0))
    : 128;
  const proteinGoal = profile.data?.goal_protein ?? 180;
  const streakValue = uid ? streak : 12;
  const topPr = (prs.data ?? [])[0];
  const challenge = (challenges.data ?? [])[0];

  return (
    <AppShell>
      <div className="space-y-4 px-4 pt-2">
        {/* Hero drop */}
        <Link
          to="/shop"
          search={{ collection: heroCollection } as never}
          className="rise tile relative block aspect-[4/5] overflow-hidden"
        >
          <img
            src={heroImage}
            alt={`MAXOUT ${heroCollection}`}
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          <div className="absolute inset-x-7 bottom-7">
            <p className="kicker text-foreground/70">Latest release</p>
            <h1 className="display mt-2 text-6xl leading-[0.85]">
              The
              <br />
              {heroWords.map((w) => (
                <span key={w} className="block">
                  {w}
                </span>
              ))}
              Drop
            </h1>
            <span className="mt-5 inline-block bg-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-background">
              Shop collection
            </span>
          </div>
        </Link>

        {/* Stats bento */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/track" className="rise tile flex aspect-square flex-col justify-between p-5">
            <p className="kicker text-muted-foreground">Current streak</p>
            <div className="flex items-baseline gap-1.5">
              <span className="display text-6xl leading-none">{streakValue}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Days</span>
            </div>
          </Link>

          <div className="grid grid-rows-2 gap-4">
            <Link to="/track" className="rise tile flex flex-col justify-center p-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="kicker text-muted-foreground">Protein</p>
                <p className="display text-sm">
                  {protein}/{proteinGoal}g
                </p>
              </div>
              <div className="h-0.5 w-full bg-hairline">
                <div
                  className="h-full bg-foreground transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((protein / Math.max(1, proteinGoal)) * 100))}%` }}
                />
              </div>
            </Link>
            <Link to="/track" className="rise tile flex flex-col justify-center p-4">
              <p className="kicker mb-1 text-muted-foreground">
                {topPr ? `${topPr.exercise} PR` : "Top PR"}
              </p>
              <p className="display text-2xl leading-none">
                {topPr ? `${topPr.weight} ${topPr.unit ?? "lbs"}` : "Log your first"}
              </p>
            </Link>
          </div>
        </div>

        {/* Live challenge — inverted */}
        <Link
          to="/community"
          className="rise flex items-center justify-between gap-4 bg-foreground p-6 text-background"
        >
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />
              <p className="kicker">Live now</p>
            </div>
            <h3 className="display truncate text-3xl leading-none">
              {challenge?.title ?? "30-Day Consistency"}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="display text-2xl leading-none">
              {(challenge?.participant_count ?? 482).toLocaleString()}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Athletes</p>
          </div>
        </Link>

        {/* Categories */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Men", cat: "men" },
            { label: "Women", cat: "women" },
            { label: "Gear", cat: "accessories" },
          ].map((c) => (
            <Link
              key={c.cat}
              to="/shop"
              search={{ category: c.cat } as never}
              className="rise tile flex h-16 items-center justify-center transition hover:border-foreground/60"
            >
              <span className="display text-xl">{c.label}</span>
            </Link>
          ))}
        </div>

        {/* Best sellers */}
        <section className="pt-4">
          <SectionHead title="Best sellers" to="/shop" />
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {bestSellers.map((p) => (
              <div key={p.slug} className="min-w-[170px] max-w-[170px]">
                <Tile product={p} />
              </div>
            ))}
          </div>
        </section>

        {/* Latest drop */}
        {latestDrops.length > 0 && (
          <section className="pt-4">
            <SectionHead title="Latest drop" to="/shop" />
            <div className="grid grid-cols-2 gap-4">
              {latestDrops.map((p) => (
                <Tile key={p.slug} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Early access */}
        <section className="tile p-8 text-center">
          <h4 className="display text-4xl leading-none">Unlocked access</h4>
          <p className="kicker mx-auto mt-3 max-w-[240px] text-muted-foreground">
            Early drop notifications &amp; events
          </p>
          <form
            className="relative mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
              if (input?.value) {
                e.currentTarget.reset();
                alert("You're on the list. We'll email you when the next drop lands.");
              }
            }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="EMAIL ADDRESS"
              className="w-full border-b border-hairline bg-transparent py-3 pr-14 text-[10px] tracking-[0.3em] outline-none transition placeholder:text-muted-foreground/50 focus:border-foreground"
            />
            <button className="absolute bottom-3 right-0 text-[10px] font-bold tracking-widest uppercase">
              Join
            </button>
          </form>
        </section>

        <p className="pb-2 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <a href="https://www.maxoutshop.com" className="underline underline-offset-4">
            maxoutshop.com
          </a>
        </p>
      </div>
    </AppShell>
  );
}

function SectionHead({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <h2 className="display truncate text-2xl leading-none">{title}</h2>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 border-b border-foreground/60 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      >
        View all <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Tile({ product }: { product: CatalogProduct }) {
  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
      <div className="tile relative aspect-[3/4] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
        />
        {product.newArrival && (
          <span className="absolute left-0 top-0 bg-foreground px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-background">
            New
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-[10px] font-bold uppercase tracking-widest">{product.name}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        ${(product.salePrice ?? product.price).toFixed(2)}
      </p>
    </Link>
  );
}
