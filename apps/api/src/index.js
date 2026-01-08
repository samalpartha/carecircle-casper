import express from "express";
import cors from "cors";
import { z } from "zod";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { openDb } from "./db.js";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { fileURLToPath } from "url";
import { dirname, join, isAbsolute } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Determine database filename based on environment
let db;
try {
  // If DB_FILE is set and is an absolute path, use it directly
  // Otherwise, pass just the filename and let db.js handle the path
  let dbFilename;
  if (process.env.DB_FILE && isAbsolute(process.env.DB_FILE)) {
    // Full path provided, use it directly
    dbFilename = process.env.DB_FILE;
  } else if (process.env.VERCEL || process.env.VERCEL_ENV) {
    // Vercel: Just filename, db.js will handle /tmp path
    dbFilename = process.env.DB_FILE || "carecircle-application.db";
  } else if (process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT) {
    // Railway: Just filename, db.js will handle /app/data path
    dbFilename = process.env.DB_FILE || "carecircle-application.db";
  } else {
    // Local or other platforms: Use DB_FILE env var or default
    dbFilename = process.env.DB_FILE || "carecircle-application.db";
  }
  
  db = openDb(dbFilename);
  console.log(`[API] Database initialized: ${dbFilename}`);
  console.log(`[API] Environment: ${process.env.RAILWAY ? 'Railway' : process.env.VERCEL ? 'Vercel' : 'Local'}`);
} catch (error) {
  console.error(`[API] Failed to initialize database:`, error);
  // Continue without database - endpoints will handle errors gracefully
}

// ==================== Swagger Setup ====================

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CareCircle API",
      version: "1.0.0",
      description: `
## CareCircle on Casper - Verifiable Caregiving Coordination

Backend API for the CareCircle dApp built for **Casper Hackathon 2026**.

CareCircle enables families, caregivers, and volunteers to coordinate caregiving tasks 
with **verifiable task completion proofs** recorded on the Casper blockchain.

### Key Features
- 🏠 **Circles**: Create caregiving groups for families or communities
- 👥 **Members**: Add caregivers and volunteers to circles
- ✅ **Tasks**: Assign, track, and complete caregiving tasks
- ⛓️ **On-Chain Verification**: Task completions are recorded on Casper Testnet

### Architecture
- **Frontend**: React + Vite (http://localhost:5173)
- **API**: Express.js cache layer (this service)
- **Blockchain**: Casper Testnet via CSPR.click SDK
- **Smart Contract**: Odra framework (Rust)

### Links
- [Casper Testnet Explorer](https://testnet.cspr.live)
- [Casper Documentation](https://docs.casper.network)
- [Odra Framework](https://odra.dev/docs)
      `,
      contact: {
        name: "CareCircle Team",
        url: "https://github.com/carecircle/casper"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : (process.env.API_URL || "http://localhost:3005"),
        description: process.env.VERCEL_URL ? "Production Server (Vercel)" : "Local Development Server"
      },
      ...(process.env.VERCEL_URL ? [] : [{
        url: "http://localhost:3005",
        description: "Local Development Server"
      }])
    ],
    tags: [
      { name: "Health", description: "Service health endpoints" },
      { name: "Circles", description: "Caregiving circle management" },
      { name: "Members", description: "Circle member management" },
      { name: "Tasks", description: "Task assignment and completion" },
      { name: "Stats", description: "Analytics and statistics" }
    ]
  },
  apis: [
    join(__dirname, "index.js"),  // Use absolute path to current file
    join(__dirname, "*.js")        // Include all JS files in src directory
  ]
};

let swaggerSpec;
try {
  console.log(`[Swagger] Generating spec from:`, swaggerOptions.apis);
  swaggerSpec = swaggerJsdoc(swaggerOptions);
  const pathCount = Object.keys(swaggerSpec.paths || {}).length;
  console.log(`[Swagger] Generated spec successfully with ${pathCount} paths`);
} catch (error) {
  console.error(`[Swagger] Failed to generate spec:`, error);
  console.error(`[Swagger] Error details:`, error.stack);
  // Create a minimal spec if generation fails
  swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "CareCircle API",
      version: "1.0.0",
      description: `API documentation generation failed: ${error.message}. Check server logs.`
    },
    paths: {}
  };
}

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "CareCircle API Documentation",
  explorer: true
}));

// ==================== Root & Health Check ====================

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Information
 *     description: Returns basic API information and available endpoints
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: CareCircle API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 docs:
 *                   type: string
 *                   example: http://localhost:3005/docs
 */
app.get("/", (_, res) => res.json({
  name: "CareCircle API",
  version: "1.0.0",
  description: "Backend API for CareCircle on Casper - Verifiable Caregiving Coordination",
  docs: "http://localhost:3005/docs",
  frontend: "http://localhost:5173"
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Check if the API service is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: CareCircle API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/health", (_, res) => res.json({ 
  ok: true, 
  service: "CareCircle API",
  version: "1.0.0",
  timestamp: new Date().toISOString()
}));

// ==================== Circle Endpoints ====================

/**
 * @swagger
 * /circles/upsert:
 *   post:
 *     summary: Create or update a circle
 *     description: Upserts a caregiving circle. The API acts as a fast cache; the blockchain is the source of truth.
 *     tags: [Circles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, name, owner]
 *             properties:
 *               id:
 *                 type: integer
 *                 description: Circle ID (from blockchain)
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: Circle name
 *                 example: "Mom's Care Team"
 *               owner:
 *                 type: string
 *                 description: Owner's Casper public key
 *                 example: "01a5b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef1234"
 *               wallet_key:
 *                 type: string
 *                 description: Wallet key (public key) used to create the circle
 *                 example: "0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d"
 *               tx_hash:
 *                 type: string
 *                 nullable: true
 *                 description: Transaction hash of circle creation
 *     responses:
 *       200:
 *         description: Circle upserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 id:
 *                   type: integer
 *       400:
 *         description: Validation error
 */
app.post("/circles/upsert", (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Database not available" });
    }
    
    const schema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      owner: z.string().min(1),
      wallet_key: z.string().optional(),
      tx_hash: z.string().nullable().optional()
    });
    const input = schema.parse(req.body);

    console.log(`[API] Upserting circle: ID=${input.id}, name="${input.name}", owner=${input.owner.substring(0, 10)}...`);

    try {
      const result = db.prepare(`
        INSERT INTO circles(id, name, owner, wallet_key, tx_hash, created_at) 
        VALUES(?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name=excluded.name, 
        owner=excluded.owner,
          wallet_key=COALESCE(excluded.wallet_key, wallet_key),
        tx_hash=COALESCE(excluded.tx_hash, tx_hash)
      `).run(
        input.id, 
        input.name, 
        input.owner, 
        input.wallet_key ?? input.owner, // Use owner as wallet_key if not provided
        input.tx_hash ?? null, 
        Date.now()
      );

      console.log(`[API] Circle ${input.id} upserted. Changes: ${result.changes}`);

      // Force database sync (important for SQLite)
      db.exec("PRAGMA synchronous = NORMAL;");
      
      // Verify it was saved
      const saved = db.prepare("SELECT * FROM circles WHERE id=?").get(input.id);
      if (!saved) {
        console.error(`[API] WARNING: Circle ${input.id} was not found after upsert!`);
        console.error(`[API] Database path: ${process.env.VERCEL ? '/tmp' : 'local'}`);
        // Still return success if the insert worked, even if immediate read fails
        // (might be a timing issue in serverless)
        res.json({ 
          ok: true, 
          id: input.id, 
          circle: { id: input.id, name: input.name, owner: input.owner },
          warning: "Circle saved but immediate verification failed (may be serverless timing issue)"
        });
        return;
      } else {
        console.log(`[API] Verified: Circle ${input.id} exists in database`);
        console.log(`[API] Saved circle data:`, {
          id: saved.id,
          name: saved.name,
          owner: saved.owner?.substring(0, 10) + "...",
          wallet_key: saved.wallet_key?.substring(0, 10) + "...",
          has_tx_hash: !!saved.tx_hash
        });
      }

      res.json({ ok: true, id: input.id, circle: saved });
    } catch (dbErr) {
      console.error(`[API] Database error during upsert:`, dbErr);
      throw dbErr;
    }
  } catch (err) {
    console.error("[API] Error upserting circle:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /circles/{id}:
 *   get:
 *     summary: Get circle by ID
 *     description: Retrieves a single caregiving circle by its ID
 *     tags: [Circles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Circle ID
 *     responses:
 *       200:
 *         description: Circle data or null if not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 owner:
 *                   type: string
 *                 tx_hash:
 *                   type: string
 *                   nullable: true
 *                 created_at:
 *                   type: integer
 */
app.get("/circles/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid circle ID" });
  }
  
  if (!db) {
    console.error(`[API] Database not available when fetching circle ${id}`);
    return res.status(503).json({ error: "Database not available" });
  }
  
  let circle;
  try {
    circle = db.prepare("SELECT * FROM circles WHERE id=?").get(id);
    console.log(`[API] Circle ${id} query result:`, circle ? "found" : "not found");
  } catch (dbErr) {
    console.error(`[API] Database error fetching circle ${id}:`, dbErr);
    return res.status(500).json({ error: "Database query failed" });
  }
  
  // If not in database, try to fetch from blockchain (if contract is deployed)
  if (!circle) {
    const contractHash = process.env.CONTRACT_HASH || "";
    const nodeUrl = process.env.CASPER_NODE_URL || "https://rpc.testnet.casperlabs.io/rpc";
    
    console.log(`[API] Circle ${id} not in database, checking blockchain...`);
    console.log(`[API] Contract hash: ${contractHash ? 'set' : 'not set'}`);
    
    if (contractHash) {
      try {
        const response = await fetch(nodeUrl, {
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
                  key: contractHash,
                  dictionary_name: "circles",
                  dictionary_item_key: id.toString()
                }
              }
            }
          })
        });
        
        const data = await response.json();
        
        if (data.error) {
          console.error(`[API] Blockchain query error:`, data.error);
        } else {
          const chainData = data.result?.stored_value?.CLValue;
          
          if (chainData) {
            console.log(`[API] Found circle ${id} on blockchain, parsing...`);
            // Parse and save to database for future queries
            // Note: This is simplified - you may need proper CLValue parsing
            try {
              const parsed = JSON.parse(JSON.stringify(chainData));
              const circleName = parsed?.parsed?.name || parsed?.name || `Circle ${id}`;
              const owner = parsed?.parsed?.owner || parsed?.owner || "";
              
              if (owner) {
                // Save to database
                db.prepare(`
                  INSERT INTO circles(id, name, owner, wallet_key, tx_hash, created_at) 
                  VALUES(?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET 
                    name=excluded.name, 
                    owner=excluded.owner,
                    wallet_key=COALESCE(excluded.wallet_key, wallet_key)
                `).run(id, circleName, owner, owner, null, Date.now());
                
                // Fetch the newly saved circle
                circle = db.prepare("SELECT * FROM circles WHERE id=?").get(id);
                console.log(`[API] Circle ${id} saved to database`);
              } else {
                console.warn(`[API] Circle ${id} found on chain but owner is missing`);
              }
            } catch (parseErr) {
              console.error(`[API] Failed to parse circle from chain:`, parseErr);
              console.error(`[API] Raw chain data:`, JSON.stringify(chainData, null, 2));
            }
          } else {
            console.log(`[API] Circle ${id} not found on blockchain`);
          }
        }
      } catch (err) {
        console.error(`[API] Failed to fetch circle from blockchain:`, err);
      }
    } else {
      console.log(`[API] Contract hash not configured, skipping blockchain query`);
    }
  }
  
  res.json(circle ?? null);
});

/**
 * @swagger
 * /circles/owner/{address}:
 *   get:
 *     summary: Get circles by owner
 *     description: Retrieves all circles owned by a specific address
 *     tags: [Circles]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner's Casper public key
 *     responses:
 *       200:
 *         description: Array of circles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   owner:
 *                     type: string
 */
app.get("/circles/owner/:address", (req, res) => {
  const address = req.params.address;
  const circles = db.prepare("SELECT * FROM circles WHERE owner=? ORDER BY created_at DESC").all(address);
  res.json(circles);
});

/**
 * @swagger
 * /circles/wallet/{walletKey}:
 *   get:
 *     summary: Get circles by wallet key
 *     description: Retrieves all circles created with a specific wallet key
 *     tags: [Circles]
 *     parameters:
 *       - in: path
 *         name: walletKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet key (public key) used to create the circle
 *     responses:
 *       200:
 *         description: Array of circles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   owner:
 *                     type: string
 *                   wallet_key:
 *                     type: string
 */
app.get("/circles/wallet/:walletKey", (req, res) => {
  const walletKey = req.params.walletKey;
  const circles = db.prepare("SELECT * FROM circles WHERE wallet_key=? ORDER BY created_at DESC").all(walletKey);
  res.json(circles);
});

/**
 * @swagger
 * /circles:
 *   get:
 *     summary: List all circles (debug endpoint)
 *     description: Returns all circles in the database for debugging purposes
 *     tags: [Circles]
 *     responses:
 *       200:
 *         description: Array of all circles
 */
app.get("/circles", (req, res) => {
  try {
    const circles = db.prepare("SELECT * FROM circles ORDER BY id DESC LIMIT 100").all();
    res.json(circles);
  } catch (err) {
    console.error("Error listing circles:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /circles/name/{name}:
 *   get:
 *     summary: Get circles by name
 *     description: Retrieves all circles with a specific name (case-insensitive partial match)
 *     tags: [Circles]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Circle name (partial match supported)
 *     responses:
 *       200:
 *         description: Array of circles matching the name
 */
app.get("/circles/name/:name", (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const circles = db.prepare("SELECT * FROM circles WHERE LOWER(name) LIKE LOWER(?) ORDER BY created_at DESC").all(`%${name}%`);
    res.json(circles);
  } catch (err) {
    console.error("Error fetching circles by name:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== Member Endpoints ====================

/**
 * @swagger
 * /members/upsert:
 *   post:
 *     summary: Add or update a member
 *     description: Adds a caregiver or volunteer to a circle
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [circle_id, address]
 *             properties:
 *               circle_id:
 *                 type: integer
 *                 example: 1
 *               address:
 *                 type: string
 *                 description: Member's Casper public key
 *               name:
 *                 type: string
 *                 description: Member's display name
 *                 example: "John Doe"
 *               is_owner:
 *                 type: boolean
 *                 default: false
 *               tx_hash:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Member added successfully
 *       400:
 *         description: Validation error
 */
app.post("/members/upsert", (req, res) => {
  try {
    const schema = z.object({
      circle_id: z.number().int().positive(),
      address: z.string().min(1),
      name: z.string().optional(),
      is_owner: z.boolean().optional(),
      tx_hash: z.string().nullable().optional()
    });
    const input = schema.parse(req.body);

    db.prepare(`
      INSERT INTO members(circle_id, address, name, is_owner, tx_hash, joined_at)
      VALUES(?, ?, ?, ?, ?, ?)
      ON CONFLICT(circle_id, address) DO UPDATE SET
        name=COALESCE(excluded.name, name),
        is_owner=excluded.is_owner,
        tx_hash=COALESCE(excluded.tx_hash, tx_hash)
    `).run(
      input.circle_id, 
      input.address, 
      input.name ?? null,
      input.is_owner ? 1 : 0, 
      input.tx_hash ?? null,
      Date.now()
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error upserting member:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /circles/{id}/members:
 *   get:
 *     summary: Get circle members
 *     description: Retrieves all members of a caregiving circle
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Circle ID
 *     responses:
 *       200:
 *         description: Array of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   circle_id:
 *                     type: integer
 *                   address:
 *                     type: string
 *                   is_owner:
 *                     type: boolean
 *                   tx_hash:
 *                     type: string
 *                     nullable: true
 *                   joined_at:
 *                     type: integer
 */
app.get("/circles/:id/members", (req, res) => {
  const id = Number(req.params.id);
  const members = db.prepare("SELECT circle_id, address, name, is_owner, tx_hash, joined_at FROM members WHERE circle_id=? ORDER BY is_owner DESC, joined_at ASC").all(id);
  res.json(members.map(m => ({
    circle_id: m.circle_id,
    address: m.address,
    name: m.name || null,
    is_owner: !!m.is_owner,
    tx_hash: m.tx_hash || null,
    joined_at: m.joined_at
  })));
});

// ==================== Task Endpoints ====================

/**
 * @swagger
 * /tasks/upsert:
 *   post:
 *     summary: Create or update a task
 *     description: Upserts a caregiving task with assignment and completion data
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, circle_id, title, assigned_to, created_by, completed]
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               circle_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Doctor appointment accompaniment"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Drive to and attend the 2pm cardiology appointment"
 *               assigned_to:
 *                 type: string
 *                 description: Assignee's Casper public key
 *               created_by:
 *                 type: string
 *                 description: Creator's Casper public key
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 3
 *                 default: 1
 *                 description: "0=Low, 1=Normal, 2=High, 3=Urgent"
 *               completed:
 *                 type: boolean
 *               completed_by:
 *                 type: string
 *                 nullable: true
 *               completed_at:
 *                 type: integer
 *                 nullable: true
 *                 description: Unix timestamp of completion
 *               tx_hash:
 *                 type: string
 *                 nullable: true
 *                 description: Transaction hash of task completion on Casper
 *     responses:
 *       200:
 *         description: Task upserted successfully
 *       400:
 *         description: Validation error
 */
app.post("/tasks/upsert", (req, res) => {
  try {
    const schema = z.object({
      id: z.number().int().positive(),
      circle_id: z.number().int().positive(),
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      assigned_to: z.string().nullable().optional(),
      created_by: z.string().min(1),
      priority: z.number().int().min(0).max(3).optional(),
      payment_amount: z.string().nullable().optional(),
      request_money: z.number().int().min(0).max(1).optional(),
      payment_tx_hash: z.string().nullable().optional(),
      rejected: z.number().int().min(0).max(1).optional(),
      completed: z.boolean(),
      completed_by: z.string().nullable().optional(),
      completed_at: z.number().int().nullable().optional(),
      tx_hash: z.string().nullable().optional()
    });
    const t = schema.parse(req.body);

    db.prepare(`
      INSERT INTO tasks(id, circle_id, title, description, assigned_to, created_by, priority, payment_amount, request_money, payment_tx_hash, rejected, completed, completed_by, completed_at, tx_hash, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        assigned_to=excluded.assigned_to,
        created_by=excluded.created_by,
        priority=excluded.priority,
        payment_amount=excluded.payment_amount,
        request_money=excluded.request_money,
        payment_tx_hash=COALESCE(excluded.payment_tx_hash, payment_tx_hash),
        rejected=COALESCE(excluded.rejected, rejected),
        completed=excluded.completed,
        completed_by=excluded.completed_by,
        completed_at=excluded.completed_at,
        tx_hash=COALESCE(excluded.tx_hash, tx_hash)
    `).run(
      t.id, 
      t.circle_id, 
      t.title, 
      t.description ?? null,
      (t.assigned_to && t.assigned_to.trim() !== "") ? t.assigned_to : null, 
      t.created_by,
      t.priority ?? 1,
      t.payment_amount ?? null,
      t.request_money ?? 0,
      t.payment_tx_hash ?? null,
      t.rejected ?? 0,
      t.completed ? 1 : 0, 
      t.completed_by ?? null, 
      t.completed_at ?? null, 
      t.tx_hash ?? null,
      Date.now()
    );

    res.json({ ok: true, id: t.id });
  } catch (err) {
    console.error("Error upserting task:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /circles/{id}/tasks:
 *   get:
 *     summary: Get circle tasks
 *     description: Retrieves all tasks for a caregiving circle
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Circle ID
 *     responses:
 *       200:
 *         description: Array of tasks sorted by status and priority
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   circle_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   assigned_to:
 *                     type: string
 *                   completed:
 *                     type: boolean
 *                   tx_hash:
 *                     type: string
 *                     nullable: true
 *                     description: On-chain verification hash
 */
app.get("/circles/:id/tasks", (req, res) => {
  const id = Number(req.params.id);
  const tasks = db.prepare("SELECT * FROM tasks WHERE circle_id=? ORDER BY completed ASC, priority DESC, id DESC").all(id);
  // Normalize types for UI
  res.json(tasks.map(t => ({
    ...t,
    completed: !!t.completed
  })));
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Retrieves a single task by its ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task data or null if not found
 */
app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  if (task) {
    task.completed = !!task.completed;
  }
  res.json(task ?? null);
});

/**
 * @swagger
 * /tasks/assigned/{address}:
 *   get:
 *     summary: Get tasks by assignee
 *     description: Retrieves all tasks assigned to a specific address
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignee's Casper public key
 *     responses:
 *       200:
 *         description: Array of assigned tasks
 */
app.get("/tasks/assigned/:address", (req, res) => {
  const address = req.params.address;
  const tasks = db.prepare("SELECT * FROM tasks WHERE assigned_to=? ORDER BY completed ASC, priority DESC, id DESC").all(address);
  res.json(tasks.map(t => ({
    ...t,
    completed: !!t.completed
  })));
});

// ==================== Stats Endpoints ====================

/**
 * @swagger
 * /circles/{id}/stats:
 *   get:
 *     summary: Get circle statistics
 *     description: Retrieves task and member statistics for a circle
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Circle ID
 *     responses:
 *       200:
 *         description: Circle statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_tasks:
 *                   type: integer
 *                   example: 10
 *                 completed_tasks:
 *                   type: integer
 *                   example: 6
 *                 open_tasks:
 *                   type: integer
 *                   example: 4
 *                 completion_rate:
 *                   type: integer
 *                   description: Percentage 0-100
 *                   example: 60
 *                 member_count:
 *                   type: integer
 *                   example: 3
 */
app.get("/circles/:id/stats", (req, res) => {
  const id = Number(req.params.id);
  
  const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE circle_id=?").get(id)?.count || 0;
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE circle_id=? AND completed=1").get(id)?.count || 0;
  const memberCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE circle_id=?").get(id)?.count || 0;
  
  res.json({
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    open_tasks: totalTasks - completedTasks,
    completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    member_count: memberCount
  });
});

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get global statistics
 *     description: Retrieves platform-wide statistics
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Global platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_circles:
 *                   type: integer
 *                 total_tasks:
 *                   type: integer
 *                 completed_tasks:
 *                   type: integer
 *                 total_members:
 *                   type: integer
 */
app.get("/stats", (_, res) => {
  const totalCircles = db.prepare("SELECT COUNT(*) as count FROM circles").get()?.count || 0;
  const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks").get()?.count || 0;
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE completed=1").get()?.count || 0;
  const totalMembers = db.prepare("SELECT COUNT(DISTINCT address) as count FROM members").get()?.count || 0;
  
  res.json({
    total_circles: totalCircles,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    total_members: totalMembers
  });
});

// ==================== Account Balance Proxy ====================

/**
 * @swagger
 * /accounts/{publicKey}/balance:
 *   get:
 *     summary: Get account balance from cspr.live
 *     description: Proxy endpoint to fetch account balance from cspr.live API (avoids CORS issues)
 *     tags: [Health]
 *     parameters:
 *       - in: path
 *         name: publicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Casper public key in hex format
 *     responses:
 *       200:
 *         description: Account balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: string
 *                   description: Balance in CSPR
 *                 isLive:
 *                   type: boolean
 *                   description: Whether account exists on blockchain
 *       404:
 *         description: Account not found
 *       500:
 *         description: Error fetching account data
 */
app.get("/accounts/:publicKey/balance", async (req, res) => {
  const publicKey = req.params.publicKey;
  
  if (!publicKey || publicKey.length < 64) {
    return res.status(400).json({ error: "Invalid public key" });
  }
  
  try {
    // Try testnet API first, then mainnet
    const endpoints = [
      `https://api.testnet.cspr.live/accounts/${publicKey}?includes=delegated_balance,staked_balance,undelegating_balance`,
      `https://api.cspr.live/accounts/${publicKey}?includes=delegated_balance,staked_balance,undelegating_balance`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Check if response has the expected structure
          if (data.data && data.data.balance !== undefined && data.data.public_key) {
            // Verify public_key matches
            if (data.data.public_key.toLowerCase() === publicKey.toLowerCase()) {
              // Convert from motes to CSPR (1 CSPR = 1,000,000,000 motes)
              const balanceMotes = typeof data.data.balance === 'string' ? parseFloat(data.data.balance) : data.data.balance;
              const csprBalance = (balanceMotes / 1_000_000_000).toFixed(2);
              
              return res.json({
                balance: csprBalance,
                isLive: true,
                accountHash: data.data.account_hash,
                publicKey: data.data.public_key,
                mainPurseUref: data.data.main_purse_uref || null
              });
            }
          }
        } else if (response.status === 404) {
          // Account not found - continue to next endpoint
          continue;
        }
      } catch (err) {
        // Continue to next endpoint
        console.warn(`Failed to fetch from ${endpoint}:`, err.message);
        continue;
      }
    }
    
    // Account not found on any endpoint
    return res.status(404).json({ 
      error: "Account not found",
      isLive: false 
    });
  } catch (err) {
    console.error("Error fetching account balance:", err);
    return res.status(500).json({ 
      error: "Failed to fetch account balance",
      message: err.message 
    });
  }
});

// ==================== Email Service ====================

// Configure email transporter (using environment variables or defaults)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Test email configuration (optional)
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter.verify((error) => {
    if (error) {
      console.warn("⚠️ Email service not configured:", error.message);
      console.warn("   Set SMTP_USER and SMTP_PASS environment variables to enable email invitations");
    } else {
      console.log("✅ Email service configured");
    }
  });
}

// ==================== Invitations API ====================

/**
 * @swagger
 * /invitations/send:
 *   post:
 *     summary: Send member invitation by email
 *     description: Creates an invitation token and sends an email with a join link
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - circle_id
 *               - email
 *               - member_name
 *             properties:
 *               circle_id:
 *                 type: integer
 *               email:
 *                 type: string
 *                 format: email
 *               member_name:
 *                 type: string
 *               circle_name:
 *                 type: string
 *               inviter_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to send invitation
 */
app.post("/invitations/send", async (req, res) => {
  const schema = z.object({
    circle_id: z.number().int().positive(),
    email: z.string().email(),
    member_name: z.string().min(1),
    circle_name: z.string().optional(),
    inviter_name: z.string().optional(),
  });

  try {
    const data = schema.parse(req.body);
    
    // Verify circle exists
    const circle = db.prepare("SELECT * FROM circles WHERE id=?").get(data.circle_id);
    if (!circle) {
      return res.status(404).json({ error: "Circle not found" });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Save invitation to database
    db.prepare(`
      INSERT INTO invitations(token, circle_id, email, member_name, inviter_name, expires_at)
      VALUES(?, ?, ?, ?, ?, ?)
    `).run(
      token,
      data.circle_id,
      data.email.toLowerCase(),
      data.member_name,
      data.inviter_name || null,
      expiresAt
    );

    // Generate join URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const joinUrl = `${frontendUrl}/#join?token=${token}`;

    // Send email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await emailTransporter.sendMail({
          from: `"CareCircle" <${process.env.SMTP_USER}>`,
          to: data.email,
          subject: `You're invited to join ${data.circle_name || "a Care Circle"}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💚 CareCircle Invitation</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.member_name},</p>
                  <p>${data.inviter_name || "A circle owner"} has invited you to join <strong>${data.circle_name || "a Care Circle"}</strong> on CareCircle.</p>
                  <p>CareCircle helps coordinate caregiving tasks with verifiable on-chain completion proofs on the Casper blockchain.</p>
                  <p style="text-align: center;">
                    <a href="${joinUrl}" class="button">Join Care Circle →</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${joinUrl}</p>
                  <p><strong>This invitation expires in 7 days.</strong></p>
                  <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                  <p>Built for Casper Hackathon 2026</p>
                  <p><a href="${frontendUrl}">Visit CareCircle</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `
            Hi ${data.member_name},

            ${data.inviter_name || "A circle owner"} has invited you to join ${data.circle_name || "a Care Circle"} on CareCircle.

            CareCircle helps coordinate caregiving tasks with verifiable on-chain completion proofs on the Casper blockchain.

            Join here: ${joinUrl}

            This invitation expires in 7 days.

            If you didn't expect this invitation, you can safely ignore this email.

            Built for Casper Hackathon 2026
            ${frontendUrl}
          `,
        });

        console.log(`✅ Invitation email sent to ${data.email}`);
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
        // Still return success - invitation is saved in database
        // User can share the link manually if email fails
      }
    } else {
      console.log("⚠️ Email not configured - invitation token generated:", token);
      console.log("   Join URL:", joinUrl);
    }

    return res.json({
      success: true,
      token,
      joinUrl,
      message: process.env.SMTP_USER ? "Invitation sent" : "Invitation created (email not configured)"
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.errors });
    }
    console.error("Failed to send invitation:", err);
    return res.status(500).json({ error: "Failed to send invitation", message: err.message });
  }
});

/**
 * @swagger
 * /invitations/{token}:
 *   get:
 *     summary: Get invitation details by token
 *     description: Retrieve invitation information for joining a circle
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation details
 *       404:
 *         description: Invitation not found or expired
 */
app.get("/invitations/:token", async (req, res) => {
  const token = req.params.token;
  
  try {
    const invitation = db.prepare(`
      SELECT i.*, c.name as circle_name, c.owner as circle_owner
      FROM invitations i
      JOIN circles c ON i.circle_id = c.id
      WHERE i.token = ? AND i.status = 'pending'
    `).get(token);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }

    // Check if expired
    if (invitation.expires_at && invitation.expires_at < Date.now()) {
      return res.status(404).json({ error: "Invitation has expired" });
    }

    return res.json({
      token: invitation.token,
      circle_id: invitation.circle_id,
      circle_name: invitation.circle_name,
      member_name: invitation.member_name,
      email: invitation.email,
      inviter_name: invitation.inviter_name,
      expires_at: invitation.expires_at,
    });
  } catch (err) {
    console.error("Failed to get invitation:", err);
    return res.status(500).json({ error: "Failed to get invitation", message: err.message });
  }
});

/**
 * @swagger
 * /invitations/{token}/accept:
 *   post:
 *     summary: Accept invitation and add member
 *     description: Accepts an invitation by providing a Casper address
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Casper public key address
 *     responses:
 *       200:
 *         description: Invitation accepted and member added
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Invitation not found or expired
 */
app.post("/invitations/:token/accept", async (req, res) => {
  const token = req.params.token;
  const schema = z.object({
    address: z.string().min(64),
  });

  try {
    const { address } = schema.parse(req.body);

    // Get invitation
    const invitation = db.prepare(`
      SELECT i.*, c.name as circle_name
      FROM invitations i
      JOIN circles c ON i.circle_id = c.id
      WHERE i.token = ? AND i.status = 'pending'
    `).get(token);

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }

    // Check if expired
    if (invitation.expires_at && invitation.expires_at < Date.now()) {
      return res.status(404).json({ error: "Invitation has expired" });
    }

    // Mark invitation as accepted
    db.prepare(`
      UPDATE invitations
      SET status = 'accepted', accepted_at = ?, accepted_address = ?
      WHERE token = ?
    `).run(Date.now(), address, token);

    // Add member to circle
    db.prepare(`
      INSERT INTO members(circle_id, address, name, is_owner, joined_at)
      VALUES(?, ?, ?, 0, ?)
      ON CONFLICT(circle_id, address) DO UPDATE SET name=COALESCE(excluded.name, name)
    `).run(
      invitation.circle_id,
      address,
      invitation.member_name,
      Date.now()
    );

    return res.json({
      success: true,
      circle_id: invitation.circle_id,
      circle_name: invitation.circle_name,
      member_name: invitation.member_name,
      message: "Invitation accepted and member added"
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.errors });
    }
    console.error("Failed to accept invitation:", err);
    return res.status(500).json({ error: "Failed to accept invitation", message: err.message });
  }
});

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ==================== Seed Demo Data ====================

function seedDemoData() {
  try {
    // Demo addresses
    const OWNER_ADDR = "01a5b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef1234";
    const MEMBER1_ADDR = "02b6c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef123456";
    const MEMBER2_ADDR = "01c7d0e1f234567890abcdef1234567890abcdef1234567890abcdef12345678";

    // Check if demo circle (ID 1) exists
    const existing = db.prepare("SELECT * FROM circles WHERE id=1").get();
    if (existing) {
      console.log("✓ Demo circle (ID: 1) already exists");
      // Update existing members with names if they don't have them
      const updateMemberName = db.prepare(`
        UPDATE members 
        SET name = ? 
        WHERE circle_id = 1 AND address = ? AND (name IS NULL OR name = '')
      `);
      updateMemberName.run("Sarah Johnson", OWNER_ADDR);
      updateMemberName.run("Michael Chen", MEMBER1_ADDR);
      updateMemberName.run("Emily Rodriguez", MEMBER2_ADDR);
      return;
    }

    console.log("🌱 Seeding demo data...");

    // Create demo circle
    db.prepare(`
      INSERT INTO circles(id, name, owner, wallet_key, tx_hash, created_at) 
      VALUES(?, ?, ?, ?, ?, ?)
    `).run(
      1,
      "Mom's Care Team",
      OWNER_ADDR,
      OWNER_ADDR,
      "demo1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      Date.now()
    );

    // Add members with names (use INSERT OR IGNORE to handle existing members)
    db.prepare(`
      INSERT INTO members(circle_id, address, name, is_owner, joined_at) 
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(circle_id, address) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        is_owner = excluded.is_owner
    `).run(1, OWNER_ADDR, "Sarah Johnson", 1, Date.now());
    
    db.prepare(`
      INSERT INTO members(circle_id, address, name, is_owner, joined_at) 
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(circle_id, address) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        is_owner = excluded.is_owner
    `).run(1, MEMBER1_ADDR, "Michael Chen", 0, Date.now());
    
    db.prepare(`
      INSERT INTO members(circle_id, address, name, is_owner, joined_at) 
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(circle_id, address) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        is_owner = excluded.is_owner
    `).run(1, MEMBER2_ADDR, "Emily Rodriguez", 0, Date.now());

    // Create demo tasks
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO tasks(id, circle_id, title, description, assigned_to, created_by, priority, completed, created_at) 
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(1, 1, "Pick up medication from pharmacy", "Monthly prescription refill at CVS", MEMBER1_ADDR, OWNER_ADDR, 2, 0, now);
    
    db.prepare(`
      INSERT INTO tasks(id, circle_id, title, description, assigned_to, created_by, priority, completed, created_at) 
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(2, 1, "Grocery shopping for the week", "Get items from the shopping list", MEMBER2_ADDR, OWNER_ADDR, 1, 0, now);
    
    db.prepare(`
      INSERT INTO tasks(id, circle_id, title, description, assigned_to, created_by, priority, completed, completed_by, completed_at, tx_hash, created_at) 
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(3, 1, "Doctor appointment accompaniment", "Drive to and attend appointment", OWNER_ADDR, OWNER_ADDR, 3, 1, OWNER_ADDR, now - 86400000, "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ef", now - 86400000);
    
    db.prepare(`
      INSERT INTO tasks(id, circle_id, title, description, assigned_to, created_by, priority, completed, completed_by, completed_at, tx_hash, created_at) 
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(4, 1, "Morning check-in call", "Daily wellness check", MEMBER1_ADDR, OWNER_ADDR, 1, 1, MEMBER1_ADDR, now - 43200000, "ef123456789abcdef1234567890abcdef1234567890abcdef1234567890abcd", now - 43200000);

    console.log("✅ Demo data seeded successfully!");
    console.log("   Circle: Mom's Care Team (ID: 1)");
    console.log("   Members: 3");
    console.log("   Tasks: 4 (2 open, 2 completed)");
  } catch (err) {
    console.error("❌ Failed to seed demo data:", err);
  }
}

// Seed demo data on startup (skip in Vercel to avoid cold start delays)
if (db && process.env.VERCEL !== "1" && !process.env.VERCEL_ENV) {
  seedDemoData();
}

// ==================== Start Server ====================

// Export app for Vercel serverless functions
export default app;

// Only start listening if not in serverless environment
if (process.env.VERCEL !== "1" && !process.env.VERCEL_ENV) {
  const port = Number(process.env.PORT || 3005);
  app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CareCircle API Server                                        ║
║  Casper Hackathon 2026                                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:  Running                                             ║
║  URL:     http://localhost:${port.toString().padEnd(37)}║
║  Health:  http://localhost:${port}/health${" ".repeat(27)}║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
}
