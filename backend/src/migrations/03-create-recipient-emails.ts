import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Creates the recipient_emails table to store email addresses
 * that are registered to receive automated defect reports.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('recipient_emails', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('recipient_emails');
}
