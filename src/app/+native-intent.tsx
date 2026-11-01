import { keepLink } from "@/lib/intro";

// Links come in as nomrank://… or as https://beta.nomrank.in/… (and www). Google hands back to nomrank://auth while the sign-in
// code is still finishing, and there is no such screen, so that one goes to the root. Anything else is kept so that a person who
// isn't signed in yet lands on it right after they are, not on Home.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const route = path.replace(/^https?:\/\/[^/?#]+/, "").replace(/^nomrank:\/\//, "/").replace(/^\/{2,}/, "/") || "/";
  if (/^\/?auth([/?]|$)/.test(route)) return "/";
  if (route !== "/") keepLink(route);
  return route;
}
