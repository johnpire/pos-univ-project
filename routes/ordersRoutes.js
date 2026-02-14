const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

// User authentication
const { isAuthenticated, isAdmin } = require('../middleware/authenticate');

router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);
router.post('/', ordersController.createOrder);
router.put('/:id', ordersController.updateOrder);
router.delete('/:id', ordersController.deleteOrder);
router.get('/summary', isAuthenticated, isAdmin, ordersController.getTotalSales);

module.exports = router;