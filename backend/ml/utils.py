import json
import logging
from pathlib import Path
from typing import Any, Dict

import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def load_params(params_path: str = "params.yaml") -> Dict[str, Any]:
    path = Path(params_path)
    if not path.exists():
        raise FileNotFoundError(f"Parameters file not found at: {params_path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_json(data: Dict[str, Any], output_path: str) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def load_json(input_path: str) -> Dict[str, Any]:
    path = Path(input_path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found at: {input_path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
