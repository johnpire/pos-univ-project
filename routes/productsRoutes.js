const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const productsCValidator = require('../middleware/productsValidator')

const { isAuthenticated } = require('../middleware/authenticate');

router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.post('/', isAuthenticated, productsCValidator.validateCreateProduct, productsController.createProduct);
router.put('/:id', isAuthenticated, productsCValidator.validateUpdateProduct, productsController.updateProduct);
router.delete('/:id', isAuthenticated, productsController.deleteProduct);

module.exports = router;