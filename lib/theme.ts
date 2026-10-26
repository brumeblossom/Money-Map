/**
 * Trial theme configuration for Money Map (Prompt 17d).
 *
 * Current routes:
 * - "/" (Home for signed-in users and guests)
 * - "/records" (Records list and detail routes e.g. /records/[id], /records/[id]/edit)
 *
 * Switch instructions:
 * - To roll out PawCare everywhere across the app:
 *     export const TRIAL_THEME_ROUTES: readonly string[] = ["*"];
 * - To remove the trial PawCare palette completely and revert to default Moss:
 *     export const TRIAL_THEME_ROUTES: readonly string[] = [];
 */
export const TRIAL_THEME_ROUTES: readonly string[] = ["/", "/records"];

/**
 * Returns true if the given pathname should use the trial PawCare palette.
 * Matches exact "/" or any route starting with "/records" (e.g. /records, /records/[id]).
 */
export function isTrialThemeRoute(pathname: string): boolean {
  if (TRIAL_THEME_ROUTES.includes("*")) {
    return true;
  }
  return TRIAL_THEME_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}
