import { store } from '../store.js';
import { alerts } from './alertHelper.js';
import Swal from 'sweetalert2';

let peer = null;
let activeConnection = null;
let isHost = false;
let syncCode = null;
let onStatusChange = null;
let isApplyingRemoteUpdate = false;
let reconnectTimer = null;

// Helper to schedule client-side reconnection attempts
function scheduleReconnect(code) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const config = JSON.parse(localStorage.getItem('fintrack_sync_config') || '{}');
    if (config.role === 'client' && config.code === code && (!activeConnection || !activeConnection.open)) {
      syncHelper.connectToSession(code, false); // false = background sync, no error popups
    }
  }, 10000);
}

// Merge helper: deduplicates transactions and rules by ID, merges settings
function mergeStates(stateA, stateB) {
  const txMap = new Map();
  (stateA.transactions || []).forEach(tx => txMap.set(tx.id, tx));
  (stateB.transactions || []).forEach(tx => txMap.set(tx.id, tx));

  const ruleMap = new Map();
  (stateA.recurringRules || []).forEach(r => ruleMap.set(r.id, r));
  (stateB.recurringRules || []).forEach(r => ruleMap.set(r.id, r));

  return {
    transactions: Array.from(txMap.values()).map(tx => ({
      ...tx,
      date: new Date(tx.date),
      amount: parseFloat(tx.amount)
    })).sort((a, b) => b.date - a.date),
    
    recurringRules: Array.from(ruleMap.values()).map(r => ({
      ...r,
      amount: parseFloat(r.amount),
      nextDueDate: new Date(r.nextDueDate),
      createdAt: new Date(r.createdAt)
    })),
    
    settings: {
      ...stateA.settings,
      ...stateB.settings
    }
  };
}

export const syncHelper = {
  // Callback is used to tell settings UI to update itself
  init(statusChangeCallback) {
    onStatusChange = statusChangeCallback;
  },

  isConnected() {
    return activeConnection !== null && activeConnection.open;
  },

  getSyncCode() {
    return syncCode;
  },

  // Auto-connect on startup if configured
  autoConnect() {
    try {
      const configStr = localStorage.getItem('fintrack_sync_config');
      if (!configStr) return;
      const config = JSON.parse(configStr);
      if (config.role === 'host' && config.code) {
        this.hostSession(config.code, false);
      } else if (config.role === 'client' && config.code) {
        this.connectToSession(config.code, false);
      }
    } catch (e) {
      console.error('Auto-connect parse failed:', e);
    }
  },

  // Host a session
  hostSession(forcedCode = null, isManual = false) {
    this.disconnect(false); // keep sync config during restart
    isHost = true;

    // Generate random 5-digit code if not forced
    const code = forcedCode || Math.floor(10000 + Math.random() * 90000).toString();
    syncCode = code;

    localStorage.setItem('fintrack_sync_config', JSON.stringify({ role: 'host', code }));
    
    if (typeof Peer === 'undefined') {
      if (isManual) {
        alerts.error(
          store.settings.language === 'en' ? 'P2P Library Error' : 'เกิดข้อผิดพลาดในการโหลดตัวซิงค์',
          store.settings.language === 'en' ? 'PeerJS library not loaded yet.' : 'ไม่พบไลบรารีสำหรับซิงค์ข้อมูล กรุณาเชื่อมต่ออินเทอร์เน็ต'
        );
      }
      return;
    }

    try {
      peer = new Peer(`fintrack-sync-${code}`);

      peer.on('open', (id) => {
        if (onStatusChange) onStatusChange('hosting', code);
      });

      peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.disconnect(false);
        if (err.type === 'unavailable-id') {
          // Retry generating if manual/automatic conflict occurs
          if (!forcedCode) {
            this.hostSession(null, isManual);
          }
        } else {
          if (isManual) {
            alerts.error('Sync Error', err.message);
          }
          // Retry hosting in 10s silently
          setTimeout(() => {
            const config = JSON.parse(localStorage.getItem('fintrack_sync_config') || '{}');
            if (config.role === 'host' && config.code === code) {
              this.hostSession(code, false);
            }
          }, 10000);
        }
      });
    } catch (e) {
      console.error('Peer creation failed:', e);
      this.disconnect(false);
    }
  },

  // Connect to an existing session
  connectToSession(code, isManual = false) {
    this.disconnect(false);
    isHost = false;
    syncCode = code;

    localStorage.setItem('fintrack_sync_config', JSON.stringify({ role: 'client', code }));

    if (typeof Peer === 'undefined') {
      if (isManual) {
        alerts.error(
          store.settings.language === 'en' ? 'P2P Library Error' : 'เกิดข้อผิดพลาดในการโหลดตัวซิงค์',
          store.settings.language === 'en' ? 'PeerJS library not loaded yet.' : 'ไม่พบไลบรารีสำหรับซิงค์ข้อมูล กรุณาเชื่อมต่ออินเทอร์เน็ต'
        );
      }
      return;
    }

    try {
      if (onStatusChange) onStatusChange('connecting');

      peer = new Peer(); // Random peer ID for the connector

      peer.on('open', (id) => {
        const conn = peer.connect(`fintrack-sync-${code}`);
        this.setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('PeerJS connector error:', err);
        if (isManual) {
          alerts.error('Sync Connection Error', err.message);
        }
        this.disconnect(false);
        scheduleReconnect(code);
      });
    } catch (e) {
      console.error('Peer creation failed:', e);
      this.disconnect(false);
      scheduleReconnect(code);
    }
  },

  // Common connection handler
  setupConnection(conn) {
    activeConnection = conn;

    conn.on('open', () => {
      if (onStatusChange) onStatusChange('connected');
      
      // Perform initial handshake: exchange states
      conn.send({
        type: 'SYNC_HANDSHAKE',
        data: {
          transactions: store.transactions,
          recurringRules: store.recurringRules,
          settings: store.settings
        }
      });
    });

    conn.on('data', (payload) => {
      if (payload && payload.type === 'SYNC_HANDSHAKE') {
        // Merge state when connecting
        const localState = {
          transactions: store.transactions,
          recurringRules: store.recurringRules,
          settings: store.settings
        };
        const merged = mergeStates(localState, payload.data);
        
        isApplyingRemoteUpdate = true;
        store.transactions = merged.transactions;
        store.recurringRules = merged.recurringRules;
        store.settings = merged.settings;
        store.save();
        isApplyingRemoteUpdate = false;

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', store.settings.isDarkMode ? 'dark' : 'light');
        document.documentElement.lang = store.settings.language === 'en' ? 'en' : 'th';

        // Notify client B about the merged state so we are completely symmetric
        conn.send({
          type: 'SYNC_MERGED',
          data: merged
        });

        alerts.success(
          store.settings.language === 'en' ? 'Devices Synced!' : 'ซิงค์ข้อมูลสำเร็จ!',
          store.settings.language === 'en' ? 'Successfully connected and merged databases.' : 'เชื่อมต่อสำเร็จ และผสานข้อมูลอุปกรณ์เข้าด้วยกันแล้ว'
        );
      } else if (payload && payload.type === 'SYNC_MERGED') {
        // Apply merged state from host
        isApplyingRemoteUpdate = true;
        store.transactions = payload.data.transactions.map(t => ({ ...t, date: new Date(t.date) }));
        store.recurringRules = payload.data.recurringRules.map(r => ({ ...r, nextDueDate: new Date(r.nextDueDate), createdAt: new Date(r.createdAt) }));
        store.settings = payload.data.settings;
        store.save();
        isApplyingRemoteUpdate = false;

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', store.settings.isDarkMode ? 'dark' : 'light');
        document.documentElement.lang = store.settings.language === 'en' ? 'en' : 'th';

        alerts.success(
          store.settings.language === 'en' ? 'Devices Synced!' : 'ซิงค์ข้อมูลสำเร็จ!',
          store.settings.language === 'en' ? 'Successfully connected and merged databases.' : 'เชื่อมต่อสำเร็จ และผสานข้อมูลอุปกรณ์เข้าด้วยกันแล้ว'
        );
      } else if (payload && payload.type === 'STATE_UPDATE') {
        // Update local state without triggering subscriber broadcast
        isApplyingRemoteUpdate = true;
        store.transactions = payload.data.transactions.map(t => ({ ...t, date: new Date(t.date) }));
        store.recurringRules = payload.data.recurringRules.map(r => ({ ...r, nextDueDate: new Date(r.nextDueDate), createdAt: new Date(r.createdAt) }));
        store.settings = payload.data.settings;
        store.save();
        isApplyingRemoteUpdate = false;

        // Apply theme
        document.documentElement.setAttribute('data-theme', store.settings.isDarkMode ? 'dark' : 'light');
        document.documentElement.lang = store.settings.language === 'en' ? 'en' : 'th';
      }
    });

    conn.on('close', () => {
      this.disconnect(false);
      const config = JSON.parse(localStorage.getItem('fintrack_sync_config') || '{}');
      if (config.role === 'client' && config.code) {
        scheduleReconnect(config.code);
      }
    });

    conn.on('error', (err) => {
      console.error('Connection data error:', err);
      this.disconnect(false);
    });
  },

  // Disconnect active peers
  disconnect(clearConfig = true) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (clearConfig) {
      localStorage.removeItem('fintrack_sync_config');
    }
    if (activeConnection) {
      try { activeConnection.close(); } catch(e) {}
      activeConnection = null;
    }
    if (peer) {
      try { peer.destroy(); } catch(e) {}
      peer = null;
    }
    isHost = false;
    syncCode = null;
    if (onStatusChange) {
      const config = JSON.parse(localStorage.getItem('fintrack_sync_config') || '{}');
      if (!clearConfig && config.role === 'client') {
        onStatusChange('connecting');
      } else if (!clearConfig && config.role === 'host') {
        onStatusChange('hosting', config.code);
      } else {
        onStatusChange('idle');
      }
    }
  },

  // Broadcast state changes
  broadcastState() {
    if (activeConnection && activeConnection.open && !isApplyingRemoteUpdate) {
      activeConnection.send({
        type: 'STATE_UPDATE',
        data: {
          transactions: store.transactions,
          recurringRules: store.recurringRules,
          settings: store.settings
        }
      });
    }
  }
};

// Subscribe to store mutations
store.subscribe(() => {
  syncHelper.broadcastState();
});
