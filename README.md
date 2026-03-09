# Backend Engineering Assessment

This repository contains the completed backend engineering assessment with two services:

- **python-service/** (InsightOps): FastAPI briefing report generator
- **ts-service/** (TalentFlow): NestJS candidate document intake and summary workflow

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Part A: Python Service - Briefing Reports](#part-a-python-service---briefing-reports)
- [Part B: TypeScript Service - Candidate Summaries](#part-b-typescript-service---candidate-summaries)
- [Running Tests](#running-tests)
- [Design Notes](#design-notes)

## Prerequisites

- **Docker** (for PostgreSQL)
- **Python 3.12+**
- **Node.js 22+**
- **npm**

## Quick Start

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with:
- Database: `assessment_db`
- User: `assessment_user`
- Password: `assessment_pass`

### 2. Setup Python Service

```bash
cd python-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run Python Migrations

```bash
# From python-service directory
python -m app.db.run_migrations
```

### 4. Start Python Service

```bash
# From python-service directory (with venv activated)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The Python service will be available at `http://localhost:8000`

### 5. Setup TypeScript Service

```bash
cd ts-service
npm install
```

### 6. Configure Gemini API (Optional but Recommended)

For real LLM summarization, get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).

Create a `.env` file in `ts-service/`:

```env
GEMINI_API_KEY=your_api_key_here
```

**Note**: If no API key is provided, the service will use a fake summarization provider for testing.

### 7. Run TypeScript Migrations

```bash
# From ts-service directory
npm run migration:run
```

### 8. Start TypeScript Service

```bash
# From ts-service directory
npm run start:dev
```

The TypeScript service will be available at `http://localhost:3000`

---

## Part A: Python Service - Briefing Reports

### Overview

The briefing report generator allows analysts to create structured investment briefings and generate professional HTML reports.

### API Endpoints

#### 1. Create a Briefing

**POST** `/briefings`

```json
{
  "companyName": "Acme Holdings",
  "ticker": "ACME",
  "sector": "Industrial Technology",
  "analystName": "Jane Doe",
  "summary": "Acme is benefiting from strong enterprise demand.",
  "recommendation": "Monitor for margin expansion.",
  "keyPoints": [
    "Revenue grew 18% year-over-year.",
    "Management raised full-year guidance."
  ],
  "risks": [
    "Top two customers account for 41% of total revenue."
  ],
  "metrics": [
    { "name": "Revenue Growth", "value": "18%" },
    { "name": "Operating Margin", "value": "22.4%" }
  ]
}
```

#### 2. Get a Briefing

**GET** `/briefings/{id}`

Returns the structured briefing data.

#### 3. Generate Report

**POST** `/briefings/{id}/generate`

Generates the HTML report and marks the briefing as generated.

#### 4. Get HTML Report

**GET** `/briefings/{id}/html`

Returns the rendered HTML report (must call generate first).

### Key Features

- ✅ Relational data modeling (briefings, points, metrics)
- ✅ Input validation (2+ key points, 1+ risk, unique metrics)
- ✅ Ticker normalization (uppercase)
- ✅ Service-layer formatting and transformation
- ✅ Server-side HTML rendering with Jinja2
- ✅ Professional report styling with CSS
- ✅ SQL migrations with up/down support

---

## Part B: TypeScript Service - Candidate Summaries

### Overview

The candidate intake system allows recruiters to upload candidate documents and request AI-powered summaries through an async workflow.

### API Endpoints

All endpoints require authentication headers:
- `x-user-id`: User identifier
- `x-workspace-id`: Workspace identifier

#### 1. Upload Candidate Document

**POST** `/candidates/:candidateId/documents`

```json
{
  "documentType": "resume",
  "fileName": "john_doe_resume.pdf",
  "rawText": "John Doe\nSoftware Engineer\n..."
}
```

#### 2. Request Summary Generation

**POST** `/candidates/:candidateId/summaries/generate`

Creates a pending summary and queues background processing.

Response:
```json
{
  "id": "summary-id",
  "candidateId": "candidate-id",
  "status": "pending",
  "message": "Summary generation queued"
}
```

#### 3. List Summaries

**GET** `/candidates/:candidateId/summaries`

Returns all summaries for a candidate.

#### 4. Get Summary

**GET** `/candidates/:candidateId/summaries/:summaryId`

Returns a specific summary with full details.

### Summary Response Format

```json
{
  "id": "summary-123",
  "candidateId": "candidate-456",
  "status": "completed",
  "score": 75,
  "strengths": [
    "Strong technical background",
    "Excellent communication skills"
  ],
  "concerns": [
    "Limited leadership experience"
  ],
  "summary": "Strong mid-level candidate with solid technical skills.",
  "recommendedDecision": "advance",
  "provider": "gemini-1.5-flash",
  "promptVersion": "v1.0",
  "createdAt": "2024-03-09T10:00:00Z",
  "updatedAt": "2024-03-09T10:01:00Z"
}
```

### Key Features

- ✅ Workspace-based access control
- ✅ Async queue/worker pattern for LLM calls
- ✅ LLM provider abstraction (Gemini + Fake for testing)
- ✅ Structured output validation from LLM
- ✅ Status tracking (pending → completed/failed)
- ✅ Error handling and logging
- ✅ TypeORM migrations

---

## Running Tests

### Python Service Tests

```bash
# From python-service directory (with venv activated)
pytest
```

Tests cover:
- Briefing creation and validation
- Ticker normalization
- Key points and risks validation
- Unique metric names
- Report generation workflow
- HTML rendering

### TypeScript Service Tests

```bash
# From ts-service directory
npm test
```

Tests cover:
- Candidates service unit tests
- Access control validation
- Document upload
- Summary generation workflow

---

## Design Notes

See [NOTES.md](NOTES.md) for detailed design decisions, tradeoffs, and future improvements.