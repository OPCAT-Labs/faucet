import "dotenv/config";
import express from "express";
import cors from "cors";
import {daemonSleepSeconds, getClientIp, isDevToken, log, shouldCheckIp, sleep, verifyTurnstileToken} from "./utils";
import {faucet, refillBullets} from "./faucet";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
    res.send("OK");
});

/**
 * Possible return codes and messages:
 *   - code: 0,   msg: 'ok'
 *   - code: 10,  msg: 'captcha validation failed'
 *   - code: 20,  msg: 'invalid address'
 *   - code: 30,  msg: 'limit exceeded for this address'
 *   - code: 31,  msg: 'limit exceeded for this ip'
 *   - code: 40,  msg: 'no available utxo'
 *   - code: 90,  msg: 'unknown exception'
 */
app.post("/claim", async (req, res) => {
    const clientIp = getClientIp(req);
    // Internal automation (skill, CI, etc.) can present a registered dev token
    // to bypass both captcha and rate limits. Tokens live in the Redis SET
    // `opcatlayer-faucet:dev-keys`; rotate via SADD/SREM.
    const devToken = req.headers['x-dev-token'];
    if (typeof devToken === 'string' && devToken && (await isDevToken(devToken))) {
        return res.send(await faucet(req.body?.addr, clientIp, true));
    }
    if (shouldCheckIp(clientIp) && !(await verifyTurnstileToken(req.body?.captchaToken))) {
        // if the client ip has not bypassed verification, check the captcha token
        return res.status(403).json({code: 10, msg: 'captcha validation failed', data: null});
    }
    res.send(await faucet(req.body?.addr, clientIp));
});

async function prepareBulletsDaemon() {
    log("daemon for preparing bullets started");
    // noinspection InfiniteLoopJS
    while (true) {
        try {
            await refillBullets();
        } catch (e) {
            log(`error preparing bullets, ${e}`);
        }
        await sleep(daemonSleepSeconds);
    }
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
app.listen(port, () => {
    log(`server running at http://localhost:${port}`);
    prepareBulletsDaemon().then();
});
