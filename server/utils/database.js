function resolveTableName(table) {
  if (table && typeof table === 'object' && table.tableName) {
    return table.tableName;
  }

  return String(table || '');
}

function isMissingRelationError(error, tableName = '') {
  const normalizedTableName = resolveTableName(tableName);
  const code = error?.original?.code || error?.parent?.code;
  const message = String(error?.message || error?.original?.message || '');

  if (code === '42P01') {
    return true;
  }

  if (!normalizedTableName) {
    return false;
  }

  return message.includes(`relation "${normalizedTableName}" does not exist`);
}

module.exports = {
  isMissingRelationError,
  resolveTableName
};
