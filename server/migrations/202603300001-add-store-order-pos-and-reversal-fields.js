'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "cashierName" varchar(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "amountPaid" integer NOT NULL DEFAULT 0;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "changeAmount" integer NOT NULL DEFAULT 0;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "reversedAt" timestamp;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "reversedBy" integer REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "reversalType" varchar(32);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      ADD COLUMN IF NOT EXISTS "reversalReason" text;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "StoreOrders"
      SET "amountPaid" = COALESCE(NULLIF("amountPaid", 0), "totalAmount"),
          "changeAmount" = COALESCE("changeAmount", 0)
      WHERE COALESCE("amountPaid", 0) = 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "StoreOrders"
      DROP COLUMN IF EXISTS "reversalReason",
      DROP COLUMN IF EXISTS "reversalType",
      DROP COLUMN IF EXISTS "reversedBy",
      DROP COLUMN IF EXISTS "reversedAt",
      DROP COLUMN IF EXISTS "changeAmount",
      DROP COLUMN IF EXISTS "amountPaid",
      DROP COLUMN IF EXISTS "cashierName";
    `);
  }
};
