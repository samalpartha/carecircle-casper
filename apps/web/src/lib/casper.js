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

export const CASPER_WALLET_NOT_DETECTED = "CASPER_WALLET_NOT_DETECTED";

/**
 * Get a suggested demo wallet public key (from localStorage or env default)
 */
export function getDemoWalletSuggestion() {
  const savedWallet = localStorage.getItem("carecircle_wallet");
  const defaultWallet =
    import.meta.env.VITE_DEFAULT_WALLET ||
    "0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d";

  return {
    savedWallet,
    defaultWallet,
    suggestedPublicKey: (savedWallet || defaultWallet || "").trim(),
  };
}

/**
 * Set wallet state from a manually provided public key (demo/dev mode)
 */
export function connectWithPublicKey(publicKeyHex) {
  const addr = (publicKeyHex || "").trim();
  if (!addr || addr.length < 64) {
    throw new Error("Invalid Casper public key");
  }

  connectedPublicKey = addr;
  if (CLPublicKey) {
    try {
      connectedPublicKeyObj = CLPublicKey.fromHex(connectedPublicKey);
    } catch {
      connectedPublicKeyObj = null;
    }
  }

  // Mark as manual key entry (demo mode)
  isWalletExtensionConnected = false;

  return connectedPublicKey;
}

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
export async function connectWallet(opts = {}) {
  const { manualPublicKey } = opts || {};
  if (manualPublicKey) {
    return connectWithPublicKey(manualPublicKey);
  }

  // Try Casper Wallet extension first
  if (hasCasperWallet()) {
    try {
      const wallet = getCasperWallet();

      // Request connection with timeout
      const connectionPromise = wallet.requestConnection();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 30000)
      );

      const connected = await Promise.race([connectionPromise, timeoutPromise]);
      if (!connected) throw new Error("Connection rejected by user");

      // Get active public key
      const publicKeyHex = await wallet.getActivePublicKey();
      if (!publicKeyHex) throw new Error("No account selected");

      connectedPublicKey = publicKeyHex;
      if (CLPublicKey) {
        connectedPublicKeyObj = CLPublicKey.fromHex(publicKeyHex);
      }

      // Mark as extension-connected (real wallet)
      isWalletExtensionConnected = true;

      console.log("✅ Connected to Casper Wallet:", formatAddress(publicKeyHex));
      return publicKeyHex;
    } catch (err) {
      console.error("Casper Wallet connection failed:", err);
      throw new Error("Failed to connect wallet: " + (err.message || String(err)));
    }
  }

  // Fallback: Manual entry for development/demo
  console.warn("Casper Wallet not found. Using manual entry mode.");

  const { suggestedPublicKey, defaultWallet } = getDemoWalletSuggestion();
  const err = new Error(
    "Casper Wallet not detected. Install the extension or enter a public key to use demo mode."
  );
  err.code = CASPER_WALLET_NOT_DETECTED;
  err.suggestedPublicKey = suggestedPublicKey;
  err.defaultWallet = defaultWallet;
  throw err;
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
  isWalletExtensionConnected = false;
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
  // Check if wallet is connected (either via extension or manual key)
  if (!connectedPublicKey) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }
  
  console.log(`🔗 Completing task ${taskId} on blockchain...`);
  console.log(`   Connected wallet: ${formatAddress(connectedPublicKey)}`);
  console.log(`   Contract hash: ${CONTRACT_CONFIG.contractHash || "Not set (demo mode)"}`);
  console.log(`   Has wallet extension: ${hasCasperWallet()}`);
  console.log(`   Connected public key obj: ${connectedPublicKeyObj ? "Yes" : "No"}`);
  
  if (CONTRACT_CONFIG.contractHash && hasCasperWallet() && connectedPublicKeyObj) {
    try {
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
  
  // Fallback: Demo mode (when contract not deployed or wallet extension not available)
  if (!CONTRACT_CONFIG.contractHash) {
    console.log(`[Demo Mode] Contract not deployed - simulating task completion`);
  } else if (!hasCasperWallet()) {
    console.log(`[Demo Mode] Wallet extension not available - simulating task completion`);
  } else if (!connectedPublicKeyObj) {
    console.log(`[Demo Mode] Public key object not available - simulating task completion`);
  }
  
  const demoTxHash = generateDemoTxHash();
  console.log(`[Demo Mode] Completed task ${taskId} - Deploy hash: ${demoTxHash}`);
  
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
 * Transfer CSPR tokens from sender to recipient
 * @param {Object} params - { recipientAddress: string, amountMotes: string }
 * @returns {Promise<{txHash: string}>}
 */
export async function transferCSPR({ recipientAddress, amountMotes, openWalletUI = true }) {
  if (!connectedPublicKey) {
    throw new Error("Wallet not connected. Please ensure your wallet is connected before transferring.");
  }
  
  // Calculate amount in CSPR for display
  // Handle both string, number, and BigInt inputs safely
  let amountCSPR;
  try {
    // Always convert to string first to handle BigInt safely
    let amountStr;
    if (typeof amountMotes === 'bigint') {
      amountStr = amountMotes.toString();
    } else {
      amountStr = String(amountMotes);
    }
    
    // Remove any non-numeric characters (keep only digits - no decimal point for BigInt)
    const cleanAmount = amountStr.replace(/[^0-9]/g, '');
    
    if (!cleanAmount || cleanAmount === '0') {
      throw new Error("Invalid payment amount: must be greater than 0");
    }
    
    // Use BigInt for calculation to avoid precision issues and BigInt conversion errors
    // NEVER use parseFloat or Number() on values that might be BigInt
    const amountBigInt = BigInt(cleanAmount);
    const csprBigInt = amountBigInt / BigInt(1_000_000_000);
    const remainder = amountBigInt % BigInt(1_000_000_000);
    const remainderStr = remainder.toString().padStart(9, '0');
    amountCSPR = `${csprBigInt.toString()}.${remainderStr.slice(0, 2)}`;
  } catch (err) {
    // Fallback: try to convert to string and use BigInt
    try {
      const amountStr = typeof amountMotes === 'bigint' ? amountMotes.toString() : String(amountMotes);
      const cleanAmount = amountStr.replace(/[^0-9]/g, '');
      if (cleanAmount && cleanAmount !== '0') {
        const amountBigInt = BigInt(cleanAmount);
        const csprBigInt = amountBigInt / BigInt(1_000_000_000);
        const remainder = amountBigInt % BigInt(1_000_000_000);
        amountCSPR = `${csprBigInt.toString()}.${remainder.toString().padStart(9, '0').slice(0, 2)}`;
      } else {
        amountCSPR = "0.00";
      }
    } catch (fallbackErr) {
      console.error("Error calculating CSPR amount:", fallbackErr);
      amountCSPR = "0.00";
    }
  }
  
  console.log(`💰 Preparing transfer: ${amountCSPR} CSPR`);
  console.log(`   Sender: ${connectedPublicKey}`);
  console.log(`   Recipient: ${recipientAddress}`);
  console.log(`   Has wallet extension: ${hasCasperWallet()}`);
  console.log(`   Connected public key obj: ${connectedPublicKeyObj ? "Yes" : "No"}`);
  
  // Open Casper Wallet transfer interface if requested (only once)
  if (openWalletUI && hasCasperWallet()) {
    try {
      // Open transfer page in new tab with details
      // Use 'noopener,noreferrer' for security and to prevent multiple opens
      const transferUrl = `https://testnet.cspr.live/transfer`;
      const transferWindow = window.open(transferUrl, '_blank', 'noopener,noreferrer');
      if (transferWindow) {
        console.log(`📂 Opened transfer page: ${transferUrl}`);
      } else {
        console.warn("Could not open transfer page (popup may be blocked)");
      }
    } catch (err) {
      console.warn("Could not open transfer page:", err);
    }
  }
  
  // Native CSPR transfers don't require a contract hash, only wallet connection
  if (hasCasperWallet() && connectedPublicKeyObj) {
    try {
      // Ensure amount is converted to BigInt properly
      // CRITICAL: Always convert to string first to avoid BigInt-to-number conversion errors
      // NEVER use Number(), parseInt(), parseFloat(), or Math operations on BigInt values
      let transferAmount;
      let transferAmountStr;
      
      // Step 1: Convert to string (handles BigInt, number, string, etc.)
      // CRITICAL: Never use Math operations, Number(), parseInt(), or parseFloat() on values that might be BigInt
      // Always convert to string first, then clean and convert to BigInt
      // IMPORTANT: Check for BigInt FIRST before checking for number, to avoid any implicit conversions
      let amountStr;
      
      // Check if it's a BigInt first (this is critical to avoid conversion errors)
      if (typeof amountMotes === 'bigint') {
        // BigInt: convert directly to string (NEVER use Number() or Math operations)
        amountStr = amountMotes.toString();
      } else if (typeof amountMotes === 'string') {
        // String: use directly (might already be a string representation of a number)
        amountStr = amountMotes;
      } else if (typeof amountMotes === 'number') {
        // Number: convert to string safely
        // For numbers, we can safely use String() conversion
        // Avoid toLocaleString as it might have issues with very large numbers
        amountStr = String(amountMotes);
      } else {
        // Other types: convert to string (shouldn't happen, but handle gracefully)
        amountStr = String(amountMotes);
      }
      
      // Step 2: Clean the string (remove non-numeric characters)
      const cleanAmount = amountStr.replace(/[^0-9]/g, '');
      if (!cleanAmount || cleanAmount === '0') {
        throw new Error("Invalid payment amount: must be greater than 0");
      }
      
      // Step 3: Convert to BigInt (this is safe now since we have a clean string)
      try {
        transferAmount = BigInt(cleanAmount);
        transferAmountStr = cleanAmount;
      } catch (bigIntErr) {
        console.error("Failed to convert to BigInt:", bigIntErr);
        throw new Error(`Invalid payment amount format: ${amountMotes}. Error: ${bigIntErr.message}`);
      }
      
      console.log(`💰 Transferring ${amountCSPR} CSPR to ${formatAddress(recipientAddress)}...`);
      console.log(`   Amount in motes: ${transferAmountStr}`);
      console.log(`   Transfer amount type: ${typeof transferAmount}`);
      console.log(`   Sender: ${connectedPublicKey}`);
      console.log(`   Recipient: ${recipientAddress}`);
      
      // Ensure transferAmount is definitely a BigInt (not a number) to avoid conversion errors
      // The SDK expects BigInt for large values, and JavaScript doesn't allow BigInt-to-number conversion
      const finalTransferAmount = typeof transferAmount === 'bigint' 
        ? transferAmount 
        : BigInt(String(transferAmount).replace(/[^0-9]/g, ''));
      
      console.log(`   Final transfer amount (BigInt): ${finalTransferAmount.toString()}`);
      console.log(`   Final transfer amount type: ${typeof finalTransferAmount}`);
      
      // Create a transfer deploy
      const recipientPublicKey = CLPublicKey.fromHex(recipientAddress);
      
      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          connectedPublicKeyObj,
          CONTRACT_CONFIG.networkName,
          1, // gas price
          1800000 // TTL: 30 minutes
        ),
        DeployUtil.ExecutableDeployItem.newTransfer(
          finalTransferAmount,
          recipientPublicKey,
          null, // transfer ID (optional)
          Uint8Array.from([]) // extra data (optional)
        ),
        DeployUtil.standardPayment("1000000000") // 1 CSPR for gas
      );
      
      console.log(`📤 Opening Casper Wallet to sign transfer...`);
      console.log(`   The Casper Wallet extension should now open for you to sign the transfer.`);
      console.log(`   Please check your browser for the wallet popup.`);
      
      const deployHash = await signAndSubmitDeploy(deploy);
      console.log(`📤 Deploy submitted: ${deployHash}`);
      console.log(`✅ Transfer signed and submitted!`);
      
      console.log(`⏳ Waiting for deploy execution...`);
      await waitForDeploy(deployHash);

      console.log(`✅ Transfer completed: ${deployHash}`);
      return { txHash: deployHash };
    } catch (err) {
      console.error("Transfer failed:", err);
      throw new Error("Failed to transfer CSPR: " + (err.message || String(err)));
    }
  }
  
  // Fallback: Demo mode (when wallet extension not available)
  const demoTxHash = generateDemoTxHash();
  console.log(`[Demo Mode] Transfer ${amountCSPR} CSPR to ${formatAddress(recipientAddress)}`);
  console.warn("⚠️ Demo mode: No actual transfer occurred. Connect Casper Wallet for real transfers.");
  
  return { txHash: demoTxHash };
}

/**
 * Open Casper Wallet transfer interface with pre-filled details
 */
export function openCasperTransferUI({ senderAddress, recipientAddress, amountCSPR }) {
  const transferUrl = `https://testnet.cspr.live/transfer`;
  const transferWindow = window.open(transferUrl, '_blank');
  
  // Show transfer details in console and potentially in a modal
  console.log(`💸 Opening Casper Transfer Interface`);
  console.log(`   Sender: ${senderAddress}`);
  console.log(`   Recipient: ${recipientAddress}`);
  console.log(`   Amount: ${amountCSPR} CSPR`);
  console.log(`   Transfer URL: ${transferUrl}`);
  
  // Note: The transfer page won't auto-fill, but we can show the details
  return transferWindow;
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

// Track if wallet was connected via extension (real) or manual key (demo)
let isWalletExtensionConnected = false;

/**
 * Check if we're in demo mode (no real contract deployed OR using manual key entry)
 * This is a synchronous check for UI purposes
 * Note: This should be used with isAccountLive state from React component for accurate status
 * The isAccountLive state from the API response is the source of truth for UI display
 * @returns {boolean} True if in demo mode
 */
export function isDemoMode() {
  // If contract hash is not set, we're in demo mode for on-chain operations
  // But UI should use isAccountLive state to determine if account is live
  if (!CONTRACT_CONFIG.contractHash) return true;

  // If wallet was connected via manual key entry (not extension), we're in demo mode
  // But if account is live (checked via API), it's not demo mode
  // Note: isAccountLive state in React component should override this for UI display
  if (!isWalletExtensionConnected) return true;

  return false;
}

/**
 * Check if account is live and update connection status accordingly
 * @param {string} publicKeyHex - Public key to check
 * @returns {Promise<boolean>} True if account is live
 */
export async function checkAndUpdateAccountStatus(publicKeyHex) {
  if (!publicKeyHex || isWalletExtensionConnected) return isWalletExtensionConnected;

  // Check if account exists on blockchain
  const isLive = await isAccountLive(publicKeyHex);
  if (isLive) {
    // Account is live, so update connection status
    isWalletExtensionConnected = true;
    console.log("Account verified as live on blockchain");
  }

  return isLive;
}

/**
 * Check if wallet is connected via extension (real wallet)
 */
export function isWalletExtensionMode() {
  return isWalletExtensionConnected && hasCasperWallet();
}

/**
 * Get contract configuration
 */
export function getContractConfig() {
  return { ...CONTRACT_CONFIG };
}

/**
 * Check if account is live (exists on blockchain) by querying via backend proxy
 * @param {string} publicKeyHex - Public key in hex format
 * @returns {Promise<boolean>} True if account exists on blockchain
 */
export async function isAccountLive(publicKeyHex) {
  if (!publicKeyHex) return false;

  try {
    // Use backend proxy to avoid CORS issues
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3005";
    const response = await fetch(`${apiUrl}/accounts/${publicKeyHex}/balance`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
      const data = await response.json();
      return data.isLive === true;
    } else if (response.status === 404) {
      return false;
    }
  } catch (err) {
    console.warn("Failed to check if account is live:", err);
  }

  return false;
}

/**
 * Get account balance from Casper blockchain
 * @param {string} publicKeyHex - Public key in hex format
 * @returns {Promise<string>} Balance in CSPR (as string to preserve precision)
 */
export async function getAccountBalance(publicKeyHex) {
  if (!publicKeyHex) return { balance: "0", isLive: false };

  // Always try to fetch via proxy first (works for both extension and manual key entries)
  // This allows the app to work without the extension installed
  try {
    // Method 1: Try backend proxy first (avoids CORS issues)
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3005";
    const proxyResponse = await fetch(`${apiUrl}/accounts/${publicKeyHex}/balance`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (data.balance !== undefined) {
        const isLive = data.isLive === true;
        // If account is live, update connection status (works even without extension)
        if (isLive) {
          isWalletExtensionConnected = true;
        }
        return { 
          balance: String(data.balance), 
          isLive: isLive,
          mainPurseUref: data.mainPurseUref || null
        };
      }
    } else if (proxyResponse.status === 404) {
      // Account not found - return 0 balance and not live
      console.log("❌ Account not found (404)");
      return { balance: "0", isLive: false };
    }
  } catch (err) {
    console.warn("Failed to fetch balance via proxy:", err);
  }

  // Fallback: Try other methods only if extension is available
  const hasExtension = hasCasperWallet();
  if (!hasExtension && !isWalletExtensionConnected) {
    // No extension and proxy failed - return demo mode
    return { balance: "0", isLive: false };
  }

  try {

    // Method 2: Use CasperClient if available
    if (casperClient && CLPublicKey) {
      try {
        const publicKey = CLPublicKey.fromHex(publicKeyHex);
        const balance = await casperClient.balanceOfByPublicKey(publicKey);
        // Convert from motes (1 CSPR = 1,000,000,000 motes) to CSPR
        const csprBalance = (Number(balance) / 1_000_000_000).toFixed(2);
        // If we got balance from CasperClient, account is live
        return { balance: csprBalance, isLive: true };
      } catch (err) {
        console.warn("Failed to fetch balance via CasperClient:", err);
      }
    }

    // Method 3: Fallback to RPC call to get account info and then balance
    try {
      // First, get account info to get the main purse URef
      const accountResponse = await fetch(CONTRACT_CONFIG.nodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "state_get_account_info",
          params: {
            state_root_hash: "latest",
            public_key: publicKeyHex
          }
        })
      });

      const accountData = await accountResponse.json();
      if (accountData.result?.account?.main_purse) {
        // Get balance from main purse
        const purseUref = accountData.result.account.main_purse;
        const balanceResponse = await fetch(CONTRACT_CONFIG.nodeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "state_get_balance",
            params: {
              state_root_hash: "latest",
              purse_uref: purseUref
            }
          })
        });

        const balanceData = await balanceResponse.json();
        if (balanceData.result?.balance_value) {
          const motes = balanceData.result.balance_value;
          const csprBalance = (Number(motes) / 1_000_000_000).toFixed(2);
          // If we got balance from RPC, account is live
          return { balance: csprBalance, isLive: true };
        }
      }
    } catch (err) {
      console.warn("Failed to fetch balance via RPC:", err);
    }

    // Return 0 if all methods fail
    return { balance: "0", isLive: false };
  } catch (err) {
    console.error("Error fetching balance:", err);
    return { balance: "0", isLive: false };
  }
}
