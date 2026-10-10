import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { acceptCenikWrite, cenikHasEntries, readCenik } from "@/lib/pricing";

const filePath = path.join(process.cwd(), "data", "cenik.json");

async function readSaved() {
  try {
    const raw = await readFile(filePath, "utf8");
    return readCenik(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function GET() {
  await connection();
  return Response.json({ cenik: await readSaved() }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const incoming = readCenik(body);
  if (!incoming) return Response.json({ ok: false }, { status: 400 });
  await connection();
  const existing = await readSaved();
  const known = request.headers.get("x-cenik-known") === "1";
  if (!acceptCenikWrite(existing, incoming, known)) {
    const empty = existing != null && cenikHasEntries(existing) && !cenikHasEntries(incoming);
    return Response.json({ ok: false, reason: empty ? "prazno" : "staro" }, { status: 409 });
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(incoming));
    await rename(temporary, filePath);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return Response.json({ ok: true });
}
