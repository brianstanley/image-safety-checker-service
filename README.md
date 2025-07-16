# Safe Checker API

API for checking explicit content in images using Sightengine and AWS Rekognition services.

## Features

- Image content moderation using Sightengine and AWS Rekognition
- Automatic service fallback when limits are reached
- Usage tracking and limits enforcement
- MIME type validation (JPG/PNG)
- API key authentication
- Detailed error handling and logging
- **API versioning** with `/api/v1/` endpoints
- **Confidence scores** for content detection

## Prerequisites

- Node.js >= 22.0.0
- MongoDB
- Sightengine API credentials
- AWS Rekognition credentials

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
MONGODB_URI=mongodb://localhost:27017/safe-checker

# API Authentication
API_KEY=your-api-key-here

# Sightengine
SIGHTENGINE_API_KEY=your-sightengine-api-key
SIGHTENGINE_API_SECRET=your-sightengine-api-secret

# AWS Rekognition
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/safe-checker.git
cd safe-checker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### API Versioning

The API now supports versioning. All endpoints are prefixed with `/api/v1/`:

- **Current version**: `/api/v1/`
- **Legacy endpoints**: `/api/images/*` and `/api/admin/*` (redirect to v1)

### Check Image Content

Default request (automatic provider selection):
```http
POST /api/v1/images/check
Content-Type: application/json
x-api-key: test-key-1

{
  "imageUrl": "https://example.com/image.jpg"
}
```

Request with specific provider:
```http
POST /api/v1/images/check
Content-Type: application/json
x-api-key: test-key-1

{
  "imageUrl": "https://example.com/image.jpg",
  "service": "rekognition"
}
```

Available providers:
- `sightengine`: Uses Sightengine API
- `rekognition`: Uses AWS Rekognition

Response (Safe Image):
```json
{
  "success": true,
  "is_safe": true,
  "reason": null,
  "provider": "sightengine",
  "imageUrl": "https://example.com/image.jpg",
  "score": 0.1
}
```

Response (Unsafe Image):
```json
{
  "success": true,
  "is_safe": false,
  "reason": "nudity",
  "provider": "sightengine",
  "imageUrl": "https://example.com/unsafe-image.jpg",
  "score": 0.85
}
```

### Score Interpretation

The `score` field represents the confidence/probability of inappropriate content:

- **0.0 - 0.3**: Low probability of inappropriate content
- **0.3 - 0.7**: Moderate probability
- **0.7 - 1.0**: High probability of inappropriate content

### Get Usage Statistics

```http
GET /api/v1/images/usage
x-api-key: test-key-1
```

Response:
```json
{
  "success": true,
  "data": {
    "sightengine": {
      "daily": { "count": 123, "limit": 500 },
      "monthly": { "count": 456, "limit": 2000 }
    },
    "rekognition": {
      "daily": { "count": 789, "limit": 1000 },
      "monthly": { "count": 1011, "limit": 4000 }
    }
  }
}
```

### Admin Endpoints

#### Reset Usage Statistics
```http
POST /api/v1/admin/reset-usage
x-api-key: test-key-1
x-admin-key: admin-key-here
```

Response:
```json
{
  "success": true,
  "message": "Usage statistics reset successfully"
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "imageUrl",
      "message": "imageUrl is required"
    }
  ]
}
```

### Service Limit Reached
```json
{
  "success": false,
  "error": "Sightengine daily or monthly limit reached"
}
```

## Usage Limits

- Sightengine:
  - Daily: 250 API calls (500 operations with 2 models per call)
  - Monthly: 1000 API calls (2000 operations with 2 models per call)
- AWS Rekognition:
  - Monthly: 4000 requests

The API automatically switches to AWS Rekognition when Sightengine limits are reached.

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run in production mode
npm start

# Run tests
npm test
```

## API Information

Visit the root endpoint to get API information:

```http
GET /
```

Response:
```json
{
  "name": "Safe Checker API",
  "version": "1.0.0",
  "endpoints": {
    "v1": "/api/v1",
    "health": "/health"
  },
  "documentation": "API documentation coming soon"
}
```

## License

MIT 