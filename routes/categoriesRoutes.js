const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const validateExam = require('../middleware/validateExam');

router.get('/', categoriesController.getAllCategories);
router.get('/:id', categoriesController.getCategoryById);
router.post('/', categoriesController.createCategory);
router.put('/:id', categoriesController.updateCategory);
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;