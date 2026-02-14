const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'POS Univ Project API',
        description: 'API documentation for the POS Univ Project, providing endpoints for user authentication, test management, and more.',
    },
    host: 'localhost:4000',
    schemes: ['https', 'http'],
};

const outputFile = './swagger.json';
const endpointsFiles = ['./routes/index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);