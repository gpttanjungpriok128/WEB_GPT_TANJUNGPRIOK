'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Use raw SQL to directly add columns if they don't exist
    // This is more reliable than using Sequelize methods that sometimes fail
    
    try {
      // Add stockBySize column to StoreProducts if it doesn't exist
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreProducts"
        ADD COLUMN IF NOT EXISTS "stockBySize" jsonb NOT NULL DEFAULT '{}'::jsonb;
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      // Add userId column to StoreOrders if it doesn't exist
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreOrders"
        ADD COLUMN IF NOT EXISTS "userId" integer REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      // Add stockDeductedAt column to StoreOrders if it doesn't exist
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreOrders"
        ADD COLUMN IF NOT EXISTS "stockDeductedAt" timestamp;
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // Populate stockDeductedAt with createdAt if all are NULL
    try {
      await queryInterface.sequelize.query(`
        UPDATE "StoreOrders"
        SET "stockDeductedAt" = "createdAt"
        WHERE "stockDeductedAt" IS NULL;
      `);
    } catch (error) {
      // Safe to ignore if update fails
      console.log('stockDeductedAt update info:', error.message);
    }

    // Populate stockBySize for existing products if empty
    try {
      const [products] = await queryInterface.sequelize.query(
        `SELECT id, sizes, stock FROM "StoreProducts" WHERE "stockBySize" = '{}'::jsonb OR "stockBySize" IS NULL;`
      );

      for (const product of products) {
        const sizes = Array.isArray(product.sizes) ? product.sizes : ['S', 'M', 'L', 'XL', 'XXL'];
        const stock = Math.max(0, parseInt(product.stock, 10) || 0);
        const perSize = sizes.length > 0 ? Math.floor(stock / sizes.length) : 0;
        let remainder = sizes.length > 0 ? stock % sizes.length : 0;

        const stockBySize = {};
        for (const size of sizes) {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder -= 1;
          stockBySize[size] = perSize + extra;
        }

        await queryInterface.sequelize.query(
          `UPDATE "StoreProducts" SET "stockBySize" = :stockBySize WHERE id = :id;`,
          {
            replacements: {
              id: product.id,
              stockBySize: JSON.stringify(stockBySize)
            }
          }
        );
      }
    } catch (error) {
      // Safe to ignore if population fails - stockBySize defaults to {}
      console.log('stockBySize population info:', error.message);
    }
  },

  async down(queryInterface) {
    // Drop columns if they exist
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreProducts"
        DROP COLUMN IF EXISTS "stockBySize";
      `);
    } catch (error) {
      // Safe to ignore
    }

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreOrders"
        DROP COLUMN IF EXISTS "stockDeductedAt";
      `);
    } catch (error) {
      // Safe to ignore
    }

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "StoreOrders"
        DROP COLUMN IF EXISTS "userId";
      `);
    } catch (error) {
      // Safe to ignore
    }
  }
};
