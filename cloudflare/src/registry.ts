import { DurableObject } from "cloudflare:workers";
import { randomPairCode } from "./crypto";
import type { Env, PairingRecord } from "./types";

const SHARD_CAPACITY = 20;
const PAIRING_TTL_MS = 10 * 60 * 1000;

type ShardAssignment = {
  shardName: string;
  createdAt: string;
};

type Allocator = {
  index: number;
  count: number;
};

export class RegistryDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async ensureShard(extensionHash: string) {
    const assignmentKey = `account:${extensionHash}`;
    const existing = await this.ctx.storage.get<ShardAssignment>(assignmentKey);

    if (existing) return existing;

    const allocator = (await this.ctx.storage.get<Allocator>("allocator")) ?? {
      index: 0,
      count: 0,
    };

    if (allocator.count >= SHARD_CAPACITY) {
      allocator.index += 1;
      allocator.count = 0;
    }

    const assignment: ShardAssignment = {
      shardName: `shard-${allocator.index}`,
      createdAt: new Date().toISOString(),
    };

    allocator.count += 1;

    await this.ctx.storage.put({
      [assignmentKey]: assignment,
      allocator,
    });

    return assignment;
  }

  private async createPair(extensionHash: string) {
    const assignment = await this.ensureShard(extensionHash);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = randomPairCode();
      const key = `pair:${code}`;
      const exists = await this.ctx.storage.get(key);
      if (exists) continue;

      const now = Date.now();
      const record: PairingRecord = {
        code,
        extensionHash,
        shardName: assignment.shardName,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + PAIRING_TTL_MS).toISOString(),
        attempts: 0,
      };

      await this.ctx.storage.put(key, record);

      return {
        code,
        formattedCode: `${code.slice(0, 3)} ${code.slice(3)}`,
        expiresAt: record.expiresAt,
        shardName: assignment.shardName,
      };
    }

    throw new Error("PAIRING_CODE_EXHAUSTED");
  }

  private async claimPair(code: string) {
    const key = `pair:${code}`;
    const record = await this.ctx.storage.get<PairingRecord>(key);

    if (!record) {
      return { error: "PAIRING_CODE_NOT_FOUND", status: 404 };
    }

    if (Date.parse(record.expiresAt) <= Date.now()) {
      await this.ctx.storage.delete(key);
      return { error: "PAIRING_CODE_EXPIRED", status: 410 };
    }

    await this.ctx.storage.delete(key);

    return {
      extensionHash: record.extensionHash,
      shardName: record.shardName,
    };
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/account/ensure") {
      const body = await request.json<{ extensionHash?: string }>();
      if (!body.extensionHash) return Response.json({ error: "INVALID_ACCOUNT" }, { status: 400 });
      return Response.json(await this.ensureShard(body.extensionHash));
    }

    if (request.method === "POST" && url.pathname === "/pair/create") {
      const body = await request.json<{ extensionHash?: string }>();
      if (!body.extensionHash) return Response.json({ error: "INVALID_ACCOUNT" }, { status: 400 });

      try {
        return Response.json(await this.createPair(body.extensionHash));
      } catch (error) {
        return Response.json(
          { error: (error as Error)?.message || "PAIR_CREATE_FAILED" },
          { status: 503 },
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/pair/claim") {
      const body = await request.json<{ code?: string }>();
      const code = String(body.code || "").replace(/\D/g, "");

      if (!/^\d{6}$/.test(code)) {
        return Response.json({ error: "INVALID_PAIRING_CODE" }, { status: 400 });
      }

      const result = await this.claimPair(code);

      if ("error" in result) {
        return Response.json({ error: result.error }, { status: result.status });
      }

      return Response.json(result);
    }

    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
