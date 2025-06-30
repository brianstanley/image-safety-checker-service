# Safe Checker API - Endpoints Documentation

## API Versioning

The Safe Checker API now supports versioning. All endpoints are prefixed with `/api/v1/` to indicate the API version.

## Base URL

```
http://localhost:3000
```

## Endpoints

### Health Check
- **GET** `/health`
- **Description**: Check if the API is running
- **Response**: `{ "status": "ok" }`

### API Info
- **GET** `/`
- **Description**: Get API information and available versions
- **Response**: API metadata and available endpoints

### Image Analysis (v1)

#### Check Image
- **POST** `/api/v1/images/check`
- **Description**: Analyze an image for inappropriate content
- **Headers**: 
  - `x-api-key`: Your API key (required)
  - `Content-Type`: `application/json`
- **Body**:
  ```json
  {
    "imageUrl": "https://example.com/image.jpg",
    "service": "sightengine" // optional: "sightengine" or "rekognition"
  }
  ```
- **Response**:
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

#### Get Usage Statistics
- **GET** `/api/v1/images/usage`
- **Description**: Get usage statistics for both services
- **Headers**: 
  - `x-api-key`: Your API key (required)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "sightengine": {
        "daily": { "count": 0, "limit": 1000 },
        "monthly": { "count": 0, "limit": 10000 }
      },
      "rekognition": {
        "daily": { "count": 0, "limit": 1000 },
        "monthly": { "count": 0, "limit": 10000 }
      }
    }
  }
  ```

### Admin (v1)

#### Reset Usage
- **POST** `/api/v1/admin/reset-usage`
- **Description**: Reset usage statistics (admin only)
- **Headers**: 
  - `x-api-key`: Your API key (required)
  - `x-admin-key`: Admin key (required)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Usage statistics reset successfully"
  }
  ```

## Score Interpretation

The `score` field in the response represents the confidence/probability of inappropriate content:

- **0.0 - 0.3**: Low probability of inappropriate content
- **0.3 - 0.7**: Moderate probability
- **0.7 - 1.0**: High probability of inappropriate content

### Score Calculation:
- **Sightengine**: Maximum probability across all detected categories
- **Rekognition**: Highest confidence level (converted from 0-100 to 0-1 scale)

## Backward Compatibility

For backward compatibility, the old endpoints are still available and will redirect to the v1 endpoints:

- `/api/images/*` → `/api/v1/images/*`
- `/api/admin/*` → `/api/v1/admin/*`

## Error Responses

The API now provides detailed error responses with specific error types and appropriate HTTP status codes.

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "errorType": "error_category",
  "provider": "sightengine|rekognition", // optional
  "imageUrl": "https://example.com/image.jpg", // optional
  "details": [] // optional validation details
}
```

### Error Types

#### Validation Errors (400)
```json
{
  "success": false,
  "error": "Validation error",
  "errorType": "validation",
  "details": [
    {
      "field": "imageUrl",
      "message": "Invalid URL format"
    }
  ]
}
```

#### Image Not Found (404)
```json
{
  "success": false,
  "error": "Image not found or inaccessible: https://example.com/nonexistent.jpg",
  "errorType": "image_not_found",
  "provider": "sightengine",
  "imageUrl": "https://example.com/nonexistent.jpg"
}
```

#### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": "sightengine rate limit exceeded",
  "errorType": "rate_limit",
  "provider": "sightengine"
}
```

#### Service Unavailable (503)
```json
{
  "success": false,
  "error": "sightengine service is currently unavailable: Network error",
  "errorType": "service_unavailable",
  "provider": "sightengine"
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "error": "sightengine authentication failed",
  "errorType": "authentication",
  "provider": "sightengine"
}
```

#### Internal Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "errorType": "internal"
}
```

### Common Error Scenarios

1. **Image URL doesn't exist**: Returns 404 with `image_not_found` error type
2. **Invalid image URL format**: Returns 400 with `validation` error type
3. **Service rate limit reached**: Returns 429 with `rate_limit` error type
4. **Service temporarily unavailable**: Returns 503 with `service_unavailable` error type
5. **Authentication issues**: Returns 401 with `authentication` error type

## Authentication

All endpoints require an API key in the `x-api-key` header. Admin endpoints additionally require an admin key in the `x-admin-key` header. 