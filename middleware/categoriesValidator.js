const validator = require('../helpers/validate');

// Validate create category request
const validateCreateCategory = (req, res, next) => {
    const validationRules = {
        name: 'required|string|min:2|max:100',
        description: 'string',
        slug: 'string|min:2|max:100',
        parentCategoryId: 'string',
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

// Validate update category request
const validateUpdateCategory = (req, res, next) => {
    const validationRules = {
        name: 'string|min:2|max:100',
        description: 'string',
        slug: 'string|min:2|max:100',
        parentCategoryId: 'string',
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
    validateCreateCategory,
    validateUpdateCategory
};