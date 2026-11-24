import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Admin overview for MrB. Admin hub (iframe, no cookies): the token is verified on every call. */
export const hubAdminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { verifyHubToken } = await import("./hub-token");
    if (!(await verifyHubToken(data.token, process.env["HUB_SHARED_SECRET"]))) throw new Error("err:forbidden");
    const { adminOverviewData } = await import("./online-actions");
    return adminOverviewData();
  });
