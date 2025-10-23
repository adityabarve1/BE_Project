import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  useColorModeValue,
  Button,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Icon,
  SimpleGrid,
  Progress,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import {
  FaChevronLeft,
  FaGraduationCap,
  FaCalendarAlt,
  FaChartLine,
  FaExclamationTriangle,
  FaCheck,
} from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  risk_level: string;
  prediction_date: string;
  email?: string;
  phone?: string;
}

interface Prediction {
  id: string;
  student_id: string;
  risk_level: string;
  prediction_date: string;
  confidence_score: number;
  factors: {
    [key: string]: number;
  };
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
  subject: string;
}

interface AcademicRecord {
  subject: string;
  grade: string;
  percentage: number;
  term: string;
}

interface ExtracurricularActivity {
  activity: string;
  role: string;
  hours_per_week: number;
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

const RiskFactorBar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  let colorScheme = 'green';
  if (value > max * 0.7) colorScheme = 'red';
  else if (value > max * 0.4) colorScheme = 'orange';
  
  return (
    <Box mb={2}>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="sm">{label}</Text>
        <Text fontSize="sm" fontWeight="bold">{value.toFixed(2)}</Text>
      </HStack>
      <Progress value={(value / max) * 100} size="sm" colorScheme={colorScheme} borderRadius="full" />
    </Box>
  );
};

const StudentDetail: React.FC = () => {
  // ⚠️ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<Prediction[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [activities, setActivities] = useState<ExtracurricularActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // These must be called before any conditional returns
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#FF0000'];

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, these would be separate API calls
        if (studentId) {
          // Fetch student details
          const studentData = await apiService.getStudentById(studentId);
          setStudent(studentData);
          
          // Fetch prediction history
          const predictionData = await apiService.getStudentPredictions(studentId);
          setPredictionHistory(predictionData);
          
          if (predictionData.length > 0) {
            // Set the most recent prediction
            setLatestPrediction(predictionData[0]);
          }
          
          // Fetch attendance records
          const attendanceData = await apiService.getStudentAttendance(studentId);
          setAttendanceRecords(attendanceData);
          
          // Fetch academic records
          const academicData = await apiService.getStudentAcademic(studentId);
          setAcademicRecords(academicData);
          
          // Fetch extracurricular activities
          const activitiesData = await apiService.getStudentActivities(studentId);
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        setError('Failed to load student data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  const calculateAttendanceRate = () => {
    if (!attendanceRecords.length) return 0;
    
    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    return (presentCount / attendanceRecords.length) * 100;
  };

  const calculateAverageGrade = () => {
    if (!academicRecords.length) return 0;
    
    const totalPercentage = academicRecords.reduce((sum, record) => sum + record.percentage, 0);
    return totalPercentage / academicRecords.length;
  };

  const formatFactorsForChart = () => {
    if (!latestPrediction?.factors) return [];
    
    return Object.entries(latestPrediction.factors).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  };

  const prepareAttendanceChartData = () => {
    const subjectMap: Record<string, { present: number; absent: number; total: number }> = {};
    
    attendanceRecords.forEach(record => {
      if (!subjectMap[record.subject]) {
        subjectMap[record.subject] = { present: 0, absent: 0, total: 0 };
      }
      
      if (record.status === 'present') {
        subjectMap[record.subject].present++;
      } else {
        subjectMap[record.subject].absent++;
      }
      subjectMap[record.subject].total++;
    });
    
    return Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      present: data.present,
      absent: data.absent,
      attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    }));
  };

  const prepareGradeChartData = () => {
    return academicRecords.map(record => ({
      subject: record.subject,
      percentage: record.percentage,
      term: record.term,
    }));
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading student data...</Text>
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

  if (!student) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Student not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      <Stack spacing={6}>
        <HStack>
          <Button
            leftIcon={<FaChevronLeft />}
            variant="ghost"
            onClick={() => navigate('/students')}
          >
            Back to Students
          </Button>
        </HStack>
        
        <Box>
          <Heading size="lg">{student.name}</Heading>
          <HStack spacing={4} mt={1}>
            <Text color="gray.500">Roll Number: {student.roll_number}</Text>
            <Text color="gray.500">Department: {student.department}</Text>
            <Text color="gray.500">Year: {student.year}</Text>
          </HStack>
        </Box>
        
        {/* Risk Status Overview */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box
            bg={bgColor}
            p={5}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md" display="flex" alignItems="center">
                <Icon as={FaExclamationTriangle} mr={2} color="orange.500" />
                Current Risk Status
              </Heading>
              
              <VStack align="center" width="100%" py={4} spacing={4}>
                <RiskBadge risk={latestPrediction?.risk_level || 'Unknown'} />
                <Text fontSize="sm" color="gray.500">
                  Last updated: {latestPrediction ? new Date(latestPrediction.prediction_date).toLocaleDateString() : 'N/A'}
                </Text>
                {latestPrediction && (
                  <Text fontSize="md">
                    Confidence: {(latestPrediction.confidence_score * 100).toFixed(1)}%
                  </Text>
                )}
              </VStack>
            </VStack>
          </Box>
          
          <Box
            bg={bgColor}
            p={5}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md" display="flex" alignItems="center">
                <Icon as={FaGraduationCap} mr={2} color="blue.500" />
                Academic Overview
              </Heading>
              
              <StatGroup width="100%">
                <Stat>
                  <StatLabel>Average Grade</StatLabel>
                  <StatNumber>{calculateAverageGrade().toFixed(1)}%</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Subjects</StatLabel>
                  <StatNumber>{academicRecords.length}</StatNumber>
                </Stat>
              </StatGroup>
            </VStack>
          </Box>
          
          <Box
            bg={bgColor}
            p={5}
            borderRadius="lg"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
          >
            <VStack align="start" spacing={4}>
              <Heading size="md" display="flex" alignItems="center">
                <Icon as={FaCalendarAlt} mr={2} color="green.500" />
                Attendance Overview
              </Heading>
              
              <StatGroup width="100%">
                <Stat>
                  <StatLabel>Attendance Rate</StatLabel>
                  <StatNumber>{calculateAttendanceRate().toFixed(1)}%</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Classes</StatLabel>
                  <StatNumber>{attendanceRecords.length}</StatNumber>
                </Stat>
              </StatGroup>
            </VStack>
          </Box>
        </SimpleGrid>
        
        <Tabs colorScheme="blue" variant="enclosed" bg={bgColor} borderRadius="lg" overflow="hidden">
          <TabList px={4} pt={4}>
            <Tab>Risk Factors</Tab>
            <Tab>Attendance</Tab>
            <Tab>Academic Records</Tab>
            <Tab>Activities</Tab>
          </TabList>
          
          <TabPanels>
            {/* Risk Factors Panel */}
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Key Risk Factors</Heading>
                    
                    {latestPrediction?.factors ? (
                      <VStack align="stretch" width="100%" spacing={3}>
                        {Object.entries(latestPrediction.factors)
                          .sort(([, a], [, b]) => b - a)
                          .map(([factor, value], index) => (
                            <RiskFactorBar 
                              key={index}
                              label={factor.replace(/_/g, ' ')}
                              value={value}
                              max={1.0}
                            />
                          ))}
                      </VStack>
                    ) : (
                      <Text>No risk factor data available</Text>
                    )}
                  </VStack>
                </GridItem>
                
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Risk Factor Distribution</Heading>
                    
                    {latestPrediction?.factors ? (
                      <Box width="100%" height="300px">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={formatFactorsForChart()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {formatFactorsForChart().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Text>No chart data available</Text>
                    )}
                  </VStack>
                </GridItem>
              </Grid>
            </TabPanel>
            
            {/* Attendance Panel */}
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Attendance by Subject</Heading>
                    
                    {attendanceRecords.length > 0 ? (
                      <Box width="100%" height="300px">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prepareAttendanceChartData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="subject" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="present" stackId="a" fill="#82ca9d" name="Present" />
                            <Bar dataKey="absent" stackId="a" fill="#ff8042" name="Absent" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Text>No attendance data available</Text>
                    )}
                  </VStack>
                </GridItem>
                
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Recent Attendance Records</Heading>
                    
                    {attendanceRecords.length > 0 ? (
                      <TableContainer width="100%">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Date</Th>
                              <Th>Subject</Th>
                              <Th>Status</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {attendanceRecords.slice(0, 10).map((record, index) => (
                              <Tr key={index}>
                                <Td>{new Date(record.date).toLocaleDateString()}</Td>
                                <Td>{record.subject}</Td>
                                <Td>
                                  <Badge 
                                    colorScheme={record.status === 'present' ? 'green' : 'red'}
                                  >
                                    {record.status}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Text>No attendance records available</Text>
                    )}
                  </VStack>
                </GridItem>
              </Grid>
            </TabPanel>
            
            {/* Academic Records Panel */}
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Grade Distribution</Heading>
                    
                    {academicRecords.length > 0 ? (
                      <Box width="100%" height="300px">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prepareGradeChartData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="subject" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="percentage" 
                              stroke="#8884d8" 
                              activeDot={{ r: 8 }}
                              name="Grade Percentage"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Text>No academic data available</Text>
                    )}
                  </VStack>
                </GridItem>
                
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Heading size="md">Academic Records</Heading>
                    
                    {academicRecords.length > 0 ? (
                      <TableContainer width="100%">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Subject</Th>
                              <Th>Grade</Th>
                              <Th>Percentage</Th>
                              <Th>Term</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {academicRecords.map((record, index) => (
                              <Tr key={index}>
                                <Td>{record.subject}</Td>
                                <Td>{record.grade}</Td>
                                <Td>{record.percentage}%</Td>
                                <Td>{record.term}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Text>No academic records available</Text>
                    )}
                  </VStack>
                </GridItem>
              </Grid>
            </TabPanel>
            
            {/* Activities Panel */}
            <TabPanel>
              {activities.length > 0 ? (
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Activity</Th>
                        <Th>Role</Th>
                        <Th>Hours per Week</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {activities.map((activity, index) => (
                        <Tr key={index}>
                          <Td>{activity.activity}</Td>
                          <Td>{activity.role}</Td>
                          <Td>{activity.hours_per_week}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text>No extracurricular activities recorded</Text>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default StudentDetail;