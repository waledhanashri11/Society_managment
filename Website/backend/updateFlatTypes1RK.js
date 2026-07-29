const { promisePool } = require('./config/database');

async function updateFlatTypes() {
  try {
    console.log('Updating flat types to include 1RK and replacing 3BHK/5BHK...');

    // 1. Check or insert 1RK
    let [rkRows] = await promisePool.query('SELECT id, default_maintenance_amount FROM flat_types WHERE name = ?', ['1RK']);
    let rkId;
    let rkCharge = 1000;

    if (rkRows.length === 0) {
      const [res] = await promisePool.query(
        'INSERT INTO flat_types (name, default_maintenance_amount, description, status) VALUES (?, ?, ?, ?)',
        ['1RK', 1000, '1 Room Kitchen', 'Active']
      );
      rkId = res.insertId || res[0]?.id;
    } else {
      rkId = rkRows[0].id;
      rkCharge = rkRows[0].default_maintenance_amount || 1000;
    }

    // 2. Active Flat types list: 1RK, 1BHK, 2BHK
    const activeTypes = ['1RK', '1BHK', '2BHK'];
    const typeMap = {};

    for (const name of activeTypes) {
      const [rows] = await promisePool.query('SELECT id, default_maintenance_amount FROM flat_types WHERE name = ?', [name]);
      if (rows.length > 0) {
        typeMap[name] = { id: rows[0].id, charge: rows[0].default_maintenance_amount || (name === '1RK' ? 1000 : name === '1BHK' ? 1500 : 2500) };
        await promisePool.query("UPDATE flat_types SET status = 'Active' WHERE id = ?", [rows[0].id]);
      } else {
        const defaultAmt = name === '1RK' ? 1000 : (name === '1BHK' ? 1500 : 2500);
        const [res] = await promisePool.query(
          'INSERT INTO flat_types (name, default_maintenance_amount, description, status) VALUES (?, ?, ?, ?)',
          [name, defaultAmt, `${name} Flat Profile`, 'Active']
        );
        typeMap[name] = { id: res.insertId || res[0]?.id, charge: defaultAmt };
      }
    }

    // Mark 3BHK and 5BHK as Inactive
    await promisePool.query("UPDATE flat_types SET status = 'Inactive' WHERE name IN ('3BHK', '5BHK')");

    // 3. Re-balance all 30 flats among [1RK, 1BHK, 2BHK]
    const [allFlats] = await promisePool.query('SELECT id, flat_no FROM flats ORDER BY floor_no ASC, flat_no ASC');
    let idx = 0;
    for (const flat of allFlats) {
      const typeName = activeTypes[idx % activeTypes.length];
      idx++;
      const tInfo = typeMap[typeName];
      await promisePool.query(
        'UPDATE flats SET flat_type_id = ?, maintenance_charge = ? WHERE id = ?',
        [tInfo.id, tInfo.charge, flat.id]
      );
      console.log(`Flat ${flat.flat_no} updated to ${typeName} (₹${tInfo.charge})`);
    }

    console.log('Flat types successfully updated to 1RK, 1BHK, 2BHK across all 30 flats!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating flat types:', err);
    process.exit(1);
  }
}

updateFlatTypes();
