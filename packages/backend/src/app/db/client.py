"""DynamoDB client. Table name from TABLE_NAME env. Use Table resource for native Python types."""

import os
import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.config import Config
from app.config import settings

_resource = None
_client = None
_serializer = TypeSerializer()


def get_table_name() -> str:
    name = settings.table_name or os.environ.get("TABLE_NAME", "")
    if not name:
        raise RuntimeError("TABLE_NAME is not set")
    return name


def get_resource():
    global _resource
    if _resource is None:
        _resource = boto3.resource("dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 3}))
    return _resource


def get_table():
    return get_resource().Table(get_table_name())


def get_doc_client():
    """Low-level DynamoDB client for transact_write_items and raw operations."""
    global _client
    if _client is None:
        _client = boto3.client("dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 3}))
    return _client


def serialize_item(item: dict) -> dict:
    """Convert a Python dict to DynamoDB JSON for the low-level client."""
    return {k: _serializer.serialize(v) for k, v in item.items() if v is not None}
