import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Grid,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Stack,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  Icon,
  HStack,
  VStack,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaChalkboardTeacher, FaUpload, FaBell, FaEllipsisV } from 'react-icons/fa';
import { MdWarning, MdInfo } from 'react-icons/md';
import { RiDashboardFill } from 'react-icons/ri';
import { HiUsers } from 'react-icons/hi';
import { BsExclamationTriangleFill, BsCheckCircleFill, BsArrowUp, BsArrowDown } from 'react-icons/bs';
import { apiService } from '../services/api';

// Risk level badge component
const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const colors = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green',
  };
  
  // Handle undefined or null risk
  if (!risk) {
    return (
      <Badge colorScheme="gray" px={3} py={1} borderRadius="full" fontSize="sm">
        Unknown
      </Badge>
    );
  }
  
  const color = colors[risk.toLowerCase() as keyof typeof colors] || 'gray';
  
  return (
    <Badge colorScheme={color} px={3} py={1} borderRadius="full" fontSize="sm">
      {risk}
    </Badge>
  );
};

interface Student {
  id: string;
  name: string;
  roll_number: string;
  risk_level: string;
  prediction_date: string;
}

interface DashboardStats {
  totalStudents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  recentUploads: number;
}

const TeacherDashboard: React.FC = () => {
  // ⚠️ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    recentUploads: 0
  });
  const [recentPredictions, setRecentPredictions] = useState<Student[]>([]);
  const [highRiskStudents, setHighRiskStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  // These must be called before any conditional returns
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Only fetch if user is authenticated
      if (!user) {
        return;
      }

      try {
        setIsLoading(true);
        // Fetch dashboard stats
        const statsData = await apiService.getDashboardStats();
        setStats(statsData);
        
        // Fetch recent predictions
        const recentPredictionsData = await apiService.getRecentPredictions();
        setRecentPredictions(recentPredictionsData);
        
        // Fetch high risk students
        const highRiskData = await apiService.getHighRiskStudents();
        setHighRiskStudents(highRiskData);
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        // Check if it's an auth error
        if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('token')) {
          // Auth error - will be handled by ProtectedRoute redirect
          return;
        }
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]); // Re-fetch when user changes

  const handleUploadClick = () => {
    navigate('/upload');
  };

  const handleViewAllStudents = () => {
    navigate('/students');
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      <Stack spacing={8}>
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap">
          <Box>
            <Heading size="lg">Teacher Dashboard</Heading>
            <Text color="gray.500">Welcome back, {user?.name || 'Teacher'}</Text>
          </Box>
          <Button 
            leftIcon={<FaUpload />} 
            colorScheme="blue" 
            onClick={handleUploadClick}
          >
            Upload Student Data
          </Button>
        </Flex>

        {/* Stats Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5}>
          <Stat
            px={4}
            py={3}
            bg={bgColor}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <StatLabel fontWeight="medium" display="flex" alignItems="center">
              <Icon as={HiUsers} mr={2} />
              Total Students
            </StatLabel>
            <StatNumber fontSize="2xl">{stats.totalStudents}</StatNumber>
          </Stat>
          
          <Stat
            px={4}
            py={3}
            bg={bgColor}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <StatLabel fontWeight="medium" color="red.500" display="flex" alignItems="center">
              <Icon as={BsExclamationTriangleFill} mr={2} />
              High Risk Students
            </StatLabel>
            <StatNumber fontSize="2xl">{stats.highRiskCount}</StatNumber>
            <StatHelpText>
              {stats.totalStudents > 0 ? 
                `${((stats.highRiskCount / stats.totalStudents) * 100).toFixed(1)}%` : 
                '0%'} of total
            </StatHelpText>
          </Stat>
          
          <Stat
            px={4}
            py={3}
            bg={bgColor}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <StatLabel fontWeight="medium" color="orange.500" display="flex" alignItems="center">
              <Icon as={MdWarning} mr={2} />
              Medium Risk Students
            </StatLabel>
            <StatNumber fontSize="2xl">{stats.mediumRiskCount}</StatNumber>
            <StatHelpText>
              {stats.totalStudents > 0 ? 
                `${((stats.mediumRiskCount / stats.totalStudents) * 100).toFixed(1)}%` : 
                '0%'} of total
            </StatHelpText>
          </Stat>
          
          <Stat
            px={4}
            py={3}
            bg={bgColor}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <StatLabel fontWeight="medium" color="green.500" display="flex" alignItems="center">
              <Icon as={BsCheckCircleFill} mr={2} />
              Low Risk Students
            </StatLabel>
            <StatNumber fontSize="2xl">{stats.lowRiskCount}</StatNumber>
            <StatHelpText>
              {stats.totalStudents > 0 ? 
                `${((stats.lowRiskCount / stats.totalStudents) * 100).toFixed(1)}%` : 
                '0%'} of total
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* High Risk Students Section */}
        <Box
          bg={bgColor}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          border="1px"
          borderColor={borderColor}
        >
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md" display="flex" alignItems="center">
              <Icon as={BsExclamationTriangleFill} color="red.500" mr={2} />
              High Risk Students
            </Heading>
            <Button size="sm" variant="outline" onClick={handleViewAllStudents}>
              View All Students
            </Button>
          </Flex>

          {highRiskStudents.length === 0 ? (
            <Text py={4}>No high risk students detected.</Text>
          ) : (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Roll Number</Th>
                    <Th>Risk Level</Th>
                    <Th>Prediction Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {highRiskStudents.map((student) => (
                    <Tr key={student.id}>
                      <Td>{student.name}</Td>
                      <Td>{student.roll_number}</Td>
                      <Td><RiskBadge risk={student.risk_level} /></Td>
                      <Td>{new Date(student.prediction_date).toLocaleDateString()}</Td>
                      <Td>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Recent Predictions Section */}
        <Box
          bg={bgColor}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          border="1px"
          borderColor={borderColor}
        >
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md" display="flex" alignItems="center">
              <Icon as={MdInfo} color="blue.500" mr={2} />
              Recent Predictions
            </Heading>
          </Flex>

          {recentPredictions.length === 0 ? (
            <Text py={4}>No recent predictions available.</Text>
          ) : (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Roll Number</Th>
                    <Th>Risk Level</Th>
                    <Th>Prediction Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentPredictions.map((student) => (
                    <Tr key={student.id}>
                      <Td>{student.name}</Td>
                      <Td>{student.roll_number}</Td>
                      <Td><RiskBadge risk={student.risk_level} /></Td>
                      <Td>{new Date(student.prediction_date).toLocaleDateString()}</Td>
                      <Td>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default TeacherDashboard;