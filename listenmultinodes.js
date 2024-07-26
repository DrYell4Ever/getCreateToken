
import { ethers } from "ethers";
import fs from "fs";

// 配置 BSC 节点 URL
const bscNodes = [
  "https://bsc-dataseed3.binance.org/",
  "https://binance.llamarpc.com",
  "https://bscrpc.com",
  "https://bsc.meowrpc.com",
  "https://bsc.drpc.org"
];

// ERC-20 代币标准接口
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)'
];

// 文件路径
const filePath = './erc20_tokens.txt';

// 获取北京时间
function getBeijingTime() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

// 选择一个有效的节点
let currentProviderIndex = 0;

function getProvider() {
  const bsc_url = bscNodes[currentProviderIndex];
  return new ethers.providers.JsonRpcProvider(bsc_url);
}

async function switchProviderOnFailure() {
  currentProviderIndex = (currentProviderIndex + 1) % bscNodes.length;
  console.log(`切换到节点: ${bscNodes[currentProviderIndex]}`);
  return getProvider();
}

// 监听新区块
async function listenToBlocks() {
  let provider = getProvider();

  provider.on('block', async (blockNumber) => {
    try {
      console.log(`New block: ${blockNumber}`);

      // 获取区块详细信息
      const block = await provider.getBlockWithTransactions(blockNumber);

      // 遍历所有交易
      for (const tx of block.transactions) {
        // 如果交易创建了一个新合约
        if (tx.creates) {
          const contractAddress = tx.creates;

          // 检查是否为 ERC-20 代币合约
          const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
          try {
            // 获取代币名称
            const name = await contract.name();
            // 获取代币符号
            const symbol = await contract.symbol();
            // 获取代币总供应量
            const totalSupply = await contract.totalSupply();

            // 如果没有抛出异常，并且返回合理的结果，则认为是 ERC-20 合约并输出代币名称和符号
            if (name && symbol && totalSupply) {
              // 获取北京时间
              const beijingTime = getBeijingTime();
              const tokenInfo = `创建时间: ${beijingTime}, 合约地址: ${contractAddress}, 代币名称: ${name}, 代币符号: ${symbol}\n`;
              console.log(tokenInfo);

              // 将信息写入文件
              fs.appendFile(filePath, tokenInfo, (err) => {
                if (err) {
                  console.error('Error writing to file', err);
                } else {
                  console.log('Token info saved to file');
                }
              });
            }
          } catch (error) {
            // 如果不是 ERC-20 合约，则不输出
          }
        }
      }
    } catch (error) {
      console.error('Error handling block:', error);
      provider = await switchProviderOnFailure();
    }
  });

  console.log('监听新区块...');
}

listenToBlocks();

unlock