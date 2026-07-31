const { promisePool } = require('../config/database');

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

const num = (v) => Number(v || 0);

// Helper to determine calculated payment status strictly according to business logic
const calculatePaymentStatus = (bill) => {
  const totalPayable = num(bill.total_payable);
  const paidAmount = num(bill.paid_amount);
  const writeOffAmount = num(bill.write_off_amount);
  const maintenanceAmount = num(bill.maintenance_amount || bill.amount);
  const penalty = num(bill.penalty || bill.late_fee);
  const discount = num(bill.discount_amount);
  const baseBilled = maintenanceAmount + penalty - discount;

  if (writeOffAmount > 0 && (writeOffAmount >= baseBilled || bill.status === 'WRITTEN_OFF')) {
    return 'WRITE_OFF';
  }
  if (paidAmount > totalPayable && totalPayable > 0) {
    return 'ADVANCE_PAID';
  }
  if (paidAmount >= totalPayable && totalPayable > 0) {
    return 'PAID';
  }
  if (paidAmount > 0 && paidAmount < totalPayable) {
    return 'PARTIALLY_PAID';
  }
  if (
    bill.payment_verification_status === 'Pending Verification' ||
    bill.payment_verification_status === 'Under Review' ||
    bill.status === 'Under Review' ||
    bill.status === 'Pending Verification'
  ) {
    return 'VERIFICATION_PENDING';
  }
  if (paidAmount === 0 && bill.due_date && new Date(bill.due_date) < new Date()) {
    return 'OVERDUE';
  }
  return 'PENDING';
};

// 1. Get Monthly Maintenance Report with Multi-Filters
const getMonthlyReport = async (req, res) => {
  try {
    const {
      month,
      year,
      wing,
      building,
      floor,
      flat,
      resident,
      payment_status,
      search,
    } = req.query;

    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Auto-cleanup any orphaned maintenance records (bills pointing to deleted flats or deleted residents)
    await promisePool.query(`
      DELETE FROM maintenance_writeoffs
      WHERE bill_id IN (
        SELECT id FROM maintenance
        WHERE (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
           OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))
      )
    `);
    await promisePool.query(`
      DELETE FROM payments
      WHERE bill_id IN (
        SELECT id FROM maintenance
        WHERE (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
           OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))
      )
    `);
    await promisePool.query(`
      DELETE FROM maintenance
      WHERE (flat_id IS NOT NULL AND flat_id NOT IN (SELECT id FROM flats))
         OR (resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM users))
    `);

    let whereClause = [];
    let params = [];

    // Access control: Allow admins and residents
    if (userRole !== 'resident' && !ADMIN_ROLES.has(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (month && month !== 'All') {
      whereClause.push('m.month = ?');
      params.push(parseInt(month, 10));
    }

    if (year && year !== 'All') {
      whereClause.push('m.year = ?');
      params.push(parseInt(year, 10));
    }

    const wingFilter = wing || building;
    if (wingFilter && wingFilter !== 'All') {
      whereClause.push('f.wing = ?');
      params.push(wingFilter.trim());
    }

    if (floor && floor !== 'All') {
      whereClause.push('f.floor_no = ?');
      params.push(parseInt(floor, 10));
    }

    if (flat && flat !== 'All') {
      whereClause.push('f.flat_no LIKE ?');
      params.push(`%${flat.trim()}%`);
    }

    if (resident && resident !== 'All') {
      whereClause.push('(u.name LIKE ? OR m.resident_id = ?)');
      params.push(`%${resident.trim()}%`, parseInt(resident, 10) || 0);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause.push('(u.name LIKE ? OR u.phone LIKE ? OR f.flat_no LIKE ? OR p.transaction_id LIKE ?)');
      params.push(q, q, q, q);
    }

    const whereStr = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';

    const query = `
      SELECT 
        m.id AS bill_id,
        m.resident_id,
        m.flat_id,
        m.month,
        m.year,
        COALESCE(m.amount, 0) AS maintenance_amount,
        COALESCE(m.penalty_amount, 0) AS penalty,
        COALESCE(m.penalty_amount, 0) AS penalty_amount,
        COALESCE(m.discount_amount, 0) AS discount_amount,
        COALESCE(m.write_off_amount, 0) AS write_off_amount,
        COALESCE(m.paid_amount, 0) AS paid_amount,
        COALESCE(m.advance_amount, 0) AS advance_amount,
        COALESCE(m.total_payable, m.total_amount, GREATEST(COALESCE(m.amount, 0) + COALESCE(m.penalty_amount, 0) - COALESCE(m.discount_amount, 0) - COALESCE(m.write_off_amount, 0), 0)) AS total_payable,
        m.due_date,
        m.status AS bill_status,
        m.payment_date,
        f.flat_no,
        f.wing,
        f.floor_no,
        u.name AS resident_name,
        u.email AS resident_email,
        u.phone AS resident_phone,
        p.id AS latest_payment_id,
        p.payment_method AS payment_mode,
        p.transaction_id,
        p.payment_status AS payment_verification_status,
        p.screenshot_url,
        p.rejection_reason,
        p.receipt_number,
        p.paid_at,
        COALESCE(w.writeoff_type, CASE WHEN COALESCE(m.write_off_amount, 0) > 0 THEN 'Partial Write-off' ELSE NULL END) AS write_off_method,
        w.reason AS write_off_reason
      FROM maintenance m
      LEFT JOIN flats f ON f.id = m.flat_id
      LEFT JOIN users u ON u.id = m.resident_id
      LEFT JOIN LATERAL (
        SELECT id, payment_method, transaction_id, payment_status, screenshot_url, rejection_reason, receipt_number, paid_at
        FROM payments
        WHERE bill_id = m.id
        ORDER BY created_at DESC LIMIT 1
      ) p ON TRUE
      LEFT JOIN LATERAL (
        SELECT writeoff_type, reason, remarks
        FROM maintenance_writeoffs
        WHERE bill_id = m.id
        ORDER BY created_at DESC LIMIT 1
      ) w ON TRUE
      ${whereStr}
      ORDER BY m.year DESC, m.month DESC, f.wing ASC, f.flat_no ASC
    `;

    const [rows] = await promisePool.query(query, params);

    // Compute detailed financial calculations and filtered payment status
    const mapped = rows.map((r) => {
      const maintenance_amount = num(r.maintenance_amount);
      const penalty = num(r.penalty);
      const discount_amount = num(r.discount_amount);
      const write_off_amount = num(r.write_off_amount);
      const total_payable = Math.max(0, maintenance_amount + penalty - discount_amount - write_off_amount);
      const amount_paid = num(r.paid_amount);
      const outstanding_amount = Math.max(0, total_payable - amount_paid);
      const calculated_status = calculatePaymentStatus({
        ...r,
        maintenance_amount,
        penalty,
        discount_amount,
        write_off_amount,
        total_payable,
        paid_amount: amount_paid,
      });

      return {
        ...r,
        maintenance_amount,
        penalty,
        penalty_amount: penalty,
        discount_amount,
        write_off_amount,
        total_payable,
        paid_amount: amount_paid,
        outstanding_amount,
        advance_amount: amount_paid > total_payable ? amount_paid - total_payable : num(r.advance_amount),
        calculated_status,
      };
    });

    // Apply payment_status filter if specified
    const filtered = (payment_status && payment_status !== 'All')
      ? mapped.filter((b) => b.calculated_status === payment_status)
      : mapped;

    // Calculate Collection Report Summary
    const expectedCollection = filtered.reduce((acc, curr) => acc + curr.total_payable, 0);
    const totalCollection = filtered.reduce((acc, curr) => acc + curr.paid_amount, 0);
    const pendingCollection = Math.max(0, expectedCollection - totalCollection);
    const overdueCollection = filtered
      .filter((b) => b.calculated_status === 'OVERDUE' || (b.due_date && new Date(b.due_date) < new Date() && b.outstanding_amount > 0))
      .reduce((acc, curr) => acc + curr.outstanding_amount, 0);
    const advanceCollection = filtered.reduce((acc, curr) => acc + curr.advance_amount, 0);
    const collectionPercentage = expectedCollection > 0 ? (totalCollection / expectedCollection) * 100 : 0;

    const sanitizeOutput = (data) => {
      if (data === null || data === undefined) return data;
      if (data instanceof Date) return data;
      if (Array.isArray(data)) return data.map(sanitizeOutput);
      if (typeof data === 'object') {
        const writeOffAmt = num(data.write_off_amount || data.writeoff_amount);
        const cleaned = {};
        for (const [key, val] of Object.entries(data)) {
          if (/write_?off/i.test(key) || /written_?off/i.test(key)) continue;
          cleaned[key] = sanitizeOutput(val);
        }
        if (writeOffAmt > 0) {
          if (cleaned.paid_amount !== undefined) cleaned.paid_amount = num(cleaned.paid_amount) + writeOffAmt;
          if (cleaned.outstanding_amount !== undefined) cleaned.outstanding_amount = Math.max(0, num(cleaned.outstanding_amount) - writeOffAmt);
          if (cleaned.total_payable !== undefined) cleaned.total_payable = Math.max(0, num(cleaned.total_payable) + writeOffAmt);
          if (cleaned.calculated_status !== undefined && num(cleaned.outstanding_amount) <= 0) {
            cleaned.calculated_status = 'PAID';
          }
        }
        return cleaned;
      }
      return data;
    };

    const responseData = userRole === 'resident' ? sanitizeOutput(filtered) : filtered;

    return res.json({
      success: true,
      count: responseData.length,
      summary: {
        expectedCollection,
        totalCollection,
        pendingCollection,
        overdueCollection,
        advanceCollection,
        collectionPercentage: parseFloat(collectionPercentage.toFixed(2)),
      },
      data: responseData,
    });
  } catch (error) {
    console.error('Error generating monthly maintenance report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate monthly maintenance report', error: error.message });
  }
};

// 2. Get Dashboard Financial & Status Summary API
const getDashboardSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    let whereClause = [];
    let params = [];

    if (month && month !== 'All') {
      whereClause.push('m.month = ?');
      params.push(parseInt(month, 10));
    }
    if (year && year !== 'All') {
      whereClause.push('m.year = ?');
      params.push(parseInt(year, 10));
    }

    const whereStr = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';

    const [flatsCount] = await promisePool.query('SELECT COUNT(*) AS total, SUM(CASE WHEN status = \'Occupied\' THEN 1 ELSE 0 END) AS occupied FROM flats');
    const totalFlats = num(flatsCount[0]?.total);
    const occupiedFlats = num(flatsCount[0]?.occupied);

    const [bills] = await promisePool.query(`
      SELECT 
        m.id,
        COALESCE(m.amount, m.total_payable, m.total_amount, 0) AS maintenance_amount,
        COALESCE(m.penalty_amount, 0) AS penalty,
        COALESCE(m.discount_amount, 0) AS discount_amount,
        COALESCE(m.write_off_amount, 0) AS write_off_amount,
        COALESCE(m.paid_amount, 0) AS paid_amount,
        COALESCE(m.total_payable, m.total_amount, GREATEST(COALESCE(m.amount, 0) + COALESCE(m.penalty_amount, 0) - COALESCE(m.discount_amount, 0) - COALESCE(m.write_off_amount, 0), 0)) AS total_payable,
        m.due_date,
        m.status,
        p.payment_status AS payment_verification_status
      FROM maintenance m
      LEFT JOIN LATERAL (
        SELECT payment_status FROM payments WHERE bill_id = m.id ORDER BY created_at DESC LIMIT 1
      ) p ON TRUE
      ${whereStr}
    `, params);

    let expectedMaintenance = 0;
    let totalCollection = 0;
    let overdueCollection = 0;
    let advanceCollection = 0;

    let paidFlats = 0;
    let pendingFlats = 0;
    let verificationPendingFlats = 0;
    let overdueFlats = 0;
    let partialPaymentFlats = 0;
    let writeOffCases = 0;

    bills.forEach((b) => {
      const maintenance_amount = num(b.maintenance_amount) || num(b.total_payable);
      const penalty = num(b.penalty);
      const discount_amount = num(b.discount_amount);
      const write_off_amount = num(b.write_off_amount);
      const total_payable = num(b.total_payable) || Math.max(0, maintenance_amount + penalty - discount_amount - write_off_amount);
      const amount_paid = num(b.paid_amount);
      const outstanding = Math.max(0, total_payable - amount_paid);

      expectedMaintenance += total_payable;
      totalCollection += amount_paid;

      if (amount_paid > total_payable) {
        advanceCollection += (amount_paid - total_payable);
      }

      const status = calculatePaymentStatus({
        ...b,
        maintenance_amount,
        penalty,
        discount_amount,
        write_off_amount,
        total_payable,
        paid_amount: amount_paid,
      });

      switch (status) {
        case 'PAID':
        case 'ADVANCE_PAID':
          paidFlats++;
          break;
        case 'PARTIALLY_PAID':
          partialPaymentFlats++;
          break;
        case 'VERIFICATION_PENDING':
          verificationPendingFlats++;
          break;
        case 'OVERDUE':
          overdueFlats++;
          overdueCollection += outstanding;
          break;
        case 'WRITE_OFF':
          writeOffCases++;
          break;
        default:
          pendingFlats++;
          break;
      }
    });

    const pendingCollection = Math.max(0, expectedMaintenance - totalCollection);
    const collectionPercentage = expectedMaintenance > 0 ? (totalCollection / expectedMaintenance) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalFlats,
        occupiedFlats,
        expectedMaintenance,
        totalCollection,
        pendingCollection,
        overdueCollection,
        advanceCollection,
        collectionPercentage: parseFloat(collectionPercentage.toFixed(2)),
        counts: {
          paidFlats,
          pendingFlats,
          verificationPendingFlats,
          overdueFlats,
          partialPaymentFlats,
          writeOffCases,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary', error: error.message });
  }
};

// 3. Get 12 Month Collection History
const get12MonthCollectionHistory = async (req, res) => {
  try {
    const query = `
      SELECT 
        m.month,
        m.year,
        SUM(COALESCE(m.total_payable, m.total_amount, GREATEST(COALESCE(m.amount, 0) + COALESCE(m.penalty_amount, 0) - COALESCE(m.discount_amount, 0) - COALESCE(m.write_off_amount, 0), 0))) AS expected_collection,
        SUM(COALESCE(m.paid_amount, 0)) AS collected_amount
      FROM maintenance m
      GROUP BY m.year, m.month
      ORDER BY m.year DESC, m.month DESC
      LIMIT 12
    `;
    const [rows] = await promisePool.query(query);

    const data = rows.reverse().map((r) => {
      const expected = num(r.expected_collection);
      const collected = num(r.collected_amount);
      const pending = Math.max(0, expected - collected);
      return {
        month: r.month,
        year: r.year,
        expectedCollection: expected,
        collectedAmount: collected,
        pendingAmount: pending,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching 12 month collection history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch collection history', error: error.message });
  }
};

// 4. Get Payment Mode Report
const getPaymentModeReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    let whereClause = ["p.payment_status IN ('Paid', 'Approved')"];
    let params = [];

    if (month && month !== 'All') {
      whereClause.push('m.month = ?');
      params.push(parseInt(month, 10));
    }
    if (year && year !== 'All') {
      whereClause.push('m.year = ?');
      params.push(parseInt(year, 10));
    }

    const whereStr = `WHERE ${whereClause.join(' AND ')}`;

    const query = `
      SELECT 
        COALESCE(p.payment_method, 'Cash') AS payment_mode,
        SUM(COALESCE(p.amount, 0)) AS total_amount,
        COUNT(p.id) AS total_transactions
      FROM payments p
      JOIN maintenance m ON m.id = p.bill_id
      ${whereStr}
      GROUP BY COALESCE(p.payment_method, 'Cash')
    `;

    const [rows] = await promisePool.query(query, params);

    let cashCollection = 0;
    let bankTransferCollection = 0;
    let upiCollection = 0;
    let chequeCollection = 0;

    rows.forEach((r) => {
      const mode = String(r.payment_mode || '').trim().toLowerCase();
      const amt = num(r.total_amount);

      if (mode.includes('cash')) {
        cashCollection += amt;
      } else if (mode.includes('bank') || mode.includes('transfer') || mode.includes('neft') || mode.includes('imps') || mode.includes('rtgs')) {
        bankTransferCollection += amt;
      } else if (mode.includes('upi') || mode.includes('gpay') || mode.includes('phonepe') || mode.includes('paytm')) {
        upiCollection += amt;
      } else if (mode.includes('cheque') || mode.includes('check')) {
        chequeCollection += amt;
      } else {
        bankTransferCollection += amt;
      }
    });

    return res.json({
      success: true,
      data: {
        cashCollection,
        bankTransferCollection,
        upiCollection,
        chequeCollection,
        totalCollection: cashCollection + bankTransferCollection + upiCollection + chequeCollection,
        breakdown: rows,
      },
    });
  } catch (error) {
    console.error('Error fetching payment mode report:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment mode report', error: error.message });
  }
};

// 5. Get Resident Ledger
const getResidentLedger = async (req, res) => {
  try {
    const { resident_id, month, year } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const targetResidentId = userRole === 'resident' ? userId : parseInt(resident_id, 10);
    if (!targetResidentId) {
      return res.status(400).json({ success: false, message: 'Resident ID is required' });
    }

    let whereClause = ['lt.resident_id = ?'];
    let params = [targetResidentId];

    if (month && month !== 'All') {
      whereClause.push('EXTRACT(MONTH FROM lt.created_at) = ?');
      params.push(parseInt(month, 10));
    }
    if (year && year !== 'All') {
      whereClause.push('EXTRACT(YEAR FROM lt.created_at) = ?');
      params.push(parseInt(year, 10));
    }

    const whereStr = `WHERE ${whereClause.join(' AND ')}`;

    const query = `
      SELECT 
        lt.id,
        lt.resident_id,
        lt.transaction_type,
        COALESCE(lt.credit, 0) AS credit,
        COALESCE(lt.debit, 0) AS debit,
        COALESCE(lt.balance, 0) AS balance,
        lt.reference_id,
        lt.notes,
        lt.created_at,
        u.name AS resident_name,
        f.flat_no,
        f.wing
      FROM ledger_transactions lt
      JOIN users u ON u.id = lt.resident_id
      LEFT JOIN flats f ON f.id = u.flat_id
      ${whereStr}
      ORDER BY lt.created_at ASC, lt.id ASC
    `;

    const [rows] = await promisePool.query(query, params);

    // Compute running balance dynamically
    let runningBalance = 0;
    const mapped = rows.map((r) => {
      const credit = num(r.credit);
      const debit = num(r.debit);
      runningBalance += (debit - credit);
      return {
        ...r,
        credit,
        debit,
        balance: runningBalance,
      };
    });

    return res.json({
      success: true,
      data: mapped,
      currentBalance: runningBalance,
    });
  } catch (error) {
    console.error('Error fetching resident ledger:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch resident ledger', error: error.message });
  }
};

// 6. Admin Write Off Management
const applyWriteOff = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!ADMIN_ROLES.has(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }

    const { bill_id, writeoff_type, amount, reason, remarks } = req.body;
    const writeoffAmount = num(amount);

    if (!bill_id || writeoffAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid Bill ID and positive write-off amount are required.' });
    }

    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [bill_id]);
    if (!billRows.length) {
      return res.status(404).json({ success: false, message: 'Maintenance bill not found.' });
    }

    const bill = billRows[0];
    const currentWriteOff = num(bill.write_off_amount);
    const newWriteOff = currentWriteOff + writeoffAmount;

    const maintenanceAmount = num(bill.amount);
    const penalty = num(bill.penalty || bill.late_fee);
    const discount = num(bill.discount_amount);
    const baseTotal = maintenanceAmount + penalty - discount;
    const newTotalPayable = Math.max(0, baseTotal - newWriteOff);
    const paidAmount = num(bill.paid_amount);
    const newRemaining = Math.max(0, newTotalPayable - paidAmount);

    let newStatus = bill.status;
    if (newWriteOff >= baseTotal || writeoff_type === 'Full' || writeoff_type === 'TOTAL') {
      newStatus = 'WRITTEN_OFF';
    } else if (paidAmount > 0) {
      newStatus = paidAmount >= newTotalPayable ? 'Paid' : 'Partially Paid';
    }

    // Insert write-off audit record
    await promisePool.query(
      `INSERT INTO maintenance_writeoffs (bill_id, resident_id, flat_id, admin_id, admin_name, writeoff_type, amount, reason, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill_id,
        bill.resident_id,
        bill.flat_id,
        req.user.id,
        req.user.name || 'Admin',
        writeoff_type || 'Maintenance',
        writeoffAmount,
        reason || 'Admin Approved Write Off',
        remarks || '',
      ]
    );

    // Update maintenance bill
    await promisePool.query(
      `UPDATE maintenance 
       SET write_off_amount = ?, total_payable = ?, total_amount = ?, remaining_amount = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newWriteOff, newTotalPayable, newTotalPayable, newRemaining, newStatus, bill_id]
    );

    // Record ledger transaction
    if (bill.resident_id) {
      await promisePool.query(
        `INSERT INTO ledger_transactions (resident_id, transaction_type, credit, debit, balance, reference_id, notes)
         VALUES (?, 'Write Off Applied', ?, 0, 0, ?, ?)`,
        [
          bill.resident_id,
          writeoffAmount,
          bill_id,
          `Write-off (${writeoff_type}): ${reason || 'Approved by admin'}`,
        ]
      );
    }

    return res.json({
      success: true,
      message: 'Write-off successfully applied.',
      data: {
        bill_id,
        write_off_amount: newWriteOff,
        total_payable: newTotalPayable,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('Error applying write-off:', error);
    return res.status(500).json({ success: false, message: 'Failed to apply write-off', error: error.message });
  }
};

// 7. Payment Verification Approval Workflow
const approvePaymentWorkflow = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!ADMIN_ROLES.has(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }

    const paymentId = req.params.id || req.body.payment_id;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required.' });
    }

    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (!paymentRows.length) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    const payment = paymentRows[0];
    const billId = payment.bill_id;
    const paymentAmount = num(payment.amount);
    const receiptNo = payment.receipt_number || `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Update payment record
    await promisePool.query(
      `UPDATE payments 
       SET payment_status = 'Paid', verified_by = ?, paid_at = NOW(), receipt_number = ?, updated_at = NOW()
       WHERE id = ?`,
      [req.user.id, receiptNo, paymentId]
    );

    // Update bill
    const [billRows] = await promisePool.query('SELECT * FROM maintenance WHERE id = ?', [billId]);
    if (billRows.length) {
      const bill = billRows[0];
      const newPaid = num(bill.paid_amount) + paymentAmount;
      const totalPayable = num(bill.total_payable || bill.total_amount || bill.amount);
      const newRemaining = Math.max(0, totalPayable - newPaid);
      let newStatus = 'Paid';
      let advanceAmt = 0;

      if (newPaid > totalPayable) {
        newStatus = 'Advance Paid';
        advanceAmt = newPaid - totalPayable;
      } else if (newPaid < totalPayable) {
        newStatus = 'Partially Paid';
      }

      await promisePool.query(
        `UPDATE maintenance 
         SET paid_amount = ?, remaining_amount = ?, advance_amount = ?, status = ?, payment_date = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [newPaid, newRemaining, advanceAmt, newStatus, billId]
      );

      // Record ledger transaction
      if (bill.resident_id) {
        await promisePool.query(
          `INSERT INTO ledger_transactions (resident_id, transaction_type, credit, debit, balance, reference_id, notes)
           VALUES (?, 'Payment Received', ?, 0, 0, ?, ?)`,
          [
            bill.resident_id,
            paymentAmount,
            billId,
            `Approved Payment (${payment.payment_method || 'Online'}): Txn #${payment.transaction_id || paymentId}`,
          ]
        );
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified and approved successfully.',
      receipt_number: receiptNo,
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve payment', error: error.message });
  }
};

// 8. Reject Payment Workflow
const rejectPaymentWorkflow = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!ADMIN_ROLES.has(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }

    const paymentId = req.params.id || req.body.payment_id;
    const { rejection_reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required.' });
    }

    const [paymentRows] = await promisePool.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (!paymentRows.length) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    const payment = paymentRows[0];
    const billId = payment.bill_id;

    // Update payment record
    await promisePool.query(
      `UPDATE payments 
       SET payment_status = 'Rejected', rejection_reason = ?, rejected_by = ?, rejected_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [rejection_reason || 'Payment verification rejected by admin', req.user.id, paymentId]
    );

    // Update maintenance status back to Pending if unpaid
    const [approvedPayments] = await promisePool.query("SELECT COUNT(*) AS cnt FROM payments WHERE bill_id = ? AND payment_status = 'Paid'", [billId]);
    if (num(approvedPayments[0]?.cnt) === 0) {
      await promisePool.query("UPDATE maintenance SET status = 'Pending', updated_at = NOW() WHERE id = ?", [billId]);
    }

    return res.json({
      success: true,
      message: 'Payment verification rejected.',
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject payment', error: error.message });
  }
};

// 9. Get Receipt Details
const getPaymentReceipt = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const [rows] = await promisePool.query(`
      SELECT 
        p.id AS payment_id,
        p.amount AS amount_paid,
        p.payment_method AS payment_mode,
        p.transaction_id,
        p.paid_at AS payment_date,
        p.receipt_number,
        m.month,
        m.year,
        m.title AS bill_title,
        f.flat_no,
        f.wing,
        u.name AS resident_name,
        u.email AS resident_email,
        u.phone AS resident_phone
      FROM payments p
      JOIN maintenance m ON m.id = p.bill_id
      LEFT JOIN flats f ON f.id = m.flat_id
      LEFT JOIN users u ON u.id = m.resident_id
      WHERE p.id = ?
    `, [payment_id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const r = rows[0];
    const receipt = {
      societyName: 'Royal Palms Co-Operative Housing Society',
      receiptNumber: r.receipt_number || `REC-${r.payment_id}`,
      residentName: r.resident_name || 'Resident',
      flatNumber: `${r.wing || ''}-${r.flat_no || ''}`.replace(/^-/, ''),
      maintenanceMonthYear: `${r.month}/${r.year}`,
      amountPaid: num(r.amount_paid),
      paymentMode: r.payment_mode || 'Cash',
      transactionId: r.transaction_id || 'N/A',
      paymentDate: r.payment_date ? new Date(r.payment_date).toLocaleDateString('en-IN') : 'N/A',
    };

    return res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Error fetching payment receipt:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment receipt', error: error.message });
  }
};

module.exports = {
  getMonthlyReport,
  getDashboardSummary,
  get12MonthCollectionHistory,
  getPaymentModeReport,
  getResidentLedger,
  applyWriteOff,
  approvePaymentWorkflow,
  rejectPaymentWorkflow,
  getPaymentReceipt,
};
