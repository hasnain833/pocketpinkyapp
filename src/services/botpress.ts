import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Botpress Chat API v2 credentials
const BOT_ID = '0688dbd4-7edd-42f1-b072-7d76b8d9ebc0';
const CLIENT_ID = '98c27071-e27d-4d59-8210-c3d6a86c0344';
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

                // Normalize subscription tier for Botpress
                const tier = (profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'Premium' : 'free';

                const response = await axios.post(`${API_URL}/users`, {
                    externalId,
                    name: profile?.name,
                    tags: {
                        userId: externalId,
                        email: profile?.email,
                        subscriptionTier: tier,
                        tier: tier.toLowerCase(),
                        plan: tier.toLowerCase(),
                        subscription: tier,
                        isPremium: tier === 'Premium'
                    },
                    data: {
                        externalId,
                        email: profile?.email,
                        subscriptionTier: tier,
                        tier: tier.toLowerCase(),
                        plan: tier.toLowerCase(),
                        subscription: tier,
                        isPremium: tier === 'Premium'
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
                    // We still need the user token even on conflict if we don't have it stored
                    // but Botpress API v2 creation response provides it. 
                    // If we get 409, we assume the user exists, but we might be missing the key 
                    // if it wasn't stored. However, handleAuthError usually tries to recover.
                    return { id: externalId, botpressUserId: storedInternalId };
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
        if (!this.userToken || !this.botpressUserId) {
            console.warn('[Botpress] Cannot update user: Not initialized');
            return;
        }

        const tier = (profile.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'Premium' : 'free';

        try {
            const dataObj = {
                externalId: this.lastUserParams?.externalId,
                email: profile.email || this.lastUserParams?.profile?.email,
                subscriptionTier: tier,
                tier: tier.toLowerCase(),
                plan: tier.toLowerCase(),
                subscription: tier,
                isPremium: tier === 'Premium'
            };

            const tagsObj = {
                userId: this.lastUserParams?.externalId,
                email: profile.email || this.lastUserParams?.profile?.email,
                subscriptionTier: tier,
                tier: tier.toLowerCase(),
                isPremium: String(tier === 'Premium')
            };

            console.log('[Botpress] Updating user with data:', JSON.stringify(dataObj, null, 2));

            const response = await axios.put(
                `${API_URL}/users/me`,
                {
                    name: profile.name,
                    tags: tagsObj,
                    data: dataObj
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

    async createConversation() {
        await this.ensureInitialized();
        if (!this.userToken) {
            console.warn('[Botpress] Cannot create conversation: No userToken');
            return null;
        }

        const tier = (this.lastUserParams?.profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'Premium' : 'free';

        try {
            const response = await axios.post(
                `${API_URL}/conversations`,
                {
                    tags: {
                        subscriptionTier: tier,
                        tier: tier.toLowerCase(),
                        plan: tier.toLowerCase(),
                        subscription: tier,
                        userId: this.lastUserParams?.externalId,
                        isPremium: String(tier === 'Premium')
                    },
                    metadata: {
                        subscriptionTier: tier,
                        tier: tier.toLowerCase(),
                        plan: tier.toLowerCase(),
                        subscription: tier,
                        userId: this.lastUserParams?.externalId,
                        isPremium: tier === 'Premium'
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
                headers: { 'x-user-key': this.userToken },
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

        const tier = (this.lastUserParams?.profile?.subscriptionTier || 'free').toLowerCase() === 'premium' ? 'Premium' : 'free';

        const payload = {
            type: 'text',
            text,
            metadata: {
                subscriptionTier: tier,
                tier: tier.toLowerCase(),
                plan: tier.toLowerCase(),
                subscription: tier,
                isPremium: tier === 'Premium',
                email: this.lastUserParams?.profile?.email,
                userId: this.lastUserParams?.externalId
            },
            tags: {
                subscriptionTier: tier,
                tier: tier.toLowerCase(),
                plan: tier.toLowerCase(),
                isPremium: String(tier === 'Premium'),
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
