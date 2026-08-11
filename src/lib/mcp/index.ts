import { auth, defineMcp } from "@lovable.dev/mcp-js";
import logMeal from "./tools/log-meal";
import getNutritionDay from "./tools/get-nutrition-day";
import listWorkouts from "./tools/list-workouts";
import listPersonalRecords from "./tools/list-personal-records";
import logPersonalRecord from "./tools/log-personal-record";
import logBodyweight from "./tools/log-bodyweight";

// Issuer must be the direct Supabase host (the publish-time proxy URL fails RFC 8414 checks).
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "maxout",
  title: "MAXOUT",
  version: "0.1.0",
  instructions:
    "Tools for MAXOUT, a training and nutrition app. Log meals, bodyweight and PRs for the signed-in member, and read their nutrition days, workouts and personal records.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [logMeal, getNutritionDay, listWorkouts, listPersonalRecords, logPersonalRecord, logBodyweight],
});
