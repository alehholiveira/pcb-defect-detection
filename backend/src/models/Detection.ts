import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey } from 'sequelize';
import { sequelize } from '../config/database.js';
import { InferenceImage } from './InferenceImage.js';

export class Detection extends Model<InferAttributes<Detection>, InferCreationAttributes<Detection>> {
  declare id: CreationOptional<number>;
  declare inference_image_id: ForeignKey<InferenceImage['id']>;
  declare class_name: string;
  declare confidence: number;
  declare x1: number;
  declare y1: number;
  declare x2: number;
  declare y2: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Detection.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    inference_image_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'inference_images',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    class_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Defect type (mouse_bite, spur, missing_hole, short, open_circuit, spurious_copper)',
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Detection confidence score (0-1)',
    },
    x1: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box top-left X coordinate',
    },
    y1: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box top-left Y coordinate',
    },
    x2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box bottom-right X coordinate',
    },
    y2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box bottom-right Y coordinate',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'detections',
    modelName: 'Detection',
  },
);
