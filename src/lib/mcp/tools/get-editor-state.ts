import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requirePublishedState, resolvePage, textResult } from "./state-utils";

export default defineTool({
  name: "get_editor_state",
  title: "Get live poster editor state",
  description:
    "Read the currently published poster state. Without page, returns a compact page manifest and revision. With page id/name, returns that page and all editable blocks. Read this before any write and pass its revision to write tools.",
  inputSchema: {
    page: z.string().min(1).optional().describe("Optional page id or exact page name."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ page }) => {
    try {
      const published = await requirePublishedState();
      if (page) {
        const selected = resolvePage(published.state, page);
        return textResult({
          revision: published.revision,
          source: published.source,
          activeId: published.state.activeId,
          palette: published.state.palette,
          page: selected,
        });
      }
      return textResult({
        revision: published.revision,
        source: published.source,
        activeId: published.state.activeId,
        palette: published.state.palette,
        pages: published.state.pages.map((item, index) => ({
          index,
          id: item.id,
          name: item.name,
          background: item.background,
          blockCount: item.blocks.length,
          textBlocks: item.blocks.filter((block) => block.type === "text").length,
          imageBlocks: item.blocks.filter((block) => block.type === "image").length,
        })),
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
