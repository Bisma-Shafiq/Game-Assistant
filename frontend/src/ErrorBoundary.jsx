import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null };
    }

    componentDidCatch(error, info) {
        this.setState({ error, info });
        console.error("App crashed:", error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{
                    minHeight: "100vh", background: "#0a0a0a", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 40, flexDirection: "column", gap: 20,
                }}>
                    <div style={{ fontSize: 32 }}>💥</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#ff6b6b" }}>
                        Something crashed
                    </div>
                    <div style={{
                        background: "#111", border: "0.5px solid #ff6b6b", borderRadius: 10,
                        padding: "16px 20px", maxWidth: 700, width: "100%",
                        fontSize: 13, color: "#ff6b6b", fontFamily: "monospace",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                        {this.state.error?.toString()}
                        {"\n\n"}
                        {this.state.info?.componentStack}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: "#FFD600", color: "#0a0a0a", border: "none",
                            borderRadius: 8, padding: "10px 24px", fontSize: 14,
                            fontWeight: 700, cursor: "pointer",
                        }}
                    >
                        Reload app
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}