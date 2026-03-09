import pytest
from fastapi.testclient import TestClient

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.config import get_settings

# Use the same PostgreSQL database as the app (or set a test DB in .env)
settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.database_url

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = None
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        if db is not None:
            db.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_briefing_data():
    return {
        "companyName": "Acme Holdings",
        "ticker": "ACME",
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand.",
        "recommendation": "Monitor for margin expansion.",
        "keyPoints": ["Revenue grew 18% year-over-year.", "Management raised full-year guidance."],
        "risks": ["Top two customers account for 41% of total revenue."],
        "metrics": [{"name": "Revenue Growth", "value": "18%"}, {"name": "Operating Margin", "value": "22.4%"}],
    }


def test_create_briefing(client, sample_briefing_data):
    """Test creating a new briefing."""
    response = client.post("/briefings", json=sample_briefing_data)
    assert response.status_code == 201
    data = response.json()
    assert data["companyName"] == "Acme Holdings"
    assert data["ticker"] == "ACME"
    assert data["generated"] is False
    assert len(data["keyPoints"]) == 2
    assert len(data["risks"]) == 1
    assert len(data["metrics"]) == 2


def test_create_briefing_normalizes_ticker(client, sample_briefing_data):
    """Test that ticker is normalized to uppercase."""
    sample_briefing_data["ticker"] = "acme"
    response = client.post("/briefings", json=sample_briefing_data)
    assert response.status_code == 201
    data = response.json()
    assert data["ticker"] == "ACME"


def test_create_briefing_validates_key_points(client, sample_briefing_data):
    """Test that at least 2 key points are required."""
    sample_briefing_data["keyPoints"] = ["Only one point"]
    response = client.post("/briefings", json=sample_briefing_data)
    assert response.status_code == 422


def test_create_briefing_validates_risks(client, sample_briefing_data):
    """Test that at least 1 risk is required."""
    sample_briefing_data["risks"] = []
    response = client.post("/briefings", json=sample_briefing_data)
    assert response.status_code == 422


def test_create_briefing_validates_unique_metrics(client, sample_briefing_data):
    """Test that metric names must be unique."""
    sample_briefing_data["metrics"] = [
        {"name": "Revenue Growth", "value": "18%"},
        {"name": "Revenue Growth", "value": "20%"},
    ]
    response = client.post("/briefings", json=sample_briefing_data)
    assert response.status_code == 422


def test_get_briefing(client, sample_briefing_data):
    """Test retrieving a briefing by ID."""
    create_response = client.post("/briefings", json=sample_briefing_data)
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == briefing_id
    assert data["companyName"] == "Acme Holdings"


def test_get_nonexistent_briefing(client):
    """Test retrieving a non-existent briefing."""
    response = client.get("/briefings/9999")
    assert response.status_code == 404


def test_generate_report(client, sample_briefing_data):
    """Test generating a report for a briefing."""
    create_response = client.post("/briefings", json=sample_briefing_data)
    briefing_id = create_response.json()["id"]

    response = client.post(f"/briefings/{briefing_id}/generate")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Report generated successfully"

    # Verify briefing is marked as generated
    get_response = client.get(f"/briefings/{briefing_id}")
    assert get_response.json()["generated"] is True


def test_get_html_before_generation(client, sample_briefing_data):
    """Test that HTML endpoint returns error before generation."""
    create_response = client.post("/briefings", json=sample_briefing_data)
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}/html")
    assert response.status_code == 400


def test_get_html_after_generation(client, sample_briefing_data):
    """Test retrieving HTML after generation."""
    create_response = client.post("/briefings", json=sample_briefing_data)
    briefing_id = create_response.json()["id"]

    # Generate the report
    client.post(f"/briefings/{briefing_id}/generate")

    # Get the HTML
    response = client.get(f"/briefings/{briefing_id}/html")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Acme Holdings" in response.text
    assert "ACME" in response.text


def test_briefing_without_metrics(client):
    """Test creating a briefing without metrics."""
    data = {
        "companyName": "Test Corp",
        "ticker": "TEST",
        "sector": "Technology",
        "analystName": "John Smith",
        "summary": "Test summary",
        "recommendation": "Test recommendation",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
    }
    response = client.post("/briefings", json=data)
    assert response.status_code == 201
    result = response.json()
    assert result["metrics"] is None
