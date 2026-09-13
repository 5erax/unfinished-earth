import { createServer } from "./server.js";

const host = process.env.SERVER_HOST ?? "127.0.0.1";
const port = Number(process.env.SERVER_PORT ?? 8787);

const app = await createServer();

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
