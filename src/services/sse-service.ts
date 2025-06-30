import type { SSENotification, ServiceDependencies } from '../types';

export class SSEService {
    constructor(private deps: ServiceDependencies) { }

    async createSSEConnection(userId: string): Promise<Response> {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // SSEヘッダーを設定
        const headers = new Headers({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });

        // 初期接続メッセージを送信
        await this.sendConnectionMessage(writer, encoder, userId);

        // 通知をすぐにチェック
        await this.checkAndSendNotifications(writer, encoder, userId);

        // ハートビートと通知チェックを設定
        const interval = this.setupHeartbeat(writer, encoder, userId);

        // クリーンアップを設定
        const controller = this.setupCleanup(interval, writer);

        return new Response(readable, { headers });
    }

    async storeNotification(notification: SSENotification): Promise<void> {
        const key = `notification:${notification.userId}:${Date.now()}`;
        await this.deps.env.OAUTH_KV.put(
            key,
            JSON.stringify(notification),
            { expirationTtl: this.deps.config.notificationTtl }
        );
    }

    async storeWebhookEvent(eventData: any): Promise<void> {
        const webhookData = {
            type: 'clickup_webhook',
            event: eventData.event,
            data: eventData,
            timestamp: new Date().toISOString(),
        };

        await this.deps.env.OAUTH_KV.put(
            `webhook:${Date.now()}`,
            JSON.stringify(webhookData),
            { expirationTtl: this.deps.config.notificationTtl }
        );
    }

    private async sendConnectionMessage(
        writer: WritableStreamDefaultWriter,
        encoder: TextEncoder,
        userId: string
    ): Promise<void> {
        const message = {
            type: 'connected',
            message: 'SSE接続が確立されました',
            userId,
            timestamp: new Date().toISOString(),
        };

        await writer.write(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
    }

    private async checkAndSendNotifications(
        writer: WritableStreamDefaultWriter,
        encoder: TextEncoder,
        userId: string
    ): Promise<void> {
        try {
            const notificationKeys = await this.deps.env.OAUTH_KV.list({
                prefix: `notification:${userId}:`
            });

            for (const key of notificationKeys.keys) {
                const notification = await this.deps.env.OAUTH_KV.get(key.name);
                if (notification) {
                    await writer.write(encoder.encode(`data: ${notification}\n\n`));
                    // 送信後に通知を削除
                    await this.deps.env.OAUTH_KV.delete(key.name);
                }
            }
        } catch (error) {
            console.error('通知チェック中のエラー:', error);
        }
    }

    private setupHeartbeat(
        writer: WritableStreamDefaultWriter,
        encoder: TextEncoder,
        userId: string
    ): number {
        return setInterval(async () => {
            try {
                // ハートビートを送信
                const heartbeat = {
                    type: 'heartbeat',
                    timestamp: new Date().toISOString(),
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));

                // 新しい通知をチェック
                await this.checkAndSendNotifications(writer, encoder, userId);
            } catch (error) {
                console.error('SSEインターバルエラー:', error);
                clearInterval(interval);
            }
        }, this.deps.config.sseHeartbeatInterval);
    }

    private setupCleanup(
        interval: number,
        writer: WritableStreamDefaultWriter
    ): AbortController {
        const controller = new AbortController();

        const cleanup = () => {
            clearInterval(interval);
            writer.close();
        };

        controller.signal.addEventListener('abort', cleanup);

        // タイムアウト後にクリーンアップ
        setTimeout(() => {
            controller.abort();
        }, this.deps.config.sseConnectionTimeout);

        return controller;
    }
} 