import {
    supabase,
    requireAuth,
    paginate
} from './_middleware.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    const needsKey = req.method === 'DELETE';
    const user = await requireAuth(req, res, needsKey);
    if (!user) return;

    if (!user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const {
        id
    } = req.query;

    if (req.method === 'GET' && req.query.count === '1') {
        const {
            count
        } = await supabase.from('mrtinfo_apikey').select('*', {
            count: 'exact',
            head: true
        });
        return res.json({
            count
        });
    }

    // LIST — never return hash/salt
    if (req.method === 'GET' && !id) {
        const {
            from,
            to,
            page
        } = paginate(req.query);
        const {
            data,
            count,
            error
        } = await supabase
            .from('mrtinfo_apikey')
            .select('uid, name, "lastEight", "isAdmin", "createdAt", "expiresAt", "lastUsed"', {
                count: 'exact'
            })
            .range(from, to)
            .order('"createdAt"', {
                ascending: false
            });

        if (error) return res.status(500).json({
            error: error.message
        });
        return res.json({
            rows: data,
            total: count,
            page
        });
    }

    // CREATE — generate a new key
    if (req.method === 'POST') {
        const {
            name,
            isAdmin = false,
            expiresAt = null,
            password,
        } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });
        if (!password) return res.status(400).json({ error: 'Password is required' });

        const { data: users } = await supabase
            .from('mrtinfo_users')
            .select('password_hash')
            .eq('id', user.id)
            .limit(1);

        if (!users?.length) return res.status(401).json({ error: 'User not found' });
        const validPw = await bcrypt.compare(password, users[0].password_hash);
        if (!validPw) return res.status(401).json({ error: 'Incorrect password' });

        // Generate a cryptographically random key
        const rawKey = crypto.randomBytes(36).toString('base64url'); // 48-char URL-safe string
        const salt = crypto.randomBytes(16);
        const hash = crypto.createHash('sha256').update(rawKey).digest();
        const lastEight = rawKey.slice(-8);

        const {
            data,
            error
        } = await supabase.from('mrtinfo_apikey').insert({
            name,
            hash: '\\x' + hash.toString('hex'),
            salt: '\\x' + salt.toString('hex'),
            lastEight,
            isAdmin,
            expiresAt,
        }).select('uid, name, "lastEight", "isAdmin", "createdAt", "expiresAt"').single();

        if (error) return res.status(400).json({
            error: error.message
        });

        // Return the raw key ONCE — never stored
        return res.status(201).json({
            ...data,
            key: rawKey
        });
    }

    // DELETE (revoke)
    if (req.method === 'DELETE' && id) {
        const {
            error
        } = await supabase.from('mrtinfo_apikey').delete().eq('uid', id);
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(204).end();
    }

    return res.status(405).json({
        error: 'Method not allowed'
    });
}