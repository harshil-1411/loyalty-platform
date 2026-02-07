"""Hello endpoint models."""

from pydantic import BaseModel


class HelloResponse(BaseModel):
    message: str
    version: str = "v1"
