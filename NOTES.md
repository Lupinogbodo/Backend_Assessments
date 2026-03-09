# Design Notes and Decisions

This document outlines the key design decisions, schema choices, and tradeoffs made during the implementation of the backend engineering assessment.

## Part A: Python Service - Briefing Reports

### Database Schema Decisions

#### Three-Table Normalized Design

**Tables:**
1. `briefings` - Main briefing records
2. `briefing_points` - Stores both key points and risks
3. `briefing_metrics` - Stores optional metrics

**Rationale:**
- **Normalized design** prevents data duplication and ensures data integrity
- **Single `briefing_points` table** with a `point_type` discriminator ('key_point' vs 'risk') reduces table count while maintaining clear separation
- **Separate metrics table** with a unique constraint on `(briefing_id, name)` enforces metric name uniqueness at the database level
- **`order_index` field** preserves the insertion order of points and risks for consistent display

**Alternative Considered:**
- JSON columns for points/risks/metrics would be simpler but:
  - Harder to query and validate
  - Less type-safe
  - Doesn't enforce constraints at DB level

### Validation Strategy

**Implementation:**
- Pydantic schemas handle all input validation
- Field validators ensure:
  - Ticker normalization (uppercase)
  - Minimum 2 key points
  - Minimum 1 risk
  - Unique metric names
- Database constraints provide a second layer of validation

**Benefits:**
- Early validation at API boundary
- Clear error messages for API consumers
- Type safety throughout the application

### Service Layer Design

**ReportFormatter Service:**
- Separates data transformation from API logic
- `format_briefing_report()` transforms ORM models into a `ReportViewModel`
- View model provides:
  - Sorted points and risks
  - Formatted metrics
  - Report metadata (title, timestamp)
  - Clean separation of concerns

**Reasoning:**
- Controllers shouldn't pass raw database models to templates
- Formatting logic is testable independently
- Easy to extend with additional transformations

### HTML Rendering

**Implementation:**
- Jinja2 templates with autoescaping enabled
- Semantic HTML5 structure
- Embedded CSS for portability
- Responsive design with print-friendly styles

**Design Choices:**
- **Semantic sections** for each report component
- **Color-coded sections** (summary in yellow, recommendation in green)
- **Professional typography** with clear hierarchy
- **Gradient header** for visual appeal
- **Grid layout** for company info ensures clean alignment
- **Conditional rendering** handles missing metrics gracefully

**Tradeoffs:**
- Embedded CSS increases file size but ensures the report is self-contained
- No external dependencies means reports render consistently anywhere

### API Design

**Endpoint Structure:**
- RESTful resource-based design
- `/briefings` for collection operations
- `/briefings/{id}` for individual resources
- `/briefings/{id}/generate` for report generation action
- `/briefings/{id}/html` for rendered output

**Status Tracking:**
- `generated` boolean flag prevents re-generation confusion
- `generated_at` timestamp for audit trails
- `generated_html` stores the rendered report for fast retrieval

---

## Part B: TypeScript Service - Candidate Summaries

### Database Schema Decisions

#### Entities

**`candidate_documents`:**
- Simple document storage with text extraction
- `storage_key` simulates cloud storage paths
- `raw_text` holds extracted document content
- Foreign key to `sample_candidates` with CASCADE delete

**`candidate_summaries`:**
- Comprehensive status tracking (pending/completed/failed)
- NULL-able result fields (populated only on success)
- `provider` and `prompt_version` for LLM tracking
- `error_message` for debugging failed generations
- Separate `created_at` and `updated_at` timestamps

**Design Rationale:**
- Documents and summaries are independent entities
- One candidate can have multiple documents and summaries
- Status-driven workflow enables async processing
- Rich metadata supports debugging and auditing

### LLM Provider Abstraction

**Architecture:**
```
SummarizationProvider (interface)
    ├── GeminiSummarizationProvider (real)
    └── FakeSummarizationProvider (testing)
```

**Key Design Points:**
1. **Interface-based design** allows easy swapping of providers
2. **Factory pattern** in `LlmModule` selects provider based on env var
3. **Structured output** from Gemini using JSON mode
4. **Validation layer** ensures LLM output conforms to schema
5. **Error handling** gracefully handles malformed responses

**Gemini Implementation:**
- Uses `gemini-1.5-flash` for speed and cost efficiency
- JSON response mode for structured output
- Detailed prompt engineering for consistent results
- Validation of score range (0-100) and decision values

**Benefits:**
- Tests don't require API keys or network calls
- Easy to add new providers (OpenAI, Claude, etc.)
- Centralized prompt management
- Type-safe LLM interactions

### Queue/Worker Pattern

**Implementation:**
1. API endpoint creates pending summary record
2. Job is enqueued with `summaryId` and `candidateId`
3. Worker polls queue every 2 seconds
4. Worker processes jobs asynchronously
5. Summary status updated to completed/failed

**Design Choices:**
- **In-memory queue** (simple for assessment, production would use Redis/BullMQ)
- **Polling interval** balances responsiveness with resource usage
- **Status transitions** prevent duplicate processing
- **Error capture** stores error messages for debugging

**Production Considerations:**
- Current implementation processes jobs serially
- Would use Redis/BullMQ for distributed workers
- Would add retry logic with exponential backoff
- Would implement dead letter queue for failed jobs

### Access Control

**Implementation:**
- `FakeAuthGuard` extracts user context from headers
- `CurrentUser` decorator provides type-safe access to auth user
- Service layer validates workspace ownership
- `ForbiddenException` for cross-workspace access attempts

**Security Model:**
- Every candidate belongs to exactly one workspace
- Users can only access candidates in their workspace
- Validated at service layer (not just controller)
- Database foreign keys enforce referential integrity

**Testing Strategy:**
- Auth guard can be easily mocked in tests
- Header-based auth makes testing straightforward
- Clear separation between auth and business logic

### Error Handling

**Strategies:**
1. **Domain exceptions** (NotFoundException, ForbiddenException)
2. **LLM validation errors** caught and logged
3. **Database errors** bubble up with clear messages
4. **Worker errors** captured in summary record

**Benefits:**
- Clear error messages for debugging
- Failed summaries marked explicitly
- Error context preserved for analysis

---

## Testing Strategy

### Python Service Tests

**Coverage:**
- Happy path: full workflow from creation to HTML
- Validation: all constraint checks
- Edge cases: missing metrics, invalid inputs
- Integration: database interactions with in-memory SQLite

**Approach:**
- Pytest with FastAPI TestClient
- In-memory database for isolation
- Fixtures for reusable test data
- Comprehensive validation testing

### TypeScript Service Tests

**Coverage:**
- Service-layer unit tests with mocked repositories
- Access control validation
- Workspace isolation checks
- Error handling scenarios

**Approach:**
- Jest with NestJS testing utilities
- Mocked TypeORM repositories
- Type-safe mocks
- Focus on business logic

---

## Tradeoffs and Limitations

### Python Service

**Current Limitations:**
1. No pagination on list endpoints (would add for production)
2. No full-text search on briefings
3. No versioning of reports (regeneration overwrites)
4. HTML is stored in database (could use object storage)

**Future Improvements:**
1. Add pagination and filtering
2. Implement search by ticker/company/sector
3. Add report versioning with history
4. Store HTML in S3/blob storage
5. Add PDF generation option
6. Implement email delivery

### TypeScript Service

**Current Limitations:**
1. In-memory queue (not production-ready)
2. No retry logic for failed LLM calls
3. Worker runs in same process (not scalable)
4. No rate limiting on LLM API calls
5. Documents aren't actually stored (just paths)

**Future Improvements:**
1. Replace with Redis/BullMQ for distributed queue
2. Add retry with exponential backoff
3. Deploy workers as separate processes
4. Implement circuit breaker for LLM calls
5. Add actual file storage (S3, Azure Blob)
6. Implement streaming for large documents
7. Add document parsing (PDF, DOCX)
8. Cache LLM results for identical inputs
9. Add summary comparison/history
10. Implement webhook notifications

### Cross-Cutting Concerns

**Not Implemented:**
- Authentication/authorization beyond headers
- Rate limiting
- Request logging/tracing
- Metrics/monitoring
- API versioning
- CORS configuration
- Environment-specific configs
- Database connection pooling optimization
- CI/CD pipeline
- Container orchestration

---

## Key Strengths of Implementation

1. **Clean Architecture**: Clear separation of concerns (controllers, services, repositories)
2. **Type Safety**: Strong typing throughout (Pydantic, TypeORM)
3. **Testability**: Good test coverage with proper mocking
4. **Maintainability**: Well-structured code with clear naming
5. **Extensibility**: Easy to add new features or providers
6. **Error Handling**: Comprehensive error handling with clear messages
7. **Documentation**: Detailed README and code comments
8. **Production Patterns**: Uses industry-standard patterns (repository, service layer, async workers)

---

## Assumptions

1. **Python Service:**
   - Briefings are immutable once created (no update endpoint)
   - Reports can be regenerated (overwrites previous)
   - Analyst names are free-text (not linked to user accounts)
   - Metrics are optional
   - HTML reports are self-contained (no external assets)

2. **TypeScript Service:**
   - Candidates exist before documents are uploaded
   - Document text is pre-extracted (no PDF parsing)
   - One summary per generation request (no batching)
   - LLM calls are idempotent
   - Workspace IDs are provided by external auth system

3. **General:**
   - PostgreSQL is available and properly configured
   - Network connectivity for LLM API calls
   - Single-region deployment
   - English-only content
   - Moderate traffic volume (not high-scale)

---

## Time Allocation

If more time were available, priority improvements would be:

**High Priority:**
1. Add proper queue system (BullMQ)
2. Implement retry logic with exponential backoff
3. Add request/response logging
4. Implement health checks
5. Add database indexes for common queries

**Medium Priority:**
1. Add pagination to list endpoints
2. Implement search functionality
3. Add batch operations
4. Implement caching layer
5. Add API documentation (OpenAPI/Swagger)

**Nice to Have:**
1. PDF report generation
2. Email delivery
3. Document parsing (PDF, DOCX)
4. Summary versioning/history
5. Analytics dashboard
