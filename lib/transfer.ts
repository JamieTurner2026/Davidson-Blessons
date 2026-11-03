// Turns progress JSON into a short piece of text that can be pasted into a message, and back.
// Pure (no storage, no network). Format: "DB1:" + base64url(gzip(json)), or "DB0:" + base64url(json)
// when this browser can't compress. Decoding accepts both. Validation of the contents is the
// caller's job (parseStudy in lib/study-store.ts), so nothing here trusts what it decodes.

const MAX_CODE_LENGTH = 2_000_000;
const PREFIX_GZIP = "DB1:";
const PREFIX_PLAIN = "DB0:";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource).catch(() => undefined);
  void writer.close().catch(() => undefined);
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodeProgress(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === "undefined") return PREFIX_PLAIN + toBase64Url(bytes);
  return PREFIX_GZIP + toBase64Url(await pipe(bytes, new CompressionStream("gzip")));
}

/** The JSON text inside a code, or null if the text isn't a valid code. */
export async function decodeProgress(input: string): Promise<string | null> {
  const code = input.replace(/\s+/g, "");
  if (code.length === 0 || code.length > MAX_CODE_LENGTH) return null;
  const gzip = code.startsWith(PREFIX_GZIP);
  if (!gzip && !code.startsWith(PREFIX_PLAIN)) return null;
  const bytes = fromBase64Url(code.slice(PREFIX_GZIP.length));
  if (!bytes) return null;
  try {
    if (!gzip) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream === "undefined") return null;
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream("gzip")));
  } catch {
    return null;
  }
}
