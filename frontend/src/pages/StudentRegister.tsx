import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  VStack,
  HStack,
  Select,
  useColorModeValue,
  FormErrorMessage,
  SimpleGrid,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  Icon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FaUser, FaGraduationCap, FaIdCard, FaEnvelope, FaPhone, FaHome, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface StudentFormData {
  // Personal Information
  rollNumber: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  
  // Academic Information
  program: string;
  semester: number;
  admissionDate: string;
  currentGpa: number;
  overallGpa: number;
  creditsCompleted: number;
  
  // Additional Information
  guardianName: string;
  guardianPhone: string;
  emergencyContact: string;
  bloodGroup: string;
  nationality: string;
  category: string;
}

interface FormErrors {
  [key: string]: string;
}

const StudentRegister: React.FC = () => {
  const [formData, setFormData] = useState<StudentFormData>({
    rollNumber: '',
    name: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    program: '',
    semester: 1,
    admissionDate: '',
    currentGpa: 0,
    overallGpa: 0,
    creditsCompleted: 0,
    guardianName: '',
    guardianPhone: '',
    emergencyContact: '',
    bloodGroup: '',
    nationality: 'Indian',
    category: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleInputChange = (field: keyof StudentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Required field validation
    if (!formData.rollNumber.trim()) newErrors.rollNumber = 'Roll number is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.program) newErrors.program = 'Program is required';
    if (!formData.admissionDate) newErrors.admissionDate = 'Admission date is required';
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    // GPA validation
    if (formData.currentGpa > 10 || formData.currentGpa < 0) {
      newErrors.currentGpa = 'GPA must be between 0 and 10';
    }
    if (formData.overallGpa > 10 || formData.overallGpa < 0) {
      newErrors.overallGpa = 'GPA must be between 0 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Convert form data to API format
      const studentData = {
        roll_number: formData.rollNumber,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        address: formData.address,
        admission_date: formData.admissionDate,
        program: formData.program,
        semester: formData.semester,
        current_gpa: formData.currentGpa,
        overall_gpa: formData.overallGpa,
        credits_completed: formData.creditsCompleted,
        guardian_name: formData.guardianName,
        guardian_phone: formData.guardianPhone,
        emergency_contact: formData.emergencyContact,
        blood_group: formData.bloodGroup,
        nationality: formData.nationality,
        category: formData.category,
        is_active: true,
        dropout_risk_level: 'low', // Default
        dropout_risk_score: 0.0 // Default
      };
      
      await apiService.createStudent(studentData);
      
      toast({
        title: 'Student Registered Successfully',
        description: `${formData.name} has been added to the system.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate back to students list
      navigate('/students');
      
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register student. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/students');
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Icon as={FaUser} boxSize={12} color="blue.500" mb={4} />
          <Heading size="lg">Register New Student</Heading>
          <Text color="gray.500" mt={2}>
            Add a new student to the dropout prediction system
          </Text>
        </Box>
        
        <Box
          bg={bgColor}
          p={8}
          borderRadius="lg"
          boxShadow="lg"
          border="1px"
          borderColor={borderColor}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={8}>
              
              {/* Personal Information Section */}
              <Box>
                <HStack mb={4}>
                  <Icon as={FaIdCard} color="blue.500" />
                  <Heading size="md">Personal Information</Heading>
                </HStack>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired isInvalid={!!errors.rollNumber}>
                    <FormLabel>Roll Number</FormLabel>
                    <Input
                      value={formData.rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                      placeholder="e.g., CS2021001"
                    />
                    <FormErrorMessage>{errors.rollNumber}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.name}>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="student@example.com"
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.phone}>
                    <FormLabel>Phone Number</FormLabel>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="1234567890"
                    />
                    <FormErrorMessage>{errors.phone}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.gender}>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      placeholder="Select gender"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                    <FormErrorMessage>{errors.gender}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.dateOfBirth}>
                    <FormLabel>Date of Birth</FormLabel>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                    <FormErrorMessage>{errors.dateOfBirth}</FormErrorMessage>
                  </FormControl>
                </SimpleGrid>
                
                <FormControl mt={4}>
                  <FormLabel>Address</FormLabel>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Complete address"
                    rows={3}
                  />
                </FormControl>
              </Box>
              
              <Divider />
              
              {/* Academic Information Section */}
              <Box>
                <HStack mb={4}>
                  <Icon as={FaGraduationCap} color="blue.500" />
                  <Heading size="md">Academic Information</Heading>
                </HStack>
                
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  <FormControl isRequired isInvalid={!!errors.program}>
                    <FormLabel>Program</FormLabel>
                    <Select
                      value={formData.program}
                      onChange={(e) => handleInputChange('program', e.target.value)}
                      placeholder="Select program"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                    </Select>
                    <FormErrorMessage>{errors.program}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Semester</FormLabel>
                    <NumberInput
                      value={formData.semester}
                      onChange={(_, num) => handleInputChange('semester', num || 1)}
                      min={1}
                      max={8}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.admissionDate}>
                    <FormLabel>Admission Date</FormLabel>
                    <Input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                    />
                    <FormErrorMessage>{errors.admissionDate}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!errors.currentGpa}>
                    <FormLabel>Current GPA</FormLabel>
                    <NumberInput
                      value={formData.currentGpa}
                      onChange={(_, num) => handleInputChange('currentGpa', num || 0)}
                      min={0}
                      max={10}
                      precision={2}
                      step={0.01}
                    >
                      <NumberInputField />
                    </NumberInput>
                    <FormErrorMessage>{errors.currentGpa}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!errors.overallGpa}>
                    <FormLabel>Overall GPA</FormLabel>
                    <NumberInput
                      value={formData.overallGpa}
                      onChange={(_, num) => handleInputChange('overallGpa', num || 0)}
                      min={0}
                      max={10}
                      precision={2}
                      step={0.01}
                    >
                      <NumberInputField />
                    </NumberInput>
                    <FormErrorMessage>{errors.overallGpa}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Credits Completed</FormLabel>
                    <NumberInput
                      value={formData.creditsCompleted}
                      onChange={(_, num) => handleInputChange('creditsCompleted', num || 0)}
                      min={0}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </SimpleGrid>
              </Box>
              
              <Divider />
              
              {/* Additional Information Section */}
              <Box>
                <HStack mb={4}>
                  <Icon as={FaHome} color="blue.500" />
                  <Heading size="md">Additional Information</Heading>
                </HStack>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel>Guardian Name</FormLabel>
                    <Input
                      value={formData.guardianName}
                      onChange={(e) => handleInputChange('guardianName', e.target.value)}
                      placeholder="Parent/Guardian name"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Guardian Phone</FormLabel>
                    <Input
                      value={formData.guardianPhone}
                      onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                      placeholder="Guardian phone number"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Emergency Contact</FormLabel>
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Emergency contact number"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Blood Group</FormLabel>
                    <Select
                      value={formData.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      placeholder="Select blood group"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Nationality</FormLabel>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="Select category"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
              </Box>
              
              {/* Action Buttons */}
              <HStack spacing={4} pt={6}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  leftIcon={<FaUser />}
                  isLoading={loading}
                  loadingText="Registering..."
                  flex={1}
                >
                  Register Student
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </HStack>
            </Stack>
          </form>
        </Box>
      </VStack>
    </Container>
  );
};

export default StudentRegister;