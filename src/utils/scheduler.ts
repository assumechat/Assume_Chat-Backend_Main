import cron from 'node-cron';
import { createWalletClient, createPublicClient, http, Address } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { UserProfileModel } from '../models/userProfile.Models';
import { reputationAbi } from './reputation_abi';

// Contract and Network configuration
const REPUTATION_CONTRACT_ADDRESS = (process.env.REPUTATION_CONTRACT_ADDRESS || '0x6c95c7968172742E4206863C39eD2B67867bF5E4') as Address;
const RPC_URL = process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/F1W3qeRS7oPwr7usLafgKv8d0M1bNmd0';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * Task to synchronize invite counts from DB to Smart Contract
 */
export async function syncInvitesToContract() {
    console.log('🕒 Starting nightly invite synchronization sync...');

    if (!PRIVATE_KEY) {
        console.error('❌ Sync failed: PRIVATE_KEY not found in environment');
        return;
    }

    try {
        // 1. Find users with unsynced invites
        const usersToSync = await UserProfileModel.find({
            $expr: { $gt: ['$inviteCount', '$inviteCountSynced'] },
            walletAddress: { $exists: true, $ne: null }
        });

        if (usersToSync.length === 0) {
            console.log('✅ No invites to sync today.');
            return;
        }

        console.log(`📝 Found ${usersToSync.length} users to sync.`);

        // 2. Prepare batch data
        const players: Address[] = [];
        const inviteCounts: bigint[] = [];
        const profileIds: string[] = [];

        for (const user of usersToSync) {
            if (user.walletAddress) {
                players.push(user.walletAddress as Address);
                inviteCounts.push(BigInt(user.inviteCount));
                profileIds.push((user._id as any).toString());
            }
        }

        // 3. Setup Viem clients
        const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? (PRIVATE_KEY as Address) : (`0x${PRIVATE_KEY}` as Address));
        const publicClient = createPublicClient({
            chain: sepolia,
            transport: http(RPC_URL),
        });
        const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http(RPC_URL),
        });

        // 4. Send batch transaction
        console.log(`🚀 Sending batch transaction for ${players.length} players...`);
        const hash = await walletClient.writeContract({
            address: REPUTATION_CONTRACT_ADDRESS,
            abi: reputationAbi,
            functionName: 'updateInviteCountsBatch',
            args: [players, inviteCounts],
        });

        console.log(`✅ Transaction sent: ${hash}. Waiting for confirmation...`);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log('🎊 Transaction confirmed!');

        // 5. Update DB to mark as synced
        for (const user of usersToSync) {
            user.inviteCountSynced = user.inviteCount;
            await user.save();
        }

        console.log('✅ Local database updated with sync status.');

    } catch (error) {
        console.error('❌ Error during invite synchronization:', error);
    }
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
    // Run every night at midnight (00:00)
    cron.schedule('0 0 * * *', () => {
        syncInvitesToContract();
    });

    console.log('📅 Scheduler initialized (Nightly sync at 00:00)');

    // Optional: Run once on startup if needed for development
    // syncInvitesToContract();
}
