import { createContext, useContext } from "react";

export const INTRO_KEY = "nomrank-intro-seen";
export const PERMISSIONS_KEY = "nomrank-permissions-asked";

export const IntroContext = createContext({ finishIntro: () => {}, finishPermissions: () => {} });
export const useIntro = () => useContext(IntroContext);

// A link tapped while signed out (or before onboarding is done) is kept here and opened once the app lets you in.
let pending: string | null = null;
export const keepLink = (path: string) => void (pending = path);
export const takeLink = () => {
  const p = pending;
  pending = null;
  return p;
};
