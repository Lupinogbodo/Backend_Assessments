from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.briefing import Briefing

_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"


class ReportViewModel:
    """View model for briefing report rendering."""

    def __init__(
        self,
        report_title: str,
        company_name: str,
        ticker: str,
        sector: str,
        analyst_name: str,
        summary: str,
        recommendation: str,
        key_points: list[str],
        risks: list[str],
        metrics: list[dict[str, str]] | None,
        generated_timestamp: str,
    ):
        self.report_title = report_title
        self.company_name = company_name
        self.ticker = ticker
        self.sector = sector
        self.analyst_name = analyst_name
        self.summary = summary
        self.recommendation = recommendation
        self.key_points = key_points
        self.risks = risks
        self.metrics = metrics
        self.generated_timestamp = generated_timestamp


class ReportFormatter:
    """Starter formatter utility for future report-generation work."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(enabled_extensions=("html", "xml"), default_for_string=True),
        )

    def render_base(self, title: str, body: str) -> str:
        template = self._env.get_template("base.html")
        return template.render(title=title, body=body, generated_at=self.generated_timestamp())

    def render_briefing_report(self, view_model: ReportViewModel) -> str:
        """Render a briefing report using the view model."""
        template = self._env.get_template("briefing_report.html")
        return template.render(
            report_title=view_model.report_title,
            company_name=view_model.company_name,
            ticker=view_model.ticker,
            sector=view_model.sector,
            analyst_name=view_model.analyst_name,
            summary=view_model.summary,
            recommendation=view_model.recommendation,
            key_points=view_model.key_points,
            risks=view_model.risks,
            metrics=view_model.metrics,
            generated_timestamp=view_model.generated_timestamp,
        )

    def format_briefing_report(self, briefing: Briefing) -> ReportViewModel:
        """Transform a Briefing entity into a ReportViewModel for rendering."""
        # Sort points by order_index
        key_points = sorted(
            [p for p in briefing.points if p.point_type == "key_point"],
            key=lambda p: p.order_index,
        )
        risks = sorted(
            [p for p in briefing.points if p.point_type == "risk"],
            key=lambda p: p.order_index,
        )

        # Extract content from points
        key_points_content = [p.content for p in key_points]
        risks_content = [p.content for p in risks]

        # Format metrics if present
        metrics_data = None
        if briefing.metrics:
            metrics_data = [{"name": m.name, "value": m.value} for m in briefing.metrics]

        # Generate report title
        report_title = f"Investment Briefing: {briefing.company_name} ({briefing.ticker})"

        # Generate timestamp
        timestamp = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

        return ReportViewModel(
            report_title=report_title,
            company_name=briefing.company_name,
            ticker=briefing.ticker,
            sector=briefing.sector,
            analyst_name=briefing.analyst_name,
            summary=briefing.summary,
            recommendation=briefing.recommendation,
            key_points=key_points_content,
            risks=risks_content,
            metrics=metrics_data,
            generated_timestamp=timestamp,
        )

    @staticmethod
    def generated_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()
