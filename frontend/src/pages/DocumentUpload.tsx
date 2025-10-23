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
  Icon,
  Progress,
  useColorModeValue,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Select,
  Flex,
} from '@chakra-ui/react';
import { FaUpload, FaFileAlt, FaFileCsv, FaFilePdf, FaFileWord, FaFileExcel } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const DocumentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [documentTypeError, setDocumentTypeError] = useState('');
  const [fileError, setFileError] = useState('');
  
  const toast = useToast();
  const { user } = useAuth();
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const documentTypeOptions = [
    { value: 'attendance', label: 'Student Attendance Records' },
    { value: 'academic', label: 'Academic Performance Records' },
    { value: 'personal', label: 'Personal Information Records' },
    { value: 'extracurricular', label: 'Extracurricular Activity Records' },
    { value: 'combined', label: 'Combined Student Data' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validFileTypes = [
        'application/pdf', 
        'text/csv', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];
      
      if (!validFileTypes.includes(selectedFile.type)) {
        setFileError('Invalid file type. Please upload PDF, CSV, Excel, Word, or TXT files.');
        setFile(null);
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFileError('File is too large. Maximum size is 10MB.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setFileError('');
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    
    if (!documentType) {
      setDocumentTypeError('Please select a document type');
      isValid = false;
    } else {
      setDocumentTypeError('');
    }
    
    if (!file) {
      setFileError('Please select a file to upload');
      isValid = false;
    }
    
    return isValid;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulating progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Make API call to upload the document
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('document_type', documentType);
      
      await apiService.uploadDocument(formData, {
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: 'Upload successful',
        description: 'The document has been uploaded and is being processed.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setFile(null);
      setDocumentType('');
      
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading the document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File | null) => {
    if (!file) return FaFileAlt;
    
    const fileType = file.type;
    if (fileType.includes('pdf')) return FaFilePdf;
    if (fileType.includes('csv')) return FaFileCsv;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return FaFileExcel;
    if (fileType.includes('word') || fileType.includes('document')) return FaFileWord;
    
    return FaFileAlt;
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Upload Student Documents</Heading>
          <Text color="gray.500">
            Upload files containing student data for dropout risk prediction.
            Supported formats: PDF, CSV, Excel, and Word documents.
          </Text>
        </Box>
        
        <Box
          bg={bgColor}
          p={6}
          borderRadius="lg"
          boxShadow="sm"
          border="1px"
          borderColor={borderColor}
        >
          <Stack spacing={4}>
            {uploadProgress > 0 && (
              <Box>
                <Text mb={1} fontSize="sm">
                  {uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                </Text>
                <Progress 
                  value={uploadProgress} 
                  size="sm" 
                  colorScheme={uploadProgress < 100 ? "blue" : "green"} 
                  borderRadius="full"
                />
              </Box>
            )}
            
            <FormControl isInvalid={!!documentTypeError}>
              <FormLabel>Document Type</FormLabel>
              <Select
                placeholder="Select document type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                isDisabled={isUploading}
              >
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{documentTypeError}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!fileError}>
              <FormLabel>Upload File</FormLabel>
              <Box
                borderWidth={2}
                borderRadius="md"
                borderColor={fileError ? "red.500" : "gray.200"}
                borderStyle="dashed"
                p={6}
                textAlign="center"
                bg={useColorModeValue('gray.50', 'gray.700')}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                  accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
                />
                
                <VStack spacing={3}>
                  {file ? (
                    <HStack spacing={3}>
                      <Icon as={getFileIcon(file)} boxSize={6} color="blue.500" />
                      <Text noOfLines={1} maxW="300px">{file.name}</Text>
                    </HStack>
                  ) : (
                    <Icon as={FaUpload} boxSize={10} color="gray.400" />
                  )}
                  
                  <Button
                    as="label"
                    htmlFor="file-upload"
                    colorScheme={file ? "green" : "blue"}
                    variant={file ? "outline" : "solid"}
                    leftIcon={file ? <Icon as={getFileIcon(file)} /> : <FaUpload />}
                    cursor="pointer"
                    isDisabled={isUploading}
                  >
                    {file ? "Change File" : "Select File"}
                  </Button>
                  
                  {!file && !fileError && (
                    <Text fontSize="sm" color="gray.500">
                      Drag & drop or click to select a file
                    </Text>
                  )}
                </VStack>
              </Box>
              <FormErrorMessage>{fileError}</FormErrorMessage>
            </FormControl>
            
            <Button
              colorScheme="blue"
              isLoading={isUploading}
              loadingText="Uploading..."
              onClick={handleUpload}
              size="lg"
              isDisabled={!file || isUploading}
              leftIcon={<FaUpload />}
              mt={4}
            >
              Upload Document
            </Button>
            
            <Text fontSize="xs" color="gray.500">
              Max file size: 10MB. Supported formats: PDF, CSV, Excel, Word, TXT.
            </Text>
          </Stack>
        </Box>
      </VStack>
    </Container>
  );
};

export default DocumentUpload;