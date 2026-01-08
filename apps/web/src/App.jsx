import React, { useState, useEffect, useCallback } from "react";
import AnimatedLogo from "./components/AnimatedLogo.jsx";
import {
  connectWallet,
  connectWithPublicKey,
  CASPER_WALLET_NOT_DETECTED,
  disconnectWallet,
  createCircleOnChain,
  addMemberOnChain,
  createTaskOnChain,
  completeTaskOnChain,
  transferCSPR,
  getExplorerUrl,
  formatAddress,
  isDemoMode,
  getCircleFromChain,
  getAccountBalance,
  isAccountLive,
  checkAndUpdateAccountStatus
} from "./lib/casper.js";
import {
  API,
  upsertCircle,
  upsertTask,
  fetchTasks,
  fetchCircle,
  fetchMembers,
  upsertMember,
  fetchCircleStats,
  fetchCirclesByWalletKey,
  sendMemberInvitation,
  getInvitationByToken,
  acceptInvitation
} from "./lib/api.js";

// ==================== Toast Component ====================
function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-message">{toast.message}</div>}
          </div>
          <button className="btn-ghost btn-sm" onClick={() => removeToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ==================== Modal Component ====================
function Modal({ isOpen, onClose, title, children, wide, size }) {
  if (!isOpen) return null;

  const sizeClass = size ? `modal-${size}` : "";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""} ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const HELP_TABS = [
  { id: "get-started", label: "🚀 Get Started", icon: "🚀" },
  { id: "user-flows", label: "📖 User Flows", icon: "📖" },
  { id: "shortcuts", label: "⌨️ Shortcuts", icon: "⌨️" },
  { id: "faq", label: "❓ FAQ", icon: "❓" }
];

function HelpPanel({ activeTab, setActiveTab, maxHeight }) {
  return (
      <div className="help-modal-body">
        <div className="help-tabs">
        {HELP_TABS.map((tab) => (
            <button
              key={tab.id}
            className={`help-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="help-tab-icon">{tab.icon}</span>
            <span className="help-tab-label">{tab.label.replace(/^[^ ]+ /, "")}</span>
            </button>
          ))}
        </div>

      <div className="help-content" style={maxHeight ? { maxHeight } : undefined}>
        {activeTab === "get-started" && (
            <div className="help-section">
            <h3>Get Started</h3>
            <p>
              Use this page as a quick reference for the key concepts and the basic flow. For step-by-step walkthroughs,
              switch to <strong>User Flows</strong>.
            </p>

            <div className="hero-info-grid" style={{ marginTop: 16 }}>
              <div className="card hero-info-col">
                <div className="hero-info-title">Core Concepts</div>
                <div className="hero-info-text">
                  <ul className="get-started-list">
                    <li>
                      <strong>Care Circles</strong> are groups coordinating care activities
                    </li>
                    <li>
                      <strong>Members</strong> are caregivers who can be assigned requests
                    </li>
                    <li>
                      <strong>Task Requests</strong> are caregiving tasks with optional payment to assignee
                    </li>
                    <li>
                      <strong>Money Requests</strong> allow requesting payment from assignees (accept/reject)
                    </li>
                    <li>
                      <strong>Payments</strong> are processed automatically on Casper blockchain
                    </li>
                    <li>
                      <strong>Proofs</strong> are explorer-verifiable completion transactions
                    </li>
              </ul>
                </div>
              </div>

              <div className="card hero-info-col">
                <div className="hero-info-title">Quick Start</div>
                <div className="hero-info-text">
                  <ol className="get-started-list">
                    <li>Connect your wallet (or use demo mode)</li>
                    <li>Create a new circle or load an existing one</li>
                <li>Add members to your circle</li>
                    <li>Create task requests or money requests</li>
                    <li>Complete tasks or accept/reject money requests</li>
                    <li>Payments are processed automatically with on-chain verification</li>
              </ol>
                  <div className="help-callout" style={{ marginTop: 14 }}>
                    <strong>🎯 Demo tip</strong>
                    <p>
                      Use <strong>Setup CareCircle</strong> → <strong>Load Existing</strong> and enter ID <strong>1</strong>.
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

        {activeTab === "user-flows" && (
            <div className="help-section">
              <h3>Step-by-Step Guides</h3>

              <div className="help-flow">
                <h4>🆕 Creating a New Circle</h4>
                <ol>
                <li>
                  Click <strong>"Connect Wallet"</strong> in the top-right corner
                </li>
                  <li>Approve the connection in your Casper Wallet</li>
                <li>
                  Click <strong>"Create New Circle"</strong> on the homepage
                </li>
                  <li>Enter a name (e.g., "Mom's Care Team")</li>
                <li>
                  Click <strong>"Create Circle"</strong>
                </li>
                  <li>Wait for the on-chain transaction to complete</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>📂 Loading an Existing Circle</h4>
                <ol>
                <li>
                  Click <strong>"Load Existing Circle"</strong> on the homepage
                </li>
                  <li>Enter the Circle ID (get this from the circle owner)</li>
                <li>
                  Click <strong>"Load Circle"</strong>
                </li>
                  <li>View requests, members, and stats</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>👥 Adding Members</h4>
                <ol>
                  <li>Load your circle (you must be the owner)</li>
                <li>
                  Click <strong>"+ Add Member"</strong> in the Circle sidebar
                </li>
                  <li>Enter the member's Casper wallet address</li>
                <li>
                  Click <strong>"Add Member"</strong>
                </li>
                  <li>The member will appear in the Members list</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>📋 Creating Task Requests</h4>
                <ol>
                  <li>Load your circle</li>
                  <li>Click <strong>"+ Add Task"</strong> in the Requests section</li>
                  <li>Enter task title (required)</li>
                  <li>Add description (optional)</li>
                  <li>Select priority: Low, Medium, High, or Urgent</li>
                  <li>Select assignee from dropdown (or leave empty to assign later)</li>
                  <li>Enter payment amount in CSPR (optional - creator pays assignee on completion)</li>
                  <li>Click <strong>"Create Task"</strong></li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>💸 Creating Money Requests</h4>
                <ol>
                  <li>Load your circle</li>
                  <li>Click <strong>"💸 Request Money"</strong> in the Requests section</li>
                  <li>Enter request title (required)</li>
                  <li>Add description (optional)</li>
                  <li>Select priority: Low, Medium, High, or Urgent</li>
                  <li>Select assignee from dropdown (required - this person will pay you)</li>
                  <li>Enter amount in CSPR (required)</li>
                  <li>Click <strong>"Request Money"</strong></li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>✅ Completing Task Requests</h4>
                <ol>
                  <li>Find a task request assigned to you (marked "Open")</li>
                  <li>Click <strong>"✓ Complete Task"</strong></li>
                  <li>Sign the transaction in your Casper Wallet</li>
                  <li>Wait for blockchain confirmation</li>
                  <li>If payment is set, creator can use "Make Payment" button to transfer CSPR</li>
                  <li>Task will show as "Completed" with an on-chain transaction hash</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>✓ Accepting Money Requests</h4>
                <ol>
                  <li>Find a money request assigned to you (marked "Open")</li>
                  <li>Click <strong>"✓ Accept"</strong> button</li>
                  <li>Transfer page opens automatically</li>
                  <li>Complete the payment transfer to the requester</li>
                  <li>Sign the transaction in your Casper Wallet</li>
                  <li>Request shows as "Accepted - payment pending" until payment is confirmed</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>✗ Rejecting Money Requests</h4>
                <ol>
                  <li>Find a money request assigned to you (marked "Open")</li>
                  <li>Click <strong>"✗ Reject"</strong> button</li>
                  <li>Request is marked as rejected</li>
                  <li>Status shows as "Rejected by assignee"</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>💸 Making Payments</h4>
                <ol>
                  <li>For completed task requests with payment, creator sees "💸 Make Payment" button</li>
                  <li>Click the button to initiate CSPR transfer to assignee</li>
                  <li>Transfer page opens with pre-filled recipient and amount</li>
                  <li>Sign the transaction in your Casper Wallet</li>
                  <li>Payment status updates to "Paid" once transaction is confirmed</li>
                </ol>
              </div>

              <div className="help-flow">
                <h4>🔍 Viewing On-Chain Proofs</h4>
                <ol>
                  <li>Look for the 🔗 icon on completed requests or circles</li>
                  <li>Click the transaction hash link</li>
                  <li>View the transaction on Casper Testnet Explorer</li>
                  <li>Verify timestamp, signer, and transaction details</li>
                </ol>
              </div>
            </div>
          )}

        {activeTab === "shortcuts" && (
            <div className="help-section">
              <h3>Keyboard Shortcuts</h3>
              <p>Use these shortcuts to navigate CareCircle faster:</p>

              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <kbd>?</kbd>
                  <span>Toggle this help menu</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Esc</kbd>
                  <span>Close any open modal</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Enter</kbd>
                  <span>Submit forms (when input is focused)</span>
                </div>
              </div>

              <h4>Tips</h4>
              <ul>
              <li>
                Use <kbd>Tab</kbd> to navigate between form fields
              </li>
              <li>
                Press <kbd>Enter</kbd> in any input field to submit the form
              </li>
                <li>Click outside modals to close them</li>
              </ul>
            </div>
          )}

        {activeTab === "faq" && (
            <div className="help-section">
              <h3>Frequently Asked Questions</h3>

              <div className="faq-item">
                <h4>What is Demo Mode?</h4>
                <p>
                Demo Mode allows you to explore CareCircle without connecting a Casper wallet. Blockchain transactions
                are simulated locally. To use real on-chain features, connect your Casper Wallet.
                </p>
              </div>

              <div className="faq-item">
                <h4>Do I need CSPR tokens?</h4>
                <p>
                Yes, to create circles, add members, and complete requests on the Casper blockchain, you need a small
                amount of CSPR for transaction fees. Use the{" "}
                <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer">
                  Testnet Faucet
                </a>{" "}
                to get free testnet CSPR.
                </p>
              </div>

              <div className="faq-item">
                <h4>What's the difference between Task Requests and Money Requests?</h4>
                <p>
                <strong>Task Requests</strong> are caregiving tasks where the creator can optionally pay the assignee upon completion. 
                The assignee completes the task, and the creator can make payment using the "Make Payment" button.
                <br /><br />
                <strong>Money Requests</strong> allow the creator to request payment from an assignee. The assignee can Accept (and pay) or Reject the request. 
                When accepted, the transfer page opens automatically for the assignee to complete the payment.
                </p>
              </div>

              <div className="faq-item">
                <h4>Who can complete a request?</h4>
                <p>
                Only the person assigned to a request can mark it as complete. For money requests, only the assignee can Accept or Reject.
                This ensures accountability and prevents unauthorized request completion.
                </p>
              </div>

              <div className="faq-item">
                <h4>How do payments work?</h4>
                <p>
                For <strong>Task Requests</strong>: If a payment amount is set, the creator can pay the assignee after task completion using the "Make Payment" button.
                <br /><br />
                For <strong>Money Requests</strong>: When the assignee clicks "Accept", the transfer page opens automatically. The assignee transfers CSPR to the requester.
                Payments are processed on the Casper blockchain and are verifiable via transaction hashes.
                </p>
              </div>

              <div className="faq-item">
                <h4>What happens if I reject a money request?</h4>
                <p>
                When you reject a money request, it's marked as "Rejected by assignee" and no payment is required. 
                The request is considered completed (rejected) and will appear in your completed requests list.
                </p>
              </div>

              <div className="faq-item">
                <h4>Can I edit or delete requests?</h4>
                <p>
                Currently, requests cannot be edited or deleted once created. This preserves the integrity of the on-chain
                record. Future versions may add request updates with version history.
                </p>
              </div>

              <div className="faq-item">
                <h4>What happens if I lose my wallet?</h4>
                <p>
                Your wallet controls access to your circles and requests. Always back up your wallet's recovery phrase. If
                you lose access, you won't be able to sign transactions for your circles.
                </p>
              </div>

              <div className="faq-item">
                <h4>Is my data private?</h4>
                <p>
                Circle names, request titles, and member addresses are stored on-chain and are publicly visible. Only
                circle members can view detailed request information in the app. Avoid including sensitive personal
                information in request titles.
                </p>
              </div>

              <div className="faq-item">
                <h4>How do I get support?</h4>
                <p>
                CareCircle is a hackathon project. For issues or questions, check the{" "}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  GitHub repository
                </a>{" "}
                or{" "}
                <a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer">
                  Casper documentation
                </a>
                .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

// ==================== Help Modal Component ====================
function HelpModal({ isOpen, onClose, activeTab, setActiveTab }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CareCircle Help" wide>
      <HelpPanel activeTab={activeTab} setActiveTab={setActiveTab} />
    </Modal>
  );
}

// ==================== Loading Overlay ====================
function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
}

// ==================== Stats Card ====================
function StatCard({ icon, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ==================== Task Card ====================
function TaskCard({ task, onComplete, walletAddr, busy, onViewDetails, onMakePayment, onReject, members = [], mainPurseUref = null, addToast = () => {} }) {
  // Normalize addresses for comparison (trim and lowercase)
  const normalizeAddress = (addr) => {
    if (!addr) return "";
    return String(addr).trim().toLowerCase();
  };
  
  const walletAddrNormalized = normalizeAddress(walletAddr);
  const assignedToNormalized = normalizeAddress(task.assigned_to);
  const createdByNormalized = normalizeAddress(task.created_by);
  
  const isAssigned = assignedToNormalized !== "";
  const isAssignee = isAssigned && walletAddrNormalized && walletAddrNormalized === assignedToNormalized;
  const isCreator = walletAddrNormalized && walletAddrNormalized === createdByNormalized;
  
  // Check if this is a money request - handle different data types (number, string, boolean)
  const requestMoneyValue = task.request_money;
  const isRequestMoney = requestMoneyValue === 1 || 
                         requestMoneyValue === true || 
                         requestMoneyValue === "1" || 
                         String(requestMoneyValue).toLowerCase() === "true";
  
  // Allow completion/accept/reject if:
  // 1. Task is not completed
  // 2. User is the assignee
  // 3. Wallet is connected (required for on-chain operations)
  const canComplete = !task.completed && isAssignee && !isRequestMoney; // Regular tasks only
  const canAcceptReject = !task.completed && isAssignee && isRequestMoney; // Money requests only
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TaskCard ${task.id}]`, {
      walletAddr: walletAddrNormalized?.substring(0, 10) + "..." || "not set",
      assignedTo: assignedToNormalized?.substring(0, 10) + "..." || "not set",
      createdBy: createdByNormalized?.substring(0, 10) + "..." || "not set",
      isAssigned,
      isAssignee,
      isCreator,
      isRequestMoney,
      completed: task.completed,
      canComplete,
      canAcceptReject,
      hasWalletAddr: !!walletAddr
    });
  }
  // Show "Make Payment" button to creator for completed task requests (not money requests) with payment
  // Hide button if payment_tx_hash exists (payment already made) or if it's a money request
  // Check if payment_tx_hash exists and is not empty/null
  const hasPaymentTxHash = task.payment_tx_hash && 
                            String(task.payment_tx_hash).trim() !== "" && 
                            String(task.payment_tx_hash).toLowerCase() !== "null" &&
                            String(task.payment_tx_hash).toLowerCase() !== "undefined";
  const canMakePayment = task.completed && 
                         isCreator && 
                         !isRequestMoney && 
                         task.payment_amount && 
                         task.payment_amount.trim() !== "" && 
                         task.payment_amount !== "0" && 
                         !hasPaymentTxHash;

  const priorityLabels = ["Low", "Medium", "High", "Urgent"];
  const priorityColors = ["#71717a", "#eab308", "#f97316", "#ef4444"];

  // Find member by address for display
  const getMemberName = (address) => {
    if (!address) return null;
    const member = members.find(m => m.address?.toLowerCase() === address.toLowerCase());
    return member?.name || null;
  };

  const assignedToName = getMemberName(task.assigned_to);
  const createdByName = getMemberName(task.created_by);

  return (
    <div 
      className={`task-card ${task.completed ? "completed" : ""}`} 
      onClick={(e) => {
        // Don't trigger if clicking on buttons or links
        if (e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.closest("button") || e.target.closest("a")) {
          return;
        }
        onViewDetails && onViewDetails(task);
      }} 
      style={{ cursor: "pointer" }}
    >
      <div className="task-header">
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1 }}>
        <span className="task-id">#{task.id}</span>
          <h4 className="task-title" style={{ margin: 0, flex: 1 }}>{task.title}</h4>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {task.priority !== undefined && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: `${priorityColors[task.priority]}20`,
                color: priorityColors[task.priority]
              }}
            >
              {priorityLabels[task.priority]}
            </span>
          )}
          <span className={`task-status ${task.completed ? "completed" : "open"}`}>
            {task.completed ? "✓ Completed" : "○ Open"}
          </span>
        </div>
      </div>
      {task.description && (
        <p className="text-sm text-muted mb-4">{task.description}</p>
      )}
      {task.payment_amount && (
        <div style={{ 
          marginBottom: "12px", 
          padding: "8px 12px", 
          background: task.request_money ? "rgba(251, 191, 36, 0.1)" : "rgba(34, 197, 94, 0.1)", 
          borderRadius: "6px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <span style={{ fontSize: "0.875rem", color: task.request_money ? "#fbbf24" : "var(--care-green)", fontWeight: 500 }}>
            {task.request_money ? "💸" : "💰"} {(parseFloat(task.payment_amount) / 1_000_000_000).toFixed(2)} CSPR
          </span>
          {task.completed ? (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              ({hasPaymentTxHash 
                ? (task.request_money ? "Paid by assignee" : "Paid") 
                : (task.request_money 
                  ? (task.rejected === 1 || task.rejected === true ? "Rejected by assignee" : "Accepted - payment pending")
                  : (canMakePayment ? "Payment pending" : "Payment pending"))})
            </span>
          ) : (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              ({task.request_money ? "Request from assignee" : "Pay to assignee"})
            </span>
          )}
        </div>
      )}

      <div className="task-meta">
        <div className="task-meta-item">
          <span className="label">Assigned to:</span>
          <span className="value">
            {task.assigned_to && task.assigned_to.trim() !== "" 
              ? assignedToName 
                ? (
                  <>
                    {assignedToName} (
                    <span
                      style={{ 
                        cursor: "pointer", 
                        textDecoration: "underline",
                        textDecorationColor: "rgba(255, 255, 255, 0.3)",
                        textUnderlineOffset: "2px"
                      }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(task.assigned_to);
                          addToast("Copied!", "Wallet address copied to clipboard", "success");
                        } catch (err) {
                          // Fallback for older browsers
                          const textArea = document.createElement("textarea");
                          textArea.value = task.assigned_to;
                          textArea.style.position = "fixed";
                          textArea.style.opacity = "0";
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand("copy");
                            addToast("Copied!", "Wallet address copied to clipboard", "success");
                          } catch (fallbackErr) {
                            addToast("Error", "Failed to copy address", "error");
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                      title="Click to copy wallet address"
                    >
                      {formatAddress(task.assigned_to)}
                    </span>
                    )
                  </>
                )
                : (
                  <span
                    style={{ 
                      cursor: "pointer", 
                      textDecoration: "underline",
                      textDecorationColor: "rgba(255, 255, 255, 0.3)",
                      textUnderlineOffset: "2px"
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(task.assigned_to);
                        addToast("Copied!", "Wallet address copied to clipboard", "success");
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement("textarea");
                        textArea.value = task.assigned_to;
                        textArea.style.position = "fixed";
                        textArea.style.opacity = "0";
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand("copy");
                          addToast("Copied!", "Wallet address copied to clipboard", "success");
                        } catch (fallbackErr) {
                          addToast("Error", "Failed to copy address", "error");
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    title="Click to copy wallet address"
                  >
                    {formatAddress(task.assigned_to)}
                  </span>
                )
              : "Unassigned"}
          </span>
        </div>
        <div className="task-meta-item">
          <span className="label">Created by:</span>
          <span className="value">
            {createdByName 
              ? (
                <>
                  {createdByName} (
                  <span
                    style={{ 
                      cursor: "pointer", 
                      textDecoration: "underline",
                      textDecorationColor: "rgba(255, 255, 255, 0.3)",
                      textUnderlineOffset: "2px"
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(task.created_by);
                        addToast("Copied!", "Wallet address copied to clipboard", "success");
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement("textarea");
                        textArea.value = task.created_by;
                        textArea.style.position = "fixed";
                        textArea.style.opacity = "0";
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand("copy");
                          addToast("Copied!", "Wallet address copied to clipboard", "success");
                        } catch (fallbackErr) {
                          addToast("Error", "Failed to copy address", "error");
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    title="Click to copy wallet address"
                  >
                    {formatAddress(task.created_by)}
                  </span>
                  )
                </>
              )
              : (
                <span
                  style={{ 
                    cursor: "pointer", 
                    textDecoration: "underline",
                    textDecorationColor: "rgba(255, 255, 255, 0.3)",
                    textUnderlineOffset: "2px"
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(task.created_by);
                      addToast("Copied!", "Wallet address copied to clipboard", "success");
                    } catch (err) {
                      // Fallback for older browsers
                      const textArea = document.createElement("textarea");
                      textArea.value = task.created_by;
                      textArea.style.position = "fixed";
                      textArea.style.opacity = "0";
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand("copy");
                        addToast("Copied!", "Wallet address copied to clipboard", "success");
                      } catch (fallbackErr) {
                        addToast("Error", "Failed to copy address", "error");
                      }
                      document.body.removeChild(textArea);
                    }
                  }}
                  title="Click to copy wallet address"
                >
                  {formatAddress(task.created_by)}
                </span>
              )}
          </span>
        </div>
        {task.completed_at && (
          <div className="task-meta-item">
            <span className="label">Completed:</span>
            <span className="value">{new Date(task.completed_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="task-footer" onClick={(e) => e.stopPropagation()}>
        <div className="task-tx">
          {task.tx_hash ? (
            <>
              <span>🔗</span>
              <a 
                href={mainPurseUref ? `https://testnet.cspr.live/uref/${mainPurseUref}` : getExplorerUrl(task.tx_hash)} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {formatAddress(task.tx_hash, 10, 8)} ↗
              </a>
            </>
          ) : (
            <span className="text-muted text-xs">No on-chain proof yet</span>
          )}
        </div>

        {canComplete && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => onComplete(task)}
            disabled={busy}
          >
            {busy ? "Signing..." : "✓ Complete Task"}
          </button>
        )}

        {canAcceptReject && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-success btn-sm"
              onClick={() => {
                // Open transfer page first
                const transferUrl = `https://testnet.cspr.live/transfer`;
                window.open(transferUrl, '_blank');
                // Then complete the task (which will handle the payment flow)
                onComplete(task);
              }}
              disabled={busy}
            >
              {busy ? "Processing..." : "✓ Accept"}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onReject && onReject(task)}
              disabled={busy}
            >
              {busy ? "Processing..." : "✗ Reject"}
            </button>
          </div>
        )}

        {canMakePayment && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onMakePayment && onMakePayment(task)}
            disabled={busy}
            style={{ background: "var(--care-teal)" }}
          >
            {busy ? "Processing..." : "💸 Make Payment"}
          </button>
        )}

        {!task.completed && !isAssignee && walletAddr && isAssigned && (
          <span className="text-xs text-muted">
            Only assignee can complete
            {process.env.NODE_ENV === 'development' && (
              <span style={{ display: "block", fontSize: "0.65rem", marginTop: "4px" }}>
                Wallet: {walletAddrNormalized?.substring(0, 12)}... | Assigned: {assignedToNormalized?.substring(0, 12)}...
              </span>
            )}
          </span>
        )}
        {!task.completed && !isAssigned && (
          <span className="text-xs text-muted">Task must be assigned before completion</span>
        )}
        {!task.completed && !walletAddr && (
          <span className="text-xs text-muted">Connect wallet to complete tasks</span>
        )}
      </div>
    </div>
  );
}

// ==================== Member Item ====================
function MemberItem({ address, name, isOwner, isCurrentUser }) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];
  const colorIndex = address ? parseInt(address.slice(-2), 16) % colors.length : 0;
  const displayName = name || formatAddress(address);

  return (
    <div className="member-item">
      <div className="member-avatar" style={{ background: colors[colorIndex] }}>
        {name ? name.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
      </div>
      <div className="member-info">
        <div className="member-name">
          {name || formatAddress(address)}
        {isCurrentUser && " (you)"}
        </div>
        {name && (
          <div className="member-address" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {formatAddress(address)}
          </div>
        )}
      </div>
      <span className={`member-role ${isOwner ? "owner" : ""}`}>
        {isOwner ? "Owner" : "Member"}
      </span>
    </div>
  );
}

// ==================== Main App ====================
export default function App() {
  // State
  const [walletAddr, setWalletAddr] = useState(() => {
    return localStorage.getItem("carecircle_wallet") || "";
  });
  const [walletBalance, setWalletBalance] = useState("0");
  const [isAccountLive, setIsAccountLive] = useState(false);
  const [circle, setCircle] = useState(null);
  const [circleName, setCircleName] = useState("");
  const [circleIdToLoad, setCircleIdToLoad] = useState("");
  const [walletKeyToLoad, setWalletKeyToLoad] = useState("");
  const [loadCircleMode, setLoadCircleMode] = useState("id"); // "id" or "wallet"
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, completed_tasks: 0, open_tasks: 0, completion_rate: 0 });
  const [filter, setFilter] = useState("all");
  const [mainPurseUref, setMainPurseUref] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [toasts, setToasts] = useState([]);

  // Modal states
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [showLoadCircle, setShowLoadCircle] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCircleCreated, setShowCircleCreated] = useState(false);
  const [createdCircleId, setCreatedCircleId] = useState(null);
  const [createdCircleName, setCreatedCircleName] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState("get-started");
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskAssignTo, setTaskAssignTo] = useState("");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileKey, setProfileKey] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [invitationData, setInvitationData] = useState(null);
  const [joinAddress, setJoinAddress] = useState("");

  const [page, setPage] = useState(() => {
    const raw = (window.location.hash || "").replace("#", "").trim();
    // Default to "about" when no hash or when hash is "about"
    if (!raw || raw === "about") return "about";
    // Allow "get-started" or "home" to work regardless of wallet connection
    if (raw === "home" || raw === "get-started" || raw === "start") return "home";
    if (raw === "support" || raw === "help") return raw;
    if (raw === "my-circle") return "my-circle";
    return "about";
  });

  // ==================== Helper Functions ====================
  const addToast = useCallback((title, message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const syncPageFromLocation = useCallback(() => {
    const raw = (window.location.hash || "").replace("#", "").trim();
    let next = "about"; // Default to "about" when no hash
    
    // Check for join invitation token
    if (raw.startsWith("join")) {
      const params = new URLSearchParams(raw.split("?")[1] || "");
      const token = params.get("token");
      if (token) {
        setInvitationToken(token);
        next = "join";
        setPage(next);
        // Load invitation data
        getInvitationByToken(token).then(data => {
          setInvitationData(data);
        }).catch(err => {
          console.error("Failed to load invitation:", err);
          addToast("Error", "Invalid or expired invitation", "error");
        });
        return;
      }
    }
    
    if (!raw || raw === "about") next = "about";
    else if (raw === "home" || raw === "get-started" || raw === "start") {
      // Allow "home" (Get Started) page regardless of wallet connection
      next = "home";
    }
    else if (raw === "support" || raw === "help") next = raw;
    else if (raw === "my-circle") next = "my-circle";
    setPage(next);
  }, [addToast]);

  useEffect(() => {
    const handler = () => syncPageFromLocation();
    window.addEventListener("hashchange", handler);
    window.addEventListener("popstate", handler);
    handler();
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("popstate", handler);
    };
  }, [syncPageFromLocation]);

  const navigateTo = useCallback((nextPage) => {
    const validPages = ["about", "home", "get-started", "support", "help", "my-circle"];
    let target = nextPage;
    if (nextPage === "home" || nextPage === "get-started" || nextPage === "start") {
      target = "home";
    } else if (!validPages.includes(nextPage)) {
      target = "about";
    }
    setShowHelp(false);
    if (target === "about") {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    } else if (target === "home") {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#get-started`);
    } else {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [circle]);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(1);
  const [newTaskPayment, setNewTaskPayment] = useState("");
  // Request Money form fields (separate from Add Task)
  const [requestMoneyTitle, setRequestMoneyTitle] = useState("");
  const [requestMoneyDescription, setRequestMoneyDescription] = useState("");
  const [requestMoneyAssignee, setRequestMoneyAssignee] = useState("");
  const [requestMoneyPriority, setRequestMoneyPriority] = useState(1);
  const [requestMoneyAmount, setRequestMoneyAmount] = useState("");
  const [newMemberAddr, setNewMemberAddr] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberInviteMode, setMemberInviteMode] = useState("address"); // "address" or "email"
  const [demoWalletKey, setDemoWalletKey] = useState("");
  const [demoWalletError, setDemoWalletError] = useState("");

  // ==================== Helper Functions ====================
  const parseCircleFromChain = (chainData, circleId) => {
    // Simplified parser - in production, you'd properly parse CLValue
    // For now, return a basic structure
    try {
      // If chainData is already parsed or has the structure we need
      if (typeof chainData === 'object' && chainData !== null) {
        return {
          id: circleId,
          name: chainData.name || `Circle ${circleId}`,
          owner: chainData.owner || "",
        };
      }
      return null;
    } catch (err) {
      console.error("Failed to parse circle from chain:", err);
      return null;
    }
  };


  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ==================== Data Refresh ====================
  const refreshCircleData = useCallback(async (circleId) => {
    if (!circleId) return;
    try {
      const [tasksData, membersData, statsData] = await Promise.all([
        fetchTasks(circleId),
        fetchMembers(circleId),
        fetchCircleStats(circleId)
      ]);
      setTasks(tasksData);
      setMembers(membersData.map(m => ({
        address: m.address,
        name: m.name || null,
        isOwner: m.is_owner
      })));
      setStats(statsData);
    } catch (err) {
      console.error("Failed to refresh circle data:", err);
    }
  }, []);

  // ==================== Wallet Actions ====================
  const handleConnect = async () => {
    try {
      setBusy(true);
      setLoadingMessage("Connecting wallet...");
      const addr = await connectWallet();
      setWalletAddr(addr);
      localStorage.setItem("carecircle_wallet", addr);
      
      // Always try to fetch balance (returns { balance, isLive })
      try {
        const result = await getAccountBalance(addr);
        if (result && typeof result === 'object') {
          setWalletBalance(result.balance || "0");
          setIsAccountLive(result.isLive === true);
        } else {
          setWalletBalance(result || "0");
          setIsAccountLive(false);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setWalletBalance("0");
        setIsAccountLive(false);
      }
      
      // Navigate to Get Started page
      navigateTo("home");
      addToast("Wallet Connected", formatAddress(addr), "success");
    } catch (err) {
      if (err?.code === CASPER_WALLET_NOT_DETECTED) {
        setDemoWalletKey("");
        setDemoWalletError("");
        setShowConnectWallet(true);
      } else {
      addToast("Connection Failed", err.message, "error");
      }
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleLoadDemoKey = () => {
    // Use a standard demo key format (66 chars: 02 prefix + 64 hex chars)
    const demoKey = "0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d";
    setDemoWalletKey(demoKey);
    setDemoWalletError("");
  };

  const handleConnectDemoWallet = async () => {
    const key = (demoWalletKey || "").trim();
    if (!key || key.length < 64) {
      setDemoWalletError("Please enter a valid Casper public key (hex).");
      return;
    }

    try {
      setDemoWalletError("");
      setBusy(true);
      setLoadingMessage("Connecting (demo mode)...");
      const addr = await connectWallet({ manualPublicKey: key });
      setWalletAddr(addr);
      localStorage.setItem("carecircle_wallet", addr);
      
      // For manual key entry, try to fetch balance to check if account is live
      try {
        const result = await getAccountBalance(addr);
        if (result && typeof result === 'object') {
          setWalletBalance(result.balance || "0");
          setIsAccountLive(result.isLive === true);
        } else {
          setWalletBalance("0");
          setIsAccountLive(false);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setWalletBalance("0");
        setIsAccountLive(false);
      }
      
      setShowConnectWallet(false);
      // Navigate to Get Started page
      navigateTo("home");
      addToast("Wallet Connected", formatAddress(addr), "success");
    } catch (err) {
      setDemoWalletError(err?.message || "Failed to connect");
      addToast("Connection Failed", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleDisconnect = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🔌 Disconnect button clicked", { walletAddr, busy });
    
    if (busy) {
      console.log("⏸️ Already busy, ignoring disconnect");
      return;
    }
    
    // Clear state IMMEDIATELY (synchronously) before async operations
    // This ensures UI updates right away
    console.log("🗑️ Clearing localStorage immediately...");
    localStorage.removeItem("carecircle_wallet");
    localStorage.removeItem("carecircle_circle_id");
    
    console.log("🧹 Clearing wallet state immediately...");
    setWalletAddr("");
    setWalletBalance("0");
    setIsAccountLive(false);
    
    console.log("🔄 Resetting circle state immediately...");
    setCircle(null);
    setTasks([]);
    setMembers([]);
    setStats({ total_tasks: 0, completed_tasks: 0, open_tasks: 0, completion_rate: 0 });
    
    // Navigate immediately
    console.log("🧭 Navigating to About page immediately...");
    navigateTo("about");
    
    // Then do async cleanup
    try {
      setBusy(true);
      
      // Disconnect from wallet extension
      console.log("🔌 Disconnecting from wallet extension...");
      await disconnectWallet();
      
      addToast("Wallet Disconnected", "Returned to About page", "info");
      console.log("✅ Wallet disconnected successfully");
    } catch (err) {
      console.error("❌ Error disconnecting wallet:", err);
      addToast("Wallet Disconnected", "Wallet state cleared", "info");
    } finally {
      setBusy(false);
      console.log("🏁 Disconnect process completed");
    }
  };

  // ==================== Circle Actions ====================
  const handleCreateCircle = async () => {
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!circleName.trim()) return addToast("Error", "Circle name is required", "error");

    try {
      setBusy(true);
      setLoadingMessage("Creating circle on-chain...");

      const result = await createCircleOnChain({ name: circleName });

      // Save to database with error handling
      try {
        const upsertResult = await upsertCircle({
        id: result.id,
        name: circleName,
        owner: walletAddr,
          wallet_key: walletAddr,
        tx_hash: result.txHash
      });
        console.log("Circle saved to database:", upsertResult);
      } catch (dbError) {
        console.error("Failed to save circle to database:", dbError);
        // Continue anyway - circle is created on-chain
        addToast("Warning", "Circle created but database save failed. Circle ID: " + result.id, "warning");
      }

      // Add owner as member
      await upsertMember({
        circle_id: result.id,
        address: walletAddr,
        is_owner: true
      });

      setCircle({
        id: result.id,
        name: circleName,
        owner: walletAddr,
        txHash: result.txHash
      });

      localStorage.setItem("carecircle_circle_id", result.id.toString());

      // Navigate to My Circle page
      navigateTo("my-circle");

      setShowCreateCircle(false);
      setCircleName("");

      // Show confirmation modal with circle ID
      setCreatedCircleId(result.id);
      setCreatedCircleName(circleName);
      setShowCircleCreated(true);

      addToast("Circle Created!", `${circleName} (ID: ${result.id})`, "success");

      await refreshCircleData(result.id);
    } catch (err) {
      addToast("Failed to Create Circle", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleLoadCircle = async () => {
    if (loadCircleMode === "id") {
    const id = parseInt(circleIdToLoad, 10);
    if (!id || isNaN(id)) return addToast("Error", "Enter a valid circle ID", "error");

    try {
      setBusy(true);
      setLoadingMessage("Loading circle...");

      const circleData = await fetchCircle(id);

      if (!circleData) {
        addToast("Not Found", `Circle #${id} doesn't exist`, "error");
        return;
      }

      setCircle({
        id: circleData.id,
        name: circleData.name,
        owner: circleData.owner,
        txHash: circleData.tx_hash
      });

      localStorage.setItem("carecircle_circle_id", id.toString());

      // Auto-connect wallet if not already connected
      if (!walletAddr && circleData.owner) {
        try {
          const addr = connectWithPublicKey(circleData.owner);
          setWalletAddr(addr);
          localStorage.setItem("carecircle_wallet", addr);
          addToast("Wallet Auto-Connected", formatAddress(addr), "success");
        } catch (err) {
          console.error("Failed to auto-connect wallet:", err);
          // Continue anyway - circle is loaded
        }
      }

      setShowLoadCircle(false);
      setCircleIdToLoad("");

      // Navigate to My Circle page
      navigateTo("my-circle");

      addToast("Circle Loaded!", circleData.name, "success");

      await refreshCircleData(id);
    } catch (err) {
      addToast("Failed to Load Circle", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  } else {
    // Load by wallet key
    const walletKey = (walletKeyToLoad || "").trim();
    if (!walletKey || walletKey.length < 64) {
      return addToast("Error", "Enter a valid wallet key", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Loading circles by wallet key...");

      const circles = await fetchCirclesByWalletKey(walletKey);

      if (!circles || circles.length === 0) {
        addToast("Not Found", `No circles found for wallet key`, "error");
        return;
      }

      // If multiple circles, use the first one (most recent)
      const circleData = circles[0];
      setCircle({
        id: circleData.id,
        name: circleData.name,
        owner: circleData.owner,
        txHash: circleData.tx_hash
      });

      localStorage.setItem("carecircle_circle_id", circleData.id.toString());

      // Auto-connect wallet if not already connected
      if (!walletAddr && circleData.owner) {
        try {
          const addr = connectWithPublicKey(circleData.owner);
          setWalletAddr(addr);
          localStorage.setItem("carecircle_wallet", addr);
          addToast("Wallet Auto-Connected", formatAddress(addr), "success");
        } catch (err) {
          console.error("Failed to auto-connect wallet:", err);
          // Continue anyway - circle is loaded
        }
      }

      setShowLoadCircle(false);
      setWalletKeyToLoad("");

      // Navigate to My Circle page
      navigateTo("my-circle");

      if (circles.length > 1) {
        addToast("Circle Loaded!", `${circleData.name} (${circles.length} circles found, showing most recent)`, "success");
      } else {
        addToast("Circle Loaded!", circleData.name, "success");
      }

      await refreshCircleData(circleData.id);
    } catch (err) {
      addToast("Failed to Load Circle", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
    }
  };

  const handleLeaveCircle = () => {
    setCircle(null);
    setTasks([]);
    setMembers([]);
    setStats({ total_tasks: 0, completed_tasks: 0, open_tasks: 0, completion_rate: 0 });
    localStorage.removeItem("carecircle_circle_id");
    
    // Navigate to Get Started page
    navigateTo("home");
    
    addToast("Left Circle", "Returned to Get Started", "info");
  };

  // ==================== Profile Actions ====================
  const handleEditProfile = () => {
    // Find current user's member info
    const currentMember = members.find(m => m.address?.toLowerCase() === walletAddr?.toLowerCase());
    setProfileName(currentMember?.name || "");
    setProfileKey(walletAddr || "");
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!profileName.trim()) return addToast("Error", "Name is required", "error");

    try {
      setBusy(true);
      setLoadingMessage("Updating profile...");

      // Update member name in database
      await upsertMember({
        circle_id: circle.id,
        address: walletAddr,
        name: profileName.trim(),
        is_owner: walletAddr.toLowerCase() === circle.owner?.toLowerCase()
      });

      setShowEditProfile(false);
      setProfileName("");
      setProfileKey("");

      addToast("Profile Updated!", "Your name has been updated", "success");
      await refreshCircleData(circle.id);
    } catch (err) {
      addToast("Failed to Update Profile", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  // ==================== Member Actions ====================
  const handleAddMember = async () => {
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!newMemberAddr.trim()) return addToast("Error", "Member address is required", "error");
    if (!newMemberName.trim()) return addToast("Error", "Member name is required", "error");

    try {
      setBusy(true);
      setLoadingMessage("Adding member on-chain...");

      const result = await addMemberOnChain({
        circleId: circle.id,
        memberAddress: newMemberAddr.trim()
      });

      await upsertMember({
        circle_id: circle.id,
        address: newMemberAddr.trim(),
        name: newMemberName.trim(),
        is_owner: false,
        tx_hash: result.txHash
      });

      setShowAddMember(false);
      setNewMemberAddr("");
      setNewMemberName("");

      addToast("Member Added!", `${newMemberName} (${formatAddress(newMemberAddr)})`, "success");
      await refreshCircleData(circle.id);
    } catch (err) {
      addToast("Failed to Add Member", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleInviteByEmail = async () => {
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!newMemberEmail.trim()) return addToast("Error", "Email address is required", "error");
    if (!newMemberName.trim()) return addToast("Error", "Member name is required", "error");

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail.trim())) {
      return addToast("Error", "Please enter a valid email address", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Sending invitation email...");

      const result = await sendMemberInvitation({
        circle_id: circle.id,
        circle_name: circle.name,
        member_name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        inviter_name: members.find(m => m.address?.toLowerCase() === walletAddr?.toLowerCase())?.name || "Circle Owner"
      });

      setShowAddMember(false);
      setNewMemberAddr("");
      setNewMemberName("");
      setNewMemberEmail("");
      setMemberInviteMode("address");

      if (result.joinUrl) {
        addToast("Invitation Sent!", `Invitation sent to ${newMemberEmail}. Join link: ${result.joinUrl}`, "success");
      } else {
        addToast("Invitation Sent!", `Invitation sent to ${newMemberEmail}`, "success");
      }
    } catch (err) {
      addToast("Failed to Send Invitation", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitationToken) return addToast("Error", "No invitation token", "error");
    
    const address = (joinAddress.trim() || walletAddr || "").trim();
    if (!address || address.length < 64) {
      return addToast("Error", "Please enter a valid Casper address or connect your wallet", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Accepting invitation...");

      const result = await acceptInvitation(invitationToken, { address });

      // Add member on-chain if wallet is connected
      if (walletAddr && walletAddr.toLowerCase() === address.toLowerCase()) {
        try {
          await addMemberOnChain({
            circleId: result.circle_id,
            memberAddress: address
          });
        } catch (chainErr) {
          console.warn("Failed to add member on-chain:", chainErr);
          // Continue anyway - member is added to database
        }
      }

      // Load the circle
      const circleData = await fetchCircle(result.circle_id);
      if (circleData) {
        setCircle({
          id: circleData.id,
          name: circleData.name,
          owner: circleData.owner,
          txHash: circleData.tx_hash
        });
        localStorage.setItem("carecircle_circle_id", result.circle_id.toString());
        
        // Auto-connect wallet if not already connected
        if (!walletAddr && address) {
          try {
            connectWithPublicKey(address);
            setWalletAddr(address);
            localStorage.setItem("carecircle_wallet", address);
          } catch (err) {
            console.error("Failed to auto-connect wallet:", err);
          }
        }

        await refreshCircleData(result.circle_id);
        navigateTo("my-circle");
        addToast("Welcome!", `You've joined ${result.circle_name}`, "success");
      }
    } catch (err) {
      addToast("Failed to Accept Invitation", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  // ==================== Task Actions ====================
  const handleCreateTask = async () => {
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!newTaskTitle.trim()) return addToast("Error", "Task title is required", "error");
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");

    const assignee = newTaskAssignee.trim() || null;

    // On-chain creation requires an assignee (contract requirement)
    // If not assigned, we'll use creator as placeholder for on-chain, but store as null in DB
    const chainAssignee = assignee || walletAddr;

    try {
      setBusy(true);
      setLoadingMessage("Creating task on-chain...");

      // Ensure wallet is connected in casper module
      // This syncs the UI's walletAddr with the casper module's connectedPublicKey
      try {
        connectWithPublicKey(walletAddr);
        console.log("✅ Synced wallet connection for task creation");
      } catch (syncErr) {
        console.warn("Warning: Could not sync wallet connection:", syncErr);
        // Continue anyway - might still work if already connected
      }

      const result = await createTaskOnChain({
        circleId: circle.id,
        title: newTaskTitle,
        assignedTo: chainAssignee
      });

      // Parse payment amount (convert CSPR to motes: 1 CSPR = 1,000,000,000 motes)
      const paymentAmount = newTaskPayment.trim() ? 
        (parseFloat(newTaskPayment.trim()) * 1_000_000_000).toString() : null;

      await upsertTask({
        id: result.id,
        circle_id: circle.id,
        title: newTaskTitle,
        description: newTaskDescription || null,
        assigned_to: assignee, // null if not assigned (will show as "Unassigned" in UI)
        created_by: walletAddr,
        priority: newTaskPriority,
        payment_amount: paymentAmount,
        request_money: 0, // Regular task, not a money request
        completed: false,
        tx_hash: result.txHash
      });

      setShowAddTask(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAssignee("");
      setNewTaskPriority(1);
      setNewTaskPayment("");

      addToast("Task Created!", newTaskTitle, "success");
      
      // Small delay to ensure database is updated before refreshing
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshCircleData(circle.id);
      
      console.log("✅ Task created and circle data refreshed");
    } catch (err) {
      console.error("Failed to create task:", err);
      addToast("Failed to Create Task", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleCreateMoneyRequest = async () => {
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!requestMoneyTitle.trim()) return addToast("Error", "Task title is required", "error");
    if (!requestMoneyAmount.trim()) return addToast("Error", "Amount is required for money requests", "error");
    if (!requestMoneyAssignee.trim()) return addToast("Error", "Assignee is required for money requests", "error");

    try {
      setBusy(true);
      setLoadingMessage("Creating money request on-chain...");

      // Ensure wallet is connected in casper module
      // This syncs the UI's walletAddr with the casper module's connectedPublicKey
      try {
        connectWithPublicKey(walletAddr);
        console.log("✅ Synced wallet connection for money request creation");
      } catch (syncErr) {
        console.warn("Warning: Could not sync wallet connection:", syncErr);
        // Continue anyway - might still work if already connected
      }

      const result = await createTaskOnChain({
        circleId: circle.id,
        title: requestMoneyTitle,
        assignedTo: requestMoneyAssignee
      });

      // Parse payment amount (convert CSPR to motes: 1 CSPR = 1,000,000,000 motes)
      const paymentAmount = (parseFloat(requestMoneyAmount.trim()) * 1_000_000_000).toString();

      await upsertTask({
        id: result.id,
        circle_id: circle.id,
        title: requestMoneyTitle,
        description: requestMoneyDescription || null,
        assigned_to: requestMoneyAssignee,
        created_by: walletAddr,
        priority: requestMoneyPriority,
        payment_amount: paymentAmount,
        request_money: 1, // This is a money request
        completed: false,
        tx_hash: result.txHash
      });

      setShowRequestMoney(false);
      setRequestMoneyTitle("");
      setRequestMoneyDescription("");
      setRequestMoneyAssignee("");
      setRequestMoneyPriority(1);
      setRequestMoneyAmount("");

      addToast("Money Request Created!", requestMoneyTitle, "success");
      
      // Refresh immediately - the polling will also catch it, but immediate refresh is better UX
      await refreshCircleData(circle.id);
      
      console.log("✅ Money request created and circle data refreshed");
    } catch (err) {
      console.error("Failed to create money request:", err);
      addToast("Failed to Create Money Request", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleAssignTask = async () => {
    if (!selectedTask) return;
    if (!circle) return addToast("Error", "No circle loaded", "error");
    
    const assignee = taskAssignTo.trim() || null;

    try {
      setBusy(true);
      setLoadingMessage("Updating request assignment...");

      // For on-chain update, we need an assignee. If not assigned, use creator as placeholder
      const chainAssignee = assignee || walletAddr;

      // Update task assignment on-chain (if supported) or just in database
      await upsertTask({
        id: selectedTask.id,
        circle_id: circle.id,
        title: selectedTask.title,
        description: selectedTask.description || null,
        assigned_to: assignee,
        created_by: selectedTask.created_by,
        priority: selectedTask.priority,
        completed: selectedTask.completed,
        tx_hash: selectedTask.tx_hash
      });

      setShowTaskDetails(false);
      setSelectedTask(null);
      setTaskAssignTo("");

      addToast("Task Updated!", "Assignment updated", "success");
      await refreshCircleData(circle.id);
    } catch (err) {
      addToast("Failed to Update Task", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;
    if (!circle) return addToast("Error", "No circle loaded", "error");
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");

    // Only creator or owner can cancel
    const isCreator = walletAddr.toLowerCase() === selectedTask.created_by?.toLowerCase();
    const isOwner = walletAddr.toLowerCase() === circle.owner?.toLowerCase();
    
    if (!isCreator && !isOwner) {
      return addToast("Error", "Only the task creator or circle owner can cancel tasks", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Canceling task...");

      // Mark task as completed with a special status or delete it
      // For now, we'll mark it as completed with a note
      await upsertTask({
        id: selectedTask.id,
        circle_id: circle.id,
        title: selectedTask.title,
        description: selectedTask.description || null,
        assigned_to: selectedTask.assigned_to,
        created_by: selectedTask.created_by,
        priority: selectedTask.priority,
        completed: true, // Mark as completed (canceled)
        tx_hash: selectedTask.tx_hash
      });

      setShowTaskDetails(false);
      setSelectedTask(null);
      setTaskAssignTo("");

      addToast("Task Canceled!", selectedTask.title, "success");
      await refreshCircleData(circle.id);
    } catch (err) {
      addToast("Failed to Cancel Task", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleMakePayment = async (task) => {
    // Prevent multiple simultaneous payment attempts
    if (busy) {
      return addToast("Info", "Payment is already being processed. Please wait...", "info");
    }
    
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!task.completed) {
      return addToast("Error", "Task must be completed before making payment", "error");
    }
    if (!task.payment_amount || task.payment_amount.trim() === "" || task.payment_amount === "0") {
      return addToast("Error", "No payment amount specified", "error");
    }
    
    // Check if this is a money request - handle different data types
    const requestMoneyValue = task.request_money;
    const isRequestMoney = requestMoneyValue === 1 || 
                           requestMoneyValue === true || 
                           requestMoneyValue === "1" || 
                           String(requestMoneyValue).toLowerCase() === "true";
    const isCreator = walletAddr.toLowerCase() === task.created_by?.toLowerCase();
    
    if (isRequestMoney) {
      // For money requests: creator sees "Make Payment" button
      // This opens transfer page for assignee to pay creator
      if (!isCreator) {
        return addToast("Error", "Only the task creator can request payment for money requests", "error");
      }
      if (!task.assigned_to || task.assigned_to.trim() === "") {
        return addToast("Error", "Task must be assigned before requesting payment", "error");
      }
    } else {
      // For regular tasks: creator sees "Make Payment" button to pay assignee
      if (!isCreator) {
        return addToast("Error", "Only the task creator can make payment", "error");
      }
      if (!task.assigned_to || task.assigned_to.trim() === "") {
        return addToast("Error", "Task must be assigned before making payment", "error");
      }
    }

    try {
      setBusy(true);
      const paymentCSPR = (parseFloat(task.payment_amount) / 1_000_000_000).toFixed(2);
      
      if (isRequestMoney) {
        // Money request: assignee pays creator
        // Open transfer page and show info message
        const transferUrl = `https://testnet.cspr.live/transfer`;
        window.open(transferUrl, '_blank');
        console.log(`📂 Opened transfer page for assignee to pay creator: ${transferUrl}`);
        addToast("Info", `Transfer page opened. Assignee (${formatAddress(task.assigned_to, 6, 4)}) needs to transfer ${paymentCSPR} CSPR to you (${formatAddress(task.created_by, 6, 4)}).`, "info");
      } else {
        // Regular task: creator pays assignee
        // Initiate transfer from creator to assignee
        setLoadingMessage(`Preparing transfer of ${paymentCSPR} CSPR...`);
        console.log(`💸 Initiating transfer: ${paymentCSPR} CSPR from creator to assignee`);
        console.log(`   Sender: ${walletAddr}`);
        console.log(`   Recipient: ${task.assigned_to}`);
        console.log(`   Amount (motes): ${task.payment_amount}`);
        
        // Ensure wallet is synced before transfer - CRITICAL
        console.log("🔄 Syncing wallet connection...");
        connectWithPublicKey(walletAddr);
        console.log("✅ Wallet connection synced");
        
        // Small delay to ensure wallet is ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setLoadingMessage(`Opening Casper Wallet to sign transfer...`);
        
        // Initiate transfer (transferCSPR will open the transfer page if needed)
        console.log("🚀 Calling transferCSPR...");
        const paymentResult = await transferCSPR({
          recipientAddress: task.assigned_to,
          amountMotes: task.payment_amount,
          openWalletUI: true  // Let transferCSPR handle opening the URL once
        });
        
        console.log(`✅ Payment transferred to assignee: ${paymentResult.txHash}`);
        addToast("Success", `Payment initiated! ${paymentCSPR} CSPR transfer transaction: ${formatAddress(paymentResult.txHash, 10, 8)}`, "success");
        
        // Save payment transaction hash to task
        await upsertTask({
          ...task,
          payment_tx_hash: paymentResult.txHash
        });
        
        // Refresh circle data to update UI
        if (circle?.id) {
          await refreshCircleData(circle.id);
        }
      }
    } catch (paymentErr) {
      console.error("❌ Payment transfer failed:", paymentErr);
      console.error("   Error details:", paymentErr.message, paymentErr.stack);
      addToast("Error", `Payment transfer failed: ${paymentErr.message}. Please try again.`, "error");
      // Don't open transfer page again - it was already opened by transferCSPR
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleRejectMoneyRequest = async (task) => {
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!task.assigned_to || walletAddr.toLowerCase() !== task.assigned_to.toLowerCase()) {
      return addToast("Error", "Only the assignee can reject this money request", "error");
    }
    if (!task.request_money || (task.request_money !== 1 && task.request_money !== true)) {
      return addToast("Error", "This is not a money request", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Rejecting money request...");

      // Mark task as rejected
      await upsertTask({
        ...task,
        completed: true,
        completed_by: walletAddr,
        completed_at: Date.now(),
        rejected: 1, // Mark as rejected
        // Keep existing tx_hash if any, or set to null
        tx_hash: task.tx_hash || null
      });

      addToast("Money Request Rejected", task.title, "info");
      await refreshCircleData(circle.id);
    } catch (err) {
      console.error("❌ Failed to reject money request:", err);
      addToast("Failed to Reject Request", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  const handleCompleteTask = async (task) => {
    if (!walletAddr) return addToast("Error", "Connect wallet first", "error");
    if (!task.assigned_to || task.assigned_to.trim() === "") {
      return addToast("Error", "Task must be assigned before completion", "error");
    }
    if (walletAddr.toLowerCase() !== task.assigned_to.toLowerCase()) {
      return addToast("Error", "Only the assignee can complete this task", "error");
    }

    try {
      setBusy(true);
      setLoadingMessage("Signing task completion...");

      // Ensure wallet is connected in casper module
      // This syncs the UI's walletAddr with the casper module's connectedPublicKey
      try {
        connectWithPublicKey(walletAddr);
        console.log("✅ Synced wallet connection for task completion");
      } catch (syncErr) {
        console.warn("Warning: Could not sync wallet connection:", syncErr);
        // Continue anyway - might still work if already connected
      }

      const result = await completeTaskOnChain({ taskId: task.id });

      // Automatically transfer payment if task has payment amount
      // If request_money is true: don't transfer automatically - assignee uses "Make Payment" button
      // If request_money is false: transfer FROM creator TO assignee
      let paymentMsg = "";
      if (task.payment_amount && task.payment_amount.trim() !== "" && task.payment_amount !== "0") {
        const paymentCSPR = (parseFloat(task.payment_amount) / 1_000_000_000).toFixed(2);
        // Check if this is a money request - handle different data types
        const requestMoneyValue = task.request_money;
        const isRequestMoney = requestMoneyValue === 1 || 
                               requestMoneyValue === true || 
                               requestMoneyValue === "1" || 
                               String(requestMoneyValue).toLowerCase() === "true";
        
        console.log(`💰 Processing payment: ${paymentCSPR} CSPR, request_money: ${isRequestMoney}`);
        console.log(`   Current user: ${formatAddress(walletAddr)}`);
        console.log(`   Task creator: ${formatAddress(task.created_by)}`);
        console.log(`   Task assignee: ${formatAddress(task.assigned_to)}`);
        
        if (isRequestMoney) {
          // Request money: assignee pays creator
          // Open transfer page for assignee to pay creator
          const transferUrl = `https://testnet.cspr.live/transfer`;
          window.open(transferUrl, '_blank');
          console.log(`📂 Opened transfer page for assignee to pay creator: ${transferUrl}`);
          paymentMsg = ` Payment: ${paymentCSPR} CSPR (transfer page opened)`;
          addToast("Info", `Task completed! Transfer page opened. Please transfer ${paymentCSPR} CSPR to ${formatAddress(task.created_by, 6, 4)}.`, "info");
        } else {
          // Normal payment: creator pays assignee
          // Don't automatically open transfer page - creator can use "Make Payment" button if needed
          paymentMsg = ` Payment: ${paymentCSPR} CSPR (creator can transfer to assignee using "Make Payment" button)`;
          addToast("Info", `Task completed! Creator can transfer ${paymentCSPR} CSPR to assignee using the "Make Payment" button.`, "info");
        }
      }

      await upsertTask({
        ...task,
        completed: true,
        completed_by: walletAddr,
        completed_at: result.timestamp,
        tx_hash: result.txHash,
        rejected: 0 // Not rejected (accepted when completing money request)
      });

      addToast(
        "Task Completed!",
        `On-chain proof: ${formatAddress(result.txHash, 10, 8)}${paymentMsg}`,
        "success"
      );

      // Refresh circle data after completion (polling will also catch it)
      await refreshCircleData(circle.id);
      
      console.log("✅ Task completed and circle data refreshed");
    } catch (err) {
      console.error("❌ Failed to complete task:", err);
      addToast("Failed to Complete Task", err.message, "error");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };

  // ==================== Keyboard Shortcuts ====================
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Toggle help with '?' or 'Shift+/'
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
      // Close help with Escape
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showHelp]);

  // ==================== Effects ====================

  // Sync wallet connection state on mount (only if walletAddr is not already set)
  useEffect(() => {
    // Only restore if walletAddr is empty (not already connected)
    // Also check if localStorage was cleared (disconnect in progress)
    if (walletAddr) {
      return; // Already connected, don't restore
    }
    
    // Check if localStorage was cleared (indicates disconnect)
    const savedWallet = localStorage.getItem("carecircle_wallet");
    if (!savedWallet || !savedWallet.trim()) {
      return; // No saved wallet, don't restore
    }
    
    if (savedWallet && savedWallet.trim()) {
      // Restore connection state in casper module
      try {
        // Check if we can detect if this was an extension connection
        // For now, we'll assume manual key entry on restore (will be updated on next real connection)
        connectWithPublicKey(savedWallet);
        setWalletAddr(savedWallet);
        console.log("Restored wallet connection from localStorage");
        
        // Always try to fetch balance - returns { balance, isLive }
        getAccountBalance(savedWallet).then(result => {
          if (result && typeof result === 'object') {
            setWalletBalance(result.balance || "0");
            setIsAccountLive(result.isLive === true);
          } else {
            setWalletBalance(result || "0");
            setIsAccountLive(false);
          }
        }).catch(err => {
          console.error("Failed to fetch balance on restore:", err);
          setWalletBalance("0");
          setIsAccountLive(false);
        });
      } catch (err) {
        console.error("Failed to restore wallet connection:", err);
        // Clear invalid wallet from localStorage
        localStorage.removeItem("carecircle_wallet");
        setWalletAddr("");
        setWalletBalance("0");
      }
    }
  }, []); // Only run on mount

  // Fetch balance when wallet address changes and check if account is live
  useEffect(() => {
    if (walletAddr) {
      // Check if account is live on blockchain (for manual key entries)
      // This will update isWalletExtensionConnected if account is found
      checkAndUpdateAccountStatus(walletAddr).then(isLive => {
        if (isLive) {
          console.log("Account verified as live on blockchain");
        }
      }).catch(err => {
        console.warn("Failed to check if account is live:", err);
      });
      
      // Always try to fetch balance - returns { balance, isLive }
      // Works with or without extension - uses backend proxy
      getAccountBalance(walletAddr).then(result => {
        if (result && typeof result === 'object' && result.balance !== undefined) {
          const balance = String(result.balance || "0");
          const isLive = result.isLive === true;
          setWalletBalance(balance);
          setIsAccountLive(isLive);
          // Store mainPurseUref if available
          if (result.mainPurseUref) {
            setMainPurseUref(result.mainPurseUref);
          }
          // Note: isWalletExtensionConnected is updated inside getAccountBalance function
        } else {
          // Fallback for old format (string)
          setWalletBalance(result || "0");
          setIsAccountLive(false);
        }
      }).catch(err => {
        console.error("Failed to fetch balance:", err);
        setWalletBalance("0");
        setIsAccountLive(false);
      });
    } else {
      setWalletBalance("0");
    }
  }, [walletAddr]);

  // Load saved circle on mount (only if wallet is connected)
  useEffect(() => {
    // Don't restore circle if wallet is disconnected
    const savedWallet = localStorage.getItem("carecircle_wallet");
    if (!savedWallet || !savedWallet.trim()) {
      return; // Wallet disconnected, don't restore circle
    }
    
    const savedCircleId = localStorage.getItem("carecircle_circle_id");
    if (savedCircleId) {
      const id = parseInt(savedCircleId, 10);
      if (!isNaN(id)) {
        fetchCircle(id).then(circleData => {
          if (circleData) {
            setCircle({
              id: circleData.id,
              name: circleData.name,
              owner: circleData.owner,
              txHash: circleData.tx_hash
            });
            
            // Auto-connect wallet if not already connected
            const currentWallet = walletAddr || localStorage.getItem("carecircle_wallet");
            if (!currentWallet && circleData.owner) {
              try {
                const addr = connectWithPublicKey(circleData.owner);
                setWalletAddr(addr);
                localStorage.setItem("carecircle_wallet", addr);
                console.log("Wallet auto-connected on circle restore:", formatAddress(addr));
              } catch (err) {
                console.error("Failed to auto-connect wallet on restore:", err);
                // Continue anyway - circle is loaded
              }
            }
            refreshCircleData(id);
          }
        }).catch(console.error);
      }
    }
  }, [refreshCircleData, walletAddr]); // Add walletAddr as dependency

  // Fetch mainPurseUref for circle owner when circle is loaded (non-blocking)
  useEffect(() => {
    if (!circle || !circle.owner) {
      setMainPurseUref(null);
      return;
    }
    
    // If wallet address matches circle owner, mainPurseUref will be set from wallet balance fetch
    // Only fetch separately if wallet doesn't match circle owner
    if (walletAddr && walletAddr.toLowerCase() === circle.owner.toLowerCase()) {
      // Will be set by wallet balance fetch - no need to fetch again
      return;
    }
    
    // Fetch account data to get mainPurseUref for circle owner (non-blocking)
    // Use a small delay to avoid blocking initial render
    const fetchTimer = setTimeout(() => {
      getAccountBalance(circle.owner)
        .then(result => {
          if (result && result.mainPurseUref) {
            setMainPurseUref(result.mainPurseUref);
          }
        })
        .catch(err => {
          // Silently fail - don't block UI
          console.warn("Failed to fetch mainPurseUref for circle owner:", err);
        });
    }, 500); // Delay to not block initial render
    
    return () => clearTimeout(fetchTimer);
  }, [circle?.owner, walletAddr]);

  // Auto-refresh circle data periodically when circle is loaded
  useEffect(() => {
    if (!circle || !circle.id) return;
    
    // Refresh immediately when circle is loaded
    refreshCircleData(circle.id);
    
    // Set up polling to refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing circle data...");
      refreshCircleData(circle.id);
    }, 5000); // Refresh every 5 seconds
    
    // Cleanup interval on unmount or when circle changes
    return () => {
      clearInterval(refreshInterval);
    };
  }, [circle?.id, refreshCircleData]);

  // ==================== Filtered Data ====================
  const filteredTasks = tasks
    .filter((t) => {
      // Check if this is a money request - handle different data types
      const requestMoneyValue = t.request_money;
      const isRequestMoney = requestMoneyValue === 1 || 
                             requestMoneyValue === true || 
                             requestMoneyValue === "1" || 
                             String(requestMoneyValue).toLowerCase() === "true";
      
      // Status filters
    if (filter === "open") return !t.completed;
    if (filter === "completed") return t.completed;
      
      // Type filters
      if (filter === "money") return isRequestMoney;
      if (filter === "task") return !isRequestMoney;
      
      return true; // "all"
    })
    .sort((a, b) => {
      // Sort by creation date (latest first)
      // Use created_at if available, otherwise fall back to id (higher id = newer)
      const aTime = a.created_at || a.id || 0;
      const bTime = b.created_at || b.id || 0;
      return bTime - aTime; // Descending order (latest first)
    });
  
  // Calculate stats for money requests and task requests
  const moneyRequests = tasks.filter(t => (t.request_money === 1 || t.request_money === true));
  const taskRequests = tasks.filter(t => !(t.request_money === 1 || t.request_money === true));

  // ==================== Render ====================
  return (
    <div className="app-container">
      {/* Loading overlay */}
      {loadingMessage && <LoadingOverlay message={loadingMessage} />}

      {/* Toast notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        activeTab={helpTab}
        setActiveTab={setHelpTab}
      />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
              <div className="logo-icon">
                <AnimatedLogo />
          </div>
              <div className="logo-wordmark">
                <span className="logo-text">CareCircle</span>
          <span className="logo-badge">
            <span>◆</span> CASPER HACKATHON 2026
          </span>
          </div>
          </div>
          <nav className="top-tabs" aria-label="Primary navigation">
            {!circle ? (
              <>
                <button
                  className={`top-tab top-tab-about ${page === "about" ? "active" : ""}`}
                  onClick={() => navigateTo("about")}
                  aria-current={page === "about" ? "page" : undefined}
                >
                  <span>About</span>
                  {page === "about" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab ${page === "home" ? "active" : ""}`}
                  onClick={() => navigateTo("home")}
                  aria-current={page === "home" ? "page" : undefined}
                >
                  <span>Get Started</span>
                  {page === "home" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab ${page === "support" ? "active" : ""}`}
                  onClick={() => navigateTo("support")}
                  aria-current={page === "support" ? "page" : undefined}
                >
                  <span>Support</span>
                  {page === "support" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab top-tab-help ${page === "help" ? "active" : ""}`}
                  onClick={() => navigateTo("help")}
                  aria-current={page === "help" ? "page" : undefined}
                >
                  <span>Help</span>
                  {page === "help" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
              </>
            ) : (
              <>
                <button
                  className={`top-tab top-tab-about ${page === "about" ? "active" : ""}`}
                  onClick={() => navigateTo("about")}
                  aria-current={page === "about" ? "page" : undefined}
                >
                  <span>About</span>
                  {page === "about" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab ${page === "my-circle" ? "active" : ""}`}
                  onClick={() => navigateTo("my-circle")}
                  aria-current={page === "my-circle" ? "page" : undefined}
                >
                  <span>My Circle</span>
                  {page === "my-circle" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab ${page === "support" ? "active" : ""}`}
                  onClick={() => navigateTo("support")}
                  aria-current={page === "support" ? "page" : undefined}
                >
                  <span>Support</span>
                  {page === "support" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
                <button
                  className={`top-tab top-tab-help ${page === "help" ? "active" : ""}`}
                  onClick={() => navigateTo("help")}
                  aria-current={page === "help" ? "page" : undefined}
                >
                  <span>Help</span>
                  {page === "help" && <span className="tab-caret" aria-hidden="true">▾</span>}
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="wallet-section">
          {walletAddr ? (
            <>
              <div className="wallet-info">
                <div className="wallet-label">My Wallet</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(walletAddr);
                        addToast("Copied!", "Wallet address copied to clipboard", "success");
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement("textarea");
                        textArea.value = walletAddr;
                        textArea.style.position = "fixed";
                        textArea.style.opacity = "0";
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand("copy");
                          addToast("Copied!", "Wallet address copied to clipboard", "success");
                        } catch (fallbackErr) {
                          addToast("Error", "Failed to copy address", "error");
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title="Copy wallet address"
                  >
                    📋
                  </button>
                  <a
                    href={`https://testnet.cspr.live/account/${walletAddr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-address-link"
                    onClick={(e) => {
                      // Allow link to open, but also copy on click
                      e.stopPropagation();
                    }}
                  >
                    {formatAddress(walletAddr)}
                    <span className="wallet-link-icon">↗</span>
                  </a>
              </div>
                {walletAddr && (() => {
                  // Use actual balance from API if account is live, otherwise show demo value
                  let balanceStr = "0.00";
                  if (isAccountLive) {
                    // Account is live - use actual balance from API
                    balanceStr = walletBalance && walletBalance !== "0" ? walletBalance : "0.00";
                  } else {
                    // Account is not live - show demo value
                    balanceStr = "1,234.56";
                  }
                  const balanceNum = parseFloat(balanceStr.replace(/,/g, "")) || 0;
                  const balanceColor = balanceNum >= 1 ? "var(--care-green)" : balanceNum > 0 ? "#eab308" : "#ef4444";
                  return (
                    <div className="wallet-balance" style={{ marginTop: "4px", fontSize: "0.75rem", fontWeight: 500 }}>
                      <span style={{ color: "var(--text-primary)" }}>Available Balance: </span>
                      <span style={{ color: balanceColor }}>{balanceStr} CSPR</span>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={handleDisconnect}
                  disabled={busy}
                  type="button"
                >
                  {busy ? "Disconnecting..." : "Disconnect"}
              </button>
                {!isAccountLive && (
                  <div className="network-indicator" style={{ fontSize: "0.75rem", textAlign: "center" }}>
                    <span className={`network-dot demo`}></span>
                    Demo Mode
                  </div>
                )}
                {isAccountLive && (
                  <div className="network-indicator" style={{ fontSize: "0.75rem", textAlign: "center", color: "var(--care-green)" }}>
                    <span className={`network-dot`} style={{ background: "var(--care-green)" }}></span>
                    Live Account
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleConnect} disabled={busy}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Pages (when no circle) */}
      {!circle && page === "home" && (
        <section className="page animate-in" id="get-started">
          <div className="get-started">
            <div className="get-started-panel card page-card">
              <div className="get-started-body">
                <div className="get-started-grid">
                  <div className="card hero-info-col">
                    <div className="hero-info-title">1) Connect Wallet</div>
                    <div className="hero-info-text" style={{ marginBottom: 14 }}>
                      {walletAddr
                        ? "Wallet connected. You're ready to set up your CareCircle."
                        : "Connect your Casper Wallet for live signing, or use demo mode with a public key."}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={handleConnect} disabled={busy || !!walletAddr}>
                        {walletAddr ? "Connected" : busy ? "Connecting..." : "Connect Wallet"}
                      </button>
                    </div>
                  </div>

                  <div className="card hero-info-col">
                    <div className="hero-info-title">2) Setup CareCircle</div>
                    <div className="hero-info-text" style={{ marginBottom: 14 }}>
                      Create a new circle or load an existing one using a Circle ID.
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={() => setShowCreateCircle(true)} disabled={!walletAddr}>
                        Create New Circle
                      </button>
                      <button className="btn btn-primary" onClick={() => setShowLoadCircle(true)}>
                        Load Existing Circle
                      </button>
                    </div>
                    {!walletAddr && (
                      <div className="text-xs text-muted" style={{ marginTop: 10 }}>
                        Connect a wallet to create a new circle. Loading existing circle works anytime.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "about" && (
        <section className="page animate-in">
          <section className="hero animate-in" style={{ paddingTop: 24, paddingBottom: 32 }}>
            <h1 className="hero-title">Caregiving, Verified On-Chain</h1>
          <p className="hero-subtitle">
              CareCircle coordinates caregiving tasks for families, elder care, and community volunteers - with verifiable
              task completion proofs recorded on the Casper blockchain.
            </p>

            <div className="hero-steps" aria-label="How it works">
              <div className="hero-step">
                <div className="hero-step-num">1</div>
                <div className="hero-step-content">
                  <div className="hero-step-title">Connect Wallet</div>
                  <div className="hero-step-desc">Use Casper Wallet (or demo key) to sign actions.</div>
            </div>
            </div>
              <div className="hero-step-arrow" aria-hidden="true">
                <span className="hero-step-arrow-icon">→</span>
            </div>
              <div className="hero-step">
                <div className="hero-step-num">2</div>
                <div className="hero-step-content">
                  <div className="hero-step-title">Create / Load Circle</div>
                  <div className="hero-step-desc">Start a care team, or load an existing Circle ID.</div>
                </div>
              </div>
              <div className="hero-step-arrow" aria-hidden="true">
                <span className="hero-step-arrow-icon">→</span>
              </div>
              <div className="hero-step">
                <div className="hero-step-num">3</div>
                <div className="hero-step-content">
                  <div className="hero-step-title">Create Requests</div>
                  <div className="hero-step-desc">Create task requests or money requests, set priority, and assign to members.</div>
                </div>
              </div>
              <div className="hero-step-arrow" aria-hidden="true">
                <span className="hero-step-arrow-icon">→</span>
              </div>
              <div className="hero-step">
                <div className="hero-step-num">4</div>
                <div className="hero-step-content">
                  <div className="hero-step-title">Complete & Pay</div>
                  <div className="hero-step-desc">Complete tasks or accept/reject money requests. Payments are processed automatically with on-chain verification.</div>
                </div>
            </div>
          </div>

            <div className="hero-cta-row">
            <button
              className="btn btn-primary btn-lg"
                onClick={() => circle ? navigateTo("my-circle") : navigateTo("home")}
            >
                {circle ? "Go To My Circle →" : "Get Started →"}
            </button>
              <button className="hero-secondary-link" onClick={() => navigateTo("help")}>
                Have questions? Visit Help <span aria-hidden="true">→</span>
            </button>
          </div>
          </section>

          {/* About details removed per request */}
        </section>
      )}

      {!circle && page === "support" && (
        <section className="page animate-in">
          <div className="card page-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">🛟</span>
                Support
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateTo("home")}>
                ← Back
              </button>
            </div>

            <div style={{ padding: "24px 0" }}>
              {/* Quick Links */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Quick Links</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <a href={`${API}/docs`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    📚 API Documentation
                  </a>
                  <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    🔍 Casper Explorer
                  </a>
                  <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    💧 Testnet Faucet
                  </a>
                  <a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    📖 Casper Docs
                  </a>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigateTo("help")}>
                    ❓ Help Center
                  </button>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="hero-info-grid" style={{ marginBottom: "32px" }}>
                <div className="card hero-info-col">
                  <div className="hero-info-title">🔌 API Documentation</div>
                  <div className="hero-info-text">
                    <p style={{ marginBottom: "12px" }}>
                      Access the interactive Swagger API documentation to explore all available endpoints, request/response schemas, and test API calls.
                    </p>
                    <a href={`${API}/docs`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                      Open Swagger UI →
                    </a>
                  </div>
                </div>
                <div className="card hero-info-col">
                  <div className="hero-info-title">⛓️ Casper Blockchain</div>
                  <div className="hero-info-text">
                    <p style={{ marginBottom: "12px" }}>
                      Explore transactions, get testnet tokens, and learn about the Casper blockchain infrastructure.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                        Testnet Explorer →
                      </a>
                      <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                        Get Testnet Tokens →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Troubleshooting</h3>
                <div className="card" style={{ padding: "20px", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>❌ Wallet Connection Issues</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Ensure the Casper Wallet extension is installed and enabled</li>
                        <li>Check that you're on the correct network (Casper Testnet)</li>
                        <li>Try refreshing the page and reconnecting your wallet</li>
                        <li>Clear browser cache if connection persists</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>⚠️ Transaction Failures</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Verify you have sufficient CSPR tokens for gas fees</li>
                        <li>Check your internet connection and try again</li>
                        <li>Ensure the API server is running ({API.replace(/^https?:\/\//, '')})</li>
                        <li>Review transaction details in the Casper Explorer</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>🔍 Circle Not Loading</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Verify the Circle ID is correct</li>
                        <li>Check that the circle exists on-chain</li>
                        <li>Try loading by wallet key instead of Circle ID</li>
                        <li>Ensure you're connected with the correct wallet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>System Information</h3>
                <div className="card" style={{ padding: "20px", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "0.9rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Network</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {isDemoMode() ? "Demo Mode" : "Casper Testnet"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>API Server</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {API.replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Wallet Status</div>
                      <div style={{ color: walletAddr ? "var(--care-green)" : "var(--text-muted)", fontWeight: 500 }}>
                        {walletAddr ? "Connected" : "Not Connected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Resources */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Additional Resources</h3>
                <div className="hero-info-grid">
                  <div className="card hero-info-col">
                    <div className="hero-info-title">📚 Documentation</div>
                    <div className="hero-info-text">
                      <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li><a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Network Docs</a></li>
                        <li><a href="https://casper.network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Official Website</a></li>
                        <li><a href="https://github.com/casper-network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper GitHub</a></li>
                      </ul>
                    </div>
                  </div>
                  <div className="card hero-info-col">
                    <div className="hero-info-title">💬 Community</div>
                    <div className="hero-info-text">
                      <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li><a href="https://discord.gg/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Discord</a></li>
                        <li><a href="https://twitter.com/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Twitter</a></li>
                        <li><a href="https://t.me/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Telegram</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!circle && page === "help" && (
        <section className="page animate-in">
          <div className="card page-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">❓</span>
                Help
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateTo("home")}>
                ← Back
              </button>
            </div>
            <HelpPanel activeTab={helpTab} setActiveTab={setHelpTab} maxHeight="none" />
          </div>
        </section>
      )}

      {/* Join Circle Page (from invitation) */}
      {page === "join" && (
        <section className="page animate-in">
          <div className="card page-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">💚</span>
                Join Care Circle
              </h2>
            </div>
            <div className="modal-body">
              {!invitationData ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 20px" }}></div>
                  <p>Loading invitation...</p>
                </div>
              ) : invitationData.error ? (
                <div>
                  <div className="notice notice-error mb-4">
                    <div className="notice-icon">✕</div>
                    <div className="notice-body">
                      <div className="notice-title">Invalid Invitation</div>
                      <div className="notice-text">
                        {invitationData.error === "Invitation not found or already used" 
                          ? "This invitation has already been used or doesn't exist."
                          : invitationData.error === "Invitation has expired"
                          ? "This invitation has expired. Please request a new invitation."
                          : invitationData.error}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ marginTop: "20px" }}>
                    <button className="btn btn-primary" onClick={() => navigateTo("home")}>
                      Go to Get Started
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="notice notice-info mb-4">
                    <div className="notice-icon">ℹ</div>
                    <div className="notice-body">
                      <div className="notice-title">You're Invited!</div>
                      <div className="notice-text">
                        <strong>{invitationData.inviter_name || "A circle owner"}</strong> has invited you to join{" "}
                        <strong>{invitationData.circle_name}</strong> as <strong>{invitationData.member_name}</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Your Casper Address</label>
                    <input
                      className="input input-mono"
                      placeholder="01... (your Casper public key)"
                      value={joinAddress}
                      onChange={(e) => setJoinAddress(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAcceptInvitation()}
                      autoFocus
                    />
                    <p className="text-xs text-muted mt-2">
                      Enter your Casper wallet public key to join this care circle.
                    </p>
                  </div>

                  {!walletAddr && (
                    <div className="notice notice-warning mb-4">
                      <div className="notice-icon">⚠</div>
                      <div className="notice-body">
                        <div className="notice-title">Connect Your Wallet</div>
                        <div className="notice-text">
                          You can connect your wallet first, or enter your public key manually above.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => navigateTo("home")}>
                      Cancel
            </button>
            <button
                      className="btn btn-primary" 
                      onClick={handleAcceptInvitation}
                      disabled={busy || (!joinAddress.trim() && !walletAddr)}
            >
                      {busy ? "Joining..." : "Join Circle"}
            </button>
          </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Support page when circle is loaded */}
      {circle && page === "support" && (
        <section className="page animate-in">
          <div className="card page-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">🛟</span>
                Support
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateTo("my-circle")}>
                ← Back to My Circle
              </button>
            </div>

            <div style={{ padding: "24px 0" }}>
              {/* Quick Links */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Quick Links</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <a href={`${API}/docs`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    📚 API Documentation
                  </a>
                  <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    🔍 Casper Explorer
                  </a>
                  <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    💧 Testnet Faucet
                  </a>
                  <a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    📖 Casper Docs
                  </a>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigateTo("help")}>
                    ❓ Help Center
                  </button>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="hero-info-grid" style={{ marginBottom: "32px" }}>
                <div className="card hero-info-col">
                  <div className="hero-info-title">🔌 API Documentation</div>
                  <div className="hero-info-text">
                    <p style={{ marginBottom: "12px" }}>
                      Access the interactive Swagger API documentation to explore all available endpoints, request/response schemas, and test API calls.
                    </p>
                    <a href={`${API}/docs`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                      Open Swagger UI →
                    </a>
                  </div>
                </div>
                <div className="card hero-info-col">
                  <div className="hero-info-title">⛓️ Casper Blockchain</div>
                  <div className="hero-info-text">
                    <p style={{ marginBottom: "12px" }}>
                      Explore transactions, get testnet tokens, and learn about the Casper blockchain infrastructure.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                        Testnet Explorer →
                      </a>
                      <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline" }}>
                        Get Testnet Tokens →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Circle-Specific Information */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Your Circle</h3>
                <div className="card" style={{ padding: "20px", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "0.9rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Circle Name</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{circle.name}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Circle ID</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{circle.id}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Members</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{members.length}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Requests</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{stats.total_tasks} total</div>
                    </div>
                    {circle.txHash && (
                      <div>
                        <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Creation Transaction</div>
                        <a href={getExplorerUrl(circle.txHash)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "underline", fontSize: "0.85rem" }}>
                          View on Explorer →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Troubleshooting</h3>
                <div className="card" style={{ padding: "20px", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>❌ Task Not Completing</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Ensure you're the assigned member for the task</li>
                        <li>Check that you have sufficient CSPR for gas fees</li>
                        <li>Verify your wallet is connected and unlocked</li>
                        <li>Review the transaction in the Casper Explorer</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>👥 Member Management</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Only circle owners can add new members</li>
                        <li>Verify member addresses before adding</li>
                        <li>Members can update their own profile names</li>
                        <li>Check member status in the Circle section</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>📊 Data Not Updating</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                        <li>Refresh the page to reload data from the API</li>
                        <li>Check API server connection ({API.replace(/^https?:\/\//, '')})</li>
                        <li>Verify blockchain transactions completed successfully</li>
                        <li>Wait a few seconds for on-chain data to sync</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>System Information</h3>
                <div className="card" style={{ padding: "20px", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "0.9rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Network</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {isDemoMode() ? "Demo Mode" : "Casper Testnet"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>API Server</div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {API.replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Wallet Status</div>
                      <div style={{ color: walletAddr ? "var(--care-green)" : "var(--text-muted)", fontWeight: 500 }}>
                        {walletAddr ? "Connected" : "Not Connected"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Wallet Balance</div>
                      <div style={{ color: walletAddr ? (() => {
                        const balanceStr = isDemoMode() ? "1,234.56" : (walletBalance !== "0" ? walletBalance : "0.00");
                        const balanceNum = parseFloat(balanceStr.replace(/,/g, "")) || 0;
                        return balanceNum >= 1 ? "var(--care-green)" : balanceNum > 0 ? "#eab308" : "#ef4444";
                      })() : "var(--text-muted)", fontWeight: 500 }}>
                        {walletAddr ? (isDemoMode() ? "1,234.56" : (walletBalance !== "0" ? walletBalance : "0.00")) + " CSPR" : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Resources */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Additional Resources</h3>
                <div className="hero-info-grid">
                  <div className="card hero-info-col">
                    <div className="hero-info-title">📚 Documentation</div>
                    <div className="hero-info-text">
                      <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li><a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Network Docs</a></li>
                        <li><a href="https://casper.network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Official Website</a></li>
                        <li><a href="https://github.com/casper-network" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper GitHub</a></li>
                      </ul>
                    </div>
                  </div>
                  <div className="card hero-info-col">
                    <div className="hero-info-title">💬 Community</div>
                    <div className="hero-info-text">
                      <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                        <li><a href="https://discord.gg/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Discord</a></li>
                        <li><a href="https://twitter.com/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Twitter</a></li>
                        <li><a href="https://t.me/casperblockchain" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>Casper Telegram</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {circle && page === "help" && (
        <section className="page animate-in">
          <div className="card page-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">❓</span>
                Help
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigateTo("my-circle")}>
                ← Back to My Circle
              </button>
            </div>
            <HelpPanel activeTab={helpTab} setActiveTab={setHelpTab} maxHeight="none" />
          </div>
        </section>
      )}

      {/* Main content (when circle exists - show only for my-circle page) */}
      {circle && page === "my-circle" && (
        <>
          {/* Stats bar */}
          <div className="stats-bar animate-in">
            <StatCard icon="📊" value={stats.total_tasks} label="Total Requests" />
            <StatCard icon="✅" value={stats.completed_tasks} label="Completed" />
            <StatCard icon="⏳" value={stats.open_tasks} label="Open" />
            <StatCard icon="📈" value={`${stats.completion_rate}%`} label="Completion Rate" />
          </div>

          {/* Main grid */}
          <div className="main-grid">
            {/* Circle sidebar */}
            <div className="circle-card card animate-in stagger-1">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-title-icon">🏠</span>
                  Circle
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={handleLeaveCircle}>
                  Exit
                </button>
              </div>

              <div className="circle-info">
                <div className="circle-avatar">💚</div>
                <div className="circle-details">
                  <h3>{circle.name}</h3>
                  <div className="circle-meta">
                    <span>ID: {circle.id}</span>
                    <span>•</span>
                    <span>{members.length} members</span>
                  </div>
                </div>
              </div>

              {walletAddr && (
                <div style={{ marginTop: "12px", marginBottom: "20px" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleEditProfile}
                    disabled={busy}
                    style={{ width: "100%" }}
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
              )}

              {circle.txHash && (
                <div className="task-tx mb-4">
                  <span>🔗</span>
                  <a 
                    href={mainPurseUref ? `https://testnet.cspr.live/uref/${mainPurseUref}` : getExplorerUrl(circle.txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Main Purse ↗
                  </a>
                </div>
              )}

              {/* Members section */}
              <div className="members-section">
                <div className="members-header">
                  <span className="members-title">Members ({members.length})</span>
                  {walletAddr.toLowerCase() === circle.owner?.toLowerCase() && (
                <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAddMember(true)}
                  disabled={busy}
                      style={{ marginLeft: "auto" }}
                >
                  + Add Member
                </button>
                  )}
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-muted">No members loaded</p>
                ) : (
                  members.map((m, i) => (
                    <MemberItem
                      key={i}
                      address={m.address}
                      name={m.name}
                      isOwner={m.isOwner}
                      isCurrentUser={m.address?.toLowerCase() === walletAddr?.toLowerCase()}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Requests section */}
            <div className="card animate-in stagger-2">
              <div className="tasks-header" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  <span className="card-title-icon">📋</span>
                  Requests
                </h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
                  <button
                    className="btn btn-care btn-sm"
                    onClick={() => setShowAddTask(true)}
                    disabled={busy}
                  >
                    + Add Task
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRequestMoney(true)}
                    disabled={busy}
                    style={{ background: "rgba(251, 191, 36, 0.1)", color: "#fbbf24", borderColor: "rgba(251, 191, 36, 0.3)" }}
                  >
                    💸 Request Money
                  </button>
                </div>
                <div className="tasks-filters" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className={`filter-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    All ({stats.total_tasks})
                  </button>
                  <button
                    className={`filter-btn ${filter === "money" ? "active" : ""}`}
                    onClick={() => setFilter("money")}
                  >
                    💸 Money ({moneyRequests.length})
                  </button>
                  <button
                    className={`filter-btn ${filter === "task" ? "active" : ""}`}
                    onClick={() => setFilter("task")}
                  >
                    📋 Tasks ({taskRequests.length})
                  </button>
                  <button
                    className={`filter-btn ${filter === "open" ? "active" : ""}`}
                    onClick={() => setFilter("open")}
                  >
                    Open ({stats.open_tasks})
                  </button>
                  <button
                    className={`filter-btn ${filter === "completed" ? "active" : ""}`}
                    onClick={() => setFilter("completed")}
                  >
                    Completed ({stats.completed_tasks})
                  </button>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3>No requests yet</h3>
                  <p>
                    {filter === "all"
                      ? "Create your first request to start coordinating care activities."
                      : filter === "money"
                        ? "No money requests found."
                        : filter === "task"
                          ? "No task requests found."
                      : filter === "open"
                            ? "All requests have been completed! Great work."
                            : "No completed requests yet. Complete a request to see it here."}
                  </p>
                  {filter === "all" && (
                    <button
                      className="btn btn-care mt-4"
                      onClick={() => setShowAddTask(true)}
                    >
                      + Create First Request
                    </button>
                  )}
                </div>
              ) : (
                <div className="tasks-list">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      onMakePayment={handleMakePayment}
                      onReject={handleRejectMoneyRequest}
                      walletAddr={walletAddr}
                      busy={busy}
                      members={members}
                      mainPurseUref={mainPurseUref}
                      addToast={addToast}
                      onViewDetails={(task) => {
                        setSelectedTask(task);
                        setTaskAssignTo(task.assigned_to || "");
                        setShowTaskDetails(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" className="footer-link">
            🔍 Casper Testnet Explorer
          </a>
          <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer" className="footer-link">
            🚰 Testnet Faucet
          </a>
          <a href="https://docs.casper.network" target="_blank" rel="noopener noreferrer" className="footer-link">
            📚 Casper Docs
          </a>
          <a href="https://odra.dev/docs" target="_blank" rel="noopener noreferrer" className="footer-link">
            🛠️ Odra Framework
          </a>
        </div>
        <p className="footer-text">
          Built with 💜 for <a href="https://casper.network">Casper Hackathon 2026</a>
        </p>
      </footer>

      {/* ==================== Modals ==================== */}

      {/* Connect Wallet Modal (Demo Mode) */}
      <Modal
        isOpen={showConnectWallet}
        onClose={() => setShowConnectWallet(false)}
        title="Connect Wallet"
        size="lg"
      >
        <div className="modal-body">
          <div className="notice notice-warning mb-4">
            <div className="notice-icon">⚠</div>
            <div className="notice-body">
              <div className="notice-title">Casper Wallet not detected</div>
              <div className="notice-text">
                Install the Casper Wallet extension for live blockchain transactions, or enter a Casper public key
                below to continue in demo mode.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
            <div className="text-sm" style={{ lineHeight: 1.5 }}>
              <div style={{ marginBottom: "8px" }}><strong>To use live blockchain:</strong></div>
              <ol style={{ margin: 0, paddingLeft: "18px" }}>
                <li>Install Casper Wallet extension</li>
                <li>Refresh this page</li>
              </ol>
              <div style={{ marginTop: "10px" }}>
                <strong>For demo mode:</strong> enter a Casper public key below.
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Casper Public Key</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <input
              className="input input-mono"
              value={demoWalletKey}
              onChange={(e) => setDemoWalletKey(e.target.value)}
              placeholder="02... (hex)"
              onKeyDown={(e) => e.key === "Enter" && handleConnectDemoWallet()}
              autoFocus
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadDemoKey}
                style={{ whiteSpace: "nowrap" }}
              >
                Load Demo Key
              </button>
            </div>
            {demoWalletError && (
              <p className="text-sm" style={{ marginTop: "8px", color: "#f87171" }}>
                {demoWalletError}
              </p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowConnectWallet(false)} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConnectDemoWallet} disabled={busy}>
            {busy ? "Connecting..." : "Connect"}
          </button>
        </div>
      </Modal>

      {/* Create Circle Modal */}
      <Modal
        isOpen={showCreateCircle}
        onClose={() => setShowCreateCircle(false)}
        title="Create Care Circle"
      >
        <div className="modal-body">
          <p className="text-muted mb-4">
            A Care Circle is a group of people coordinating caregiving activities.
            As the creator, you'll be the owner and can add members.
          </p>

          <div className="input-group">
            <label>Circle Name</label>
            <input
              className="input"
              placeholder="e.g., Mom's Care Team"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCircle()}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCreateCircle(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCreateCircle} disabled={busy}>
            {busy ? "Creating..." : "Create Circle"}
          </button>
        </div>
      </Modal>

      {/* Load Circle Modal */}
      <Modal
        isOpen={showLoadCircle}
        onClose={() => {
          setShowLoadCircle(false);
          setLoadCircleMode("id");
          setCircleIdToLoad("");
          setWalletKeyToLoad("");
        }}
        title="Load Existing Circle"
      >
        <div className="modal-body">
          <p className="text-muted mb-4">
            Load a circle by ID or by wallet key used to create it.
          </p>

          {/* Mode selector */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", padding: "4px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
            <button
              type="button"
              className={`btn ${loadCircleMode === "id" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setLoadCircleMode("id")}
              style={{ flex: 1 }}
            >
              By Circle ID
            </button>
            <button
              type="button"
              className={`btn ${loadCircleMode === "wallet" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setLoadCircleMode("wallet")}
              style={{ flex: 1 }}
            >
              By Wallet Key
            </button>
          </div>

          {loadCircleMode === "id" ? (
            <>
          <div className="input-group">
            <label>Circle ID</label>
            <input
              className="input"
              placeholder="e.g., 1"
              type="number"
              min="1"
              value={circleIdToLoad}
              onChange={(e) => setCircleIdToLoad(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadCircle()}
                  autoFocus
            />
          </div>

          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(14,165,233,0.1)", borderRadius: "8px" }}>
            <p className="text-sm" style={{ color: "#0ea5e9" }}>
              💡 <strong>Try ID: 1</strong> to see the demo circle with sample data
            </p>
          </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Wallet Key</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <input
                    className="input input-mono"
                    placeholder="02... (hex)"
                    value={walletKeyToLoad}
                    onChange={(e) => setWalletKeyToLoad(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoadCircle()}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  {walletAddr && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setWalletKeyToLoad(walletAddr)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Use Current
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
                <p className="text-sm" style={{ color: "var(--brand)" }}>
                  💡 Enter the wallet key (public key) used to create the circle. If multiple circles exist, the most recent one will be loaded.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowLoadCircle(false);
              setLoadCircleMode("id");
              setCircleIdToLoad("");
              setWalletKeyToLoad("");
            }}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleLoadCircle} disabled={busy}>
            {busy ? "Loading..." : "Load Circle"}
          </button>
        </div>
      </Modal>

      {/* Circle Created Confirmation Modal */}
      <Modal
        isOpen={showCircleCreated}
        onClose={() => setShowCircleCreated(false)}
        title="Circle Created Successfully!"
      >
        <div className="modal-body">
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ 
              fontSize: "48px", 
              marginBottom: "16px",
              lineHeight: 1
            }}>✅</div>
            <h3 style={{ 
              marginBottom: "12px", 
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-primary)"
            }}>
              {createdCircleName}
            </h3>
            <p className="text-muted" style={{ marginBottom: "24px" }}>
              Your Care Circle has been created and saved to the database.
            </p>
          </div>

          <div style={{ 
            padding: "20px", 
            background: "rgba(34, 197, 94, 0.1)", 
            borderRadius: "12px",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            marginBottom: "20px"
          }}>
            <div style={{ marginBottom: "8px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Care Circle ID
            </div>
            <div style={{ 
              fontSize: "2rem", 
              fontWeight: 700, 
              color: "var(--brand)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em"
            }}>
              {createdCircleId}
            </div>
          </div>

          <div style={{ 
            padding: "16px", 
            background: "rgba(255, 255, 255, 0.03)", 
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            lineHeight: 1.6
          }}>
            <strong style={{ color: "var(--text-primary)" }}>Important:</strong> Save this Circle ID to share with members or to load your circle later. The circle has been saved to the database with your wallet key.
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setShowCircleCreated(false);
              setCreatedCircleId(null);
              setCreatedCircleName("");
            }}
            style={{ width: "100%" }}
          >
            Got it!
          </button>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddTask}
        onClose={() => {
          setShowAddTask(false);
          setNewTaskTitle("");
          setNewTaskDescription("");
          setNewTaskAssignee("");
          setNewTaskPriority(1);
          setNewTaskPayment("");
          setNewTaskRequestMoney(false);
        }}
        title="Add New Task"
      >
        <div className="modal-body">
          <div className="input-group mb-4">
            <label>Task Title *</label>
            <input
              className="input"
              placeholder="e.g., Pick up medication"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
          </div>

          <div className="input-group mb-4">
            <label>Description (optional)</label>
            <input
              className="input"
              placeholder="e.g., From CVS pharmacy on Main St"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />
          </div>

          <div className="input-group mb-4">
            <label>Priority</label>
            <select
              className="input"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(parseInt(e.target.value))}
            >
              <option value={0}>Low</option>
              <option value={1}>Medium</option>
              <option value={2}>High</option>
              <option value={3}>Urgent</option>
            </select>
          </div>

          <div className="input-group">
            <label>Assign To (Leave empty to assign later)</label>
            <select
              className="input"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
            >
              <option value="">-- Not Assigned --</option>
              {members.map((member) => (
                <option key={member.address} value={member.address}>
                  {member.name || formatAddress(member.address)}
                  {member.isOwner && " (Owner)"}
                  {member.address?.toLowerCase() === walletAddr?.toLowerCase() && " (you)"}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Payment Amount (CSPR)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={newTaskPayment}
              onChange={(e) => setNewTaskPayment(e.target.value)}
            />
            <p className="text-xs text-muted mt-2">
              Optional. Amount to pay the assignee when task is completed. Money will be transferred from you to assignee.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => {
            setShowAddTask(false);
            setNewTaskTitle("");
            setNewTaskDescription("");
            setNewTaskAssignee("");
            setNewTaskPriority(1);
            setNewTaskPayment("");
          }}>
            Cancel
          </button>
          <button className="btn btn-care" onClick={handleCreateTask} disabled={busy}>
            {busy ? "Creating..." : "Create Task"}
          </button>
        </div>
      </Modal>

      {/* Request Money Modal */}
      <Modal
        isOpen={showRequestMoney}
        onClose={() => {
          setShowRequestMoney(false);
          setRequestMoneyTitle("");
          setRequestMoneyDescription("");
          setRequestMoneyAssignee("");
          setRequestMoneyPriority(1);
          setRequestMoneyAmount("");
        }}
        title="Request Money"
      >
        <div className="modal-body">
          <div className="input-group mb-4">
            <label>Task Title *</label>
            <input
              className="input"
              placeholder="e.g., Reimburse for groceries"
              value={requestMoneyTitle}
              onChange={(e) => setRequestMoneyTitle(e.target.value)}
            />
          </div>

          <div className="input-group mb-4">
            <label>Description (optional)</label>
            <input
              className="input"
              placeholder="e.g., Groceries purchased on Main St"
              value={requestMoneyDescription}
              onChange={(e) => setRequestMoneyDescription(e.target.value)}
            />
          </div>

          <div className="input-group mb-4">
            <label>Priority</label>
            <select
              className="input"
              value={requestMoneyPriority}
              onChange={(e) => setRequestMoneyPriority(parseInt(e.target.value))}
            >
              <option value={0}>Low</option>
              <option value={1}>Medium</option>
              <option value={2}>High</option>
              <option value={3}>Urgent</option>
            </select>
          </div>

          <div className="input-group mb-4">
            <label>Assign To *</label>
            <select
              className="input"
              value={requestMoneyAssignee}
              onChange={(e) => setRequestMoneyAssignee(e.target.value)}
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member.address} value={member.address}>
                  {member.name || formatAddress(member.address)}
                  {member.isOwner && " (Owner)"}
                  {member.address?.toLowerCase() === walletAddr?.toLowerCase() && " (you)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-2">
              Select the member who will pay you when this task is completed.
            </p>
          </div>

          <div className="input-group">
            <label>Amount to Request (CSPR) *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={requestMoneyAmount}
              onChange={(e) => setRequestMoneyAmount(e.target.value)}
            />
            <p className="text-xs text-muted mt-2">
              Amount to request from the assignee. When the task is completed, this amount will be transferred from the assignee to you.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => {
            setShowRequestMoney(false);
            setRequestMoneyTitle("");
            setRequestMoneyDescription("");
            setRequestMoneyAssignee("");
            setRequestMoneyPriority(1);
            setRequestMoneyAmount("");
          }}>
            Cancel
          </button>
          <button 
            className="btn btn-care" 
            onClick={handleCreateMoneyRequest} 
            disabled={busy}
            style={{ background: "rgba(251, 191, 36, 0.2)", color: "#fbbf24", borderColor: "rgba(251, 191, 36, 0.4)" }}
          >
            {busy ? "Creating..." : "💸 Create Money Request"}
          </button>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => {
          setShowAddMember(false);
          setNewMemberAddr("");
          setNewMemberName("");
          setNewMemberEmail("");
          setMemberInviteMode("address");
        }}
        title="Add Circle Member"
      >
        <div className="modal-body">
          <p className="text-muted mb-4">
            Add a family member, caregiver, or volunteer to your care circle.
            They'll be able to view tasks and complete assigned work.
          </p>

          <div className="input-group mb-4">
            <label>Invite Method</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className={`btn ${memberInviteMode === "address" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMemberInviteMode("address")}
                style={{ flex: 1 }}
              >
                By Casper Address
              </button>
              <button
                type="button"
                className={`btn ${memberInviteMode === "email" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMemberInviteMode("email")}
                style={{ flex: 1 }}
              >
                By Email
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Member Name</label>
            <input
              className="input"
              placeholder="e.g., John Doe"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (memberInviteMode === "email" ? handleInviteByEmail() : handleAddMember())}
              autoFocus
            />
          </div>

          {memberInviteMode === "address" ? (
          <div className="input-group">
            <label>Member's Casper Address</label>
            <input
              className="input input-mono"
              placeholder="01..."
              value={newMemberAddr}
              onChange={(e) => setNewMemberAddr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            />
          </div>
          ) : (
            <div className="input-group">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="member@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
              />
              <p className="text-xs text-muted mt-2">
                An invitation email will be sent with a link to join the care circle.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowAddMember(false);
              setNewMemberAddr("");
              setNewMemberName("");
              setNewMemberEmail("");
              setMemberInviteMode("address");
            }}
            disabled={busy}
          >
            Cancel
          </button>
          {memberInviteMode === "email" ? (
            <button className="btn btn-primary" onClick={handleInviteByEmail} disabled={busy || !newMemberName.trim() || !newMemberEmail.trim()}>
              {busy ? "Sending..." : "Send Invitation"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleAddMember} disabled={busy || !newMemberName.trim() || !newMemberAddr.trim()}>
            {busy ? "Adding..." : "Add Member"}
          </button>
          )}
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => {
          setShowEditProfile(false);
          setProfileName("");
          setProfileKey("");
        }}
        title="Edit Profile"
      >
        <div className="modal-body">
          <p className="text-muted mb-4">
            Update your profile information for this circle.
          </p>

          <div className="input-group">
            <label>Name</label>
            <input
              className="input"
              placeholder="e.g., Sarah Johnson"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Wallet Key</label>
            <input
              className="input input-mono"
              value={profileKey}
              readOnly
              style={{ opacity: 0.7, cursor: "not-allowed" }}
            />
            <p className="text-xs text-muted mt-2">
              Your wallet address cannot be changed
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowEditProfile(false);
              setProfileName("");
              setProfileKey("");
            }}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={busy || !profileName.trim()}>
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={showTaskDetails}
        onClose={() => {
          setShowTaskDetails(false);
          setSelectedTask(null);
          setTaskAssignTo("");
        }}
        title={`Task #${selectedTask?.id || ""}`}
      >
        {selectedTask && (
          <div className="modal-body">
            <div className="input-group mb-4">
              <label>Task Title</label>
              <input
                className="input"
                value={selectedTask.title}
                readOnly
                disabled
              />
            </div>

            <div className="input-group mb-4">
              <label>Description</label>
              <textarea
                className="input"
                value={selectedTask.description || ""}
                readOnly
                disabled
                rows={3}
              />
            </div>

            <div className="input-group mb-4">
              <label>Priority</label>
              <select
                className="input"
                value={selectedTask.priority}
                disabled
              >
                <option value={0}>Low</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </select>
            </div>

            <div className="input-group mb-4">
              <label>Assign To</label>
              <select
                className="input"
                value={taskAssignTo}
                onChange={(e) => setTaskAssignTo(e.target.value)}
              >
                <option value="">-- Not Assigned --</option>
                {members.map((member) => (
                  <option key={member.address} value={member.address}>
                    {member.name || formatAddress(member.address)}
                    {member.isOwner && " (Owner)"}
                    {member.address?.toLowerCase() === walletAddr?.toLowerCase() && " (you)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group mb-4">
              <label>Status</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className={`task-status ${selectedTask.completed ? "completed" : "open"}`}>
                  {selectedTask.completed ? "✓ Completed" : "○ Open"}
                </span>
                {selectedTask.tx_hash && (
                  <a href={getExplorerUrl(selectedTask.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem" }}>
                    View on-chain proof ↗
                  </a>
                )}
              </div>
            </div>

            <div className="input-group mb-4">
              <label>Created by</label>
              <input
                className="input input-mono"
                value={formatAddress(selectedTask.created_by)}
                readOnly
                disabled
              />
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowTaskDetails(false);
              setSelectedTask(null);
              setTaskAssignTo("");
            }}
          >
            Close
          </button>
          {selectedTask && !selectedTask.completed && (
            <>
              {(walletAddr?.toLowerCase() === selectedTask.created_by?.toLowerCase() || walletAddr?.toLowerCase() === circle?.owner?.toLowerCase()) && (
                <button
                  className="btn btn-danger"
                  onClick={handleCancelTask}
                  disabled={busy}
                >
                  {busy ? "Canceling..." : "Cancel Task"}
                </button>
              )}
              <button
                className="btn btn-care"
                onClick={handleAssignTask}
                disabled={busy}
              >
                {busy ? "Updating..." : "Update Assignment"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
