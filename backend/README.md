# Student Dropout Prediction System - Backend

This is the backend component of the Student Dropout Prediction System, built with FastAPI and integrating with Supabase for database operations and machine learning-driven risk prediction.

## Features

- RESTful API for student dropout prediction with FastAPI
- JWT-based authentication via Supabase
- ML model integration using TabNet (with RandomForest fallback)
- Document processing for various formats (CSV, Excel, PDF, DOCX)
- Structured API with versioning
- Optimized database connection handling

## Project Structure

```
backend/
├── app/
│   ├── api/                  # API endpoints
│   │   └── v1/
│   │       ├── endpoints/    # API route handlers
│   │       └── api.py        # API router configuration
│   ├── core/                 # Core application code
│   │   └── config.py         # Configuration settings
│   ├── db/                   # Database connections
│   │   └── supabase.py       # Supabase client
│   ├── models/               # Data models
│   │   └── schemas.py        # Pydantic schemas
│   ├── services/             # Business logic
│   │   ├── document_processor.py  # Document processing service
│   │   └── ml_service.py     # ML model integration
│   └── utils/                # Utility functions
├── main.py                   # FastAPI application
├── start.py                  # Python startup script
├── start.sh                  # Shell startup script
└── requirements.txt          # Python dependencies
```

## Setup

### 1. Create a Virtual Environment (Recommended for Production)

```bash
# Create a virtual environment in the backend directory
python -m venv venv

# Activate the virtual environment
# On macOS/Linux
source venv/bin/activate
# On Windows
venv\Scripts\activate

# Verify you're using the correct Python interpreter
which python  # Should show the path to your virtual environment
```

### 2. Install Dependencies

```bash
# Install from the backend-specific requirements file
```bash
# Install dependencies from the backend-specific requirements file
pip install -r requirements.txt
```

## Running the Backend

### Using the Start Script (Recommended)

The provided start script handles dependencies, environment setup, and model training automatically:

```bash
# Make the script executable if needed
chmod +x start.sh

# Run with default settings
./start.sh

# Or with custom options
./start.sh --host 0.0.0.0 --port 8080 --reload --train-model --debug
```

### Command Line Options

- `--host HOST`: Host to bind the server to (default: 127.0.0.1)
- `--port PORT`: Port to bind the server to (default: 8000)
- `--reload`: Enable auto-reload for development
- `--train-model`: Force training of a new ML model
- `--debug`: Enable debug mode with more verbose output

### Manual Startup

You can also start the FastAPI application directly:

```bash
# Using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or using Python
python main.py
```

## API Documentation

Once the server is running, you can access the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Required settings
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-api-key
SECRET_KEY=your-secret-key-for-jwt

# Optional settings
SERVER_HOST=127.0.0.1
SERVER_PORT=8000
DEBUG=False
```

## Machine Learning Model

The system uses a TabNet model for student dropout prediction, with RandomForest as a fallback when PyTorch dependencies aren't available.

- Models are stored in `ml_model/models/`
- Training is handled by `ml_model/train_model.py`
- Synthetic data generation via `ml_model/generate_synthetic_data.py`

The model is automatically trained during first startup if no model exists.

## Database

The application uses Supabase for database operations and authentication. The database contains:

1. `users` - Authentication and user management (teachers, administrators)
2. `students` - Student information and academic records
3. `predictions` - Prediction history and risk levels
4. `documents` - Document upload tracking and metadata
```

### 3. Environment Variables

A `.env` file already exists in the `backend` directory. Make sure it has the following variables:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SECRET_KEY=your_secret_key_for_jwt
MODEL_PATH=../ml_model/models/tabnet_model.pkl
```

Note: The `MODEL_PATH` is relative to the backend directory, pointing to the ML model in the project.

### 3. Database Setup

Initialize the database with:

```bash
python database/setup_database.py
```

This will create the necessary tables and seed initial data in Supabase.

### 4. ML Model Training

Generate synthetic data and train the ML model:

```bash
python ml_model/generate_synthetic_data.py
python ml_model/train_model.py
```

## Running the Backend

There are two ways to start the backend server:

### Option 1: Using the Shell Script (macOS/Linux)

```bash
# Make the start script executable (only needed once)
chmod +x start.sh

# Start the backend with default settings
./start.sh

# Or with custom settings
./start.sh --host 0.0.0.0 --port 8080 --reload
```

### Option 2: Using the Python Script (Cross-platform)

```bash
# Start the backend with default settings
python start.py

# Or with custom settings
python start.py --host 0.0.0.0 --port 8080 --reload
```

### Available Options

Both start scripts support the same options:

- `--host HOST` - Host to bind the server to (default: 127.0.0.1)
- `--port PORT` - Port to bind the server to (default: 8000)
- `--reload` - Enable auto-reload for development
- `--train-model` - Force training of a new ML model
- `--debug` - Enable debug mode with more verbose output

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Key Components

### Authentication

The system uses JWT-based authentication with tokens generated through Supabase:
- Login endpoint: `/api/v1/auth/token`
- Token lifetime: 7 days by default (configurable)
- Protected routes require a valid JWT in the Authorization header

### Database Connection Optimization

The backend uses a singleton pattern for the Supabase client to:
- Maintain a single database connection throughout the application lifetime
- Automatically initialize on application startup
- Properly handle connection cleanup on shutdown
- Avoid creating new connections for each request

### Document Processing

The backend supports uploading and processing various document formats:
- CSV files (direct import)
- Excel files (converted to structured data)
- PDF documents (text extraction and parsing)
- Word documents (text extraction and parsing)

### ML Model Integration

The prediction system:
- Uses a pre-trained model from `ml_model/models/`
- Automatically generates synthetic data if no real data exists
- Provides risk categorization (High, Intermediate, Low)
- Returns prediction confidence scores and feature importance

## Troubleshooting

- **Database Connection Issues**: Verify your Supabase URL and API key in the .env file
- **Model Training Errors**: Check that you have the necessary Python packages for ML training
- **Document Processing Errors**: Ensure required libraries for document formats are installed
- **Virtual Environment Problems**: Make sure to activate the environment before running the application

## API Endpoints

### Authentication
- POST `/api/v1/auth/login` - Log in and get JWT token
- GET `/api/v1/auth/me` - Get current user info

### Students
- GET `/api/v1/students` - List all students
- GET `/api/v1/students/{student_id}` - Get student details
- POST `/api/v1/students` - Create new student

### Teachers
- GET `/api/v1/teachers` - List all teachers
- GET `/api/v1/teachers/{teacher_id}` - Get teacher details

### Data Uploads
- POST `/api/v1/uploads` - Upload student data (CSV, Excel, etc.)

### Risk Predictions
- GET `/api/v1/predictions` - Get all risk predictions
- GET `/api/v1/predictions/{student_id}` - Get predictions for a student
- POST `/api/v1/predictions/batch` - Run predictions for multiple students