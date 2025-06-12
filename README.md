# Safe Checker API

API for checking explicit content in images using Sightengine and AWS Rekognition services.

## Features

- Image content moderation using Sightengine and AWS Rekognition
- Automatic service fallback when limits are reached
- Usage tracking and limits enforcement
- MIME type validation (JPG/PNG)
- API key authentication
- Detailed error handling and logging

## Prerequisites

- Node.js >= 18.0.0
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

### Check Image Content

Default request (automatic provider selection):
```http
POST /api/images/check
Content-Type: application/json
x-api-key: test-key-1

{
  "imageUrl": "https://example.com/image.jpg"
}
```

Request with specific provider:
```http
POST /api/images/check
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
  "imageUrl": "https://example.com/image.jpg"
}
```

Response (Unsafe Image):
```json
{
  "success": true,
  "is_safe": false,
  "reason": "nudity",
  "provider": "sightengine",
  "imageUrl": "https://example.com/unsafe-image.jpg"
}
```

Possible reasons for unsafe content:
- `nudity`: Explicit nudity or sexual content
- `suggestive`: Suggestive content (excluding swimwear/bikini)
- `violence`: Violent content
- `gore`: Blood or gore
- `hate`: Hate symbols or content
- `other`: Other unsafe content

### Get Usage Statistics

```http
GET /api/images/usage
x-api-key: test-key-1
```

Response:
```json
{
  "success": true,
  "data": {
    "sightengine": {
      "daily": 123,
      "monthly": 456
    },
    "rekognition": {
      "daily": 789,
      "monthly": 1011
    }
  }
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
  - Daily: 500 requests
  - Monthly: 2000 requests
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

## License

MIT 