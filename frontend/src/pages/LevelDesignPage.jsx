import LevelDesigner from "../components/LevelDesigner";

export default function LevelDesignPage({ onBack }) {
    return (
        <div style={{ minHeight: "100vh", background: "var(--black)" }}>
            {/* Nav bar — matches your existing .result-nav style */}
            <nav className="result-nav">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onBack} className="btn btn-ghost" style={{ fontSize: 12 }}>
                        ← Back
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        🗺 Level Designer
                    </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--faint)" }}>
                    AI-powered · Claude Sonnet
                </span>
            </nav>
            <LevelDesigner />
        </div>
    );
}