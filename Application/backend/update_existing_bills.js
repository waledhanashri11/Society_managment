const { promisePool } = require('./config/database');

async function main() {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("Fetching active categories...");
    const [categories] = await connection.query("SELECT * FROM maintenance_categories WHERE active = TRUE");
    const categoriesSum = categories.reduce((sum, cat) => sum + Number(cat.amount || 0), 0);
    console.log(`Active categories sum: Rs. ${categoriesSum}`);

    console.log("Fetching all maintenance bills...");
    const [bills] = await connection.query("SELECT * FROM maintenance");
    console.log(`Found ${bills.length} bills.`);

    for (const bill of bills) {
      console.log(`Updating Bill ID ${bill.id} (${bill.title} - ${bill.month}/${bill.year})...`);
      
      // Delete existing items to prevent duplicates
      await connection.query("DELETE FROM maintenance_bill_items WHERE bill_id = ?", [bill.id]);

      // Insert new items
      for (const cat of categories) {
        await connection.query(
          `INSERT INTO maintenance_bill_items (bill_id, category_id, name, amount)
           VALUES (?, ?, ?, ?)`,
          [bill.id, cat.id, cat.name, cat.amount]
        );
      }

      // Recalculate totals
      const baseAmt = Number(bill.amount || 0);
      const penaltyAmt = Number(bill.penalty_amount || 0);
      const totalAmt = baseAmt + penaltyAmt + categoriesSum;
      
      let paidAmt = Number(bill.paid_amount || 0);
      if (bill.status === 'Paid') {
        paidAmt = totalAmt;
      }
      const remainingAmt = Math.max(0, totalAmt - paidAmt);

      await connection.query(
        `UPDATE maintenance
         SET total_amount = ?, paid_amount = ?, remaining_amount = ?
         WHERE id = ?`,
        [totalAmt, paidAmt, remainingAmt, bill.id]
      );
    }

    await connection.commit();
    console.log("Database update completed successfully.");
  } catch (error) {
    console.error("Error updating database:", error);
    await connection.rollback();
  } finally {
    connection.release();
    process.exit(0);
  }
}

main();
