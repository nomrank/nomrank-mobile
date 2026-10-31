import { createContext, useContext } from "react";

export const INTRO_KEY = "nomrank-intro-seen";
export const PERMISSIONS_KEY = "nomrank-permissions-asked";

export const IntroContext = createContext({ finishIntro: (_login: boolean) => {}, finishPermissions: () => {} });
export const useIntro = () => useContext(IntroContext);
