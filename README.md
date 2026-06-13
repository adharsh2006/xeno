# BrewCo CRM — AI-Native Mini CRM

> Built for the Xeno Engineering Take-Home Assignment

A full-stack AI-native Mini CRM that helps consumer brands (like a coffee chain, D2C label, or retail brand) intelligently reach their shoppers across WhatsApp, Email, SMS, and RCS.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│             Frontend (React + Vite + Tailwind)               │
│                     Port 5173                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/Axios
┌──────────────────────▼──────────────────────────────────────┐
│                Backend (FastAPI)  Port 8000                  │
│  Customers │ Segments │ Campaigns │ AI │ Receipts            │
│                    PostgreSQL DB                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /send
┌──────────────────────▼──────────────────────────────────────┐
│           Channel Service (FastAPI)  Port 8001               │
│  Simulates delivery → callbacks via POST /receipts          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | FastAPI | Async support for background tasks, auto OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Mature, type-safe, great async story |
| AI | Anthropic Claude Sonnet | Best instruction following for structured JSON + copywriting |
| Segment engine | SQL filter translation | Real-time, no sync lag, trivially extensible |
| Channel simulation | Separate service | Models real-world separation; forces you to think about retries/ordering |
| Delivery callbacks | Retry with exponential backoff | Handles transient failures; 1s→2s→4s |
| Frontend state | React hooks + polling | Simple, no Redux overhead; polling every 3-5s for live updates |

### Scale Tradeoffs

- **Current**: Synchronous PostgreSQL, simple background tasks. Works up to ~10K campaigns/day.
- **At Scale**: Move to Celery + Redis for campaign queuing, Kafka for receipt callbacks, read replicas for analytics queries. Segment queries would benefit from materialized views or a dedicated analytics DB.

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node 20+
- PostgreSQL 14+ running locally
- Anthropic API key

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and ANTHROPIC_API_KEY
pip install -r requirements.txt
python seed.py          # Seeds 500 Indian customers
uvicorn main:app --reload --port 8000
```

### 2. Channel Service

```bash
cd channel-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # Set VITE_API_URL=http://localhost:8000
npm run dev             # Opens at http://localhost:5173
```

---

## 🐳 Docker Compose

```bash
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY in backend/.env
docker-compose up --build
```

Access at: http://localhost:5173

---

## 🚂 Railway Deployment

Each service is deployed as a separate Railway service:

1. **PostgreSQL** — Railway Postgres plugin
2. **Backend** — `backend/` directory, Dockerfile, set env vars
3. **Channel Service** — `channel-service/` directory, set `CRM_URL` to backend URL
4. **Frontend** — `frontend/` directory, set `VITE_API_URL` to backend URL

### Environment Variables

#### Backend
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `CHANNEL_SERVICE_URL` | URL of the channel service |

#### Channel Service
| Variable | Description |
|----------|-------------|
| `CRM_URL` | URL of the main backend (for callbacks) |

#### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL for API calls |

---

## 📊 Features

### Customer Management
- 500 seeded realistic Indian customers with 6-month purchase history
- Paginated, searchable customer list
- Click-through profile drawer with order history
- JSON bulk import

### AI-Native Segmentation
- **Natural language → SQL filters**: "Customers who spent over ₹5000 but haven't bought in 60 days"
- Manual filter builder with live preview
- Segment customer count, filter tags, launch-to-campaign shortcut

### Campaign Engine
- 4-step campaign creation: Segment → Channel → Message → Launch
- AI message drafting using customer profile + campaign context
- Background launch task: loops customers, calls channel service
- Live funnel tracking with 3s polling during active campaigns

### Channel Service (Stub)
- Simulates realistic delivery: 90% delivered, 70% opened, 40% clicked, 35% converted
- Async callbacks with 3-retry exponential backoff (1s → 2s → 4s)
- Each status update triggers a POST /receipts to update campaign stats

### AI Copilot
- Dashboard chat: NL segment queries
- Segment builder: AI-powered audience creation
- Message composer: AI-drafted channel-specific messages
- Campaign insights: 2-3 sentence performance summary

### Analytics
- Bar charts by channel (sent/delivered/opened)
- Open rate & click rate comparison
- Campaign performance table
- Overall funnel pie chart

---

## 🏛️ Project Structure

```
xeno-crm/
├── backend/
│   ├── main.py           # FastAPI app + CORS + routes
│   ├── database.py       # SQLAlchemy setup
│   ├── models.py         # ORM models
│   ├── schemas.py        # Pydantic schemas
│   ├── filter_engine.py  # Segment → SQL translation
│   ├── seed.py           # 500 customer seed script
│   ├── routers/
│   │   ├── customers.py
│   │   ├── segments.py
│   │   ├── campaigns.py  # Launch background task
│   │   ├── receipts.py   # Callback handler
│   │   └── ai.py         # Anthropic Claude endpoints
│   └── Dockerfile
├── channel-service/
│   ├── main.py           # Delivery simulator
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Customers, Segments, Campaigns, Analytics
│   │   ├── components/   # Layout, Sidebar
│   │   ├── context/      # ToastContext
│   │   ├── hooks/        # useCountUp, useDebounce, usePolling
│   │   ├── api.js        # Axios API client
│   │   └── utils.js      # Formatters, badge configs
│   └── Dockerfile
└── docker-compose.yml
```
