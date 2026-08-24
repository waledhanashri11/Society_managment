const service = require('../services/dayWiseStatementService');

const societyId = (req) => {
  const id = Number(req.user?.societyId);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('A tenant-scoped administrator is required'), { status: 403 });
  return id;
};
const fail = (res, error) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to generate day-wise statement' });

exports.view = async (req, res) => { try { res.json(await service.getStatement(societyId(req), req.query)); } catch (e) { console.error('Day-wise statement error', e); fail(res, e); } };
exports.excel = async (req, res) => { try { const data=await service.getStatement(societyId(req),req.query); const body=await service.excelBuffer(data); res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="day-wise-statement-${data.period.from}-to-${data.period.to}.xlsx"`}).send(body); } catch(e){ console.error('Day-wise Excel error',e); fail(res,e); } };
exports.pdf = async (req, res) => { try { const data=await service.getStatement(societyId(req),req.query); const body=await service.pdfBuffer(data); res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="day-wise-statement-${data.period.from}-to-${data.period.to}.pdf"`}).send(body); } catch(e){ console.error('Day-wise PDF error',e); fail(res,e); } };

