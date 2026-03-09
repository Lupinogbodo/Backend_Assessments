from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.briefing import Briefing, BriefingMetric, BriefingPoint
from app.schemas.briefing import BriefingCreate


class BriefingService:
    """Service for handling briefing business logic."""

    @staticmethod
    def create_briefing(db: Session, briefing_data: BriefingCreate) -> Briefing:
        """Create a new briefing with associated points and metrics."""
        # Create the main briefing record
        briefing = Briefing(
            company_name=briefing_data.companyName,
            ticker=briefing_data.ticker,
            sector=briefing_data.sector,
            analyst_name=briefing_data.analystName,
            summary=briefing_data.summary,
            recommendation=briefing_data.recommendation,
            generated=False,
        )

        db.add(briefing)
        db.flush()  # Get the briefing ID

        # Add key points
        for idx, point_content in enumerate(briefing_data.keyPoints):
            point = BriefingPoint(
                briefing_id=briefing.id,
                point_type="key_point",
                content=point_content,
                order_index=idx,
            )
            db.add(point)

        # Add risks
        for idx, risk_content in enumerate(briefing_data.risks):
            risk = BriefingPoint(
                briefing_id=briefing.id,
                point_type="risk",
                content=risk_content,
                order_index=idx,
            )
            db.add(risk)

        # Add metrics if provided
        if briefing_data.metrics:
            for metric_data in briefing_data.metrics:
                metric = BriefingMetric(
                    briefing_id=briefing.id,
                    name=metric_data.name,
                    value=metric_data.value,
                )
                db.add(metric)

        db.commit()
        db.refresh(briefing)
        return briefing

    @staticmethod
    def get_briefing(db: Session, briefing_id: int) -> Briefing | None:
        """Get a briefing by ID with all related data."""
        stmt = (
            select(Briefing)
            .where(Briefing.id == briefing_id)
            .options(selectinload(Briefing.points), selectinload(Briefing.metrics))
        )
        result = db.execute(stmt)
        return result.scalar_one_or_none()
