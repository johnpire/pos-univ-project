// tests/unit/orders.test.js

const { ObjectId } = require('mongodb');

// Mock the database module
const mockGetDatabase = jest.fn();
jest.mock('../../data/database', () => ({
  getDatabase: () => mockGetDatabase()
}));

// Import controller AFTER mocking
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getTotalSales
} = require('../../controllers/ordersController');

describe('Orders Controller - Unit Tests', () => {
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
      aggregate: jest.fn().mockReturnThis(),
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
  
  // TEST: createOrder
  describe('createOrder', () => {
    it('should create order with product snapshots', async () => {
      req.body = {
        items: [
          { productId: '607f1f77bcf86cd799439021', quantity: 2 }
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      };
      
      const mockProduct = {
        _id: new ObjectId('607f1f77bcf86cd799439021'),
        name: 'Test Product',
        price: 50.00,
        stock: 10,
        isActive: true,
        images: ['image1.jpg']
      };
      
      mockCollection.findOne.mockResolvedValue(mockProduct);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId('807f1f77bcf86cd799439051')
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      await createOrder(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          totalAmount: 100.00,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: expect.any(ObjectId),
              productName: 'Test Product',
              price: 50.00,
              quantity: 2,
              subtotal: 100.00
            })
          ])
        })
      );
      
      // Should reduce stock
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $inc: { stock: -2 }
        })
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
    });
    
    it('should return 404 when product not found', async () => {
      req.body = {
        items: [{ productId: '607f1f77bcf86cd799439021', quantity: 1 }],
        shippingAddress: {}
      };
      
      mockCollection.findOne.mockResolvedValue(null);
      
      await createOrder(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Product')
        })
      );
    });
    
    it('should return 400 when product is inactive', async () => {
      req.body = {
        items: [{ productId: '607f1f77bcf86cd799439021', quantity: 1 }],
        shippingAddress: {}
      };
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId(),
        name: 'Product',
        isActive: false
      });
      
      await createOrder(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('no longer available')
        })
      );
    });
    
    it('should return 400 when insufficient stock', async () => {
      req.body = {
        items: [{ productId: '607f1f77bcf86cd799439021', quantity: 100 }],
        shippingAddress: {}
      };
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId(),
        name: 'Product',
        price: 50,
        stock: 5,
        isActive: true
      });
      
      await createOrder(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Insufficient stock')
        })
      );
    });
  });
  
  // TEST: getAllOrders
  describe('getAllOrders', () => {
    it('should get all orders sorted by creation date', async () => {
      const mockOrders = [
        { _id: new ObjectId(), status: 'delivered' },
        { _id: new ObjectId(), status: 'pending' }
      ];
      
      mockCollection.toArray.mockResolvedValue(mockOrders);
      
      await getAllOrders(req, res);
      
      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(mockCollection.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        orders: mockOrders
      });
    });
  });
  
  // TEST: getOrderById
  describe('getOrderById', () => {
    it('should get order with payment info', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      
      const mockOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        paymentId: new ObjectId('907f1f77bcf86cd799439061'),
        status: 'delivered'
      };
      
      const mockPayment = {
        _id: new ObjectId('907f1f77bcf86cd799439061'),
        amount: 100,
        status: 'completed'
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockPayment);
      
      await getOrderById(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: mockOrder._id,
          payment: mockPayment
        })
      );
    });
    
    it('should return 404 when order not found', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      mockCollection.findOne.mockResolvedValue(null);
      
      await getOrderById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
  
  // TEST: updateOrder
  describe('updateOrder', () => {
    it('should update order status', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      req.body = {
        status: 'shipped',
        shippingAddress: { street: '456 New St' }
      };
      
      const mockUpdatedOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        status: 'shipped'
      };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockCollection.findOne.mockResolvedValue(mockUpdatedOrder);
      
      await updateOrder(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Order updated successfully'
        })
      );
    });
    
    it('should return 404 when updating non-existent order', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      req.body = { status: 'shipped' };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 0 });
      
      await updateOrder(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
  
  // TEST: deleteOrder
  describe('deleteOrder', () => {
    it('should delete pending order and restore stock', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      
      const mockOrder = {
        _id: new ObjectId('807f1f77bcf86cd799439051'),
        status: 'pending',
        items: [
          {
            productId: new ObjectId('607f1f77bcf86cd799439021'),
            quantity: 2
          }
        ]
      };
      
      mockCollection.findOne.mockResolvedValue(mockOrder);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      await deleteOrder(req, res);
      
      // Should restore stock
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $inc: { stock: 2 }
        })
      );
      
      expect(mockCollection.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    it('should prevent deletion of processing orders', async () => {
      req.params.id = '807f1f77bcf86cd799439051';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId(),
        status: 'processing'
      });
      
      await deleteOrder(req, res);
      
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Cannot delete')
        })
      );
    });
  });
  
  // TEST: getTotalSales
  describe('getTotalSales', () => {
    it('should calculate total sales statistics', async () => {
      const mockSummary = [{
        _id: null,
        totalSales: 5000,
        totalOrders: 10,
        averageOrderValue: 500
      }];
      
      const mockByStatus = [
        { _id: 'delivered', count: 8, totalAmount: 4500 },
        { _id: 'pending', count: 2, totalAmount: 500 }
      ];
      
      const mockTopProducts = [
        {
          _id: new ObjectId(),
          productName: 'iPhone',
          totalQuantity: 5,
          totalRevenue: 5000
        }
      ];
      
      mockCollection.toArray
        .mockResolvedValueOnce(mockSummary)
        .mockResolvedValueOnce(mockByStatus)
        .mockResolvedValueOnce(mockTopProducts);
      
      await getTotalSales(req, res);
      
      expect(mockCollection.aggregate).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({
        summary: {
          totalSales: 5000,
          totalOrders: 10,
          averageOrderValue: 500
        },
        salesByStatus: mockByStatus,
        topProducts: mockTopProducts
      });
    });
    
    it('should return zeros when no delivered orders', async () => {
      mockCollection.toArray
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      await getTotalSales(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        summary: {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0
        },
        salesByStatus: [],
        topProducts: []
      });
    });
  });
});