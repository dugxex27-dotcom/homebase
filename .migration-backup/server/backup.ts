import { db, pool } from './db';
import * as schema from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

interface BackupData {
  timestamp: string;
  tables: Record<string, unknown[]>;
}

const BACKUP_DIR = './backups';

async function createBackup() {
  console.log('Starting database backup...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData: BackupData = {
    timestamp,
    tables: {}
  };

  try {
    console.log('Backing up users...');
    backupData.tables.users = await db.select().from(schema.users);
    
    console.log('Backing up houses...');
    backupData.tables.houses = await db.select().from(schema.houses);
    
    console.log('Backing up contractors...');
    backupData.tables.contractors = await db.select().from(schema.contractors);
    
    console.log('Backing up companies...');
    backupData.tables.companies = await db.select().from(schema.companies);
    
    console.log('Backing up proposals...');
    backupData.tables.proposals = await db.select().from(schema.proposals);
    
    console.log('Backing up maintenance logs...');
    backupData.tables.maintenanceLogs = await db.select().from(schema.maintenanceLogs);
    
    console.log('Backing up service records...');
    backupData.tables.serviceRecords = await db.select().from(schema.serviceRecords);
    
    console.log('Backing up messages...');
    backupData.tables.messages = await db.select().from(schema.messages);
    
    console.log('Backing up conversations...');
    backupData.tables.conversations = await db.select().from(schema.conversations);
    
    console.log('Backing up notifications...');
    backupData.tables.notifications = await db.select().from(schema.notifications);
    
    console.log('Backing up products...');
    backupData.tables.products = await db.select().from(schema.products);
    
    console.log('Backing up task completions...');
    backupData.tables.taskCompletions = await db.select().from(schema.taskCompletions);
    
    console.log('Backing up achievements...');
    backupData.tables.achievements = await db.select().from(schema.achievements);
    
    console.log('Backing up contractor reviews...');
    backupData.tables.contractorReviews = await db.select().from(schema.contractorReviews);

    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`Backup completed successfully: ${backupPath}`);
    console.log(`Total tables backed up: ${Object.keys(backupData.tables).length}`);
    
    for (const [table, records] of Object.entries(backupData.tables)) {
      console.log(`  - ${table}: ${(records as unknown[]).length} records`);
    }
    
    return backupPath;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found.');
    return [];
  }
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  console.log('Available backups:');
  files.forEach(f => console.log(`  - ${f}`));
  
  return files;
}

const command = process.argv[2];

if (command === 'list') {
  listBackups();
} else {
  createBackup().catch(console.error);
}
