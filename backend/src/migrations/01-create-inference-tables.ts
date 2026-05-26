import { type QueryInterface, DataTypes } from 'sequelize';

/**
 * Creates the 3 inference-related tables:
 * - inferences (top-level prediction result)
 * - inference_images (per-image result, FK → inferences)
 * - detections (per-defect result, FK → inference_images)
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // --- 1. inferences ---
  await queryInterface.createTable('inferences', {
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // --- 2. inference_images ---
  await queryInterface.createTable('inference_images', {
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
      comment: 'Local path to the annotated image',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // --- 3. detections ---
  await queryInterface.createTable('detections', {
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
      comment: 'Bounding box top-left X',
    },
    y1: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box top-left Y',
    },
    x2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box bottom-right X',
    },
    y2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Bounding box bottom-right Y',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
}

/**
 * Drops all 3 tables in reverse order (respecting FK constraints).
 */
export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('detections');
  await queryInterface.dropTable('inference_images');
  await queryInterface.dropTable('inferences');
}
