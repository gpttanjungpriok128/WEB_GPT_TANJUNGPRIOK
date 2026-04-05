'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('StoreProducts');

    if (!table.priceBySize) {
      await queryInterface.addColumn('StoreProducts', 'priceBySize', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('StoreProducts');

    if (table.priceBySize) {
      await queryInterface.removeColumn('StoreProducts', 'priceBySize');
    }
  }
};
