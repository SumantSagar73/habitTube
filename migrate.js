import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGO_DB || 'habittube';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nadouicomidjpdmqsdxh.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LhPIgK15hhuPr971JatGzA_sDFHWCvA';

async function migrate() {
  console.log('--- HabitTube Database Migration ---');
  console.log('Connecting to local MongoDB...');
  const mongoClient = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
  
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB.');
    const db = mongoClient.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    
    if (!collections.some(c => c.name === 'states')) {
      console.log("No 'states' collection found in MongoDB. Nothing to migrate.");
      return;
    }
    
    const statesCollection = db.collection('states');
    const docs = await statesCollection.find({}).toArray();
    console.log(`Found ${docs.length} documents in MongoDB 'states' collection.`);
    
    if (docs.length === 0) {
      console.log('No data to migrate.');
      return;
    }

    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('Migrating records to Supabase...');
    let migratedCount = 0;
    for (const doc of docs) {
      // MongoDB documents have _id, userId, state, updatedAt
      const { userId, state, updatedAt } = doc;
      if (!userId || !state) {
        console.warn('Skipping invalid document:', doc);
        continue;
      }
      
      console.log(`Migrating state for user: ${userId} (updatedAt: ${updatedAt})`);
      const { error } = await supabase
        .from('states')
        .upsert({ userId, state, updatedAt: Number(updatedAt) }, { onConflict: 'userId' });
      
      if (error) {
        console.error(`Error migrating user ${userId}:`, error.message);
      } else {
        migratedCount++;
      }
    }
    
    console.log(`Successfully migrated ${migratedCount}/${docs.length} records to Supabase!`);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoClient.close();
  }
}

migrate();
