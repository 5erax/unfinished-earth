const PREFIX = "earth-command-v1:";
// One key per receipt avoids overwriting another tab's in-flight operation.
export class CommandJournal {
  constructor(storage) {
    this.storage = storage;
  }
  entries(player) {
    const prefix = PREFIX + player + ":";
    const entries = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const value = JSON.parse(this.storage.getItem(key));
      if (
        value.player !== player ||
        typeof value.body !== "string" ||
        JSON.parse(value.body).id !== key.slice(prefix.length)
      )
        throw Error("Bản ghi đồng bộ không hợp lệ.");
      entries.push({ key, ...value });
    }
    return entries.sort(
      (a, b) => a.created - b.created || a.key.localeCompare(b.key),
    );
  }
  prepare(player, command, id, now = Date.now()) {
    const entry = {
      player,
      body: JSON.stringify({ ...command, id }),
      created: now,
    };
    const key = PREFIX + player + ":" + id;
    this.storage.setItem(key, JSON.stringify(entry));
    return { key, ...entry };
  }
  async send(entry, transport) {
    const result = await transport(entry.body);
    // Only an authoritative command result settles the receipt. 5xx/auth failures remain retryable.
    const settled =
      (result.status === 200 || result.status === 400) &&
      result.data?.state?.you === entry.player;
    if (settled) this.storage.removeItem(entry.key);
    return { ...result, settled };
  }
}
