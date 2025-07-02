import "dotenv/config";
import express from "express";
import cors from "cors";
import {daemonSleepSeconds, log, sleep} from "./utils";
import {faucet, refillBullets} from "./tx";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
    res.send("OK");
});

app.post("/claim", async (req, res) => {
    const {addr} = req.body || {};
    res.send(await faucet(addr));
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
