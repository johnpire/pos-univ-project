const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const categoriesCValidator = require('../middleware/categoriesValidator')

const { isAuthenticated } = require('../middleware/authenticate');

router.get('/', categoriesController.getAllCategories);
router.get('/:id', categoriesController.getCategoryById);
router.post('/', isAuthenticated, categoriesCValidator.validateCreateCategory, categoriesController.createCategory);
router.put('/:id', isAuthenticated, categoriesCValidator.validateUpdateCategory, categoriesController.updateCategory);
router.delete('/:id', isAuthenticated, categoriesController.deleteCategory);

module.exports = router;