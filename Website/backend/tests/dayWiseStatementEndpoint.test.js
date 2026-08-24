const assert = require('assert');
const jwt = require('jsonwebtoken');
const { app } = require('../Server');
const { pool } = require('../database/client');
const { validateFilters, calculateSummary } = require('../services/dayWiseStatementService');

(async () => {
  let server;
  try {
    assert.throws(() => validateFilters({ from: '2026-02-30', to: '2026-02-30' }), /valid/);
    assert.throws(() => validateFilters({ from: '2026-08-25', to: '2026-08-24' }), /after/);
    assert.deepStrictEqual(calculateSummary(100,[{transaction_type:'MAINTENANCE',amount:50},{transaction_type:'OTHER_INCOME',amount:10},{transaction_type:'EXPENSE',status:'Paid',amount:20}],7),{openingBalance:100,maintenanceCollected:50,otherIncome:10,totalExpenses:20,pendingAmount:7,closingBalance:140});
    const candidates = await pool.query(`SELECT id,email,role,society_id FROM users WHERE status='approved' AND society_id IS NOT NULL AND role IN ('admin','resident') ORDER BY role`);
    const admin = candidates.rows.find((x) => x.role === 'admin');
    const resident = candidates.rows.find((x) => x.role === 'resident');
    if (!admin) return console.log('Skipping day-wise endpoint test: no approved tenant admin.');
    const sign = (u) => jwt.sign({ id:u.id,email:u.email,role:u.role,societyId:Number(u.society_id) },process.env.JWT_SECRET,{expiresIn:'5m'});
    server = app.listen(0); await new Promise((resolve) => server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/reports/admin/day-wise-statement`;
    const headers = { Authorization:`Bearer ${sign(admin)}` };
    const invalid = await fetch(`${base}?from=bad&to=2026-08-24`,{headers}); assert.strictEqual(invalid.status,400);
    if (resident) { const forbidden=await fetch(`${base}?from=2026-08-24&to=2026-08-24`,{headers:{Authorization:`Bearer ${sign(resident)}`}}); assert.strictEqual(forbidden.status,403); }
    const response = await fetch(`${base}?from=2099-01-01&to=2099-01-01&societyId=999999`,{headers});
    assert.strictEqual(response.status,200); const body=await response.json(); assert.deepStrictEqual(body.transactions,[]); assert.strictEqual(body.period.timezone,'Asia/Kolkata');
    for (const kind of ['excel','pdf']) { const file=await fetch(`${base}/${kind}?from=2099-01-01&to=2099-01-01`,{headers}); assert.strictEqual(file.status,200); const bytes=Buffer.from(await file.arrayBuffer()); assert(bytes.length>500); assert(kind==='pdf'?bytes.subarray(0,4).toString()==='%PDF':bytes.subarray(0,2).toString()==='PK'); }
    console.log('Day-wise statement authorization, validation, empty-state, tenant-input rejection, Excel and PDF tests passed');
  } finally { if(server) await new Promise((resolve)=>server.close(resolve)); await pool.end(); }
})().catch((error)=>{console.error(error);process.exitCode=1;});
