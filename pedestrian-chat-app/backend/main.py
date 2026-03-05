"""
Flask backend for City of Melbourne Pedestrian Data Chat.
Exposes /api/chat that proxies to the Genie Conversation API.
Serves the React frontend static build when running as a Databricks App.
"""
import os
from pathlib import Path
from typing import Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from genie_client import GenieClient

app = Flask(__name__, static_folder=None)
CORS(app)

# Genie client (lazy init so env is available at first request)
_genie_client: Optional[GenieClient] = None


def get_genie_client() -> GenieClient:
    global _genie_client
    if _genie_client is None:
        _genie_client = GenieClient()
    return _genie_client


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "com-pedestrian-chat"})


@app.route("/api/chat", methods=["POST"])
def chat():
    """Send a message to Genie and return the reply."""
    body = request.get_json() or {}
    message = (body.get("message") or body.get("content") or "").strip()
    conversation_id = (body.get("conversation_id") or "").strip() or None

    if not message:
        return jsonify({"error": "message is required"}), 400

    client = get_genie_client()
    result = client.chat(message, conversation_id=conversation_id)
    return jsonify(result)


# Serve React static build (for Databricks App or production)
def _static_dir() -> Optional[Path]:
    frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    if frontend_dist.is_dir():
        return frontend_dist
    return None


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the React SPA."""
    static = _static_dir()
    if not static:
        return jsonify({
            "message": "Frontend not built. Run: cd frontend && npm run build",
            "api": {"health": "/api/health", "chat": "POST /api/chat"},
        }), 404

    if not path or path == "index.html":
        return send_from_directory(static, "index.html")
    f = static / path
    if f.is_file():
        return send_from_directory(static, path)
    return send_from_directory(static, "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "0") == "1")
