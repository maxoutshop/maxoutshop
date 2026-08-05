import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.maxout.app",
  appName: "MAXOUT",
  // Produced by `npm run build:mobile`
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    // The native shell talks to the published MAXOUT backend.
    allowNavigation: ["maxoutshop.lovable.app", "*.lovable.app", "*.supabase.co", "*.stripe.com"],
  },
};

export default config;
