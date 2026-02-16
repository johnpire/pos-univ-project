const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');
const accountsCValidator = require('../middleware/accountsValidator')

// User authentication
const { isAuthenticated, isAdmin } = require('../middleware/authenticate');

router.get('/logout', accountsController.logoutUser);
router.get('/', isAuthenticated, isAdmin, accountsController.getAllUsers);
router.get('/:id', isAuthenticated, isAdmin, accountsController.getUserById);
router.put('/:id', isAuthenticated, isAdmin, accountsCValidator.validateUpdateUser, accountsController.updateUser);
router.delete('/:id', isAuthenticated, isAdmin, accountsController.deleteUser);

module.exports = router;