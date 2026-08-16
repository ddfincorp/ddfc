const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const totalsQ = pool.query(
    `SELECT count(*)::int AS total, COALESCE(sum(amount),0)::numeric AS pipeline_value FROM leads`
  );
  const disbursedQ = pool.query(
    `SELECT COALESCE(sum(amount),0)::numeric AS disbursed_value FROM leads WHERE status = 'Disbursed'`
  );
  const statusQ = pool.query(
    `SELECT status, count(*)::int AS n FROM leads GROUP BY status`
  );
  const sourceQ = pool.query(
    `SELECT source, count(*)::int AS n FROM leads GROUP BY source`
  );

  const [totals, disbursed, byStatus, bySource] = await Promise.all([totalsQ, disbursedQ, statusQ, sourceQ]);

  const total = totals.rows[0].total;
  const pipelineValue = Number(totals.rows[0].pipeline_value);

  res.json({
    total,
    pipelineValue,
    disbursedValue: Number(disbursed.rows[0].disbursed_value),
    avgTicket: total ? pipelineValue / total : 0,
    byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])),
    bySource: Object.fromEntries(bySource.rows.map((r) => [r.source, r.n])),
  });
});

module.exports = router;
