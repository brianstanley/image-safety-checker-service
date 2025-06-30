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

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [] // optional validation details
}
```

## Authentication

All endpoints require an API key in the `x-api-key` header. Admin endpoints additionally require an admin key in the `x-admin-key` header. 