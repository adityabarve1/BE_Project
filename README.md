# Student Dropout Prediction System

> ✅ **Now using Python Virtual Environment for better dependency management!**  
> See [VIRTUAL_ENV_GUIDE.md](VIRTUAL_ENV_GUIDE.md) for details.

A web application designed to help educational institutions identify students at risk of dropping out, enabling early intervention strategies.

## 🚀 Quick Start

**Start Backend (with Virtual Environment):**
```bash
./start_backend_venv.sh
```

**Start Frontend:**
```bash
cd frontend && npm start
```

**Access:** http://localhost:3000

---

## Project Overview

This project provides a comprehensive solution for predicting student dropout risk levels (High, Intermediate, Low) using machine learning techniques. The system includes:

- **Machine Learning Model**: Employs TabNet (with RandomForest fallback) for accurate prediction
- **Backend API**: FastAPI-based REST API for data processing and predictions
- **Frontend Interface**: React-based UI for teachers to monitor and manage student risk levels
- **Secure Authentication**: JWT-based authentication powered by Supabase
- **Document Processing**: Support for uploading and processing student data from various document formats

## Technology Stack

### Backend
- FastAPI (Python 3.8+)
- Supabase for database and authentication
- PyTorch TabNet (with scikit-learn RandomForest fallback)
- Document processing libraries for various formats

### Frontend
- React 18
- TypeScript
- Chakra UI for responsive design
- Supabase client for authentication

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Supabase account with API keys
- (Optional) CUDA-compatible GPU for faster model training

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd BE_PROJECT
```

2. Set up the backend:
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with required variables
cat > .env << EOL
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SECRET_KEY=your_secret_key
DEBUG=True
EOL
```

3. Set up the frontend:
```bash
cd frontend

# Install dependencies
npm install

# Create .env file for frontend configuration
cat > .env << EOL
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:8000
EOL
```

### Running the Application

1. Start the backend server:
```bash
cd backend
./start.sh
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Access the application at http://localhost:3000

## Features

- **Teacher Dashboard**: Provides an overview of at-risk students
- **Student Management**: Add, edit, and monitor individual student details
- **Risk Assessment**: Visualize risk levels and contributing factors
- **Data Import**: Upload student data in various formats (CSV, Excel, PDF, DOCX)
- **Export Reports**: Generate reports for intervention strategies

## Project Structure

```
BE_PROJECT/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configurations
│   │   ├── db/           # Database connections
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic services
│   │   └── utils/        # Utility functions
│   ├── start.sh          # Startup script
│   └── requirements.txt  # Python dependencies
├── frontend/             # React application
│   ├── public/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── package.json      # Node.js dependencies
├── ml_model/             # Machine learning components
│   ├── models/           # Trained model files
│   ├── generate_synthetic_data.py
│   └── train_model.py    # Model training script
└── data/                 # Data directory
    ├── raw/              # Raw input data
    └── processed/        # Processed data for model training
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.