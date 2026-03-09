# API Testing Guide

This guide provides example API calls to test both services.

## Part A: Python Service (Port 8000)

### 1. Create a Briefing

```bash
curl -X POST http://localhost:8000/briefings \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Holdings",
    "ticker": "acme",
    "sector": "Industrial Technology",
    "analystName": "Jane Doe",
    "summary": "Acme is benefiting from strong enterprise demand and improving operating leverage, though customer concentration remains a near-term risk.",
    "recommendation": "Monitor for margin expansion and customer diversification before increasing exposure.",
    "keyPoints": [
      "Revenue grew 18% year-over-year in the latest quarter.",
      "Management raised full-year guidance.",
      "Enterprise subscriptions now account for 62% of recurring revenue."
    ],
    "risks": [
      "Top two customers account for 41% of total revenue.",
      "International expansion may pressure margins over the next two quarters."
    ],
    "metrics": [
      { "name": "Revenue Growth", "value": "18%" },
      { "name": "Operating Margin", "value": "22.4%" },
      { "name": "P/E Ratio", "value": "28.1x" }
    ]
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "companyName": "Acme Holdings",
  "ticker": "ACME",
  "sector": "Industrial Technology",
  "analystName": "Jane Doe",
  "summary": "Acme is benefiting from strong enterprise demand...",
  "recommendation": "Monitor for margin expansion...",
  "keyPoints": [...],
  "risks": [...],
  "metrics": [...],
  "generated": false,
  "generated_at": null,
  "created_at": "2024-03-09T10:00:00Z"
}
```

### 2. Get a Briefing

```bash
curl http://localhost:8000/briefings/1
```

### 3. Generate Report

```bash
curl -X POST http://localhost:8000/briefings/1/generate
```

**Expected Response:**
```json
{
  "message": "Report generated successfully",
  "briefing_id": 1
}
```

### 4. Get HTML Report

```bash
curl http://localhost:8000/briefings/1/html
```

Or open in browser: `http://localhost:8000/briefings/1/html`

### Validation Tests

#### Test: Insufficient Key Points (should fail)

```bash
curl -X POST http://localhost:8000/briefings \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Corp",
    "ticker": "TEST",
    "sector": "Technology",
    "analystName": "John Smith",
    "summary": "Test summary",
    "recommendation": "Test recommendation",
    "keyPoints": ["Only one point"],
    "risks": ["Risk 1"]
  }'
```

**Expected:** 422 Unprocessable Entity

#### Test: Duplicate Metric Names (should fail)

```bash
curl -X POST http://localhost:8000/briefings \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Corp",
    "ticker": "TEST",
    "sector": "Technology",
    "analystName": "John Smith",
    "summary": "Test summary",
    "recommendation": "Test recommendation",
    "keyPoints": ["Point 1", "Point 2"],
    "risks": ["Risk 1"],
    "metrics": [
      { "name": "Revenue", "value": "100M" },
      { "name": "Revenue", "value": "200M" }
    ]
  }'
```

**Expected:** 422 Unprocessable Entity

---

## Part B: TypeScript Service (Port 3000)

**Note:** All endpoints require authentication headers:
- `x-user-id`: User identifier
- `x-workspace-id`: Workspace identifier

### Setup: Create a Candidate First

You need a candidate to work with. Use the sample endpoints or create one through the database:

```bash
# Create a candidate (using sample endpoint)
curl -X POST http://localhost:3000/sample/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com"
  }'
```

**Note the candidate ID from the response for the following steps.**

### 1. Upload a Document

```bash
curl -X POST http://localhost:3000/candidates/CANDIDATE_ID/documents \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123" \
  -d '{
    "documentType": "resume",
    "fileName": "john_doe_resume.pdf",
    "rawText": "John Doe\nSoftware Engineer\n\nEXPERIENCE:\nSenior Software Engineer at Tech Corp (2020-Present)\n- Led development of microservices architecture\n- Managed team of 5 engineers\n- Implemented CI/CD pipelines\n\nSoftware Engineer at StartupXYZ (2018-2020)\n- Built RESTful APIs using Node.js\n- Developed React frontend applications\n\nSKILLS:\n- JavaScript, TypeScript, Python\n- Node.js, React, NestJS\n- AWS, Docker, Kubernetes\n- PostgreSQL, MongoDB\n\nEDUCATION:\nB.S. Computer Science, University of Technology, 2018"
  }'
```

### 2. Upload Another Document (Optional)

```bash
curl -X POST http://localhost:3000/candidates/CANDIDATE_ID/documents \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123" \
  -d '{
    "documentType": "cover_letter",
    "fileName": "john_doe_cover_letter.pdf",
    "rawText": "Dear Hiring Manager,\n\nI am excited to apply for the Senior Software Engineer position. With over 6 years of experience in full-stack development and a proven track record of leading successful projects, I believe I would be a valuable addition to your team.\n\nMy experience at Tech Corp has given me deep expertise in microservices architecture and team leadership. I am passionate about building scalable systems and mentoring junior developers.\n\nI look forward to discussing how my skills align with your needs.\n\nBest regards,\nJohn Doe"
  }'
```

### 3. Request Summary Generation

```bash
curl -X POST http://localhost:3000/candidates/CANDIDATE_ID/summaries/generate \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123"
```

**Expected Response:**
```json
{
  "id": "summary-uuid",
  "candidateId": "candidate-uuid",
  "status": "pending",
  "message": "Summary generation queued"
}
```

### 4. Check Summary Status (wait a few seconds)

```bash
curl http://localhost:3000/candidates/CANDIDATE_ID/summaries/SUMMARY_ID \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123"
```

**Expected Response (after processing):**
```json
{
  "id": "summary-uuid",
  "candidateId": "candidate-uuid",
  "status": "completed",
  "score": 78,
  "strengths": [
    "Strong technical background with 6+ years of experience",
    "Leadership experience managing engineering teams",
    "Diverse technology stack expertise"
  ],
  "concerns": [
    "Limited information about system design at scale",
    "Would benefit from examples of handling production incidents"
  ],
  "summary": "John is a strong mid-to-senior level candidate with solid full-stack experience and demonstrated leadership capabilities. His background in microservices and team management aligns well with senior engineering roles.",
  "recommendedDecision": "advance",
  "provider": "gemini-1.5-flash",
  "promptVersion": "v1.0",
  "createdAt": "2024-03-09T10:00:00Z",
  "updatedAt": "2024-03-09T10:00:05Z"
}
```

### 5. List All Summaries

```bash
curl http://localhost:3000/candidates/CANDIDATE_ID/summaries \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123"
```

### Access Control Tests

#### Test: Access Different Workspace (should fail)

```bash
curl http://localhost:3000/candidates/CANDIDATE_ID/summaries \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: wrong-workspace-456"
```

**Expected:** 403 Forbidden

#### Test: Missing Auth Headers (should fail)

```bash
curl http://localhost:3000/candidates/CANDIDATE_ID/summaries
```

**Expected:** 401 Unauthorized

---

