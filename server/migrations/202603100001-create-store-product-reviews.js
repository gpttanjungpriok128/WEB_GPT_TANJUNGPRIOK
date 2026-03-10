'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StoreProductReviews', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'StoreProducts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderId: {
        type: Sequelize.INTEGER,
        references: { model: 'StoreOrders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewerName: { type: Sequelize.STRING, allowNull: false },
      reviewerPhone: { type: Sequelize.STRING, allowNull: false },
      rating: { type: Sequelize.INTEGER, allowNull: false },
      reviewText: { type: Sequelize.TEXT },
      isApproved: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('StoreProductReviews');
  }
};
