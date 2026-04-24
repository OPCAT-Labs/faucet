import {PrivateKey} from "@opcat-labs/opcat";
import {DefaultSigner, OpenApiProvider, SupportedNetwork} from "@opcat-labs/scrypt-ts-opcat";
import dayjs from "dayjs";
import Redis from "ioredis";
import type {Request} from "express";

export const signer = new DefaultSigner(PrivateKey.fromWIF(process.env.WIF || ""));
export const network = (process.env.NETWORK || 'opcat-testnet') as SupportedNetwork;
export const provider = new OpenApiProvider(network);

export const bulletSatoshis = parseInt(process.env.BULLET_SATOSHIS || '10000000');
export const feeRate = parseFloat(process.env.FEE_RATE || '1');
export const bulletsPerRound = parseInt(process.env.BULLETS_PER_ROUND || '2');
export const bulletsThreshold = parseInt(process.env.BULLETS_THRESHOLD || '1');
export const daemonSleepSeconds = parseInt(process.env.DAEMON_SLEEP_SECONDS || '10');

export const limitPerAddrPerDay = parseInt(process.env.LIMIT_PER_ADDR_PER_DAY || '5');
export const limitPerIpPerDay = parseInt(process.env.LIMIT_PER_IP_PER_DAY || '10');

export const keyPrefix = "opcatlayer-faucet:";
export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
});

export async function sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function log(...args: any[]): void {
    console.log(`[${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args);
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
    try {
        const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET || '',
                response: token,
            })
        });
        const data = await resp.json();
        return !!data.success;
    } catch {
        return false;
    }
}

export function shouldCheckIp(ip?: string | null): boolean {
    return !!ip && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip.trim())
}

/**
 * Resolve the real client IP.
 *
 * We do not use `req.ip` with `trust proxy: true` — that chain is attacker-
 * controlled and lets anyone impersonate localhost by setting
 * `X-Forwarded-For: 127.0.0.1`.
 *
 * In production the service sits behind Cloudflare, which injects
 * `CF-Connecting-IP` with the true client IP. Fall back to the TCP peer for
 * local dev where no CF header is present.
 */
export function getClientIp(req: Request): string | undefined {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
    }
    return req.socket.remoteAddress ?? undefined;
}

/**
 * Dev tokens are stored in the Redis SET `opcatlayer-faucet:dev-keys`.
 * Admins rotate via:
 *   redis-cli SADD opcatlayer-faucet:dev-keys <random-hex>
 *   redis-cli SREM opcatlayer-faucet:dev-keys <old-token>
 */
export async function isDevToken(token: string): Promise<boolean> {
    return (await redis.sismember(`${keyPrefix}dev-keys`, token)) === 1;
}
