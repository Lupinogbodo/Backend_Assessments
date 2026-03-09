from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MetricInput(BaseModel):
    name: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)


class BriefingCreate(BaseModel):
    companyName: str = Field(..., min_length=1, alias="companyName")
    ticker: str = Field(..., min_length=1)
    sector: str = Field(..., min_length=1)
    analystName: str = Field(..., min_length=1, alias="analystName")
    summary: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    keyPoints: list[str] = Field(..., min_length=2, alias="keyPoints")
    risks: list[str] = Field(..., min_length=1)
    metrics: list[MetricInput] | None = Field(default=None)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return v.upper()

    @field_validator("keyPoints")
    @classmethod
    def validate_key_points(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("At least 2 key points are required")
        return v

    @field_validator("risks")
    @classmethod
    def validate_risks(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("At least 1 risk is required")
        return v

    @field_validator("metrics")
    @classmethod
    def validate_unique_metric_names(cls, v: list[MetricInput] | None) -> list[MetricInput] | None:
        if v is None:
            return v
        names = [metric.name for metric in v]
        if len(names) != len(set(names)):
            raise ValueError("Metric names must be unique")
        return v


class MetricResponse(BaseModel):
    name: str
    value: str

    class Config:
        from_attributes = True


class BriefingPointResponse(BaseModel):
    point_type: str
    content: str
    order_index: int

    class Config:
        from_attributes = True


class BriefingResponse(BaseModel):
    id: int
    companyName: str = Field(..., alias="companyName")
    ticker: str
    sector: str
    analystName: str = Field(..., alias="analystName")
    summary: str
    recommendation: str
    keyPoints: list[str] = Field(..., alias="keyPoints")
    risks: list[str]
    metrics: list[MetricResponse] | None = None
    generated: bool
    generated_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
