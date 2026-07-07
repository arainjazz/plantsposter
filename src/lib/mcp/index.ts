import { defineMcp } from "@lovable.dev/mcp-js";
import projectCoordinates from "./tools/project-coordinates";
import posterCatalog from "./tools/poster-catalog";
import generateImage from "./tools/generate-image";

export default defineMcp({
  name: "banrihua-poster-mcp",
  title: "半日花 Poster Editor MCP",
  version: "0.1.0",
  instructions:
    "Tools for the bilingual 半日花 (Helianthemum songaricum) A3 poster editor. " +
    "Call get_poster_catalog first to learn available block ids before drafting edits. " +
    "For any Global Range / 全球分布 map task, use project_coordinates with the fixed formula " +
    "x=2.6865*lon+449.3127, y=-3.4451*lat+339.3522 over the Wikimedia CC0 950x620 base map — " +
    "never hand-craft the projection. Use generate_image for poster illustrations.",
  tools: [posterCatalog, projectCoordinates, generateImage],
});
