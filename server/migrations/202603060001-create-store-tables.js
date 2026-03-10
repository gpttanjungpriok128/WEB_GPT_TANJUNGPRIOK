'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StoreProducts', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      verse: { type: Sequelize.STRING },
      color: { type: Sequelize.STRING },
      imageUrl: { type: Sequelize.STRING },
      basePrice: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      promoType: {
        type: Sequelize.ENUM('none', 'percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'none'
      },
      promoValue: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      promoStartAt: { type: Sequelize.DATE },
      promoEndAt: { type: Sequelize.DATE },
      sizes: { type: Sequelize.JSONB, allowNull: false, defaultValue: ['S', 'M', 'L', 'XL', 'XXL'] },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdBy: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('StoreOrders', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      orderCode: { type: Sequelize.STRING, allowNull: false, unique: true },
      customerName: { type: Sequelize.STRING, allowNull: false },
      customerPhone: { type: Sequelize.STRING, allowNull: false },
      customerAddress: { type: Sequelize.TEXT, allowNull: false },
      shippingMethod: { type: Sequelize.STRING, allowNull: false },
      paymentMethod: { type: Sequelize.STRING, allowNull: false },
      notes: { type: Sequelize.TEXT },
      subtotal: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      shippingCost: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      totalAmount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('new', 'confirmed', 'packed', 'shipping', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'new'
      },
      channel: { type: Sequelize.STRING, allowNull: false, defaultValue: 'whatsapp' },
      whatsappMessage: { type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('StoreOrderItems', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'StoreOrders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        references: { model: 'StoreProducts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      productName: { type: Sequelize.STRING, allowNull: false },
      productSlug: { type: Sequelize.STRING, allowNull: false },
      size: { type: Sequelize.STRING, allowNull: false },
      color: { type: Sequelize.STRING },
      unitPrice: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      lineTotal: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      promoLabel: { type: Sequelize.STRING },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('StoreOrderItems');
    await queryInterface.dropTable('StoreOrders');
    await queryInterface.dropTable('StoreProducts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_StoreProducts_promoType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_StoreOrders_status";');
  }
};
