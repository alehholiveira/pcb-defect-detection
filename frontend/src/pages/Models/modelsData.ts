// Import assets
import classDistributionImg from '../../assets/models/class_distribution.png';
import yolo11TrainingImg from '../../assets/models/yolo11_training.png';
import yolo11PredictionImg from '../../assets/models/yolo11_prediction.png';
import fasterrcnnTrainingImg from '../../assets/models/fasterrcnn_training.png';
import fasterrcnnPredictionImg from '../../assets/models/fasterrcnn_prediction.jpg';
import retinanetTrainingImg from '../../assets/models/retinanet_training.png';
import retinanetPredictionImg from '../../assets/models/retinanet_prediction.jpg';
import rtdetrTrainingImg from '../../assets/models/rtdetr_training.png';
import rtdetrPredictionImg from '../../assets/models/rtdetr_prediction.png';

export { classDistributionImg };

export interface ModelMetricRow {
  architecture: string;
  structure: string;
  map50: number;
  f1Max: number;
  precision: number;
  recall: number;
  badgeKey?: string;
  isBest?: Record<string, boolean>;
}

export const COMPARATIVE_METRICS: ModelMetricRow[] = [
  {
    architecture: 'YOLOv11',
    structure: 'Single-stage (CNN)',
    map50: 0.9836,
    f1Max: 0.9884,
    precision: 0.9706,
    recall: 0.9713,
    badgeKey: 'bestSpeed',
    isBest: {
      map50: true,
      f1Max: true,
      precision: true,
    },
  },
  {
    architecture: 'Faster R-CNN',
    structure: 'Two-stage (ResNet50 V2)',
    map50: 0.9752,
    f1Max: 0.9652,
    precision: 0.9334,
    recall: 0.9765,
    badgeKey: 'bestRecall',
    isBest: {
      recall: true,
    },
  },
  {
    architecture: 'RetinaNet',
    structure: 'Single-stage (Focal Loss / ResNet50 V1)',
    map50: 0.9745,
    f1Max: 0.9679,
    precision: 0.8306,
    recall: 0.9423,
    badgeKey: 'bestBackground',
    isBest: {},
  },
  {
    architecture: 'RT-DETR',
    structure: 'Transformer (End-to-End)',
    map50: 0.9657,
    f1Max: 0.9690,
    precision: 0.9324,
    recall: 0.9528,
    badgeKey: 'bestInnovation',
    isBest: {},
  },
];

export interface ModelDetail {
  id: string;
  trainingImage: string;
  predictionImage: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const MODELS_DETAILS: ModelDetail[] = [
  {
    id: 'yolo',
    trainingImage: yolo11TrainingImg,
    predictionImage: yolo11PredictionImg,
    badgeVariant: 'success',
  },
  {
    id: 'fasterrcnn',
    trainingImage: fasterrcnnTrainingImg,
    predictionImage: fasterrcnnPredictionImg,
    badgeVariant: 'info',
  },
  {
    id: 'retinanet',
    trainingImage: retinanetTrainingImg,
    predictionImage: retinanetPredictionImg,
    badgeVariant: 'warning',
  },
  {
    id: 'rtdetr',
    trainingImage: rtdetrTrainingImg,
    predictionImage: rtdetrPredictionImg,
    badgeVariant: 'neutral',
  },
];
