import React from 'react';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  useColorMode,
  Avatar,
} from '@chakra-ui/react';
import { 
  FaSun, 
  FaMoon, 
  FaBell, 
  FaUserCircle, 
  FaCog, 
  FaSignOutAlt, 
  FaChevronDown 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      bg={bg}
      px={4}
      py={2}
      borderBottomWidth="1px"
      borderColor={borderColor}
      zIndex="sticky"
    >
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Box ml={{ base: 0, md: 60 }}>
          <Text fontSize="lg" fontWeight="semibold" display={{ base: 'block', md: 'none' }}>
            StayInSchool
          </Text>
        </Box>
        
        <HStack spacing={3}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
            onClick={toggleColorMode}
            variant="ghost"
            size="md"
          />
          
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              rightIcon={<FaChevronDown />}
              padding="2"
            >
              <HStack spacing={2}>
                <Avatar size="sm" name={user?.name || 'User'} />
                <Box display={{ base: 'none', md: 'block' }}>
                  <Text fontSize="sm">{user?.name || 'User'}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {user?.email || 'teacher@example.com'}
                  </Text>
                </Box>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FaUserCircle />}>Profile</MenuItem>
              <MenuItem icon={<FaCog />}>Settings</MenuItem>
              <MenuDivider />
              <MenuItem icon={<FaSignOutAlt />} onClick={handleSignOut}>
                Sign out
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;