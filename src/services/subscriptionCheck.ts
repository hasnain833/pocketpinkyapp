import { supabase } from './supabase';

export async function checkSubscriptionTier(userId: string): Promise<string> {
    try {
        if (!userId) {
            return 'free';
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', userId)
            .single();

        if (error) {
            console.log('Error fetching subscription plan:', error);
            return 'free';
        }

        return data?.plan || 'free';
    } catch (error) {
        console.error('Error in checkSubscriptionTier:', error);
        return 'free';
    }
}
