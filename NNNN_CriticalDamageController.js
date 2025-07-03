/*:
 * @target MZ
 * @plugindesc [v1.0.0] Critical Damage Controller
 * @author YourName
 * @version 1.0.0
 * @description 控制暴擊傷害和暴擊率的插件系統
 * 
 * @param criticalDamageStrategy
 * @text 暴擊傷害計算策略
 * @desc 選擇暴擊傷害的計算方式
 * @type select
 * @option add
 * @option multiply
 * @option max
 * @option priority
 * @option default
 * @default add
 * 
 * @param ActorCriticalDamagePriority
 * @text 角色暴擊傷害優先順序
 * @desc 設定角色獲取暴擊傷害加成的優先順序
 * @type string
 * @default state,skill,armor,weapon,actor,job,default
 * 
 * @param EnemyCriticalDamagePriority
 * @text 敵人暴擊傷害優先順序
 * @desc 設定敵人獲取暴擊傷害加成的優先順序
 * @type string
 * @default state,skill,weapon,enemy,default
 * 
 * @param defaultCriticalDamage
 * @text 預設暴擊傷害倍率
 * @desc 沒有其他設定時使用的預設暴擊傷害倍率
 * @type number
 * @decimals 2
 * @min 1.00
 * @max 100.00
 * @default 3.00
 * 
 * @help NNNN_CriticalDamageController.js
 * 
 * 這個插件提供三階段的暴擊傷害控制系統：
 * 
 * 第一階段：<criticalDamage:number> 標籤
 * 可以放在：狀態、技能/道具、裝備、武器、角色、敵人、職業 中
 * 
 * 第二階段：<extCriticalRate:number> 標籤
 * 可以放在：技能/道具 中，用於額外的暴擊率加成
 * 
 * 第三階段：基礎暴擊傷害能力值
 * 新增一個名為crd的額外能力值，用於基礎暴擊傷害
 * 
 * 使用方法：
 * 在備註欄中加入 <criticalDamage:1.5> 表示1.5倍暴擊傷害
 * 在技能備註欄中加入 <extCriticalRate:0.2> 表示額外20%暴擊率
 */

(() => {
    'use strict';
    
    // =============================================================================
    // 常數定義 - Constants Definition
    // =============================================================================
    
    // 插件參數
    const parameters = PluginManager.parameters('NNNN_CriticalDamageController');
    const CRITICAL_DAMAGE_STRATEGY = parameters['criticalDamageStrategy'] || 'multiply';
    const ACTOR_CRITICAL_DAMAGE_PRIORITY = parameters['ActorCriticalDamagePriority'].split(',') || ['state', 'skill', 'armor', 'weapon', 'actor', 'job', 'default'];
    const ENEMY_CRITICAL_DAMAGE_PRIORITY = parameters['EnemyCriticalDamagePriority'].split(',') || ['state', 'skill', 'weapon', 'enemy', 'default'];
    const DEFAULT_CRITICAL_DAMAGE = parseFloat(parameters['defaultCriticalDamage']) || 3.0;
    
    // 暴擊傷害計算策略
    const CRITICAL_DAMAGE_STRATEGIES = {
        ADD: 'add',
        MULTIPLY: 'multiply',
        MAX: 'max',
        PRIORITY: 'priority',
        DEFAULT: 'default'
    };
    
    // 額外能力值ID
    const EXTRA_PARAM_ID = {
        CRITICAL_DAMAGE: 10  // 暴擊傷害對應的額外能力值ID
    };
    
    // 正則表達式
    const CRITICAL_DAMAGE_REGEX = /<criticalDamage\s*:\s*(\d+(?:\.\d+)?)\s*>/i;
    const EXT_CRITICAL_RATE_REGEX = /<extCriticalRate\s*:\s*(\d+(?:\.\d+)?)\s*>/i;
    
    // SRPG兼容性檢查
    const isSRPGMode = function() {
        return typeof $gameSystem !== 'undefined' && 
               typeof $gameSystem.isSRPGMode === 'function' && 
               $gameSystem.isSRPGMode();
    };
    
    const hasSRPGMethods = function() {
        return typeof Game_Enemy.prototype.srpgWeaponId === 'function';
    };
    
    // =============================================================================
    // 第一階段：暴擊傷害控制系統
    // =============================================================================
    
    /**
     * 覆寫 applyCritical 方法以使用自定義的暴擊傷害計算
     * Override applyCritical method to use custom critical damage calculation
     */
    Game_Action.prototype.applyCritical = function(damage) {
        const criticalDamageResult = this.criticalDamageCalculate();
        return damage * criticalDamageResult;
    };
    
    /**
     * 計算暴擊傷害倍率
     * Calculate critical damage multiplier
     * @returns {number} 暴擊傷害倍率
     */
    Game_Action.prototype.criticalDamageCalculate = function() {
        const subject = this.subject();
        if (!subject) return DEFAULT_CRITICAL_DAMAGE;
        
        // 獲取按照優先順序排列的暴擊傷害數值陣列
        const criticalDamageMetaArray = subject.getCriticalDamageMeta(this);
        
        // 根據策略計算最終暴擊傷害
        return calculateCriticalDamageByStrategy(criticalDamageMetaArray);
    };
    
    /**
     * 根據策略計算暴擊傷害
     * Calculate critical damage based on strategy
     * @param {Array} criticalDamageMetaArray 暴擊傷害數值陣列
     * @returns {number} 最終暴擊傷害倍率
     */
    function calculateCriticalDamageByStrategy(criticalDamageMetaArray) {
        if (!criticalDamageMetaArray || criticalDamageMetaArray.length === 0) {
            return DEFAULT_CRITICAL_DAMAGE;
        }
        console.log('criticalDamageMetaArray:',criticalDamageMetaArray,CRITICAL_DAMAGE_STRATEGY);
        switch (CRITICAL_DAMAGE_STRATEGY) {
            case CRITICAL_DAMAGE_STRATEGIES.ADD:
                // 加法策略：直接相加所有數值（更直觀）
                return criticalDamageMetaArray.reduce((total, value) => total + value, 0);
            
            case CRITICAL_DAMAGE_STRATEGIES.MULTIPLY:
                // 乘法策略：所有數值相乘
                return criticalDamageMetaArray.reduce((total, value) => total * value, 1);
            
            case CRITICAL_DAMAGE_STRATEGIES.MAX:
                // 最大值策略：取最大值
                return Math.max(...criticalDamageMetaArray);
            
            case CRITICAL_DAMAGE_STRATEGIES.PRIORITY:
                // 優先順序策略：按優先順序取第一個
                return criticalDamageMetaArray[0];
            
            case CRITICAL_DAMAGE_STRATEGIES.DEFAULT:
            default:
                // 預設策略：直接回傳預設值
                return DEFAULT_CRITICAL_DAMAGE;
        }
    };
    
    /**
     * 角色獲取暴擊傷害Meta數據
     * Actor gets critical damage meta data
     * @returns {Array} 按優先順序排列的暴擊傷害數值陣列
     */
    Game_Actor.prototype.getCriticalDamageMeta = function(action) {
        const criticalDamageMetaArray = [];
        
        // 按照優先順序處理各個來源
        ACTOR_CRITICAL_DAMAGE_PRIORITY.forEach(source => {
            let sourceValues = [];
            switch (source) {
                case 'state':
                    sourceValues = this.getCriticalDamageFromStates();
                    break;
                case 'skill':
                    sourceValues = this.getCriticalDamageFromSkillOrItem(action);
                    console.log('skill sourceValues:',sourceValues);
                    break;
                case 'armor':
                    sourceValues = this.getCriticalDamageFromArmors();
                    break;
                case 'weapon':
                    sourceValues = this.getCriticalDamageFromWeapons();
                    break;
                case 'actor':
                    sourceValues = this.getCriticalDamageFromActor();
                    break;
                case 'job':
                    sourceValues = this.getCriticalDamageFromJob();
                    break;
                case 'default':
                    sourceValues = [DEFAULT_CRITICAL_DAMAGE];
                    break;
            }
            criticalDamageMetaArray.push(...sourceValues);
        });
        console.log('getCriticalDamageMeta:',criticalDamageMetaArray);
        return criticalDamageMetaArray;
    };
    
    /**
     * 敵人獲取暴擊傷害Meta數據
     * Enemy gets critical damage meta data
     * @returns {Array} 按優先順序排列的暴擊傷害數值陣列
     */
    Game_Enemy.prototype.getCriticalDamageMeta = function(action) {
        const criticalDamageMetaArray = [];
        
        // 按照優先順序處理各個來源
        ENEMY_CRITICAL_DAMAGE_PRIORITY.forEach(source => {
            let sourceValues = [];
            switch (source) {
                case 'state':
                    sourceValues = this.getCriticalDamageFromStates();
                    break;
                case 'skill':
                    sourceValues = this.getCriticalDamageFromSkillOrItem(action);
                    break;
                case 'weapon':
                    sourceValues = this.getCriticalDamageFromWeapons();
                    break;
                case 'enemy':
                    sourceValues = this.getCriticalDamageFromEnemy();
                    break;
                case 'default':
                    sourceValues = [DEFAULT_CRITICAL_DAMAGE];
                    break;
            }
            criticalDamageMetaArray.push(...sourceValues);
        });
        
        return criticalDamageMetaArray;
    };
    
    /**
     * 從狀態中獲取暴擊傷害數值
     * Get critical damage values from states
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_BattlerBase.prototype.getCriticalDamageFromStates = function() {
        const values = [];
        this.states().forEach(state => {
            const criticalDamage = extractCriticalDamageFromMeta(state.meta);
            if (criticalDamage > 0) {
                values.push(criticalDamage);
            }
        });
        return values;
    };
    
    /**
     * 從技能/道具中獲取暴擊傷害數值
     * Get critical damage values from skill or item
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_BattlerBase.prototype.getCriticalDamageFromSkillOrItem = function(action) {
        console.log('action:',action);
        if (action && action.item()) {
            const criticalDamage = extractCriticalDamageFromMeta(action.item().meta);
            console.log('criticalDamage:',criticalDamage);
            return criticalDamage > 0 ? [criticalDamage] : [];
        }
        return [];
    };
    
    /**
     * 從盔甲中獲取暴擊傷害數值
     * Get critical damage values from armors
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_Actor.prototype.getCriticalDamageFromArmors = function() {
        const values = [];
        this.armors().forEach(armor => {
            if (armor) {
                const criticalDamage = extractCriticalDamageFromMeta(armor.meta);
                if (criticalDamage > 0) {
                    values.push(criticalDamage);
                }
            }
        });
        return values;
    };
    
    /**
     * 從武器中獲取暴擊傷害數值
     * Get critical damage values from weapons
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_BattlerBase.prototype.getCriticalDamageFromWeapons = function() {
        const values = [];
        
        if (this.isActor()) {
            // 角色武器處理
            this.weapons().forEach(weapon => {
                if (weapon) {
                    const criticalDamage = extractCriticalDamageFromMeta(weapon.meta);
                    if (criticalDamage > 0) {
                        values.push(criticalDamage);
                    }
                }
            });
        } else if (this.isEnemy()) {
            // 敵人武器處理
            const weaponId = this.getEnemyWeaponId();
            if (weaponId > 0) {
                const weapon = $dataWeapons[weaponId];
                if (weapon) {
                    const criticalDamage = extractCriticalDamageFromMeta(weapon.meta);
                    if (criticalDamage > 0) {
                        values.push(criticalDamage);
                    }
                }
            }
        }
        
        return values;
    };
    
    /**
     * 獲取敵人武器ID（兼容SRPG模式）
     * Get enemy weapon ID (compatible with SRPG mode)
     * @returns {number} 武器ID
     */
    Game_Enemy.prototype.getEnemyWeaponId = function() {
        // 檢查是否在SRPG模式且有相關方法
        if (isSRPGMode() && hasSRPGMethods() && typeof this.srpgWeaponId === 'function') {
            return this.srpgWeaponId();
        }
        
        return 0;
    };
    
    /**
     * 從角色中獲取暴擊傷害數值
     * Get critical damage values from actor
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_Actor.prototype.getCriticalDamageFromActor = function() {
        const actor = this.actor();
        if (actor) {
            const criticalDamage = extractCriticalDamageFromMeta(actor.meta);
            return criticalDamage > 0 ? [criticalDamage] : [];
        }
        return [];
    };
    
    /**
     * 從職業中獲取暴擊傷害數值
     * Get critical damage values from job/class
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_Actor.prototype.getCriticalDamageFromJob = function() {
        const currentClass = this.currentClass();
        if (currentClass) {
            const criticalDamage = extractCriticalDamageFromMeta(currentClass.meta);
            return criticalDamage > 0 ? [criticalDamage] : [];
        }
        return [];
    };
    
    /**
     * 從敵人數據中獲取暴擊傷害數值
     * Get critical damage values from enemy data
     * @returns {Array} 暴擊傷害數值陣列
     */
    Game_Enemy.prototype.getCriticalDamageFromEnemy = function() {
        const enemy = this.enemy();
        if (enemy) {
            const criticalDamage = extractCriticalDamageFromMeta(enemy.meta);
            return criticalDamage > 0 ? [criticalDamage] : [];
        }
        return [];
    };
    
    /**
     * 從Meta中提取暴擊傷害數值
     * Extract critical damage value from meta
     * @param {Object} meta Meta對象
     * @returns {number} 暴擊傷害數值
     */
    function extractCriticalDamageFromMeta(meta) {
        if (!meta) return 0;
        
        // 檢查是否有criticalDamage標籤
        if (meta.criticalDamage !== undefined) {
            return parseFloat(meta.criticalDamage) || 0;
        }
        
        // 使用正則表達式提取
        const match = String(meta.note || '').match(CRITICAL_DAMAGE_REGEX);
        if (match) {
            return parseFloat(match[1]) || 0;
        }
        
        return 0;
    };
    
    // =============================================================================
    // 第二階段：額外暴擊率控制系統
    // =============================================================================
    
    /**
     * 覆寫 itemCri 方法以支援額外暴擊率
     * Override itemCri method to support extra critical rate
     */
    Game_Action.prototype.itemCri = function(target) {
        const item = this.item();
        if (!item || !item.damage.critical) return 0;
        
        const baseCriticalRate = this.subject().cri;
        const extraCriticalRate = this.getExtraCriticalRate();
        const finalCriticalRate = (baseCriticalRate + extraCriticalRate) * (1 - target.cev);
        
        return Math.max(0, Math.min(1, finalCriticalRate)); // 限制在0-1之間
    };
    
    /**
     * 獲取額外暴擊率
     * Get extra critical rate
     * @returns {number} 額外暴擊率
     */
    Game_Action.prototype.getExtraCriticalRate = function() {
        const item = this.item();
        if (!item || !item.meta) return 0;
        
        // 檢查是否有extCriticalRate標籤
        if (item.meta.extCriticalRate !== undefined) {
            return parseFloat(item.meta.extCriticalRate) || 0;
        }
        
        // 使用正則表達式提取
        const match = String(item.meta.note || '').match(EXT_CRITICAL_RATE_REGEX);
        if (match) {
            return parseFloat(match[1]) || 0;
        }
        
        return 0;
    };
    
    // =============================================================================
    // 第三階段：基礎暴擊傷害能力值系統
    // =============================================================================
    
    /**
     * 覆寫 xparam 方法以支援暴擊傷害能力值
     * Override xparam method to support critical damage parameter
     */
    const _Game_BattlerBase_xparam = Game_BattlerBase.prototype.xparam;
    Game_BattlerBase.prototype.xparam = function(xparamId) {
        if (xparamId === EXTRA_PARAM_ID.CRITICAL_DAMAGE) {
            return this.getCriticalDamage();
        }
        return _Game_BattlerBase_xparam.call(this, xparamId);
    };
    
    /**
     * 重新定義基礎戰鬥者的屬性，加入暴擊傷害
     * Redefine base battler properties to include critical damage
     */
    Object.defineProperty(Game_BattlerBase.prototype, 'crd', {
        get: function() {
            return this.xparam(EXTRA_PARAM_ID.CRITICAL_DAMAGE);
        },
        configurable: true
    });
    
    /**
     * 角色獲取暴擊傷害能力值
     * Actor gets critical damage parameter
     * @returns {number} 暴擊傷害能力值
     */
    Game_Actor.prototype.getCriticalDamage = function() {
        const criticalDamageMetaArray = [];
        
        // 從裝備中獲取暴擊傷害
        criticalDamageMetaArray.push(...this.getCriticalDamageFromArmors());
        criticalDamageMetaArray.push(...this.getCriticalDamageFromWeapons());
        criticalDamageMetaArray.push(...this.getCriticalDamageFromActor());
        criticalDamageMetaArray.push(...this.getCriticalDamageFromJob());
        
        // 如果在SRPG戰鬥中，添加狀態和技能的影響
        if (this.inSRPGBattle()) {
            criticalDamageMetaArray.push(...this.getCriticalDamageFromStates());
            criticalDamageMetaArray.push(...this.getCriticalDamageFromSkillOrItem(this.currentAction()));
        }
        
        // 添加預設值
        criticalDamageMetaArray.push(DEFAULT_CRITICAL_DAMAGE);
        
        // 計算並回傳結果
        return calculateCriticalDamageByStrategy(criticalDamageMetaArray);
    };
    
    /**
     * 敵人獲取暴擊傷害能力值
     * Enemy gets critical damage parameter
     * @returns {number} 暴擊傷害能力值
     */
    Game_Enemy.prototype.getCriticalDamage = function() {
        const criticalDamageMetaArray = [];
        
        // 從敵人數據中獲取暴擊傷害
        criticalDamageMetaArray.push(...this.getCriticalDamageFromWeapons());
        criticalDamageMetaArray.push(...this.getCriticalDamageFromEnemy());
        
        // 如果在SRPG戰鬥中，添加狀態和技能的影響
        if (this.inSRPGBattle()) {
            criticalDamageMetaArray.push(...this.getCriticalDamageFromStates());
            criticalDamageMetaArray.push(...this.getCriticalDamageFromSkillOrItem(this.currentAction()));
        }
        
        // 添加預設值
        criticalDamageMetaArray.push(DEFAULT_CRITICAL_DAMAGE);
        
        // 計算並回傳結果
        return calculateCriticalDamageByStrategy(criticalDamageMetaArray);
    };
    
    /**
     * 檢查是否在SRPG戰鬥中
     * Check if in SRPG battle
     * @returns {boolean} 是否在SRPG戰鬥中
     */
    Game_BattlerBase.prototype.inSRPGBattle = function() {
        return isSRPGMode();
    };
    
    // =============================================================================
    // 插件命令系統
    // =============================================================================
    
    /**
     * 插件命令：改變預設暴擊傷害
     * Plugin command: Change default critical damage
     */
    PluginManager.registerCommand('NNNN_CriticalDamageController', 'changeDefaultCriticalDamage', args => {
        const newValue = parseFloat(args.value);
        if (!isNaN(newValue) && newValue > 0) {
            // 這裡可以添加改變預設值的邏輯
            // 由於使用了常數，需要特殊處理
            console.log(`Changing default critical damage to: ${newValue}`);
        }
    });
    
    /**
     * 插件命令：改變暴擊傷害策略
     * Plugin command: Change critical damage strategy
     */
    PluginManager.registerCommand('NNNN_CriticalDamageController', 'changeCriticalDamageStrategy', args => {
        const newStrategy = args.strategy;
        if (Object.values(CRITICAL_DAMAGE_STRATEGIES).includes(newStrategy)) {
            // 這裡可以添加改變策略的邏輯
            console.log(`Changing critical damage strategy to: ${newStrategy}`);
        }
    });
    
    // =============================================================================
    // 除錯和日誌系統
    // =============================================================================
    
    /**
     * 除錯：顯示暴擊傷害計算過程
     * Debug: Show critical damage calculation process
     */
    const _Game_Action_applyCritical = Game_Action.prototype.applyCritical;
    Game_Action.prototype.applyCritical = function(damage) {
        const result = _Game_Action_applyCritical.call(this, damage);
        
        // 除錯輸出
        if ($gameSystem && $gameSystem.isDebugMode && $gameSystem.isDebugMode()) {
            const criticalDamageResult = this.criticalDamageCalculate();
            console.log(`Critical Damage Calculation:
                Original Damage: ${damage}
                Critical Multiplier: ${criticalDamageResult}
                Final Damage: ${result}
                Strategy: ${CRITICAL_DAMAGE_STRATEGY}`);
        }
        
        return result;
    };
    
    // =============================================================================
    // 性能優化和兼容性增強
    // =============================================================================
    
    /**
     * 性能優化：緩存機制
     * Performance optimization: Caching mechanism
     */
    Game_BattlerBase.prototype.clearCriticalDamageCache = function() {
        this._criticalDamageCache = null;
        this._criticalDamageCacheValid = false;
    };
    
    const _Game_BattlerBase_refresh = Game_BattlerBase.prototype.refresh;
    Game_BattlerBase.prototype.refresh = function() {
        _Game_BattlerBase_refresh.call(this);
        this.clearCriticalDamageCache();
    };
    
    /**
     * 數據驗證
     * Data validation
     */
    const validatePluginParameters = function() {
        const errors = [];
        
        if (DEFAULT_CRITICAL_DAMAGE < 1.0) {
            errors.push('Default critical damage must be >= 1.0');
        }
        
        if (!Object.values(CRITICAL_DAMAGE_STRATEGIES).includes(CRITICAL_DAMAGE_STRATEGY)) {
            errors.push(`Invalid strategy: ${CRITICAL_DAMAGE_STRATEGY}`);
        }
        
        if (errors.length > 0) {
            throw new Error('NNNN_CriticalDamageController parameter errors: ' + errors.join(', '));
        }
    };
    
    /**
     * 初始化檢查
     * Initialize checks
     */
    const initializePlugin = function() {
        try {
            validatePluginParameters();
            console.log('NNNN_CriticalDamageController initialized successfully');
        } catch (error) {
            console.error('NNNN_CriticalDamageController initialization failed:', error);
        }
    };
    
    // 插件初始化
    if (typeof $dataSystem !== 'undefined') {
        initializePlugin();
    } else {
        const checkDataLoaded = setInterval(() => {
            if (typeof $dataSystem !== 'undefined') {
                clearInterval(checkDataLoaded);
                initializePlugin();
            }
        }, 100);
    }
})();
