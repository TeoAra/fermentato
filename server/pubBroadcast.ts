import { Response } from "express";

type UpdateType = "taplist" | "bottles" | "menu" | "drinks" | "pub";

interface SSEClient {
  res: Response;
  pubId: number;
}

const clients = new Map<number, Set<SSEClient>>();

export function addClient(pubId: number, res: Response): SSEClient {
  const client: SSEClient = { res, pubId };
  if (!clients.has(pubId)) {
    clients.set(pubId, new Set());
  }
  clients.get(pubId)!.add(client);
  return client;
}

export function removeClient(client: SSEClient): void {
  const set = clients.get(client.pubId);
  if (set) {
    set.delete(client);
    if (set.size === 0) {
      clients.delete(client.pubId);
    }
  }
}

export function broadcastPubUpdate(pubId: number, type: UpdateType = "pub"): void {
  const set = clients.get(pubId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify({ type, pubId, ts: Date.now() });
  const dead: SSEClient[] = [];
  for (const client of set) {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch {
      dead.push(client);
    }
  }
  for (const c of dead) removeClient(c);
}

export function getClientCount(pubId: number): number {
  return clients.get(pubId)?.size ?? 0;
}
