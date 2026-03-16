import React, {useState} from "react";
import Turnstile from "react-turnstile";

const EXPLORER = "https://testnet.opcatlabs.io";

const App: React.FC = () => {
    const [addr, setAddr] = useState("");
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const SITE_KEY = "0x4AAAAAABjKzbhgZyN_qPcs";
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const handleAddr = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddr(e.target.value);
    };

    const handleCaptcha = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleClick = async () => {
        if (!captchaToken) {
            setError("Please complete the CAPTCHA verification first.");
            return;
        }
        setLoading(true);
        setTxId(null);
        setError(null);
        try {
            const res = await fetch("https://faucet-api.opcatlabs.io/claim", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({addr, captchaToken}),
            });
            const data = await res.json();
            if (data?.code === 0) {
                setTxId(data.data.txId);
            } else {
                setError(`${data.msg} (code: ${data.code})`);
            }
        } catch {
            setError("Request failed. Please try again.");
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

            {txId && (
                <div style={{marginTop: 30, padding: "16px 20px", background: "#0d2218", border: "1px solid #16a34a", borderRadius: 8}}>
                    <div style={{color: "#4ade80", fontWeight: 700, marginBottom: 8}}>✅ Coins sent!</div>
                    <div style={{fontFamily: "monospace", fontSize: 13, color: "#86efac", wordBreak: "break-all", marginBottom: 10}}>
                        {txId}
                    </div>
                    <a
                        href={`${EXPLORER}/tx/${txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{color: "#f97316", fontWeight: 600, fontSize: 14, textDecoration: "none"}}
                    >
                        View on Explorer →
                    </a>
                </div>
            )}

            {error && (
                <div style={{marginTop: 30, padding: "12px 16px", background: "#1a0a0a", border: "1px solid #dc2626", borderRadius: 8, color: "#f87171"}}>
                    ❌ {error}
                </div>
            )}
        </div>
    );
};

export default App;
