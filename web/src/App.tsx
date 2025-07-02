import React, {useState} from "react";

const App: React.FC = () => {
    const [addr, setAddr] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    const handleAddr = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAddr(val);
    };

    const handleClick = async () => {
        setLoading(true);
        setResponse(null);
        try {
            const res = await fetch("https://faucet-api.opcatlabs.io/claim", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({addr}),
            });
            const data = await res.json();
            setResponse(data?.code === 0 ? `[OK] ${data.data.txId}` : `[ERROR] ${data.msg} (${data.code})`);
        } catch {
            setResponse("Request failed");
        }
        setLoading(false);
    };

    return (
        <div style={{maxWidth: 800, margin: "100px auto", textAlign: "center"}}>
            <h1>OpcatLayer Testnet</h1>
            <input
                type="text"
                value={addr}
                onChange={handleAddr}
                placeholder="Please enter your testnet address"
                style={{width: "80%", marginTop: 20, marginBottom: 20, padding: 8}}
            />
            <br/>
            <button onClick={handleClick} disabled={loading}>
                {loading ? "Processing..." : "Claim"}
            </button>
            {response && <div style={{marginTop: 30}}>{response}</div>}
        </div>
    );
};

export default App;
