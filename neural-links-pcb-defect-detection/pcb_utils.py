"""
pcb_utils.py — Utilitários compartilhados para o projeto PCB Defect Detection.

Módulo auxiliar reutilizado pelos notebooks de treinamento e inferência
de todas as arquiteturas (YOLOv11, RT-DETR, Faster R-CNN, RetinaNet).

Autor: Alexandre Augusto Tescaro Oliveira
"""

import importlib.util
import random
import subprocess
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw


# ==============================================================================
# 1. Instalação de dependências
# ==============================================================================

def install_dependencies(required_packages: dict) -> None:
    """
    Verifica e instala pacotes Python faltantes.

    Parameters
    ----------
    required_packages : dict
        Mapeamento {nome_pip: nome_import}. Ex: {"torch": "torch", "Pillow": "PIL"}
    """
    missing = [
        pkg for pkg, module in required_packages.items()
        if importlib.util.find_spec(module) is None
    ]

    if missing:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("Dependências instaladas:", ", ".join(missing))
    else:
        print("Todas as dependências já estão instaladas.")


# ==============================================================================
# 2. Detecção de dispositivo
# ==============================================================================

def detect_device():
    """
    Detecta o melhor dispositivo disponível para inferência/treinamento.

    Returns
    -------
    device : str or int or torch.device
        Identificador do dispositivo compatível com Ultralytics e PyTorch.
    eval_device : str or int or torch.device
        Dispositivo para avaliação (CPU quando MPS, pois MPS pode causar erros).
    """
    import torch

    if torch.cuda.is_available():
        device = 0
        eval_device = 0
        print(f"Dispositivo detectado: CUDA ({torch.cuda.get_device_name(0)})")
    elif torch.backends.mps.is_available():
        device = "mps"
        eval_device = "cpu"
        print("Dispositivo detectado: Apple Silicon (MPS)")
    else:
        device = "cpu"
        eval_device = "cpu"
        print("Dispositivo detectado: CPU")

    return device, eval_device


# ==============================================================================
# 3. Busca de checkpoints
# ==============================================================================

def find_latest_checkpoint_ultralytics(runs_dir: Path) -> Path:
    """
    Busca o checkpoint `best.pt` mais recente em uma árvore do Ultralytics.

    Parameters
    ----------
    runs_dir : Path
        Diretório raiz de runs (ex: runs/detect/tcc_pcb_defect_detection/yolo11/).

    Returns
    -------
    Path
        Caminho para o best.pt mais recente.
    """
    candidates = sorted(
        runs_dir.rglob("best.pt"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            f"Nenhum arquivo best.pt encontrado em: {runs_dir}"
        )
    return candidates[0]


def find_latest_checkpoint_pytorch(runs_dir: Path):
    """
    Busca o checkpoint mais recente (best_model.pth + class_map.json)
    para modelos treinados com PyTorch puro (FasterRCNN, RetinaNet).

    Parameters
    ----------
    runs_dir : Path
        Diretório raiz de runs.

    Returns
    -------
    tuple : (run_dir, checkpoint_path, class_map_path)
    """
    run_dirs = sorted(
        [p for p in runs_dir.iterdir() if p.is_dir()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    for run_dir in run_dirs:
        checkpoint_path = run_dir / "best_model.pth"
        class_map_path = run_dir / "class_map.json"
        if checkpoint_path.exists() and class_map_path.exists():
            return run_dir, checkpoint_path, class_map_path

    raise FileNotFoundError(
        f"Nenhum run com best_model.pth + class_map.json encontrado em: {runs_dir}"
    )


# ==============================================================================
# 4. Seleção de imagens de teste
# ==============================================================================

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}


def select_test_images(
    test_dir: Path,
    sample_size: int = 10,
    extensions: set = None,
    seed: int = 42,
) -> list:
    """
    Seleciona aleatoriamente imagens de um diretório de teste.

    Parameters
    ----------
    test_dir : Path
        Diretório contendo imagens de teste.
    sample_size : int
        Quantidade de imagens a selecionar.
    extensions : set
        Extensões válidas (default: jpg, jpeg, png, bmp).
    seed : int
        Seed para reprodutibilidade.

    Returns
    -------
    list[Path]
        Lista ordenada de caminhos das imagens selecionadas.
    """
    if extensions is None:
        extensions = IMAGE_EXTENSIONS

    all_images = sorted([
        p for p in test_dir.iterdir()
        if p.suffix.lower() in extensions
    ])

    if not all_images:
        raise FileNotFoundError(
            f"Nenhuma imagem encontrada em: {test_dir}"
        )

    random.seed(seed)
    k = min(sample_size, len(all_images))
    selected = sorted(random.sample(all_images, k=k))

    print(f"Imagens selecionadas: {len(selected)} de {len(all_images)} disponíveis")
    return selected


# ==============================================================================
# 5. Verificação de data leakage
# ==============================================================================

def check_data_leakage(train_dir: Path, val_dir: Path, test_dir: Path = None) -> None:
    """
    Verifica se há sobreposição de nomes de arquivo entre splits.

    Parameters
    ----------
    train_dir : Path
        Diretório de imagens de treino.
    val_dir : Path
        Diretório de imagens de validação.
    test_dir : Path, optional
        Diretório de imagens de teste.
    """
    train_names = {p.name for p in train_dir.iterdir() if p.is_file()}
    val_names = {p.name for p in val_dir.iterdir() if p.is_file()}

    overlap_tv = train_names & val_names
    if overlap_tv:
        print(f"⚠️ Data leak detectado! {len(overlap_tv)} arquivos compartilhados entre treino e validação:")
        for name in sorted(overlap_tv)[:5]:
            print(f"  - {name}")
    else:
        print("✅ Sem data leak entre treino e validação.")

    if test_dir is not None and test_dir.exists():
        test_names = {p.name for p in test_dir.iterdir() if p.is_file()}
        overlap_tt = train_names & test_names
        overlap_vt = val_names & test_names

        if overlap_tt:
            print(f"⚠️ Data leak: {len(overlap_tt)} arquivos compartilhados entre treino e teste!")
        else:
            print("✅ Sem data leak entre treino e teste.")

        if overlap_vt:
            print(f"⚠️ Data leak: {len(overlap_vt)} arquivos compartilhados entre validação e teste!")
        else:
            print("✅ Sem data leak entre validação e teste.")


# ==============================================================================
# 6. Funções de visualização (PyTorch — FasterRCNN / RetinaNet)
# ==============================================================================

def load_image_tensor(image_path: Path):
    """
    Carrega uma imagem e retorna o objeto PIL + tensor normalizado.

    Returns
    -------
    tuple : (PIL.Image, torch.Tensor)
    """
    from torchvision.transforms import functional as TF

    image = Image.open(image_path).convert("RGB")
    tensor = TF.pil_to_tensor(image).float() / 255.0
    return image, tensor


def draw_predictions(image, prediction: dict, label_to_name: dict):
    """
    Desenha bounding boxes com scores sobre uma imagem PIL.

    Parameters
    ----------
    image : PIL.Image
        Imagem original.
    prediction : dict
        Dict com chaves 'boxes', 'scores', 'labels' (tensores).
    label_to_name : dict
        Mapeamento {label_id: class_name}.

    Returns
    -------
    PIL.Image
        Imagem com anotações.
    """
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    for box, score, label in zip(
        prediction["boxes"], prediction["scores"], prediction["labels"]
    ):
        x1, y1, x2, y2 = [float(v) for v in box.tolist()]
        label_idx = int(label.item())
        class_name = label_to_name.get(label_idx, f"class_{label_idx}")
        caption = f"{class_name}: {float(score):.2f}"

        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        text_y = y1 - 12 if y1 > 12 else y1 + 2
        draw.text((x1 + 2, text_y), caption, fill="yellow")

    return annotated


# ==============================================================================
# 7. Grid de visualização
# ==============================================================================

def display_image_grid(
    image_paths: list,
    cols: int = 3,
    rows: int = 2,
    figsize: tuple = (16, 10),
    title: str = None,
) -> None:
    """
    Exibe um grid de imagens salvas em disco.

    Parameters
    ----------
    image_paths : list[Path]
        Caminhos das imagens a exibir.
    cols : int
        Número de colunas.
    rows : int
        Número de linhas.
    figsize : tuple
        Tamanho da figura.
    title : str, optional
        Título geral do grid.
    """
    if not image_paths:
        print("Nenhuma imagem para exibir.")
        return

    fig, axes = plt.subplots(rows, cols, figsize=figsize)
    axes = axes.flatten()

    for i, ax in enumerate(axes):
        if i < len(image_paths):
            img = Image.open(image_paths[i]).convert("RGB")
            ax.imshow(np.array(img))
            ax.set_title(Path(image_paths[i]).name, fontsize=9)
        ax.axis("off")

    if title:
        fig.suptitle(title, fontsize=14, fontweight="bold")

    plt.tight_layout()
    plt.show()
    plt.close(fig)


# ==============================================================================
# 8. Exportação de resultados
# ==============================================================================

def export_predictions_csv(
    rows: list,
    out_dir: Path,
    filename: str = "predicoes_detalhadas.csv",
) -> pd.DataFrame:
    """
    Salva predições detalhadas em CSV e retorna o DataFrame.

    Parameters
    ----------
    rows : list[dict]
        Lista de dicionários com predições individuais.
    out_dir : Path
        Diretório de saída.
    filename : str
        Nome do arquivo CSV.

    Returns
    -------
    pd.DataFrame
    """
    df = pd.DataFrame(rows)
    csv_path = out_dir / filename
    df.to_csv(csv_path, index=False)
    print(f"Predições detalhadas salvas em: {csv_path}")
    return df


def export_class_summary(
    pred_df: pd.DataFrame,
    out_dir: Path,
    class_column: str = "class_name",
    filename: str = "resumo_por_classe.csv",
) -> pd.DataFrame:
    """
    Gera e salva resumo de detecções por classe.

    Parameters
    ----------
    pred_df : pd.DataFrame
        DataFrame de predições (output de export_predictions_csv).
    out_dir : Path
        Diretório de saída.
    class_column : str
        Nome da coluna de classe.
    filename : str
        Nome do arquivo CSV.

    Returns
    -------
    pd.DataFrame
    """
    summary = (
        pred_df.dropna(subset=[class_column])
        .groupby(class_column)
        .size()
        .reset_index(name="detections")
        .sort_values("detections", ascending=False)
    )
    csv_path = out_dir / filename
    summary.to_csv(csv_path, index=False)
    print(f"Resumo por classe salvo em: {csv_path}")
    return summary
