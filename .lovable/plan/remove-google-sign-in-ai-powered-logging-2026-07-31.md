# Remove Google sign-in + AI-powered logging

## 1. Google sign-in removed

- Delete the "Continue with Google" button, the OAuth handler, and the divider from the sign-in screen. Email + password only.
- Clean up the Google-related error copy ("created with Google", "Sign in with Google") so messages match the new flow.
- Disable the Google provider on the backend so it can't be reached at all.
- Keep "Set or reset password" — it still helps anyone whose account was created before this change.

## 2. AI food logging

Replace the 6-field meal form with a single input that understands plain language.

- Type or dictate what you ate — "chicken burrito bowl with extra rice and guac", or "2 eggs, toast, black coffee".
- AI parses it into individual items with name, portion, calories, protein, carbs and fat.
- Results appear as editable cards before saving: adjust portion or any macro, remove an item, then log all at once.
- Meal type (breakfast/lunch/dinner/snack) is auto-guessed from the time of day, tap to change.
- Photo option: snap or upload a picture of the plate and AI estimates the items and macros the same way.
- Manual entry stays available as a fallback link inside the same sheet.
- Quick repeat: recent and frequent meals show as one-tap chips so daily staples are a single tap.

## 3. Logging everything else gets faster and cooler

- Redesigned bottom sheet: bigger touch targets, big numeric keypad-style inputs, no tiny labels, smooth spring animation, haptic-style press feedback.
- Workout sets: exercise autocomplete from your history, +/- steppers for weight and reps, and a "repeat last set" button so the common case is one tap.
- PRs: auto-suggested when a logged set beats your previous best for that exercise, with a celebratory confirm instead of a manual form.
- Water: tap-and-drag across the glasses, plus a quick +1 button.
- Weight: stepper around your last entry rather than an empty field.
- A single floating "+" quick-log action on the Track screen opens a chooser (Meal / Set / PR / Weight) so nothing needs scrolling to find.

## Technical notes

- Google removal: edit `src/routes/auth.tsx`; call the social-auth config tool to disable the `google` provider.
- AI parsing: a `createServerFn` in `src/lib/nutrition.functions.ts` calling Lovable AI Gateway (`openai/gpt-5.6-sol`, reasoning effort none) with a structured output schema for `{ items: [{ name, quantity, calories, protein, carbs, fat }] }`, plus guarded parsing and clear 429/402 error surfacing. Photo mode sends the image as multimodal input to the same function.
- No schema changes needed — parsed items insert into the existing `meals` table (one row per item).
- New `src/components/LogSheet.tsx` replaces the inline `Sheet` in `src/routes/track.tsx`; track page keeps its existing data hooks in `src/lib/db.ts`.
