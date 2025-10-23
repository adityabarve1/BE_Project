#!/usr/bin/env python3
"""
Machine Learning Model Training Script for Student Dropout Prediction System
"""

import os
import pickle
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Check if TabNet is available
try:
    import torch
    from pytorch_tabnet.tab_model import TabNetClassifier
    TABNET_AVAILABLE = True
except ImportError:
    TABNET_AVAILABLE = False
    print("TabNet not available, will use RandomForest instead")

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data')
RAW_DATA_DIR = os.path.join(DATA_DIR, 'raw')
PROCESSED_DATA_DIR = os.path.join(DATA_DIR, 'processed')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Create directories if they don't exist
os.makedirs(RAW_DATA_DIR, exist_ok=True)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

print(f"Data directory: {DATA_DIR}")
print(f"Models directory: {MODELS_DIR}")

# Define the feature columns
FEATURE_COLUMNS = [
    'attendance_rate', 'gpa', 'family_income', 'parent_education', 'age',
    'gender', 'study_hours_per_week', 'extracurricular_activities',
    'previous_failures', 'health_status', 'transport_time', 
    'internet_access', 'family_support', 'romantic_relationship',
    'free_time', 'social_activities', 'alcohol_consumption',
    'stress_level', 'motivation_level'
]

def preprocess_data(df):
    """Preprocess the data for model training"""
    
    # Ensure all required columns exist
    required_columns = FEATURE_COLUMNS + ['risk_level']
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Required column {col} not found in dataset")
    
    # Split features and target
    X = df[FEATURE_COLUMNS]
    y = df['risk_level']
    
    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Define preprocessing for numeric columns (scaling)
    numeric_features = [
        'attendance_rate', 'gpa', 'age', 'study_hours_per_week',
        'transport_time'
    ]
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    # Define preprocessing for categorical columns (encoding)
    categorical_features = [
        'family_income', 'parent_education', 'gender', 
        'extracurricular_activities', 'previous_failures', 
        'health_status', 'internet_access', 'family_support', 
        'romantic_relationship', 'free_time', 'social_activities', 
        'alcohol_consumption', 'stress_level', 'motivation_level'
    ]
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    # Combine preprocessing steps
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ]
    )
    
    return X_train, X_test, y_train, y_test, preprocessor

def train_tabnet_model(X_train, y_train, X_test, y_test):
    """Train a TabNet model"""
    if not TABNET_AVAILABLE:
        print("TabNet is not available. Please install pytorch_tabnet")
        return None
    
    # Set device to GPU if available
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Initialize TabNet classifier
    model = TabNetClassifier(
        device_name=device.type,
        n_d=8, n_a=8,  # Architecture parameters
        n_steps=3,
        gamma=1.5,
        n_independent=2,
        n_shared=2,
        lambda_sparse=1e-4,
        optimizer_fn=torch.optim.Adam,
        optimizer_params=dict(lr=2e-2),
        mask_type='entmax',
        scheduler_params=dict(
            mode="min",
            patience=10,
            min_lr=1e-5,
            factor=0.5,
        ),
        scheduler_fn=torch.optim.lr_scheduler.ReduceLROnPlateau,
        verbose=1
    )
    
    # Train the model
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        max_epochs=100,
        patience=10,
        batch_size=1024,
        virtual_batch_size=128
    )
    
    return model

def train_fallback_model(X_train, y_train):
    """Train a fallback random forest model"""
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model

def save_preprocessor_and_model(preprocessor, model, model_type="tabnet"):
    """Save the preprocessor and model to files"""
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    
    # Save preprocessor
    preprocessor_filename = os.path.join(MODELS_DIR, f"preprocessor_{timestamp}.pkl")
    with open(preprocessor_filename, 'wb') as f:
        pickle.dump(preprocessor, f)
    print(f"Preprocessor saved to {preprocessor_filename}")
    
    # Save model
    if model_type == "tabnet":
        model_filename = os.path.join(MODELS_DIR, f"tabnet_model_{timestamp}.pkl")
        model.save_model(model_filename)
    else:
        model_filename = os.path.join(MODELS_DIR, f"rf_model_{timestamp}.pkl")
        with open(model_filename, 'wb') as f:
            pickle.dump(model, f)
    print(f"Model saved to {model_filename}")
    
    # Create a symlink to the latest model
    latest_model_link = os.path.join(MODELS_DIR, f"{model_type}_model.pkl")
    if os.path.exists(latest_model_link):
        os.remove(latest_model_link)
    
    try:
        os.symlink(os.path.basename(model_filename), latest_model_link)
        print(f"Latest model link created at {latest_model_link}")
    except (OSError, AttributeError):
        # Windows doesn't support symlinks or needs admin privileges
        # Just copy the file instead
        import shutil
        shutil.copy2(model_filename, latest_model_link)
        print(f"Latest model copy created at {latest_model_link}")
    
    # Create a symlink to the latest preprocessor
    latest_preprocessor_link = os.path.join(MODELS_DIR, "preprocessor.pkl")
    if os.path.exists(latest_preprocessor_link):
        os.remove(latest_preprocessor_link)
    
    try:
        os.symlink(os.path.basename(preprocessor_filename), latest_preprocessor_link)
        print(f"Latest preprocessor link created at {latest_preprocessor_link}")
    except (OSError, AttributeError):
        # Windows doesn't support symlinks or needs admin privileges
        # Just copy the file instead
        import shutil
        shutil.copy2(preprocessor_filename, latest_preprocessor_link)
        print(f"Latest preprocessor copy created at {latest_preprocessor_link}")

def evaluate_model(model, X_test, y_test, model_type="tabnet"):
    """Evaluate the model performance"""
    if model_type == "tabnet":
        # TabNet has its own prediction method
        y_pred = model.predict(X_test)
        accuracy = (y_pred == y_test).mean()
    else:
        # Use sklearn's accuracy score for RandomForest
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        print("\nConfusion Matrix:")
        print(confusion_matrix(y_test, y_pred))
    
    print(f"\nAccuracy: {accuracy:.4f}")
    return accuracy

def main():
    # Step 1: Check if synthetic data exists, otherwise run data generation
    data_path = os.path.join(RAW_DATA_DIR, 'student_data.csv')
    if not os.path.exists(data_path):
        print("No data found. Please run generate_synthetic_data.py first.")
        exit(1)
    
    # Step 2: Load and preprocess the data
    print(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} records.")
    
    X_train, X_test, y_train, y_test, preprocessor = preprocess_data(df)
    
    # Apply preprocessor to the data
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Step 3: Train the model (TabNet if available, otherwise RandomForest)
    if TABNET_AVAILABLE:
        print("Training TabNet model...")
        model = train_tabnet_model(X_train_processed, y_train, X_test_processed, y_test)
        model_type = "tabnet"
    else:
        print("Training Random Forest model as fallback...")
        model = train_fallback_model(X_train_processed, y_train)
        model_type = "random_forest"
    
    # Step 4: Evaluate the model
    print("Evaluating model...")
    evaluate_model(model, X_test_processed, y_test, model_type)
    
    # Step 5: Save the model and preprocessor
    print("Saving model and preprocessor...")
    save_preprocessor_and_model(preprocessor, model, model_type)
    
    print("\nModel training complete!")

if __name__ == "__main__":
    main()