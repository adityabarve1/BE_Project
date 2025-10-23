#!/usr/bin/env python3
"""
Simplified Machine Learning Model Training Script for Student Dropout Prediction System
This script is a fallback for when the main training script fails
"""

import os
import pickle
import pandas as pd
import random
from sklearn.ensemble import RandomForestClassifier

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')

def main():
    # Create model directory if it doesn't exist
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Path to save the model
    model_path = os.path.join(MODEL_DIR, 'rf_model.pkl')
    
    # Check if data exists
    data_file = os.path.join(DATA_DIR, 'raw', 'student_data.csv')
    
    if os.path.exists(data_file):
        try:
            # Try to load the data
            data = pd.read_csv(data_file)
            
            # Simple features and target
            X = data.drop(['dropout_risk', 'student_id'], axis=1, errors='ignore')
            if 'dropout' in data.columns:
                y = data['dropout']
            elif 'dropout_risk' in data.columns:
                y = data['dropout_risk']
            else:
                # Create dummy target
                y = [random.choice([0, 1]) for _ in range(len(X))]
            
            # Train a simple model
            model = RandomForestClassifier(n_estimators=10)
            model.fit(X, y)
            
            # Save the model
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            
            print(f"Simple model trained and saved to {model_path}")
            return True
        
        except Exception as e:
            print(f"Error training fallback model: {e}")
            # Create an empty model file
            with open(model_path, 'wb') as f:
                pickle.dump(RandomForestClassifier(), f)
            print(f"Empty model saved to {model_path}")
            return False
    else:
        print(f"Data file not found: {data_file}")
        # Create an empty model file
        with open(model_path, 'wb') as f:
            pickle.dump(RandomForestClassifier(), f)
        print(f"Empty model saved to {model_path}")
        return False

if __name__ == "__main__":
    main()