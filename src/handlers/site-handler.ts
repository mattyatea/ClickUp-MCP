/**
 * ClickUp MCP Server - Site Handler
 *
 * ルートページでの使用方法説明とドキュメントを提供するハンドラー。
 */

import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClickUp MCP Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
        }
        .logo {
            font-size: 2.5rem;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 1rem;
        }
        .subtitle {
            font-size: 1.2rem;
            color: #666;
        }
        .section {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 8px;
        }
        .section h2 {
            margin-top: 0;
            color: #1f2937;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .feature {
            padding: 1rem;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .feature h3 {
            margin: 0 0 0.5rem 0;
            color: #2563eb;
        }
        .endpoint {
            font-family: monospace;
            background: #e5e7eb;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e5e7eb;
            color: #666;
        }
        code {
            background: #f1f5f9;
            padding: 0.125rem 0.25rem;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
        }
        .code-block {
            background: #f1f5f9;
            padding: 0.75rem;
            border-radius: 6px;
            margin: 0.5rem 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
            border-left: 4px solid #2563eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ClickUp MCP Server</div>
        <div class="subtitle">MCP Server for ClickUp API Integration</div>
    </div>

    <div class="section">
        <h2>概要</h2>
        <p>このサーバーは、<strong>ClickUp API</strong>との連携を提供するMCP（Model Context Protocol）サーバーです。OAuth認証を通じて、ClickUpのワークスペース、タスク、時間追跡などを操作できます。</p>
    </div>

    <div class="section">
        <h2>主な機能</h2>
        <div class="features">
            <div class="feature">
                <h3>ワークスペース管理</h3>
                <p>ClickUpのワークスペース、スペース、フォルダー、リストを取得できます</p>
            </div>
            <div class="feature">
                <h3>タスク管理</h3>
                <p>タスクの作成、更新、削除、取得ができます</p>
            </div>
            <div class="feature">
                <h3>時間追跡</h3>
                <p>時間追跡の開始、停止、エントリの管理ができます</p>
            </div>
            <div class="feature">
                <h3>ユーザー情報</h3>
                <p>認証されたユーザーの情報と自分のタスクを取得できます</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>エンドポイント</h2>
        <ul>
            <li><span class="endpoint">/sse</span> - MCP通信用のMCPエンドポイント</li>
            <li><span class="endpoint">/authorize</span> - OAuth認証開始</li>
            <li><span class="endpoint">/callback</span> - OAuth認証コールバック</li>
            <li><span class="endpoint">/webhook/clickup</span> - ClickUp Webhookエンドポイント</li>
            <li><span class="endpoint">/health</span> - ヘルスチェック</li>
        </ul>
    </div>

    <div class="section">
        <h2>使用方法</h2>
        <h3>Claude Codeでの接続方法</h3>
        <p>以下の手順でClaude Codeに接続してください：</p>
        <ol>
            <li>Claude Codeのターミナルで以下のコマンドを実行：
                <div class="code-block">claude mcp add --transport sse clickup https://clickup.nanasi-apps.xyz/sse</div>
            </li>
            <li>初回接続時にOAuth認証画面が表示されます</li>
            <li>ClickUpアカウントでログインし、アプリケーションを承認してください</li>
            <li>認証完了後、ClickUpのMCPツールが利用可能になります</li>
        </ol>
        
        <h3>利用可能なツール</h3>
        <ul>
            <li><strong>ユーザー・ワークスペース</strong>: <code>getUserInfo</code>, <code>getWorkspaces</code></li>
            <li><strong>階層構造</strong>: <code>getSpaces</code>, <code>getFolders</code>, <code>getListsInFolder</code>, <code>getListsInSpace</code>, <code>getAllLists</code></li>
            <li><strong>タスク管理</strong>: <code>getTasks</code>, <code>createTask</code>, <code>updateTask</code>, <code>deleteTask</code>, <code>getMyTasks</code></li>
            <li><strong>時間追跡</strong>: <code>startTimeTracking</code>, <code>stopTimeTracking</code>, <code>getTimeEntries</code>, <code>createTimeEntry</code>, <code>updateTimeEntry</code>, <code>deleteTimeEntry</code></li>
            <li><strong>ユーティリティ</strong>: <code>add</code> (基本的な足し算テスト)</li>
        </ul>
        
        <h3>認証について</h3>
        <ul>
            <li>このサーバーはClickUpの標準的なOAuthスコープを使用します</li>
            <li>ワークスペース、スペース、フォルダー、リスト、タスクへの読み書きアクセス権限を要求します</li>
            <li>時間追跡エントリの作成・管理権限も含まれます</li>
            <li>認証情報は安全に暗号化されて保存されます</li>
        </ul>
        
        <h3>使用例</h3>
        <p>Claude Codeで以下のような質問をしてみてください：</p>
        <ul>
            <li>「私のワークスペースを教えて」</li>
            <li>「今日のタスクを確認して」</li>
            <li>「新しいタスクを作成して」</li>
            <li>「時間追跡を開始して」</li>
            <li>「プロジェクトのリストを全て取得して」</li>
        </ul>
        
        <h3>注意事項</h3>
        <ul>
            <li>セッションは一定時間後に自動的に期限切れとなります</li>
            <li>Webhookは受信してログに記録しますが、リアルタイム通知はMCPエージェントが自動処理します</li>
            <li>エラーが発生した場合は、ブラウザには適切なエラーページが、APIには詳細なエラーレスポンスが返されます</li>
        </ul>
    </div>

    <div class="footer">
        <p>Powered by Cloudflare Workers | ClickUp MCP Server v1.0.0</p>
    </div>
</body>
</html>
    `);
});

export { app as SiteHandler };
