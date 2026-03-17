import { getStore } from "@netlify/blobs";

const STORE_NAME = "batmon";
const KEY        = "nuna-state";

export default async (req, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const store = getStore(STORE_NAME);

  // GET — veriyi oku
  if (req.method === "GET") {
    try {
      const data = await store.get(KEY, { type: "json" });
      if (!data) {
        return new Response(JSON.stringify({ ok: true, state: null }), { headers });
      }
      return new Response(JSON.stringify({ ok: true, state: data }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
    }
  }

  // POST — veriyi kaydet
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (!body || !body.state) {
        return new Response(JSON.stringify({ ok: false, error: "state eksik" }), { status: 400, headers });
      }
      body.state.updatedAt = new Date().toISOString();
      await store.setJSON(KEY, body.state);
      return new Response(JSON.stringify({ ok: true, updatedAt: body.state.updatedAt }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405, headers });
};

export const config = { path: "/api/sync" };
