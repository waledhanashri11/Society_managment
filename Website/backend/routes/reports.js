const router=require('express').Router();
const {auth}=require('../middleware/auth');
const c=require('../controllers/reportsController');
router.get('/admin/annual',auth,c.adminAnnual);
router.get('/admin/monthly',auth,c.adminMonthly);
router.post('/admin/opening-balance',auth,c.setupOpening);
router.get('/resident/transparency',auth,c.residentTransparency);
router.get('/resident/payment-status',auth,c.residentPayments);
module.exports=router;
