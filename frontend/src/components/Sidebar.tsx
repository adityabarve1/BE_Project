import React from 'react';
import { Box, Flex, Icon, Link, VStack, Text, Divider, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FaChalkboardTeacher, FaUsers, FaFileUpload, FaChartBar, FaBell } from 'react-icons/fa';
import { RiDashboardFill } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';

interface NavItemProps {
  icon: React.ElementType;
  children: React.ReactNode;
  to: string;
  isActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, children, to, isActive }) => {
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.600', 'blue.200');
  const inactiveColor = useColorModeValue('gray.600', 'gray.400');
  
  return (
    <Link
      as={RouterLink}
      to={to}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Tooltip label={children} placement="right" hasArrow>
        <Flex
          align="center"
          p="4"
          mx="4"
          borderRadius="lg"
          role="group"
          cursor="pointer"
          bg={isActive ? activeBg : 'transparent'}
          color={isActive ? activeColor : inactiveColor}
          _hover={{
            bg: activeBg,
            color: activeColor,
          }}
          fontWeight={isActive ? 'medium' : 'normal'}
        >
          <Icon
            mr="4"
            fontSize="16"
            as={icon}
            _groupHover={{
              color: activeColor,
            }}
          />
          {children}
        </Flex>
      </Tooltip>
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const isCurrentPath = (path: string) => location.pathname === path;
  
  return (
    <Box
      w={{ base: 'full', md: 60 }}
      bg={bg}
      borderRight="1px"
      borderRightColor={borderColor}
      pos="fixed"
      h="full"
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('blue.600', 'blue.400')}>
          StayInSchool
        </Text>
      </Flex>
      <VStack spacing={1} align="stretch" mt={6}>
        <NavItem 
          icon={RiDashboardFill} 
          to="/dashboard" 
          isActive={isCurrentPath('/dashboard')}
        >
          Dashboard
        </NavItem>
        
        <NavItem 
          icon={FaUsers} 
          to="/students" 
          isActive={isCurrentPath('/students') || location.pathname.startsWith('/students/')}
        >
          Students
        </NavItem>
        
        <NavItem 
          icon={FaFileUpload} 
          to="/upload" 
          isActive={isCurrentPath('/upload')}
        >
          Upload Data
        </NavItem>
        
        <Divider my={4} />
        
        <Box px={6} py={2}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
            Help
          </Text>
        </Box>
        
        <NavItem icon={FaChartBar} to="/documentation">
          Documentation
        </NavItem>
      </VStack>
    </Box>
  );
};

export default Sidebar;