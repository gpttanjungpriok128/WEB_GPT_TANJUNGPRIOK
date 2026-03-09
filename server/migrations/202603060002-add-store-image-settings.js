'use strict';

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((entry) => (typeof entry === 'string' ? entry : entry.tableName))
    .includes(tableName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const productsTable = await queryInterface.describeTable('StoreProducts');
    if (!productsTable.imageUrls) {
      await queryInterface.addColumn('StoreProducts', 'imageUrls', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "StoreProducts"
      SET "imageUrls" = CASE
        WHEN "imageUrl" IS NOT NULL AND "imageUrl" <> '' THEN jsonb_build_array("imageUrl")
        ELSE '[]'::jsonb
      END
      WHERE "imageUrls" IS NULL OR jsonb_array_length("imageUrls") = 0
    `);

    const hasStoreSettings = await tableExists(queryInterface, 'StoreSettings');
    if (!hasStoreSettings) {
      await queryInterface.createTable('StoreSettings', {
        id: { allowNull: false, autoIncrement: false, primaryKey: true, type: Sequelize.INTEGER },
        shippingCost: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 15000 },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      });
    }

    const now = new Date();
    await queryInterface.sequelize.query(
      `
        INSERT INTO "StoreSettings" ("id", "shippingCost", "createdAt", "updatedAt")
        VALUES (1, 15000, :now, :now)
        ON CONFLICT ("id") DO NOTHING;
      `,
      {
        replacements: { now }
      }
    );
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'StoreSettings')) {
      await queryInterface.dropTable('StoreSettings');
    }

    const productsTable = await queryInterface.describeTable('StoreProducts');
    if (productsTable.imageUrls) {
      await queryInterface.removeColumn('StoreProducts', 'imageUrls');
    }
  }
};
