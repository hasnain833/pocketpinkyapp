import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, responsiveFontSize } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { botpress } from '../services/botpress';

export function Sidebar(props: DrawerContentComponentProps) {
    const insets = useSafeAreaInsets();
    const drawerStatus = useDrawerStatus();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (drawerStatus === 'open') {
            ensureInitAndFetch();
        }
    }, [drawerStatus]);

    useEffect(() => {
        ensureInitAndFetch();
    }, []);

    const ensureInitAndFetch = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await botpress.createUser(session.user.id, {
                email: session.user.email,
                name: session.user.user_metadata?.full_name || 'Queen'
            });

            await fetchHistory();
        } catch (error) {
            console.error('Sidebar Init Error:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            console.log('[Sidebar] Fetching history...');
            setIsLoading(true);
            const response = await botpress.listConversations();
            console.log('[Sidebar] Conversations count:', response?.conversations?.length || 0);
            if (response && response.conversations) {
                if (response.conversations.length > 0) {
                    console.log('[Sidebar] Sample conversation:', JSON.stringify(response.conversations[0], null, 2));
                }
                setConversations(response.conversations);
            }
        } catch (error) {
            console.error('Error fetching sidebar history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await botpress.clearSession(session.user.id);
        }
        await supabase.auth.signOut();
    };

    const handleNewChat = () => {
        props.navigation.navigate('Chat', { conversationId: null, timestamp: Date.now() });
        props.navigation.closeDrawer();
    };

    const handleSelectChat = (id: string) => {
        props.navigation.navigate('Chat', { conversationId: id });
        props.navigation.closeDrawer();
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            await botpress.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Delete Conversation Error:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return d.toLocaleDateString();
    };

    const menuItems = [
        { label: 'Profile', icon: 'user', screen: 'Profile' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.appName}>Pink Pill </Text>

                <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
                    <Feather name="plus" size={18} color={colors.primary} />
                    <Text style={styles.newChatText}>New Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Chat History Section */}
            <View style={styles.historyContainer}>
                <Text style={styles.sectionTitle}>Chat History</Text>
                {isLoading && conversations.length === 0 ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                        {conversations.length === 0 ? (
                            <Text style={styles.emptyText}>No recent chats</Text>
                        ) : (
                            conversations.map((chat) => (
                                <View key={chat.id} style={styles.historyItem}>
                                    <View style={styles.historyItemContent}>
                                        <TouchableOpacity
                                            style={styles.historyMainClick}
                                            onPress={() => handleSelectChat(chat.id)}
                                        >
                                            <Feather name="message-square" size={16} color={colors.primary} />
                                            <View style={styles.historyTextContainer}>
                                                <Text style={styles.historyTitle} numberOfLines={1}>
                                                    Chat session
                                                </Text>
                                                <Text style={styles.historyDate}>{formatDate(chat.createdAt)}</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteHistoryButton}
                                            onPress={() => handleDeleteConversation(chat.id)}
                                        >
                                            <Feather name="trash-2" size={14} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Footer / Menu */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.menuItem}
                        onPress={() => props.navigation.navigate(item.screen)}
                    >
                        <Feather name={item.icon as any} size={20} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{item.label}</Text>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Feather name="log-out" size={20} color={colors.pinkDeep} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cream,
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    appName: {
        fontFamily: 'Allura_400Regular',
        fontSize: responsiveFontSize(32),
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: 8,
        width: '100%',
    },
    newChatText: {
        ...typography.labelCaps,
        fontSize: 12,
        color: colors.primary,
        fontFamily: 'Inter_600SemiBold',
    },
    historyContainer: {
        flex: 1,
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.labelCaps,
        fontSize: 11,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    historyList: {
        flex: 1,
    },
    historyItem: {
        marginBottom: spacing.xs,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    historyItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyMainClick: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
    },
    deleteHistoryButton: {
        padding: spacing.sm,
        paddingRight: spacing.md,
    },
    historyTextContainer: {
        flex: 1,
    },
    historyTitle: {
        ...typography.body,
        fontSize: 14,
        color: colors.textPrimary,
        fontFamily: 'Inter_600SemiBold',
    },
    historyDate: {
        ...typography.bodySmall,
        fontSize: 10,
        color: colors.textMuted,
    },
    emptyText: {
        ...typography.bodySmall,
        textAlign: 'center',
        color: colors.textMuted,
        marginTop: spacing.xl,
    },
    footer: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.creamDark,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    menuItemText: {
        ...typography.labelCaps,
        fontSize: 13,
        color: colors.textPrimary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: spacing.sm,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    logoutText: {
        ...typography.labelCaps,
        fontSize: 13,
        color: colors.pinkDeep,
    },
});
