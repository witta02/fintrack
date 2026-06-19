import { store } from '../store.js';
import { alerts } from './alertHelper.js';
import Swal from 'sweetalert2';

let peer = null;
let activeConnection = null;
let isHost = false;
let syncCode = null;
let onStatusChange = null;
let isApplyingRemoteUpdate = false;

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

  // Host a session
  hostSession() {
    this.disconnect();
    isHost = true;

    // Generate random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    syncCode = code;

    const peerId = `fintrack-sync-${code}`;
    
    if (typeof Peer === 'undefined') {
      alerts.error(
        store.settings.language === 'en' ? 'P2P Library Error' : 'เกิดข้อผิดพลาดในการโหลดตัวซิงค์',
        store.settings.language === 'en' ? 'PeerJS library not loaded yet.' : 'ไม่พบไลบรารีสำหรับซิงค์ข้อมูล กรุณาเชื่อมต่ออินเทอร์เน็ต'
      );
      return;
    }

    try {
      peer = new Peer(peerId);

      peer.on('open', (id) => {
        if (onStatusChange) onStatusChange('hosting', code);
      });

      peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          // Retry generating a new code if unavailable
          this.hostSession();
        } else {
          alerts.error('Sync Error', err.message);
          this.disconnect();
        }
      });
    } catch (e) {
      console.error('Peer creation failed:', e);
      this.disconnect();
    }
  },

  // Connect to an existing session
  connectToSession(code) {
    this.disconnect();
    isHost = false;
    syncCode = code;

    if (typeof Peer === 'undefined') {
      alerts.error(
        store.settings.language === 'en' ? 'P2P Library Error' : 'เกิดข้อผิดพลาดในการโหลดตัวซิงค์',
        store.settings.language === 'en' ? 'PeerJS library not loaded yet.' : 'ไม่พบไลบรารีสำหรับซิงค์ข้อมูล กรุณาเชื่อมต่ออินเทอร์เน็ต'
      );
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
        alerts.error('Sync Connection Error', err.message);
        this.disconnect();
      });
    } catch (e) {
      console.error('Peer creation failed:', e);
      this.disconnect();
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
      this.disconnect();
    });

    conn.on('error', (err) => {
      console.error('Connection data error:', err);
      this.disconnect();
    });
  },

  // Disconnect active peers
  disconnect() {
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
    if (onStatusChange) onStatusChange('idle');
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
