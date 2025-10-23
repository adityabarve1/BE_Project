import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Container,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  
  return (
    <Container maxW="container.md" py={20}>
      <Box
        bg={bgColor}
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        textAlign="center"
      >
        <VStack spacing={6}>
          <Heading as="h1" size="4xl">
            404
          </Heading>
          <Heading as="h2" size="xl">
            Page Not Found
          </Heading>
          <Text fontSize="lg" color="gray.500">
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <Button 
            colorScheme="blue" 
            size="lg" 
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default NotFound;