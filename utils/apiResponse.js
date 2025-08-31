class ApiResponse {
    constructor(data = null, message = null, statusCode = 200) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode >= 200 && statusCode < 300;
    }

    static success(data, message = "Success") {
        return new ApiResponse(data, message);
    }

    static created(data, message = "Created successfully") {
        return new ApiResponse(data, message, 201);
    }

    static unauthorized(message = "Unauthorized") {
        return new ApiResponse(null, message, 401);
    }

    static forbidden(message = "Forbidden") {
        return new ApiResponse(null, message, 403);
    }

    static notFound(message = "Not found") {
        return new ApiResponse(null, message, 404)
    }

    static error(message = "Internal Server Error") {
        return new ApiResponse(null, message, 500);
    }

    static invalid(message = "Invalid value") {
        return new ApiResponse(null, message, 400);
    }

    send(res) {
        return res.status(this.statusCode).json({
           success: this.success,
           message: this.message,
           data: this.data, 
        });
    }
}

module.exports = ApiResponse;