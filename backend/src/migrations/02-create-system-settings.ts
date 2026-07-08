import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('system_settings', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
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

  // Inserir valores padrão (todos ativados inicialmente)
  await queryInterface.bulkInsert('system_settings', [
    { 
      key: 'report_schedule_daily',   
      value: 'true', 
      description: 'Enable daily report generation',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      key: 'report_schedule_weekly',  
      value: 'true', 
      description: 'Enable weekly report generation',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      key: 'report_schedule_monthly', 
      value: 'true', 
      description: 'Enable monthly report generation',
      created_at: new Date(),
      updated_at: new Date()
    },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('system_settings');
}
