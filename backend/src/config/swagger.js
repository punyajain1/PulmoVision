const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lung Cancer Risk Prediction API",
      version: "1.0.0",
      description:
        "Backend API for user auth, storing predictions, and dashboard stats. " +
        "This system is for educational and research purposes only and is not a medical diagnosis.",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                token: { type: "string" },
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
        PredictionInput: {
          type: "object",
          properties: {
            GENDER: { type: "string", example: "M" },
            AGE: { type: "integer", example: 65 },
            SMOKING: { type: "integer", example: 1 },
            YELLOW_FINGERS: { type: "integer", example: 1 },
            ANXIETY: { type: "integer", example: 0 },
            PEER_PRESSURE: { type: "integer", example: 0 },
            CHRONIC_DISEASE: { type: "integer", example: 1 },
            FATIGUE: { type: "integer", example: 1 },
            ALLERGY: { type: "integer", example: 0 },
            WHEEZING: { type: "integer", example: 1 },
            ALCOHOL_CONSUMING: { type: "integer", example: 1 },
            COUGHING: { type: "integer", example: 1 },
            SHORTNESS_OF_BREATH: { type: "integer", example: 1 },
            SWALLOWING_DIFFICULTY: { type: "integer", example: 0 },
            CHEST_PAIN: { type: "integer", example: 1 },
          },
        },
        Prediction: {
          type: "object",
          properties: {
            id: { type: "string" },
            prediction: { type: "string", example: "High Risk" },
            probability: { type: "number", example: 0.87 },
            modelName: { type: "string", example: "BaggingClassifier" },
            inputData: { $ref: "#/components/schemas/PredictionInput" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Registration, login, current user" },
      { name: "Predictions", description: "Create and view predictions" },
      { name: "Dashboard", description: "Aggregate stats" },
      { name: "Model", description: "ML model metadata" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
