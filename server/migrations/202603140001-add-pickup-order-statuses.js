'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_StoreOrders_status" ADD VALUE IF NOT EXISTS 'ready_pickup';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_StoreOrders_status" ADD VALUE IF NOT EXISTS 'picked_up';`
    );
  },

  async down() {
    // No-op: Postgres does not support removing enum values easily.
  }
};
