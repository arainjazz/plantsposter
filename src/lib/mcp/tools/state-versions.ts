import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { listStateVersions, restoreStateVersion } from "@/lib/published-state.server";

import { assertRevision, errorResult, requirePublishedState, textResult } from "./state-utils";

export const listVersions = defineTool({
  name: "list_state_versions",
  title: "List poster state versions",
  description: "List recent recoverable Supabase snapshots of the published poster state.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ limit }) => {
    try {
      return textResult({ versions: await listStateVersions(limit ?? 20) });
    } catch (error) {
      return errorResult(error);
    }
  },
});

export const restoreVersion = defineTool({
  name: "restore_state_version",
  title: "Restore a poster state version",
  description:
    "Restore one Supabase state snapshot as the live published state. Requires confirm=true and creates another snapshot, so the restore itself remains recoverable.",
  inputSchema: {
    version: z.string().min(6).max(240),
    expectedRevision: z.string().min(8).max(128).optional(),
    confirm: z.literal(true),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ version, expectedRevision }) => {
    try {
      const current = await requirePublishedState();
      assertRevision(current.revision, expectedRevision);
      const restored = await restoreStateVersion(version);
      return textResult({
        ok: true,
        restoredVersion: version,
        savedAt: restored.savedAt,
        revision: restored.revision,
        previousRevision: current.revision,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
