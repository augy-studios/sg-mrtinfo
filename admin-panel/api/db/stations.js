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
        const {
            page,
            limit,
            from,
            to
        } = paginate(req.query);
        const search = req.query.search || '';

        let q = supabase.from(TABLE)
            .select('*', {
                count: 'exact'
            })
            .range(from, to)
            .order('name_en');

        if (search) {
            q = q.or(`name_en.ilike.%${search}%,name_cn.ilike.%${search}%`);
        }

        const {
            data,
            count,
            error
        } = await q;
        if (error) return res.status(500).json({
            error: error.message
        });
        return res.json({
            rows: data,
            total: count,
            page
        });
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