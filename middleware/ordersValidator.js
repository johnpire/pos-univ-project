const validator = require('../helpers/validate');

// Validate create order request
const validateCreateOrder = (req, res, next) => {
    const validationRules = {
        'items': 'required|array',
        'items.*.productId': 'required|string',
        'items.*.quantity': 'required|integer|min:1|max:1000',
        'shippingAddress.street': 'required|string',
        'shippingAddress.city': 'required|string',
        'shippingAddress.state': 'string',
        'shippingAddress.zipCode': 'required|string',
        'shippingAddress.country': 'required|string'
    };
    
    validator(req.body, validationRules, {}, (err, status) => {
        if (!status) {
            return res.status(412).json({
                success: false,
                message: 'Validation failed',
                data: err
            });
        }
        
        // Business rule validation - check for duplicate products
        const { items } = req.body;
        const errors = {};
        
        const productIds = items.map(item => item.productId);
        const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
        
        if (duplicates.length > 0) {
            errors.items = 'Order contains duplicate products. Increase quantity instead.';
        }
        
        if (Object.keys(errors).length > 0) {
            return res.status(412).json({
                success: false,
                message: 'Business rule validation failed',
                data: errors
            });
        }
        
        next();
    });
};

// Validate update order request
const validateUpdateOrder = (req, res, next) => {
    const validationRules = {
        status: 'string|in:pending,processing,shipped,delivered,cancelled',
        'shippingAddress.street': 'string',
        'shippingAddress.city': 'string',
        'shippingAddress.state': 'string',
        'shippingAddress.zipCode': 'string',
        'shippingAddress.country': 'string',
        paymentId: 'string'
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
    validateCreateOrder,
    validateUpdateOrder
};