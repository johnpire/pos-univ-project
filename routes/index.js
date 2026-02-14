const router = require('express').Router();

router.use('/', require('./swagger'));
router.use('/products', require('./productsRoutes'));
router.use('/categories', require('./categoriesRoutes'));
router.use('/orders', require('./ordersRoutes'));
router.use('/payments', require('./paymentsRoutes'));
router.use('/accounts', require('./accountsRoutes'));

// Export
module.exports = router;