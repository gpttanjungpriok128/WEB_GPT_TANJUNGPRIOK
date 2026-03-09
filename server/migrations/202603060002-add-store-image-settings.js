'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('StoreProducts', 'imageUrls', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });

    await queryInterface.sequelize.query(`
      UPDATE "StoreProducts"
      SET "imageUrls" = CASE
        WHEN "imageUrl" IS NOT NULL AND "imageUrl" <> '' THEN jsonb_build_array("imageUrl")
        ELSE '[]'::jsonb
      END
    `);

    await queryInterface.createTable('StoreSettings', {
      id: { allowNull: false, autoIncrement: false, primaryKey: true, type: Sequelize.INTEGER },
      shippingCost: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 15000 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    const now = new Date();
    await queryInterface.bulkInsert('StoreSettings', [
      {
        id: 1,
        shippingCost: 15000,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('StoreSettings');
    await queryInterface.removeColumn('StoreProducts', 'imageUrls');
  }
};
