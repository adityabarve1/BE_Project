import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  useColorModeValue,
  Badge,
  TableContainer,
  Alert,
  AlertIcon,
  Stack,
  Spinner,
  Center,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaEye, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  risk_level: string;
  prediction_date: string;
}

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

const StudentList: React.FC = () => {
  // ⚠️ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('risk_level');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // These must be called before any conditional returns
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getAllStudents();
        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
        setError('Failed to load student data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const filteredAndSortedStudents = React.useMemo(() => {
    let result = [...students];
    
    // Apply risk level filter
    if (riskFilter !== 'all') {
      result = result.filter(student => 
        student.risk_level.toLowerCase() === riskFilter.toLowerCase()
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(student => 
        student.name.toLowerCase().includes(lowerSearchTerm) ||
        student.roll_number.toLowerCase().includes(lowerSearchTerm) ||
        student.department.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      const aValue = a[sortColumn as keyof Student];
      const bValue = b[sortColumn as keyof Student];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortColumn === 'risk_level') {
          // Custom sorting for risk level: high > medium > low
          const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          const aRisk = riskOrder[aValue.toLowerCase() as keyof typeof riskOrder] || 0;
          const bRisk = riskOrder[bValue.toLowerCase() as keyof typeof riskOrder] || 0;
          comparison = aRisk - bRisk;
        } else {
          comparison = aValue.localeCompare(bValue);
        }
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [students, searchTerm, sortColumn, sortDirection, riskFilter]);

  const handleViewStudent = (student: Student) => {
    navigate(`/students/${student.id}`);
  };
  
  const handleQuickView = (student: Student) => {
    setCurrentStudent(student);
    onOpen();
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Stack spacing={4} align="center">
          <Spinner size="xl" color="blue.500" />
          <Text>Loading students...</Text>
        </Stack>
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
      <Stack spacing={6}>
        <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="lg">Student List</Heading>
            <Text color="gray.500">View and manage all student risk predictions</Text>
          </Box>
          <Button 
            leftIcon={<FaPlus />} 
            colorScheme="blue" 
            onClick={() => navigate('/students/add')}
            size="md"
          >
            Add Student
          </Button>
        </Flex>
        
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          gap={4}
        >
          <InputGroup maxW={{ base: '100%', md: '400px' }}>
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, roll number, or department"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg={bgColor}
            />
          </InputGroup>
          
          <Select 
            value={riskFilter} 
            onChange={(e) => setRiskFilter(e.target.value)}
            maxW={{ base: '100%', md: '200px' }}
            bg={bgColor}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </Select>
        </Flex>
        
        <Box
          bg={bgColor}
          borderRadius="lg"
          boxShadow="sm"
          border="1px"
          borderColor={borderColor}
          overflow="hidden"
        >
          <TableContainer>
            <Table variant="simple">
              <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
                <Tr>
                  <Th cursor="pointer" onClick={() => handleSort('name')}>
                    <Flex align="center">
                      Name
                      {getSortIcon('name')}
                    </Flex>
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('roll_number')}>
                    <Flex align="center">
                      Roll Number
                      {getSortIcon('roll_number')}
                    </Flex>
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('department')}>
                    <Flex align="center">
                      Department
                      {getSortIcon('department')}
                    </Flex>
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('year')}>
                    <Flex align="center">
                      Year
                      {getSortIcon('year')}
                    </Flex>
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('risk_level')}>
                    <Flex align="center">
                      Risk Level
                      {getSortIcon('risk_level')}
                    </Flex>
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('prediction_date')}>
                    <Flex align="center">
                      Prediction Date
                      {getSortIcon('prediction_date')}
                    </Flex>
                  </Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAndSortedStudents.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={4}>
                      No students found
                    </Td>
                  </Tr>
                ) : (
                  filteredAndSortedStudents.map((student) => (
                    <Tr key={student.id}>
                      <Td>{student.name}</Td>
                      <Td>{student.roll_number}</Td>
                      <Td>{student.department}</Td>
                      <Td>{student.year}</Td>
                      <Td><RiskBadge risk={student.risk_level} /></Td>
                      <Td>{new Date(student.prediction_date).toLocaleDateString()}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            leftIcon={<FaEye />}
                            onClick={() => handleViewStudent(student)}
                          >
                            Details
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
      
      {/* Quick View Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Student Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentStudent && (
              <Stack spacing={4}>
                <Box>
                  <Text fontWeight="bold">Name</Text>
                  <Text>{currentStudent.name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Roll Number</Text>
                  <Text>{currentStudent.roll_number}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Department</Text>
                  <Text>{currentStudent.department}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Year</Text>
                  <Text>{currentStudent.year}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Risk Level</Text>
                  <RiskBadge risk={currentStudent.risk_level} />
                </Box>
                <Box>
                  <Text fontWeight="bold">Last Prediction</Text>
                  <Text>{new Date(currentStudent.prediction_date).toLocaleDateString()}</Text>
                </Box>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            {currentStudent && (
              <Button variant="outline" onClick={() => handleViewStudent(currentStudent)}>
                View Full Details
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default StudentList;