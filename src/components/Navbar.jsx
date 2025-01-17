import React from 'react';
import { Box, Flex, HStack, Button, Image } from '@chakra-ui/react';
import { FaArrowsAltH, FaSwimmingPool } from 'react-icons/fa';

const Navbar = () => {
  return (
    <Box bg="gray.800" px={4}>
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        {/* Left Side - Logo */}
        <Flex alignItems="center">
          <Image src="/logo.png" h="32px" mr={2} />
          <Box color="purple.500" fontWeight="bold" fontSize="xl">
            Bank of Aztech
          </Box>
        </Flex>

        {/* Center - Navigation */}
        <Flex flex={1} justify="center">
          <HStack spacing={8}>
            <Button
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.200' }}
              leftIcon={<FaArrowsAltH />}
              size="sm"
            >
              Swap/Buy
            </Button>
            <Button
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.200' }}
              leftIcon={<FaSwimmingPool />}
              size="sm"
            >
              Pools
            </Button>
          </HStack>
        </Flex>

        {/* Right Side - Wallet */}
        <Button
          variant="outline"
          colorScheme="purple"
          size="sm"
        >
          0xa799...7BAf
        </Button>
      </Flex>
    </Box>
  );
};

export default Navbar; 