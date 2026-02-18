const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Supabase
const supaUrl = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supaBucket = process.env.SUPABASE_BUCKET || 'uploads';

if (!supaUrl || !supaKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supaUrl, supaKey);

async function migrateImages() {
  try {
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
      where: {
        image: {
          startsWith: 'data:image'
        }
      }
    });

    console.log(`Found ${users.length} users with Base64 images.`);

    for (const user of users) {
      console.log(`Processing user: ${user.email} (${user.id})`);

      try {
        // Extract Base64 data
        const matches = user.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          console.warn(`Invalid Base64 format for user ${user.id}, skipping.`);
          continue;
        }

        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        // Optimize with Sharp
        console.log('Optimizing image...');
        const optimizedBuffer = await sharp(buffer)
          .resize(500, 500, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Upload to Supabase
        const filename = 'avatar.webp';
        const pathInBucket = `users/${user.id}/${filename}`;

        console.log(`Uploading to Supabase: ${pathInBucket}`);
        const { error: upErr } = await supabase.storage
          .from(supaBucket)
          .upload(pathInBucket, optimizedBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (upErr) {
          throw new Error(`Supabase upload failed: ${upErr.message}`);
        }

        // Get Public URL
        const { data: pub } = supabase.storage
          .from(supaBucket)
          .getPublicUrl(pathInBucket);
        
        const publicUrl = pub.publicUrl;

        // Update Database
        console.log(`Updating database with URL: ${publicUrl}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { image: publicUrl }
        });

        console.log('Success!');

      } catch (err) {
        console.error(`Failed to process user ${user.id}:`, err);
      }
    }

    console.log('Migration complete!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateImages();
