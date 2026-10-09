import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { readCenik } from "@/lib/pricing";

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
  const parsed = readCenik(body);
  if (!parsed) return Response.json({ ok: false }, { status: 400 });
  await connection();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(parsed));
  return Response.json({ ok: true });
}
