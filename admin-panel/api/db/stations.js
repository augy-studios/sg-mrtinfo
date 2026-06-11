import {
    supabase,
    requireAuth,
    paginate
} from './_middleware.js';

const TABLE = 'mrtinfo_stations';
const MUTATING = ['POST', 'PATCH', 'PUT', 'DELETE'];

export default async function handler(req, res) {
    const needsKey = MUTATING.includes(req.method);
    const user = await requireAuth(req, res, needsKey);
    if (!user) return;

    const {
        id
    } = req.query;

    // Count only
    if (req.method === 'GET' && req.query.count === '1') {
        const {
            count
        } = await supabase.from(TABLE).select('*', {
            count: 'exact',
            head: true
        });
        return res.json({
            count
        });
    }

    // LIST
    if (req.method === 'GET' && !id) {
        const { page, limit, from, to } = paginate(req.query);
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || '';
        const ascending = req.query.sortDir !== 'desc';
        const lines = req.query.lines ? req.query.lines.split(',').filter(Boolean) : [];
        const isOpen = 'isOpen' in req.query ? req.query.isOpen === 'true' : null;
        const isInterchange = 'isInterchange' in req.query ? req.query.isInterchange === 'true' : null;
        const nearLat = 'nearLat' in req.query ? parseFloat(req.query.nearLat) : null;
        const nearLng = 'nearLng' in req.query ? parseFloat(req.query.nearLng) : null;
        const isNearSort = sortBy === 'near' && nearLat !== null;

        let q = supabase.from(TABLE).select('*', { count: 'exact' });
        if (!isNearSort) q = q.range(from, to);

        if (sortBy && sortBy !== 'near') {
            q = q.order(sortBy, { ascending });
        } else if (!sortBy) {
            q = q.order('name_en');
        }

        if (search) q = q.or(`name_en.ilike.%${search}%,name_cn.ilike.%${search}%`);
        if (lines.length) q = q.overlaps('allLines', lines);
        if (isOpen !== null) q = q.eq('isOpen', isOpen);
        if (isInterchange !== null) q = q.eq('isInterchange', isInterchange);

        const { data, count, error } = await q;
        if (error) return res.status(500).json({ error: error.message });

        let rows = data || [];
        if (isNearSort) {
            rows = [...rows].sort((a, b) => {
                const da = Math.pow((a.lat || 0) - nearLat, 2) + Math.pow((a.long || 0) - nearLng, 2);
                const db = Math.pow((b.lat || 0) - nearLat, 2) + Math.pow((b.long || 0) - nearLng, 2);
                return da - db;
            });
            rows = rows.slice(from, to + 1);
        }

        return res.json({ rows, total: count, page });
    }

    // GET ONE
    if (req.method === 'GET' && id) {
        const {
            data,
            error
        } = await supabase.from(TABLE).select('*').eq('uid', id).single();
        if (error) return res.status(404).json({
            error: 'Not found'
        });
        return res.json(data);
    }

    // CREATE
    if (req.method === 'POST') {
        const {
            data,
            error
        } = await supabase.from(TABLE).insert(req.body).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(201).json(data);
    }

    // UPDATE
    if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
        const {
            data,
            error
        } = await supabase.from(TABLE).update(req.body).eq('uid', id).select().single();
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.json(data);
    }

    // DELETE
    if (req.method === 'DELETE' && id) {
        const {
            error
        } = await supabase.from(TABLE).delete().eq('uid', id);
        if (error) return res.status(400).json({
            error: error.message
        });
        return res.status(204).end();
    }

    return res.status(405).json({
        error: 'Method not allowed'
    });
}