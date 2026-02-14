const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');


// CREATE - Create a new order
const createOrder = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const { items, shippingAddress } = req.body;
        
        const productsCollection = mongodb.getDatabase().db().collection('products');
        const orderItems = [];
        let totalAmount = 0;
        
        // Build order items with product snapshots and validate stock
        for (const item of items) {
            const productId = new ObjectId(item.productId);
            const product = await productsCollection.findOne({ _id: productId });
            
            if (!product) {
                return res.status(404).json({ 
                    error: `Product ${item.productId} not found` 
                });
            }
            
            if (!product.isActive) {
                return res.status(400).json({ 
                    error: `Product ${product.name} is no longer available` 
                });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
                });
            }
            
            // Snapshot product data at time of order
            const subtotal = product.price * item.quantity;
            orderItems.push({
                productId: productId,
                productName: product.name,
                productImage: product.images[0] || '',
                price: product.price,
                quantity: item.quantity,
                subtotal: subtotal
            });
            
            totalAmount += subtotal;
        }
        
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const newOrder = {
            orderDate: new Date(),
            status: 'pending',
            totalAmount: totalAmount,
            items: orderItems,
            shippingAddress: shippingAddress,
            paymentId: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await ordersCollection.insertOne(newOrder);
        
        // Reduce product stock
        for (const item of items) {
            const productId = new ObjectId(item.productId);
            await productsCollection.updateOne(
                { _id: productId },
                { 
                    $inc: { stock: -item.quantity },
                    $set: { updatedAt: new Date() }
                }
            );
        }
        
        res.status(201).json({
            message: 'Order created successfully',
            orderId: result.insertedId, // insertedId returns the ID of an element after using 'insertOne'
            order: newOrder
        });
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get all orders
const getAllOrders = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        
        // Sort by most recent orders first
        const orders = await ordersCollection.find({})
            .sort({ createdAt: -1 })
            .toArray();
        
        res.status(200).json({
            count: orders.length,
            orders
        });
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get single order by ID
const getOrderById = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const orderId = new ObjectId(req.params.id);
        
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const order = await ordersCollection.findOne({ _id: orderId });
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Get payment info if exists
        let payment = null;
        if (order.paymentId) {
            const paymentsCollection = mongodb.getDatabase().db().collection('payments');
            payment = await paymentsCollection.findOne({ _id: order.paymentId });
        }
        
        res.status(200).json({
            ...order,
            payment: payment
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE - Update order by ID
const updateOrder = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const orderId = new ObjectId(req.params.id);
        const { status, shippingAddress, paymentId } = req.body;
        
        const updateData = {
            status,
            shippingAddress,
            paymentId: paymentId ? new ObjectId(paymentId) : null,
            updatedAt: new Date()
        };
        
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const result = await ordersCollection.updateOne(
            { _id: orderId },
            { $set: updateData }
        );
        
        const updatedOrder = await ordersCollection.findOne({ _id: orderId });
        if (result.matchedCount > 0) {
            res.status(200).json({
                message: 'Order updated successfully',
                order: updatedOrder
            });
        } else {
            return res.status(404).json({ error: 'Order not found' });
        }
        
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE - Delete order by ID
const deleteOrder = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const orderId = new ObjectId(req.params.id);
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        
        const order = await ordersCollection.findOne({ _id: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Only allow deletion of pending or cancelled orders
        if (!['pending', 'cancelled'].includes(order.status)) {
            return res.status(400).json({ 
                error: 'Cannot delete orders that are processing, shipped, or delivered' 
            });
        }
        
        // Restore product stock if pending
        if (order.status === 'pending') {
            const productsCollection = mongodb.getDatabase().db().collection('products');
            
            for (const item of order.items) {
                await productsCollection.updateOne(
                    { _id: item.productId },
                    { 
                        $inc: { stock: item.quantity },
                        $set: { updatedAt: new Date() }
                    }
                );
            }
        }
        
        await ordersCollection.deleteOne({ _id: orderId });
        
        res.status(200).json({
            message: 'Order deleted successfully',
            orderId
        });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ADMIN - Get total sales statistics
const getTotalSales = async (req, res) => {
    //#swagger.tags = ['Orders']
    try {
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        
        // Calculate sales from delivered orders only
        const result = await ordersCollection.aggregate([ // aggreate means to process data records by stages and return computed results
            { $match: { status: 'delivered' } }, // stage 1: filter documents by status
            {
                $group: { // stage 2: group all documents together
                    _id: null, // group key, null means all documents in one group | if for example I grouped by 'status', I would get separate results for each status value instead of one
                    totalSales: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]).toArray();
        
        // Get breakdown by status
        const salesByStatus = await ordersCollection.aggregate([
            {
                $group: {
                    _id: '$status', // group by the 'status' field; each unique status becomes a separate group
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            }
        ]).toArray();
        
        // Get top selling products
        const topProducts = await ordersCollection.aggregate([
            { $match: { status: 'delivered' } },
            { $unwind: '$items' }, // "unwind" takes the 'items' array and creates a separate document for each element in that array. 
                        // For example, if an order has 3 items, it becomes 3 documents with the same _id as the original order, 
                        // but each document contains only one item from the array.
            {
                $group: {
                    _id: '$items.productId', // group by productId | was unwinded from ordersId
                    productName: { $first: '$items.productName' }, // get the product name from the first document in each group
                                                                // (since all documents in the group have the same productId,
                                                                // they willalso have the same productName)
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]).toArray();
        
        res.status(200).json({
            summary: {
                totalSales: result[0]?.totalSales || 0, // ?. checks if result[0] exists before trying to access totalSales;
                                                    // if result[0] is undefined, it returns undefined instead of throwing an error.
                                                    // The || 0 part means that if result[0]?.totalSales is undefined
                                                    // (which would happen if there are no delivered orders), it will default to 0.
                totalOrders: result[0]?.totalOrders || 0,
                averageOrderValue: result[0]?.averageOrderValue || 0
            },
            salesByStatus,
            topProducts
        });
        
    } catch (error) {
        console.error('Error calculating total sales:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export
module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    getTotalSales
};