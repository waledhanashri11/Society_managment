const { promisePool } = require('./config/database');

async function main() {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("Clearing all payments proof records...");
    const [paymentsResult] = await connection.query("DELETE FROM payments");
    console.log(`Cleared ${paymentsResult.affectedRows} payments.`);

    console.log("Clearing all maintenance disputes...");
    const [disputesResult] = await connection.query("DELETE FROM maintenance_disputes");
    console.log(`Cleared ${disputesResult.affectedRows} disputes.`);

    console.log("Clearing all maintenance bill items...");
    const [itemsResult] = await connection.query("DELETE FROM maintenance_bill_items");
    console.log(`Cleared ${itemsResult.affectedRows} bill items.`);

    console.log("Clearing all maintenance bills...");
    const [maintenanceResult] = await connection.query("DELETE FROM maintenance");
    console.log(`Cleared ${maintenanceResult.affectedRows} maintenance bills.`);

    await connection.commit();
    console.log("All maintenance transaction records cleared successfully.");
  } catch (error) {
    console.error("Error clearing maintenance records:", error);
    await connection.rollback();
  } finally {
    connection.release();
    process.exit(0);
  }
}

main();
