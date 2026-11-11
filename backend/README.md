# PlantDoctor API

FastAPI backend for plant image analysis, scan history, plant collections, and
user profile management.

## Requirements

- Python 3.12 (the production container uses Python 3.12)
- A Supabase project
- An Anthropic API key for plant image analysis
- Docker Compose and Docker for container deployment

## Configure

From this directory, copy `.env.example` to `.env` and set:

- `SUPABASE_URL`: the project URL and JWKS endpoint used to validate ES256 and
  RS256 access tokens.
- `SUPABASE_SERVICE_KEY`: the server-only Supabase service-role key. Do not use
  a publishable/anon key here, expose this key in a browser, or commit `.env`.
- `SUPABASE_JWT_SECRET`: optional legacy HS256 secret. Leave empty when the
  project uses asymmetric signing keys; if configured, it enables HS256
  validation as a fallback. The API restricts algorithms and requires the
  `authenticated` audience and role.
- `ANTHROPIC_API_KEY`: API key for the configured Anthropic vision provider.
- `ALLOWED_ORIGINS`: comma-separated exact browser origins, with no trailing
  paths or wildcard.

`LLM_PROVIDER` defaults to `anthropic`. Gemini is currently a stub and cannot
serve analyses. The service is not ready until Supabase and Anthropic are
configured. `MAX_IMAGE_MB` defaults to 8, and `DAILY_SCAN_QUOTA` defaults to 50.
For local single-process development, `RATE_LIMIT_STORAGE_URI=memory://` is
sufficient. Use Redis for shared rate limits across workers or replicas.

## Apply database migrations

Apply the SQL files in `migrations/` to the Supabase project, in numeric order,
before starting the API:

1. `001_init.sql`
2. `002_scan_quotas.sql`

These migrations create the data tables, ownership policies, private image
storage bucket policies, and atomic daily quota reservation function. Review
and apply them through the Supabase SQL editor or your normal migration
workflow; the application does not run schema changes automatically.

## Run locally

PowerShell:

```powershell
Copy-Item .env.example .env
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive OpenAPI docs are
at `/docs`. Liveness is exposed at `/health`; `/health/ready` also checks the
configured Supabase connection and vision provider.

Run the test suite and coverage gate with:

```powershell
python -m pytest --cov=app.services --cov=app.utils --cov-report=term-missing
```

Coverage for services and utilities must be at least 80%.

## Run with Docker Compose

Create `backend/.env` from `.env.example`, configure the required credentials,
and apply the migrations. Then, from this directory, run:

```powershell
docker compose up --build
```

Compose starts the API as a non-root user and a private Redis service. Redis is
used by the API for shared rate limits and is not published to the host. The
API listens on port `8000`; override the left-hand port in `docker-compose.yml`
if that port is already in use. Stop the services with `docker compose down`.

For production, provide secrets through the deployment platform's secret
manager, restrict inbound access to the API, use HTTPS at the trusted ingress,
configure exact CORS origins, and maintain Redis availability. Do not expose
the Supabase service-role key or Redis port publicly.

## API overview

All application endpoints require a Supabase bearer access token:

- `POST /api/v1/analyze` — multipart image analysis (`image`, optional
  `language`, `plant_hint`, and `save` fields).
- `GET /api/v1/history` — keyset-paginated scan history with optional `q`,
  `status`, `limit`, and `cursor`.
- `GET` / `DELETE /api/v1/history/{scan_id}` — retrieve or remove a saved scan.
- `GET`, `POST` `/api/v1/plants`; `GET`, `PATCH`, `DELETE`
  `/api/v1/plants/{plant_id}` — manage plants.
- `POST /api/v1/plants/{plant_id}/scans/{scan_id}` — link a scan.
- `GET`, `PATCH`, `DELETE` `/api/v1/me` — read, update, or delete the current
  user's profile and data.

The profile's `language` is limited to `fr`, `en`, or `ar`; apply
`001_init.sql` to create the checked profile column. Plant analysis accepts the
same language codes as the multipart `language` field and returns generated
diagnosis content in that language.

See `requests.http` for sample requests. Image responses use short-lived signed
storage URLs. An analysis requested with `save=false` is not included in
history, and its response has `scan_id` and `image_url` set to `null`.
