#!/usr/bin/env python3
"""Export OpenAPI 3.x spec to YAML for versioning and MCP/CodePlugins consumption."""
import json
import sys
from pathlib import Path

# Add src to path so app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from app.main import app

try:
    import yaml
except ImportError:
    # Output JSON if PyYAML not installed
    out = app.openapi()
    dest = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "openapi.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2))
    print(f"Wrote {dest}")
    sys.exit(0)

out = app.openapi()
dest_yaml = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "openapi.yaml"
dest_yaml.parent.mkdir(parents=True, exist_ok=True)
dest_yaml.write_text(yaml.dump(out, default_flow_style=False, sort_keys=False))
print(f"Wrote {dest_yaml}")
