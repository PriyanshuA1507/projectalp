#!/usr/bin/env node
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load env from backend/.env by default
dotenv.config({ path: process.env.ENV_PATH || path.resolve(process.cwd(), '.env') });

import { AparForm } from '../src/models/aparForm.model.js';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run') || argv.includes('-n');
const execute = argv.includes('--execute') || argv.includes('-y');

const baseUri = (process.env.MONGODB_URI || '').replace(/\/+$/, '');
const uri = baseUri ? `${baseUri}/apar` : 'mongodb://localhost:27017/apar';

const PRIORITY = (status) => {
    if (!status) return 0;
    const s = String(status).toLowerCase();
    if (s.includes('submitted')) return 5;
    if (s.includes('verified')) return 4;
    if (s.includes('forwarded')) return 4;
    if (s.includes('reviewed')) return 3;
    if (s.includes('query')) return 2;
    if (s.includes('draft')) return 1;
    return 1;
};

const bsonReplacer = (key, value) => {
    if (value && typeof value === 'object' && value._bsontype === 'ObjectID') return value.toString();
    if (value && typeof value === 'object' && value._bsontype === 'Decimal128') return value.toString();
    return value;
};

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const run = async () => {
    console.log(`Connecting to ${uri}`);
    await mongoose.connect(uri, { autoIndex: false });
    const coll = mongoose.connection.collection('aparforms');

    const pipeline = [
        { $group: { _id: { faculty_id: '$faculty_id', ay: '$ay' }, ids: { $push: '$_id' }, docs: { $push: '$$ROOT' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ];

    const dupGroups = await coll.aggregate(pipeline).toArray();

    if (!dupGroups || dupGroups.length === 0) {
        console.log('No duplicate APAR groups found (faculty_id + ay).');
        await mongoose.disconnect();
        return;
    }

    console.log(`Found ${dupGroups.length} duplicate group(s).`);

    const backupRoot = path.resolve(process.cwd(), 'tmp', `apar-duplicates-backup-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    ensureDir(backupRoot);

    for (const group of dupGroups) {
        const facultyId = group._id.faculty_id;
        const ay = String(group._id.ay || '').replace(/[\s/\\]+/g, '-');
        console.log(`\nGroup: faculty_id=${facultyId}, ay=${ay}, count=${group.count}`);

        // Decide keeper
        const docs = group.docs;
        let keeper = docs[0];
        let keeperPriority = PRIORITY(keeper.status);

        for (const d of docs) {
            const p = PRIORITY(d.status);
            if (p > keeperPriority) {
                keeper = d; keeperPriority = p;
            } else if (p === keeperPriority) {
                const dDate = d.updatedAt ? new Date(d.updatedAt) : (d.createdAt ? new Date(d.createdAt) : null);
                const kDate = keeper.updatedAt ? new Date(keeper.updatedAt) : (keeper.createdAt ? new Date(keeper.createdAt) : null);
                if (dDate && kDate && dDate > kDate) {
                    keeper = d;
                }
            }
        }

        const keeperId = keeper._id.toString();
        const removeIds = group.ids.map(i => i.toString()).filter(id => id !== keeperId);

        // Backup group docs
        const outFile = path.join(backupRoot, `${facultyId}__${ay}__backup.json`);
        fs.writeFileSync(outFile, JSON.stringify(docs, bsonReplacer, 2));
        console.log(`Backed up ${docs.length} docs to ${outFile}`);

        if (dryRun) {
            console.log(`DRY RUN: would keep _id=${keeperId} and remove _ids=[${removeIds.join(', ')}]`);
            continue;
        }

        if (!execute) {
            console.log(`Run with --execute to perform the removal for this group.`);
            continue;
        }

        // Perform removal of duplicates (keep keeper)
        try {
            // Add a history entry to keeper noting merge
            await AparForm.updateOne({ _id: keeper._id }, { $push: { history: { action: 'Merged duplicates', by: 'cleanup-script', date: new Date(), comment: `Removed duplicate docs: ${removeIds.join(',')}` } } });

            // Delete the other docs
            const objIds = removeIds.map(id => new mongoose.Types.ObjectId(id));
            const delRes = await coll.deleteMany({ _id: { $in: objIds } });
            console.log(`Deleted ${delRes.deletedCount} duplicate doc(s). Kept _id=${keeperId}`);
        } catch (err) {
            console.error('Error while removing duplicates for group:', err);
        }
    }

    console.log('\nFinished processing duplicate groups.');
    console.log(`Backups are in: ${backupRoot}`);
    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
