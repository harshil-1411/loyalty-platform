"""Pytest fixtures: TestClient, mocked DynamoDB (moto)."""
import os
import pytest
from fastapi.testclient import TestClient

# Ensure we use moto before app imports boto3
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("TABLE_NAME", "loyalty-test")


@pytest.fixture(scope="module")
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def table_name():
    return "loyalty-test"


@pytest.fixture
def mock_dynamodb(table_name):
    with pytest.MonkeyPatch.context() as m:
        m.setenv("TABLE_NAME", table_name)
        yield
