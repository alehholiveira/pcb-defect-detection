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
  f1Macro: number;
  precision: number;
  recall: number;
  badgeKey?: string;
  isBest?: Record<string, boolean>;
}

export const COMPARATIVE_METRICS: ModelMetricRow[] = [
  {
    architecture: 'YOLOv11',
    structure: 'Single-stage (CNN)',
    map50: 0.9844844141013503,
    f1Macro: 0.9734437137789033,
    precision: 0.9634779009640781,
    recall: 0.9838028052503857,
    badgeKey: 'bestPrecisionF1',
    isBest: {
      f1Macro: true,
      precision: true,
    },
  },
  {
    architecture: 'Faster R-CNN',
    structure: 'Two-stage (ResNet50 V2)',
    map50: 0.9864081099693931,
    f1Macro: 0.9034392309137491,
    precision: 0.8303441038737995,
    recall: 0.9924241792122109,
    badgeKey: 'bestMapRecall',
    isBest: {
      map50: true,
      recall: true,
    },
  },
  {
    architecture: 'RetinaNet',
    structure: 'Single-stage (Focal Loss / ResNet50 V1)',
    map50: 0.8690438949064078,
    f1Macro: 0.6901518793641794,
    precision: 0.5632372357430402,
    recall: 0.9318978296235602,
    isBest: {},
  },
  {
    architecture: 'RT-DETR',
    structure: 'Transformer (End-to-End)',
    map50: 0.9844643939815079,
    f1Macro: 0.9381490515327958,
    precision: 0.8945685895500612,
    recall: 0.9876643854818291,
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
