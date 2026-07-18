import { defineMcp } from "@lovable.dev/mcp-js";
import projectCoordinates from "./tools/project-coordinates";
import posterCatalog from "./tools/poster-catalog";
import generateImage from "./tools/generate-image";
import getEditorState from "./tools/get-editor-state";
import editPoster from "./tools/edit-poster";
import managePage from "./tools/manage-page";
import deletePage from "./tools/delete-page";
import deleteBlock from "./tools/delete-block";
import { listVersions, restoreVersion } from "./tools/state-versions";

export default defineMcp({
  name: "banrihua-poster-mcp",
  title: "半日花 Poster Editor MCP",
  version: "1.0.0",
  instructions:
    "Live control plane for the bilingual Ordos Plantspedia A3 poster editor. " +
    "Before every write, call get_editor_state and pass its revision as expectedRevision; on conflict, read again instead of retrying stale data. " +
    "Writes publish immediately but create recoverable Supabase snapshots. Use delete_page and restore_state_version only with explicit user intent. " +
    "Use get_poster_catalog only for the default template; use get_editor_state for the live site. " +
    "For any Global Range / 全球分布 map task, use project_coordinates with the fixed formula " +
    "x=2.6865*lon+449.3127, y=-3.4451*lat+339.3522 over the Wikimedia CC0 950x620 base map — " +
    "never hand-craft the projection. generate_image uploads to Supabase and can install the resulting URL directly into a target image block.",
  tools: [
    getEditorState,
    editPoster,
    managePage,
    deletePage,
    deleteBlock,
    generateImage,
    listVersions,
    restoreVersion,
    posterCatalog,
    projectCoordinates,
  ],
});
