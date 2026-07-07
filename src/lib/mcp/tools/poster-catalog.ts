import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { INITIAL_BLOCKS, POSTER_W, POSTER_H } from "@/lib/poster-data";

export default defineTool({
  name: "get_poster_catalog",
  title: "Get poster block catalog",
  description:
    "Return the default 半日花 (Helianthemum songaricum) A3 poster block catalog: canvas size and every editable block id with its text/label. Use as a reference when drafting update_text / update_style / set_image / set_range_map operations for the poster editor.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const catalog = INITIAL_BLOCKS.map((b) =>
      b.type === "text"
        ? { id: b.id, type: "text", text: b.text }
        : { id: b.id, type: "image", label: b.label },
    );
    const payload = { canvas: { w: POSTER_W, h: POSTER_H }, blocks: catalog };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

// Silence unused-zod warning in stricter tsconfigs.
void z;
