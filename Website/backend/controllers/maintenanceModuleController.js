const { promisePool } = require('../config/database');

const respond = (res, status, message, data = null) =>
  res.status(status).json({ success: status < 400, message, ...(data !== null && { data }) });

const audit = async (userId, action, entityType, entityId, details = null) => {
  await promisePool.query(
    `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, action, entityType, entityId || null, details ? JSON.stringify(details) : null]
  );
};

const dashboard = async (req, res) => {
  try {
    const [[summary]] = await promisePool.query(`
      SELECT
        COALESCE(SUM(paid_amount), 0) AS collected,
        COALESCE(SUM(remaining_amount), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'Overdue' OR (status != 'Paid' AND due_date < CURRENT_DATE) THEN remaining_amount ELSE 0 END), 0) AS overdue,
        COALESCE(SUM(write_off_amount), 0) AS totalWriteOffAmount,
        COUNT(*) AS total_bills,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END), 0) AS paid_bills,
        COALESCE(SUM(CASE WHEN status = 'PARTIAL_WRITE_OFF' THEN 1 ELSE 0 END), 0) AS partialWriteOffs,
        COALESCE(SUM(CASE WHEN status = 'WRITTEN_OFF' THEN 1 ELSE 0 END), 0) AS totalWriteOffs
      FROM maintenance
    `);

    const [[residents]] = await promisePool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'resident'`);

    const [[expense]] = await promisePool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance_expenses
      WHERE EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    const [[monthIncome]] = await promisePool.query(`
      SELECT COALESCE(SUM(paid_amount), 0) AS total FROM maintenance
      WHERE status = 'Paid'
        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    const [trend] = await promisePool.query(`
      SELECT TO_CHAR(created_at, 'Mon') AS month,
        COALESCE(SUM(paid_amount), 0) AS collected,
        COALESCE(SUM(remaining_amount), 0) AS pending
      FROM maintenance
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Mon')
      ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
    `);

    const [expenseDistribution] = await promisePool.query(`
      SELECT category AS name, SUM(amount) AS value FROM maintenance_expenses
      WHERE expense_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY category ORDER BY value DESC LIMIT 6
    `);

    const [overdueFlats] = await promisePool.query(`
      SELECT f.flat_no AS flat, u.name AS resident, SUM(m.remaining_amount) AS amount
      FROM maintenance m
      JOIN flats f ON f.id = m.flat_id
      JOIN users u ON u.id = m.resident_id
      WHERE m.status != 'Paid' AND m.due_date < CURRENT_DATE
      GROUP BY f.id, f.flat_no, u.name ORDER BY amount DESC LIMIT 5
    `);

    const collectionPercentage = summary.total_bills
      ? Math.round((Number(summary.paid_bills) / Number(summary.total_bills)) * 100)
      : 0;

    return respond(res, 200, 'Dashboard fetched', {
      summary: {
        collected: Number(summary.collected),
        pending: Number(summary.pending),
        overdue: Number(summary.overdue),
        collectionPercentage,
        residents: Number(residents.total),
        monthIncome: Number(monthIncome.total),
        monthExpense: Number(expense.total),
        outstanding: Number(summary.pending),
        totalWriteOffAmount: Number(summary.totalwriteoffamount || summary.totalWriteOffAmount || 0),
        partialWriteOffs: Number(summary.partialwriteoffs || summary.partialWriteOffs || 0),
        totalWriteOffs: Number(summary.totalwriteoffs || summary.totalWriteOffs || 0)
      },
      trend,
      expenseDistribution,
      overdueFlats
    });
  } catch (error) {
    console.error('Maintenance dashboard error:', error);
    return respond(res, 500, 'Unable to load maintenance dashboard');
  }
};

const listCategories = async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM maintenance_categories ORDER BY active DESC, name');
    return respond(res, 200, 'Categories fetched', rows);
  } catch (error) {
    return respond(res, 500, 'Unable to fetch categories');
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, amount = 0, calculationType = 'FIXED', active = true } = req.body;
    if (!name || Number(amount) < 0) return respond(res, 400, 'A valid name and amount are required');
    const [result] = await promisePool.query(
      `INSERT INTO maintenance_categories (name, amount, calculation_type, active) VALUES (?, ?, ?, ?)`,
      [name.trim(), amount, calculationType, Boolean(active)]
    );
    await audit(req.user.id, 'CREATE', 'CATEGORY', result.insertId, req.body);
    return respond(res, 201, 'Category created', { id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return respond(res, 409, 'Category already exists');
    return respond(res, 500, 'Unable to create category');
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, amount, calculationType, active } = req.body;
    const [result] = await promisePool.query(
      `UPDATE maintenance_categories SET name = ?, amount = ?, calculation_type = ?, active = ? WHERE id = ?`,
      [name, amount, calculationType || 'FIXED', Boolean(active), req.params.id]
    );
    if (!result.affectedRows) return respond(res, 404, 'Category not found');
    await audit(req.user.id, 'UPDATE', 'CATEGORY', req.params.id, req.body);
    return respond(res, 200, 'Category updated');
  } catch (error) {
    return respond(res, 500, 'Unable to update category');
  }
};

const deleteCategory = async (req, res) => {
  try {
    const [result] = await promisePool.query('DELETE FROM maintenance_categories WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return respond(res, 404, 'Category not found');
    await audit(req.user.id, 'DELETE', 'CATEGORY', req.params.id);
    return respond(res, 200, 'Category deleted');
  } catch (error) {
    return respond(res, 409, 'Category is in use and cannot be deleted');
  }
};

const listExpenses = async (req, res) => {
  try {
    const { search = '', category = '', status = '' } = req.query;
    const where = ['(vendor LIKE ? OR expense_number LIKE ? OR description LIKE ?)'];
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];
    if (category) { where.push('category = ?'); params.push(category); }
    if (status) { where.push('status = ?'); params.push(status); }
    const [rows] = await promisePool.query(
      `SELECT * FROM maintenance_expenses WHERE ${where.join(' AND ')} ORDER BY expense_date DESC, id DESC`,
      params
    );
    return respond(res, 200, 'Expenses fetched', rows);
  } catch (error) {
    return respond(res, 500, 'Unable to fetch expenses');
  }
};

const createExpense = async (req, res) => {
  try {
    const { category, vendor, amount, expenseDate, description, paymentMethod, status = 'Paid', invoiceUrl } = req.body;
    if (!category || !vendor || Number(amount) <= 0 || !expenseDate) {
      return respond(res, 400, 'Category, vendor, positive amount and date are required');
    }
    const number = `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [result] = await promisePool.query(
      `INSERT INTO maintenance_expenses
       (expense_number, category, vendor, amount, expense_date, invoice_url, description, payment_method, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [number, category, vendor, amount, expenseDate, invoiceUrl || null, description || null, paymentMethod || 'Bank Transfer', status, req.user.id]
    );
    await audit(req.user.id, 'CREATE', 'EXPENSE', result.insertId, { number, amount });
    return respond(res, 201, 'Expense recorded', { id: result.insertId, expenseNumber: number });
  } catch (error) {
    return respond(res, 500, 'Unable to create expense');
  }
};

const deleteExpense = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [expenses] = await connection.query(
      `SELECT id, expense_number, description, amount
       FROM maintenance_expenses
       WHERE id = ?`,
      [req.params.id]
    );

    if (!expenses.length) {
      await connection.rollback();
      return respond(res, 404, 'Expense not found.');
    }

    const expense = expenses[0];
    const [admins] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const adminName = admins[0]?.name || req.user.name || 'Admin';

    const [result] = await connection.query('DELETE FROM maintenance_expenses WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      await connection.rollback();
      return respond(res, 404, 'Expense not found.');
    }

    await connection.query(
      `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE',
        'EXPENSE',
        expense.id,
        JSON.stringify({
          expenseId: expense.id,
          expenseNumber: expense.expense_number,
          description: expense.description,
          amount: Number(expense.amount || 0),
          deletedBy: adminName,
          deletedAt: new Date().toISOString()
        })
      ]
    );

    await connection.commit();
    return respond(res, 200, 'Expense deleted successfully.');
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Delete expense rollback error:', rollbackError);
    }
    console.error('Delete expense error:', error);
    return respond(res, 500, 'Failed to delete expense. Please try again.');
  } finally {
    connection.release();
  }
};

const getLateFeeRule = async (req, res) => {
    const [rows] = await promisePool.query('SELECT * FROM late_fee_rules WHERE active = TRUE ORDER BY id DESC LIMIT 1');
  return respond(res, 200, 'Late fee rule fetched', rows[0] || null);
};

const saveLateFeeRule = async (req, res) => {
  try {
    const { gracePeriod = 0, penaltyType = 'DAILY', penaltyAmount = 0, maximumLateFee = 0, active = true } = req.body;
    await promisePool.query('UPDATE late_fee_rules SET active = FALSE');
    const [result] = await promisePool.query(
      `INSERT INTO late_fee_rules (grace_period, penalty_type, penalty_amount, maximum_late_fee, active)
       VALUES (?, ?, ?, ?, ?)`,
      [gracePeriod, penaltyType, penaltyAmount, maximumLateFee, Boolean(active)]
    );
    await audit(req.user.id, 'UPDATE', 'LATE_FEE_RULE', result.insertId, req.body);
    return respond(res, 200, 'Late fee rule saved', { id: result.insertId });
  } catch (error) {
    return respond(res, 500, 'Unable to save late fee rule');
  }
};

const waiveLateFee = async (req, res) => {
  try {
    const [result] = await promisePool.query(
      `UPDATE maintenance_bills SET total_amount = total_amount - late_fee,
       remaining_amount = GREATEST(0, remaining_amount - late_fee), late_fee = 0,
       remarks = CONCAT(COALESCE(remarks, ''), ' Late fee waived.') WHERE id = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) return respond(res, 404, 'Bill not found');
    await audit(req.user.id, 'WAIVE_LATE_FEE', 'BILL', req.params.id);
    return respond(res, 200, 'Late fee waived');
  } catch (error) {
    return respond(res, 500, 'Unable to waive late fee');
  }
};

const createDispute = async (req, res) => {
  try {
    const { billId, subject, description } = req.body;
    const [[bill]] = await promisePool.query('SELECT resident_id FROM maintenance_bills WHERE id = ?', [billId]);
    if (!bill || bill.resident_id !== req.user.id) return respond(res, 403, 'Bill is not available to this resident');
    const [result] = await promisePool.query(
      `INSERT INTO maintenance_disputes (bill_id, resident_id, subject, description) VALUES (?, ?, ?, ?)`,
      [billId, req.user.id, subject, description]
    );
    return respond(res, 201, 'Dispute submitted', { id: result.insertId });
  } catch (error) {
    return respond(res, 500, 'Unable to submit dispute');
  }
};

const listDisputes = async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT d.*, u.name resident_name, f.flat_no, mb.bill_number
      FROM maintenance_disputes d JOIN users u ON u.id = d.resident_id
      JOIN maintenance_bills mb ON mb.id = d.bill_id JOIN flats f ON f.id = mb.flat_id
      ORDER BY d.created_at DESC
    `);
    return respond(res, 200, 'Disputes fetched', rows);
  } catch (error) {
    return respond(res, 500, 'Unable to fetch disputes');
  }
};

const getResidentCategories = async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT f.id AS flat_id, f.flat_no, u.id AS resident_id, u.name AS resident_name,
             COALESCE(
               (SELECT json_agg(fca.category_id)
                FROM flat_category_assignments fca
                WHERE fca.flat_id = f.id),
               '[]'::json
             ) AS assigned_category_ids
      FROM flats f
      LEFT JOIN users u ON f.current_resident_id = u.id
      WHERE f.status = 'Occupied'
      ORDER BY f.flat_no ASC
    `);
    return respond(res, 200, 'Resident categories fetched', rows);
  } catch (error) {
    console.error('getResidentCategories error:', error);
    return respond(res, 500, 'Unable to fetch resident categories');
  }
};

const getFlatCategories = async (req, res) => {
  try {
    const { flatId } = req.params;
    const [rows] = await promisePool.query(
      'SELECT category_id FROM flat_category_assignments WHERE flat_id = ?',
      [flatId]
    );
    const categoryIds = rows.map((row) => row.category_id);
    return respond(res, 200, 'Flat categories fetched', categoryIds);
  } catch (error) {
    console.error('getFlatCategories error:', error);
    return respond(res, 500, 'Unable to fetch flat categories');
  }
};

const saveFlatCategories = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { flatId } = req.params;
    const { categoryIds = [] } = req.body;
    if (!flatId) {
      return respond(res, 400, 'Flat ID is required');
    }

    await connection.beginTransaction();

    await connection.query(
      'DELETE FROM flat_category_assignments WHERE flat_id = ?',
      [flatId]
    );

    for (const catId of categoryIds) {
      await connection.query(
        'INSERT INTO flat_category_assignments (flat_id, category_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [flatId, catId]
      );
    }

    await connection.commit();
    await audit(req.user.id, 'ASSIGN_CATEGORIES_TO_FLAT', 'FLAT', flatId, { categoryIds });
    return respond(res, 200, 'Flat categories saved');
  } catch (error) {
    await connection.rollback();
    console.error('saveFlatCategories error:', error);
    return respond(res, 500, 'Unable to save flat categories');
  } finally {
    connection.release();
  }
};

const bulkAssignResidentCategories = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { targets = [], categoryIds = [] } = req.body;
    const flatIds = targets.map((t) => t.flatId || t).filter(Boolean);

    if (!flatIds.length) {
      return respond(res, 400, 'Flat IDs are required');
    }

    await connection.beginTransaction();

    for (const flatId of flatIds) {
      await connection.query(
        'DELETE FROM flat_category_assignments WHERE flat_id = ?',
        [flatId]
      );

      for (const catId of categoryIds) {
        await connection.query(
          'INSERT INTO flat_category_assignments (flat_id, category_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
          [flatId, catId]
        );
      }
    }

    await connection.commit();
    await audit(req.user.id, 'BULK_ASSIGN_CATEGORIES_TO_FLATS', 'FLAT_BULK', null, { flatIds, categoryIds });
    return respond(res, 200, 'Bulk categories assigned successfully');
  } catch (error) {
    await connection.rollback();
    console.error('bulkAssignResidentCategories error:', error);
    return respond(res, 500, 'Unable to bulk assign categories');
  } finally {
    connection.release();
  }
};

module.exports = {
  dashboard, listCategories, createCategory, updateCategory, deleteCategory,
  listExpenses, createExpense, deleteExpense, getLateFeeRule, saveLateFeeRule,
  waiveLateFee, createDispute, listDisputes,
  getResidentCategories, getFlatCategories, saveFlatCategories, bulkAssignResidentCategories
};
