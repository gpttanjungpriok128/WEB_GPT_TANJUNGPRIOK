'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('StoreProductReviews');

    if (!table.imageUrls) {
      await queryInterface.addColumn('StoreProductReviews', 'imageUrls', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('StoreProductReviews');

    if (table.imageUrls) {
      await queryInterface.removeColumn('StoreProductReviews', 'imageUrls');
    }
  }
};
