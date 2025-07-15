# ClickUp 詳細検索ツール 使用例

ClickUpタスクを詳細な条件で絞り込み検索できる `ClickUpAdvancedSearch` の使用例を示します。

## 基本的な使用方法

```typescript
import { ClickUpTools } from "#/tools";

// ツールを初期化
const clickupTools = new ClickUpTools(deps);

// 基本的な検索フィルターを作成
const filters = clickupTools.createSearchFilters();
```

## 1. 基本的な検索

### キーワード検索

```typescript
const filters = {
  searchTerm: "バグ修正",
  limit: 20,
  page: 0,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

### 特定のチームでの検索

```typescript
const filters = {
  searchTerm: "機能開発",
  teamId: "team_12345",
  limit: 15,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 2. ステータスによる絞り込み

```typescript
// 進行中とレビュー中のタスクを検索
const filters = {
  statuses: ["in progress", "review"],
  limit: 15,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 3. 優先度による絞り込み

```typescript
// 高優先度と緊急のタスクを検索
const priorities = clickupTools.createPriorityFilter(["urgent", "high"]);
const filters = {
  priorities: priorities,
  includeClosed: false,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 4. 担当者による絞り込み

```typescript
// 特定の担当者のタスクを検索
const filters = {
  assigneeIds: ["user_123", "user_456"],
  statuses: ["open", "in progress"],
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 5. 日付範囲による絞り込み

```typescript
// 今週期日のタスクを検索
const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
const dateRange = clickupTools.createDateRangeFilter(today, nextWeek);

const filters = {
  dueDateFrom: dateRange.from,
  dueDateTo: dateRange.to,
  includeClosed: false,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

### 作成日による絞り込み

```typescript
// 今月作成されたタスクを検索
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
const monthRange = clickupTools.createDateRangeFilter(monthStart, monthEnd);

const filters = {
  createdDateFrom: monthRange.from,
  createdDateTo: monthRange.to,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 6. タグによる絞り込み

```typescript
// 特定のタグを持つタスクを検索
const filters = {
  tags: ["frontend", "urgent"],
  includeClosed: false,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 7. 複合条件での絞り込み

```typescript
// 複数条件を組み合わせた検索
const priorities = clickupTools.createPriorityFilter(["high", "urgent"]);
const nextWeek = clickupTools.createDateRangeFilter(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

const filters = {
  searchTerm: "API",
  statuses: ["open", "in progress"],
  priorities: priorities,
  assigneeIds: ["user_123"],
  dueDateFrom: nextWeek.from,
  dueDateTo: nextWeek.to,
  tags: ["backend"],
  includeClosed: false,
  includeSubtasks: true,
  limit: 25,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 8. カスタムフィールドによる絞り込み

```typescript
// カスタムフィールドでの絞り込み
const filters = {
  customFields: {
    // テキストフィールド
    field_text_123: "重要",

    // 数値フィールド（範囲指定）
    field_number_456: { min: 10, max: 100 },

    // ドロップダウンフィールド（複数選択）
    field_dropdown_789: ["オプション1", "オプション2"],
  },
  includeClosed: false,
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 9. 親タスクによる絞り込み

```typescript
// 特定の親タスクのサブタスクを検索
const filters = {
  parentTaskId: "task_parent_123",
  includeSubtasks: true,
  statuses: ["open"],
};

const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
```

## 10. ヘルパーメソッドの活用

### ステータス一覧の取得

```typescript
// 利用可能なステータス一覧を取得
const statuses = await clickupTools.getAvailableStatuses(accessToken, spaceId);
console.log("利用可能なステータス:", statuses);
```

### カスタムフィールド一覧の取得

```typescript
// リストのカスタムフィールド一覧を取得
const customFields = await clickupTools.getCustomFields(accessToken, listId);
console.log("カスタムフィールド:", customFields);
```

## レスポンスの構造

```typescript
const result = {
  success: true,
  filters: {
    /* 使用されたフィルター条件 */
  },
  tasks: [
    {
      id: "task_123",
      name: "タスク名",
      description: "タスクの説明",
      status: { status: "open", color: "#87909e" },
      priority: { priority: "high", color: "#ffcc00" },
      assignees: [
        /* 担当者一覧 */
      ],
      due_date: "2024-01-15T09:00:00.000Z",
      date_created: "2024-01-01T09:00:00.000Z",
      date_updated: "2024-01-10T15:30:00.000Z",
      tags: [
        /* タグ一覧 */
      ],
      custom_fields: [
        /* カスタムフィールド */
      ],
      teamId: "team_123",
      teamName: "開発チーム",
    },
  ],
  totalTasks: 25,
  pagination: {
    limit: 15,
    page: 0,
    hasMore: true,
    nextPage: 1,
  },
};
```

## 注意事項

1. **日付フィルター**: Unix timestampで指定します（`createDateRangeFilter`ヘルパーを使用推奨）
2. **優先度**: 数値で指定（1: Urgent, 2: High, 3: Normal, 4: Low）
3. **カスタムフィールド**: クライアント側でフィルタリングされるため、パフォーマンスに注意
4. **チーム権限**: アクセス権限のないチームのタスクは取得できません
5. **API制限**: ClickUp APIのレート制限に注意してください

## エラーハンドリング

```typescript
try {
  const result = await clickupTools.searchTasksAdvanced(accessToken, filters);
  console.log(`${result.totalTasks}件のタスクが見つかりました`);
} catch (error) {
  console.error("検索エラー:", error.message);
}
```
