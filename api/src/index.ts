import "dotenv/config";
import express from "express";
import cors from "cors";
import {daemonSleepSeconds, log, shouldCheckIp, sleep, verifyTurnstileToken} from "./utils";
import {faucet, refillBullets} from "./faucet";

const app = express();
app.use(cors());
app.use(express.json());
// trust reverse proxy headers, e.g. X-Forwarded-For, cf-connecting-ip, to ensure req.ip gets the real client ip
app.set('trust proxy', true)

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
    if (shouldCheckIp(req.ip) && !(await verifyTurnstileToken(req.body?.captchaToken))) {
        // if the client ip has not bypassed verification, check the captcha token
        return res.status(403).json({code: 10, msg: 'captcha validation failed', data: null});
    }
    res.send(await faucet(req.body?.addr, req.ip));
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
