// tests/unit/payments.test.js

const { ObjectId } = require('mongodb');

// Mock the database module
const mockGetDatabase = jest.fn();
jest.mock('../../data/database', () => ({
  getDatabase: () => mockGetDatabase()
}));

// Import controller AFTER mocking
const {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment
} = require('../../controllers/paymentsController');

describe('Payments Controller - Unit Tests', () => {
  let req, res, mockCollection;
  
  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      toArray: jest.fn(),
      sort: jest.fn().mockReturnThis()
    };
    
    mockGetDatabase.mockReturnValue({
      db: () => ({
        collection: () => mockCollection
      })
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // TEST: createPayment
  describe('createPayment', () => {
    it('should create payment with order amount', async () => {
      req.body = {
        orderId: '807f1f77bcf86cd799439051',
        currency: 'USD',
        method: 'credit_card',
        paymentDetails: {
          last4: '4242',
          cardType: 'Visa'
        }
      };
      
      const mockOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        totalAmount: 150.00,
        paymentId: null
      };
      
      mockCollection.findOne.mockResolvedValue(mockOrder);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId('907f1f77bcf86cd799439061')
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      await createPayment(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: expect.any(ObjectId),
          amount: 150.00,
          currency: 'USD',
          method: 'credit_card',
          status: 'completed'
        })
      );
      
      // Should update order with payment reference
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $set: expect.objectContaining({
            paymentId: expect.any(ObjectId),
            status: 'processing'
          })
        })
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment processed successfully'
        })
      );
    });
    
    it('should return 404 when order not found', async () => {
      req.body = {
        orderId: '807f1f77bcf86cd799439051',
        method: 'credit_card'
      };
      
      mockCollection.findOne.mockResolvedValue(null);
      
      await createPayment(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
    });
    
    it('should return 400 when order already has payment', async () => {
      req.body = {
        orderId: '807f1f77bcf86cd799439051',
        method: 'credit_card'
      };
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        totalAmount: 100,
        paymentId: new ObjectId('907f1f77bcf86cd799439061')
      });
      
      await createPayment(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Order already has a payment'
      });
    });
    
    it('should use default currency USD if not provided', async () => {
      req.body = {
        orderId: '807f1f77bcf86cd799439051',
        method: 'paypal'
      };
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        totalAmount: 200,
        paymentId: null
      });
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      await createPayment(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD'
        })
      );
    });
  });
  
  // TEST: getAllPayments
  describe('getAllPayments', () => {
    it('should get all payments sorted by creation date', async () => {
      const mockPayments = [
        {
          _id: new ObjectId(),
          amount: 100,
          status: 'completed'
        },
        {
          _id: new ObjectId(),
          amount: 200,
          status: 'pending'
        }
      ];
      
      mockCollection.toArray.mockResolvedValue(mockPayments);
      
      await getAllPayments(req, res);
      
      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(mockCollection.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        payments: mockPayments
      });
    });
    
    it('should return empty array when no payments', async () => {
      mockCollection.toArray.mockResolvedValue([]);
      
      await getAllPayments(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        payments: []
      });
    });
  });
  
  // TEST: getPaymentById
  describe('getPaymentById', () => {
    it('should get payment with order info', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      
      const mockPayment = {
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        orderId: new ObjectId('807f1f77bcf86cd799439051'),
        amount: 100,
        status: 'completed'
      };
      
      const mockOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        orderDate: new Date(),
        status: 'delivered',
        totalAmount: 100
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockOrder);
      
      await getPaymentById(req, res);
      
      expect(mockCollection.findOne).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          order: expect.objectContaining({
            _id: mockOrder._id,
            status: 'delivered'
          })
        })
      );
    });
    
    it('should return 404 when payment not found', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      mockCollection.findOne.mockResolvedValue(null);
      
      await getPaymentById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payment not found' });
    });
  });
  
  // TEST: updatePayment
  describe('updatePayment', () => {
    it('should update payment status', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      req.body = {
        status: 'completed',
        paymentDetails: { transactionId: 'txn_123' }
      };
      
      const mockPayment = {
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        orderId: new ObjectId('807f1f77bcf86cd799439051'),
        status: 'pending'
      };
      
      const mockUpdatedPayment = {
        ...mockPayment,
        status: 'completed'
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockUpdatedPayment);
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      
      await updatePayment(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            updatedAt: expect.any(Date)
          })
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    it('should handle refund and restore stock', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      req.body = { status: 'refunded' };
      
      const mockPayment = {
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        orderId: new ObjectId('807f1f77bcf86cd799439051')
      };
      
      const mockOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        items: [
          {
            productId: new ObjectId('607f1f77bcf86cd799439021'),
            quantity: 2
          }
        ]
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockPayment);
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      
      await updatePayment(req, res);
      
      // Should update order to cancelled
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockPayment.orderId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'cancelled'
          })
        })
      );
      
      // Should restore product stock
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $inc: { stock: 2 }
        })
      );
    });
    
    it('should return 404 when payment not found', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      req.body = { status: 'completed' };
      
      mockCollection.findOne.mockResolvedValue(null);
      
      await updatePayment(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
  
  // TEST: deletePayment
  describe('deletePayment', () => {
    it('should delete pending payment', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      
      const mockPayment = {
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        orderId: new ObjectId('807f1f77bcf86cd799439051'),
        status: 'pending'
      };
      
      mockCollection.findOne.mockResolvedValue(mockPayment);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      await deletePayment(req, res);
      
      // Should remove payment reference from order
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockPayment.orderId },
        expect.objectContaining({
          $set: expect.objectContaining({
            paymentId: null
          })
        })
      );
      
      expect(mockCollection.deleteOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment deleted successfully'
        })
      );
    });
    
    it('should delete failed payment', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        orderId: new ObjectId('807f1f77bcf86cd799439051'),
        status: 'failed'
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      await deletePayment(req, res);
      
      expect(mockCollection.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    it('should prevent deletion of completed payments', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        status: 'completed'
      });
      
      await deletePayment(req, res);
      
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Cannot delete completed')
        })
      );
    });
    
    it('should prevent deletion of refunded payments', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        status: 'refunded'
      });
      
      await deletePayment(req, res);
      
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    it('should return 404 when payment not found', async () => {
      req.params.id = '907f1f77bcf86cd799439061';
      mockCollection.findOne.mockResolvedValue(null);
      
      await deletePayment(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payment not found' });
    });
  });
});