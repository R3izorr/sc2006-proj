from pathlib import Path
from ..models.kernel_config import KernelConfig

def save_config(path: Path, cfg: KernelConfig) -> None:
    path.write_text(cfg.model_dump_json(indent=2), encoding="utf-8")

def load_config(path: Path) -> KernelConfig:
    try:
        return KernelConfig.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception:
        return KernelConfig()


