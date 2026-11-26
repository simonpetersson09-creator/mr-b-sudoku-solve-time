import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { nativeModules } from "../../../vite.native.config";

const resolveId = nativeModules.resolveId;
function resolveModule(source: string, importer = resolve("src/lib/backend/report.ts")) {
  if (typeof resolveId !== "function") throw new Error("Expected native resolver hook");
  return resolveId.call({} as never, source, importer, { isEntry: false });
}
describe("native backend import isolation", () => {
  it.each([
    "@/lib/backend/online.functions", "@/lib/backend/online.functions.ts",
    "@/lib/backend/hub.functions", "@/lib/backend/hub.functions.ts",
    "./online.functions", "./online.functions.ts", "./online.functions?build=1",
    "./hub.functions", "./hub.functions.ts", "./hub.functions?build=1",
    resolve("src/lib/backend/online.functions"), resolve("src/lib/backend/online.functions.ts"),
    resolve("src/lib/backend/hub.functions"), resolve("src/lib/backend/hub.functions.ts"),
    resolve("src/lib/backend/online.functions.ts").replaceAll("/", "\\"),
    resolve("src/lib/backend/hub.functions.ts").replaceAll("/", "\\"),
  ])("redirects %s to an existing native client", async (source) => {
    const result = await resolveModule(source);
    expect(result).toBe(resolve("src/lib/native/online-client.ts"));
    expect(existsSync(String(result))).toBe(true);
  });
  it("resolves relative imports from other folders", async () => {
    expect(await resolveModule("../backend/online.functions", resolve("src/lib/player/profile-name.ts"))).toBe(resolve("src/lib/native/online-client.ts"));
    expect(await resolveModule("../lib/backend/hub.functions", resolve("src/routes/admin.tsx"))).toBe(resolve("src/lib/native/online-client.ts"));
  });
  it("does not redirect unrelated modules with the same filename", async () => {
    expect(await resolveModule("./online.functions", resolve("src/lib/other/report.ts"))).toBeNull();
    expect(await resolveModule("@/lib/backend/online-actions")).toBeNull();
  });
  it("mirrors every backend server-function export without loading server implementations", async () => {
    const expected = readdirSync("src/lib/backend").filter(file => file.endsWith(".functions.ts")).flatMap(file =>
      [...readFileSync(`src/lib/backend/${file}`, "utf8").matchAll(/export const (\w+) =/g)].map(m => m[1])).sort();
    const clientSource = readFileSync("src/lib/native/online-client.ts", "utf8");
    expect(expected).toContain("hubAdminOverview");
    expect([...clientSource.matchAll(/export const (\w+) =/g)].map(m => m[1]).sort()).toEqual(expected);
    expect(clientSource).toContain('import type * as ServerFunctions');
    expect(clientSource).toContain('import type * as HubFunctions');
    expect(clientSource).not.toMatch(/import\s+(?!type)[^;]*\.functions/);
  });
});