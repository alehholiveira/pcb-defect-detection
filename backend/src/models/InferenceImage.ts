import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type ForeignKey } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Inference } from './Inference.js';

export class InferenceImage extends Model<InferAttributes<InferenceImage>, InferCreationAttributes<InferenceImage>> {
  declare id: CreationOptional<number>;
  declare inference_id: ForeignKey<Inference['id']>;
  declare image_name: string;
  declare total_detections: number;
  declare image_url: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

InferenceImage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    inference_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'inferences',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    image_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename of the uploaded image',
    },
    total_detections: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of defects found in this image',
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Local path to the annotated image (will be S3 URL in the future)',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'inference_images',
    modelName: 'InferenceImage',
  },
);
