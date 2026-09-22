const ORIGIN = "https://unfinished-earth-playtest.dha260803.chatgpt.site";

export default async function handler(req, res) {
  const incoming = new URL(req.url, "https://vercel.local");
  const suffix = incoming.pathname.replace(/^\/api\/?/, "");
  const target = new URL(`/api/${suffix}${incoming.search}`, ORIGIN);
  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    "oai-sites-authorization": `Bearer ${process.env.SITES_BYPASS_TOKEN || ""}`,
  };
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  const init = { method: req.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(req.method)) init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  const upstream = await fetch(target, init);
  res.status(upstream.status);
  for (const [key, value] of upstream.headers) {
    if (!["content-encoding", "content-length", "transfer-encoding", "set-cookie"].includes(key)) {
      res.setHeader(key, value);
    }
  }
  const cookies = upstream.headers.getSetCookie?.() || [];
  const sessionCookies = cookies
    .filter((cookie) => cookie.startsWith("earth_session="))
    .map((cookie) => cookie.replace(/;\s*Domain=[^;]+/i, ""));
  if (sessionCookies.length) res.setHeader("Set-Cookie", sessionCookies);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}
