const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');
const validateExam = require('../middleware/validateExam');

router.get('/logout', accountsController.logoutUser);
router.get('/', accountsController.getAllUsers);
router.get('/:id', accountsController.getUserById);
router.put('/:id', accountsController.updateUser);
router.delete('/:id', accountsController.deleteUser);

module.exports = router;