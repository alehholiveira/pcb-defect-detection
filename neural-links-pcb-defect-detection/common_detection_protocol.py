"""Protocolo comum de augmentation e avaliação para os quatro detectores.

As rotinas deste módulo mantêm as particularidades de otimização de cada
arquitetura, mas padronizam as transformações de treino e a avaliação final.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Mapping, Sequence

import numpy as np
import torch
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from torchvision.transforms import v2


INPUT_SIZE = 640
# O resumo padrão do COCOeval (evaluator.stats) é definido para maxDets=100.
# Manter este valor separado do limite de geração evita métricas AP inválidas.
COCO_MAX_DETECTIONS = 100
PREDICTION_MAX_DETECTIONS = 300
SCORE_THRESHOLD = 0.25
MATCH_IOU_THRESHOLD = 0.50
EVALUATION_PROTOCOL_VERSION = "coco-bbox-v2"


def build_shared_train_transforms() -> v2.Compose:
    """Retorna o augmentation moderado usado pelos detectores TorchVision."""

    return v2.Compose(
        [
            v2.RandomApply(
                [
                    v2.ColorJitter(
                        brightness=0.20,
                        contrast=0.20,
                        saturation=0.20,
                        hue=0.01,
                    )
                ],
                p=0.80,
            ),
            v2.RandomHorizontalFlip(p=0.50),
            v2.RandomVerticalFlip(p=0.50),
            v2.RandomAffine(
                degrees=10.0,
                translate=(0.05, 0.05),
                scale=(0.90, 1.10),
                fill=0,
            ),
            v2.ClampBoundingBoxes(),
        ]
    )


def _xywh_to_xyxy(box: Sequence[float]) -> np.ndarray:
    x, y, width, height = map(float, box)
    return np.asarray([x, y, x + width, y + height], dtype=np.float64)


def _iou_xyxy(box_a: np.ndarray, box_b: np.ndarray) -> float:
    left_top = np.maximum(box_a[:2], box_b[:2])
    right_bottom = np.minimum(box_a[2:], box_b[2:])
    intersection_size = np.maximum(0.0, right_bottom - left_top)
    intersection = float(intersection_size[0] * intersection_size[1])

    area_a = float(max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1]))
    area_b = float(max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1]))
    union = area_a + area_b - intersection
    return intersection / union if union > 0.0 else 0.0


def _defect_categories(coco_gt: COCO) -> list[dict]:
    categories = list(coco_gt.dataset.get("categories", []))
    return [
        category
        for category in categories
        if int(category["id"]) != 0
        and str(category.get("name", "")).strip().lower() not in {"background", "fundo"}
    ]


def _fixed_threshold_metrics(
    coco_gt: COCO,
    predictions: Sequence[dict],
    score_threshold: float,
    match_iou_threshold: float,
    max_detections: int,
) -> tuple[list[dict], float, float, float]:
    categories = _defect_categories(coco_gt)
    category_ids = {int(category["id"]) for category in categories}

    ground_truth_by_key: dict[tuple[int, int], list[np.ndarray]] = defaultdict(list)
    for annotation in coco_gt.dataset.get("annotations", []):
        category_id = int(annotation["category_id"])
        if category_id not in category_ids or int(annotation.get("iscrowd", 0)) != 0:
            continue
        ground_truth_by_key[(int(annotation["image_id"]), category_id)].append(
            _xywh_to_xyxy(annotation["bbox"])
        )

    predictions_by_key: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for prediction in predictions:
        category_id = int(prediction["category_id"])
        score = float(prediction["score"])
        if category_id not in category_ids or score < score_threshold:
            continue
        predictions_by_key[(int(prediction["image_id"]), category_id)].append(
            {"score": score, "box": _xywh_to_xyxy(prediction["bbox"])}
        )

    counts = {category_id: {"tp": 0, "fp": 0, "fn": 0} for category_id in category_ids}
    all_keys = set(ground_truth_by_key) | set(predictions_by_key)

    for image_id, category_id in all_keys:
        ground_truth = ground_truth_by_key.get((image_id, category_id), [])
        predicted = sorted(
            predictions_by_key.get((image_id, category_id), []),
            key=lambda item: item["score"],
            reverse=True,
        )[:max_detections]
        matched_ground_truth: set[int] = set()

        for prediction in predicted:
            candidates = [
                (_iou_xyxy(prediction["box"], target_box), index)
                for index, target_box in enumerate(ground_truth)
                if index not in matched_ground_truth
            ]
            best_iou, best_index = max(candidates, default=(0.0, -1))
            if best_iou >= match_iou_threshold:
                counts[category_id]["tp"] += 1
                matched_ground_truth.add(best_index)
            else:
                counts[category_id]["fp"] += 1

        counts[category_id]["fn"] += len(ground_truth) - len(matched_ground_truth)

    rows = []
    for category in sorted(categories, key=lambda item: int(item["id"])):
        category_id = int(category["id"])
        tp = counts[category_id]["tp"]
        fp = counts[category_id]["fp"]
        fn = counts[category_id]["fn"]
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2.0 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        rows.append(
            {
                "category_id": category_id,
                "class_name": str(category["name"]),
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "true_positives": tp,
                "false_positives": fp,
                "false_negatives": fn,
                "support": tp + fn,
            }
        )

    macro_precision = float(np.mean([row["precision"] for row in rows])) if rows else 0.0
    macro_recall = float(np.mean([row["recall"] for row in rows])) if rows else 0.0
    macro_f1 = float(np.mean([row["f1"] for row in rows])) if rows else 0.0
    return rows, macro_precision, macro_recall, macro_f1


def evaluate_coco_predictions(
    annotation_path: str | Path,
    predictions: Sequence[dict],
    *,
    score_threshold: float = SCORE_THRESHOLD,
    match_iou_threshold: float = MATCH_IOU_THRESHOLD,
    max_detections: int = COCO_MAX_DETECTIONS,
) -> dict:
    """Avalia predições pelo protocolo COCO padrão e por métricas pontuais.

    O ``COCOeval.summarize()`` usado para preencher ``evaluator.stats`` calcula
    AP e AP50 com ``maxDets=100``. Outro valor tornaria essas posições inválidas
    ou não comparáveis ao protocolo COCO convencional.
    """

    max_detections = int(max_detections)
    if max_detections != COCO_MAX_DETECTIONS:
        raise ValueError(
            "As métricas COCO oficiais exigem max_detections=100. "
            "Calcule limites alternativos como métricas adicionais, sem "
            "substituir mAP@50:95 e mAP@50."
        )

    coco_gt = COCO(str(annotation_path))
    categories = _defect_categories(coco_gt)
    category_ids = [int(category["id"]) for category in categories]

    if predictions:
        coco_dt = coco_gt.loadRes(list(predictions))
    else:
        coco_dt = COCO()
        coco_dt.dataset = {
            "images": list(coco_gt.dataset.get("images", [])),
            "categories": list(coco_gt.dataset.get("categories", [])),
            "annotations": [],
        }
        coco_dt.createIndex()

    evaluator = COCOeval(coco_gt, coco_dt, iouType="bbox")
    evaluator.params.imgIds = sorted(coco_gt.getImgIds())
    evaluator.params.catIds = category_ids
    evaluator.params.maxDets = [1, 10, COCO_MAX_DETECTIONS]
    evaluator.evaluate()
    evaluator.accumulate()
    evaluator.summarize()

    per_class, macro_precision, macro_recall, macro_f1 = _fixed_threshold_metrics(
        coco_gt,
        predictions,
        score_threshold,
        match_iou_threshold,
        max_detections,
    )

    return {
        "map50_95": float(evaluator.stats[0]),
        "map50": float(evaluator.stats[1]),
        "precision_macro": macro_precision,
        "recall_macro": macro_recall,
        "f1_macro": macro_f1,
        "score_threshold": float(score_threshold),
        "match_iou_threshold": float(match_iou_threshold),
        "max_detections": max_detections,
        "evaluation_protocol": "COCO bbox (maxDets=100)",
        "evaluation_protocol_version": EVALUATION_PROTOCOL_VERSION,
        "per_class": per_class,
    }


def evaluate_coco_prediction_file(
    annotation_path: str | Path,
    prediction_path: str | Path,
    *,
    score_threshold: float = SCORE_THRESHOLD,
    match_iou_threshold: float = MATCH_IOU_THRESHOLD,
) -> dict:
    """Reavalia um JSON de predições existente sem executar o modelo."""

    predictions = json.loads(Path(prediction_path).read_text(encoding="utf-8"))
    if not isinstance(predictions, list):
        raise ValueError("O arquivo de predições COCO deve conter uma lista JSON.")

    return evaluate_coco_predictions(
        annotation_path,
        predictions,
        score_threshold=score_threshold,
        match_iou_threshold=match_iou_threshold,
    )


def evaluate_torchvision_coco(
    model: torch.nn.Module,
    data_loader: Iterable,
    annotation_path: str | Path,
    label_to_category_id: Mapping[int, int],
    device: torch.device,
    *,
    output_json_path: str | Path | None = None,
) -> dict:
    """Gera predições TorchVision e as avalia pelo protocolo COCO comum."""

    original_device = next(model.parameters()).device
    model.to(device)
    model.eval()
    predictions = []

    with torch.no_grad():
        for images, targets in data_loader:
            outputs = model([image.to(device) for image in images])
            for output, target in zip(outputs, targets):
                image_id = int(target["image_id"].reshape(-1)[0].item())
                boxes = output["boxes"].detach().cpu()
                scores = output["scores"].detach().cpu()
                labels = output["labels"].detach().cpu()

                for box, score, label in zip(boxes, scores, labels):
                    label_value = int(label.item())
                    if label_value not in label_to_category_id:
                        continue
                    x_min, y_min, x_max, y_max = map(float, box.tolist())
                    predictions.append(
                        {
                            "image_id": image_id,
                            "category_id": int(label_to_category_id[label_value]),
                            "bbox": [x_min, y_min, x_max - x_min, y_max - y_min],
                            "score": float(score.item()),
                        }
                    )

    model.to(original_device)
    if output_json_path is not None:
        output_path = Path(output_json_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(predictions, indent=2), encoding="utf-8")

    return evaluate_coco_predictions(annotation_path, predictions)


def evaluate_ultralytics_coco(
    model,
    images_dir: str | Path,
    annotation_path: str | Path,
    class_names: Sequence[str],
    *,
    device=0,
    input_size: int = INPUT_SIZE,
    output_json_path: str | Path | None = None,
) -> dict:
    """Gera predições Ultralytics e as avalia pelo protocolo COCO comum."""

    coco_gt = COCO(str(annotation_path))
    filename_to_image_id = {
        Path(image["file_name"]).name: int(image["id"])
        for image in coco_gt.dataset.get("images", [])
    }

    def normalize_name(name: str) -> str:
        return str(name).strip().lower().replace(" ", "_")

    category_by_name = {
        normalize_name(category["name"]): int(category["id"])
        for category in _defect_categories(coco_gt)
    }
    class_to_category_id = {
        index: category_by_name[normalize_name(name)]
        for index, name in enumerate(class_names)
        if normalize_name(name) in category_by_name
    }
    missing_classes = [
        name for index, name in enumerate(class_names) if index not in class_to_category_id
    ]
    if missing_classes:
        raise ValueError(f"Classes sem correspondência no COCO: {missing_classes}")

    predictions = []
    results = model.predict(
        source=str(images_dir),
        stream=True,
        imgsz=int(input_size),
        conf=0.001,
        max_det=PREDICTION_MAX_DETECTIONS,
        device=device,
        verbose=False,
        save=False,
    )

    for result in results:
        filename = Path(result.path).name
        if filename not in filename_to_image_id:
            raise KeyError(f"Imagem ausente no COCO: {filename}")
        image_id = filename_to_image_id[filename]
        if result.boxes is None:
            continue

        boxes = result.boxes.xyxy.detach().cpu()
        scores = result.boxes.conf.detach().cpu()
        labels = result.boxes.cls.detach().cpu().to(torch.int64)
        for box, score, label in zip(boxes, scores, labels):
            x_min, y_min, x_max, y_max = map(float, box.tolist())
            predictions.append(
                {
                    "image_id": image_id,
                    "category_id": class_to_category_id[int(label.item())],
                    "bbox": [x_min, y_min, x_max - x_min, y_max - y_min],
                    "score": float(score.item()),
                }
            )

    if output_json_path is not None:
        output_path = Path(output_json_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(predictions, indent=2), encoding="utf-8")

    return evaluate_coco_predictions(annotation_path, predictions)
