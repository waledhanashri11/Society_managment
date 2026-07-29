const bcrypt = require('bcryptjs');
const { promisePool } = require('./config/database');

const residentNames = [
  'Ramesh Sharma', 'Priya Patel', 'Amit Verma', 'Sunita Rao', 'Vikram Singh',
  'Neha Gupta', 'Rajesh Kumar', 'Pooja Joshi', 'Sanjay Kulkarni', 'Ananya Deshmukh',
  'Suresh Nair', 'Kavita Iyer', 'Deepak Agarwal', 'Sneha Reddy', 'Rahul Mehta',
  'Aarti Shah', 'Manoj Tiwary', 'Divya Choudhary', 'Pankaj Tripathi', 'Shalini Mishra',
  'Alok Saxena', 'Meena Bansal', 'Sachin Tendulkar', 'Geeta Kapur', 'Arvind Kejriwal',
  'Smriti Mandhana', 'Rohan Gavaskar', 'Swati Mahajan', 'Vijay Shekhar', 'Ritu Beri'
];

async function seedResidents() {
  try {
    console.log('Seeding 30 residents for 30 flats...');

    // Hash default password 'Password@123'
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    // Fetch all 30 flats ordered by floor and flat_no
    const [flats] = await promisePool.query('SELECT id, flat_no FROM flats ORDER BY floor_no ASC, flat_no ASC LIMIT 30');

    if (flats.length === 0) {
      console.error('No flats found. Please run flat seeding first.');
      process.exit(1);
    }

    console.log(`Found ${flats.length} flats to assign residents to.`);

    for (let i = 0; i < flats.length; i++) {
      const flat = flats[i];
      const name = residentNames[i % residentNames.length];
      const email = `resident${flat.flat_no}@society.com`;
      const phone = `98765${String(10000 + i).substring(1)}`;

      // 1. Check if user with this email already exists
      const [existingUser] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
      let userId;

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        await promisePool.query(
          'UPDATE users SET name = ?, phone = ?, role = ?, flat_id = ?, status = ? WHERE id = ?',
          [name, phone, 'resident', flat.id, 'approved', userId]
        );
        console.log(`Updated Resident User: ${name} (${email}) for Flat ${flat.flat_no}`);
      } else {
        const [insertRes] = await promisePool.query(
          'INSERT INTO users (name, email, password, phone, role, flat_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, email, hashedPassword, phone, 'resident', flat.id, 'approved']
        );
        userId = insertRes.insertId || insertRes[0]?.id;
        console.log(`Created Resident User: ${name} (${email}) for Flat ${flat.flat_no}`);
      }

      // 2. Link flat to current_resident_id and set status = 'Occupied'
      await promisePool.query(
        "UPDATE flats SET current_resident_id = ?, status = 'Occupied' WHERE id = ?",
        [userId, flat.id]
      );
    }

    console.log('Successfully created and assigned 30 residents to all 30 flats!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding 30 residents:', err);
    process.exit(1);
  }
}

seedResidents();
