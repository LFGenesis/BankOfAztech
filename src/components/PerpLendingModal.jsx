import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  useColorModeValue,
  Text,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider
} from '@chakra-ui/react';
import { FaExternalLinkAlt, FaChartLine, FaHandHoldingUsd } from 'react-icons/fa';

const FWX_CONTRACTS = {
  perpMarket: "0x188dc551C39f1e1a132928a5c5a973097B687b6D",
  bofaPool: "0xBC0a26a579e661949ae9b6bbCDf56D001162E776",
  avaxPool: "0x3fAc5DC18c6401A5fBD116c6F22074644C527304"
};

const FWX_URLS = {
  perpTrade: "https://app.fwx.finance/43114/future-trade/0x7654B08cCd188643c9D6b639535a700D75EbC4FB/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  lending: "https://app.fwx.finance/43114/lend/0x701d06c15256aee0dfe98c7e5a9c42fb7626bc4a44a25d9665fbe10f388e6857?token=0x7654B08cCd188643c9D6b639535a700D75EbC4FB"
};

const PERP_ABI = [
  "function getFundingRate() external view returns (int256)",
  "function getMaxLeverage() external view returns (uint256)",
  "function getOpenInterest() external view returns (uint256)"
];

const POOL_ABI = [
  "function getAPR() external view returns (uint256)",
  "function totalAssets() external view returns (uint256)"
];

const PerpLendingModal = ({ isOpen, onClose }) => {
  const [marketData, setMarketData] = useState({
    fundingRate: 0,
    maxLeverage: 0,
    supplyAPR: 0,
    borrowAPR: 0
  });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
        
        const perpMarket = new ethers.Contract(FWX_CONTRACTS.perpMarket, PERP_ABI, provider);
        const bofaPool = new ethers.Contract(FWX_CONTRACTS.bofaPool, POOL_ABI, provider);
        const avaxPool = new ethers.Contract(FWX_CONTRACTS.avaxPool, POOL_ABI, provider);

        const [fundingRate, maxLeverage, supplyAPR, borrowAPR] = await Promise.all([
          perpMarket.getFundingRate(),
          perpMarket.getMaxLeverage(),
          bofaPool.getAPR(),
          avaxPool.getAPR()
        ]);

        setMarketData({
          fundingRate: parseFloat(ethers.utils.formatUnits(fundingRate, 6)), // %
          maxLeverage: parseFloat(ethers.utils.formatUnits(maxLeverage, 18)),
          supplyAPR: parseFloat(ethers.utils.formatUnits(supplyAPR, 6)), // %
          borrowAPR: parseFloat(ethers.utils.formatUnits(borrowAPR, 6)) // %
        });
      } catch (error) {
        console.error('Market data fetch error:', error);
      }
    };

    if (isOpen) {
      fetchMarketData();
    }
  }, [isOpen]);

  const borderColor = useColorModeValue('purple.500', 'purple.500');
  const bgHover = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100');

  const openInNewTab = (url) => {
    window.open(url, '_blank');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl"
      isCentered
    >
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent
        bg="gray.800"
        borderWidth={2}
        borderColor={borderColor}
        boxShadow="0 0 20px purple"
      >
        <ModalHeader color="purple.400">BOFA Trading & Lending</ModalHeader>
        <ModalCloseButton color="whiteAlpha.900" />
        <ModalBody pb={6}>
          <VStack spacing={6}>
            {/* Perp Trading Card */}
            <Box
              p={6}
              borderRadius="xl"
              borderWidth={2}
              borderColor="purple.500"
              bg="whiteAlpha.50"
              cursor="pointer"
              onClick={() => openInNewTab(FWX_URLS.perpTrade)}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 0 20px purple',
                bg: bgHover
              }}
              transition="all 0.3s"
              width="full"
            >
              <VStack align="stretch" spacing={4}>
                <HStack spacing={4}>
                  <Icon as={FaChartLine} boxSize={8} color="purple.400" />
                  <VStack align="start" flex={1}>
                    <Text fontSize="xl" fontWeight="bold">Trade BOFA/AVAX Perpetuals</Text>
                    <Text fontSize="sm" color="gray.400">
                      Trade with up to {marketData.maxLeverage}x leverage on FWX Finance
                    </Text>
                  </VStack>
                  <Icon as={FaExternalLinkAlt} color="purple.400" />
                </HStack>
                
                <Divider borderColor="whiteAlpha.300" />
                
                <HStack justify="space-between">
                  <Stat>
                    <StatLabel>Leverage</StatLabel>
                    <StatNumber>Up to {marketData.maxLeverage}x</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Funding Rate</StatLabel>
                    <StatNumber>{marketData.fundingRate.toFixed(3)}%</StatNumber>
                    <StatHelpText>per 8 hours</StatHelpText>
                  </Stat>
                </HStack>
              </VStack>
            </Box>

            {/* Lending Card */}
            <Box
              p={6}
              borderRadius="xl"
              borderWidth={2}
              borderColor="purple.500"
              bg="whiteAlpha.50"
              cursor="pointer"
              onClick={() => openInNewTab(FWX_URLS.lending)}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 0 20px purple',
                bg: bgHover
              }}
              transition="all 0.3s"
              width="full"
            >
              <VStack align="stretch" spacing={4}>
                <HStack spacing={4}>
                  <Icon as={FaHandHoldingUsd} boxSize={8} color="purple.400" />
                  <VStack align="start" flex={1}>
                    <Text fontSize="xl" fontWeight="bold">Lend & Borrow BOFA</Text>
                    <Text fontSize="sm" color="gray.400">
                      Earn interest or get leverage through lending
                    </Text>
                  </VStack>
                  <Icon as={FaExternalLinkAlt} color="purple.400" />
                </HStack>
                
                <Divider borderColor="whiteAlpha.300" />
                
                <HStack justify="space-between">
                  <Stat>
                    <StatLabel>Supply APR</StatLabel>
                    <StatNumber>{marketData.supplyAPR.toFixed(2)}%</StatNumber>
                    <StatHelpText>Variable</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Borrow APR</StatLabel>
                    <StatNumber>{marketData.borrowAPR.toFixed(2)}%</StatNumber>
                    <StatHelpText>Variable</StatHelpText>
                  </Stat>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PerpLendingModal; 