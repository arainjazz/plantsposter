import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/$pageName",
      params: { pageName: "封面·半日花" },
    });
  },
  component: () => null,
});
