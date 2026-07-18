import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { clonePage, makeEmptyPage, uniquePageName, type PosterPage } from "@/lib/poster-data";
import { publishServerState } from "@/lib/published-state.server";

import {
  assertRevision,
  errorResult,
  requirePublishedState,
  resolvePage,
  textResult,
} from "./state-utils";

export default defineTool({
  name: "manage_page",
  title: "Create, copy, rename, or activate a page",
  description:
    "Create a blank page, copy an existing page, rename a page, or change the active page, then publish with a version snapshot. Page names remain unique. Use delete_page for deletion.",
  inputSchema: {
    action: z.enum(["create", "copy", "rename", "set_active"]),
    page: z.string().min(1).optional().describe("Source/target page id or exact name."),
    name: z.string().min(1).max(160).optional().describe("New page name."),
    expectedRevision: z.string().min(8).max(128).optional(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ action, page, name, expectedRevision }) => {
    try {
      const published = await requirePublishedState();
      assertRevision(published.revision, expectedRevision);
      const state = structuredClone(published.state);
      let affected: PosterPage;

      if (action === "create") {
        const unique = uniquePageName(
          name || `新页面 ${state.pages.length + 1}`,
          state.pages.map((item) => item.name),
        );
        affected = makeEmptyPage(unique);
        affected.autoName = false;
        state.pages.push(affected);
        state.activeId = affected.id;
      } else if (action === "copy") {
        if (!page) throw new Error("page is required for copy.");
        const source = resolvePage(state, page);
        const unique = uniquePageName(
          name || source.name,
          state.pages.map((item) => item.name),
        );
        affected = clonePage(source, unique);
        affected.autoName = false;
        const index = state.pages.findIndex((item) => item.id === source.id);
        state.pages.splice(index + 1, 0, affected);
        state.activeId = affected.id;
      } else if (action === "rename") {
        if (!page || !name) throw new Error("page and name are required for rename.");
        affected = resolvePage(state, page);
        affected.name = uniquePageName(
          name,
          state.pages.filter((item) => item.id !== affected.id).map((item) => item.name),
        );
        affected.autoName = false;
      } else {
        if (!page) throw new Error("page is required for set_active.");
        affected = resolvePage(state, page);
        state.activeId = affected.id;
      }

      const saved = await publishServerState(state);
      return textResult({
        ok: true,
        action,
        savedAt: saved.savedAt,
        revision: saved.revision,
        previousRevision: published.revision,
        page: { id: affected.id, name: affected.name },
        activeId: saved.state.activeId,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
