import json
import logging
from pathlib import Path
from typing import Any, Dict

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def load_params(params_path: str = "params.yaml") -> Dict[str, Any]:
    path = Path(params_path)
    if not path.exists():
        root_path = Path(__file__).resolve().parents[2] / params_path
        if root_path.exists():
            path = root_path
        else:
            return {}
    try:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            return loaded if isinstance(loaded, dict) else {}
    except Exception:
        return {}


def save_json(data: Any, output_path: str) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def load_json(input_path: str) -> Any:
    path = Path(input_path)
    if not path.exists():
        root_path = Path(__file__).resolve().parents[2] / input_path
        if root_path.exists():
            path = root_path
        else:
            raise FileNotFoundError(f"JSON file not found at: {input_path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
