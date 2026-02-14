const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

// CREATE - Add a new product
const createProduct = async (req, res) => {
    //#swagger.tags = ['Products']
    try {
        const { name, description, price, categoryId, stock, images, specifications, isActive } = req.body;
        
        // Create new product document
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const newProduct = {
            name,
            description: description || '',
            price: parseFloat(price) || 0,
            categoryId: categoryId ? new ObjectId(categoryId): null,
            stock: stock || 0,
            images: images || [],
            specifications: specifications || {},
            isActive: isActive !== undefined ? isActive : true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await productsCollection.insertOne(newProduct);  
        
        res.status(201).json({
            message: 'Product created successfully',
            productId: result.insertedId,
            product: newProduct
        });
        
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get all products
const getAllProducts = async (req, res) => {
    //#swagger.tags = ['Products']
    try {
        const productsCollection = mongodb.getDatabase().db().collection('products');
        
        // ADDITION | Filtering system
        const { categoryId, minPrice, maxPrice, isActive } = req.query;
        const filter = {};
        
        // convert categoryId (string) back to ObjectId so it is readable
        if (categoryId) {
            filter.categoryId = new ObjectId(categoryId);
        }

        // filter by price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        // filter by active status
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        
        const products = await productsCollection.find(filter).toArray();
        
        res.status(200).json({
            count: products.length,
            products
        });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get single product by ID
const getProductById = async (req, res) => {
    //#swagger.tags = ['Products']
    try {
        const productId = new ObjectId(req.params.id);
        
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const product = await productsCollection.findOne({ _id: productId });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.status(200).json({
            ...product,
            category: category ? { name: category.name, slug: category.slug } : null
        });
        
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE - Update product by ID
const updateProduct = async (req, res) => {
    //#swagger.tags = ['Products']
    try {
        const { name, description, price, categoryId, stock, images, specifications, isActive } = req.body;
        const productId = new ObjectId(req.params.id);

        // get all data
        const updateData = {name, description, price,
            categoryId: new ObjectId(categoryId),
            stock, images, specifications, isActive
        }
        
        // Add updatedAt timestamp
        updateData.updatedAt = new Date();
        
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const result = await productsCollection.updateOne(      
            { _id: productId },
            { $set: updateData }
        );
        
        // Fetch and return updated product | this is necessary because the updateOne method does not return the updated document compared to replaceOne
        const updatedProduct = await productsCollection.findOne({ _id: productId });

        if (result.matchedCount > 0) {
            res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        })} else {
            return res.status(404).json({ error: 'Product not found' });
        }
        
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE - Delete product by ID
const deleteProduct = async (req, res) => {
    //#swagger.tags = ['Products']
    try {
        const productId = new ObjectId(req.params.id);
        const productsCollection = mongodb.getDatabase().db().collection('products');
        
        // Check if product exists
        const product = await productsCollection.findOne({ _id: productId });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if product is referenced in any orders
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const ordersWithProduct = await ordersCollection.findOne({
            'items.productId': productId
        });
        
        if (ordersWithProduct) {
            // Soft delete: just mark as inactive instead of removing
            await productsCollection.updateOne(
                { _id: productId },
                { 
                    $set: { 
                        isActive: false,
                        updatedAt: new Date()
                    }
                }
            );
            
            return res.status(200).json({
                message: 'Product marked as inactive (referenced in orders)',
                productId
            });
        }
        
        // Hard delete if not referenced
        await productsCollection.deleteOne({ _id: productId });
        
        res.status(200).json({
            message: 'Product deleted successfully',
            productId
        });
        
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export
module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
};