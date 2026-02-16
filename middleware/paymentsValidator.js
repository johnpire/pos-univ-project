const validator = require('../helpers/validate');

// Validate create payment request
const validateCreatePayment = (req, res, next) => {
    const validationRules = {
        orderId: 'required|string',
        currency: 'string',
        method: 'required|string'
    };
    
    validator(req.body, validationRules, {}, (err, status) => {
        if (!status) {
            return res.status(412).json({
                success: false,
                message: 'Validation failed',
                data: err
            });
        }
        next();
    });
};

// Validate update payment request
const validateUpdatePayment = (req, res, next) => {
    const validationRules = {
        status: 'string|in:pending,completed,failed'
    };
    
    validator(req.body, validationRules, {}, (err, status) => {
        if (!status) {
            return res.status(412).json({
                success: false,
                message: 'Validation failed',
                data: err
            });
        }
        next();
    });
};

module.exports = {
    validateCreatePayment,
    validateUpdatePayment
};