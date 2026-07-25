import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Activity, Users, User, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/track", label: "Track", icon: Activity },
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const cartCount = useStore((s) => s.cart.reduce((n, c) => n + c.qty, 0));
  const isRoot = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-[0.25em]">MAXOUT</Link>
          <Link to="/cart" className="relative -mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-secondary transition">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl ${isRoot ? "" : "px-4"} pb-28 pt-2`}>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map((t) => {
            const active = t.to === "/" ? location.pathname === "/" : location.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wider uppercase transition ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-70"}`} strokeWidth={active ? 2.25 : 1.75} />
                {t.label}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
