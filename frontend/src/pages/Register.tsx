import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  useColorModeValue,
  Link,
  FormErrorMessage,
  Select,
  useToast,
  Container
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const toast = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      // Register with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'teacher',
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (data && data.user) {
        toast({
          title: 'Account created.',
          description: "We've created your account. Please verify your email.",
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
        
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
      toast({
        title: 'Registration error',
        description: err.message || 'An error occurred during registration',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxW="lg" py={{ base: 12, md: 24 }}>
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Heading fontSize={'4xl'} textAlign={'center'}>
            Teacher Registration
          </Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            Join our platform to help students succeed
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow={'lg'}
          p={8}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl id="fullName" isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </FormControl>
              
              <FormControl id="email" isRequired>
                <FormLabel>Email address</FormLabel>
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>
              
              <FormControl id="password" isRequired isInvalid={!!error && error.includes('Password')}>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              
              <FormControl id="confirmPassword" isRequired isInvalid={!!error && error.includes('match')}>
                <FormLabel>Confirm Password</FormLabel>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {error && error.includes('match') && (
                  <FormErrorMessage>{error}</FormErrorMessage>
                )}
              </FormControl>
              
              {error && !error.includes('match') && !error.includes('Password') && (
                <Text color="red.500" fontSize="sm">{error}</Text>
              )}
              
              <Stack spacing={10} pt={2}>
                <Button
                  type="submit"
                  loadingText="Submitting"
                  isLoading={loading}
                  size="lg"
                  bg={'blue.400'}
                  color={'white'}
                  _hover={{
                    bg: 'blue.500',
                  }}>
                  Sign Up
                </Button>
              </Stack>
              <Stack pt={6}>
                <Text align={'center'}>
                  Already a user? <Link as={RouterLink} to="/login" color={'blue.400'}>Login</Link>
                </Text>
              </Stack>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  );
};

export default Register;