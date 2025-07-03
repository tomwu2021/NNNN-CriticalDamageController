# NNNN_CriticalDamageController 暴擊傷害控制器

## 插件基本資訊 / プラグイン基本情報 / Plugin Basic Information

**插件名稱:** NNNN_CriticalDamageController  
**版本:** v1.0.0 (Beta)  
**作者:** NeNeNeNeTaiPlugin  
**類型:** 原創插件 (非改寫)  
**更新狀態:** Beta版本，持續開發中  

---

## 1. 插件主要功能簡述

### 繁體中文
此插件提供三階段的暴擊傷害控制系統，包括：
- 多來源暴擊傷害設定（狀態、技能、裝備、武器、角色、職業）
- 額外暴擊率加成系統
- 基礎暴擊傷害能力值支援
- 靈活的計算策略（加法、乘法、最大值、優先順序）
- 完整的SRPG模式兼容性

### 日本語
このプラグインは3段階のクリティカルダメージ制御システムを提供します：
- 複数ソースクリティカルダメージ設定（ステート、スキル、装備、武器、アクター、職業）
- 追加クリティカル率向上システム
- 基礎クリティカルダメージ能力値サポート
- 柔軟な計算戦略（加算、乗算、最大値、優先順位）
- 完全なSRPGモード互換性

### English
This plugin provides a three-stage critical damage control system featuring:
- Multi-source critical damage settings (states, skills, equipment, weapons, actors, classes)
- Additional critical rate enhancement system
- Base critical damage parameter support
- Flexible calculation strategies (add, multiply, max, priority)
- Full SRPG mode compatibility

---

## 2. 參數使用說明

### 主要參數 / メインパラメータ / Main Parameters

#### criticalDamageStrategy (暴擊傷害計算策略)
- **選項:**
  - `add`: 加法策略 - 先減1再相加，最後加1
  - `multiply`: 乘法策略 - 所有數值相乘
  - `max`: 最大值策略 - 取最大值
  - `priority`: 優先順序策略 - 按優先順序取第一個
  - `default`: 預設策略 - 使用系統預設值
- **預設值:** `add`

#### ActorCriticalDamagePriority (角色暴擊傷害優先順序)
- **格式:** 逗號分隔的優先順序列表
- **預設值:** `state,skill,armor,weapon,actor,job,default`
- **說明:** 決定不同來源的暴擊傷害設定優先順序

#### defaultCriticalDamage (預設暴擊傷害倍率)
- **範圍:** 1.00 - 100.00
- **預設值:** 3.00
- **說明:** 沒有其他設定時使用的預設暴擊傷害倍率

---

## 3. 使用步驟

### 步驟1: 插件管理器設置
1. 在插件管理器中啟用 `NNNN_CriticalDamageController`
2. 選擇合適的 `criticalDamageStrategy`
3. 設定 `defaultCriticalDamage` 為希望的基礎倍率
4. 根據需要調整優先順序設定

### 步驟2: 資料庫設置暴擊傷害標籤

#### 狀態設置範例：
在狀態備註欄中添加：
```
<criticalDamage:2.5>
```
此狀態會提供2.5倍暴擊傷害

#### 技能設置範例：
在技能備註欄中添加：
```
<criticalDamage:1.8>
<extCriticalRate:0.15>
```
此技能提供1.8倍暴擊傷害和額外15%暴擊率

#### 武器設置範例：
在武器備註欄中添加：
```
<criticalDamage:2.2>
```
此武器提供2.2倍暴擊傷害

#### 角色設置範例：
在角色備註欄中添加：
```
<criticalDamage:1.5>
```
此角色基礎暴擊傷害為1.5倍

### 步驟3: 額外能力值設置（可選）
在角色的額外能力值中設定第10項（暴擊傷害能力值），可提供基礎暴擊傷害加成。

---

## 4. 測試方式

### 測試典型設置範例

#### 測試角色配置：
1. **暴擊專精戰士**
   - 角色備註：`<criticalDamage:1.8>`
   - 武器備註：`<criticalDamage:1.5>`
   - 期望結果（加法策略）：1.8 + 1.5 = 3.3倍 ✨ 更直觀！

2. **暴擊法師**
   - 狀態備註：`<criticalDamage:2.0>`
   - 技能備註：`<criticalDamage:1.6><extCriticalRate:0.2>`
   - 期望結果：狀態優先，2.0倍傷害 + 20%額外暴擊率

#### 測試技能配置：
創建測試技能：
```
技能名稱：烈焰斬擊
備註欄：<criticalDamage:2.0><extCriticalRate:0.25>
```

#### 測試步驟：
1. 配置上述測試角色和技能
2. 在戰鬥中觀察暴擊傷害是否按設定計算
3. 檢查額外暴擊率是否正確生效
4. 測試不同策略模式的計算結果

#### 期望結果：
- 暴擊傷害按照選定策略正確計算
- 額外暴擊率正確加成
- 不同來源的設定按優先順序生效
- SRPG模式下功能正常運作

//TODO:圖檔說明 - 需要添加暴擊傷害顯示、計算過程和不同策略效果的螢幕截圖

---

## 5. 版權聲明

**授權條款:** MIT License  
**商業使用:** ✅ 允許  
**二次開發:** ✅ 允許  
**轉售權限:** ❌ 禁止轉售原插件  
**署名要求:** 建議保留原作者資訊  

---

## 暴擊傷害計算策略詳解

### 加法策略 (Add) ✨ 已優化
```
最終倍率 = Σ(各來源倍率)
範例：狀態2.0 + 武器1.5 = 3.5倍
```
**直觀計算：**用戶設置的數值直接相加，更符合預期！

### 乘法策略 (Multiply)
```
最終倍率 = Π(各來源倍率)
範例：狀態2.0 × 武器1.5 = 3.0倍
```

### 最大值策略 (Max)
```
最終倍率 = Max(各來源倍率)
範例：狀態2.0, 武器1.5 = 2.0倍
```

### 優先順序策略 (Priority)
```
最終倍率 = 第一個有效來源的倍率
範例：按優先順序state > weapon，選擇狀態的2.0倍
```

---

## 注意事項 / 注意事項 / Notes

- 此插件為Beta版本，建議在測試環境中充分驗證
- **✨ 新計算邏輯：**加法策略已優化為直接相加，更符合用戶直覺
- 暴擊傷害計算會影響遊戲平衡，請謹慎設定數值
- SRPG模式下會自動檢測武器設定，敵人武器也會生效，確保兼容性
- 額外暴擊率與基礎暴擊率疊加，不會超過100%
- 建議定期備份存檔，以防配置錯誤影響遊戲進度 