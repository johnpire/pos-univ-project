const validator = require('../helpers/validate');

// Validate create product request
const validateCreateProduct = (req, res, next) => {
    const validationRules = {
        name: 'required|string|min:3|max:200',
        description: 'required|string|min:10',
        price: 'required|numeric|min:0',
        categoryId: 'required|string',
        stock: 'required|integer|min:0',
        isActive: 'boolean'
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

// Validate update product request
const validateUpdateProduct = (req, res, next) => {
    const validationRules = {
        name: 'string|min:3|max:200',
        description: 'string|min:10',
        price: 'numeric|min:0',
        categoryId: 'string',
        stock: 'integer|min:0',
        isActive: 'boolean'
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
    validateCreateProduct,
    validateUpdateProduct
};