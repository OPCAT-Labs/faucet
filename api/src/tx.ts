import {ExtPsbt, fromSupportedNetwork, UTXO} from "@opcat-labs/scrypt-ts-opcat";
import {
    bulletSatoshis,
    bulletsPerRound,
    bulletsThreshold,
    feeRate,
    keyPrefix,
    log,
    network,
    provider,
    redis,
    signer,
} from "./utils";
import {Address} from "@opcat-labs/opcat";

export async function broadcast(rawTxHex: string): Promise<string> {
    return provider.broadcast(rawTxHex);
}

export async function queryPoolUtxo(): Promise<UTXO> {
    const key = `${keyPrefix}pool`;
    const utxo = await redis.get(key);
    if (!utxo) {
        const address = await signer.getAddress();
        const utxos = await provider.getUtxos(address);
        if (utxos.length !== 1) {
            throw new Error(`unexpected pool utxos, ${JSON.stringify(utxos)}`);
        }
        await redis.set(key, JSON.stringify(utxos[0]));
        return utxos[0];
    }
    return JSON.parse(utxo);
}

export async function updatePoolUtxo(utxo: UTXO | null): Promise<void> {
    const key = `${keyPrefix}pool`;
    if (utxo) {
        await redis.set(key, JSON.stringify(utxo));
    } else {
        await redis.del(key);
    }
}

export async function refillBullets() {
    const bulletsCount = await redis.llen(`${keyPrefix}bullets`);
    if (bulletsCount > bulletsThreshold) {
        return;
    }
    const poolUtxo = await queryPoolUtxo();
    log(`[refill] there are ${bulletsCount} bullets in queue, start refilling, pool utxo: ${JSON.stringify(poolUtxo)}`);
    const address = await signer.getAddress();
    // build tx
    const psbt = new ExtPsbt({network})
        .spendUTXO(poolUtxo)
        .addOutputs(
            Array.from({length: bulletsPerRound}).map(() => ({
                address: address,
                value: BigInt(bulletSatoshis),
                data: new Uint8Array(),
            }))
        )
        .change(address, feeRate)
        .seal();
    // sign
    const signedPsbtHex = await signer.signPsbt(psbt.toHex(), psbt.psbtOptions());
    psbt.combine(ExtPsbt.fromHex(signedPsbtHex)).finalizeAllInputs();
    const tx = psbt.extractTransaction();
    // broadcast
    const txId = await broadcast(tx.toHex());
    log(`[refill] tx ${txId} broadcasted`);

    await Promise.all([
        // update pool utxo
        updatePoolUtxo(psbt.getChangeUTXO()),
        // update bullet utxos
        Array.from({length: bulletsPerRound}).map((_, i) =>
            redis.rpush(`${keyPrefix}bullets`, JSON.stringify(psbt.getUtxo(i)))
        ),
    ]);
    log(`[refill] injected ${bulletsPerRound} bullets, pool utxo updated to ${JSON.stringify(psbt.getUtxo(bulletsPerRound))}`);
}

export function validateAddr(addr: string): boolean {
    try {
        Address.fromString(addr, fromSupportedNetwork(network));
        return true;
    } catch {
        return false;
    }
}

/**
 * Possible return codes and messages:
 *   - code: 0,   msg: 'ok'
 *   - code: 10,  msg: 'missing address'
 *   - code: 11,  msg: 'invalid address'
 *   - code: 20,  msg: 'no available utxo'
 *   - code: 90,  msg: 'unknown exception'
 */
export async function faucet(addr?: string): Promise<{
    code: number;
    msg: string;
    data: null | { txId: string; rawHex: string; };
}> {
    if (!addr) {
        return {code: 10, msg: 'missing address', data: null};
    }
    if (!validateAddr(addr)) {
        return {code: 11, msg: 'invalid address', data: null};
    }
    const bullet = await redis.lpop(`${keyPrefix}bullets`);
    if (!bullet) {
        log(`[faucet] no available bullets to faucet`);
        return {code: 20, msg: 'no available utxo', data: null};
    }
    try {
        const psbt = new ExtPsbt({network}).spendUTXO(JSON.parse(bullet)).change(addr, feeRate).seal();
        const signedPsbtHex = await signer.signPsbt(psbt.toHex(), psbt.psbtOptions());
        psbt.combine(ExtPsbt.fromHex(signedPsbtHex)).finalizeAllInputs();
        const rawHex = psbt.extractTransaction().toHex();
        const txId = await broadcast(rawHex);
        log(`[faucet] tx broadcasted ${txId} -> ${addr} `);
        return {code: 0, msg: 'ok', data: {txId, rawHex}};
    } catch (e: any) {
        return {code: 90, msg: e?.message || 'unknown exception', data: null};
    }
}
