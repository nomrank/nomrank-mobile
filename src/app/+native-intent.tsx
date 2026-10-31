// Google hands back to nomrank://auth while the sign-in code is still finishing the exchange. There's no such screen, so
// send the link to the root and let the guards decide where you belong.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.includes("auth") ? "/" : path;
}
