import { createFileRoute } from "@tanstack/react-router";
import { AppOnlyPage } from "@/components/AppOnlyPage";

/** Download page: the published website only offers the app. */
export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Mr.B. Sokudo – ladda ner appen" },
      { name: "description", content: "Lös Sudoku i fyra nivåer, även utan internet. Ladda ner Mr.B. Sokudo." },
      { property: "og:title", content: "Mr.B. Sokudo" },
      { property: "og:description", content: "Lös Sudoku i fyra nivåer, även utan internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppOnlyPage,
});
