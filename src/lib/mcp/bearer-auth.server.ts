type RuntimeBindings = Record<string, unknown>;

export function isMcpSurface(pathname: string): boolean {
  return pathname === "/mcp" || pathname.startsWith("/.mcp/");
}

function configuredToken(bindings: RuntimeBindings): string | null {
  const processEnv =
    typeof process !== "undefined" ? (process.env as unknown as RuntimeBindings) : {};
  const token =
    bindings.MCP_API_TOKEN ?? processEnv.MCP_API_TOKEN ?? bindings.EDIT_KEY ?? processEnv.EDIT_KEY;
  return typeof token === "string" && token.length >= 16 ? token : null;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index++) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function unauthorized(message: string): Response {
  return Response.json(
    { error: message },
    {
      status: 401,
      headers: {
        "cache-control": "no-store",
        "www-authenticate": 'Bearer realm="plantsposter-mcp"',
      },
    },
  );
}

export async function authorizeMcpRequest(
  request: Request,
  bindings: RuntimeBindings,
  production: boolean,
): Promise<Response | null> {
  const expected = configuredToken(bindings);
  if (!expected) {
    if (!production) return null;
    return Response.json(
      { error: "MCP_API_TOKEN (or EDIT_KEY fallback) is not configured." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  const supplied = bearerToken(request);
  if (!supplied || !(await secureEqual(supplied, expected))) {
    return unauthorized("A valid MCP bearer token is required.");
  }
  return null;
}
