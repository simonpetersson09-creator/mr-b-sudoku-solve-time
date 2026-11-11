import { createFileRoute } from "@tanstack/react-router";
import { AppOnlyPage } from "@/components/AppOnlyPage";

/** Download page: the published website only offers the app. */
export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Mr.B. Sudoku – ladda ner appen" },
      { name: "description", content: "Lös Sudoku i sju nivåer, även utan internet. Ladda ner Mr.B. Sudoku." },
      { property: "og:title", content: "Mr.B. Sudoku" },
      { property: "og:description", content: "Lös Sudoku i sju nivåer, även utan internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppOnlyPage,
});
