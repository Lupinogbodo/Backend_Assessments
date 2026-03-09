from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.briefing import Briefing
from app.schemas.briefing import BriefingCreate, BriefingResponse, MetricResponse
from app.services.briefing_service import BriefingService
from app.services.report_formatter import ReportFormatter

router = APIRouter(prefix="/briefings", tags=["briefings"])


def _briefing_to_response(briefing: Briefing) -> BriefingResponse:
    """Convert a Briefing model to a BriefingResponse schema."""
    # Extract key points and risks
    key_points = [p.content for p in sorted(briefing.points, key=lambda x: x.order_index) if p.point_type == "key_point"]
    risks = [p.content for p in sorted(briefing.points, key=lambda x: x.order_index) if p.point_type == "risk"]

    # Extract metrics
    metrics = [MetricResponse(name=m.name, value=m.value) for m in briefing.metrics] if briefing.metrics else None

    return BriefingResponse(
        id=briefing.id,
        companyName=briefing.company_name,
        ticker=briefing.ticker,
        sector=briefing.sector,
        analystName=briefing.analyst_name,
        summary=briefing.summary,
        recommendation=briefing.recommendation,
        keyPoints=key_points,
        risks=risks,
        metrics=metrics,
        generated=briefing.generated,
        generated_at=briefing.generated_at,
        created_at=briefing.created_at,
    )


@router.post("", response_model=BriefingResponse, status_code=201)
def create_briefing(briefing_data: BriefingCreate, db: Session = Depends(get_db)) -> BriefingResponse:
    """Create a new briefing with key points, risks, and optional metrics."""
    briefing = BriefingService.create_briefing(db, briefing_data)
    return _briefing_to_response(briefing)


@router.get("/{briefing_id}", response_model=BriefingResponse)
def get_briefing(briefing_id: int, db: Session = Depends(get_db)) -> BriefingResponse:
    """Retrieve a briefing by ID."""
    briefing = BriefingService.get_briefing(db, briefing_id)
    if not briefing:
        raise HTTPException(status_code=404, detail=f"Briefing with id {briefing_id} not found")
    return _briefing_to_response(briefing)


@router.post("/{briefing_id}/generate", status_code=200)
def generate_report(briefing_id: int, db: Session = Depends(get_db)) -> dict[str, str | int]:
    """Generate an HTML report for a briefing."""
    briefing = BriefingService.get_briefing(db, briefing_id)
    if not briefing:
        raise HTTPException(status_code=404, detail=f"Briefing with id {briefing_id} not found")

    # Format the briefing data into a view model
    formatter = ReportFormatter()
    view_model = formatter.format_briefing_report(briefing)

    # Render the HTML report
    html_content = formatter.render_briefing_report(view_model)

    # Update the briefing record
    briefing.generated = True
    briefing.generated_html = html_content
    briefing.generated_at = datetime.utcnow()
    db.commit()

    return {"message": "Report generated successfully", "briefing_id": briefing_id}


@router.get("/{briefing_id}/html", response_class=HTMLResponse)
def get_briefing_html(briefing_id: int, db: Session = Depends(get_db)) -> HTMLResponse:
    """Retrieve the generated HTML report for a briefing."""
    briefing = BriefingService.get_briefing(db, briefing_id)
    if not briefing:
        raise HTTPException(status_code=404, detail=f"Briefing with id {briefing_id} not found")

    if not briefing.generated or not briefing.generated_html:
        raise HTTPException(status_code=400, detail="Report has not been generated yet. Call /generate first.")

    return HTMLResponse(
        content=briefing.generated_html,
        headers={
            "Content-Disposition": f"attachment; filename=briefing_{briefing_id}.html"
        }
    )
