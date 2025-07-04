import React, {useState} from "react";
import Turnstile from "react-turnstile";

const App: React.FC = () => {
    const [addr, setAddr] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const SITE_KEY = "0x4AAAAAABjKzbhgZyN_qPcs";
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const handleAddr = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAddr(val);
    };

    const handleCaptcha = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleClick = async () => {
        if (!captchaToken) {
            setResponse("Please complete the CAPTCHA verification first.");
            return;
        }
        setLoading(true);
        setResponse(null);
        try {
            const res = await fetch("https://faucet-api.opcatlabs.io/claim", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({addr, captchaToken}),
            });
            const data = await res.json();
            setResponse(data?.code === 0 ? `[OK] ${data.data.txId}` : `[ERROR] ${data.msg} (${data.code})`);
        } catch {
            setResponse("Request failed");
        }
        setCaptchaToken(null);
        setTurnstileKey(k => k + 1);
        setLoading(false);
    };

    return (
        <div style={{maxWidth: 800, margin: "100px auto", textAlign: "center"}}>
            <h1>OpcatLayer Testnet</h1>
            <br/>
            <ul style={{textAlign: "left", display: "inline-block", margin: 0, paddingLeft: 20}}>
                <li>Each claim grants <b>~ 10,000,000</b> satoshis.</li>
                <li>Each IP is allowed up to <b>10</b> claims every 24 hours.</li>
                <li>Each address is allowed up to <b>5</b> claims every 24 hours.</li>
            </ul>
            <input
                type="text"
                value={addr}
                onChange={handleAddr}
                placeholder="Please enter your testnet address"
                style={{width: "80%", marginTop: 20, marginBottom: 20, padding: 8}}
            />
            <br/>
            <Turnstile key={turnstileKey} sitekey={SITE_KEY} onVerify={handleCaptcha} style={{margin: "20px auto"}}/>
            <button onClick={handleClick} disabled={loading || !captchaToken || !addr}>
                {loading ? "Processing..." : "Claim"}
            </button>
            {response && <div style={{marginTop: 30}}>{response}</div>}
        </div>
    );
};

export default App;
