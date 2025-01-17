import React from 'react'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { 
  Box, 
  Button, 
  Text, 
  VStack, 
  Input, 
  useToast,
  Heading,
  Container,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  useColorModeValue,
  Flex,
  Spacer,
  HStack,
  Badge,
  SimpleGrid,
  Link,
  Icon,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Fade,
  ModalHeader,
  ModalFooter,
  Divider
} from '@chakra-ui/react'
import { FaTelegram, FaChartLine, FaInfoCircle, FaCheckCircle, FaExchangeAlt, FaTwitter, FaExternalLinkAlt } from 'react-icons/fa'
import { GiOwl } from 'react-icons/gi'
import stakingAbi from './contracts/stakingAbi.json'
import tokenAbi from './contracts/tokenAbi.json'
import PerpLendingModal from './components/PerpLendingModal'

const STAKING_CONTRACT_ADDRESS = "0x72C4ABEb42B175ab06c1BA4897530D49f0c5f77B"
const DEXSCREENER_PAIR = "0xc5a8db307d1db1f0abbf0aa6ef3fd757b3a87d7a"
const TOKEN_CONTRACT_ADDRESS = "0x7654B08cCd188643c9D6b639535a700D75EbC4FB"
const BOFA_TOKEN_ADDRESS = "0x7654B08cCd188643c9D6b639535a700D75EbC4FB"

const formatNumber = (value, decimals = 2) => {
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function App() {
  const [account, setAccount] = useState('')
  const [stakingContract, setStakingContract] = useState(null)
  const [tokenContract, setTokenContract] = useState(null)
  const [stakedAmount, setStakedAmount] = useState('0')
  const [earnedRewards, setEarnedRewards] = useState('0')
  const [stakeAmount, setStakeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [stakePercentage, setStakePercentage] = useState(100)
  const [withdrawPercentage, setWithdrawPercentage] = useState(100)
  const [tokenPrice, setTokenPrice] = useState(0)
  const [tvl, setTvl] = useState('0')
  const [stakedUsdValue, setStakedUsdValue] = useState('0')
  const [earnedUsdValue, setEarnedUsdValue] = useState('0')
  const [isSwapOpen, setIsSwapOpen] = useState(false)
  const [totalRewards, setTotalRewards] = useState('0')
  const [remainingRewards, setRemainingRewards] = useState('0')
  const [isInvestmentOpen, setIsInvestmentOpen] = useState(false)
  const [pools, setPools] = useState([])
  const [liquidityPools, setLiquidityPools] = useState([])
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [isPerpLendingOpen, setIsPerpLendingOpen] = useState(false)
  const [rewardAmount, setRewardAmount] = useState('')
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [cycleInfo, setCycleInfo] = useState(null)
  const [holderCount, setHolderCount] = useState('0')
  const [transactionCount, setTransactionCount] = useState('0')

  // Custom theme colors
  const bgColor = useColorModeValue('gray.800', 'gray.900')
  const borderColor = useColorModeValue('purple.500', 'purple.500')
  const statBgColor = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100')
  const textColor = useColorModeValue('whiteAlpha.900', 'whiteAlpha.900')

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any")
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0])

        // Kontratları ayarla
        const signer = provider.getSigner()
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, stakingAbi, signer)
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenAbi, signer)
        
        setStakingContract(stakingContract)
        setTokenContract(tokenContract)

        // Hesap değişikliğini dinle
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            // Cüzdan bağlantısı kesildi
            setAccount('')
            setStakingContract(null)
            setTokenContract(null)
          } else {
            setAccount(accounts[0])
          }
        })

        // Ağ değişikliğini dinle
        window.ethereum.on('chainChanged', (chainId) => {
          window.location.reload()
        })

      }
    } catch (error) {
      console.error('Connect wallet error:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect wallet',
        status: 'error',
        duration: 5000,
      })
    }
  }

  const fetchTokenPrice = async () => {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/avalanche/${DEXSCREENER_PAIR}`)
      const data = await response.json()
      const price = parseFloat(data.pair.priceUsd)
      setTokenPrice(price)
    } catch (error) {
      console.error('Price fetch error:', error)
    }
  }

  const fetchTVL = async () => {
    try {
      // Read-only provider for Avalanche
      const provider = new ethers.providers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')
      const stakingContractReadOnly = new ethers.Contract(
        STAKING_CONTRACT_ADDRESS,
        stakingAbi,
        provider
      )
      
      const totalStaked = await stakingContractReadOnly.totalStaked()
      const totalStakedEth = ethers.utils.formatEther(totalStaked)
      setTvl(totalStakedEth)
    } catch (error) {
      console.error('TVL fetch error:', error)
    }
  }

  const fetchRewardsInfo = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')
      const stakingContractReadOnly = new ethers.Contract(
        STAKING_CONTRACT_ADDRESS,
        stakingAbi,
        provider
      )
      
      // Toplam ödül havuzu
      const total = await stakingContractReadOnly.TOTAL_REWARDS()
      setTotalRewards(ethers.utils.formatEther(total))
      
      // Toplam stake edilmiş miktar
      const totalStaked = await stakingContractReadOnly.totalStaked()
      
      // Kalan ödüller = Toplam ödül havuzu - Toplam stake edilmiş miktar
      const available = total.sub(totalStaked)
      setRemainingRewards(ethers.utils.formatEther(available))
      
    } catch (error) {
      console.error('Rewards info fetch error:', error)
    }
  }

  const fetchLiquidityPools = async () => {
    try {
      // Tüm BOFA havuzlarını al
      const dexscreenerResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${BOFA_TOKEN_ADDRESS}`)
      const dexscreenerData = await dexscreenerResponse.json()
      
      const allPools = dexscreenerData.pairs?.map(pair => ({
        name: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
        pair: pair.pairAddress,
        liquidity: pair.liquidity?.usd || 0,
        volume24h: pair.volume?.h24 || 0,
        price: pair.priceUsd || 0,
        dex: pair.dexId,
        type: pair.pairAddress.toLowerCase() === DEXSCREENER_PAIR.toLowerCase() ? 'main' : 'other'
      })) || []

      // Likiditeye göre sırala
      const sortedPools = allPools.sort((a, b) => b.liquidity - a.liquidity)
      setLiquidityPools(sortedPools)
      
      // Ana havuzun fiyatını güncelle
      const mainPool = sortedPools.find(pool => pool.type === 'main')
      if (mainPool) {
        setTokenPrice(parseFloat(mainPool.price))
      }
    } catch (error) {
      console.error('Liquidity pools fetch error:', error)
    }
  }

  useEffect(() => {
    fetchTokenPrice()
    fetchTVL()
    fetchRewardsInfo()
    fetchLiquidityPools()
    
    const priceInterval = setInterval(fetchTokenPrice, 30000)
    const tvlInterval = setInterval(fetchTVL, 60000)
    const rewardsInterval = setInterval(fetchRewardsInfo, 60000)
    const poolsInterval = setInterval(fetchLiquidityPools, 60000)
    
    return () => {
      clearInterval(priceInterval)
      clearInterval(tvlInterval)
      clearInterval(rewardsInterval)
      clearInterval(poolsInterval)
    }
  }, [])

  const updateBalances = async () => {
    if (stakingContract && account) {
      try {
        const staked = await stakingContract.userStakedAmount(account)
        setStakedAmount(ethers.utils.formatEther(staked))
        
        const earned = await stakingContract.earned(account)
        setEarnedRewards(ethers.utils.formatEther(earned))
      } catch (error) {
        console.error('Bakiye güncelleme hatası:', error)
      }
    }
  }

  const handleStake = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Önce allowance kontrolü yap
      const allowance = await tokenContract.allowance(account, STAKING_CONTRACT_ADDRESS)
      const amount = ethers.utils.parseEther(stakeAmount)
      
      // Eğer allowance yetersizse, unlimited approve iste
      if (allowance.lt(amount)) {
        const approveTx = await tokenContract.approve(
          STAKING_CONTRACT_ADDRESS,
          ethers.constants.MaxUint256  // Unlimited approve
        )
        await approveTx.wait()
        
        toast({
          title: 'Success',
          description: 'Unlimited approval granted successfully',
          status: 'success',
          duration: 5000,
        })
      }

      // Stake işlemini gerçekleştir
      const tx = await stakingContract.stake(amount)
      await tx.wait()
      
      toast({
        title: 'Success',
        description: 'Successfully staked tokens',
        status: 'success',
        duration: 5000,
      })
      
      setStakeAmount('')
      updateBalances()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stake tokens',
        status: 'error',
        duration: 5000,
      })
      console.error('Stake error:', error)
    }
  }

  // Stake yüzdesini güncelle ve miktarı hesapla
  const handleStakePercentageChange = async (value) => {
    setStakePercentage(value)
    if (tokenContract && account) {
      try {
        const balance = await tokenContract.balanceOf(account)
        const amount = balance.mul(value).div(100)
        setStakeAmount(ethers.utils.formatEther(amount))
      } catch (error) {
        console.error('Error calculating stake amount:', error)
      }
    }
  }

  // Withdraw yüzdesini güncelle ve miktarı hesapla
  const handleWithdrawPercentageChange = (value) => {
    setWithdrawPercentage(value)
    const amount = (parseFloat(stakedAmount) * value / 100).toString()
    setWithdrawAmount(amount)
  }

  const handleWithdraw = async () => {
    if (!stakingContract) return
    
    try {
      const stakedBalance = await stakingContract.userStakedAmount(account)
      const amount = stakedBalance.mul(withdrawPercentage).div(100)
      
      const tx = await stakingContract.withdraw(amount)
      await tx.wait()
      
      toast({
        title: 'Success',
        description: `Successfully withdrawn ${ethers.utils.formatEther(amount)} tokens`,
        status: 'success',
        duration: 5000,
      })
      
      updateBalances()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw tokens',
        status: 'error',
        duration: 5000,
      })
      console.error('Withdraw error:', error)
    }
  }

  const handleCollectRewards = async () => {
    if (!stakingContract) return
    
    try {
      const tx = await stakingContract.getReward()
      await tx.wait()
      
      toast({
        title: 'Success',
        description: 'Successfully collected rewards',
        status: 'success',
        duration: 5000,
      })
      
      updateBalances()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to collect rewards',
        status: 'error',
        duration: 5000,
      })
      console.error('Collect rewards error:', error)
    }
  }

  useEffect(() => {
    if (account) {
      updateBalances()
    }
  }, [account, stakingContract])

  // USD değerlerini güncelle
  useEffect(() => {
    if (tokenPrice > 0) {
      const stakedUsd = (parseFloat(stakedAmount) * tokenPrice).toFixed(2)
      const earnedUsd = (parseFloat(earnedRewards) * tokenPrice).toFixed(2)
      setStakedUsdValue(stakedUsd)
      setEarnedUsdValue(earnedUsd)
    }
  }, [tokenPrice, stakedAmount, earnedRewards])

  useEffect(() => {
    // 2 saniye sonra splash screen'i kapat
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleSwapClick = async () => {
    try {
      setIsSwapOpen(true)
    } catch (error) {
      console.error('Swap error:', error)
    }
  }

  const handleInvestmentClick = async () => {
    try {
      setIsInvestmentOpen(true)
    } catch (error) {
      console.error('Investment error:', error)
    }
  }

  const handlePerpLendingClick = async () => {
    try {
      setIsPerpLendingOpen(true)
    } catch (error) {
      console.error('Perp/Lending error:', error)
    }
  }

  useEffect(() => {
    const fetchCycleInfo = async () => {
      try {
        // Direkt RPC provider kullanarak cycle bilgilerini al
        const provider = new ethers.providers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc")
        const contract = new ethers.Contract(
          "0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631",
          [
            "function getCurrentCycleInfo() external view returns (uint256 cycleId, uint256 totalReward, uint256 rewardPerMint, uint256 mintersCount, uint256 startTime, uint256 remainingReward, bool active, uint256 remainingMints)"
          ],
          provider
        )

        const info = await contract.getCurrentCycleInfo()
        console.log("Cycle Info:", info) // Debug için
        setCycleInfo(info)
      } catch (error) {
        console.error("Cycle info fetch error:", error)
      }
    }

    fetchCycleInfo()
    const interval = setInterval(fetchCycleInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Fade in={true}>
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0" 
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          bg="gray.900"
          zIndex="9999"
        >
          {/* Blockchain Animation */}
          <Box
            position="relative"
            width="300px"
            height="300px"
            sx={{
              '@keyframes rotate-chains': {
                '0%': {
                  transform: 'rotate(0deg)',
                  filter: 'drop-shadow(0 0 15px #805AD5)'
                },
                '50%': {
                  transform: 'rotate(180deg)',
                  filter: 'drop-shadow(0 0 30px #805AD5)'
                },
                '100%': {
                  transform: 'rotate(360deg)',
                  filter: 'drop-shadow(0 0 15px #805AD5)'
                }
              },
              '@keyframes pulse-blocks': {
                '0%': { opacity: 0.5, transform: 'scale(0.8)' },
                '50%': { opacity: 1, transform: 'scale(1.1)' },
                '100%': { opacity: 0.5, transform: 'scale(0.8)' }
              }
            }}
          >
            {/* Dış Halka */}
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              borderRadius="full"
              border="3px solid"
              borderColor="purple.500"
              animation="rotate-chains 8s linear infinite"
            />
            
            {/* Orta Halka */}
            <Box
              position="absolute"
              top="50px"
              left="50px"
              right="50px"
              bottom="50px"
              borderRadius="full"
              border="3px solid"
              borderColor="purple.400"
              animation="rotate-chains 6s linear infinite reverse"
            />

            {/* İç Halka */}
            <Box
              position="absolute"
              top="100px"
              left="100px"
              right="100px"
              bottom="100px"
              borderRadius="full"
              border="3px solid"
              borderColor="purple.300"
              animation="rotate-chains 4s linear infinite"
            />

            {/* Merkezdeki Bloklar */}
            <SimpleGrid
              columns={2}
              spacing={4}
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              width="100px"
            >
              {[...Array(4)].map((_, i) => (
                <Box
                  key={i}
                  width="40px"
                  height="40px"
                  bg="purple.500"
                  borderRadius="lg"
                  animation="pulse-blocks 2s ease-in-out infinite"
                  animationDelay={`${i * 0.5}s`}
                  boxShadow="0 0 20px #805AD5"
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* Logo ve Text */}
          <Image
            src="/logo.png"
            alt="Bank of Aztech"
            boxSize="80px"
            mt={8}
            opacity={0.8}
            sx={{
              filter: 'drop-shadow(0 0 10px #805AD5)'
            }}
          />
          <Text
            mt={4}
            color="purple.400"
            fontSize="xl"
            fontWeight="bold"
            textAlign="center"
            sx={{
              '@keyframes fade-in-out': {
                '0%': { opacity: 0.4 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.4 }
              },
              animation: 'fade-in-out 2s infinite',
              textShadow: '0 0 10px #805AD5'
            }}
          >
            Bank of Aztech dApp
          </Text>
        </Box>
      </Fade>
    )
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Navbar */}
      <Box 
        borderBottom="1px" 
        borderColor={borderColor} 
        py={{ base: 2, md: 4 }} 
        px={{ base: 2, md: 4 }}
        position="sticky"
        top="0"
        zIndex="sticky"
        bg={bgColor}
      >
        <Container maxW="container.md">
          <Flex 
            align="center" 
            justify="space-between"
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 2, md: 6 }}
          >
            <HStack spacing={3}>
              <Image
                src="/logo.png"
                alt="Bank of Aztech Logo"
                boxSize={{ base: '40px', md: '32px' }}
                objectFit="cover"
                borderRadius="full"
              />
              <Heading 
                size={{ base: 'lg', md: 'md' }}
                bgGradient="linear(to-r, purple.400, pink.400)"
                bgClip="text"
                fontWeight="extrabold"
                whiteSpace="nowrap"
              >
                BankOfAztech
              </Heading>
            </HStack>

            <HStack spacing={2} wrap="nowrap" justify="center" zIndex={2}>
              <Button
                variant="ghost"
                colorScheme="purple"
                leftIcon={<FaExchangeAlt />}
                onClick={handleSwapClick}
                pointerEvents="auto"
                cursor="pointer"
                _hover={{
                  bg: 'whiteAlpha.200',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 15px rgba(128, 90, 213, 0.6)'
                }}
                transition="all 0.2s"
                size={{ base: 'sm', md: 'md' }}
              >
                Swap/Buy
              </Button>
              
              <Button
                variant="ghost"
                colorScheme="purple"
                leftIcon={<FaChartLine />}
                onClick={handleInvestmentClick}
                _hover={{
                  bg: 'whiteAlpha.200',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 15px rgba(128, 90, 213, 0.6)'
                }}
                transition="all 0.2s"
                size={{ base: 'sm', md: 'md' }}
              >
                Investment
              </Button>
            </HStack>

            <HStack spacing={4}>
              <Link 
                href="https://twitter.com/BankofAztech" 
                isExternal
                _hover={{ color: 'purple.400' }}
              >
                <Icon as={FaTwitter} boxSize={5} />
              </Link>
              
              <Link 
                href="https://t.me/BankofAztech" 
                isExternal
                _hover={{ color: 'purple.400' }}
              >
                <Icon as={FaTelegram} boxSize={5} />
              </Link>

              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  connectWallet();
                }}
                colorScheme="purple"
                leftIcon={<GiOwl />}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 15px rgba(128, 90, 213, 0.6)'
                }}
                transition="all 0.2s"
                size={{ base: 'sm', md: 'md' }}
                zIndex={3}
                position="relative"
              >
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container 
        maxW="container.md" 
        py={{ base: 3, md: 6 }} 
        px={{ base: 2, md: 4 }} 
        bg="transparent"
        position="relative"
        zIndex={1}
      >
        <VStack spacing={6} align="stretch">
          {/* TVL ve Fiyat Kartı */}
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <Box 
              p={6} 
              borderRadius="xl" 
              borderWidth={2} 
              borderColor={borderColor}
              bg={statBgColor}
              boxShadow="0 0 10px purple"
            >
              <Stat>
                <StatLabel fontSize="sm">Total Value Locked</StatLabel>
                <StatNumber fontSize="2xl">
                  {formatNumber(tvl)} <HStack as="span" display="inline-flex" alignItems="center" spacing={1}>
                    <Box
                      position="relative"
                      width="20px"
                      height="20px"
                      borderRadius="full"
                      overflow="hidden"
                      animation="pulse 2s ease-in-out infinite"
                    >
                      <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                    </Box>
                    BOFA
                  </HStack>
                </StatNumber>
                <Text fontSize="md" color="green.400">
                  ${formatNumber(parseFloat(tvl) * tokenPrice)}
                </Text>
              </Stat>
            </Box>
            <Box 
              p={6} 
              borderRadius="xl" 
              borderWidth={2} 
              borderColor={borderColor}
              bg={statBgColor}
              boxShadow="0 0 10px purple"
            >
              <Stat>
                <StatLabel fontSize="sm">BOFA Price</StatLabel>
                <StatNumber fontSize="2xl" color="green.400">${formatNumber(tokenPrice, 4)}</StatNumber>
              </Stat>
            </Box>
          </SimpleGrid>

          {/* Perps/Lend Kartı */}
          <Box
            p={6}
            borderRadius="xl"
            borderWidth={2}
            borderColor={borderColor}
            bg={statBgColor}
            boxShadow="0 0 10px purple"
            cursor="pointer"
            onClick={handlePerpLendingClick}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 0 20px purple',
              bg: 'whiteAlpha.200'
            }}
            transition="all 0.2s"
            position="relative"
            zIndex={2}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePerpLendingClick();
              }
            }}
          >
            <HStack spacing={4} justify="space-between">
              <VStack align="start" spacing={1}>
                <Text fontSize="lg" fontWeight="bold" color="purple.400">
                  Perps & Lending
                </Text>
                <Text fontSize="sm" color="gray.400">
                  Trade with leverage or earn interest
                </Text>
              </VStack>
              <HStack spacing={2}>
                <Box
                  position="relative"
                  width="24px"
                  height="24px"
                  borderRadius="full"
                  overflow="hidden"
                  animation="pulse 2s ease-in-out infinite"
                >
                  <Image src="https://pbs.twimg.com/profile_images/1834685932525830150/2Y42289I_400x400.jpg" alt="AVAX" width="100%" height="100%" objectFit="cover" />
                </Box>
                <Icon as={FaExchangeAlt} color="purple.400" boxSize={3} />
                <Box
                  position="relative"
                  width="24px"
                  height="24px"
                  borderRadius="full"
                  overflow="hidden"
                  animation="pulse 2s ease-in-out infinite"
                >
                  <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                </Box>
              </HStack>
            </HStack>
          </Box>

          {/* BOFA Perps Contract Card */}
          <Box
            p={6}
            borderRadius="xl"
            borderWidth={2}
            borderColor={borderColor}
            bg={statBgColor}
            boxShadow="0 0 10px purple"
            position="relative"
            zIndex={2}
          >
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color="purple.400">
                    Bank Of Aztech Mint Yield
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631
                  </Text>
                </VStack>
                <HStack>
                  <Button
                    variant="ghost"
                    colorScheme="purple"
                    size="sm"
                    onClick={() => setIsInfoModalOpen(true)}
                    _hover={{ bg: 'whiteAlpha.200' }}
                  >
                    <Icon as={FaInfoCircle} />
                  </Button>
                  <Link
                    href="https://snowtrace.io/address/0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631"
                    isExternal
                    _hover={{ color: 'purple.400' }}
                  >
                    <Icon as={FaExternalLinkAlt} color="purple.400" boxSize={5} />
                  </Link>
                </HStack>
              </HStack>

              <Button
                colorScheme="purple"
                size="lg"
                onClick={async () => {
                  try {
                    if (!window.ethereum) {
                      toast({
                        title: "Hata",
                        description: "Lütfen MetaMask'ı yükleyin",
                        status: "error",
                        duration: 5000,
                      });
                      return;
                    }

                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    
                    // BOFA Token kontratı
                    const bofaTokenContract = new ethers.Contract(
                      "0x7654B08cCd188643c9D6b639535a700D75EbC4FB", // BOFA token adresi
                      [
                        "function approve(address spender, uint256 amount) external returns (bool)",
                        "function allowance(address owner, address spender) external view returns (uint256)",
                        "function balanceOf(address account) external view returns (uint256)"
                      ],
                      signer
                    );

                    // Perps kontratı
                    const perpsContract = new ethers.Contract(
                      "0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631",
                      [
                        "function mint() external",
                        "function getCurrentCycleInfo() external view returns (uint256 cycleId, uint256 totalReward, uint256 rewardPerMint, uint256 mintersCount, uint256 startTime, uint256 remainingReward, bool active, uint256 remainingMints)",
                        "function MIN_BALANCE() external view returns (uint256)"
                      ],
                      signer
                    );

                    try {
                      // Minimum BOFA bakiyesi kontrolü
                      const minBalance = await perpsContract.MIN_BALANCE();
                      const balance = await bofaTokenContract.balanceOf(account);
                      
                      if (balance.lt(minBalance)) {
                        toast({
                          title: "Hata",
                          description: `Yetersiz BOFA bakiyesi (${ethers.utils.formatEther(minBalance)} BOFA gerekli)`,
                          status: "error",
                          duration: 5000,
                        });
                        return;
                      }

                      // Cycle bilgilerini kontrol et
                      const cycleInfo = await perpsContract.getCurrentCycleInfo();
                      if (!cycleInfo.active) {
                        toast({
                          title: "Hata",
                          description: "Aktif mint cycle'ı bulunamadı",
                          status: "error",
                          duration: 5000,
                        });
                        return;
                      }

                      if (cycleInfo.remainingMints.eq(0)) {
                        toast({
                          title: "Hata",
                          description: "Bu cycle için kalan mint hakkı kalmadı",
                          status: "error",
                          duration: 5000,
                        });
                        return;
                      }

                      toast({
                        title: "İşlem Bekliyor",
                        description: "Lütfen mint işlemini onaylayın",
                        status: "info",
                        duration: 5000,
                      });

                      // Mint işlemi
                      const tx = await perpsContract.mint({
                        gasLimit: 500000
                      });
                      
                      await tx.wait();

                      toast({
                        title: "Başarılı",
                        description: "Mint işlemi başarıyla tamamlandı",
                        status: "success",
                        duration: 5000,
                      });
                    } catch (error) {
                      console.error("Mint error:", error);
                      toast({
                        title: "Hata",
                        description: error.message || "Mint işlemi başarısız oldu",
                        status: "error",
                        duration: 5000,
                      });
                    }
                  } catch (error) {
                    console.error("Mint error:", error);
                    toast({
                      title: "Hata",
                      description: error.message || "Mint işlemi başarısız oldu",
                      status: "error",
                      duration: 5000,
                    });
                  }
                }}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 15px rgba(128, 90, 213, 0.6)'
                }}
                transition="all 0.2s"
                isDisabled={!account}
              >
                Mint BOFA
              </Button>

              {/* Admin Panel - Sadece admin cüzdan için görünür */}
              {account && account.toLowerCase() === "0xa79914ef740f144F98e7ab7A5CC9E425119e7BAf".toLowerCase() && (
                <Box
                  mt={4}
                  p={4}
                  borderRadius="lg"
                  borderWidth={1}
                  borderColor="red.500"
                  bg="whiteAlpha.100"
                >
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="md" fontWeight="bold" color="red.400">
                      Admin Panel
                    </Text>
                    
                    <HStack>
                      <Input
                        placeholder="Reward miktarı"
                        type="number"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        bg="whiteAlpha.200"
                        borderColor="red.500"
                        _hover={{ borderColor: 'red.400' }}
                        _focus={{ borderColor: 'red.300', boxShadow: '0 0 0 1px #E53E3E' }}
                      />
                      <Button
                        colorScheme="red"
                        onClick={async () => {
                          try {
                            if (!rewardAmount) {
                              toast({
                                title: "Hata",
                                description: "Lütfen bir miktar girin",
                                status: "error",
                                duration: 5000,
                              });
                              return;
                            }

                            const provider = new ethers.providers.Web3Provider(window.ethereum);
                            const signer = provider.getSigner();
                            
                            // BOFA Token kontratı
                            const bofaTokenContract = new ethers.Contract(
                              "0x7654B08cCd188643c9D6b639535a700D75EbC4FB", // BOFA token adresi
                              [
                                "function approve(address spender, uint256 amount) external returns (bool)",
                                "function allowance(address owner, address spender) external view returns (uint256)",
                                "function transfer(address recipient, uint256 amount) external returns (bool)",
                                "function balanceOf(address account) external view returns (uint256)"
                              ],
                              signer
                            );

                            // Perps kontratı
                            const perpsContract = new ethers.Contract(
                              "0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631",
                              [
                                "function mint() external",
                                "function addReward(uint256 _amount) external"
                              ],
                              signer
                            );

                            const amount = ethers.utils.parseEther(rewardAmount);

                            // Bakiye kontrolü
                            const balance = await bofaTokenContract.balanceOf(account);
                            if (balance.lt(amount)) {
                              toast({
                                title: "Hata",
                                description: "Yetersiz BOFA bakiyesi",
                                status: "error",
                                duration: 5000,
                              });
                              return;
                            }

                            // Önce BOFA token'ı transfer et
                            toast({
                              title: "İşlem Bekliyor",
                              description: "Lütfen BOFA transfer işlemini onaylayın",
                              status: "info",
                              duration: 5000,
                            });

                            const transferTx = await bofaTokenContract.transfer(
                              "0xb87c8E0Ff569ecc17e0E7823111DddD0b41dc631",
                              amount,
                              {
                                gasLimit: 300000 // Transfer için gas limit
                              }
                            );
                            
                            await transferTx.wait();

                            toast({
                              title: "İşlem Bekliyor",
                              description: "BOFA transfer edildi, şimdi reward ekleme işlemini onaylayın",
                              status: "info",
                              duration: 5000,
                            });

                            // Reward ekleme işlemi
                            const tx = await perpsContract.addReward(amount, {
                              gasLimit: 1000000 // Reward ekleme için gas limit
                            });
                            
                            await tx.wait();

                            toast({
                              title: "Başarılı",
                              description: "Reward başarıyla eklendi",
                              status: "success",
                              duration: 5000,
                            });
                            setRewardAmount('');
                          } catch (error) {
                            console.error("Add reward error:", error);
                            toast({
                              title: "Hata",
                              description: error.message || "Reward ekleme başarısız oldu",
                              status: "error",
                              duration: 5000,
                            });
                          }
                        }}
                      >
                        Reward Ekle
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>

          {/* Cycle Bilgileri Kartı */}
          <Box
            p={{ base: 3, md: 6 }}
            borderRadius="xl"
            borderWidth={2}
            borderColor={borderColor}
            bg={statBgColor}
            boxShadow="0 0 10px purple"
            position="relative"
            zIndex={2}
            mb={{ base: 3, md: 6 }}
          >
            <VStack spacing={{ base: 2, md: 4 }} align="stretch">
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="purple.400">
                Active Cycle Information
              </Text>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 2, md: 4 }}>
                <VStack align="start" spacing={{ base: 1, md: 2 }}>
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Reward Per Mint</Text>
                  <Text fontSize={{ base: "lg", md: "xl" }} color="green.400">
                    {cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.rewardPerMint)) : '0'} BOFA
                  </Text>
                  <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                    ≈ ${cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.rewardPerMint) * tokenPrice, 2) : '0'}
                  </Text>
                </VStack>

                <VStack align="start" spacing={{ base: 1, md: 2 }}>
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Remaining Mints</Text>
                  <Text fontSize={{ base: "lg", md: "xl" }} color="purple.400">
                    {cycleInfo ? cycleInfo.remainingMints.toString() : '0'}
                  </Text>
                </VStack>

                <VStack align="start" spacing={{ base: 1, md: 2 }}>
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Total Cycle Reward</Text>
                  <Text fontSize={{ base: "lg", md: "xl" }} color="green.400">
                    {cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.totalReward)) : '0'} BOFA
                  </Text>
                  <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                    ≈ ${cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.totalReward) * tokenPrice, 2) : '0'}
                  </Text>
                </VStack>

                <VStack align="start" spacing={{ base: 1, md: 2 }}>
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Remaining Cycle Reward</Text>
                  <Text fontSize={{ base: "lg", md: "xl" }} color="green.400">
                    {cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.remainingReward)) : '0'} BOFA
                  </Text>
                  <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                    ≈ ${cycleInfo ? formatNumber(ethers.utils.formatEther(cycleInfo.remainingReward) * tokenPrice, 2) : '0'}
                  </Text>
                </VStack>
              </SimpleGrid>

              <Divider borderColor="whiteAlpha.300" my={{ base: 2, md: 4 }} />

              <VStack align="start" spacing={{ base: 2, md: 3 }}>
                <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="purple.400">
                  Requirements
                </Text>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.400" boxSize={{ base: 4, md: 5 }} />
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Minimum 1 BOFA balance required</Text>
                </HStack>
                <HStack>
                  <Icon as={FaInfoCircle} color="purple.400" boxSize={{ base: 4, md: 5 }} />
                  <Text color="gray.400" fontSize={{ base: "sm", md: "md" }}>Each address can mint only once per cycle</Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* Info Modal */}
          <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} size="xl">
            <ModalOverlay backdropFilter="blur(10px)" />
            <ModalContent
              bg="gray.800"
              borderWidth={2}
              borderColor="purple.500"
              boxShadow="0 0 20px purple"
            >
              <ModalHeader color="purple.400">Bank Of Aztech Mint Yield System</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="purple.400" mb={2}>
                      How Does It Work?
                    </Text>
                    <VStack align="start" spacing={3}>
                      <Text color="gray.400">
                        • Each cycle distributes a specific amount of BOFA rewards
                      </Text>
                      <Text color="gray.400">
                        • Minters earn direct rewards and reflection rewards
                      </Text>
                      <Text color="gray.400">
                        • Each cycle has a limited number of mint rights
                      </Text>
                      <Text color="gray.400">
                        • Previous minters also earn rewards through the reflection system
                      </Text>
                    </VStack>
                  </Box>

                  <Box>
                    <Text fontSize="lg" fontWeight="bold" color="purple.400" mb={2}>
                      Potential Earnings
                    </Text>
                    <VStack align="start" spacing={3}>
                      <Text color="gray.400">
                        1. Direct Mint Reward: Instant BOFA reward for each mint
                      </Text>
                      <Text color="gray.400">
                        2. Reflection Reward: Earn a share from subsequent mints
                      </Text>
                      <Text color="gray.400">
                        3. Early Participation Advantage: Early minters receive more reflections
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              </ModalBody>
            </ModalContent>
          </Modal>

          {/* Ödül İstatistikleri */}
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <Box 
              p={6} 
              borderRadius="xl" 
              borderWidth={2} 
              borderColor={borderColor}
              bg={statBgColor}
              boxShadow="0 0 10px purple"
            >
              <Stat>
                <StatLabel fontSize="sm">Total Rewards Pool</StatLabel>
                <StatNumber fontSize="2xl">
                  {formatNumber(totalRewards)} <HStack as="span" display="inline-flex" alignItems="center" spacing={1}>
                    <Box
                      position="relative"
                      width="20px"
                      height="20px"
                      borderRadius="full"
                      overflow="hidden"
                      animation="pulse 2s ease-in-out infinite"
                    >
                      <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                    </Box>
                    BOFA
                  </HStack>
                </StatNumber>
                <Text fontSize="md" color="green.400">
                  ${formatNumber(parseFloat(totalRewards) * tokenPrice)}
                </Text>
              </Stat>
            </Box>
            <Box 
              p={6} 
              borderRadius="xl" 
              borderWidth={2} 
              borderColor={borderColor}
              bg={statBgColor}
              boxShadow="0 0 10px purple"
            >
              <Stat>
                <StatLabel fontSize="sm">Available Rewards</StatLabel>
                <StatNumber fontSize="2xl">
                  {formatNumber(remainingRewards)} <HStack as="span" display="inline-flex" alignItems="center" spacing={1}>
                    <Box
                      position="relative"
                      width="20px"
                      height="20px"
                      borderRadius="full"
                      overflow="hidden"
                      animation="pulse 2s ease-in-out infinite"
                    >
                      <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                    </Box>
                    BOFA
                  </HStack>
                </StatNumber>
                <Text fontSize="md" color="green.400">
                  ${formatNumber(parseFloat(remainingRewards) * tokenPrice)}
                </Text>
              </Stat>
            </Box>
          </SimpleGrid>

          {/* BOFA Stats Card'ını kaldır */}

          {account && (
            <VStack spacing={6}>
              {/* Contract Links */}
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} w="full">
                <Link
                  href={`https://snowtrace.io/address/${TOKEN_CONTRACT_ADDRESS}`}
                  isExternal
                  w="full"
                >
                  <Button
                    w="full"
                    colorScheme="purple"
                    variant="outline"
                    rightIcon={<FaExternalLinkAlt />}
                    _hover={{
                      transform: 'scale(1.02)',
                      boxShadow: '0 0 10px purple'
                    }}
                  >
                    BOFA Contract
                  </Button>
                </Link>
                <Link
                  href={`https://snowtrace.io/address/${STAKING_CONTRACT_ADDRESS}`}
                  isExternal
                  w="full"
                >
                  <Button
                    w="full"
                    colorScheme="purple"
                    variant="outline"
                    rightIcon={<FaExternalLinkAlt />}
                    _hover={{
                      transform: 'scale(1.02)',
                      boxShadow: '0 0 10px purple'
                    }}
                  >
                    Staking Contract
                  </Button>
                </Link>
              </SimpleGrid>

              {/* Stake Bilgileri */}
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} w="full">
                <Box 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth={2} 
                  borderColor={borderColor}
                  bg={statBgColor}
                  boxShadow="0 0 10px purple"
                >
                  <Stat>
                    <StatLabel fontSize="sm">Your Staked Amount</StatLabel>
                    <StatNumber fontSize="2xl">
                      {formatNumber(stakedAmount)} <HStack as="span" display="inline-flex" alignItems="center" spacing={1}>
                        <Box
                          position="relative"
                          width="20px"
                          height="20px"
                          borderRadius="full"
                          overflow="hidden"
                          animation="pulse 2s ease-in-out infinite"
                        >
                          <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                        </Box>
                        BOFA
                      </HStack>
                    </StatNumber>
                    <Text fontSize="md" color="green.400">
                      ${formatNumber(parseFloat(stakedUsdValue))}
                    </Text>
                  </Stat>
                </Box>
                <Box 
                  p={6} 
                  borderRadius="xl" 
                  borderWidth={2} 
                  borderColor={borderColor}
                  bg={statBgColor}
                  boxShadow="0 0 10px purple"
                >
                  <Stat>
                    <StatLabel fontSize="sm">Earned Rewards</StatLabel>
                    <StatNumber fontSize="2xl">
                      {formatNumber(earnedRewards)} <HStack as="span" display="inline-flex" alignItems="center" spacing={1}>
                        <Box
                          position="relative"
                          width="20px"
                          height="20px"
                          borderRadius="full"
                          overflow="hidden"
                          animation="pulse 2s ease-in-out infinite"
                        >
                          <Image src="/logo.png" alt="BOFA" width="100%" height="100%" objectFit="cover" />
                        </Box>
                        BOFA
                      </HStack>
                    </StatNumber>
                    <Text fontSize="md" color="green.400">
                      ${formatNumber(parseFloat(earnedUsdValue))}
                    </Text>
                  </Stat>
                </Box>
              </SimpleGrid>

              {/* İşlem Kartı */}
              <Box
                p={6}
                borderRadius="xl"
                borderWidth={2}
                borderColor={borderColor}
                bg={statBgColor}
                boxShadow="0 0 10px purple"
                w="full"
              >
                <VStack spacing={8}>
                  {/* Stake Slider */}
                  <VStack spacing={4} w="full">
                    <Flex justify="space-between" w="full">
                      <Text color="purple.400">Stake Percentage</Text>
                      <Text color="gray.400">
                        {stakeAmount ? `${formatNumber(stakeAmount)} BOFA` : '0 BOFA'}
                      </Text>
                    </Flex>
                    <Slider
                      value={stakePercentage}
                      onChange={handleStakePercentageChange}
                      min={1}
                      max={100}
                      step={1}
                    >
                      <SliderTrack bg="whiteAlpha.200" h="3px">
                        <SliderFilledTrack bg="purple.500" />
                      </SliderTrack>
                      <SliderThumb boxSize={6} bg="purple.500">
                        <Text fontSize="xs" color="white">{stakePercentage}%</Text>
                      </SliderThumb>
                    </Slider>
                  </VStack>

                  {/* Withdraw Slider */}
                  <VStack spacing={4} w="full">
                    <Flex justify="space-between" w="full">
                      <Text color="purple.400">Withdraw Percentage</Text>
                      <Text color="gray.400">
                        {withdrawAmount ? `${formatNumber(withdrawAmount)} BOFA` : '0 BOFA'}
                      </Text>
                    </Flex>
                    <Slider
                      value={withdrawPercentage}
                      onChange={handleWithdrawPercentageChange}
                      min={1}
                      max={100}
                      step={1}
                    >
                      <SliderTrack bg="whiteAlpha.200" h="3px">
                        <SliderFilledTrack bg="purple.500" />
                      </SliderTrack>
                      <SliderThumb boxSize={6} bg="purple.500">
                        <Text fontSize="xs" color="white">{withdrawPercentage}%</Text>
                      </SliderThumb>
                    </Slider>
                  </VStack>

                  {/* Buttons */}
                  <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} w="full">
                    <Button
                      colorScheme="green"
                      onClick={handleStake}
                      size="lg"
                      isDisabled={!account || !stakeAmount}
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: '0 0 15px rgba(72, 187, 120, 0.6)'
                      }}
                      transition="all 0.2s"
                    >
                      Stake {stakePercentage}%
                    </Button>

                    <Button
                      colorScheme="red"
                      onClick={handleWithdraw}
                      size="lg"
                      isDisabled={!account || !withdrawAmount}
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: '0 0 15px rgba(245, 101, 101, 0.6)'
                      }}
                      transition="all 0.2s"
                    >
                      Withdraw {withdrawPercentage}%
                    </Button>

                    <Button
                      colorScheme="purple"
                      onClick={handleCollectRewards}
                      size="lg"
                      isDisabled={!account || parseFloat(earnedRewards) <= 0}
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: '0 0 15px rgba(128, 90, 213, 0.6)'
                      }}
                      transition="all 0.2s"
                    >
                      Collect
                    </Button>
                  </SimpleGrid>
                </VStack>
              </Box>
            </VStack>
          )}
        </VStack>

        {/* Dexscreener Bar */}
        <Box
          mt={6}
          p={6}
          borderRadius="xl"
          borderWidth={2}
          borderColor={borderColor}
          bg={statBgColor}
          boxShadow="0 0 10px purple"
        >
          <VStack spacing={4} align="stretch">
            <Heading size="md" color="purple.400">Active BOFA Pools</Heading>
            <Link
              href={`https://dexscreener.com/avalanche/${DEXSCREENER_PAIR}`}
              isExternal
              _hover={{ textDecoration: 'none' }}
              position="relative"
              zIndex={2}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <HStack
                p={4}
                borderRadius="lg"
                borderWidth={1}
                borderColor="purple.500"
                _hover={{
                  bg: 'whiteAlpha.100',
                  transform: 'scale(1.01)',
                  boxShadow: '0 0 10px purple'
                }}
                transition="all 0.2s"
                position="relative"
                zIndex={2}
              >
                <VStack align="start" flex={1}>
                  <Text fontWeight="bold">BOFA/AVAX</Text>
                  <Text fontSize="sm" color="gray.400">Click to view on Dexscreener</Text>
                </VStack>
                <Icon as={FaExternalLinkAlt} />
              </HStack>
            </Link>
          </VStack>
        </Box>
      </Container>

      {/* Investment Modal */}
      <Modal 
        isOpen={isInvestmentOpen} 
        onClose={() => setIsInvestmentOpen(false)}
        isCentered
        size="xl"
        zIndex={1500}
      >
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent 
          bg="gray.900"
          borderWidth={2}
          borderColor="purple.500"
          boxShadow="0 0 20px purple"
        >
          <ModalCloseButton 
            color="whiteAlpha.900"
            _hover={{ color: 'purple.400' }}
          />
          <ModalBody p={6}>
            <VStack spacing={6} align="stretch">
              <Heading size="md" color="purple.400">BOFA Investment Pools</Heading>
              
              {/* Total TVL Box */}
              <Box
                p={4}
                borderRadius="lg"
                borderWidth={2}
                borderColor="purple.500"
                bg="whiteAlpha.50"
                boxShadow="0 0 10px purple"
              >
                <Stat>
                  <StatLabel fontSize="sm" color="purple.400">Total Liquidity Across All Pools</StatLabel>
                  <StatNumber fontSize="2xl" color="white">
                    ${liquidityPools.reduce((total, pool) => total + (pool.liquidity || 0), 0).toLocaleString()}
                  </StatNumber>
                  <Text fontSize="sm" color="gray.400">
                    (Excluding staked BOFA)
                  </Text>
                </Stat>
              </Box>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {liquidityPools.map((pool, index) => (
                  <Box
                    key={index}
                    p={4}
                    borderRadius="lg"
                    borderWidth={1}
                    borderColor="purple.500"
                    bg="whiteAlpha.50"
                    opacity={pool.type === 'main' ? 1 : 0.8}
                    _hover={{
                      transform: 'scale(1.01)',
                      boxShadow: '0 0 10px purple',
                      opacity: 1
                    }}
                    transition="all 0.2s"
                  >
                    <Link
                      href={`https://dexscreener.com/avalanche/${pool.pair}`}
                      isExternal
                      _hover={{ textDecoration: 'none' }}
                    >
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" w="full">
                          <Text fontWeight="bold" color="white">{pool.name}</Text>
                          <Icon as={FaExternalLinkAlt} color="white" />
                        </HStack>
                        <Text fontSize="sm" color="white">Liquidity: <Text as="span" color="green.400">${formatNumber(pool.liquidity)}</Text></Text>
                        <Text fontSize="sm" color="white">Price: <Text as="span" color="green.400">${formatNumber(pool.price, 4)}</Text></Text>
                        <Text fontSize="sm" color="green.400">24h Volume: ${formatNumber(pool.volume24h)}</Text>
                        <Badge colorScheme="purple">{pool.dex}</Badge>
                      </VStack>
                    </Link>
                  </Box>
                ))}
              </SimpleGrid>

              <Text fontSize="sm" color="gray.400" textAlign="center" mt={4}>
                Data updates every minute. Click on any pool to view more details.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Swap Modal */}
      <Modal 
        isOpen={isSwapOpen} 
        onClose={() => setIsSwapOpen(false)}
        isCentered
        size="sm"
        zIndex={1400}
      >
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent 
          bg="transparent" 
          boxShadow="none"
          maxW="375px"
        >
          <ModalCloseButton 
            color="whiteAlpha.900"
            _hover={{ color: 'purple.400' }}
            zIndex={2}
          />
          <ModalBody p={0}>
            <iframe
              src="https://swap.dodoex.io/BofaSwap?full-screen=true"
              width="375px"
              height="494px"
              frameBorder="0"
              style={{
                borderRadius: '16px',
                boxShadow: '0 0 20px purple',
                backgroundColor: 'rgba(0, 0, 0, 0.8)'
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <PerpLendingModal 
        isOpen={isPerpLendingOpen} 
        onClose={() => setIsPerpLendingOpen(false)}
        zIndex={1400}
      />

      <Fade in={loading}>
        <VStack
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.8)"
          zIndex={9999}
          justify="center"
          spacing={4}
          pointerEvents={loading ? "auto" : "none"}
        >
          <SimpleGrid
            columns={2}
            spacing={4}
            width="100px"
            height="100px"
          >
            {[...Array(4)].map((_, i) => (
              <Box
                key={i}
                bg="purple.500"
                borderRadius="lg"
                boxShadow="0 0 20px purple"
                sx={{
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </SimpleGrid>
          <Text color="white" fontSize="lg">Loading...</Text>
        </VStack>
      </Fade>

      <Box as="style" dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
          }
        `
      }} />
    </Box>
  )
}

export default App 