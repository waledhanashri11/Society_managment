const assert = require('assert');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { app } = require('../Server');
const { pool } = require('../database/client');
const { HEADERS } = require('../services/excelTransactionService');

const request = async (baseUrl, token, path, options = {}) => fetch(`${baseUrl}${path}`, {
  ...options,
  headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
});

(async () => {
  let server;
  let reference;
  let batchId;
  try {
    const candidate = await pool.query(
      `SELECT a.id AS admin_id, a.email AS admin_email, a.society_id,
              m.id AS bill_id, m.resident_id, u.name AS member_name,
              s.code AS society_code, COALESCE(f.wing, f.wing_block, '') AS wing, f.flat_no
       FROM users a
       JOIN societies s ON s.id = a.society_id
       JOIN maintenance m ON m.society_id = a.society_id
       JOIN users u ON u.id = m.resident_id AND u.society_id = a.society_id
       JOIN flats f ON f.id = m.flat_id AND f.society_id = a.society_id
       WHERE a.role = 'admin' AND a.status = 'approved'
         AND COALESCE(m.remaining_amount, m.total_payable, m.total_amount, m.amount, 0) >= 1
       ORDER BY m.id DESC LIMIT 1`
    );
    if (!candidate.rows[0]) {
      console.log('Skipping Excel endpoint flow: no approved admin with an outstanding bill exists.');
      return;
    }
    const row = candidate.rows[0];
    const token = jwt.sign(
      { id: row.admin_id, email: row.admin_email, role: 'admin', societyId: Number(row.society_id) },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    const externalBaseUrl = process.env.EXCEL_TEST_BASE_URL?.replace(/\/$/, '');
    if (!externalBaseUrl) {
      server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
    }
    const baseUrl = externalBaseUrl || `http://127.0.0.1:${server.address().port}`;

    const template = await request(baseUrl, token, '/api/maintenance/transactions/template');
    assert.strictEqual(template.status, 200);
    assert.match(template.headers.get('content-type'), /spreadsheetml/);
    assert((await template.arrayBuffer()).byteLength > 1000);

    const exported = await request(baseUrl, token, '/api/maintenance/transactions/export');
    assert.strictEqual(exported.status, 200);
    assert((await exported.arrayBuffer()).byteLength > 1000);

    reference = `XLS-E2E-${Date.now()}`;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    sheet.addRow(HEADERS);
    sheet.addRow([
      '', row.society_code, row.resident_id, row.member_name, row.wing, row.flat_no,
      row.bill_id, `BILL-${row.bill_id}`, new Date(), 'Maintenance', 'UPI', 1,
      reference, 'Pending', 'Automated Excel endpoint verification', 'CREATE', '', ''
    ]);
    const uploadBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const form = new FormData();
    form.append('file', new Blob([uploadBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'excel-e2e.xlsx');
    const preview = await request(baseUrl, token, '/api/maintenance/transactions/import/preview', { method: 'POST', body: form });
    const previewBody = await preview.json();
    assert.strictEqual(preview.status, 200, JSON.stringify(previewBody));
    assert.strictEqual(previewBody.data.validRows, 1);
    batchId = previewBody.data.batchId;

    const confirm = await request(baseUrl, token, '/api/maintenance/transactions/import/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId })
    });
    const confirmBody = await confirm.json();
    assert.strictEqual(confirm.status, 200, JSON.stringify(confirmBody));
    assert.strictEqual(confirmBody.data.imported, 1);

    const importedPayment = await pool.query(
      `SELECT society_id, bill_id, resident_id, payment_method, amount::numeric AS amount,
              transaction_id, payment_status, paid_at::date::text AS paid_at
       FROM payments WHERE transaction_id = $1 LIMIT 1`,
      [reference]
    );
    assert.strictEqual(importedPayment.rowCount, 1, 'Confirmed import must persist one payment');
    assert.strictEqual(Number(importedPayment.rows[0].society_id), Number(row.society_id));
    assert.strictEqual(Number(importedPayment.rows[0].bill_id), Number(row.bill_id));
    assert.strictEqual(Number(importedPayment.rows[0].resident_id), Number(row.resident_id));
    assert.strictEqual(importedPayment.rows[0].payment_method, 'UPI');
    assert.strictEqual(Number(importedPayment.rows[0].amount), 1);
    assert.strictEqual(importedPayment.rows[0].payment_status, 'Pending');

    const duplicateConfirm = await request(baseUrl, token, '/api/maintenance/transactions/import/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId })
    });
    assert.strictEqual(duplicateConfirm.status, 409);

    const history = await request(baseUrl, token, '/api/maintenance/transactions/imports');
    assert.strictEqual(history.status, 200);
    assert((await history.json()).data.some((item) => item.id === String(batchId)));
    console.log('Excel transaction Android-to-backend contract flow passed');
  } finally {
    if (reference) await pool.query('DELETE FROM payments WHERE transaction_id = $1', [reference]);
    if (batchId) await pool.query('DELETE FROM excel_transaction_import_batches WHERE id = $1', [batchId]);
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
