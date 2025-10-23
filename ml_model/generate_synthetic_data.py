import pandas as pd
import numpy as np
import os

def generate_synthetic_student_data(n_samples=1000):
    """
    Generate synthetic student data for dropout prediction
    """
    np.random.seed(42)  # For reproducibility
    
    # Generate features
    attendance_rate = np.clip(np.random.normal(0.85, 0.15, n_samples), 0, 1)
    gpa = np.clip(np.random.normal(7, 1.5, n_samples), 0, 10)
    family_income = np.random.randint(1, 6, n_samples)  # 1-5 income levels
    parent_education = np.random.randint(1, 5, n_samples)  # 1-4 education levels
    age = np.random.randint(18, 26, n_samples)
    gender = np.random.randint(0, 2, n_samples)  # 0=male, 1=female
    study_hours_per_week = np.clip(np.random.normal(20, 8, n_samples), 0, 50)
    extracurricular_activities = np.random.randint(0, 4, n_samples)
    previous_failures = np.random.randint(0, 4, n_samples)
    health_status = np.random.randint(1, 6, n_samples)  # 1-5 health rating
    transport_time = np.clip(np.random.normal(30, 20, n_samples), 5, 120)
    internet_access = np.random.randint(0, 2, n_samples)  # 0=no, 1=yes
    family_support = np.random.randint(1, 6, n_samples)  # 1-5 support rating
    romantic_relationship = np.random.randint(0, 2, n_samples)  # 0=no, 1=yes
    free_time = np.random.randint(1, 6, n_samples)  # 1-5 hours
    social_activities = np.random.randint(1, 6, n_samples)  # 1-5 hours
    alcohol_consumption = np.random.randint(1, 6, n_samples)  # 1-5 rating
    stress_level = np.random.randint(1, 6, n_samples)  # 1-5 stress level
    motivation_level = np.random.randint(1, 6, n_samples)  # 1-5 motivation level
    
    # Create a probabilistic risk score
    risk_score = (
        -0.3 * attendance_rate +
        -0.3 * (gpa / 10) +  # Normalize GPA to 0-1
        -0.1 * (family_income / 5) +  # Normalize to 0-1
        -0.05 * (parent_education / 4) +
        0.05 * ((age - 18) / 8) +  # Normalize age
        0.0 * gender +  # Gender doesn't affect dropout in this synthetic model
        -0.15 * (study_hours_per_week / 50) +
        -0.05 * (extracurricular_activities / 3) +
        0.2 * (previous_failures / 3) +
        -0.05 * (health_status / 5) +
        0.05 * (transport_time / 120) +
        -0.05 * internet_access +
        -0.15 * (family_support / 5) +
        0.05 * romantic_relationship +
        -0.05 * (free_time / 5) +
        -0.05 * (social_activities / 5) +
        0.1 * (alcohol_consumption / 5) +
        0.2 * (stress_level / 5) +
        -0.3 * (motivation_level / 5)
    )
    
    # Add some noise
    risk_score = risk_score + np.random.normal(0, 0.1, n_samples)
    
    # Determine dropout risk based on risk score
    risk_level = np.zeros(n_samples, dtype=int)
    risk_level[(risk_score > -0.2) & (risk_score <= 0.2)] = 1  # Medium risk
    risk_level[risk_score > 0.2] = 2  # High risk
    
    # Create dataframe
    data = pd.DataFrame({
        'attendance_rate': attendance_rate,
        'gpa': gpa,
        'family_income': family_income,
        'parent_education': parent_education,
        'age': age,
        'gender': gender,
        'study_hours_per_week': study_hours_per_week,
        'extracurricular_activities': extracurricular_activities,
        'previous_failures': previous_failures,
        'health_status': health_status,
        'transport_time': transport_time,
        'internet_access': internet_access,
        'family_support': family_support,
        'romantic_relationship': romantic_relationship,
        'free_time': free_time,
        'social_activities': social_activities,
        'alcohol_consumption': alcohol_consumption,
        'stress_level': stress_level,
        'motivation_level': motivation_level,
        'risk_level': risk_level  # 0=low, 1=medium, 2=high
    })
    
    return data

if __name__ == "__main__":
    # Set paths
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    raw_data_dir = os.path.join(data_dir, 'raw')
    
    # Create directory if it doesn't exist
    os.makedirs(raw_data_dir, exist_ok=True)
    
    # Generate data
    print("Generating synthetic student data...")
    data = generate_synthetic_student_data(n_samples=5000)
    
    # Save data
    data_path = os.path.join(raw_data_dir, 'student_data.csv')
    data.to_csv(data_path, index=False)
    print(f"Data saved to {data_path}")
    
    # Print data statistics
    print("\nData Statistics:")
    print(f"Total samples: {len(data)}")
    print(f"Risk level distribution:")
    print(data['risk_level'].value_counts())
    print("\nFirst 5 rows:")
    print(data.head())