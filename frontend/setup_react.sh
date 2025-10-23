#!/bin/bash
# Initialize React app with TypeScript
echo "Initializing React app with TypeScript..."
npx create-react-app frontend --template typescript

cd frontend

# Install necessary dependencies
echo "Installing dependencies..."
npm install \
  @supabase/supabase-js \
  axios \
  react-router-dom \
  @chakra-ui/react @emotion/react @emotion/styled framer-motion \
  @chakra-ui/icons \
  react-icons \
  recharts \
  react-table \
  @types/react-table \
  formik yup \
  react-dropzone \
  jspdf \
  xlsx \
  date-fns

# Create basic project structure
echo "Creating project structure..."
mkdir -p src/components/common
mkdir -p src/components/auth
mkdir -p src/components/dashboard
mkdir -p src/components/students
mkdir -p src/components/uploads
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/types
mkdir -p src/pages
mkdir -p src/assets/images

echo "React app setup complete!"