'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CongregationMembers', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      fullName: { type: Sequelize.STRING, allowNull: false },
      gender: { type: Sequelize.ENUM('pria', 'wanita'), allowNull: false },
      birthDate: { type: Sequelize.DATEONLY },
      phone: { type: Sequelize.STRING },
      address: { type: Sequelize.TEXT },
      status: {
        type: Sequelize.ENUM('aktif', 'tidak_aktif', 'pindah', 'meninggal'),
        allowNull: false,
        defaultValue: 'aktif'
      },
      notes: { type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CongregationMembers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CongregationMembers_gender";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CongregationMembers_status";');
  }
};
