const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  getAdminPayments,
  getAuditLogs,
  getQueueHealth,
  getWorkersStatus,
  getSystemConfig,
  updateSystemConfig,
  toggleFaultSimulation,
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/stats', authenticateToken, requireAdmin, getStats);
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.get('/payments', authenticateToken, requireAdmin, getAdminPayments);
router.get('/audit-logs', authenticateToken, requireAdmin, getAuditLogs);
router.get('/queue-health', authenticateToken, requireAdmin, getQueueHealth);
router.get('/workers', authenticateToken, requireAdmin, getWorkersStatus);

// System Configuration & Fault Simulation Endpoints
router.get('/config', authenticateToken, requireAdmin, getSystemConfig);
router.post('/config', authenticateToken, requireAdmin, updateSystemConfig);
router.post('/toggle-fault', authenticateToken, requireAdmin, toggleFaultSimulation);
router.post('/simulate-failure', authenticateToken, requireAdmin, toggleFaultSimulation);

module.exports = router;
