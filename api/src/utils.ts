import {PrivateKey} from "@opcat-labs/opcat";
import {DefaultSigner, MempoolProvider, SupportedNetwork} from "@opcat-labs/scrypt-ts-opcat";
import dayjs from "dayjs";
import Redis from "ioredis";

export const signer = new DefaultSigner(PrivateKey.fromWIF(process.env.WIF || ""));
export const network = (process.env.NETWORK || 'opcat-testnet') as SupportedNetwork;
export const provider = new MempoolProvider(network);

export const bulletSatoshis = parseInt(process.env.BULLET_SATOSHIS || '10000000');
export const feeRate = parseInt(process.env.FEE_RATE || '1');
export const bulletsPerRound = parseInt(process.env.BULLETS_PER_ROUND || '2');
export const bulletsThreshold = parseInt(process.env.BULLETS_THRESHOLD || '1');
export const daemonSleepSeconds = parseInt(process.env.DAEMON_SLEEP_SECONDS || '10');

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
