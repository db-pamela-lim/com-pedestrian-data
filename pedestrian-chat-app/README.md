# City of Melbourne – Pedestrian Data Chat

A **Databricks React app** with a chat interface for the **Communications team** at the City of Melbourne. The app lets users ask questions in natural language about pedestrian data that lives in your **Genie space** (backed by the data in the `Data/` folder).

## What it does

- **Chat UI**: Ask questions and get answers from your Genie space (e.g. Lygon Street, trends, event impact).
- **Suggested prompts**: One-click starters for:
  - Lygon Street pedestrian activity pre- and post-Covid
  - Trends by month and time of day
  - How events affect pedestrian activity over time
  - Weekday vs weekend and location comparisons

## Architecture

- **Frontend**: React (Vite) chat UI.
- **Backend**: Flask app that proxies requests to the **Databricks Genie Conversation API** (start conversation, follow-up messages, poll for completion).
- **Genie**: Your existing Genie room that uses the pedestrian data (e.g. from `Data/`). The backend needs the **Genie space ID** and Databricks credentials to call the API.

## Prerequisites

1. A **Genie space** already set up with your pedestrian data (the one that “houses” the `Data/` folder).
2. **Databricks** host, token, and (for the Genie API) a SQL warehouse that the space uses.
3. **Node.js** (for building the frontend) and **Python 3.10+** (for the backend).

## Local development

### 1. Backend (Genie proxy)

```bash
cd pedestrian-chat-app/backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Set environment variables (or use a `.env` file with something like `python-dotenv` if you add it):

- `DATABRICKS_SERVER_HOSTNAME` – e.g. `your-workspace.cloud.databricks.com`
- `DATABRICKS_TOKEN` – your Databricks token
- `GENIE_SPACE_ID` – the Genie space ID that has your pedestrian data

Run the backend:

```bash
python main.py
```

By default it runs on **http://localhost:5000**. It will serve the React app only if `frontend/dist` exists (see step 2).

### 2. Frontend (React)

```bash
cd pedestrian-chat-app/frontend
npm install
npm run dev
```

This runs the UI on **http://localhost:3000** with Vite’s proxy to `/api` → `http://localhost:5000`, so the chat talks to your local backend.

### 3. Production-style build (backend serves frontend)

Build the frontend:

```bash
cd pedestrian-chat-app/frontend
npm run build
```

Then run the backend from `pedestrian-chat-app/backend` as above. Open **http://localhost:5000** and the Flask app will serve the built React app and the `/api/chat` (and `/api/health`) endpoints.

## Deploying as a Databricks App

1. **Build the frontend** so that `frontend/dist` exists (see above).
2. Ensure the app’s **backend** and **frontend/dist** are included in the bundle (see `config/app.yaml`).
3. Configure the app in Databricks with:
   - **Secrets**: `databricks.host`, `databricks.token`, and (if required) Genie space ID via app env/secrets.
   - **Environment**: e.g. `GENIE_SPACE_ID` if your deployment uses env vars.
4. Deploy using the Databricks Apps CLI from the app directory (or repo root, depending on your setup):

   ```bash
   databricks apps deploy .
   ```

Once deployed, users open the app in the workspace; the backend uses the same Genie space to answer questions about pedestrian activity.

## Environment variables (backend)

| Variable                     | Description                                      |
|-----------------------------|--------------------------------------------------|
| `DATABRICKS_SERVER_HOSTNAME` | Databricks workspace host (no `https://`)        |
| `DATABRICKS_TOKEN`         | Databricks personal access or app token         |
| `GENIE_SPACE_ID`           | Genie space ID that contains your pedestrian data |
| `PORT`                     | Port for Flask (default `5000`)                  |

## API

- **GET /api/health** – Health check.
- **POST /api/chat** – Send a message to Genie.
  - Body: `{ "message": "your question", "conversation_id": "optional-for-follow-up" }`
  - Response: `{ "reply": "...", "conversation_id": "..." }`

The frontend keeps `conversation_id` in memory so follow-up questions stay in the same Genie conversation.

## Suggested questions for Communications

- How has pedestrian activity on Lygon Street changed before and after Covid?
- Show me trends in pedestrian counts by month for the last 2 years.
- What are the typical time-of-day patterns for foot traffic in the CBD?
- How did [event name] affect pedestrian activity over the surrounding days?
- Compare weekday vs weekend pedestrian volumes at key sensor locations.
- Which locations had the biggest drop in foot traffic post-Covid and which recovered most?

These are pre-loaded as suggested prompts in the chat UI; the actual answers come from your Genie space and data.
