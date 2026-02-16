const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const paymentsCValidator = require('../middleware/paymentsValidator')

const { isAuthenticated } = require('../middleware/authenticate');

router.get('/', paymentsController.getAllPayments);
router.get('/:id', paymentsController.getPaymentById);
router.post('/', isAuthenticated, paymentsCValidator.validateCreatePayment, paymentsController.createPayment);
router.put('/:id', isAuthenticated, paymentsCValidator.validateUpdatePayment, paymentsController.updatePayment);
router.delete('/:id', isAuthenticated, paymentsController.deletePayment);

module.exports = router;