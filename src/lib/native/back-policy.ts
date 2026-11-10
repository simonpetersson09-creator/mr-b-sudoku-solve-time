export type BackAction = "minimize" | "back" | "home";

/** The game screen: progress is saved continuously, so back simply returns home. */
export function isMatchPath(path: string): boolean {
  return path === "/play";
}

export function backAction(path: string, canGoBack: boolean): BackAction {
  if (path === "/" || path === "/index" || path === "") return "minimize";
  if (isMatchPath(path)) return "home";
  return canGoBack ? "back" : "home";
}
