import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, responsiveFontSize } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { botpress } from '../services/botpress';
import { checkSubscriptionTier } from '../services/subscriptionCheck';
import { ConfirmationModal } from './ConfirmationModal';
import { Toast } from './Toast';

export function Sidebar(props: DrawerContentComponentProps) {
    const insets = useSafeAreaInsets();
    const drawerStatus = useDrawerStatus();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success'
    });

    // Initial setup - only runs once on mount
    useEffect(() => {
        ensureInitAndFetch();
    }, []);

    // Fast refresh when drawer opens - only fetch conversations
    useEffect(() => {
        if (drawerStatus === 'open') {
            fetchHistory();
        }
    }, [drawerStatus]);

    const ensureInitAndFetch = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const plan = await checkSubscriptionTier(session.user.id);

            await botpress.createUser(session.user.id, {
                email: session.user.email,
                name: session.user.user_metadata?.full_name,
                subscriptionTier: plan
            });
            console.log('User email:', session.user.email);
            console.log('User name:', session.user.user_metadata?.full_name);
            console.log('User subscription tier:', plan);

            await fetchHistory();
        } catch (error) {
            console.error('Sidebar Init Error:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const currentId = botpress.getConversationId();
            setActiveId(currentId);
            const response = await botpress.listConversations();
            if (response && response.conversations) {
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

    const handleDeleteConversation = (id: string) => {
        setPendingDeleteId(id);
        setIsDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;

        try {
            setIsDeleteModalVisible(false); // Close immediately for responsiveness
            await botpress.deleteConversation(pendingDeleteId);
            setConversations(prev => prev.filter(c => c.id !== pendingDeleteId));

            // Show toast feedback
            setToast({
                visible: true,
                message: 'Chat deleted successfully',
                type: 'success'
            });

            // If deleted chat was active, create new chat
            if (pendingDeleteId === activeId) {
                props.navigation.navigate('Chat', { conversationId: null, timestamp: Date.now() });
            }
        } catch (error) {
            console.error('Delete Conversation Error:', error);
            setToast({
                visible: true,
                message: 'Failed to delete chat',
                type: 'error'
            });
        } finally {
            setPendingDeleteId(null);
        }
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
                            conversations.map((chat) => {
                                const isActive = chat.id === activeId;
                                return (
                                    <View key={chat.id} style={[styles.historyItem, isActive && styles.activeHistoryItem]}>
                                        <View style={styles.historyItemContent}>
                                            <TouchableOpacity
                                                style={styles.historyMainClick}
                                                onPress={() => handleSelectChat(chat.id)}
                                            >
                                                <Feather
                                                    name="message-square"
                                                    size={16}
                                                    color={isActive ? colors.primary : colors.textMuted}
                                                />
                                                <View style={styles.historyTextContainer}>
                                                    <Text style={[styles.historyTitle, isActive && styles.activeHistoryTitle]} numberOfLines={1}>
                                                        Chat session
                                                    </Text>
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
                                );
                            })
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

            {/* Confirm Delete Modal */}
            <ConfirmationModal
                visible={isDeleteModalVisible}
                title="Delete Chat"
                message="Are you sure you want to delete this conversation? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setIsDeleteModalVisible(false);
                    setPendingDeleteId(null);
                }}
            />

            {/* Toast Feedback */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
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
    activeHistoryItem: {
        backgroundColor: colors.accentLight,
        borderColor: colors.primary,
        borderWidth: 1.5,
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
    activeHistoryTitle: {
        color: colors.primary,
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
