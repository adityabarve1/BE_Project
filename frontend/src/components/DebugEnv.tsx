/**
 * Debug Component - Check Environment Variables
 * Add this temporarily to your app to debug API URL issues
 */

import React from 'react';
import { Box, Text, Code, VStack, Heading } from '@chakra-ui/react';

export const DebugEnv: React.FC = () => {
  return (
    <Box p={4} bg="gray.100" borderRadius="md" m={4}>
      <VStack align="start" spacing={2}>
        <Heading size="md">🔍 Environment Debug</Heading>
        
        <Box>
          <Text fontWeight="bold">REACT_APP_API_URL:</Text>
          <Code>{process.env.REACT_APP_API_URL || '❌ NOT SET'}</Code>
        </Box>
        
        <Box>
          <Text fontWeight="bold">REACT_APP_SUPABASE_URL:</Text>
          <Code>{process.env.REACT_APP_SUPABASE_URL || '❌ NOT SET'}</Code>
        </Box>
        
        <Box>
          <Text fontWeight="bold">NODE_ENV:</Text>
          <Code>{process.env.NODE_ENV}</Code>
        </Box>
        
        <Box>
          <Text fontWeight="bold">Test API Call URL:</Text>
          <Code>{`${process.env.REACT_APP_API_URL}/auth/me`}</Code>
        </Box>
        
        <Box>
          <Text fontWeight="bold">localStorage accessToken:</Text>
          <Code>
            {localStorage.getItem('accessToken') 
              ? `${localStorage.getItem('accessToken')?.substring(0, 20)}...` 
              : '❌ NO TOKEN'}
          </Code>
        </Box>
      </VStack>
    </Box>
  );
};

export default DebugEnv;
