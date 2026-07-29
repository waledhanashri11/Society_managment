const { promisePool } = require('./config/database');

async function seedFlats() {
  try {
    console.log('Seeding 30 flats...');
    
    // 1. Ensure Flat Types exist
    const typesToCreate = [
      { name: '1BHK', default_maintenance_amount: 1500, description: '1 Bedroom Hall Kitchen', status: 'Active' },
      { name: '2BHK', default_maintenance_amount: 2500, description: '2 Bedroom Hall Kitchen', status: 'Active' },
      { name: '3BHK', default_maintenance_amount: 3500, description: '3 Bedroom Hall Kitchen', status: 'Active' },
      { name: '5BHK', default_maintenance_amount: 5500, description: '5 Bedroom Hall Kitchen (Luxury)', status: 'Active' }
    ];

    const typeMap = {};
    for (const t of typesToCreate) {
      const [existing] = await promisePool.query('SELECT id, default_maintenance_amount FROM flat_types WHERE name = ?', [t.name]);
      if (existing.length > 0) {
        typeMap[t.name] = { id: existing[0].id, charge: existing[0].default_maintenance_amount };
      } else {
        const [res] = await promisePool.query(
          'INSERT INTO flat_types (name, default_maintenance_amount, description, status) VALUES (?, ?, ?, ?)',
          [t.name, t.default_maintenance_amount, t.description, t.status]
        );
        typeMap[t.name] = { id: res.insertId || res[0]?.id, charge: t.default_maintenance_amount };
      }
    }

    const typeKeys = ['1BHK', '2BHK', '3BHK', '5BHK'];

    // 2. Generate 30 flats: 5 floors, 7 flats per floor
    // Floor 1: 101 to 107
    // Floor 2: 201 to 207
    // Floor 3: 301 to 307
    // Floor 4: 401 to 407
    // Floor 5: 501, 502 (Total 30 flats)
    
    let count = 0;
    const totalFlatsNeeded = 30;
    const flatsPerFloor = 7;
    let typeIndex = 0;

    for (let floor = 1; count < totalFlatsNeeded; floor++) {
      for (let unit = 1; unit <= flatsPerFloor && count < totalFlatsNeeded; unit++) {
        count++;
        const flatNo = `${floor}0${unit}`;
        const flatTypeName = typeKeys[typeIndex % typeKeys.length];
        typeIndex++;

        const typeInfo = typeMap[flatTypeName];

        // Check if flat already exists
        const [existingFlat] = await promisePool.query('SELECT id FROM flats WHERE flat_no = ?', [flatNo]);
        if (existingFlat.length === 0) {
          await promisePool.query(
            'INSERT INTO flats (flat_no, wing, floor_no, current_resident_id, maintenance_charge, flat_type_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [flatNo, 'A', floor, null, typeInfo.charge, typeInfo.id, 'Available']
          );
          console.log(`Created Flat ${flatNo} (Floor ${floor}, ${flatTypeName}, Charge: ₹${typeInfo.charge})`);
        } else {
          // Update existing flat with type
          await promisePool.query(
            'UPDATE flats SET floor_no = ?, flat_type_id = ?, maintenance_charge = ? WHERE flat_no = ?',
            [floor, typeInfo.id, typeInfo.charge, flatNo]
          );
          console.log(`Updated Flat ${flatNo} (Floor ${floor}, ${flatTypeName}, Charge: ₹${typeInfo.charge})`);
        }
      }
    }

    console.log('Successfully added/updated 30 flats across 5 floors with 7 flats per floor!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding flats:', err);
    process.exit(1);
  }
}

seedFlats();
