'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Articles');

    if (!table.status) {
      await queryInterface.addColumn('Articles', 'status', {
        type: Sequelize.ENUM('draft', 'pending', 'published', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      });
    }

    if (!table.approvedBy) {
      await queryInterface.addColumn('Articles', 'approvedBy', {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!table.approvedAt) {
      await queryInterface.addColumn('Articles', 'approvedAt', {
        type: Sequelize.DATE
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Articles');

    if (table.approvedAt) {
      await queryInterface.removeColumn('Articles', 'approvedAt');
    }

    if (table.approvedBy) {
      await queryInterface.removeColumn('Articles', 'approvedBy');
    }

    if (table.status) {
      await queryInterface.removeColumn('Articles', 'status');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Articles_status";');
    }
  }
};
