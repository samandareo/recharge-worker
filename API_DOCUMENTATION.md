# Recharge Worker API Documentation

## Base URL
```
https://recharge.aspshopping.com/api
```

## Authentication
The API uses JWT (JSON Web Token) for authentication. Access tokens are sent in the Authorization header, and refresh tokens are handled via HTTP-only cookies.

### Headers for Protected Routes
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Admin Routes

### 1. Login Admin
Authenticates an admin and returns access token.

```
POST /admin/login
```

#### Request Body
```json
{
    "username": "adminuser",
    "password": "password123"
}
```

#### Response
```json
{
    "success": true,
    "message": "Success",
    "data": "eyJhbGciOiJIUzI1NiIs..." // Access Token
}
```

### 2. Refresh Token
Gets a new access token using the refresh token.

```
POST /admin/refresh
```

#### Headers
```
Cookie: refreshToken=your_refresh_token
```

#### Response
```json
{
    "success": true,
    "message": "Success",
    "data": "eyJhbGciOiJIUzI1NiIs..." // New Access Token
}
```

## Recharge Routes

### 1. Get Recharge Request
Retrieves the next pending recharge request.

```
GET /recharge
```

#### Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Response
```json
{
    "success": true,
    "message": "Success",
    "data": {
        "rechargeId": "12345",
        "phoneNumber": "1234567890",
        "operator": "Gramenphone",
        "amount": "100"
    }
}
```

### 2. Update Recharge Status
Updates the status of a recharge request.
If recharge request is successful, you will set "true" to "isSuccess".
If recharge request is fail, you will set "false" to "isSuccess".

```
PUT /recharge
```

#### Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Request Body
```json
{
    "rechargeId": "12345",
    "isSuccess": true,
    "description": "Recharge completed successfully"
}
```

#### Response
```json
{
    "success": true,
    "message": "Recharge data changed successfully!",
    "data": null
}
```

## Error Responses

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Not authorized to access this route",
    "data": null
}
```

### 400 Bad Request
```json
{
    "success": false,
    "message": "Invalid credentials",
    "data": null
}
```

### 500 Server Error
```json
{
    "success": false,
    "message": "Internal Server Error",
    "data": null
}
```