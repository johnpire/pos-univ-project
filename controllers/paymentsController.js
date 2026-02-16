const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

// CREATE - Process a new payment
const createPayment = async (req, res) => {
    //#swagger.tags = ['Payments']
    try {
        const { orderId, method, paymentDetails } = req.body;

        // Validate orderId if provided
        if (orderId && !ObjectId.isValid(orderId)) {
            return res.status(400).json({ 
                error: 'Invalid orderId format' 
            });
        }

        // Get order and validate
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if order already has payment
        if (order.paymentId) {
            return res.status(400).json({ error: 'Order already has a payment' });
        }

        // Create payment with order's total amount
        const paymentsCollection = mongodb.getDatabase().db().collection('payments');
        const newPayment = {
            orderId: new ObjectId(orderId),
            amount: parseFloat(order.totalAmount),
            currency: order.currency || 'USD',
            method: method,
            status: 'completed',
            paymentDetails: paymentDetails || {},
            processedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await paymentsCollection.insertOne(newPayment);
        
        // Update order with payment reference (use existing ordersCollection)
        await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { 
                $set: { 
                    paymentId: result.insertedId,
                    status: 'processing',
                    updatedAt: new Date()
                }
            }
        );
        
        res.status(201).json({
            message: 'Payment processed successfully',
            paymentId: result.insertedId,
            payment: newPayment
        });
        
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get all payments
const getAllPayments = async (req, res) => {
    //#swagger.tags = ['Payments']
    try {
        const paymentsCollection = mongodb.getDatabase().db().collection('payments');
        
        const payments = await paymentsCollection.find({})
            .sort({ createdAt: -1 })
            .toArray();
        
        res.status(200).json({
            count: payments.length,
            payments
        });
        
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get single payment by ID
const getPaymentById = async (req, res) => {
    //#swagger.tags = ['Payments']
    try {
        // Validate paymentId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid paymentId format' 
            });
        }

        const paymentId = new ObjectId(req.params.id);
        const paymentsCollection = mongodb.getDatabase().db().collection('payments');
        const payment = await paymentsCollection.findOne({ _id: paymentId });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Get order info
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        const order = await ordersCollection.findOne({ _id: payment.orderId });
        
        res.status(200).json({
            ...payment,
            order: order ? {
                _id: order._id,
                orderDate: order.orderDate,
                status: order.status,
                totalAmount: order.totalAmount
            } : null
        });
        
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE - Update payment by ID
const updatePayment = async (req, res) => {
    //#swagger.tags = ['Payments']
    try {
        // Validate paymentId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid orderId format' 
            });
        }

        const { status, paymentDetails } = req.body;
        const paymentId = new ObjectId(req.params.id);
        
        const paymentsCollection = mongodb.getDatabase().db().collection('payments');
        const payment = await paymentsCollection.findOne({ _id: paymentId });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const updateData = {
            status,
            paymentDetails,
            updatedAt: new Date()
        };
        
        const result = await paymentsCollection.updateOne(
            { _id: paymentId },
            { $set: updateData }
        );
        
        // Handle refund: cancel order and restore stock
        if (status === 'refunded') {
            const ordersCollection = mongodb.getDatabase().db().collection('orders');
            const order = await ordersCollection.findOne({ _id: payment.orderId });
            
            await ordersCollection.updateOne(
                { _id: payment.orderId },
                { 
                    $set: { 
                        status: 'cancelled',
                        updatedAt: new Date()
                    }
                }
            );
            
            // Restore product stock
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
        
        const updatedPayment = await paymentsCollection.findOne({ _id: paymentId });
        
        if (result.matchedCount > 0) {
            res.status(200).json({
                message: 'Payment updated successfully',
                payment: updatedPayment
            });
        } else {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE - Delete payment by ID
const deletePayment = async (req, res) => {
    //#swagger.tags = ['Payments']
    try {
        // Validate paymentId if provided
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid paymentId format' 
            });
        }

        const paymentId = new ObjectId(req.params.id);
        const paymentsCollection = mongodb.getDatabase().db().collection('payments');
        
        const payment = await paymentsCollection.findOne({ _id: paymentId });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Only allow deletion of failed or pending payments
        if (!['pending', 'failed'].includes(payment.status)) {
            return res.status(400).json({ 
                error: 'Cannot delete completed or refunded payments. Use update to change status instead.' 
            });
        }
        
        // Remove payment reference from order
        const ordersCollection = mongodb.getDatabase().db().collection('orders');
        await ordersCollection.updateOne(
            { _id: payment.orderId },
            { 
                $set: { 
                    paymentId: null,
                    updatedAt: new Date()
                }
            }
        );
        
        await paymentsCollection.deleteOne({ _id: paymentId });
        
        res.status(200).json({
            message: 'Payment deleted successfully',
            paymentId
        });
        
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export
module.exports = {
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment
};