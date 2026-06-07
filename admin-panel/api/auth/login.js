import {
    createClient
} from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({
        error: 'Method not allowed'
    });

    const {
        username,
        password
    } = req.body || {};
    if (!username || !password) return res.status(400).json({
        error: 'Missing credentials'
    });

    const {
        data: users,
        error
    } = await supabase
        .from('mrtinfo_users')
        .select('id, username, display_name, password_hash, is_approved, is_admin')
        .eq('username', username)
        .limit(1);

    if (error || !users?.length) return res.status(401).json({
        error: 'Invalid credentials'
    });

    const user = users[0];

    if (!user.is_approved) return res.status(403).json({
        error: 'Account pending approval'
    });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({
        error: 'Invalid credentials'
    });

    // Create session
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const {
        error: sessErr
    } = await supabase.from('mrtinfo_sessions').insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
    });

    if (sessErr) return res.status(500).json({
        error: 'Session creation failed'
    });

    res.setHeader('Set-Cookie', [
        `mrtinfo_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
    ]);

    return res.status(200).json({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin
    });
}