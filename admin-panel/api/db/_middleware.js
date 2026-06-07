// Shared helpers for all DB API routes
import {
    createClient
} from '@supabase/supabase-js';
import {
    getSession
} from '../auth/me.js';
import crypto from 'crypto';

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Require session (GET requests) OR session + API key (mutating requests)
export async function requireAuth(req, res, requireKey = false) {
    const user = await getSession(req);
    if (!user) {
        res.status(401).json({
            error: 'Not authenticated'
        });
        return null;
    }

    if (requireKey) {
        const rawKey = req.headers['x-api-key'];
        if (!rawKey) {
            res.status(403).json({
                error: 'API key required'
            });
            return null;
        }

        // API key format: random 32+ byte hex
        // We store sha256(key) as hash comparison
        const keyHash = crypto.createHash('sha256').update(rawKey).digest();
        const lastEight = rawKey.slice(-8);

        const {
            data: keys
        } = await supabase
            .from('mrtinfo_apikey')
            .select('uid, hash, isAdmin, expiresAt')
            .eq('"lastEight"', lastEight)
            .limit(10);

        if (!keys?.length) {
            res.status(403).json({
                error: 'Invalid API key'
            });
            return null;
        }

        // Compare hash (stored as bytea hex string from postgres)
        const valid = keys.find(k => {
            const stored = Buffer.isBuffer(k.hash) ?
                k.hash :
                Buffer.from(k.hash.replace(/^\\x/, ''), 'hex');
            return crypto.timingSafeEqual(keyHash, stored);
        });

        if (!valid) {
            res.status(403).json({
                error: 'Invalid API key'
            });
            return null;
        }

        if (valid.expiresAt && new Date(valid.expiresAt) < new Date()) {
            res.status(403).json({
                error: 'API key expired'
            });
            return null;
        }

        // Update lastUsed
        await supabase.from('mrtinfo_apikey')
            .update({
                '"lastUsed"': new Date().toISOString()
            })
            .eq('uid', valid.uid);
    }

    return user;
}

export function paginate(query) {
    const page = parseInt(query.page || '0', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 200);
    return {
        page,
        limit,
        from: page * limit,
        to: page * limit + limit - 1
    };
}