import type { ToolHandlerResult } from "@lovable.dev/mcp-js";

import type { PersistedEditorState } from "@/lib/editor-storage";
import type { PosterPage } from "@/lib/poster-data";
import { readPublishedServerState, type PublishedStateRead } from "@/lib/published-state.server";

export function textResult(payload: unknown): ToolHandlerResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export function errorResult(error: unknown): ToolHandlerResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export async function requirePublishedState(): Promise<PublishedStateRead> {
  const published = await readPublishedServerState();
  if (!published) throw new Error("No published editor state is available.");
  return published;
}

export function resolvePage(state: PersistedEditorState, reference?: string): PosterPage {
  const needle = reference?.trim();
  const page = needle
    ? state.pages.find((candidate) => candidate.id === needle || candidate.name === needle)
    : (state.pages.find((candidate) => candidate.id === state.activeId) ?? state.pages[0]);
  if (!page) throw new Error(`Page ${reference || state.activeId} was not found.`);
  return page;
}

export function assertRevision(actual: string, expected?: string): void {
  if (expected && expected !== actual) {
    throw new Error(
      `Revision conflict: expected ${expected}, but the current revision is ${actual}. Read the state again before editing.`,
    );
  }
}
