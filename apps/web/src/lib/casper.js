/**
 * Casper Blockchain Integration for CareCircle
 * 
 * Supports two modes:
 * 1. LIVE MODE: Real wallet connection via Casper Wallet extension + casper-js-sdk
 * 2. DEMO MODE: Simulated transactions for testing UI without real blockchain
 * 
 * To switch to LIVE MODE:
 * 1. Deploy the smart contract (./scripts/deploy-contract.sh)
 * 2. Set VITE_CONTRACT_HASH in apps/web/.env
 * 3. Install Casper Wallet browser extension
 */

// SDK imports - may fail if SDK not properly installed
let CasperClient = null;
let CLPublicKey = null;
let CLValueBuilder = null;
let DeployUtil = null;
let RuntimeArgs = null;
let casperClient = null;

// Try to import casper-js-sdk (optional - demo mode works without it)
try {
  const sdk = await import("casper-js-sdk");
  CasperClient = sdk.CasperClient;
  CLPublicKey = sdk.CLPublicKey;
  CLValueBuilder = sdk.CLValueBuilder;
  DeployUtil = sdk.DeployUtil;
  RuntimeArgs = sdk.RuntimeArgs;
} catch (err) {
  console.warn("casper-js-sdk not available, running in demo mode only");
}

// Contract configuration - UPDATE after deploying to testnet
const CONTRACT_CONFIG = {
  // Replace with your deployed contract hash after deployment
  contractHash: import.meta.env.VITE_CONTRACT_HASH || "",
  // Casper Testnet RPC
  nodeUrl: import.meta.env.VITE_CASPER_NODE_URL || "https://rpc.testnet.casperlabs.io/rpc",
  // Network name
  networkName: import.meta.env.VITE_CASPER_NETWORK || "casper-test",
  // Explorer base URL
  explorerUrl: "https://testnet.cspr.live"
};

// Initialize Casper client if SDK is available
if (CasperClient) {
  try {
    casperClient = new CasperClient(CONTRACT_CONFIG.nodeUrl);
  } catch (err) {
    console.warn("Failed to initialize CasperClient:", err);
  }
}

// Store connected wallet state
let connectedPublicKey = null;
let connectedPublicKeyObj = null;

/**
 * Check if Casper Wallet extension is installed
 */
function hasCasperWallet() {
  return typeof window.CasperWalletProvider !== 'undefined' ||
    typeof window.casperlabsHelper !== 'undefined';
}

/**
 * Get Casper Wallet provider
 */
function getCasperWallet() {
  if (window.CasperWalletProvider) {
    return window.CasperWalletProvider();
  }
  if (window.casperlabsHelper) {
    return window.casperlabsHelper;
  }
  return null;
}

/**
 * Connect wallet using Casper Wallet extension
 * @returns {Promise<string>} Connected wallet public key (hex)
 */
export async function connectWallet() {
  // Try Casper Wallet extension first
  if (hasCasperWallet()) {
    try {
      const wallet = getCasperWallet();

      // Request connection
      const connected = await wallet.requestConnection();
      if (!connected) throw new Error("Connection rejected by user");

      // Get active public key
      const publicKeyHex = await wallet.getActivePublicKey();
      if (!publicKeyHex) throw new Error("No account selected");

      connectedPublicKey = publicKeyHex;
      if (CLPublicKey) {
        connectedPublicKeyObj = CLPublicKey.fromHex(publicKeyHex);
      }

      console.log("✅ Connected to Casper Wallet:", formatAddress(publicKeyHex));
      return publicKeyHex;
    } catch (err) {
      console.error("Casper Wallet connection failed:", err);
      throw new Error("Failed to connect wallet: " + (err.message || String(err)));
    }
  }

  // Fallback: Automatic demo mode (no prompt)
  console.warn("⚠️ Casper Wallet not detected. Using Demo Mode.");
  console.log("ℹ️ To use live blockchain: Install Casper Wallet extension and refresh");

  // Try to get from localStorage first, then use default
  const savedWallet = localStorage.getItem("carecircle_wallet");
  const defaultWallet = import.meta.env.VITE_DEFAULT_WALLET ||
    "0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d";

  const addr = savedWallet || defaultWallet;

  connectedPublicKey = addr.trim();
  if (CLPublicKey) {
    try {
      connectedPublicKeyObj = CLPublicKey.fromHex(connectedPublicKey);
    } catch {
      connectedPublicKeyObj = null;
    }
  }

  console.log("✅ Demo Mode: Using wallet", formatAddress(connectedPublicKey));

  return connectedPublicKey;
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet() {
  if (hasCasperWallet()) {
    try {
      const wallet = getCasperWallet();
      await wallet.disconnectFromSite();
    } catch (err) {
      console.warn("Disconnect failed:", err);
    }
  }
  connectedPublicKey = null;
  connectedPublicKeyObj = null;
}

/**
 * Get currently connected wallet address
 */
export function getConnectedWallet() {
  return connectedPublicKey;
}

/**
 * Create a circle on-chain
 * @param {Object} params - { name: string }
 * @returns {Promise<{id: number, txHash: string}>}
 */
export async function createCircleOnChain({ name }) {
  if (!connectedPublicKey) throw new Error("Wallet not connected");

  // Check if we're in LIVE MODE (contract deployed)
  if (CONTRACT_CONFIG.contractHash && hasCasperWallet() && connectedPublicKeyObj) {
    try {
      console.log(`🔗 Creating circle "${name}" on Casper blockchain...`);

      // Build the deploy for create_circle entry point
      const deploy = await buildContractDeploy({
        entryPoint: "create_circle",
        args: {
          name: CLValueBuilder.string(name)
        },
        paymentAmount: "3000000000" // 3 CSPR
      });

      // Sign and submit
      const deployHash = await signAndSubmitDeploy(deploy);
      console.log(`📤 Deploy submitted: ${deployHash}`);

      // Wait for execution and get result
      const executionResult = await waitForDeploy(deployHash);

      // Extract circle ID from execution result (parse from events in production)
      const circleId = extractCircleIdFromResult(executionResult) || Date.now() % 1000000;

      console.log(`✅ Circle created with ID: ${circleId}`);

      return {
        id: circleId,
        txHash: deployHash
      };
    } catch (err) {
      console.error("Create circle failed:", err);
      throw new Error("Failed to create circle: " + (err.message || String(err)));
    }
  }

  // Fallback: Demo mode with simulated IDs
  const demoId = Math.floor(Date.now() / 1000) % 100000;
  const demoTxHash = generateDemoTxHash();

  console.log(`[Demo Mode] Created circle "${name}" with ID: ${demoId}`);
  console.log(`ℹ️ To use live blockchain, deploy contract and set VITE_CONTRACT_HASH`);

  return {
    id: demoId,
    txHash: demoTxHash
  };
}

/**
 * Add a member to a circle
 * @param {Object} params - { circleId: number, memberAddress: string }
 * @returns {Promise<{txHash: string}>}
 */
export async function addMemberOnChain({ circleId, memberAddress }) {
  if (!connectedPublicKey) throw new Error("Wallet not connected");

  if (CONTRACT_CONFIG.contractHash && hasCasperWallet() && connectedPublicKeyObj) {
    try {
      console.log(`🔗 Adding member to circle ${circleId}...`);

      const deploy = await buildContractDeploy({
        entryPoint: "add_member",
        args: {
          circle_id: CLValueBuilder.u64(circleId),
          member: CLValueBuilder.key(CLPublicKey.fromHex(memberAddress))
        },
        paymentAmount: "2000000000" // 2 CSPR
      });

      const deployHash = await signAndSubmitDeploy(deploy);
      await waitForDeploy(deployHash);

      console.log(`✅ Member added: ${formatAddress(memberAddress)}`);
      return { txHash: deployHash };
    } catch (err) {
      console.error("Add member failed:", err);
      throw new Error("Failed to add member: " + (err.message || String(err)));
    }
  }

  // Fallback: Demo mode
  const demoTxHash = generateDemoTxHash();
  console.log(`[Demo Mode] Added member ${formatAddress(memberAddress)} to circle ${circleId}`);

  return { txHash: demoTxHash };
}

/**
 * Create a task on-chain
 * @param {Object} params - { circleId: number, title: string, assignedTo: string }
 * @returns {Promise<{id: number, txHash: string}>}
 */
export async function createTaskOnChain({ circleId, title, assignedTo }) {
  if (!connectedPublicKey) throw new Error("Wallet not connected");

  if (CONTRACT_CONFIG.contractHash && hasCasperWallet() && connectedPublicKeyObj) {
    try {
      console.log(`🔗 Creating task "${title}" on blockchain...`);

      const deploy = await buildContractDeploy({
        entryPoint: "create_task",
        args: {
          circle_id: CLValueBuilder.u64(circleId),
          title: CLValueBuilder.string(title),
          assigned_to: CLValueBuilder.key(CLPublicKey.fromHex(assignedTo))
        },
        paymentAmount: "3000000000" // 3 CSPR
      });

      const deployHash = await signAndSubmitDeploy(deploy);
      const executionResult = await waitForDeploy(deployHash);

      const taskId = extractTaskIdFromResult(executionResult) || Date.now() % 1000000;

      console.log(`✅ Task created with ID: ${taskId}`);
      return {
        id: taskId,
        txHash: deployHash
      };
    } catch (err) {
      console.error("Create task failed:", err);
      throw new Error("Failed to create task: " + (err.message || String(err)));
    }
  }

  // Fallback: Demo mode
  const demoId = Math.floor(Date.now() / 1000) % 100000;
  const demoTxHash = generateDemoTxHash();

  console.log(`[Demo Mode] Created task "${title}" with ID: ${demoId}`);

  return {
    id: demoId,
    txHash: demoTxHash
  };
}

/**
 * Complete a task on-chain (signed by assignee)
 * @param {Object} params - { taskId: number }
 * @returns {Promise<{txHash: string, timestamp: number}>}
 */
export async function completeTaskOnChain({ taskId }) {
  if (!connectedPublicKey) throw new Error("Wallet not connected");

  if (CONTRACT_CONFIG.contractHash && hasCasperWallet() && connectedPublicKeyObj) {
    try {
      console.log(`🔗 Completing task ${taskId} on blockchain...`);

      const deploy = await buildContractDeploy({
        entryPoint: "complete_task",
        args: {
          task_id: CLValueBuilder.u64(taskId)
        },
        paymentAmount: "2500000000" // 2.5 CSPR
      });

      const deployHash = await signAndSubmitDeploy(deploy);
      await waitForDeploy(deployHash);

      console.log(`✅ Task ${taskId} completed on-chain!`);
      return {
        txHash: deployHash,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error("Complete task failed:", err);
      throw new Error("Failed to complete task: " + (err.message || String(err)));
    }
  }

  // Fallback: Demo mode
  const demoTxHash = generateDemoTxHash();
  console.log(`[Demo Mode] Completed task ${taskId}`);

  return {
    txHash: demoTxHash,
    timestamp: Date.now()
  };
}

/**
 * Get circle info from chain (read-only)
 */
export async function getCircleFromChain(circleId) {
  if (!CONTRACT_CONFIG.contractHash) return null;

  try {
    // Query contract state via RPC
    const response = await fetch(CONTRACT_CONFIG.nodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "state_get_dictionary_item",
        params: {
          state_root_hash: "latest",
          dictionary_identifier: {
            ContractNamedKey: {
              key: CONTRACT_CONFIG.contractHash,
              dictionary_name: "circles",
              dictionary_item_key: circleId.toString()
            }
          }
        }
      })
    });

    const data = await response.json();
    return data.result?.stored_value?.CLValue || null;
  } catch (err) {
    console.error("Failed to get circle from chain:", err);
    return null;
  }
}

/**
 * Get task info from chain (read-only)
 */
export async function getTaskFromChain(taskId) {
  if (!CONTRACT_CONFIG.contractHash) return null;

  try {
    const response = await fetch(CONTRACT_CONFIG.nodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "state_get_dictionary_item",
        params: {
          state_root_hash: "latest",
          dictionary_identifier: {
            ContractNamedKey: {
              key: CONTRACT_CONFIG.contractHash,
              dictionary_name: "tasks",
              dictionary_item_key: taskId.toString()
            }
          }
        }
      })
    });

    const data = await response.json();
    return data.result?.stored_value?.CLValue || null;
  } catch (err) {
    console.error("Failed to get task from chain:", err);
    return null;
  }
}

// ==================== Helper Functions ====================

/**
 * Build a contract deploy using casper-js-sdk
 */
async function buildContractDeploy({ entryPoint, args, paymentAmount }) {
  if (!connectedPublicKeyObj) {
    throw new Error("Wallet not connected or invalid public key");
  }

  // Build RuntimeArgs from the args object
  const runtimeArgs = RuntimeArgs.fromMap(args);

  // Create the deploy
  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      connectedPublicKeyObj,
      CONTRACT_CONFIG.networkName,
      1, // gas price
      1800000 // TTL: 30 minutes
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(CONTRACT_CONFIG.contractHash.replace("hash-", ""), "hex")),
      entryPoint,
      runtimeArgs
    ),
    DeployUtil.standardPayment(paymentAmount)
  );

  return deploy;
}

/**
 * Sign deploy using Casper Wallet and submit to network
 */
async function signAndSubmitDeploy(deploy) {
  if (!hasCasperWallet()) {
    throw new Error("Casper Wallet not available");
  }

  const wallet = getCasperWallet();

  // Convert deploy to JSON for signing
  const deployJson = DeployUtil.deployToJson(deploy);

  // Request signature from wallet
  const signedDeployJson = await wallet.sign(
    JSON.stringify(deployJson),
    connectedPublicKey
  );

  if (signedDeployJson.cancelled) {
    throw new Error("User cancelled signing");
  }

  // Parse signed deploy
  const signedDeploy = DeployUtil.deployFromJson(JSON.parse(signedDeployJson.deploy)).unwrap();

  // Submit to network
  const result = await casperClient.putDeploy(signedDeploy);

  return result; // Returns deploy hash
}

/**
 * Wait for deploy execution
 */
async function waitForDeploy(deployHash, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(CONTRACT_CONFIG.nodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "info_get_deploy",
          params: { deploy_hash: deployHash }
        })
      });

      const data = await response.json();

      if (data.result?.execution_results?.length > 0) {
        return data.result.execution_results[0];
      }
    } catch (err) {
      console.warn(`Waiting for deploy... attempt ${i + 1}`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error("Deploy execution timeout");
}

/**
 * Extract circle ID from execution result
 */
function extractCircleIdFromResult(result) {
  // In production, parse CLValue from result
  // For now, generate sequential ID based on timestamp
  return null;
}

/**
 * Extract task ID from execution result
 */
function extractTaskIdFromResult(result) {
  // In production, parse CLValue from result
  return null;
}

/**
 * Generate a demo transaction hash (for UI testing without real chain)
 */
function generateDemoTxHash() {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(txHash) {
  return `${CONTRACT_CONFIG.explorerUrl}/deploy/${txHash}`;
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(addr, startLen = 8, endLen = 6) {
  if (!addr || addr.length < startLen + endLen + 3) return addr;
  return `${addr.slice(0, startLen)}...${addr.slice(-endLen)}`;
}

/**
 * Check if we're in demo mode (no real contract deployed)
 */
export function isDemoMode() {
  return !CONTRACT_CONFIG.contractHash;
}

/**
 * Get contract configuration
 */
export function getContractConfig() {
  return { ...CONTRACT_CONFIG };
}
