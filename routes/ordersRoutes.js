const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const validateExam = require('../middleware/validateExam');

router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);
router.post('/', ordersController.createOrder);
router.put('/:id', ordersController.updateOrder);
router.delete('/:id', ordersController.deleteOrder);
router.get('/summary', ordersController.getTotalSales);

module.exports = router;