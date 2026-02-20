import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Botpress Chat API v2 credentials — sourced from environment variables
const BOT_ID = process.env.EXPO_PUBLIC_BOTPRESS_BOT_ID ?? '0688dbd4-7edd-42f1-b072-7d76b8d9ebc0';
const CLIENT_ID = process.env.EXPO_PUBLIC_BOTPRESS_CLIENT_ID ?? '98c27071-e27d-4d59-8210-c3d6a86c0344';
const API_URL = `https://chat.botpress.cloud/${CLIENT_ID}`;
const STORAGE_KEY_PREFIX = 'bp_user_key_';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export interface Message {
    id: string;
    payload: {
        type: string;
        text: string;
        [key: string]: any;
    };
    userId: string;
    conversationId: string;
    createdAt: string;
    direction: 'incoming' | 'outgoing';
}

export interface BotpressProfile {
    id: string;
    name?: string;
    email?: string;
    subscriptionTier?: string;
}

export class BotpressService {
    private userToken: string | null = null;
    private conversationId: string | null = null;
    private botpressUserId: string | null = null; // Internal Botpress ID (user_...)
    private initPromise: Promise<any> | null = null;
    private lastUserParams: { externalId: string; profile?: Partial<BotpressProfile> } | null = null;

    clearConversation() {
        this.conversationId = null;
    }

    private async ensureInitialized() {
        if (this.initPromise) {
            await this.initPromise;
        }

        // If we still have no token but have user params, try initializing
        if (!this.userToken && this.lastUserParams) {
            await this.createUser(this.lastUserParams.externalId, this.lastUserParams.profile);
        }
    }

    // Shared error handler for 403 auth errors
    private async handleAuthError() {
        this.userToken = null;
        this.conversationId = null;
        if (this.lastUserParams) {
            await Promise.all([
                SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}${this.lastUserParams.externalId}`),
                SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`)
            ]);
        }
        await this.ensureInitialized();
        await this.getOrStartLastConversation();
    }

    async createUser(externalId: string, profile?: Partial<BotpressProfile>) {
        this.lastUserParams = { externalId, profile };

        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                if (this.userToken) {
                    if (profile) await this.updateUser(profile);
                    return { id: externalId, botpressUserId: this.botpressUserId };
                }

                const storedKey = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`);
                const storedInternalId = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`);

                if (storedKey) {
                    this.userToken = storedKey;
                    this.botpressUserId = storedInternalId;
                    if (profile) await this.updateUser(profile);
                    return { id: externalId, botpressUserId: storedInternalId };
                }

                // Normalize subscription tier for Botpress — keep lowercase to match hook's === 'premium' check
                const tier = (profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'premium' : 'free';

                const response = await axios.post(`${API_URL}/users`, {
                    externalId,
                    name: profile?.name,
                    tags: {
                        userId: externalId,
                        email: profile?.email,
                        subscriptionTier: tier,
                        tier: tier,
                        plan: tier,
                        subscription: tier,
                        isPremium: String(tier === 'premium')
                    },
                    data: {
                        externalId,
                        email: profile?.email,
                        subscriptionTier: tier,
                        tier: tier,
                        plan: tier,
                        subscription: tier,
                        isPremium: tier === 'premium'
                    }
                }, {
                    headers: { 'x-bot-id': BOT_ID },
                    timeout: REQUEST_TIMEOUT
                });

                const key = response.headers['x-user-key'] || response.data.key;
                this.botpressUserId = response.data.user?.id || response.data.id;

                if (key) {
                    this.userToken = key;
                    // Batch SecureStore operations
                    await Promise.all([
                        SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`, key),
                        this.botpressUserId ? SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`, this.botpressUserId) : Promise.resolve()
                    ]);
                }
                return { ...response.data, botpressUserId: this.botpressUserId };
            } catch (error: any) {
                if (error.response?.status === 409) {
                    const storedInternalId = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`);
                    if (storedInternalId) {
                        console.warn('[Botpress] 409: user exists, internal ID found in store. Token may be missing — will retry on next call.');
                        return { id: externalId, botpressUserId: storedInternalId };
                    }

                    const fallbackId = `${externalId}_${Date.now()}`;
                    console.warn('[Botpress] 409: no stored key or internal ID (likely app reinstall). Re-registering as:', fallbackId);
                    try {
                        const tier = (profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'Premium' : 'free';
                        const retryResponse = await axios.post(`${API_URL}/users`, {
                            externalId: fallbackId,
                            name: profile?.name,
                            tags: { userId: externalId, subscriptionTier: tier, isPremium: tier === 'Premium' },
                            data: { externalId, subscriptionTier: tier, isPremium: tier === 'Premium' }
                        }, {
                            headers: { 'x-bot-id': BOT_ID },
                            timeout: REQUEST_TIMEOUT
                        });
                        const retryKey = retryResponse.headers['x-user-key'] || retryResponse.data.key;
                        const retryInternalId = retryResponse.data.user?.id || retryResponse.data.id;
                        if (retryKey) {
                            this.userToken = retryKey;
                            this.botpressUserId = retryInternalId;
                            await Promise.all([
                                SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`, retryKey),
                                retryInternalId ? SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`, retryInternalId) : Promise.resolve()
                            ]);
                        }
                        return { ...retryResponse.data, botpressUserId: retryInternalId };
                    } catch (retryError: any) {
                        console.error('[Botpress] 409 recovery failed:', retryError.response?.data || retryError.message);
                        return { id: externalId, botpressUserId: undefined };
                    }
                }
                console.error('Botpress Init Error:', error.response?.data || error.message);
                throw error;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async syncUser(profile: Partial<BotpressProfile>) {
        await this.ensureInitialized();
        if (!this.userToken) return;

        console.log('[Botpress] Syncing user profile...', profile);
        try {
            await this.updateUser(profile);
            console.log('[Botpress] User synced successfully');
        } catch (error) {
            console.error('[Botpress] Sync User Error:', error);
        }
    }

    async updateUser(profile: Partial<BotpressProfile>) {
        // PUT /users/me only needs x-user-key — botpressUserId is not required for this endpoint
        if (!this.userToken) {
            console.warn('[Botpress] Cannot update user: No userToken');
            return;
        }

        // Use lowercase to match Botpress hook's === 'premium' comparison
        const tier = (profile.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'premium' : 'free';

        try {
            const dataObj = {
                externalId: this.lastUserParams?.externalId,
                email: profile.email || this.lastUserParams?.profile?.email,
                subscriptionTier: tier,
                tier: tier,
                plan: tier,
                subscription: tier,
                isPremium: String(tier === 'premium')
            };

            const tagsObj = {
                userId: this.lastUserParams?.externalId,
                email: profile.email || this.lastUserParams?.profile?.email,
                subscriptionTier: tier,
                tier: tier,
                isPremium: String(tier === 'premium')
            };

            console.log('[Botpress] Updating user with data:', JSON.stringify(dataObj, null, 2));

            const response = await axios.put(
                `${API_URL}/users/me`,
                {
                    name: profile.name,
                    tags: tagsObj,
                    data: dataObj,
                    attributes: dataObj
                },
                {
                    headers: {
                        'x-user-key': this.userToken,
                        'x-bot-id': BOT_ID
                    },
                    timeout: REQUEST_TIMEOUT
                }
            );

            console.log('[Botpress] Update User Response:', response.status, JSON.stringify(response.data, null, 2));

            if (this.lastUserParams) {
                this.lastUserParams.profile = { ...this.lastUserParams.profile, ...profile };
            }
        } catch (error: any) {
            console.error('Error updating Botpress user:', error.response?.data || error.message);
        }
    }

    async setUserState(variables: Record<string, any>, stateName: string = 'user') {
        if (!this.userToken || !this.botpressUserId) {
            console.warn('[Botpress] Cannot set user state: not initialized');
            return;
        }

        console.log(`[Botpress] Setting user state (${stateName}):`, JSON.stringify(variables, null, 2));

        // Use the generic Chat API endpoint, not the Client ID specific one which is for Webchat socket
        const CHAT_API_URL = 'https://api.botpress.cloud/v1/chat';

        try {
            const response = await axios.post(
                `${CHAT_API_URL}/states/user/${this.botpressUserId}/${stateName}`,
                { payload: variables },
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'x-user-key': this.userToken,
                        'x-bot-id': BOT_ID,
                        'Content-Type': 'application/json'
                    },
                    timeout: REQUEST_TIMEOUT
                }
            );
            console.log(`[Botpress] Set user state (${stateName}) OK:`, response.status);
        } catch (error: any) {
            const status = error.response?.status;
            console.warn(`[Botpress] Set user state (${stateName}) error:`, status, error.response?.data || error.message);

            // If 404 (user not found) or 403 (token invalid), try refreshing session once
            if (status === 404 || status === 403) {
                console.log('[Botpress] Session invalid, attempting to refresh...');
                this.userToken = null; // Clear token to force re-auth
                if (this.lastUserParams) {
                    await this.createUser(this.lastUserParams.externalId, this.lastUserParams.profile);
                    // Retry once with new token/ID
                    if (this.userToken && this.botpressUserId) {
                        try {
                            const retryResponse = await axios.post(
                                `${CHAT_API_URL}/states/user/${this.botpressUserId}/${stateName}`,
                                { payload: variables },
                                {
                                    headers: {
                                        'Authorization': `Bearer ${this.userToken}`,
                                        'x-user-key': this.userToken,
                                        'x-bot-id': BOT_ID,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );
                            console.log(`[Botpress] Retry Set user state (${stateName}) OK:`, retryResponse.status);
                            return;
                        } catch (retryError: any) {
                            console.error(`[Botpress] Retry failed for state (${stateName}):`, retryError.message);
                        }
                    }
                }
            }
            // Throw error so UI can show toast if critical
            throw error;
        }
    }

    async clearSession(externalId: string) {
        this.userToken = null;
        this.conversationId = null;
        this.botpressUserId = null;
        this.initPromise = null;
        this.lastUserParams = null;
        if (externalId) {
            await Promise.all([
                SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`),
                SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`),
                SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${externalId}`)
            ]);
        }
    }

    getInternalUserId() {
        return this.botpressUserId;
    }

    setConversationId(id: string | null) {
        this.conversationId = id;
        if (this.lastUserParams && id) {
            SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`, id);
        }
    }

    getConversationId() {
        return this.conversationId;
    }

    async getOrStartLastConversation() {
        if (this.conversationId) return this.conversationId;

        if (this.lastUserParams) {
            const lastId = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`);
            if (lastId) {
                this.conversationId = lastId;
                return lastId;
            }
        }

        await this.createConversation();
        return this.conversationId;
    }

    async createConversation(tags?: Record<string, string>) {
        await this.ensureInitialized();
        if (!this.userToken) {
            console.warn('[Botpress] Cannot create conversation: No userToken');
            return null;
        }

        const tier = (this.lastUserParams?.profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'premium' : 'free';

        try {
            const response = await axios.post(
                `${API_URL}/conversations`,
                {
                    tags: {
                        subscriptionTier: tier,
                        tier: tier,
                        plan: tier,
                        subscription: tier,
                        userId: this.lastUserParams?.externalId,
                        isPremium: String(tier === 'premium'),
                        ...(tags || {})
                    }
                },
                {
                    headers: {
                        'x-user-key': this.userToken,
                        'x-bot-id': BOT_ID
                    },
                    timeout: REQUEST_TIMEOUT
                }
            );
            const newId = response.data.conversation?.id || response.data.id;
            this.conversationId = newId;

            if (this.lastUserParams && this.conversationId) {
                await SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`, this.conversationId);
            }

            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                this.userToken = null;
            }
            throw error;
        }
    }

    async deleteConversation(id: string) {
        await this.ensureInitialized();
        if (!this.userToken) throw new Error('User not initialized');

        try {
            await axios.delete(`${API_URL}/conversations/${id}`, {
                headers: {
                    'x-user-key': this.userToken,
                    'x-bot-id': BOT_ID
                },
                timeout: REQUEST_TIMEOUT
            });
            if (this.conversationId === id) {
                this.conversationId = null;
            }
        } catch (error: any) {
            console.error('Error deleting Botpress conversation:', error.response?.data || error.message);
            throw error;
        }
    }

    async listConversations() {
        await this.ensureInitialized();
        if (!this.userToken) return { conversations: [] };

        try {
            const response = await axios.get(`${API_URL}/conversations`, {
                headers: { 'x-user-key': this.userToken },
                timeout: REQUEST_TIMEOUT
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                this.userToken = null;
            }
            throw error;
        }
    }

    async sendMessage(text: string, retry = true): Promise<any> {
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) {
            throw new Error('User or Conversation not initialized');
        }

        const tier = (this.lastUserParams?.profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'premium' : 'free';

        const payload = {
            type: 'text',
            text,
            metadata: {
                subscriptionTier: tier,
                tier: tier,
                plan: tier,
                subscription: tier,
                isPremium: tier === 'premium',
                email: this.lastUserParams?.profile?.email,
                userId: this.lastUserParams?.externalId
            },
            tags: {
                subscriptionTier: tier,
                tier: tier,
                plan: tier,
                isPremium: String(tier === 'premium'),
                email: this.lastUserParams?.profile?.email,
                userId: this.lastUserParams?.externalId
            }
        };

        try {
            const response = await axios.post(
                `${API_URL}/messages`,
                {
                    payload,
                    conversationId: this.conversationId,
                },
                {
                    headers: {
                        'x-user-key': this.userToken,
                        'x-bot-id': BOT_ID
                    },
                    timeout: REQUEST_TIMEOUT
                }
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403 && retry) {
                await this.handleAuthError();
                return this.sendMessage(text, false);
            }
            console.error('Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendEvent(type: string, payload: any) {
        await this.ensureInitialized();
        // Ensure conversation exists
        if (!this.conversationId) {
            await this.getOrStartLastConversation();
        }

        if (!this.userToken || !this.conversationId) {
            console.warn('[Botpress] Cannot send event: User or Conversation not initialized');
            return;
        }

        const messagePayload = {
            type: 'text',
            text: `[SYSTEM_EVENT] ${type} ${JSON.stringify(payload)}`
        };

        console.log(`[Botpress] Sending event: ${type}`, JSON.stringify(payload));

        try {
            await axios.post(
                `${API_URL}/messages`,
                {
                    payload: messagePayload,
                    conversationId: this.conversationId,
                },
                {
                    headers: {
                        'x-user-key': this.userToken,
                        'x-bot-id': BOT_ID
                    },
                    timeout: REQUEST_TIMEOUT
                }
            );
            console.log(`[Botpress] Event sent successfully: ${type}`);
        } catch (error: any) {
            console.error(`[Botpress] Error sending event ${type}:`, error.response?.data || error.message);
        }
    }

    async listMessages(nextToken?: string, retry = true): Promise<any> {
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) {
            return { messages: [] };
        }

        try {
            const response = await axios.get(`${API_URL}/conversations/${this.conversationId}/messages`, {
                params: { nextToken },
                headers: { 'x-user-key': this.userToken },
                timeout: REQUEST_TIMEOUT
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403 && retry) {
                await this.handleAuthError();
                return this.listMessages(nextToken, false);
            }
            return { messages: [] };
        }
    }

    async getBot() {
        try {
            const response = await axios.get(`https://api.botpress.cloud/v1/chat/bots/${BOT_ID}`);
            return response.data;
        } catch (error) {
            console.error('Error getting bot info:', error);
            throw error;
        }
    }
}

export const botpress = new BotpressService();
