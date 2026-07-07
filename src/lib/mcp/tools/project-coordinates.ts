import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Projection formula for the fixed Wikimedia CC0 world map (viewBox 950x620)
// used by the Global Range map generator. Documented in mem://features/global-range-map.md.
//   x = 2.6865 * lon + 449.3127
//   y = -3.4451 * lat + 339.3522

export default defineTool({
  name: "project_coordinates",
  title: "Project lat/lon to poster world-map pixels",
  description:
    "Apply the poster's fixed regression-corrected projection to convert (lat, lon) points into (x, y) pixel coordinates on the Wikimedia CC0 950×620 base map. Use this before laying out any Global Range distribution overlay.",
  inputSchema: {
    points: z
      .array(
        z.object({
          lat: z.number().min(-90).max(90).describe("Latitude, north positive."),
          lon: z.number().min(-180).max(180).describe("Longitude, east positive."),
          label: z.string().optional(),
          kind: z.enum(["native", "introduced"]).optional(),
        }),
      )
      .min(1)
      .max(500),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ points }) => {
    const projected = points.map((p) => {
      const x = Math.round((2.6865 * p.lon + 449.3127) * 100) / 100;
      const y = Math.round((-3.4451 * p.lat + 339.3522) * 100) / 100;
      return { ...p, x, y };
    });
    return {
      content: [
        { type: "text", text: JSON.stringify({ viewBox: "0 0 950 620", projected }, null, 2) },
      ],
      structuredContent: { viewBox: "0 0 950 620", projected },
    };
  },
});
