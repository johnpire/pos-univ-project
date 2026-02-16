const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const ordersCValidator = require('../middleware/ordersValidator')

// User authentication
const { isAuthenticated, isAdmin } = require('../middleware/authenticate');

router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);
router.post('/', isAuthenticated, ordersCValidator.validateCreateOrder, ordersController.createOrder);
router.put('/:id', isAuthenticated, ordersCValidator.validateUpdateOrder, ordersController.updateOrder);
router.delete('/:id', isAuthenticated, ordersController.deleteOrder);
router.get('/summary', isAuthenticated, isAdmin, ordersController.getTotalSales);

module.exports = router;