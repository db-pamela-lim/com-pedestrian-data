"""
Genie Conversation API client for City of Melbourne pedestrian data.
Proxies chat messages to the Databricks Genie space that houses the Data/ pedestrian data.
"""
import os
import time
import requests
from typing import Any, Dict, Optional


class GenieClient:
    """Client for Databricks Genie Conversation API."""

    def __init__(
        self,
        host: Optional[str] = None,
        token: Optional[str] = None,
        space_id: Optional[str] = None,
    ):
        self.host = (host or os.getenv("DATABRICKS_SERVER_HOSTNAME", "")).replace("https://", "").rstrip("/")
        self.token = token or os.getenv("DATABRICKS_TOKEN", "")
        self.space_id = (space_id or os.getenv("GENIE_SPACE_ID", "")).strip()
        self._base = f"https://{self.host}/api/2.0/genie/spaces/{self.space_id}" if self.host else ""

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def start_conversation(self, content: str) -> Dict[str, Any]:
        """Start a new conversation with the first user message."""
        url = f"{self._base}/start-conversation"
        resp = requests.post(
            url,
            headers=self._headers(),
            json={"content": content},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()

    def create_message(self, conversation_id: str, content: str) -> Dict[str, Any]:
        """Send a follow-up message in an existing conversation."""
        url = f"{self._base}/conversations/{conversation_id}/messages"
        resp = requests.post(
            url,
            headers=self._headers(),
            json={"content": content},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()

    def get_message(
        self,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        """Get message status and content (poll until COMPLETED or error)."""
        url = f"{self._base}/conversations/{conversation_id}/messages/{message_id}"
        resp = requests.get(url, headers=self._headers(), timeout=30)
        resp.raise_for_status()
        return resp.json()

    def wait_for_message(
        self,
        conversation_id: str,
        message_id: str,
        poll_interval: float = 1.0,
        max_wait_seconds: float = 120.0,
    ) -> Dict[str, Any]:
        """Poll until message status is COMPLETED or FAILED."""
        start = time.monotonic()
        while True:
            msg = self.get_message(conversation_id, message_id)
            status = (msg.get("status") or "").upper()
            if status == "COMPLETED":
                return msg
            if status == "FAILED":
                error = msg.get("error") or "Unknown error"
                raise RuntimeError(f"Genie message failed: {error}")
            if time.monotonic() - start > max_wait_seconds:
                raise TimeoutError("Genie response timed out")
            time.sleep(poll_interval)

    def _extract_reply(self, message: Dict[str, Any]) -> str:
        """Extract human-readable reply from Genie message attachments."""
        attachments = message.get("attachments") or []
        for att in attachments:
            if isinstance(att, dict):
                text = att.get("text") or att.get("content")
                if text:
                    return text if isinstance(text, str) else "\n".join(text) if isinstance(text, list) else str(text)
        return "No reply content returned."

    def chat(self, content: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Send a message and return the reply. If conversation_id is provided, use it for follow-up.
        Returns dict with: reply, conversation_id, message_id, attachments, query_result_id (if any).
        """
        if not self.space_id or not self.host or not self.token:
            return {
                "reply": "Genie is not configured. Set GENIE_SPACE_ID, DATABRICKS_SERVER_HOSTNAME, and DATABRICKS_TOKEN.",
                "conversation_id": None,
                "error": "config",
            }

        try:
            if conversation_id:
                data = self.create_message(conversation_id, content)
            else:
                data = self.start_conversation(content)

            conv = data.get("conversation", {})
            msg = data.get("message", {})
            cid = conv.get("id") or msg.get("conversation_id")
            mid = msg.get("id")
            if not cid or not mid:
                return {
                    "reply": "Invalid response from Genie (missing conversation or message id).",
                    "conversation_id": conversation_id,
                    "error": "response",
                }

            completed = self.wait_for_message(cid, mid)
            reply = self._extract_reply(completed)

            # Optional: include query result ID for chart/data if present
            attachments = completed.get("attachments") or []
            query_result_id = None
            for att in attachments:
                if isinstance(att, dict) and att.get("attachment_id"):
                    query_result_id = att.get("attachment_id")
                    break

            return {
                "reply": reply,
                "conversation_id": cid,
                "message_id": mid,
                "attachments": attachments,
                "query_result_id": query_result_id,
            }
        except requests.exceptions.HTTPError as e:
            body = e.response.text if e.response else str(e)
            return {
                "reply": f"Genie API error: {e.response.status_code if e.response else 'unknown'}. {body[:500]}",
                "conversation_id": conversation_id,
                "error": "http",
            }
        except (TimeoutError, RuntimeError) as e:
            return {
                "reply": str(e),
                "conversation_id": conversation_id,
                "error": "genie",
            }
        except Exception as e:
            return {
                "reply": f"Unexpected error: {e}",
                "conversation_id": conversation_id,
                "error": "unexpected",
            }
