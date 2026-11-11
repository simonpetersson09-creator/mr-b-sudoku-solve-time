import { existsSync, readFileSync } from "node:fs";
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
    "./online.functions", "./online.functions.ts", "./online.functions?build=1",
    resolve("src/lib/backend/online.functions"), resolve("src/lib/backend/online.functions.ts"),
    resolve("src/lib/backend/online.functions.ts").replaceAll("/", "\\"),
  ])("redirects %s to an existing native client", async (source) => {
    const result = await resolveModule(source);
    expect(result).toBe(resolve("src/lib/native/online-client.ts"));
    expect(existsSync(String(result))).toBe(true);
  });
  it("resolves relative imports from other folders", async () => {
    expect(await resolveModule("../backend/online.functions", resolve("src/lib/player/profile-name.ts"))).toBe(resolve("src/lib/native/online-client.ts"));
  });
  it("does not redirect unrelated modules with the same filename", async () => {
    expect(await resolveModule("./online.functions", resolve("src/lib/other/report.ts"))).toBeNull();
    expect(await resolveModule("@/lib/backend/online-actions")).toBeNull();
  });
  it("mirrors every server export without loading server implementations", async () => {
    const source = readFileSync("src/lib/backend/online.functions.ts", "utf8");
    const expected = [...source.matchAll(/export const (\w+) =/g)].map(m => m[1]).sort();
    const clientSource = readFileSync("src/lib/native/online-client.ts", "utf8");
    expect([...clientSource.matchAll(/export const (\w+) =/g)].map(m => m[1]).sort()).toEqual(expected);
    expect(clientSource).toContain('import type * as ServerFunctions');
    expect(clientSource).not.toMatch(/import\s+(?!type)[^;]*online\.(functions|actions)/);
  });
});