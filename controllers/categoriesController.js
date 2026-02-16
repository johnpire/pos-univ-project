const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

// CREATE - Add a new category
const createCategory = async (req, res) => {
    //#swagger.tags = ['Categories']
    try {
        const { name, description, parentCategoryId, slug, isActive } = req.body;
        
        // Validate parentCategoryId if provided
        if (parentCategoryId && !ObjectId.isValid(parentCategoryId)) {
            return res.status(400).json({ 
                error: 'Invalid parentCategoryId format' 
            });
        }
        
        const categoriesCollection = mongodb.getDatabase().db().collection('categories');
        
        // Create new category document
        const newCategory = {
            name,
            description: description || '',
            parentCategoryId: parentCategoryId ? new ObjectId(parentCategoryId) : null,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            isActive: isActive !== undefined ? isActive : true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await categoriesCollection.insertOne(newCategory);
        
        res.status(201).json({
            message: 'Category created successfully',
            categoryId: result.insertedId,
            category: newCategory
        });
        
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get all categories
const getAllCategories = async (req, res) => {
    //#swagger.tags = ['Categories']
    try {
        const categoriesCollection = mongodb.getDatabase().db().collection('categories');
        const categories = await categoriesCollection.find({}).toArray();
        
        res.status(200).json({
            count: categories.length,
            categories
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get single category by ID
const getCategoryById = async (req, res) => {
    //#swagger.tags = ['Categories']
    try {
        // Validate categoryId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid categoryId format' 
            });
        }

        const categoryId = new ObjectId(req.params.id);
        const categoriesCollection = mongodb.getDatabase().db().collection('categories');
        const category = await categoriesCollection.findOne({ _id: categoryId });
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        // Get parent category info if exists
        let parentCategory = null;
        if (category.parentCategoryId) {
            parentCategory = await categoriesCollection.findOne({ 
                _id: category.parentCategoryId 
            });
        }
        
        // Get subcategories
        const subcategories = await categoriesCollection.find({ 
            parentCategoryId: categoryId 
        }).toArray();
        
        // Get product count in this category
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const productCount = await productsCollection.countDocuments({ 
            categoryId: categoryId 
        });
        
        res.status(200).json({
            ...category,
            parentCategory: parentCategory ? { 
                _id: parentCategory._id,
                name: parentCategory.name,
                slug: parentCategory.slug 
            } : null,
            subcategories,
            productCount
        });
        
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE - Update category by ID
const updateCategory = async (req, res) => {
    //#swagger.tags = ['Categories']
    try {
        // Validate categoryId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid categoryId format' 
            });
        }
        
        const categoryId = new ObjectId(req.params.id);
        const { name, description, parentCategoryId, slug, isActive } = req.body;

        // Validate parentCategoryId if provided
        if (parentCategoryId && !ObjectId.isValid(parentCategoryId)) {
            return res.status(400).json({ 
                error: 'Invalid parentCategoryId format' 
            });
        }
        
        const updateData = {
            name,
            description,
            parentCategoryId: parentCategoryId ? new ObjectId(parentCategoryId) : null,
            slug,
            isActive,
            updatedAt: new Date()
        };
        
        const categoriesCollection = mongodb.getDatabase().db().collection('categories');
        const result = await categoriesCollection.updateOne(
            { _id: categoryId },
            { $set: updateData }
        );
        
        const updatedCategory = await categoriesCollection.findOne({ _id: categoryId });
        
        if (result.matchedCount > 0) {
            res.status(200).json({
                message: 'Category updated successfully',
                category: updatedCategory
            });
        } else {
            return res.status(404).json({ error: 'Category not found' });
        }
        
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE - Delete category by ID
const deleteCategory = async (req, res) => {
    //#swagger.tags = ['Categories']
    try {
        // Validate categoryId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid categoryId format' 
            });
        }

        const categoryId = new ObjectId(req.params.id);
        const categoriesCollection = mongodb.getDatabase().db().collection('categories');
        
        const category = await categoriesCollection.findOne({ _id: categoryId });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        // Check if category has subcategories
        const subcategories = await categoriesCollection.countDocuments({ 
            parentCategoryId: categoryId 
        });
        
        if (subcategories > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category with subcategories. Delete subcategories first.' 
            });
        }
        
        // Check if category has products
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const productsCount = await productsCollection.countDocuments({ 
            categoryId: categoryId 
        });
        
        if (productsCount > 0) {
            // Soft delete: mark as inactive
            await categoriesCollection.updateOne(
                { _id: categoryId },
                { 
                    $set: { 
                        isActive: false,
                        updatedAt: new Date()
                    }
                }
            );
            
            return res.status(200).json({
                message: 'Category marked as inactive (contains products)',
                categoryId
            });
        }
        
        // Hard delete if no products or subcategories
        await categoriesCollection.deleteOne({ _id: categoryId });
        
        res.status(200).json({
            message: 'Category deleted successfully',
            categoryId
        });
        
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export
module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};