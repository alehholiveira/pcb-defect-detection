import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Inference extends Model<InferAttributes<Inference>, InferCreationAttributes<Inference>> {
  declare id: CreationOptional<number>;
  declare model_name: string;
  declare inference_time_ms: number;
  declare total_detections: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Inference.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    model_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Model used for inference (yolo11, faster_rcnn, retinanet, rt_detr)',
    },
    inference_time_ms: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Total inference time in milliseconds',
    },
    total_detections: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total defects found across all images',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'inferences',
    modelName: 'Inference',
  },
);
