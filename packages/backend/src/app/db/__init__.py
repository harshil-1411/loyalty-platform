"""DynamoDB client and key helpers. Aligned with docs/DYNAMODB_KEYS.md."""

from app.db.client import get_table_name, get_doc_client, get_table, serialize_item
from app.db.keys import key

__all__ = ["get_table_name", "get_doc_client", "get_table", "serialize_item", "key"]
