import {
  convert,
  convertToTHB,
  getSymbol,
  getCurrencyInfo,
} from "./currency.js";
import { supabase } from "./supabase.js";
import { t as i18n } from "./i18n.js";
import { getCategoryInfo } from "./categories.js";

// Simple pub/sub system for store updates
const listeners = new Set();

export const store = {
  user: null,
  transactions: [],
  recurringRules: [],
  downPayments: [],
  wallets: [],
  savingsGoals: [],
  settings: {
    selectedCurrency: "THB",
    isDarkMode: true,
    isPremium: true,
    language: "th",
    hasCompletedOnboarding: false,
    taxDeduction: 60000,
    taxPersonalDeduction: 60000,
    taxSocialSecurity: 9000,
    taxProvidentFund: 0,
    taxMutualFunds: 0,
    taxOtherDeductions: 0,
    dataVersion: 4,
    xp: 0,
    level: 1,
    customCategories: [],
    coins: 0,
    claimedAchievements: [],
    unlockedThemes: ["light", "dark"],
    forgivenTransactions: [],
    collectibles: [],
    showNetWorthCard: true,
    categoryBudgets: {},
    questsState: { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify() {
    for (const listener of listeners) {
      try {
        listener();
      } catch (e) {
        console.error("Error in store listener:", e);
      }
    }
  },

  init() {
    // Load from LocalStorage (synchronous — no network calls here)
    const savedTransactions = localStorage.getItem("fintrack_transactions");
    const savedRules = localStorage.getItem("fintrack_recurring_rules");
    const savedDownPayments = localStorage.getItem("fintrack_down_payments");
    const savedSettings = localStorage.getItem("fintrack_settings");
    const savedNetWorth = localStorage.getItem("fintrack_net_worth");
    const savedWallets = localStorage.getItem("fintrack_wallets");
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    if (savedWallets) {
      this.wallets = JSON.parse(savedWallets);
    } else {
      this.wallets = [
        { id: "default", name: "เงินสด", type: "cash", color: "#F5C842", icon: "cash", balance: 0, isDefault: true, currency: "THB" },
        { id: "bank_main", name: "บัญชีธนาคาร", type: "bank", color: "#3B82F6", icon: "bank", balance: 0, isDefault: false, currency: "THB" },
        { id: "invest_main", name: "พอร์ตลงทุน", type: "investment", color: "#6366F1", icon: "investment", balance: 0, isDefault: false, currency: "THB" },
      ];
    }

    if (savedNetWorth) {
      this.netWorth = JSON.parse(savedNetWorth);
    } else {
      this.netWorth = {
        assets: { cash: 0, investments: 0, property: 0, other: 0 },
        liabilities: { creditCard: 0, loans: 0, other: 0 },
      };
    }

    if (savedTransactions) {
      this.transactions = JSON.parse(savedTransactions).map((t) => ({
        ...t,
        date: new Date(t.date),
        amount: parseFloat(t.amount),
      }));
    } else {
      this.transactions = [];
    }

    if (savedRules) {
      this.recurringRules = JSON.parse(savedRules).map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        nextDueDate: new Date(r.nextDueDate),
        createdAt: new Date(r.createdAt),
      }));
    } else {
      this.recurringRules = [];
    }

    const savedSavingsGoals = localStorage.getItem("fintrack_savings_goals");
    if (savedSavingsGoals) {
      this.savingsGoals = JSON.parse(savedSavingsGoals);
    } else {
      this.savingsGoals = [];
    }

    this.downPayments = savedDownPayments
      ? JSON.parse(savedDownPayments).map((plan) => ({
          ...plan,
          totalAmount: parseFloat(plan.totalAmount) || 0,
          paidAmount: parseFloat(plan.paidAmount) || 0,
          dueDate: plan.dueDate ? new Date(plan.dueDate) : null,
        }))
      : [];

    this.removeLegacyDemoData();

    // Process recurring rules immediately
    this.processRecurringPayments();

    if (!this.settings.theme) {
      this.settings.theme = this.settings.isDarkMode ? "dark" : "light";
    }

    // Set initial theme
    document.documentElement.setAttribute(
      "data-theme",
      this.settings.theme,
    );
    document.documentElement.lang =
      this.settings.language === "en" ? "en" : "th";
    
    this.checkQuests();
    this.isInitialized = true;
  },

  removeLegacyDemoData() {
    if (this.settings.dataVersion >= 4) return;

    const demoTransactionIds = new Set([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "101",
      "102",
      "103",
      "104",
    ]);
    const demoRuleIds = new Set(["r1", "r2"]);

    const beforeTransactions = this.transactions.length;
    const beforeRules = this.recurringRules.length;

    this.transactions = this.transactions.filter(
      (t) => !demoTransactionIds.has(String(t.id)),
    );
    this.recurringRules = this.recurringRules.filter(
      (r) => !demoRuleIds.has(String(r.id)),
    );

    if (this.settings.taxPersonalDeduction === undefined) {
      this.settings.taxPersonalDeduction = this.settings.taxDeduction || 60000;
      this.settings.taxSocialSecurity = 9000;
      this.settings.taxProvidentFund = 0;
      this.settings.taxMutualFunds = 0;
      this.settings.taxOtherDeductions = 0;
    }

    this.settings.dataVersion = 4;

    if (
      beforeTransactions !== this.transactions.length ||
      beforeRules !== this.recurringRules.length
    ) {
      this.save();
    } else {
      localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    }
  },

  save() {
    this.recalculateXP();
    localStorage.setItem(
      "fintrack_transactions",
      JSON.stringify(this.transactions),
    );
    localStorage.setItem(
      "fintrack_recurring_rules",
      JSON.stringify(this.recurringRules),
    );
    localStorage.setItem("fintrack_down_payments", JSON.stringify(this.downPayments));
    localStorage.setItem("fintrack_savings_goals", JSON.stringify(this.savingsGoals || []));
    localStorage.setItem("fintrack_wallets", JSON.stringify(this.wallets));
    localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    if (this.user) {
      this.saveSettingsToCloud().catch((err) =>
        console.error("Error auto-saving settings to cloud:", err)
      );
    }
    this.notify();
  },

  getActiveBoosts() {
    let xpMulti = 1.0;
    let coinMulti = 1.0;
    const collectibles = this.settings.collectibles || [];
    
    collectibles.forEach(id => {
      if (id === 'skateboard' || id === 'cat' || id === 'dog') xpMulti += 0.02;
      if (id === 'watch') coinMulti += 0.05;
      if (id === 'car' || id === 'dragon') xpMulti += 0.05;
      if (id === 'rocket') xpMulti += 0.10;
      if (id === 'island') xpMulti += 0.15;
      if (id === 'crown') coinMulti += 0.50;
      if (id === 'diamond') xpMulti += 0.20;
    });

    return { xpMulti, coinMulti };
  },

  checkQuests() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.settings.questsState || this.settings.questsState.date !== today) {
      // Reset daily quests
      this.settings.questsState = {
        date: today,
        checkIn: false,
        firstIncome: false,
        stayClean: true,
        claimed: []
      };
    }

    // 1. Daily Check-in
    this.settings.questsState.checkIn = true;

    // 2. First Income
    const todayTxs = this.transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === today;
    });
    if (todayTxs.some(t => t.isIncome)) {
      this.settings.questsState.firstIncome = true;
    }

    // 3. Stay Clean
    const badHabits = ["junk", "gambling", "alcohol", "อาหารขยะ", "พนัน", "แอลกอฮอล์", "หวย", "lottery", "เหล้า", "เบียร์", "beer", "liquor", "สลาก"];
    const hasBadHabit = todayTxs.some(t => {
      if (t.isIncome) return false;
      const isForgiven = (this.settings.forgivenTransactions || []).includes(t.id);
      if (isForgiven) return false;
      const cat = (t.category || "").toLowerCase();
      return badHabits.some(bad => cat.includes(bad));
    });
    this.settings.questsState.stayClean = !hasBadHabit;
  },

  recalculateXP() {
    const badHabits = ["junk", "gambling", "alcohol", "อาหารขยะ", "พนัน", "แอลกอฮอล์", "หวย", "lottery", "เหล้า", "เบียร์", "beer", "liquor", "สลาก"];
    const boosts = this.getActiveBoosts();
    
    let totalXpGained = 0;
    
    this.transactions.forEach(tx => {
      const amtXp = (tx.amount || 0) / 100;
      if (tx.isIncome) {
        totalXpGained += (amtXp * boosts.xpMulti);
      } else {
        const isForgiven = (this.settings.forgivenTransactions || []).includes(tx.id);
        const cat = (tx.category || "").toLowerCase();
        const isBad = badHabits.some(bad => cat.includes(bad));
        if (isBad && !isForgiven) {
          totalXpGained -= amtXp; // Penalty!
        } else {
          totalXpGained += amtXp; // Good habit to track normal expenses
        }
      }
    });

    let uniqueDays = new Set(this.transactions.map(t => new Date(t.date).toDateString())).size;
    let baseTotalXp = Math.floor((uniqueDays * 100) + totalXpGained);
    
    if (baseTotalXp < 0) baseTotalXp = 0; // Bankruptcy floor

    let oldLevel = this.settings.level || 1;
    let oldXp = this.settings.xp || 0;
    
    let calculatedLevel = 1;
    let requiredXp = 100;
    
    while (baseTotalXp >= requiredXp) {
      baseTotalXp -= requiredXp;
      calculatedLevel++;
      requiredXp = calculatedLevel * 100;
    }
    
    this.settings.xp = baseTotalXp;
    this.settings.level = calculatedLevel;

    if (calculatedLevel > oldLevel && this.isInitialized) {
      window.dispatchEvent(new CustomEvent('levelup', { 
        detail: { level: calculatedLevel } 
      }));
    }
    
    if (this.user && (oldXp !== this.settings.xp || oldLevel !== this.settings.level)) {
      this.saveSettingsToCloud();
    }
  },

  async handleLoginSync(user, options = {}) {
    const { ignoreLocalStorage = false } = options;
    if (!user) return;
    this.user = user;

    try {
      // 1. Fetch settings from Supabase (user_profiles or legacy user table)
      let { data: dbSettings, error: settingsError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError && settingsError.code === '42P01') {
        // Fallback to legacy 'user' table if user_profiles doesn't exist
        const legacy = await supabase
          .from('user')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        dbSettings = legacy.data;
      } else if (settingsError) {
        console.warn("Error fetching user_profiles:", settingsError);
      }

      // 2. Fetch transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (txError) throw txError;

      // 3. Fetch recurring rules
      const { data: dbRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', user.id);

      if (rulesError) throw rulesError;

      // --- SETTINGS SYNC ---
      if (dbSettings) {
        // Merge arrays so unlocked items, themes, achievements, coins are never lost upon login
        const dbUnlocked = Array.isArray(dbSettings.unlocked_themes) ? dbSettings.unlocked_themes : [];
        const localUnlocked = Array.isArray(this.settings.unlockedThemes) ? this.settings.unlockedThemes : ["light", "dark"];
        const mergedUnlockedThemes = Array.from(new Set([...dbUnlocked, ...localUnlocked, "light", "dark"]));

        const dbCollectibles = Array.isArray(dbSettings.collectibles) ? dbSettings.collectibles : [];
        const localCollectibles = Array.isArray(this.settings.collectibles) ? this.settings.collectibles : [];
        const mergedCollectibles = Array.from(new Set([...dbCollectibles, ...localCollectibles]));

        const dbAchievements = Array.isArray(dbSettings.claimed_achievements) ? dbSettings.claimed_achievements : [];
        const localAchievements = Array.isArray(this.settings.claimedAchievements) ? this.settings.claimedAchievements : [];
        const mergedAchievements = Array.from(new Set([...dbAchievements, ...localAchievements]));

        const dbForgiven = Array.isArray(dbSettings.forgiven_transactions) ? dbSettings.forgiven_transactions : [];
        const localForgiven = Array.isArray(this.settings.forgivenTransactions) ? this.settings.forgivenTransactions : [];
        const mergedForgiven = Array.from(new Set([...dbForgiven, ...localForgiven]));

        const dbUsedSlips = Array.isArray(dbSettings.used_slips) ? dbSettings.used_slips : [];
        const localUsedSlips = Array.isArray(this.settings.usedSlips) ? this.settings.usedSlips : [];
        const mergedUsedSlips = Array.from(new Set([...dbUsedSlips, ...localUsedSlips]));

        // For coins: take the max between cloud coins and local coins so coins are never lost
        const cloudCoins = dbSettings.coins != null ? Number(dbSettings.coins) : 0;
        const localCoins = Number(this.settings.coins) || 0;
        const finalCoins = Math.max(cloudCoins, localCoins);

        this.settings = {
          ...this.settings,
          selectedCurrency: dbSettings.selected_currency || this.settings.selectedCurrency || 'THB',
          isDarkMode: dbSettings.is_dark_mode !== undefined ? dbSettings.is_dark_mode : this.settings.isDarkMode,
          theme: dbSettings.theme || (dbSettings.is_dark_mode === false ? 'light' : (dbSettings.is_dark_mode === true ? 'dark' : this.settings.theme || 'dark')),
          language: dbSettings.language || this.settings.language || 'th',
          taxPersonalDeduction: dbSettings.tax_personal_deduction != null ? parseFloat(dbSettings.tax_personal_deduction) : 60000,
          taxSocialSecurity: dbSettings.tax_social_security != null ? parseFloat(dbSettings.tax_social_security) : 9000,
          taxProvidentFund: dbSettings.tax_provident_fund != null ? parseFloat(dbSettings.tax_provident_fund) : 0,
          taxMutualFunds: dbSettings.tax_mutual_funds != null ? parseFloat(dbSettings.tax_mutual_funds) : 0,
          taxOtherDeductions: dbSettings.tax_other_deductions != null ? parseFloat(dbSettings.tax_other_deductions) : 0,
          xp: Math.max(dbSettings.xp || 0, this.settings.xp || 0),
          level: Math.max(dbSettings.level || 1, this.settings.level || 1),
          customCategories: (() => {
            const cloud = dbSettings.custom_categories || [];
            if (ignoreLocalStorage) return cloud;
            const local = this.settings.customCategories || [];
            const merged = [...cloud];
            for (const cat of local) {
              if (!merged.some(c => c === cat || (c && cat && c.name === cat.name))) {
                merged.push(cat);
              }
            }
            return merged;
          })(),
          coins: finalCoins,
          claimedAchievements: mergedAchievements,
          unlockedThemes: mergedUnlockedThemes,
          forgivenTransactions: mergedForgiven,
          collectibles: mergedCollectibles,
          questsState: dbSettings.quests_state || this.settings.questsState,
          usedSlips: mergedUsedSlips,
        };

        // Restore Wallets, Savings Goals, Down Payments, and Category Limits from Cloud
        const cloudBundle = dbSettings.quests_state?.cloud_vault_bundle;
        const cloudWallets = (dbSettings.wallets && Array.isArray(dbSettings.wallets) && dbSettings.wallets.length > 0)
          ? dbSettings.wallets
          : (cloudBundle?.wallets && Array.isArray(cloudBundle.wallets) && cloudBundle.wallets.length > 0 ? cloudBundle.wallets : null);
        
        if (cloudWallets) {
          this.wallets = cloudWallets;
          localStorage.setItem("fintrack_wallets", JSON.stringify(this.wallets));
        }

        const cloudGoals = (dbSettings.savings_goals && Array.isArray(dbSettings.savings_goals))
          ? dbSettings.savings_goals
          : (cloudBundle?.savings_goals && Array.isArray(cloudBundle.savings_goals) ? cloudBundle.savings_goals : null);
        
        if (cloudGoals) {
          this.savingsGoals = cloudGoals;
          localStorage.setItem("fintrack_savings_goals", JSON.stringify(this.savingsGoals));
        }

        const cloudDownPayments = (dbSettings.down_payments && Array.isArray(dbSettings.down_payments))
          ? dbSettings.down_payments
          : (cloudBundle?.down_payments && Array.isArray(cloudBundle.down_payments) ? cloudBundle.down_payments : null);
        
        if (cloudDownPayments) {
          this.downPayments = cloudDownPayments;
          localStorage.setItem("fintrack_down_payments", JSON.stringify(this.downPayments));
        }

        if (cloudBundle?.category_limits) {
          this.categoryLimits = cloudBundle.category_limits;
          localStorage.setItem("fintrack_category_limits", JSON.stringify(this.categoryLimits));
        }

        if (cloudBundle?.savings_milestones) {
          this.settings.savingsMilestones = cloudBundle.savings_milestones;
        }
        if (cloudBundle?.savings_claimed_milestones) {
          this.settings.savingsClaimedMilestones = cloudBundle.savings_claimed_milestones;
        }
        if (cloudBundle?.total_savings_coins) {
          this.settings.totalSavingsCoins = cloudBundle.total_savings_coins;
        }

        // Immediately sync back merged state to cloud database
        await this.saveSettingsToCloud();
      } else {
        // No cloud settings, upload local settings
        await this.saveSettingsToCloud();
      }

      if (ignoreLocalStorage) {
        // LOGIN MODE: Discard local transactions & rules, replace with cloud data
        this.transactions = (dbTransactions || []).map((cloudTx) => ({
          id: cloudTx.id,
          title: cloudTx.title,
          amount: parseFloat(cloudTx.amount),
          isIncome: cloudTx.is_income,
          category: cloudTx.category,
          date: new Date(cloudTx.date),
          recurringId: cloudTx.recurring_id,
        }));

        this.recurringRules = (dbRules || []).map((cloudRule) => ({
          id: cloudRule.id,
          title: cloudRule.title,
          amount: parseFloat(cloudRule.amount),
          isIncome: cloudRule.is_income,
          category: cloudRule.category,
          type: cloudRule.type,
          customDays: cloudRule.custom_days,
          nextDueDate: new Date(cloudRule.next_due_date),
          isActive: cloudRule.is_active,
          createdAt: new Date(cloudRule.created_at),
        }));
      } else {
        // REGISTER MODE: Include/Merge local storage data with cloud
        const localTxsMap = new Map(this.transactions.map((t) => [t.id, t]));
        const cloudTxsMap = new Map((dbTransactions || []).map((t) => [t.id, t]));

        const txsToUpload = [];

        // Check which local transactions need to be uploaded
        for (const [id, localTx] of localTxsMap) {
          if (!cloudTxsMap.has(id)) {
            txsToUpload.push({
              id: localTx.id,
              user_id: user.id,
              title: localTx.title,
              amount: localTx.amount,
              is_income: localTx.isIncome,
              category: localTx.category,
              date:
                localTx.date instanceof Date
                  ? localTx.date.toISOString()
                  : new Date(localTx.date).toISOString(),
              recurring_id: localTx.recurringId || null,
            });
          }
        }

        // Add cloud transactions that do not exist locally
        for (const [id, cloudTx] of cloudTxsMap) {
          if (!localTxsMap.has(id)) {
            this.transactions.push({
              id: cloudTx.id,
              title: cloudTx.title,
              amount: parseFloat(cloudTx.amount),
              isIncome: cloudTx.is_income,
              category: cloudTx.category,
              date: new Date(cloudTx.date),
              recurringId: cloudTx.recurring_id,
            });
          }
        }

        // Upload new local transactions to Supabase
        if (txsToUpload.length > 0) {
          const { error: uploadError } = await supabase
            .from("transactions")
            .insert(txsToUpload);
          if (uploadError)
            console.error("Error uploading transactions:", uploadError);
        }

        // --- RECURRING RULES SYNC ---
        const localRulesMap = new Map(this.recurringRules.map((r) => [r.id, r]));
        const cloudRulesMap = new Map((dbRules || []).map((r) => [r.id, r]));

        const rulesToUpload = [];

        for (const [id, localRule] of localRulesMap) {
          if (!cloudRulesMap.has(id)) {
            rulesToUpload.push({
              id: localRule.id,
              user_id: user.id,
              title: localRule.title,
              amount: localRule.amount,
              is_income: localRule.isIncome,
              category: localRule.category,
              type: localRule.type,
              custom_days: localRule.customDays,
              next_due_date:
                localRule.nextDueDate instanceof Date
                  ? localRule.nextDueDate.toISOString()
                  : new Date(localRule.nextDueDate).toISOString(),
              is_active: localRule.isActive,
              created_at:
                localRule.createdAt instanceof Date
                  ? localRule.createdAt.toISOString()
                  : new Date(localRule.createdAt).toISOString(),
            });
          }
        }

        for (const [id, cloudRule] of cloudRulesMap) {
          if (!localRulesMap.has(id)) {
            this.recurringRules.push({
              id: cloudRule.id,
              title: cloudRule.title,
              amount: parseFloat(cloudRule.amount),
              isIncome: cloudRule.is_income,
              category: cloudRule.category,
              type: cloudRule.type,
              customDays: cloudRule.custom_days,
              nextDueDate: new Date(cloudRule.next_due_date),
              isActive: cloudRule.is_active,
              createdAt: new Date(cloudRule.created_at),
            });
          }
        }

        if (rulesToUpload.length > 0) {
          const { error: uploadRulesError } = await supabase
            .from("recurring_rules")
            .insert(rulesToUpload);
          if (uploadRulesError)
            console.error("Error uploading recurring rules:", uploadRulesError);
        }
      }

      // --- PROCESS RECURRING PAYMENTS with cloud rules now merged ---
      // Run again so any cloud-only recurring rules generate transactions if overdue
      this.processRecurringPayments();

      // --- DYNAMIC XP CALCULATION ---
      this.recalculateXP();

      // FIX: Apply restored theme to document after login sync
      if (this.settings.theme) {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
      }

      // Save merged data to LocalStorage
      localStorage.setItem("fintrack_transactions", JSON.stringify(this.transactions));
      localStorage.setItem("fintrack_recurring_rules", JSON.stringify(this.recurringRules));
      localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));

      // --- NOTIFY UI to re-render with synced data ---
      this.notify();
    } catch (err) {
      console.warn("Supabase sync failed (tables might not exist yet), falling back to LocalStorage:", err);
    }
  },

  async saveSettingsToCloud() {
    if (this.user) {
      try {
        const cloudVaultBundle = {
          wallets: this.wallets || [],
          savings_goals: this.savingsGoals || [],
          down_payments: this.downPayments || [],
          category_limits: this.categoryLimits || {},
          savings_milestones: this.settings.savingsMilestones || {},
          savings_claimed_milestones: this.settings.savingsClaimedMilestones || {},
          total_savings_coins: this.settings.totalSavingsCoins || 0
        };

        const questsState = {
          ...(this.settings.questsState || { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] }),
          cloud_vault_bundle: cloudVaultBundle
        };

        const payload = {
          user_id: this.user.id,
          selected_currency: this.settings.selectedCurrency || 'THB',
          is_dark_mode: this.settings.isDarkMode !== undefined ? this.settings.isDarkMode : true,
          theme: this.settings.theme || 'dark',
          language: this.settings.language || 'th',
          tax_personal_deduction: this.settings.taxPersonalDeduction || 60000,
          tax_social_security: this.settings.taxSocialSecurity || 9000,
          tax_provident_fund: this.settings.taxProvidentFund || 0,
          tax_mutual_funds: this.settings.taxMutualFunds || 0,
          tax_other_deductions: this.settings.taxOtherDeductions || 0,
          xp: this.settings.xp || 0,
          level: this.settings.level || 1,
          custom_categories: this.settings.customCategories || [],
          coins: this.settings.coins || 0,
          claimed_achievements: this.settings.claimedAchievements || [],
          unlocked_themes: this.settings.unlockedThemes || ["light", "dark"],
          forgiven_transactions: this.settings.forgivenTransactions || [],
          collectibles: this.settings.collectibles || [],
          quests_state: questsState,
          used_slips: this.settings.usedSlips || []
        };
        let { error } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'user_id' });
        if (error && error.code === '42P01') {
          // Fallback to legacy 'user' table
          await supabase.from('user').upsert(payload, { onConflict: 'user_id' });
        } else if (error) {
          console.error("Cloud save settings error:", error);
        }
      } catch (err) {
        console.error("Exception in saveSettingsToCloud:", err);
      }
    }
  },

  clearUserData() {
    this.user = null;
    this.transactions = [];
    this.recurringRules = [];
    this.downPayments = [];
    this.settings = {
      selectedCurrency: "THB",
      isDarkMode: true,
      isPremium: true,
      language: "th",
      hasCompletedOnboarding: false,
      taxDeduction: 60000,
      taxPersonalDeduction: 60000,
      taxSocialSecurity: 9000,
      taxProvidentFund: 0,
      taxMutualFunds: 0,
      taxOtherDeductions: 0,
      dataVersion: 4,
      customCategories: [],
      coins: 0,
      claimedAchievements: [],
      unlockedThemes: ["light", "dark"],
      forgivenTransactions: [],
      collectibles: [],
      questsState: { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
    };
    localStorage.removeItem("fintrack_transactions");
    localStorage.removeItem("fintrack_recurring_rules");
    localStorage.removeItem("fintrack_settings");
    localStorage.removeItem("fintrack_net_worth");
    localStorage.removeItem("fintrack_down_payments");
  },

  async deleteCloudData() {
    if (!this.user) return;
    try {
      const userId = this.user.id;
      await supabase.from('transactions').delete().eq('user_id', userId);
      await supabase.from('recurring_rules').delete().eq('user_id', userId);
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      await supabase.from('user').delete().eq('user_id', userId);
      
      // Clear local data as well
      this.transactions = [];
      this.recurringRules = [];
      localStorage.removeItem("fintrack_transactions");
      localStorage.removeItem("fintrack_recurring_rules");
      
      console.log('Cloud and local data deleted successfully for user:', userId);
      this.notify();
    } catch (err) {
      console.error('Error deleting cloud data:', err);
      throw err;
    }
  },

  saveNetWorth(assets, liabilities) {
    this.netWorth = { assets, liabilities };
    localStorage.setItem("fintrack_net_worth", JSON.stringify(this.netWorth));
    this.notify();
  },

  getTotalAssets() {
    if (!this.netWorth || !this.netWorth.assets) return 0;
    return Object.values(this.netWorth.assets).reduce(
      (a, b) => a + (parseFloat(b) || 0),
      0,
    );
  },

  getTotalLiabilities() {
    if (!this.netWorth || !this.netWorth.liabilities) return 0;
    return Object.values(this.netWorth.liabilities).reduce(
      (a, b) => a + (parseFloat(b) || 0),
      0,
    );
  },

  getNetWorth() {
    return this.getTotalAssets() - this.getTotalLiabilities();
  },

  // Seed standard Thai/Eng descriptions & categories
  seedMockData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const mock = [
      {
        id: "1",
        title: "เงินเดือน / Salary",
        amount: 45000,
        isIncome: true,
        category: "Salary",
        date: new Date(currentYear, currentMonth, 1),
      },
      {
        id: "2",
        title: "อาหารกลางวันออฟฟิศ",
        amount: 150,
        isIncome: false,
        category: "Food",
        date: new Date(currentYear, currentMonth, 2),
      },
      {
        id: "3",
        title: "ค่ารถไฟฟ้า BTS",
        amount: 84,
        isIncome: false,
        category: "Transport",
        date: new Date(currentYear, currentMonth, 2),
      },
      {
        id: "4",
        title: "ช้อปปิ้งเสื้อผ้าแบรนด์ดัง",
        amount: 1200,
        isIncome: false,
        category: "Shopping",
        date: new Date(currentYear, currentMonth, 4),
      },
      {
        id: "5",
        title: "สตรีมมิ่ง Netflix / Spotify",
        amount: 419,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 5),
      },
      {
        id: "6",
        title: "ปันผลหุ้นกู้ / Dividends",
        amount: 3500,
        isIncome: true,
        category: "Investment",
        date: new Date(currentYear, currentMonth, 7),
      },
      {
        id: "7",
        title: "ดินเนอร์หรูวันศุกร์",
        amount: 2400,
        isIncome: false,
        category: "Entertainment",
        date: new Date(currentYear, currentMonth, 8),
      },
      {
        id: "8",
        title: "ค่ายาและโรงพยาบาล",
        amount: 950,
        isIncome: false,
        category: "Health",
        date: new Date(currentYear, currentMonth, 10),
      },
      {
        id: "9",
        title: "ค่าไฟเดือนนี้",
        amount: 1850,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 12),
      },
      {
        id: "10",
        title: "ซื้อของขวัญวันเกิดเพื่อน",
        amount: 800,
        isIncome: false,
        category: "Gift",
        date: new Date(currentYear, currentMonth, 14),
      },
      {
        id: "11",
        title: "ทริปพัทยาสุดสัปดาห์",
        amount: 4500,
        isIncome: false,
        category: "Travel",
        date: new Date(currentYear, currentMonth, 15),
      },
      {
        id: "12",
        title: "หนังสือพัฒนาตนเอง",
        amount: 350,
        isIncome: false,
        category: "Education",
        date: new Date(currentYear, currentMonth, 18),
      },
      {
        id: "13",
        title: "ค่าน้ำประปา",
        amount: 150,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 20),
      },
    ];

    // Add some random historical records for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    mock.push(
      {
        id: "101",
        title: "เงินเดือนเดือนที่แล้ว",
        amount: 45000,
        isIncome: true,
        category: "Salary",
        date: new Date(prevYear, prevMonth, 1),
      },
      {
        id: "102",
        title: "ค่าเช่าอพาร์ทเมนท์",
        amount: 6500,
        isIncome: false,
        category: "Bills",
        date: new Date(prevYear, prevMonth, 1),
      },
      {
        id: "103",
        title: "ซื้อรองเท้าวิ่ง",
        amount: 3200,
        isIncome: false,
        category: "Shopping",
        date: new Date(prevYear, prevMonth, 5),
      },
      {
        id: "104",
        title: "ค่าเติมน้ำมันรถยนต์",
        amount: 1200,
        isIncome: false,
        category: "Transport",
        date: new Date(prevYear, prevMonth, 10),
      },
    );

    // Filter to only include transactions up to current date
    this.transactions = mock
      .filter((t) => t.date <= now)
      .sort((a, b) => b.date - a.date);
    this.save();
  },

  seedMockRules() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    this.recurringRules = [
      {
        id: "r1",
        title: "ค่าสมาชิก Premium App",
        amount: 149,
        isIncome: false,
        category: "Bills",
        type: "monthly",
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 1),
        createdAt: new Date(),
        isActive: true,
      },
      {
        id: "r2",
        title: "เงินสมทบกองทุนเลี้ยงชีพ",
        amount: 2500,
        isIncome: true,
        category: "Investment",
        type: "monthly",
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 28),
        createdAt: new Date(),
        isActive: true,
      },
    ];
    this.save();
  },

  // --- Wallets API ---
  getWallets() {
    return [...this.wallets];
  },

  getWallet(id) {
    return this.wallets.find((w) => w.id === id) || null;
  },

  getTotalBalance() {
    let startingSum = 0;
    this.wallets.forEach((w) => {
      startingSum += parseFloat(w.balance) || 0;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    this.transactions.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.isIncome) totalIncome += amt;
      else totalExpense += amt;
    });

    return startingSum + totalIncome - totalExpense;
  },

  getWalletBalance(walletId) {
    const wallet = this.getWallet(walletId);
    if (!wallet) return 0;
    const startingBalance = parseFloat(wallet.balance) || 0;
    const primaryWallet = this.getPrimaryWallet();
    const isPrimary = primaryWallet ? (wallet.id === primaryWallet.id) : false;
    const allKnownIds = new Set(this.wallets.map((w) => w.id));

    const txs = this.transactions.filter((t) => {
      const wId = t.walletId || "default";
      if (wId === walletId) return true;
      if (isPrimary && (!allKnownIds.has(wId) || wId === "default")) return true;
      return false;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    txs.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.isIncome) totalIncome += amt;
      else totalExpense += amt;
    });
    return startingBalance + totalIncome - totalExpense;
  },

  addWallet(wallet) {
    const startingAmount = parseFloat(wallet.balance) || 0;
    const newWallet = {
      id: wallet.id || Math.random().toString(36).substring(2, 11),
      name: wallet.name || (this.settings.language === 'en' ? "New Wallet" : "กระเป๋าใหม่"),
      type: wallet.type || "cash",
      color: wallet.color || "#F5C842",
      icon: wallet.icon || "cash",
      balance: parseFloat(wallet.balance) || 0,
      isDefault: !!wallet.isDefault,
      currency: wallet.currency || "THB",
      createdAt: new Date(),
    };
    this.wallets.push(newWallet);
    this.save();
    return newWallet;
  },

  updateWallet(updated) {
    const idx = this.wallets.findIndex((w) => w.id === updated.id);
    if (idx !== -1) {
      this.wallets[idx] = {
        ...this.wallets[idx],
        ...updated,
        balance: updated.balance !== undefined ? parseFloat(updated.balance) || 0 : (this.wallets[idx].balance || 0),
      };
      this.save();
    }
  },

  setWalletBalance(walletId, targetBalance) {
    const wallet = this.getWallet(walletId);
    if (!wallet) return;

    const target = parseFloat(targetBalance);
    const targetValid = !isNaN(target) ? target : 0;
    const isPrimary = wallet.isDefault || wallet.id === 'default';
    const allKnownIds = new Set(this.wallets.map((w) => w.id));

    const txs = this.transactions.filter((t) => {
      const wId = t.walletId || 'default';
      if (wId === walletId) return true;
      if (isPrimary && (wId === 'default' || !allKnownIds.has(wId))) return true;
      return false;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    txs.forEach((t) => {
      if (t.isIncome) totalIncome += t.amount;
      else totalExpense += t.amount;
    });
    const netTransactions = totalIncome - totalExpense;

    // Direct base balance adjustment: setting to 0 or any target value
    wallet.balance = targetValid - netTransactions;
    this.save();
  },

  setPrimaryWallet(walletId) {
    this.wallets.forEach((w) => {
      w.isDefault = (w.id === walletId);
    });
    this.save();
  },

  getPrimaryWallet() {
    return this.wallets.find((w) => w.isDefault) || this.wallets[0] || { id: "default", name: this.settings.language === "en" ? "Cash" : "เงินสด" };
  },

  deleteWallet(id) {
    if (this.wallets.length <= 1) return false; // keep at least 1 wallet
    const wasPrimary = this.getWallet(id)?.isDefault;
    this.wallets = this.wallets.filter((w) => w.id !== id);
    if (wasPrimary && this.wallets.length > 0) {
      this.wallets[0].isDefault = true;
    }
    // Unassign transactions
    this.transactions.forEach((t) => {
      if (t.walletId === id) t.walletId = this.wallets[0].id;
    });
    this.save();
    return true;
  },

  transferFunds({ fromWalletId, toWalletId, amount, note = "", date = new Date() }) {
    const fromWallet = this.getWallet(fromWalletId);
    const toWallet = this.getWallet(toWalletId);
    if (!fromWallet || !toWallet || !amount || amount <= 0) return false;

    const baseAmount = parseFloat(amount);
    const transferDate = date instanceof Date ? date : new Date(date);

    // 1. Expense from source wallet
    this.addTransaction({
      title: `โอนไป ${toWallet.name}${note ? ` (${note})` : ''}`,
      amount: baseAmount,
      isIncome: false,
      category: "Transfer",
      date: transferDate,
      walletId: fromWalletId,
      isTransfer: true,
      transferToWalletId: toWalletId,
    });

    // 2. Income into target wallet
    this.addTransaction({
      title: `รับโอนจาก ${fromWallet.name}${note ? ` (${note})` : ''}`,
      amount: baseAmount,
      isIncome: true,
      category: "Transfer",
      date: transferDate,
      walletId: toWalletId,
      isTransfer: true,
      transferToWalletId: fromWalletId,
    });

    return true;
  },

  // --- Category Budgets API ---
  getCategoryBudgets() {
    return this.settings.categoryBudgets || {};
  },

  getCategoryBudget(category) {
    if (!this.settings.categoryBudgets) return 0;
    return parseFloat(this.settings.categoryBudgets[category]) || 0;
  },

  setCategoryBudget(category, amount) {
    if (!this.settings.categoryBudgets) this.settings.categoryBudgets = {};
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      this.settings.categoryBudgets[category] = val;
    } else {
      delete this.settings.categoryBudgets[category];
    }
    this.save();
    this.saveSettingsToCloud();
  },

  // --- Savings Goals & Virtual Vaults API ---
  getSavingsGoals() {
    return this.savingsGoals || [];
  },

  addSavingsGoal(goal) {
    if (!this.savingsGoals) this.savingsGoals = [];
    const newGoal = {
      id: goal.id || Math.random().toString(36).substring(2, 11),
      title: goal.title || "เป้าหมายใหม่",
      targetAmount: parseFloat(goal.targetAmount) || 0,
      currentAmount: parseFloat(goal.currentAmount) || 0,
      emoji: goal.emoji || "",
      color: goal.color || "#F5C842",
      deadline: goal.deadline ? (goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline)) : null,
      createdAt: new Date(),
    };
    this.savingsGoals.push(newGoal);
    this.save();
    return newGoal;
  },

  depositToGoal(goalId, amount, walletId = "default") {
    if (!this.savingsGoals) this.savingsGoals = [];
    let goal = this.savingsGoals.find((g) => String(g.id) === String(goalId));
    if (!goal && (goalId === "default" || this.savingsGoals.length === 0)) {
      goal = this.addSavingsGoal({
        id: "default",
        title: this.settings?.language === "en" ? "General Savings" : "เงินออมทั่วไป",
        targetAmount: 50000,
        currentAmount: 0,
        color: "#F5C842",
      });
    }
    const amt = parseFloat(amount);
    if (!goal || isNaN(amt) || amt <= 0) return { success: false };

    const prevAmount = goal.currentAmount || 0;
    const targetAmount = Math.max(1, goal.targetAmount || 1);

    this.addTransaction({
      title: `ออมเงินเข้า: ${goal.title}`,
      amount: amt,
      isIncome: false,
      category: "Savings",
      walletId: walletId,
      date: new Date(),
    });

    goal.currentAmount = prevAmount + amt;
    const newPct = Math.min(100, Math.floor((goal.currentAmount / targetAmount) * 100));

    // Dynamic Coins & XP Reward
    // 1 FinCoin per ฿100 saved, 2 XP per ฿50 saved
    const earnedCoins = Math.max(1, Math.floor(amt / 100));
    const earnedXP = Math.max(5, Math.floor(amt / 50) * 2);

    this.settings.coins = (this.settings.coins || 0) + earnedCoins;
    this.settings.totalSavingsCoins = (this.settings.totalSavingsCoins || 0) + earnedCoins;
    this.settings.xp = (this.settings.xp || 0) + earnedXP;

    // Check Milestone Crossings (25%, 50%, 75%, 100%)
    if (!this.settings.savingsMilestones) this.settings.savingsMilestones = {};
    if (!this.settings.savingsMilestones[goalId]) this.settings.savingsMilestones[goalId] = [];

    const milestones = [25, 50, 75, 100];
    const unlockedMilestones = [];

    milestones.forEach((m) => {
      if (newPct >= m && !this.settings.savingsMilestones[goalId].includes(m)) {
        this.settings.savingsMilestones[goalId].push(m);
        unlockedMilestones.push(m);
      }
    });

    this.recalculateXP();
    this.save();

    return {
      success: true,
      earnedCoins,
      earnedXP,
      unlockedMilestones,
      newPct,
    };
  },

  claimSavingsMilestone(goalId, milestonePct) {
    if (!this.settings.savingsClaimedMilestones) this.settings.savingsClaimedMilestones = {};
    if (!this.settings.savingsClaimedMilestones[goalId]) this.settings.savingsClaimedMilestones[goalId] = [];

    if (this.settings.savingsClaimedMilestones[goalId].includes(milestonePct)) {
      return { success: false, reason: "already_claimed" };
    }

    const milestoneRewards = {
      25: { coins: 50, xp: 100, title: "25% Milestone Chest" },
      50: { coins: 100, xp: 200, title: "50% Halfway Treasure" },
      75: { coins: 150, xp: 300, title: "75% Vault Bounty" },
      100: { coins: 300, xp: 500, title: "100% Goal Crusher Jackpot" },
    };

    const reward = milestoneRewards[milestonePct] || { coins: 50, xp: 100, title: "Milestone Chest" };

    this.settings.savingsClaimedMilestones[goalId].push(milestonePct);
    this.settings.coins = (this.settings.coins || 0) + reward.coins;
    this.settings.totalSavingsCoins = (this.settings.totalSavingsCoins || 0) + reward.coins;
    this.settings.xp = (this.settings.xp || 0) + reward.xp;

    this.recalculateXP();
    this.save();

    return {
      success: true,
      reward,
    };
  },

  getSavingsMilestones(goalId) {
    const goal = (this.savingsGoals || []).find((g) => String(g.id) === String(goalId));
    if (!goal) return [];

    const target = Math.max(1, goal.targetAmount || 1);
    const current = goal.currentAmount || 0;
    const currentPct = Math.min(100, Math.floor((current / target) * 100));

    const unlocked = this.settings.savingsMilestones?.[goalId] || [];
    const claimed = this.settings.savingsClaimedMilestones?.[goalId] || [];

    const milestoneRewards = {
      25: { coins: 50, xp: 100, label: "25%" },
      50: { coins: 100, xp: 200, label: "50%" },
      75: { coins: 150, xp: 300, label: "75%" },
      100: { coins: 300, xp: 500, label: "100%" },
    };

    return [25, 50, 75, 100].map((pct) => {
      const isReached = currentPct >= pct || unlocked.includes(pct);
      const isClaimed = claimed.includes(pct);
      const canClaim = isReached && !isClaimed;

      return {
        pct,
        label: milestoneRewards[pct].label,
        coins: milestoneRewards[pct].coins,
        xp: milestoneRewards[pct].xp,
        isReached,
        isClaimed,
        canClaim,
      };
    });
  },

  getTotalSavingsAmount() {
    return (this.savingsGoals || []).reduce((sum, g) => sum + (parseFloat(g.currentAmount) || 0), 0);
  },

  withdrawFromGoal(goalId, amount, walletId = "default") {
    const goal = (this.savingsGoals || []).find((g) => String(g.id) === String(goalId));
    const amt = parseFloat(amount);
    if (!goal || !amt || amt <= 0 || (goal.currentAmount || 0) < amt) return false;

    this.addTransaction({
      title: `ถอนเงินจากเป้าหมาย: ${goal.title}`,
      amount: amt,
      isIncome: true,
      category: "Savings",
      walletId: walletId,
      date: new Date(),
    });

    goal.currentAmount = Math.max(0, (goal.currentAmount || 0) - amt);
    this.save();
    return true;
  },

  deleteSavingsGoal(goalId) {
    this.savingsGoals = (this.savingsGoals || []).filter((g) => String(g.id) !== String(goalId));
    this.save();
    return true;
  },

  // --- Financial Health & Daily Safe-to-Spend API ---
  getDailySafeToSpend() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthTxs = this.transactions.filter((t) => new Date(t.date) >= startOfMonth);
    let monthIncome = 0;
    let monthExpense = 0;
    monthTxs.forEach((t) => {
      if (t.isIncome) monthIncome += t.amount;
      else monthExpense += t.amount;
    });

    let totalBudget = 0;
    Object.values(this.settings.categoryBudgets || {}).forEach((b) => {
      totalBudget += parseFloat(b) || 0;
    });

    let pool = 0;
    if (totalBudget > 0) {
      pool = Math.max(0, totalBudget - monthExpense);
    } else if (monthIncome > 0) {
      pool = Math.max(0, monthIncome - monthExpense);
    } else {
      pool = Math.max(0, this.getTotalBalance());
    }

    const safeDaily = pool / remainingDays;
    return {
      safeDaily,
      remainingDays,
      pool,
      monthIncome,
      monthExpense,
      totalBudget,
    };
  },

  getFinancialHealthScore() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthTxs = this.transactions.filter((t) => new Date(t.date) >= startOfMonth);

    let income = 0;
    let expense = 0;
    monthTxs.forEach((t) => {
      if (t.isIncome) income += t.amount;
      else expense += t.amount;
    });

    let score = 50; // base score

    // 1. Savings Rate Factor (+0 to +30)
    if (income > 0) {
      const savingsRate = (income - expense) / income;
      if (savingsRate >= 0.3) score += 30;
      else if (savingsRate >= 0.15) score += 20;
      else if (savingsRate >= 0.05) score += 10;
      else if (savingsRate < 0) score -= 15;
    }

    // 2. Budget Adherence Factor (+0 to +20)
    const budgets = this.settings.categoryBudgets || {};
    const budgetKeys = Object.keys(budgets);
    if (budgetKeys.length > 0) {
      let exceeded = 0;
      budgetKeys.forEach((cat) => {
        const limit = parseFloat(budgets[cat]) || 0;
        const catSpent = monthTxs
          .filter((t) => !t.isIncome && t.category === cat)
          .reduce((s, t) => s + t.amount, 0);
        if (limit > 0 && catSpent > limit) exceeded++;
      });
      if (exceeded === 0) score += 20;
      else score -= exceeded * 8;
    } else {
      score += 10;
    }

    score = Math.max(10, Math.min(100, Math.round(score)));

    let grade = "A";
    let statusText = "ยอดเยี่ยม (Excellent)";
    let color = "#10B981";

    if (score >= 85) {
      grade = "A+";
      statusText = "ยอดเยี่ยม (Excellent)";
      color = "#10B981";
    } else if (score >= 70) {
      grade = "A";
      statusText = "สุขภาพดี (Healthy)";
      color = "var(--gold)";
    } else if (score >= 50) {
      grade = "B";
      statusText = "ปานกลาง (Fair)";
      color = "#F59E0B";
    } else {
      grade = "C";
      statusText = "ควรระวัง (Needs Care)";
      color = "var(--expense)";
    }

    return { score, grade, statusText, color };
  },

  // --- Enhanced Gamification & Quests API ---
  getGamificationProfile() {
    const xp = this.settings.xp || 0;
    const level = this.settings.level || 1;
    const coins = this.settings.coins || 0;
    const streak = this.calculateStreak();
    const reqXp = level * 100;
    const pct = Math.min(100, Math.round((xp / reqXp) * 100));

    const isEn = this.settings.language === "en";
    const titlesEn = [
      "Novice Saver", "Budget Explorer", "Financial Apprentice",
      "Smart Investor", "Cashflow Master", "Wealth Builder",
      "Financial Strategist", "Capital Captain", "Money Mogul", "Financial Grandmaster"
    ];
    const titlesTh = [
      "นักออมมือใหม่", "ผู้สำรวจงบ", "ผู้ฝึกตนทางการเงิน",
      "นักจัดสรรกระเป๋า", "เซียนกระแสเงินสด", "ผู้สร้างความมั่งคั่ง",
      "นักยุทธศาสตร์การเงิน", "กัปตันเงินทุน", "มหาเศรษฐีตัวจริง", "ปรมาจารย์ทางการเงิน"
    ];
    const titles = isEn ? titlesEn : titlesTh;
    const levelTitle = titles[Math.min(level - 1, titles.length - 1)];

    return {
      level,
      xp,
      reqXp,
      progressPct: pct,
      title: levelTitle,
      coins,
      streak,
    };
  },

  calculateStreak() {
    const txs = this.getAllTransactions();
    if (txs.length === 0) return 0;
    const dateSet = new Set(txs.map((t) => new Date(t.date).toISOString().split("T")[0]));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (dateSet.has(key)) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  },

  getDailyQuests() {
    const isEn = this.settings.language === "en";
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

    const todayTxs = this.getAllTransactions().filter((t) => {
      if (!t || !t.date) return false;
      const d = new Date(t.date);
      return !isNaN(d) && d.getFullYear() === todayYear && d.getMonth() === todayMonth && d.getDate() === todayDate;
    });
    const hasIncomeToday = todayTxs.some((t) => t.isIncome);
    const hasSavedToday = todayTxs.some((t) => t.category === "Savings" && !t.isIncome) || (this.savingsGoals || []).some((g) => (g.currentAmount || 0) > 0);

    const claimed = this.settings.questsState?.claimed || [];

    return [
      {
        id: "daily_login",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
        title: isEn ? "Daily Check-in & Login" : "เช็คอินเข้าใช้งานวันนี้",
        desc: isEn ? "Log in or open FinTrack today" : "เข้าสู่ระบบหรือเปิดแอปวันนี้",
        rewardXP: 25,
        rewardCoins: 10,
        completed: true,
        claimed: claimed.includes(`daily_login_${todayStr}`),
      },
      {
        id: "daily_income",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
        title: isEn ? "Earn Income Today" : "มีรายได้เข้ากระเป๋า",
        desc: isEn ? "Record at least 1 income transaction today" : "บันทึกรายรับอย่างน้อย 1 รายการวันนี้",
        rewardXP: 35,
        rewardCoins: 15,
        completed: hasIncomeToday,
        claimed: claimed.includes(`daily_income_${todayStr}`),
      },
      {
        id: "daily_saving",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        title: isEn ? "Stash Money in Savings" : "ออมเงินเข้ากระปุกเป้าหมาย",
        desc: isEn ? "Deposit into any savings vault today" : "ฝากเงินเข้ากระปุกออมเงินวันนี้",
        rewardXP: 50,
        rewardCoins: 20,
        completed: hasSavedToday,
        claimed: claimed.includes(`daily_saving_${todayStr}`),
      },
    ];
  },

  claimDailyQuest(questId) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const key = `${questId}_${todayStr}`;
    if (!this.settings.questsState) this.settings.questsState = { claimed: [] };
    if (!this.settings.questsState.claimed) this.settings.questsState.claimed = [];

    if (this.settings.questsState.claimed.includes(key)) {
      return false;
    }

    const quests = this.getDailyQuests();
    const quest = quests.find((q) => q.id === questId);
    if (!quest || !quest.completed) return false;

    this.settings.questsState.claimed.push(key);
    this.settings.coins = (this.settings.coins || 0) + quest.rewardCoins;
    this.recalculateXP();
    this.save();
    return quest;
  },

  // --- Transactions API ---
  getAllTransactions(walletId = null) {
    let list = [...this.transactions];
    if (walletId && walletId !== 'all') {
      list = list.filter((t) => (t.walletId || 'default') === walletId);
    }
    return list.sort((a, b) => b.date - a.date);
  },

  addTransaction(t) {
    const category = t.category || "Other";
    let finalTitle = (t.title && t.title.trim()) ? t.title.trim() : null;
    if (!finalTitle) {
      const catInfo = getCategoryInfo(category);
      finalTitle = catInfo ? catInfo.label : (category || i18n("categoryOther"));
    }

    const primaryWallet = this.getPrimaryWallet();
    const targetWalletId = (t.walletId && this.getWallet(t.walletId)) ? t.walletId : (primaryWallet ? primaryWallet.id : "default");

    const transaction = {
      id: t.id || Math.random().toString(36).substring(2, 11),
      title: finalTitle,
      amount: parseFloat(t.amount) || 0,
      isIncome: !!t.isIncome,
      category: category,
      date: t.date ? new Date(t.date) : new Date(),
      recurringId: t.recurringId || null,
      walletId: targetWalletId,
      isTransfer: !!t.isTransfer,
      transferToWalletId: t.transferToWalletId || null,
    };
    this.transactions.push(transaction);
    this.checkQuests();
    this.save();

    if (this.user) {
      supabase.from('transactions').insert({
        id: transaction.id,
        user_id: this.user.id,
        title: transaction.title,
        amount: transaction.amount,
        is_income: transaction.isIncome,
        category: transaction.category,
        date: transaction.date.toISOString(),
        recurring_id: transaction.recurringId,
        wallet_id: transaction.walletId || "default",
        notes: transaction.notes || ""
      }).then(({ error }) => { if (error) console.error('Supabase addTransaction error:', error); });
    }

    // Trigger browser notifications if enabled/allowed
    this.triggerNotification(
      transaction.isIncome ? i18n("notiSavedIncome") : i18n("notiSavedExpense"),
      `${transaction.title}: ${this.getCurrencySymbol()}${this.toDisplay(transaction.amount).toFixed(2)}`,
    );
  },

  updateTransaction(updated) {
    const idx = this.transactions.findIndex((t) => t.id === updated.id);
    if (idx !== -1) {
      const category = updated.category || this.transactions[idx].category || "Other";
      let finalTitle = (updated.title && updated.title.trim()) ? updated.title.trim() : null;
      if (!finalTitle) {
        const catInfo = getCategoryInfo(category);
        finalTitle = catInfo ? catInfo.label : (category || i18n("categoryOther"));
      }

      this.transactions[idx] = {
        ...updated,
        title: finalTitle,
        category: category,
        amount: parseFloat(updated.amount),
        date: new Date(updated.date),
      };
      this.save();

      if (this.user) {
        supabase.from('transactions').upsert({
          id: updated.id,
          user_id: this.user.id,
          title: finalTitle,
          amount: parseFloat(updated.amount),
          is_income: !!updated.isIncome,
          category: category,
          date: new Date(updated.date).toISOString(),
          recurring_id: updated.recurringId || null,
          wallet_id: updated.walletId || "default",
          notes: updated.notes || ""
        }).then(({ error }) => { if (error) console.error('Supabase updateTransaction error:', error); });
      }
    }
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.save();

    if (this.user) {
      supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteTransaction error:', error);
      });
    }
  },

  // --- Down payment plans API ---
  getDownPayments() {
    return [...this.downPayments].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  },

  addDownPayment(plan) {
    const totalAmount = parseFloat(plan.totalAmount) || 0;
    const paidAmount = Math.min(parseFloat(plan.paidAmount) || 0, totalAmount);
    this.downPayments.push({
      id: Math.random().toString(36).substring(2, 11),
      title: plan.title?.trim() || i18n("untitledDownPayment"),
      totalAmount,
      paidAmount,
      dueDate: plan.dueDate ? new Date(`${plan.dueDate}T12:00:00`) : null,
      createdAt: new Date(),
    });
    this.save();
  },

  recordDownPayment(id, amount) {
    const plan = this.downPayments.find((item) => item.id === id);
    if (!plan) return;
    plan.paidAmount = Math.min(plan.totalAmount, plan.paidAmount + (parseFloat(amount) || 0));
    this.save();
  },

  deleteDownPayment(id) {
    this.downPayments = this.downPayments.filter((plan) => plan.id !== id);
    this.save();
  },

  // --- Recurring Rules API ---
  getAllRecurringRules() {
    return [...this.recurringRules].sort(
      (a, b) => a.nextDueDate - b.nextDueDate,
    );
  },

  addRecurringRule(rule) {
    const newRule = {
      id: Math.random().toString(36).substring(2, 11),
      title: rule.title || i18n("untitledRecurring"),
      amount: parseFloat(rule.amount) || 0,
      isIncome: !!rule.isIncome,
      category: rule.category || "Other",
      type: rule.type || "monthly", // 'monthly', 'yearly', 'custom'
      customDays: parseInt(rule.customDays) || 30,
      nextDueDate: rule.nextDueDate ? new Date(rule.nextDueDate) : new Date(),
      createdAt: new Date(),
      isActive: true,
    };
    this.recurringRules.push(newRule);
    this.save();

    if (this.user) {
      supabase.from('recurring_rules').insert({
        id: newRule.id,
        user_id: this.user.id,
        title: newRule.title,
        amount: newRule.amount,
        is_income: newRule.isIncome,
        category: newRule.category,
        type: newRule.type,
        custom_days: newRule.customDays,
        next_due_date: newRule.nextDueDate.toISOString(),
        is_active: newRule.isActive,
        created_at: newRule.createdAt.toISOString()
      }).then(({ error }) => { if (error) console.error('Supabase addRecurringRule error:', error); });
    }

    this.triggerNotification(
      i18n("notiRecurringSetTitle"),
      i18n("notiRecurringSetBody", { title: newRule.title }),
    );
  },

  updateRecurringRule(rule) {
    const idx = this.recurringRules.findIndex((r) => r.id === rule.id);
    if (idx !== -1) {
      this.recurringRules[idx] = {
        ...rule,
        amount: parseFloat(rule.amount),
        nextDueDate: new Date(rule.nextDueDate),
        createdAt: new Date(rule.createdAt),
      };
      this.save();

      if (this.user) {
        supabase.from('recurring_rules').upsert({
          id: rule.id,
          user_id: this.user.id,
          title: rule.title,
          amount: parseFloat(rule.amount),
          is_income: !!rule.isIncome,
          category: rule.category,
          type: rule.type,
          custom_days: parseInt(rule.customDays) || 30,
          next_due_date: new Date(rule.nextDueDate).toISOString(),
          is_active: !!rule.isActive,
          created_at: new Date(rule.createdAt).toISOString()
        }).then(({ error }) => { if (error) console.error('Supabase updateRecurringRule error:', error); });
      }
    }
  },

  deleteRecurringRule(id) {
    this.recurringRules = this.recurringRules.filter((r) => r.id !== id);
    this.save();

    if (this.user) {
      supabase.from('recurring_rules').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteRecurringRule error:', error);
      });
    }
  },

  toggleRecurringRule(id) {
    const idx = this.recurringRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.recurringRules[idx].isActive = !this.recurringRules[idx].isActive;
      this.save();

      if (this.user) {
        supabase.from('recurring_rules').update({
          is_active: this.recurringRules[idx].isActive
        }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleRecurringRule error:', error);
        });
      }
    }
  },

  // Process recurring rules to generate auto transactions when due
  processRecurringPayments() {
    const now = new Date();
    // Zero out hours/minutes/seconds of 'now' for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let addedCount = 0;

    this.recurringRules.forEach((rule) => {
      if (!rule.isActive) return;

      let nextDue = new Date(rule.nextDueDate);
      nextDue = new Date(
        nextDue.getFullYear(),
        nextDue.getMonth(),
        nextDue.getDate(),
      );

      while (nextDue <= today) {
        // Create transaction
        const transaction = {
          id: Math.random().toString(36).substring(2, 11),
          title: rule.title,
          amount: rule.amount,
          isIncome: rule.isIncome,
          category: rule.category,
          date: new Date(nextDue),
          recurringId: rule.id,
        };
        this.transactions.push(transaction);
        addedCount++;

        // Advance next due date
        if (rule.type === "monthly") {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (rule.type === "yearly") {
          nextDue.setFullYear(nextDue.getFullYear() + 1);
        } else if (rule.type === "custom") {
          nextDue.setDate(nextDue.getDate() + (rule.customDays || 30));
        }
      }

      rule.nextDueDate = nextDue;
    });

    if (addedCount > 0) {
      this.save();
      this.triggerNotification(
        i18n("notiAutoPayTitle"),
        i18n("notiAutoPayBody", { count: addedCount }),
      );
    }
  },

  // --- Setting Getters / Setters ---
  getSelectedCurrency() {
    return this.settings.selectedCurrency;
  },

  getCurrencySymbol() {
    return getSymbol(this.settings.selectedCurrency);
  },

  async setCurrency(code) {
    this.settings.selectedCurrency = code;
    this.save();
    await this.saveSettingsToCloud();
  },

  setSelectedCurrency(code) {
    return this.setCurrency(code);
  },

  setTheme(themeId) {
    if (!themeId) return;
    this.settings.theme = themeId;
    this.settings.isDarkMode = themeId !== "light";
    document.documentElement.setAttribute("data-theme", themeId);
    this.save();
    this.saveSettingsToCloud();
  },

  toggleTheme() {
    const level = this.settings.level || 1;
    const availableThemes = ["light", "dark"];
    if (level >= 5) availableThemes.push("midnight");
    if (level >= 10) availableThemes.push("cyberpunk");
    if (level >= 15) availableThemes.push("gold");

    const currentTheme = this.settings.theme || (this.settings.isDarkMode ? "dark" : "light");
    let nextIndex = availableThemes.indexOf(currentTheme) + 1;
    if (nextIndex >= availableThemes.length) nextIndex = 0;

    this.setTheme(availableThemes[nextIndex]);
  },

  setPremium(val) {
    this.settings.isPremium = !!val;
    this.save();
  },

  completeOnboarding() {
    this.settings.hasCompletedOnboarding = true;
    this.save();
  },

  setLanguage(language) {
    this.settings.language = language === "en" ? "en" : "th";
    document.documentElement.lang =
      this.settings.language === "en" ? "en" : "th";
    this.save();
    this.saveSettingsToCloud();
  },

  // --- Currency Display Convert helpers ---
  toDisplay(amountInTHB) {
    return convert(amountInTHB, this.settings.selectedCurrency);
  },

  toBase(amountInDisplayCurrency) {
    return convertToTHB(amountInDisplayCurrency, this.settings.selectedCurrency);
  },

  fromDisplay(amountInDisplayCurrency) {
    return this.toBase(amountInDisplayCurrency);
  },

  // --- Computed Finance metrics ---
  getFinanceMetrics() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    let totalBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let monthlyBalance = 0;

    let dailyIncome = 0;
    let dailyExpense = 0;
    let dailyBalance = 0;

    let yearlyIncome = 0;
    let yearlyExpense = 0;
    let yearlyBalance = 0;

    let weeklyIncome = 0;
    let weeklyExpense = 0;
    let weeklyBalance = 0;

    // Current Week (Monday to Sunday)
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    this.transactions.forEach((t) => {
      const amt = t.amount; // amount is stored in base currency (THB)
      const tDate = t.date;
      const isInc = t.isIncome;

      // All-Time
      if (isInc) {
        totalIncome += amt;
        totalBalance += amt;
      } else {
        totalExpense += amt;
        totalBalance -= amt;
      }

      // Weekly
      if (tDate >= startOfWeek && tDate < endOfWeek) {
        if (isInc) {
          weeklyIncome += amt;
          weeklyBalance += amt;
        } else {
          weeklyExpense += amt;
          weeklyBalance -= amt;
        }
      }

      // Year-to-date
      if (tDate.getFullYear() === currentYear) {
        if (isInc) {
          yearlyIncome += amt;
          yearlyBalance += amt;
        } else {
          yearlyExpense += amt;
          yearlyBalance -= amt;
        }

        // Monthly
        if (tDate.getMonth() === currentMonth) {
          if (isInc) {
            monthlyIncome += amt;
            monthlyBalance += amt;
          } else {
            monthlyExpense += amt;
            monthlyBalance -= amt;
          }

          // Daily
          if (tDate.getDate() === currentDate) {
            if (isInc) {
              dailyIncome += amt;
              dailyBalance += amt;
            } else {
              dailyExpense += amt;
              dailyBalance -= amt;
            }
          }
        }
      }
    });

    return {
      totalBalance: this.toDisplay(totalBalance),
      totalIncome: this.toDisplay(totalIncome),
      totalExpense: this.toDisplay(totalExpense),
      monthlyIncome: this.toDisplay(monthlyIncome),
      monthlyExpense: this.toDisplay(monthlyExpense),
      monthlyBalance: this.toDisplay(monthlyBalance),
      dailyIncome: this.toDisplay(dailyIncome),
      dailyExpense: this.toDisplay(dailyExpense),
      dailyBalance: this.toDisplay(dailyBalance),
      yearlyIncome: this.toDisplay(yearlyIncome),
      yearlyExpense: this.toDisplay(yearlyExpense),
      yearlyBalance: this.toDisplay(yearlyBalance),
      weeklyIncome: this.toDisplay(weeklyIncome),
      weeklyExpense: this.toDisplay(weeklyExpense),
      weeklyBalance: this.toDisplay(weeklyBalance),
    };
  },

  // Daily totals for current month, keyed by day of month
  getDailyExpensesForMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daily = {};

    this.transactions.forEach((t) => {
      if (
        !t.isIncome &&
        t.date.getFullYear() === currentYear &&
        t.date.getMonth() === currentMonth
      ) {
        const day = t.date.getDate();
        daily[day] = (daily[day] || 0) + this.toDisplay(t.amount);
      }
    });

    return daily;
  },

  getDailyIncomeForMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daily = {};

    this.transactions.forEach((t) => {
      if (
        t.isIncome &&
        t.date.getFullYear() === currentYear &&
        t.date.getMonth() === currentMonth
      ) {
        const day = t.date.getDate();
        daily[day] = (daily[day] || 0) + this.toDisplay(t.amount);
      }
    });

    return daily;
  },

  getCategorySpending(period = "monthly", month = null, year = null) {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month !== null ? month : now.getMonth();
    const categories = {};

    this.transactions.forEach((t) => {
      if (t.isIncome) return;

      const tDate = t.date;
      let match = false;

      if (period === "monthly") {
        match =
          tDate.getFullYear() === currentYear &&
          tDate.getMonth() === currentMonth;
      } else if (period === "yearly") {
        match = tDate.getFullYear() === currentYear;
      } else if (period === "all") {
        match = true;
      }

      if (match) {
        const cat = t.category || "Other";
        categories[cat] = (categories[cat] || 0) + this.toDisplay(t.amount);
      }
    });

    return categories;
  },

  // Thai tax calculation based on 2026 personal income tax rates
  calculateThaiTax(annualIncome) {
    const standardExpenseDeduction = Math.min(annualIncome * 0.5, 100000);
    const personal =
      this.settings.taxPersonalDeduction !== undefined
        ? this.settings.taxPersonalDeduction
        : this.settings.taxDeduction || 60000;
    const ssf = this.settings.taxSocialSecurity || 0;
    const pvd = this.settings.taxProvidentFund || 0;
    const mf = this.settings.taxMutualFunds || 0;
    const other = this.settings.taxOtherDeductions || 0;

    const totalDeductions =
      standardExpenseDeduction + personal + ssf + pvd + mf + other;
    const netIncome = Math.max(0, annualIncome - totalDeductions);

    const taxBrackets = [
      { min: 0, max: 150000, rate: 0 },
      { min: 150001, max: 300000, rate: 0.05 },
      { min: 300001, max: 500000, rate: 0.1 },
      { min: 500001, max: 750000, rate: 0.15 },
      { min: 750001, max: 1000000, rate: 0.2 },
      { min: 1000001, max: 2000000, rate: 0.25 },
      { min: 2000001, max: 5000000, rate: 0.3 },
      { min: 5000001, max: Infinity, rate: 0.35 },
    ];

    let calculatedTax = 0;
    taxBrackets.forEach((bracket) => {
      if (netIncome > bracket.min) {
        const taxableInBracket =
          Math.min(netIncome, bracket.max) -
          (bracket.min === 0 ? 0 : bracket.min - 1);
        if (taxableInBracket > 0) {
          calculatedTax += taxableInBracket * bracket.rate;
        }
      }
    });
    return calculatedTax;
  },

  updateTaxDeduction(personal, ssf, pvd, mf, other) {
    this.settings.taxPersonalDeduction = parseFloat(personal) || 0;
    this.settings.taxSocialSecurity = parseFloat(ssf) || 0;
    this.settings.taxProvidentFund = parseFloat(pvd) || 0;
    this.settings.taxMutualFunds = parseFloat(mf) || 0;
    this.settings.taxOtherDeductions = parseFloat(other) || 0;
    this.settings.taxDeduction = this.settings.taxPersonalDeduction;
    this.save();
    this.saveSettingsToCloud();
  },

  // --- Browser Notification wrapper ---
  triggerNotification(title, body) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
          }
        });
      }
    }
  },
};
