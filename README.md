# Safe Checker API

A TypeScript-based Express API for checking explicit content in images using multiple services (Google Cloud Vision and SightEngine).

## Features

- 🔐 API Key authentication
- 📸 Image moderation content checking using multiple services
- 📊 Usage tracking and limits
- 🔄 Dynamic service selection based on usage
- 🛡️ Admin endpoints for usage management

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Google Cloud Vision API key
- SightEngine API credentials

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

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
API_KEYS=["your-api-key-1", "your-api-key-2"]
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
SIGHTENGINE_API_KEY=your_sightengine_api_key
SIGHTENGINE_API_SECRET=your_sightengine_api_secret
ADMIN_API_KEY=your_admin_api_key
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Check Image
```http
POST /api/check-image
Headers:
  x-api-key: your-api-key
Body:
{
  "imageUrl": "https://example.com/image.jpg"
}
```

Response:
```json
{
  "safe": true,
  "source": "google",
  "confidence": 0.97
}
```

### Reset Usage (Admin)
```http
POST /api/admin/reset-usage
Headers:
  x-admin-key: your-admin-key
Body:
{
  "serviceName": "google",
  "month": "2024-03"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 