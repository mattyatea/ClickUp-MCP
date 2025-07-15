/**
 * ClickUp MCP Tools - 検索・一覧関連
 *
 * タスク検索、自分のタスク一覧などの検索・一覧取得ツールを提供
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ClickUpClient } from "#/api";

/**
 * 検索・一覧関連のMCPツールを登録
 */
export function registerSearchTools(server: McpServer, clickupClient: ClickUpClient, getAccessToken: () => string) {
  // ClickUp 自分のタスク確認ツール
  server.tool(
    "getMyTasks",
    `# 自分のタスク一覧

## 用途
- 個人のアサインされたタスク確認
- 日次・週次の作業計画立案
- 個人の負荷状況把握

## 使用場面
- 朝のタスク確認・計画
- 定期的な進捗レビュー
- 上司への状況報告
- チームでの作業分担確認

## パフォーマンス
- **消費トークン**: 約300-600トークン（表示件数に依存）
- **応答時間**: 1-3秒
- **APIコール**: 1回

## パラメータ
- **teamId**: 必須（ワークスペースIDで絞り込み）
- **limit**: 1-100件（デフォルト15件）
- **page**: ページネーション対応

## 出力特徴
- 優先度別の視覚表示（🚨🔴🟡🟢⚪）
- ステータス別アイコン（✅🔄📝⭕）
- 期限切れ警告`,
    {
      teamId: z.string().describe("特定のチームIDに限定（必須）"),
      limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),
      page: z.number().optional().default(0).describe("ページ番号（0から開始）"),
    },
    {
      type: "object",
      properties: {
        success: { type: "boolean", description: "取得が成功したかどうか" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "タスクID" },
              name: { type: "string", description: "タスク名" },
              status: { type: "string", description: "ステータス" },
              priority: { type: "string", description: "優先度" },
              due_date_readable: { type: "string", description: "期限（読みやすい形式）" },
              list: {
                type: "object",
                properties: {
                  id: { type: "string", description: "リストID" },
                  name: { type: "string", description: "リスト名" },
                },
              },
              assignees: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "担当者ID" },
                    username: { type: "string", description: "担当者名" },
                  },
                },
              },
              url: { type: "string", description: "ClickUpでのタスクURL" },
            },
            required: ["id", "name"],
          },
        },
        totalTasks: { type: "number", description: "総タスク数" },
        pagination: {
          type: "object",
          properties: {
            limit: { type: "number", description: "取得件数" },
            page: { type: "number", description: "現在のページ" },
            hasMore: { type: "boolean", description: "続きがあるかどうか" },
            nextPage: { type: "number", description: "次のページ番号" },
          },
        },
      },
      required: ["success", "tasks", "totalTasks", "pagination"],
    },
    async ({ teamId, limit = 15, page = 0 }: { teamId?: string; limit?: number; page?: number }) => {
      try {
        const data = await clickupClient.getMyTasks(getAccessToken(), teamId, limit, page);
        const content = [
          {
            type: "text" as const,
            text: `# 自分のタスク一覧\n\n**合計**: ${data.totalTasks}件 | **ページ**: ${page + 1} | **取得件数**: ${limit}\n${data.pagination.hasMore ? `\n📄 続きがあります（次のページ: ${data.pagination.nextPage}）` : "\n✅ 全て取得済み"}`,
          },
        ];

        if (data.tasks.length === 0) {
          content.push({
            type: "text" as const,
            text: "🎉 現在あなたにアサインされているタスクはありません！",
          });
        } else {
          data.tasks.forEach((task: any, index: number) => {
            const urgencyEmoji =
              task.priority === "urgent"
                ? "🚨"
                : task.priority === "high"
                  ? "🔴"
                  : task.priority === "normal"
                    ? "🟡"
                    : task.priority === "low"
                      ? "🟢"
                      : "⚪";

            const statusEmoji =
              task.status === "complete" ? "✅" : task.status === "in progress" ? "🔄" : task.status === "to do" ? "📝" : "⭕";

            content.push({
              type: "text" as const,
              text: `## ${index + 1}. ${urgencyEmoji} ${task.name}\n\n${statusEmoji} **${task.status || "未設定"}** | 📋 ${task.list?.name || "不明"}\n${task.due_date_readable ? `⏰ 期限: ${task.due_date_readable}` : "⏰ 期限: 未設定"}\n${task.assignees.length > 1 ? `👥 共同担当: ${task.assignees.map((a: any) => a.username).join(", ")}` : ""}\n${task.url ? `\n**リンク**: ${task.url}` : ""}`,
            });
          });
        }

        return { content };
      } catch (error) {
        throw new Error(`自分のタスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );

  // ClickUp タスク検索ツール
  server.tool(
    "searchTasks",
    `# キーワード検索

## 用途
- プロジェクト・案件名での検索
- 過去の類似タスク探索
- ナレッジ・経験の発見

## 使用場面
- 新規プロジェクト開始時の参考資料検索
- 過去の対応事例調査
- 特定の技術・機能に関するタスク探索
- 引き継ぎ時の関連タスク確認

## パフォーマンス
- **消費トークン**: 約400-800トークン（結果件数に依存）
- **応答時間**: 2-4秒
- **APIコール**: 1回

## 検索範囲
- タスク名、説明文、コメント
- 大文字小文字区別なし
- 部分一致対応

## パラメータ
- **searchTerm**: 検索キーワード（必須）
- **teamId**: 検索対象チーム（必須）
- ページネーション対応`,
    {
      searchTerm: z.string().describe("検索キーワード（タスク名や説明から検索）"),
      teamId: z.string().describe("特定のチームIDに限定（必須）"),
      limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),
      page: z.number().optional().default(0).describe("ページ番号（0から開始）"),
    },
    {
      type: "object",
      properties: {
        success: { type: "boolean", description: "検索が成功したかどうか" },
        searchTerm: { type: "string", description: "使用された検索キーワード" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "タスクID" },
              name: { type: "string", description: "タスク名" },
              status: { type: "string", description: "ステータス" },
              priority: { type: "string", description: "優先度" },
              due_date_readable: { type: "string", description: "期限（読みやすい形式）" },
              list: {
                type: "object",
                properties: {
                  id: { type: "string", description: "リストID" },
                  name: { type: "string", description: "リスト名" },
                },
              },
              assignees: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "担当者ID" },
                    username: { type: "string", description: "担当者名" },
                  },
                },
              },
              teamName: { type: "string", description: "チーム名" },
              url: { type: "string", description: "ClickUpでのタスクURL" },
            },
            required: ["id", "name"],
          },
        },
        totalTasks: { type: "number", description: "検索結果の総数" },
        pagination: {
          type: "object",
          properties: {
            limit: { type: "number", description: "取得件数" },
            page: { type: "number", description: "現在のページ" },
            hasMore: { type: "boolean", description: "続きがあるかどうか" },
            nextPage: { type: "number", description: "次のページ番号" },
          },
        },
      },
      required: ["success", "searchTerm", "tasks", "totalTasks", "pagination"],
    },
    async ({ searchTerm, teamId, limit = 15, page = 0 }: { searchTerm: string; teamId?: string; limit?: number; page?: number }) => {
      try {
        const data = await clickupClient.searchTasks(getAccessToken(), searchTerm, teamId, limit, page);
        const content = [
          {
            type: "text" as const,
            text: `# タスク検索結果 🔍\n\n**検索キーワード**: "${searchTerm}"\n**結果**: ${data.totalTasks}件 | **ページ**: ${page + 1} | **取得件数**: ${limit}\n${data.pagination.hasMore ? `\n📄 続きがあります（次のページ: ${data.pagination.nextPage}）` : "\n✅ 検索完了"}`,
          },
        ];

        if (data.tasks.length === 0) {
          content.push({
            type: "text" as const,
            text: `❌ 検索条件に一致するタスクが見つかりませんでした。\n\n**検索のコツ**:\n- キーワードを変更してみてください\n- 完了済みタスクも含めて検索されています\n- 部分一致で検索されます`,
          });
        } else {
          data.tasks.forEach((task: any, index: number) => {
            const urgencyEmoji =
              task.priority === "urgent"
                ? "🚨"
                : task.priority === "high"
                  ? "🔴"
                  : task.priority === "normal"
                    ? "🟡"
                    : task.priority === "low"
                      ? "🟢"
                      : "⚪";

            const statusEmoji =
              task.status === "complete"
                ? "✅"
                : task.status === "closed"
                  ? "🔒"
                  : task.status === "in progress"
                    ? "🔄"
                    : task.status === "to do"
                      ? "📝"
                      : "⭕";

            content.push({
              type: "text" as const,
              text: `## ${index + 1}. ${urgencyEmoji} ${task.name}\n\n${statusEmoji} **${task.status || "未設定"}** | 📋 ${task.list?.name || "不明"} | 🏢 ${task.teamName || "不明"}\n${task.due_date_readable ? `⏰ 期限: ${task.due_date_readable}` : "⏰ 期限: 未設定"}\n👥 担当者: ${task.assignees.map((a: any) => a.username).join(", ") || "未割り当て"}\n${task.url ? `\n**リンク**: ${task.url}` : ""}`,
            });
          });
        }

        return { content };
      } catch (error) {
        throw new Error(`タスクの検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );

  // ClickUp 詳細検索ツール
  server.tool(
    "searchTasksAdvanced",
    `# 詳細検索・分析

## 用途
- 複数条件での高度な検索
- プロジェクト分析・レポート作成
- 品質管理・監査対応

## 使用場面
- 月次・四半期レポート作成
- 特定期間の作業分析
- 担当者別・優先度別の分析
- 締切管理・リスク分析

## パフォーマンス
- **消費トークン**: 約500-1200トークン（大量結果時）
- **応答時間**: 3-6秒（条件複雑度に依存）
- **APIコール**: 1回

## 検索条件
- **基本**: キーワード、チーム
- **ステータス**: 複数ステータス指定可
- **優先度**: urgent/high/normal/low
- **担当者**: 担当者ID・作成者ID
- **日付範囲**: 期限、開始、作成、更新日
- **その他**: タグ、親子関係、完了済み含む

## 高度機能
- 日付範囲フィルタ（ISO8601形式）
- 複数条件のAND検索
- 統計情報・傾向分析`,
    {
      // 基本検索
      searchTerm: z.string().optional().describe("検索キーワード（タスク名や説明から検索）"),
      teamId: z.string().optional().describe("特定のチームIDに限定"),

      // ステータス・優先度フィルター
      statuses: z.array(z.string()).optional().describe("ステータス名の配列（例: ['open', 'in progress']）"),
      priorities: z
        .array(z.enum(["urgent", "high", "normal", "low"]))
        .optional()
        .describe("優先度の配列（例: ['urgent', 'high']）"),

      // 担当者フィルター
      assigneeIds: z.array(z.string()).optional().describe("担当者IDの配列"),
      creatorIds: z.array(z.string()).optional().describe("作成者IDの配列"),

      // 日付範囲フィルター（ISO8601文字列）
      dueDateFrom: z.string().optional().describe("期限開始日（ISO8601形式: 2024-01-01T00:00:00Z）"),
      dueDateTo: z.string().optional().describe("期限終了日（ISO8601形式: 2024-01-31T23:59:59Z）"),
      startDateFrom: z.string().optional().describe("開始日の開始（ISO8601形式）"),
      startDateTo: z.string().optional().describe("開始日の終了（ISO8601形式）"),
      createdDateFrom: z.string().optional().describe("作成日の開始（ISO8601形式）"),
      createdDateTo: z.string().optional().describe("作成日の終了（ISO8601形式）"),
      updatedDateFrom: z.string().optional().describe("更新日の開始（ISO8601形式）"),
      updatedDateTo: z.string().optional().describe("更新日の終了（ISO8601形式）"),

      // タグフィルター
      tags: z.array(z.string()).optional().describe("タグ名の配列（例: ['frontend', 'urgent']）"),

      // その他のオプション
      parentTaskId: z.string().optional().describe("親タスクID（サブタスクを検索）"),
      includeSubtasks: z.boolean().optional().default(true).describe("サブタスクを含める（デフォルト: true）"),
      includeArchived: z.boolean().optional().default(false).describe("アーカイブ済みタスクを含める（デフォルト: false）"),
      includeClosed: z.boolean().optional().default(false).describe("完了済みタスクを含める（デフォルト: false）"),

      // ページネーション
      limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),
      page: z.number().optional().default(0).describe("ページ番号（0から開始）"),
    },
    {
      type: "object",
      properties: {
        success: { type: "boolean", description: "検索が成功したかどうか" },
        filters: { type: "object", description: "使用された検索条件" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "タスクID" },
              name: { type: "string", description: "タスク名" },
              description: { type: "string", description: "タスク説明" },
              status: { type: "string", description: "ステータス" },
              priority: { type: "string", description: "優先度" },
              due_date_readable: { type: "string", description: "期限（読みやすい形式）" },
              start_date_readable: { type: "string", description: "開始日（読みやすい形式）" },
              created_date_readable: { type: "string", description: "作成日（読みやすい形式）" },
              updated_date_readable: { type: "string", description: "更新日（読みやすい形式）" },
              list: {
                type: "object",
                properties: {
                  id: { type: "string", description: "リストID" },
                  name: { type: "string", description: "リスト名" },
                },
              },
              assignees: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "担当者ID" },
                    username: { type: "string", description: "担当者名" },
                  },
                },
              },
              creator: {
                type: "object",
                properties: {
                  id: { type: "string", description: "作成者ID" },
                  username: { type: "string", description: "作成者名" },
                },
              },
              tags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "タグ名" },
                    tag_fg: { type: "string", description: "タグの文字色" },
                    tag_bg: { type: "string", description: "タグの背景色" },
                  },
                },
              },
              teamName: { type: "string", description: "チーム名" },
              url: { type: "string", description: "ClickUpでのタスクURL" },
            },
            required: ["id", "name"],
          },
        },
        totalTasks: { type: "number", description: "検索結果の総数" },
        pagination: {
          type: "object",
          properties: {
            limit: { type: "number", description: "取得件数" },
            page: { type: "number", description: "現在のページ" },
            hasMore: { type: "boolean", description: "続きがあるかどうか" },
            nextPage: { type: "number", description: "次のページ番号" },
          },
        },
      },
      required: ["success", "filters", "tasks", "totalTasks", "pagination"],
    },
    async (args: {
      searchTerm?: string;
      teamId?: string;
      statuses?: string[];
      priorities?: ("urgent" | "high" | "normal" | "low")[];
      assigneeIds?: string[];
      creatorIds?: string[];
      dueDateFrom?: string;
      dueDateTo?: string;
      startDateFrom?: string;
      startDateTo?: string;
      createdDateFrom?: string;
      createdDateTo?: string;
      updatedDateFrom?: string;
      updatedDateTo?: string;
      tags?: string[];
      parentTaskId?: string;
      includeSubtasks?: boolean;
      includeArchived?: boolean;
      includeClosed?: boolean;
      limit?: number;
      page?: number;
    }) => {
      try {
        // 優先度の文字列を数値に変換
        const priorityMap = { urgent: 1, high: 2, normal: 3, low: 4 } as const;
        const priorities = args.priorities?.map((p) => priorityMap[p]);

        // 日付文字列をUnix timestampに変換するヘルパー
        const parseDate = (dateStr?: string): number | undefined => {
          if (!dateStr) return undefined;
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            throw new Error(`無効な日付形式: ${dateStr}`);
          }
          return Math.floor(date.getTime());
        };

        // advanced search用のフィルターオブジェクトを構築
        const filters = {
          searchTerm: args.searchTerm,
          teamId: args.teamId,
          statuses: args.statuses,
          priorities: priorities,
          assigneeIds: args.assigneeIds,
          creatorIds: args.creatorIds,
          dueDateFrom: parseDate(args.dueDateFrom),
          dueDateTo: parseDate(args.dueDateTo),
          startDateFrom: parseDate(args.startDateFrom),
          startDateTo: parseDate(args.startDateTo),
          createdDateFrom: parseDate(args.createdDateFrom),
          createdDateTo: parseDate(args.createdDateTo),
          updatedDateFrom: parseDate(args.updatedDateFrom),
          updatedDateTo: parseDate(args.updatedDateTo),
          tags: args.tags,
          parentTaskId: args.parentTaskId,
          includeSubtasks: args.includeSubtasks,
          includeArchived: args.includeArchived,
          includeClosed: args.includeClosed,
          limit: args.limit || 15,
          page: args.page || 0,
        };

        const data = await clickupClient.searchTasksAdvanced(getAccessToken(), filters);

        // フィルター条件の表示用文字列を生成
        const filterDescriptions = [];
        if (filters.searchTerm) filterDescriptions.push(`🔍 キーワード: "${filters.searchTerm}"`);
        if (filters.statuses?.length) filterDescriptions.push(`📋 ステータス: ${filters.statuses.join(", ")}`);
        if (filters.priorities?.length) {
          const priorityNames = filters.priorities.map((p) =>
            Object.keys(priorityMap).find((k) => priorityMap[k as keyof typeof priorityMap] === p),
          );
          filterDescriptions.push(`⚡ 優先度: ${priorityNames.join(", ")}`);
        }
        if (filters.assigneeIds?.length) filterDescriptions.push(`👤 担当者ID: ${filters.assigneeIds.join(", ")}`);
        if (filters.tags?.length) filterDescriptions.push(`🏷️ タグ: ${filters.tags.join(", ")}`);
        if (filters.dueDateFrom || filters.dueDateTo) {
          const fromStr = filters.dueDateFrom ? new Date(filters.dueDateFrom).toLocaleDateString() : "開始";
          const toStr = filters.dueDateTo ? new Date(filters.dueDateTo).toLocaleDateString() : "終了";
          filterDescriptions.push(`📅 期限: ${fromStr} ～ ${toStr}`);
        }
        if (filters.parentTaskId) filterDescriptions.push(`🔗 親タスク: ${filters.parentTaskId}`);
        if (!filters.includeClosed) filterDescriptions.push(`❌ 完了済み除外`);
        if (filters.includeArchived) filterDescriptions.push(`📁 アーカイブ済み含む`);

        const content = [
          {
            type: "text" as const,
            text: `# 詳細検索結果 🔍\n\n${filterDescriptions.length > 0 ? filterDescriptions.join("\n") + "\n\n" : ""}**結果**: ${data.totalTasks}件 | **ページ**: ${(filters.page || 0) + 1} | **取得件数**: ${filters.limit || 15}\n${data.pagination.hasMore ? `\n📄 続きがあります（次のページ: ${data.pagination.nextPage}）` : "\n✅ 検索完了"}`,
          },
        ];

        if (data.tasks.length === 0) {
          content.push({
            type: "text" as const,
            text: `❌ 指定した条件に一致するタスクが見つかりませんでした。\n\n**検索のコツ**:\n- 検索条件を緩和してみてください\n- 完了済みタスクも含める場合は \`includeClosed: true\` を設定\n- 日付範囲を広げてみてください`,
          });
        } else {
          data.tasks.forEach((task: any, index: number) => {
            const urgencyEmoji =
              task.priority === "urgent"
                ? "🚨"
                : task.priority === "high"
                  ? "🔴"
                  : task.priority === "normal"
                    ? "🟡"
                    : task.priority === "low"
                      ? "🟢"
                      : "⚪";

            const statusEmoji =
              task.status === "complete"
                ? "✅"
                : task.status === "closed"
                  ? "🔒"
                  : task.status === "in progress"
                    ? "🔄"
                    : task.status === "to do"
                      ? "📝"
                      : "⭕";

            // タグの表示
            const tagsDisplay = task.tags && task.tags.length > 0 ? `\n🏷️ タグ: ${task.tags.map((tag: any) => tag.name).join(", ")}` : "";

            // 日付情報
            const dateInfo = [];
            if (task.due_date_readable) dateInfo.push(`⏰ 期限: ${task.due_date_readable}`);
            if (task.start_date_readable) dateInfo.push(`🚀 開始: ${task.start_date_readable}`);
            if (task.created_date_readable) dateInfo.push(`📅 作成: ${task.created_date_readable}`);
            if (task.updated_date_readable) dateInfo.push(`🔄 更新: ${task.updated_date_readable}`);
            const dateDisplay = dateInfo.length > 0 ? `\n${dateInfo.join(" | ")}` : "";

            // 担当者と作成者
            const assigneesDisplay =
              task.assignees?.length > 0 ? `👥 担当者: ${task.assignees.map((a: any) => a.username).join(", ")}` : "👥 担当者: 未割り当て";

            const creatorDisplay = task.creator?.username ? ` | 👤 作成者: ${task.creator.username}` : "";

            content.push({
              type: "text" as const,
              text: `## ${index + 1}. ${urgencyEmoji} ${task.name}\n\n${statusEmoji} **${task.status || "未設定"}** | 📋 ${task.list?.name || "不明"} | 🏢 ${task.teamName || "不明"}${dateDisplay}\n${assigneesDisplay}${creatorDisplay}${tagsDisplay}${task.description ? `\n\n**説明**: ${task.description.length > 100 ? task.description.substring(0, 100) + "..." : task.description}` : ""}${task.url ? `\n\n**リンク**: ${task.url}` : ""}`,
            });
          });
        }

        return { content };
      } catch (error) {
        throw new Error(`詳細タスク検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
