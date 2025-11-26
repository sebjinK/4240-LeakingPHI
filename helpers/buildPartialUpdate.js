function buildPartialUpdate(table, userId, data) {
    // Keep only keys where value is not null/undefined
    const keys = Object.keys(data).filter(
        key => data[key] !== undefined && data[key] !== null
    );

    if (keys.length === 0) return null; // nothing to update

    // Build SET clause: `column1 = ?, column2 = ?`
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    // Values: only the provided field values, plus userId for WHERE clause
    const values = [...keys.map(key => data[key]), userId];

    return {
        sql: `
      UPDATE ${table}
      SET ${setClause}
      WHERE user_id = ?
    `,
        values,
    };
}
module.exports = buildPartialUpdate;