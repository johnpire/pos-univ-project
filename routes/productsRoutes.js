const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const validateExam = require('../middleware/validateExam');

router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

module.exports = router;