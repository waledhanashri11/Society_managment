const { promisePool } = require('../config/database');

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const number = value => Number(value || 0);
const iso = value => value ? String(value).slice(0, 10) : null;
const parseFy = value => {
  const match = String(value || '').match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2].length === 2 ? `${String(start).slice(0, 2)}${match[2]}` : match[2]);
  return end === start + 1 && start >= 2000 && start <= 2200 ? start : null;
};
const monthBounds = (financialYear, month) => {
  const year = month >= 4 ? financialYear : financialYear + 1;
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return { start, end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`, year };
};
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

function parseFilters(req) {
  const fy = parseFy(req.query.financialYear);
  if (!fy) throw Object.assign(new Error('financialYear must be YYYY-YYYY or YYYY-YY'), { status: 400 });
  const month = req.query.month == null || req.query.month === '' ? null : Number(req.query.month);
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) throw Object.assign(new Error('month must be from 1 to 12'), { status: 400 });
  let start = month ? monthBounds(fy, month).start : `${fy}-04-01`;
  let end = month ? monthBounds(fy, month).end : `${fy + 1}-04-01`;
  if (req.query.fromDate || req.query.toDate) {
    if (!validDate(req.query.fromDate) || !validDate(req.query.toDate)) throw Object.assign(new Error('fromDate and toDate must be valid YYYY-MM-DD dates'), { status: 400 });
    if (req.query.fromDate > req.query.toDate) throw Object.assign(new Error('fromDate cannot be after toDate'), { status: 400 });
    const fyStart = `${fy}-04-01`, fyEnd = `${fy + 1}-03-31`;
    if (req.query.fromDate < fyStart || req.query.toDate > fyEnd) throw Object.assign(new Error('Date range must be inside the selected financial year'), { status: 400 });
    start = req.query.fromDate;
    const next = new Date(`${req.query.toDate}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    end = next.toISOString().slice(0, 10);
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30));
  return {
    fy, month, start, end, page, limit,
    residentId: Number(req.query.residentId) || null,
    flat: String(req.query.flat || req.query.flatId || '').trim(),
    transactionType: String(req.query.transactionType || '').trim().toLowerCase(),
    paymentMode: String(req.query.paymentMode || '').trim(),
    status: String(req.query.status || '').trim(),
    search: String(req.query.search || '').trim()
  };
}

function commonEntityFilter(f, alias, userAlias, flatAlias, values) {
  const where = [];
  if (f.residentId) { where.push(`${alias}.resident_id = ?`); values.push(f.residentId); }
  if (f.flat) { where.push(`(${flatAlias}.flat_no = ? OR CAST(${flatAlias}.id AS TEXT) = ?)`); values.push(f.flat, f.flat); }
  if (f.search) {
    where.push(`(LOWER(COALESCE(${userAlias}.name,'')) LIKE ? OR LOWER(COALESCE(${flatAlias}.flat_no,'')) LIKE ?)`);
    const q = `%${f.search.toLowerCase()}%`; values.push(q, q);
  }
  return where;
}

async function loadReport(societyId, f) {
  const paymentValues = [societyId, f.start, f.end];
  const paymentWhere = ["p.society_id = ?", "COALESCE(p.paid_at::date,p.created_at::date) >= ?", "COALESCE(p.paid_at::date,p.created_at::date) < ?"];
  paymentWhere.push(...commonEntityFilter(f, 'p', 'u', 'fl', paymentValues));
  if (f.paymentMode) { paymentWhere.push('LOWER(p.payment_method) = LOWER(?)'); paymentValues.push(f.paymentMode); }
  if (f.status) { paymentWhere.push('LOWER(p.payment_status) = LOWER(?)'); paymentValues.push(f.status); }
  if (f.search) { paymentWhere.push('(LOWER(COALESCE(p.transaction_id,\'\')) LIKE ? OR LOWER(COALESCE(p.remarks,\'\')) LIKE ?)'); const q=`%${f.search.toLowerCase()}%`; paymentValues.push(q,q); }

  const billValues = [societyId, f.start, f.end];
  const billWhere = ['m.society_id = ?', 'm.due_date >= ?', 'm.due_date < ?'];
  billWhere.push(...commonEntityFilter(f, 'm', 'u', 'fl', billValues));
  if (f.status) { billWhere.push('LOWER(m.status) = LOWER(?)'); billValues.push(f.status); }

  const expenseValues = [societyId, f.start, f.end];
  const expenseWhere = ['e.society_id = ?', 'e.expense_date >= ?', 'e.expense_date < ?'];
  if (f.paymentMode) { expenseWhere.push('LOWER(e.payment_method) = LOWER(?)'); expenseValues.push(f.paymentMode); }
  if (f.status) { expenseWhere.push('LOWER(e.status) = LOWER(?)'); expenseValues.push(f.status); }
  if (f.search) { expenseWhere.push('(LOWER(COALESCE(e.category,\'\')) LIKE ? OR LOWER(COALESCE(e.description,\'\')) LIKE ? OR LOWER(COALESCE(e.vendor,\'\')) LIKE ? OR LOWER(COALESCE(e.expense_number,\'\')) LIKE ?)'); const q=`%${f.search.toLowerCase()}%`; expenseValues.push(q,q,q,q); }

  const [payments] = await promisePool.query(`SELECT p.id,COALESCE(p.paid_at::date,p.created_at::date) transaction_date,p.transaction_id,p.payment_method,p.amount,p.payment_status status,p.remarks,
      u.name resident_name,fl.flat_no,fl.wing,m.id bill_id,m.month,m.year,m.title,m.description,m.total_amount bill_amount,COALESCE(m.penalty_amount,m.penalty,0) penalty_amount,COALESCE(m.write_off_amount,0) write_off_amount,m.remaining_amount
    FROM payments p JOIN maintenance m ON m.id=p.bill_id AND m.society_id=p.society_id
    LEFT JOIN users u ON u.id=COALESCE(p.resident_id,m.resident_id) AND u.society_id=p.society_id
    LEFT JOIN flats fl ON fl.id=m.flat_id AND fl.society_id=p.society_id
    WHERE ${paymentWhere.join(' AND ')} ORDER BY transaction_date,p.id`, paymentValues);
  const [expenses] = await promisePool.query(`SELECT e.id,e.expense_date transaction_date,e.expense_number,e.category,e.description,e.vendor,e.amount,e.payment_method,e.status
    FROM maintenance_expenses e WHERE ${expenseWhere.join(' AND ')} ORDER BY e.expense_date,e.id`, expenseValues);
  const [bills] = await promisePool.query(`SELECT m.id,m.due_date,m.month,m.year,m.amount bill_amount,COALESCE(m.penalty_amount,m.penalty,0) penalty_amount,
      COALESCE(m.write_off_amount,0) write_off_amount,COALESCE(m.paid_amount,0) paid_amount,COALESCE(m.remaining_amount,0) remaining_amount,m.status,u.name resident_name,fl.flat_no,fl.wing
    FROM maintenance m LEFT JOIN users u ON u.id=m.resident_id AND u.society_id=m.society_id LEFT JOIN flats fl ON fl.id=m.flat_id AND fl.society_id=m.society_id
    WHERE ${billWhere.join(' AND ')} ORDER BY m.due_date,m.id`, billValues);

  const approved = payments.filter(p => ['approved','paid'].includes(String(p.status || '').toLowerCase()));
  const includeIncome = !f.transactionType || ['all','income','maintenance','penalty','manual payment','online payment','other'].includes(f.transactionType);
  const includeExpense = !f.transactionType || ['all','expense'].includes(f.transactionType);
  const tx = [];
  if (includeIncome) approved.forEach(p => tx.push({ id:`PAY-${p.id}`,date:iso(p.transaction_date),transactionId:p.transaction_id || `PAY-${p.id}`,type:'Maintenance Payment',category:'Maintenance',residentOrParty:p.resident_name,flat:[p.wing,p.flat_no].filter(Boolean).join('-'),description:p.description || p.title || `${p.month}/${p.year} Maintenance`,paymentMode:p.payment_method,credit:number(p.amount),debit:0,status:p.status,referenceType:'payment',referenceId:String(p.id) }));
  if (includeExpense) expenses.filter(e => !f.status || String(e.status).toLowerCase() === f.status.toLowerCase()).forEach(e => tx.push({ id:`EXP-${e.id}`,date:iso(e.transaction_date),transactionId:e.expense_number || `EXP-${e.id}`,type:'Expense',category:e.category,residentOrParty:e.vendor,flat:null,description:e.description || e.category,paymentMode:e.payment_method,credit:0,debit:number(e.amount),status:e.status,referenceType:'expense',referenceId:String(e.id) }));
  tx.sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let running = 0; tx.forEach(row => { running += row.credit - row.debit; row.balance = running; });

  const totalCollection = approved.reduce((s,p)=>s+number(p.amount),0);
  const totalExpenses = expenses.filter(e=>String(e.status||'').toLowerCase()==='paid').reduce((s,e)=>s+number(e.amount),0);
  const maintenanceGenerated = bills.reduce((s,b)=>s+number(b.bill_amount)+number(b.penalty_amount),0);
  const maintenanceCollected = totalCollection;
  const pendingAmount = bills.reduce((s,b)=>s+number(b.remaining_amount),0);
  const writeOffAmount = bills.reduce((s,b)=>s+number(b.write_off_amount),0);
  const penaltyCollected = bills.reduce((s,b)=>s+Math.min(number(b.penalty_amount),number(b.paid_amount)),0);
  const paidResidents = new Set(approved.map(p=>p.resident_name).filter(Boolean)).size;
  const pendingResidents = new Set(bills.filter(b=>number(b.remaining_amount)>0).map(b=>b.resident_name).filter(Boolean)).size;
  const summary = {totalCollection,totalIncome:totalCollection,totalExpenses,netBalance:totalCollection-totalExpenses,maintenanceGenerated,maintenanceCollected,pendingAmount,penaltyCollected,writeOffAmount,totalTransactions:tx.length,paidResidents,pendingResidents};

  const collections = payments.map(p=>({id:String(p.id),date:iso(p.transaction_date),resident:p.resident_name,flat:[p.wing,p.flat_no].filter(Boolean).join('-'),billMonth:`${p.month}/${p.year}`,billAmount:number(p.bill_amount),penalty:number(p.penalty_amount),writeOff:number(p.write_off_amount),amountPaid:number(p.amount),remaining:number(p.remaining_amount),paymentMode:p.payment_method,status:p.status}));
  const pending = bills.filter(b=>number(b.remaining_amount)>0).map(b=>({id:String(b.id),resident:b.resident_name,flat:[b.wing,b.flat_no].filter(Boolean).join('-'),month:`${b.month}/${b.year}`,originalBill:number(b.bill_amount),penalty:number(b.penalty_amount),writeOff:number(b.write_off_amount),paid:number(b.paid_amount),remaining:number(b.remaining_amount),status:b.status}));
  const expenseRows = expenses.map(e=>({id:String(e.id),date:iso(e.transaction_date),category:e.category,description:e.description,vendor:e.vendor,amount:number(e.amount),paymentMode:e.payment_method,status:e.status}));
  const startIndex=(f.page-1)*f.limit, paged=tx.slice(startIndex,startIndex+f.limit);
  return {summary,transactions:paged,collections,expenses:expenseRows,pending,pagination:{page:f.page,limit:f.limit,totalRecords:tx.length,totalPages:Math.max(1,Math.ceil(tx.length/f.limit))}};
}

async function months(societyId, f) {
  const result=[];
  for (let k=0;k<12;k++) {
    const month=((3+k)%12)+1, bounds=monthBounds(f.fy,month);
    const data=await loadReport(societyId,{...f,month,start:bounds.start,end:bounds.end,page:1,limit:10,search:'',residentId:null,flat:'',transactionType:'',paymentMode:'',status:''});
    result.push({month,year:bounds.year,...data.summary});
  }
  return result;
}

exports.getOverallReport = async (req,res) => {
  try {
    if (!ADMIN_ROLES.has(req.user?.role)) return res.status(403).json({message:'Access denied'});
    const societyId=Number(req.user.societyId); if (!societyId) return res.status(403).json({message:'Society context is required'});
    const filters=parseFilters(req), report=await loadReport(societyId,filters);
    const [societies]=await promisePool.query('SELECT name FROM societies WHERE id=?',[societyId]);
    res.json({success:true,societyName:societies[0]?.name || 'Society',financialYear:`${filters.fy}-${filters.fy+1}`,period:{from:filters.start,toExclusive:filters.end},months:filters.month||req.query.fromDate?undefined:await months(societyId,filters),...report});
  } catch (error) {
    console.error('Overall report error',error); res.status(error.status||500).json({message:error.status?error.message:'Unable to generate overall report'});
  }
};

