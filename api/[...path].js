const ORIGIN = "https://unfinished-earth-playtest.dha260803.chatgpt.site";

export default async function handler(req, res) {
  const suffix = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path || "";
  const target = new URL(`/api/${suffix}`, ORIGIN);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    for (const item of Array.isArray(value) ? value : [value]) target.searchParams.append(key, item);
  }
  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    "oai-sites-authorization": `Bearer ${process.env.SITES_BYPASS_TOKEN || ""}`,
  };
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  const init = { method: req.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(req.method)) init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  const upstream = await fetch(target, init);
  res.status(upstream.status);
  for (const [key, value] of upstream.headers) if (!["content-encoding","content-length","transfer-encoding"].includes(key)) res.setHeader(key, value);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}
