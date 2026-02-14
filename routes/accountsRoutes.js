const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');
const validateExam = require('../middleware/validateExam');

router.get('/logout', accountsController.logoutUser);
router.get('/', accountsController.getAllAccounts);
router.get('/:id', accountsController.getAccountById);
router.put('/:id', accountsController.updateAccount);
router.delete('/:id', accountsController.deleteAccount);
module.exports = router;