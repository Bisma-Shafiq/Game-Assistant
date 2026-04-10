import { useState } from "react";
import { createShare } from "../api/analyze";

export default function ShareButton({ sessionData }) {
    const [state, setState] = useState("idle"); // idle | loading | done | error
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);

    async function handleShare() {
        setState("loading");
        try {
            const res = await createShare(sessionData);
            const url = `${window.location.origin}/share/${res.share_id}`;
            setShareUrl(url);
            setState("done");
        } catch (e) {
            setState("error");
            setTimeout(() => setState("idle"), 3000);
        }
    }

    function handleCopy() {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    if (state === "done") return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input readOnly value={shareUrl}
                style={{
                    fontSize: 12, background: "#0d0d0d", border: "1px solid #FFD600",
                    borderRadius: 8, color: "#FFD600", padding: "7px 12px", outline: "none",
                    width: 280, fontFamily: "monospace"
                }}
                onClick={e => e.target.select()}
            />
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 14px", flexShrink: 0 }}
                onClick={handleCopy}>
                {copied ? "✓ Copied!" : "Copy link"}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "7px 10px" }}
                onClick={() => setState("idle")}>✕</button>
        </div>
    );

    return (
        <button
            className="btn btn-ghost"
            style={{ fontSize: 12, opacity: state === "loading" ? 0.6 : 1 }}
            onClick={handleShare}
            disabled={state === "loading"}
        >
            {state === "loading" ? "Sharing..." : state === "error" ? "Failed — retry" : "🔗 Share"}
        </button>
    );
}