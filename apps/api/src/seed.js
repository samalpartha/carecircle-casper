/**
 * Database Seed Script for CareCircle
 * Creates demo circle (ID: 1) with sample tasks and members
 */

import { openDb } from './db.js';

const DEMO_WALLET = "0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d";
const DEMO_MEMBER_1 = "0203a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3";
const DEMO_MEMBER_2 = "0204f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6";

export function seed(dbInstance = null) {
    const db = dbInstance || openDb();

    console.log('🌱 Seeding database with demo data...');

    try {
        // Create demo circle (ID: 1)
        db.prepare(`
      INSERT OR REPLACE INTO circles (id, name, owner, tx_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
            1,
            "Mom's Care Team",
            DEMO_WALLET,
            "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
            Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
        );
        console.log('✅ Created Circle #1: "Mom\'s Care Team"');

        // Add members
        const members = [
            { address: DEMO_WALLET, is_owner: true, name: "Owner" },
            { address: DEMO_MEMBER_1, is_owner: false, name: "Member 1" },
            { address: DEMO_MEMBER_2, is_owner: false, name: "Member 2" }
        ];

        for (const member of members) {
            db.prepare(`
        INSERT OR REPLACE INTO members (circle_id, address, is_owner, tx_hash, joined_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
                1,
                member.address,
                member.is_owner ? 1 : 0,
                `tx_member_${member.address.slice(0, 8)}`,
                Date.now() - 6 * 24 * 60 * 60 * 1000
            );
        }
        console.log(`✅ Added ${members.length} members to Circle #1`);

        // Create sample tasks
        const tasks = [
            {
                id: 1,
                title: "Pick up medication from pharmacy",
                description: "Get Mom's prescription refill from CVS on Main St",
                assigned_to: DEMO_MEMBER_1,
                priority: 2, // High
                completed: true,
                completed_by: DEMO_MEMBER_1,
                completed_at: Date.now() - 2 * 24 * 60 * 60 * 1000
            },
            {
                id: 2,
                title: "Weekly grocery shopping",
                description: "Buy groceries for the week - list is on the fridge",
                assigned_to: DEMO_MEMBER_2,
                priority: 1, // Medium
                completed: false,
                completed_by: null,
                completed_at: null
            },
            {
                id: 3,
                title: "Doctor's appointment on Thursday",
                description: "Drive Mom to cardiologist appointment at 2 PM",
                assigned_to: DEMO_WALLET,
                priority: 3, // Urgent
                completed: false,
                completed_by: null,
                completed_at: null
            },
            {
                id: 4,
                title: "Water the garden plants",
                description: "Water all plants in the backyard, especially the tomatoes",
                assigned_to: DEMO_MEMBER_1,
                priority: 0, // Low
                completed: true,
                completed_by: DEMO_MEMBER_1,
                completed_at: Date.now() - 1 * 24 * 60 * 60 * 1000
            },
            {
                id: 5,
                title: "Prepare dinner for Tuesday",
                description: "Cook Mom's favorite chicken soup recipe",
                assigned_to: DEMO_MEMBER_2,
                priority: 1, // Medium
                completed: false,
                completed_by: null,
                completed_at: null
            }
        ];

        for (const task of tasks) {
            db.prepare(`
        INSERT OR REPLACE INTO tasks (
          id, circle_id, title, description, assigned_to, created_by,
          priority, completed, completed_by, completed_at, tx_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                task.id,
                1, // circle_id
                task.title,
                task.description,
                task.assigned_to,
                DEMO_WALLET, // created_by
                task.priority,
                task.completed ? 1 : 0,
                task.completed_by,
                task.completed_at,
                task.completed ? `tx_task_${task.id}_completed` : `tx_task_${task.id}_created`,
                Date.now() - 5 * 24 * 60 * 60 * 1000
            );
        }
        console.log(`✅ Created ${tasks.length} sample tasks`);

        // Verify data
        const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(1);
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM members WHERE circle_id = ?').get(1);
        const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE circle_id = ?').get(1);

        console.log('\n📊 Demo Data Summary:');
        console.log(`   Circle: ${circle.name} (ID: ${circle.id})`);
        console.log(`   Members: ${memberCount.count}`);
        console.log(`   Tasks: ${taskCount.count}`);
        console.log(`   Completed: ${tasks.filter(t => t.completed).length}`);
        console.log(`   Open: ${tasks.filter(t => !t.completed).length}`);
        console.log('\n✨ Database seeded successfully!');
        console.log('💡 Users can now load Circle ID 1 to see demo data\n');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
