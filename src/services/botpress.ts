import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Botpress Chat API v2 credentials
const BOT_ID = '0688dbd4-7edd-42f1-b072-7d76b8d9ebc0';
const CLIENT_ID = '98c27071-e27d-4d59-8210-c3d6a86c0344';
const API_URL = `https://chat.botpress.cloud/${CLIENT_ID}`;
const STORAGE_KEY_PREFIX = 'bp_user_key_';

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
    avatarUrl?: string;
}

export class BotpressService {
    private userToken: string | null = null;
    private conversationId: string | null = null;
    private botpressUserId: string | null = null; // Internal Botpress ID (user_...)
    private initPromise: Promise<any> | null = null;
    private lastUserParams: { externalId: string; profile?: Partial<BotpressProfile> } | null = null;

    private async ensureInitialized() {
        if (this.initPromise) {
            await this.initPromise;
        }

        // If we still have no token but have user params, try initializing
        if (!this.userToken && this.lastUserParams) {
            await this.createUser(this.lastUserParams.externalId, this.lastUserParams.profile);
        }
    }

    async createUser(externalId: string, profile?: Partial<BotpressProfile>) {
        this.lastUserParams = { externalId, profile };

        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Return existing session if token is already set
                if (this.userToken) {
                    return { id: externalId, botpressUserId: this.botpressUserId };
                }

                const storedKey = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`);
                const storedInternalId = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`);

                if (storedKey) {
                    this.userToken = storedKey;
                    this.botpressUserId = storedInternalId;
                    return { id: externalId, botpressUserId: storedInternalId };
                }

                const response = await axios.post(`${API_URL}/users`, {
                    externalId,
                    name: profile?.name,
                    email: profile?.email,
                    avatarUrl: profile?.avatarUrl,
                });

                const key = response.headers['x-user-key'] || response.data.key;
                this.botpressUserId = response.data.user?.id || response.data.id;

                if (key) {
                    this.userToken = key;
                    await SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`, key);
                    if (this.botpressUserId) {
                        await SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`, this.botpressUserId);
                    }
                }
                return { ...response.data, botpressUserId: this.botpressUserId };
            } catch (error: any) {
                if (error.response?.status === 409) {
                    // Try to get token if possible, or expect it to be stored eventually
                    const storedInternalId = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`);
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

    async clearSession(externalId: string) {
        this.userToken = null;
        this.conversationId = null;
        this.botpressUserId = null;
        this.initPromise = null;
        this.lastUserParams = null;
        if (externalId) {
            await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}${externalId}`);
            await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}internal_${externalId}`);
            await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${externalId}`);
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

        try {
            const response = await axios.post(
                `${API_URL}/conversations`,
                {},
                { headers: { 'x-user-key': this.userToken } }
            );
            this.conversationId = response.data.conversation?.id || response.data.id;

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

        try {
            const response = await axios.post(
                `${API_URL}/messages`,
                {
                    payload: {
                        type: 'text',
                        text,
                    },
                    conversationId: this.conversationId,
                },
                { headers: { 'x-user-key': this.userToken } }
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403 && retry) {
                console.warn('[Botpress] 403 Forbidden. Clearing token and retrying message...');
                this.userToken = null;
                this.conversationId = null;
                if (this.lastUserParams) {
                    await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}${this.lastUserParams.externalId}`);
                    await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`);
                }
                await this.ensureInitialized();
                await this.getOrStartLastConversation();
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
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403 && retry) {
                console.warn('[Botpress] 403 Forbidden. Clearing token and retrying listMessages...');
                this.userToken = null;
                this.conversationId = null;
                if (this.lastUserParams) {
                    await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}${this.lastUserParams.externalId}`);
                    await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}last_convo_${this.lastUserParams.externalId}`);
                }
                await this.ensureInitialized();
                await this.getOrStartLastConversation();
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
