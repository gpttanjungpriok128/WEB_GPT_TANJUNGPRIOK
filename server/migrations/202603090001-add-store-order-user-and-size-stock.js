'use strict';

function normalizeSizes(value) {
  const fallback = ['S', 'M', 'L', 'XL', 'XXL'];
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const unique = [...new Set(source.map((item) => String(item).toUpperCase()))];
  return unique.length ? unique : fallback;
}

function distributeStockBySize(totalStock, sizes) {
  const safeSizes = normalizeSizes(sizes);
  const safeTotal = Math.max(0, Number.parseInt(totalStock, 10) || 0);
  const perSize = safeSizes.length > 0 ? Math.floor(safeTotal / safeSizes.length) : 0;
  let remainder = safeSizes.length > 0 ? safeTotal % safeSizes.length : 0;

  return safeSizes.reduce((accumulator, size) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    accumulator[size] = perSize + extra;
    return accumulator;
  }, {});
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('StoreProducts', 'stockBySize', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {}
    });

    const [products] = await queryInterface.sequelize.query(
      'SELECT id, sizes, stock FROM "StoreProducts";'
    );

    for (const product of products) {
      const stockBySize = distributeStockBySize(product.stock, product.sizes);
      await queryInterface.sequelize.query(
        'UPDATE "StoreProducts" SET "stockBySize" = :stockBySize WHERE id = :id;',
        {
          replacements: {
            id: product.id,
            stockBySize: JSON.stringify(stockBySize)
          }
        }
      );
    }

    await queryInterface.addColumn('StoreOrders', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('StoreOrders', 'stockDeductedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Existing historical orders were deducted at creation time.
    await queryInterface.sequelize.query(
      'UPDATE "StoreOrders" SET "stockDeductedAt" = "createdAt" WHERE "stockDeductedAt" IS NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('StoreOrders', 'stockDeductedAt');
    await queryInterface.removeColumn('StoreOrders', 'userId');
    await queryInterface.removeColumn('StoreProducts', 'stockBySize');
  }
};
